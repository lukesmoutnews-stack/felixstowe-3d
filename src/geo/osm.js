// Overpass/OSM JSON -> project features in world coordinates.
// Every feature keeps its OSM id so it can be traced back to the source data.
// Anything estimated (heights, roofs, materials) is flagged with a *Source field.

import { closeless, area, centroid, pointInRing, hash01, orientedBox } from './polygon.js';

// ---------- raw parsing ----------

/** Normalise Overpass JSON (either `out geom` or `out body; >; out skel`) into ways with coordinates. */
export function parseOverpass(json, frame) {
  const nodes = new Map(), ways = [], rels = [], points = [];
  const P = (lat, lon) => { const w = frame.toWorld(lat, lon); return [w.x, w.z]; };
  for (const el of json.elements || []) if (el.type === 'node') {
    nodes.set(el.id, el);
    if (el.tags && Object.keys(el.tags).length) points.push({ id: el.id, tags: el.tags, p: P(el.lat, el.lon) });
  }
  for (const el of json.elements || []) {
    if (el.type === 'way') {
      let pts;
      if (el.geometry) pts = el.geometry.filter(Boolean).map((g) => P(g.lat, g.lon));
      else if (el.nodes) pts = el.nodes.map((id) => nodes.get(id)).filter(Boolean).map((n) => P(n.lat, n.lon));
      if (!pts || pts.length < 2) continue;
      ways.push({ id: el.id, tags: el.tags || {}, pts, nodeIds: el.nodes || null });
    } else if (el.type === 'relation') rels.push(el);
  }
  const wayById = new Map(ways.map((w) => [w.id, w]));
  const relations = [];
  for (const r of rels) {
    const members = [];
    for (const m of r.members || []) {
      if (m.type !== 'way') continue;
      let pts = null;
      if (m.geometry) pts = m.geometry.filter(Boolean).map((g) => P(g.lat, g.lon));
      else if (wayById.has(m.ref)) pts = wayById.get(m.ref).pts;
      if (pts && pts.length >= 2) members.push({ role: m.role || 'outer', pts, ref: m.ref });
    }
    relations.push({ id: r.id, tags: r.tags || {}, members });
  }
  return { ways, relations, points };
}

const KEY = (p) => p[0].toFixed(3) + ',' + p[1].toFixed(3);

/** Join open ways into rings (for multipolygons) by matching endpoints. */
export function assembleRings(lines) {
  const rings = [], open = lines.map((l) => l.slice());
  while (open.length) {
    let cur = open.pop();
    let guard = 0;
    while (KEY(cur[0]) !== KEY(cur[cur.length - 1]) && guard++ < 10000) {
      const end = KEY(cur[cur.length - 1]);
      let found = -1, rev = false;
      for (let i = 0; i < open.length; i++) {
        if (KEY(open[i][0]) === end) { found = i; break; }
        if (KEY(open[i][open[i].length - 1]) === end) { found = i; rev = true; break; }
      }
      if (found < 0) break;
      let nxt = open.splice(found, 1)[0]; if (rev) nxt = nxt.slice().reverse();
      cur = cur.concat(nxt.slice(1));
    }
    if (KEY(cur[0]) === KEY(cur[cur.length - 1]) && cur.length >= 4) rings.push(closeless(cur));
  }
  return rings;
}

/** Join open polylines into maximal chains (coastline). */
export function joinChains(lines) {
  const chains = lines.map((l) => l.slice());
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < chains.length; i++) for (let j = 0; j < chains.length; j++) {
      if (i === j) continue;
      if (KEY(chains[i][chains[i].length - 1]) === KEY(chains[j][0])) {
        chains[i] = chains[i].concat(chains[j].slice(1)); chains.splice(j, 1); merged = true; break outer;
      }
    }
  }
  return chains;
}

function isClosed(pts) { return pts.length >= 4 && KEY(pts[0]) === KEY(pts[pts.length - 1]); }

// ---------- tag interpretation ----------

export function num(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  let m = s.match(/^(-?\d+(?:\.\d+)?)\s*(m|metres|meters)?$/); if (m) return parseFloat(m[1]);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(ft|feet|')$/); if (m) return parseFloat(m[1]) * 0.3048;
  m = s.match(/^(\d+)'\s*(\d+)"?$/); if (m) return (parseInt(m[1]) * 12 + parseInt(m[2])) * 0.0254;
  return null;
}

const ROAD_WIDTH = { // metres, carriageway only; UK typical values (approximation, see docs/data-sources.md)
  motorway: 11, trunk: 7.3, primary: 7.3, secondary: 7.0, tertiary: 6.5, unclassified: 5.5, residential: 5.5,
  motorway_link: 5, trunk_link: 5, primary_link: 5, secondary_link: 5, tertiary_link: 5,
  living_street: 4.5, service: 3.6, pedestrian: 6, track: 3, road: 5,
  footway: 2.0, path: 1.6, cycleway: 2.2, bridleway: 2.5, steps: 2.0, corridor: 2.0,
};
const CAR_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'living_street', 'service', 'road', 'track']);
const PAVED_FOOT = new Set(['footway', 'pedestrian', 'steps', 'corridor', 'cycleway']);

export function classifyRoad(t) {
  const hw = t.highway; if (!hw || !(hw in ROAD_WIDTH)) return null;
  if (t.area === 'yes' && hw !== 'pedestrian') return null;
  if (t.indoor === 'yes' || t.tunnel === 'building_passage' && false) return null;
  let width = num(t.width) ?? num(t['est_width']);
  let widthSource = width != null ? 'osm:width' : null;
  const lanes = parseInt(t.lanes);
  if (width == null && lanes > 0 && CAR_ROADS.has(hw)) { width = lanes * 3.1; widthSource = 'osm:lanes'; }
  if (width == null) { width = ROAD_WIDTH[hw]; if (t.service === 'parking_aisle') width = 5; if (t.oneway === 'yes' && CAR_ROADS.has(hw) && hw !== 'service') width *= 0.75; widthSource = 'default:class'; }
  width = Math.min(Math.max(width, 0.8), 30);
  const car = CAR_ROADS.has(hw) && t.access !== 'no' && t.motor_vehicle !== 'no';
  const urban = car && !['track', 'motorway', 'motorway_link', 'service'].includes(hw);
  // Pavements: OSM sidewalk tags if present, otherwise a documented assumption for urban roads.
  let sidewalk = t.sidewalk || t['sidewalk:both'] || null;
  if (!sidewalk && (t['sidewalk:left'] || t['sidewalk:right'])) {
    const l = t['sidewalk:left'], r = t['sidewalk:right'];
    sidewalk = l === 'yes' && r === 'yes' ? 'both' : l === 'yes' ? 'left' : r === 'yes' ? 'right' : 'no';
  }
  const sidewalkSource = sidewalk ? 'osm' : 'assumed';
  if (!sidewalk) sidewalk = urban ? 'both' : 'no';
  if (sidewalk === 'separate' || sidewalk === 'none') sidewalk = 'no';
  let surface = t.surface || (car || PAVED_FOOT.has(hw) ? 'asphalt' : 'unpaved');
  if (hw === 'pedestrian' && !t.surface) surface = 'paving_stones';
  if (hw === 'track' && !t.surface) surface = 'gravel';
  if (['path', 'bridleway'].includes(hw) && !t.surface) surface = 'compacted';
  return {
    kind: hw, width, widthSource, car, sidewalk, sidewalkSource, surface,
    name: t.name || null, ref: t.ref || null, oneway: t.oneway === 'yes' || t.junction === 'roundabout',
    lanes: lanes > 0 ? lanes : null, layer: parseInt(t.layer) || 0,
    bridge: !!t.bridge && t.bridge !== 'no', tunnel: !!t.tunnel && t.tunnel !== 'no',
    markings: car && !['service', 'track', 'living_street'].includes(hw) && t['lane_markings'] !== 'no',
    footOnly: !car,
  };
}

const LEVEL_H = 2.9; // assumed storey height for UK domestic/commercial buildings (documented approximation)
const BUILDING_DEFAULTS = {
  house: 2, detached: 2, semidetached_house: 2, terrace: 2, residential: 2, bungalow: 1, apartments: 3, dormitory: 3,
  commercial: 3, retail: 2, supermarket: 1, office: 3, hotel: 4, school: 2, college: 3, hospital: 3, public: 2, civic: 2,
  church: 3, chapel: 2, cathedral: 4, train_station: 2, transportation: 2, kiosk: 1, toilets: 1, pavilion: 1,
  garage: 1, garages: 1, shed: 1, hut: 1, carport: 1, roof: 1, greenhouse: 1, service: 1, static_caravan: 1, cabin: 1, beach_hut: 1,
  industrial: 3, warehouse: 3, hangar: 3, storage_tank: 3, container: 1, boathouse: 1, sports_hall: 3, sports_centre: 3,
};
const PITCHED_KINDS = new Set(['house', 'detached', 'semidetached_house', 'terrace', 'residential', 'bungalow', 'church', 'chapel', 'school', 'hotel', 'apartments', 'yes', 'garage', 'beach_hut', 'hut', 'cabin', 'static_caravan', 'boathouse', 'public', 'civic', 'dormitory']);
const INDUSTRIAL_KINDS = new Set(['industrial', 'warehouse', 'hangar', 'manufacture', 'storage_tank', 'container', 'service']);

const MATERIAL_MAP = {
  brick: 'brick', bricks: 'brick', plaster: 'render', render: 'render', stucco: 'render', concrete: 'concrete',
  stone: 'stone', sandstone: 'stone', limestone: 'stone', flint: 'flint', metal: 'metal', steel: 'metal', glass: 'glass',
  wood: 'timber', timber_framing: 'render', cement_block: 'concrete', plastic: 'render', tiles: 'render',
};

/** Building interpretation. `context` = { inIndustrial: bool }. Returns parameters + provenance. */
export function classifyBuilding(id, t, ring, context = {}) {
  const kindRaw = t.building || (t['building:part'] ? t['building:part'] : 'yes');
  const kind = kindRaw === 'yes' && t['building:part'] ? 'yes' : kindRaw;
  const a = area(ring);
  const h = hash01(id);
  let height = num(t.height), heightSource = height != null ? 'osm:height' : null;
  let minHeight = num(t.min_height) ?? (parseFloat(t['building:min_level']) > 0 ? parseFloat(t['building:min_level']) * LEVEL_H : 0);
  let levels = parseFloat(t['building:levels']);
  const roofLevels = parseFloat(t['roof:levels']) || 0;
  let roofHeight = num(t['roof:height']);
  let roofShape = t['roof:shape'] || null;
  const roofShapeSource = roofShape ? 'osm' : 'estimated';
  const industrial = INDUSTRIAL_KINDS.has(kind) || (kind === 'yes' && context.inIndustrial);

  if (height == null && levels > 0) { height = levels * LEVEL_H + 0.3; heightSource = 'osm:levels'; }
  if (height == null) {
    heightSource = 'estimated';
    let lv;
    if (kind in BUILDING_DEFAULTS) lv = BUILDING_DEFAULTS[kind];
    else if (industrial) lv = 3;
    else if (a < 22) lv = 1; else if (a < 260) lv = 2; else if (a < 900) lv = 3; else lv = 3;
    levels = lv;
    if (industrial) height = Math.min(16, 7 + Math.sqrt(a) * 0.06) + h * 2;
    else if (['garage', 'garages', 'shed', 'carport', 'hut', 'beach_hut', 'kiosk', 'toilets', 'static_caravan'].includes(kind) || a < 22) height = 2.6 + h * 0.4;
    else height = lv * LEVEL_H + 0.3 + (h - 0.5) * 0.6;
  }
  if (!(levels > 0)) levels = Math.max(1, Math.round((height - minHeight) / LEVEL_H));

  if (!roofShape) {
    const obb = orientedBox(ring);
    const rect = obb ? a / obb.area : 0;
    if (industrial) roofShape = rect > 0.9 && obb.width < 60 && a < 6000 ? 'gabled-low' : 'flat';
    else if (PITCHED_KINDS.has(kind) && a < 700 && levels <= 4) roofShape = rect > 0.88 ? (h < 0.55 ? 'gabled' : 'hipped') : 'hipped-inset';
    else roofShape = 'flat';
  }
  if (roofHeight == null) {
    if (roofLevels) roofHeight = roofLevels * LEVEL_H;
    else roofHeight = null; // derived from footprint width in the mesh builder
  }
  // If OSM height includes the roof (per OSM Simple 3D buildings), wall height = height - roofHeight.
  const material = MATERIAL_MAP[(t['building:material'] || '').toLowerCase()] || null;
  return {
    id, kind, height: Math.max(height, minHeight + 1.5), minHeight, levels, roofLevels,
    roofShape, roofShapeSource, roofHeight, heightSource,
    material, materialSource: material ? 'osm' : 'estimated',
    colour: t['building:colour'] || null, roofColour: t['roof:colour'] || null,
    roofMaterial: t['roof:material'] || null,
    name: t.name || null, industrial, area: a,
    shop: !!(t.shop || t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'pub' || kind === 'retail' || kind === 'commercial'),
    isPart: !!t['building:part'],
  };
}

const AREA_RULES = [
  // [test(tags) -> kind]; first match wins. Kinds map to ground materials.
  [(t) => t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.water, 'water'],
  [(t) => t.natural === 'beach' && /shingle|pebble|gravel|stone/.test(t.surface || ''), 'shingle'],
  [(t) => t.natural === 'beach', 'beach'],
  [(t) => t.natural === 'sand', 'beach'],
  [(t) => t.natural === 'shingle', 'shingle'],
  [(t) => t.natural === 'mud' || t.natural === 'wetland' && t.wetland === 'tidalflat', 'mud'],
  [(t) => t.natural === 'wetland', 'wetland'],
  [(t) => t.highway === 'pedestrian' && t.area === 'yes' || t['area:highway'] === 'pedestrian' || t.place === 'square', 'paved'],
  [(t) => t.amenity === 'parking' || t.amenity === 'bicycle_parking' && t.area === 'yes', 'parking'],
  [(t) => t.man_made === 'pier' && (t.area === 'yes' || true), 'pier'],
  [(t) => t.man_made === 'breakwater' || t.man_made === 'quay' || t.man_made === 'wharf', 'quay'],
  [(t) => t.landuse === 'railway', 'railway'],
  [(t) => t.landuse === 'port' || t.industrial === 'port', 'port'],
  [(t) => t.landuse === 'industrial', 'industrial'],
  [(t) => t.landuse === 'construction' || t.landuse === 'brownfield', 'brownfield'],
  [(t) => t.leisure === 'pitch', 'pitch'],
  [(t) => t.leisure === 'playground', 'playground'],
  [(t) => t.leisure === 'park' || t.leisure === 'garden' || t.leisure === 'common' || t.leisure === 'recreation_ground' || t.landuse === 'recreation_ground' || t.landuse === 'village_green', 'park'],
  [(t) => t.leisure === 'golf_course', 'golf'],
  [(t) => t.landuse === 'cemetery' || t.amenity === 'grave_yard', 'cemetery'],
  [(t) => t.natural === 'wood' || t.landuse === 'forest', 'wood'],
  [(t) => t.natural === 'scrub' || t.natural === 'heath', 'scrub'],
  [(t) => t.natural === 'grassland' || t.landuse === 'grass' || t.landuse === 'meadow' || t.landuse === 'allotments', 'grass'],
  [(t) => t.landuse === 'farmland' || t.landuse === 'farmyard', 'farmland'],
  [(t) => ['retail', 'commercial'].includes(t.landuse), 'commercial'],
  [(t) => t.landuse === 'residential', 'residential'],
  [(t) => t.amenity === 'school' || t.amenity === 'hospital' || t.amenity === 'college', 'institution'],
];
export function classifyArea(t) { for (const [f, k] of AREA_RULES) if (f(t)) return k; return null; }

const LINE_KINDS = (t) => {
  if (t.natural === 'coastline') return 'coastline';
  if (t.railway && ['rail', 'light_rail', 'narrow_gauge', 'disused', 'preserved'].includes(t.railway)) return 'rail';
  if (t.barrier === 'wall' || t.barrier === 'retaining_wall' || t.barrier === 'city_wall') return 'wall';
  if (t.barrier === 'fence' || t.barrier === 'guard_rail' || t.barrier === 'handrail') return 'fence';
  if (t.barrier === 'hedge') return 'hedge';
  if (t.man_made === 'groyne') return 'groyne';
  if (t.man_made === 'breakwater') return 'breakwater';
  if (t.man_made === 'pier') return 'pier';
  if (t.natural === 'tree_row') return 'tree_row';
  if (t.natural === 'cliff' || t.natural === 'earth_bank' || t.man_made === 'embankment') return 'bank';
  if (t.man_made === 'crane' || t.railway === 'crane') return 'crane_rail';
  if (t.power === 'line') return null;
  return null;
};

const POINT_KINDS = (t) => {
  if (t.natural === 'tree') return 'tree';
  if (t.amenity === 'bench' || t.leisure === 'picnic_table') return 'bench';
  if (t.highway === 'street_lamp') return 'lamp';
  if (t.highway === 'bus_stop' || t.public_transport === 'platform' && t.bus === 'yes') return 'bus_stop';
  if (t.amenity === 'post_box') return 'post_box';
  if (t.barrier === 'bollard') return 'bollard';
  if (t.amenity === 'waste_basket') return 'bin';
  if (t.amenity === 'telephone') return 'phone_box';
  if (t.highway === 'crossing') return 'crossing';
  if (t.man_made === 'crane') return 'crane';
  if (t.man_made === 'mast' || t.man_made === 'tower' || t.man_made === 'lighthouse' || t.man_made === 'flagpole') return 'mast';
  if (t.highway === 'traffic_signals') return 'signals';
  return null;
};

function isAreaWay(t, pts) {
  if (!isClosed(pts)) return false;
  if (t.area === 'no') return false;
  if (t.building || t['building:part']) return true;
  if (t.highway && t.area !== 'yes') return false;
  if (t.barrier && !t.area) return false;
  if (t.natural === 'coastline' || t.natural === 'tree_row' || t.natural === 'cliff') return false;
  return true;
}

/**
 * Convert parsed OSM into the project feature model.
 * @returns {{roads, buildings, areas, lines, points, pois, coast}}
 */
export function buildFeatures(parsed) {
  const out = { roads: [], buildings: [], areas: [], lines: [], points: [], pois: [], coastLines: [], stats: {} };
  const seen = new Set();
  const pushPoi = (name, kind, p, id, tags, ring = null, line = null) => out.pois.push({ name, kind, x: p[0], z: p[1], id, tags, ring, line });

  const polyEntries = []; // {id, tags, outer, holes}
  for (const w of parsed.ways) {
    const t = w.tags;
    if (t.natural === 'coastline') { out.coastLines.push(w.pts); continue; }
    if (isAreaWay(t, w.pts)) polyEntries.push({ id: w.id, type: 'way', tags: t, outer: closeless(w.pts), holes: [] });
    const road = classifyRoad(t);
    if (road && !(t.area === 'yes')) { out.roads.push({ id: w.id, pts: w.pts, nodeIds: w.nodeIds, ...road }); }
    else if (road && t.highway === 'pedestrian' && t.area === 'yes') { /* handled as area */ }
    const lk = LINE_KINDS(t);
    if (lk && !(lk === 'pier' && isClosed(w.pts) && t.area !== 'no')) out.lines.push({ id: w.id, kind: lk, pts: w.pts, tags: t, width: num(t.width) });
    if (t.name && !road) {
      const closed = isClosed(w.pts);
      const c = closed ? centroid(closeless(w.pts)) : w.pts[Math.floor(w.pts.length / 2)];
      pushPoi(t.name, poiKind(t), c, 'w' + w.id, t, closed ? closeless(w.pts) : null, closed ? null : w.pts);
    }
  }
  for (const r of parsed.relations) {
    const t = r.tags;
    if (t.type === 'multipolygon' || t.type === 'boundary' && false || t.building) {
      const outers = assembleRings(r.members.filter((m) => m.role !== 'inner').map((m) => m.pts));
      const inners = assembleRings(r.members.filter((m) => m.role === 'inner').map((m) => m.pts));
      for (const o of outers) {
        const holes = inners.filter((h) => pointInRing(h[0][0], h[0][1], o));
        polyEntries.push({ id: r.id, type: 'relation', tags: t, outer: o, holes });
      }
      if (t.name && outers.length) pushPoi(t.name, poiKind(t), centroid(outers[0]), 'r' + r.id, t, outers[0]);
    }
    if (t.natural === 'coastline') for (const m of r.members) out.coastLines.push(m.pts);
  }

  const industrialAreas = [];
  for (const e of polyEntries) {
    if (e.outer.length < 3) continue;
    const k = classifyArea(e.tags);
    if (k && !e.tags.building) {
      out.areas.push({ id: e.id, kind: k, outer: e.outer, holes: e.holes, tags: e.tags });
      if (k === 'industrial' || k === 'port' || k === 'railway') industrialAreas.push(e.outer);
    }
  }
  for (const e of polyEntries) {
    const t = e.tags;
    if (!(t.building || t['building:part'])) continue;
    if (t.building === 'no' || t['building:part'] === 'no') continue;
    if (t.building === 'roof' && !t.height) { /* canopies: keep as thin roof */ }
    const key = e.type + e.id + ':' + e.outer.length;
    if (seen.has(key)) continue; seen.add(key);
    const c = centroid(e.outer);
    const inIndustrial = industrialAreas.some((r) => pointInRing(c[0], c[1], r));
    const b = classifyBuilding(e.id, t, e.outer, { inIndustrial });
    out.buildings.push({ ...b, outer: e.outer, holes: e.holes, cx: c[0], cz: c[1], osmType: e.type });
  }
  // Buildings that have parts: render parts, keep the outline only for collision/minimap.
  const parts = out.buildings.filter((b) => b.isPart);
  if (parts.length) {
    for (const b of out.buildings) {
      if (b.isPart) continue;
      if (parts.some((p) => pointInRing(p.cx, p.cz, b.outer))) b.hasParts = true;
    }
  }
  for (const p of parsed.points) {
    const k = POINT_KINDS(p.tags);
    if (k) out.points.push({ id: p.id, kind: k, x: p.p[0], z: p.p[1], tags: p.tags });
    if (p.tags.name && (p.tags.amenity || p.tags.tourism || p.tags.historic || p.tags.shop || p.tags.leisure || p.tags.railway === 'station' || p.tags.man_made || p.tags.place)) {
      pushPoi(p.tags.name, poiKind(p.tags), p.p, 'n' + p.id, p.tags);
    }
  }
  out.stats = summarise(out);
  return out;
}

function poiKind(t) {
  if (t.historic) return 'historic';
  if (t.tourism) return t.tourism;
  if (t.railway === 'station') return 'station';
  if (t.amenity) return t.amenity;
  if (t.shop) return 'shop';
  if (t.leisure) return t.leisure;
  if (t.man_made) return t.man_made;
  if (t.place) return 'place';
  if (t.building) return 'building';
  return 'feature';
}

/** Overture buildings (pre-filtered by tools/merge-overture.mjs) -> building features. */
export function overtureBuildings(list, frame) {
  const out = [];
  for (const o of list || []) {
    let h = 0; for (const ch of String(o.id)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    const id = -Math.abs(h) - 1; // negative ids never clash with OSM ids
    const outer = closeless(o.outer.map(([lat, lon]) => { const w = frame.toWorld(lat, lon); return [w.x, w.z]; }));
    if (outer.length < 3) continue;
    const tags = { building: o.class || 'yes' };
    if (o.height) tags.height = String(o.height);
    if (o.num_floors) tags['building:levels'] = String(o.num_floors);
    if (o.roof_shape) tags['roof:shape'] = o.roof_shape;
    const c = centroid(outer);
    const b = classifyBuilding(id, tags, outer, {});
    b.heightSource = b.heightSource.replace('osm:', 'overture:'); if (b.roofShapeSource === 'osm') b.roofShapeSource = 'overture';
    out.push({ ...b, outer, holes: [], cx: c[0], cz: c[1], osmType: 'overture', source: 'overture', overtureId: o.id, sources: o.sources });
  }
  return out;
}

/** Data-quality summary used by the in-game data panel and docs. */
export function summarise(f) {
  const b = f.buildings;
  const count = (arr, fn) => arr.filter(fn).length;
  return {
    roads: f.roads.length,
    namedRoads: count(f.roads, (r) => r.name),
    roadWidthFromOsm: count(f.roads, (r) => r.widthSource !== 'default:class'),
    buildings: b.length,
    heightFromOsmHeight: count(b, (x) => x.heightSource === 'osm:height'),
    heightFromOsmLevels: count(b, (x) => x.heightSource === 'osm:levels'),
    heightFromLidar: count(b, (x) => x.heightSource === 'lidar'),
    heightEstimated: count(b, (x) => x.heightSource === 'estimated'),
    heightFromOverture: count(b, (x) => x.heightSource.startsWith('overture')),
    overtureBuildings: count(b, (x) => x.source === 'overture'),
    roofShapeFromOsm: count(b, (x) => x.roofShapeSource === 'osm'),
    materialFromOsm: count(b, (x) => x.materialSource === 'osm'),
    areas: f.areas.length, lines: f.lines.length, points: f.points.length,
    trees: count(f.points, (p) => p.kind === 'tree'), pois: f.pois.length, coastlineWays: f.coastLines.length,
  };
}
