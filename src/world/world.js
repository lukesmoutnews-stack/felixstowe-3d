// World manager: streams 1 km tiles of real data, builds geometry, owns the spatial
// indexes used by physics, the map and interactions.

import * as THREE from 'three';
import { CONFIG, tileRect, tileAt, tileKey } from '../config.js';
import { parseOverpass, buildFeatures, summarise, overtureBuildings } from '../geo/osm.js';
import { landPolygons } from '../geo/coast.js';
import { SpatialGrid } from '../geo/spatial.js';
import { pointInRing, pointInPolygon, distToSegment, bounds, clipRingToRect, ensureCCW, orientedBox } from '../geo/polygon.js';
import { ChunkedAccum } from './accum.js';
import { addBuilding } from './buildings.js';
import { buildRoads, buildRail } from './roads.js';
import { buildGround, buildAreas } from './landcover.js';
import { placeTrees, buildTreeMeshes } from './vegetation.js';
import { buildProps, buildBarriers, buildPiers } from './furniture.js';
import { isPierBuilding, buildPierBuilding } from './pier-building.js';
import { isFishDish, buildFishDish } from './fish-dish.js';
import { isRegal, buildRegal } from './regal.js';
import { isLeisureCentre, buildLeisureCentre, leisureMaterial } from './leisure-centre.js';
import { collectBusinesses, markShopBuildings, buildSigns } from './shopfronts.js';
import { facadeMaterial, shopMaterial, doorMaterial, rollerMaterial, roofMaterial, groundMaterial, waterMaterial, plainMaterial, LAYER } from './materials.js';
import { matchLandmark } from '../content/landmarks.js';
import { Textures } from './textures.js';

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

export class World extends EventTarget {
  constructor(scene, frame, terrain, source, settings) {
    super();
    this.scene = scene; this.frame = frame; this.terrain = terrain; this.source = source; this.settings = settings;
    this.tiles = new Map();
    this.root = new THREE.Group(); this.root.name = 'world'; scene.add(this.root);
    this.edgeGrid = new SpatialGrid(16);      // building walls + barriers (collision)
    this.circleGrid = new SpatialGrid(16);    // posts, lamps, crane legs
    this.roadGrid = new SpatialGrid(40);      // road segments (names, vehicle, lamps)
    this.buildingGrid = new SpatialGrid(32);  // footprints (clearance tests, interactions)
    this.areaGrid = new SpatialGrid(100);     // water / beach / walkable extras
    this.pois = new Map();
    this.surfaces = [];                        // pier decks
    this._signMats = new Map();                // per-tile shop sign atlases
    this.lidarTrees = [];
    this.lidarHeights = null;
    this.yardRuns = null; this.yardVersion = 1;                      // LiDAR-measured container stack blocks (OSGB)                  // OSM id -> [median, p90] height from EA DSM-DTM
    this.stats = { tiles: 0, buildMs: [] };
    this.loading = new Set();
  }

  ground = (x, z) => this.terrain.heightAt(x, z);
  surfaceAt = (x, z) => {
    for (const s of this.surfaces) if (pointInRing(x, z, s.ring)) return s.heightAt(x, z);
    return this.ground(x, z);
  };
  onDeck(x, z) { return this.surfaces.find((s) => pointInRing(x, z, s.ring)) || null; }

  isLand(x, z) {
    if (this.terrain.hasTerrain) return this.terrain.heightAt(x, z) > this.terrain.seaLevel;
    const t = this.tiles.get(tileKey(...tileAt(x, z)));
    if (!t || !t.land) return false;
    return t.land.some((l) => pointInPolygon(x, z, l.outer, l.holes));
  }
  /** Where a pedestrian or car may stand. */
  isWalkable(x, z) {
    if (this.onDeck(x, z)) return true;
    for (const a of this.areaGrid.query(x, z, x, z)) {
      if (!pointInPolygon(x, z, a.outer, a.holes)) continue;
      if (a.kind === 'water') return false;
      if (a.kind === 'beach' || a.kind === 'shingle' || a.kind === 'quay' || a.kind === 'mud') return true;
    }
    return this.isLand(x, z);
  }
  /** Clearance test used by procedural placement: not in a building/road/water. */
  isClear = (x, z, r, allowRoadside = false) => {
    for (const b of this.buildingGrid.query(x - r, z - r, x + r, z + r)) if (pointInRing(x, z, b.outer)) return false;
    for (const s of this.roadGrid.query(x - 10, z - 10, x + 10, z + 10)) {
      const d = distToSegment(x, z, s.a[0], s.a[1], s.b[0], s.b[1]).d;
      if (d < s.road.width / 2 + (allowRoadside ? 0.2 : r + 1)) return false;
    }
    return this.isLand(x, z);
  };

  nearestRoad(x, z, maxD = 30, filter = null) {
    let best = null;
    for (const s of this.roadGrid.query(x - maxD, z - maxD, x + maxD, z + maxD)) {
      if (filter && !filter(s.road)) continue;
      const d = distToSegment(x, z, s.a[0], s.a[1], s.b[0], s.b[1]);
      if (d.d < maxD && (!best || d.d < best.d)) best = { ...d, road: s.road, a: s.a, b: s.b };
    }
    return best;
  }

  /** Ensure tiles around a point are loaded; returns when the closest tile is ready. */
  async ensureAround(x, z, radius = CONFIG.streamRadius) {
    const [ci, cj] = tileAt(x, z);
    const want = [];
    const n = Math.ceil(radius / CONFIG.tileSize) + 1;
    for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
      const r = tileRect(i, j);
      const dx = Math.max(r.minX - x, 0, x - r.maxX), dz = Math.max(r.minZ - z, 0, z - r.maxZ);
      const d = Math.hypot(dx, dz);
      if (d <= radius) want.push({ i, j, d });
    }
    want.sort((a, b) => a.d - b.d);
    for (const w of want) {
      const k = tileKey(w.i, w.j);
      if (this.tiles.has(k) || this.loading.has(k)) continue;
      await this.loadTile(w.i, w.j);
    }
    // unload far tiles
    for (const [k, t] of this.tiles) {
      const r = t.rect; const dx = Math.max(r.minX - x, 0, x - r.maxX), dz = Math.max(r.minZ - z, 0, z - r.maxZ);
      if (Math.hypot(dx, dz) > CONFIG.unloadRadius) this.unloadTile(k);
    }
  }

  async loadTile(i, j) {
    const key = tileKey(i, j);
    this.loading.add(key);
    const t0 = performance.now();
    let data;
    try { data = await this.source.get(i, j); }
    catch (e) {
      this.loading.delete(key);
      this.tiles.set(key, { key, i, j, rect: tileRect(i, j), error: String(e.message || e), group: null });
      this.dispatchEvent(new CustomEvent('tileerror', { detail: { key, error: e } }));
      return;
    }
    const tFetch = performance.now();
    await this.terrain.ensureRect?.(tileRect(i, j));
    const rect = tileRect(i, j);
    let features, land, coastStatus;
    try { ({ features, land, coastStatus } = await this._parse(data, rect)); }
    catch (e) { this.loading.delete(key); this.tiles.set(key, { key, i, j, rect, error: String(e.message || e), group: null }); this.dispatchEvent(new CustomEvent('tileerror', { detail: { key, error: e } })); return; }
    await yieldFrame();
    const tile = { key, i, j, rect, features, source: data.source, osmBase: data.json.osm3s?.timestamp_osm_base || null, land, coastStatus };
    await this.buildTile(tile);
    this.tiles.set(key, tile);
    this.loading.delete(key);
    tile.timing = { fetchMs: Math.round(tFetch - t0), buildMs: Math.round(performance.now() - tFetch) };
    this.stats.tiles++;
    this.dispatchEvent(new CustomEvent('tileloaded', { detail: tile }));
  }

  /** Parse in a Web Worker when available (falls back to the main thread). */
  _parse(data, rect) {
    const local = () => {
      const features = buildFeatures(parseOverpass(data.json, this.frame));
      if (data.overture) features.buildings.push(...overtureBuildings(data.overture, this.frame));
      const inR = (x, z) => x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
      const hint = features.buildings.some((b) => inR(b.cx, b.cz)) || features.roads.some((r) => r.pts.some((p) => inR(p[0], p[1])));
      const lp = landPolygons(features.coastLines, rect, hint);
      return { features, land: lp.land, coastStatus: lp.status };
    };
    if (typeof Worker === 'undefined' || this._workerFailed) return Promise.resolve(local());
    if (!this._worker) {
      try {
        this._worker = new Worker(new URL('../data/parse-worker.js', import.meta.url), { type: 'module' });
        this._jobs = new Map(); this._jobId = 0;
        this._worker.onmessage = (e) => { const j = this._jobs.get(e.data.id); if (!j) return; this._jobs.delete(e.data.id); e.data.error ? j.reject(new Error(e.data.error)) : j.resolve(e.data); };
        this._worker.onerror = () => { this._workerFailed = true; for (const j of this._jobs.values()) j.fallback(); this._jobs.clear(); };
      } catch { this._workerFailed = true; return Promise.resolve(local()); }
    }
    return new Promise((resolve, reject) => {
      const id = ++this._jobId;
      this._jobs.set(id, { resolve, reject, fallback: () => { try { resolve(local()); } catch (e) { reject(e); } } });
      this._worker.postMessage({ id, origin: { lat: this.frame.originLat, lon: this.frame.originLon }, rect, json: data.json, overture: data.overture || null });
    });
  }

  async buildTile(tile) {
    const f = tile.features, r = tile.rect, ctx0 = this;
    const acc = new ChunkedAccum(250);
    const inTile = (x, z) => x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;
    tile.colliders = []; tile.surfaces = []; tile.pois = [];
    // --- indexes (needed before procedural placement) ---
    for (const a of f.areas) if (['water', 'beach', 'shingle', 'quay', 'mud'].includes(a.kind)) {
      const outer = clipRingToRect(a.outer, r); if (!outer) continue;
      const b = bounds(outer); const item = { kind: a.kind, outer, holes: a.holes || [], tile: tile.key };
      this.areaGrid.insert(b.minX, b.minZ, b.maxX, b.maxZ, item);
    }
    tile.roadsClipped = [];
    for (const rd of f.roads) {
      for (let k = 1; k < rd.pts.length; k++) {
        const a = rd.pts[k - 1], b = rd.pts[k];
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!inTile(mx, mz)) continue;
        this.roadGrid.insert(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), { a, b, road: rd, tile: tile.key });
      }
    }
    const ownBuildings = f.buildings.filter((b) => inTile(b.cx, b.cz));
    if (this.lidarHeights) for (const b of ownBuildings) {
      const h = this.lidarHeights.get(b.id);
      if (!h || b.heightSource === 'osm:height' || b.isPart) continue;
      b.height = Math.max(2.2, h[1]); b.heightSource = 'lidar';
      if (b.roofShape !== 'flat' && h[1] - h[0] < 0.6 && b.roofShapeSource !== 'osm') b.roofShape = 'flat'; // flat in the DSM
    }
    for (const b of ownBuildings) { const bb = bounds(b.outer); this.buildingGrid.insert(bb.minX, bb.minZ, bb.maxX, bb.maxZ, { outer: b.outer, b, tile: tile.key }); }

    // --- POIs and landmark styles ---
    for (const p of f.pois) {
      if (!inTile(p.x, p.z)) continue;
      const lm = matchLandmark(p);
      const poi = { ...p, landmark: lm ? lm.id : null, tile: tile.key };
      if (!this.pois.has(p.id)) this.pois.set(p.id, poi);
      tile.pois.push(p.id);
    }
    const shopPts = f.points.filter((p) => p.tags.shop || ['restaurant', 'cafe', 'pub', 'bar', 'fast_food', 'bank', 'pharmacy'].includes(p.tags.amenity));
    // Landmark styling: by the building's own name, or by a named landmark area (e.g. a
    // historic=fort polygon) that contains the building.
    const lmAreas = f.pois.filter((p) => p.ring && matchLandmark(p)?.style);
    const landmarkStyle = (b) => {
      let lm = b.name ? matchLandmark({ name: b.name, tags: {} }) : null;
      if (!lm?.style) { const a = lmAreas.find((p) => pointInRing(b.cx, b.cz, p.ring)); if (a) lm = matchLandmark(a); }
      return lm && lm.style ? lm.style : null;
    };
    for (const b of ownBuildings) if (!b.shop && shopPts.some((p) => pointInRing(p.x, p.z, b.outer))) { b.shop = true; b.shopSource = 'osm:shop-node'; }
    const businesses = collectBusinesses(f.pois, this.frame, inTile);
    markShopBuildings(businesses, ownBuildings);
    for (const b of ownBuildings) if ((b.name && matchLandmark({ name: b.name, tags: {} })) || lmAreas.some((p) => pointInRing(b.cx, b.cz, p.ring))) b.landmark = true;

    const ctx = { acc, ground: this.ground, terrain: this.terrain, hasTerrain: this.terrain.hasTerrain, landmarkStyle, settings: this.settings,
      isClear: this.isClear, nearestRoad: (x, z, d, f) => this.nearestRoad(x, z, d, f), isLand: (x, z) => this.isLand(x, z) || this._tileLand(tile, x, z), roadGrid: this.roadGrid, surfaceAt: null, points: f.points.filter((p) => inTile(p.x, p.z)) };

    // --- ground, areas ---
    buildGround(tile, ctx);
    buildAreas(f.areas, tile, ctx);
    await yieldFrame();
    // --- roads (clipped to the tile so neighbours never double-draw) ---
    const roadsHere = [];
    for (const rd of f.roads) {
      const pieces = clipPolyline(rd.pts, r);
      pieces.forEach((pts, idx) => {
        const nodeIds = null; // ends of clipped pieces are not junctions
        roadsHere.push({ ...rd, pts, nodeIds: pieces.length === 1 && pts.length === rd.pts.length ? rd.nodeIds : nodeIds, _piece: idx });
      });
    }
    buildRoads(roadsHere, ctx);
    buildRail(f.lines.map((l) => ({ ...l, pts: l.pts })).flatMap((l) => clipPolyline(l.pts, r).map((pts) => ({ ...l, pts }))), ctx);
    await yieldFrame();
    // --- pier decks ---
    const piers = buildPiers(f, tile, ctx);
    tile.surfaces = piers.surfaces; this.surfaces.push(...piers.surfaces);
    ctx.surfaceAt = this.surfaceAt;
    // --- buildings ---
    // Beach huts: OSM-tagged huts, plus narrow rows of buildings on or next to a mapped beach
    // (often a whole row as one footprint, e.g. in Overture). Rows are split into individual huts.
    const beaches = f.areas.filter((a) => a.kind === 'beach' || a.kind === 'shingle');
    const nearBeach = (b) => beaches.some((a) => { if (pointInRing(b.cx, b.cz, a.outer)) return true; for (let k = 0; k < a.outer.length; k++) { const p = a.outer[k], q = a.outer[(k + 1) % a.outer.length]; if (distToSegment(b.cx, b.cz, p[0], p[1], q[0], q[1]).d < 25) return true; } return false; });
    const hutRows = [];
    for (const b of ownBuildings) {
      if (b.isPart || b.hasParts) continue;
      const obb = orientedBox(b.outer); if (!obb) continue;
      const row = b.kind === 'beach_hut' ? obb.length > 5 : (b.area <= 700 && obb.width <= 3.8 && obb.length >= 6 && b.area / obb.area > 0.8 && (b.heightSource === 'estimated' || b.height < 4.5) && nearBeach(b));
      if (row || (b.kind === 'beach_hut')) { b.hutRow = { obb, inferred: b.kind !== 'beach_hut' }; hutRows.push(b); }
    }
    let nb = 0;
    const landmarkMeshes = [];
    const pierStarts = piers.surfaces.flatMap((sf) => sf.ring);
    for (const b of ownBuildings) {
      if (isPierBuilding(b) && !b.isPart) { // hand-modelled landmark (see pier-building.js)
        const pb = buildPierBuilding(b, { ...ctx, pierStarts });
        landmarkMeshes.push(pb.group); this._addCollider(tile, b, pb.collider);
        for (const c of pb.colliders) this._addPrimitive(tile, c);
        tile.surfaces.push(...pb.surfaces); this.surfaces.push(...pb.surfaces); b.geom = null; b.customModel = 'pier-building';
        continue;
      }
      if (isRegal(b) && !b.isPart) {
        const rg = buildRegal(b, ctx); landmarkMeshes.push(rg.group); this._addCollider(tile, b, rg.collider); b.geom = null; b.customModel = 'regal';
        continue;
      }
      if (isFishDish(b) && !b.isPart) {
        const fd = buildFishDish(b, ctx); landmarkMeshes.push(fd.group); this._addCollider(tile, b, fd.collider); b.geom = null; b.customModel = 'fish-dish';
        continue;
      }
      if (isLeisureCentre(b) && !b.isPart) {
        const lc = buildLeisureCentre(b, ctx); landmarkMeshes.push(...lc.meshes);
        this._addCollider(tile, { ...b, outer: lc.collider.outer, holes: [] }, lc.collider); b.geom = null; b.customModel = 'leisure-centre';
        continue;
      }
      if (b.hasParts) { this._addCollider(tile, b); continue; }
      if (b.hutRow) {
        const { obb } = b.hutRow; const n = Math.max(1, Math.round(obb.length / 2.6)), seg = obb.length / n;
        for (let k = 0; k < n; k++) {
          const s0 = -obb.length / 2 + k * seg + 0.08, s1 = s0 + seg - 0.16, hw = obb.width / 2;
          const P = (su, sv) => [obb.cx + obb.ux * su - obb.uz * sv, obb.cz + obb.uz * su + obb.ux * sv];
          const hut = { ...b, id: b.id * 64 + k, outer: [P(s0, -hw), P(s1, -hw), P(s1, hw), P(s0, hw)], holes: [], kind: 'beach_hut', height: 2.3, heightSource: b.heightSource, roofShape: 'gabled', roofHeight: 0.7, area: (s1 - s0) * obb.width, shop: false, hutRow: null };
          [hut.cx, hut.cz] = P((s0 + s1) / 2, 0);
          addBuilding(hut, ctx);
        }
        this._addCollider(tile, b);
        continue;
      }
      const col = addBuilding(b, ctx);
      if (col && !b.isPart) this._addCollider(tile, b, col);
      if (col?.extraRings?.length) for (const ring of col.extraRings) for (let k = 0; k < ring.length; k++) {
        const a = ring[k], c = ring[(k + 1) % ring.length];
        this.edgeGrid.insert(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]), { type: 'segment', a, b: c, r: 0.02, y0: col.base, top: col.base + 3.5, kind: 'building', id: b.id, tile: tile.key });
      }
      if (++nb % 400 === 0) await yieldFrame();
    }
    // --- shop signs (after buildings: they need each host building's ground and shopfront height) ---
    const signs = buildSigns(businesses, ownBuildings, ctx, tile.key);
    tile.signMaterials = signs.materials; tile.signs = signs.signs; tile.signStats = signs.stats;
    for (const [k, m] of signs.materials) this._signMats.set(k, m);
    await yieldFrame();
    // --- barriers, props, trees ---
    const barrierCols = buildBarriers(f.lines, tile, ctx);
    const props = buildProps(f, tile, ctx);
    const trees = placeTrees(f, tile, { ...ctx, lidarTrees: this.lidarTrees });
    tile.treeStats = { osm: trees.filter((t) => t.source.startsWith('osm')).length, lidar: trees.filter((t) => t.source === 'lidar').length, procedural: trees.filter((t) => t.source === 'procedural').length };
    tile.propStats = props.stats;
    for (const c of [...barrierCols, ...props.colliders, ...piers.colliders]) this._addPrimitive(tile, c);

    // --- meshes ---
    const group = new THREE.Group(); group.name = 'tile:' + tile.key;
    let draws = 0, tris = 0;
    for (const [ck, mats] of acc.chunks) {
      const chunk = new THREE.Group(); chunk.name = 'chunk:' + ck;
      for (const [mk, a] of mats) {
        if (a.empty) continue;
        const far = mk.startsWith('lod:');
        const { material, order, shadow } = this.materialFor(far ? mk.slice(4) : mk);
        const mesh = new THREE.Mesh(a.build(), material);
        mesh.renderOrder = order; mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.name = mk;
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        if (mk.startsWith('door') || mk === 'roller' || mk.startsWith('ground:markings')) mesh.userData.detailRange = 350;
        if (far) mesh.userData.lodFar = 700; else if (mats.has('lod:' + mk)) mesh.userData.lodNear = 700;
        chunk.add(mesh); draws++; tris += a.idx.length / 3;
      }
      group.add(chunk);
    }
    const yard = this._yardMesh(tile);
    if (yard) { group.add(yard.mesh); draws++; for (const c of yard.colliders) this._addPrimitive(tile, c); tile.yardBlocks = yard.count; }
    for (const m of [...buildTreeMeshes(trees, this.surfaceAt), ...props.meshes, ...piers.surfaces.flatMap((s) => s.meshes), ...landmarkMeshes]) { group.add(m); draws++; }
    this.root.add(group);
    tile.group = group; tile.drawObjects = draws; tile.triangles = tris;
    tile.quality = { ...summarise({ ...f, buildings: ownBuildings }), treeStats: tile.treeStats, propStats: tile.propStats, shopSigns: tile.signStats.signs, shopSignsResearchedStyle: tile.signStats.researched, shopSignsGeneratedStyle: tile.signStats.generated, shopSignsCorrectedOrAdded: tile.signStats.corrected + tile.signStats.added };
  }

  /** Instanced container blocks for the yard runs whose centre lies in this tile. */
  _yardMesh(tile) {
    if (!this.yardRuns?.length) return null;
    const r = tile.rect, list = [];
    for (const run of this.yardRuns) {
      if (this.yardVersion === 2) { const [x, z, len, h, ang] = run; if (x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ) list.push({ x, z, len, h, ang }); continue; }
      const [E, N, len, h] = run; const c = this.frame.fromOSGB(E + len / 2, N + 1.25);
      if (c.x >= r.minX && c.x < r.maxX && c.z >= r.minZ && c.z < r.maxZ) list.push({ ...c, len, h, ang: Math.PI / 2 });
    }
    if (!list.length) return null;
    const t = Textures.containerTexture();
    const mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0.3 });
    const PAL = [0x1f4e8c, 0x9c2a22, 0x2f6b3a, 0x7a7d80, 0xd8d6cf, 0x1c6e7a, 0xb06a25, 0x5d3a6e, 0x2a2f36];
    const group = new THREE.Group(); group.name = 'container-stacks';
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), colliders = [];
    const byTier = new Map();
    for (const b of list) { const tier = Math.max(1, Math.round(b.h / 2.59)); if (!byTier.has(tier)) byTier.set(tier, []); byTier.get(tier).push(b); }
    for (const [tier, items] of byTier) {
      // one texture repeat per container along the length and per tier vertically
      const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      const uv = geo.attributes.uv, nrm = geo.attributes.normal;
      for (let k = 0; k < uv.count; k++) { const side = Math.abs(nrm.getX(k)) > 0.5; uv.setXY(k, uv.getX(k) * (side ? 4 : 1), uv.getY(k) * tier); }
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((b, i) => {
        const y = this.ground(b.x, b.z);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.ang);
        m4.compose(new THREE.Vector3(b.x, y, b.z), q, new THREE.Vector3(2.44, tier * 2.59, Math.max(0.5, b.len - 0.25))); im.setMatrixAt(i, m4);
        im.setColorAt(i, col.set(PAL[Math.floor(Math.abs(Math.sin(b.x * 12.9898 + b.z * 78.233)) * 43758.5453) % PAL.length]));
        const fx = Math.sin(b.ang), fz = Math.cos(b.ang), hl = b.len / 2, hw = 1.22;
        const P = (s1, s2) => [b.x + fx * s1 - fz * s2, b.z + fz * s1 + fx * s2];
        const c4 = [P(-hl, -hw), P(hl, -hw), P(hl, hw), P(-hl, hw)];
        for (let k = 0; k < 4; k++) colliders.push({ type: 'segment', a: c4[k], b: c4[(k + 1) % 4], r: 0.05, y0: y, top: y + tier * 2.59, kind: 'building', id: -1 });
      });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.renderOrder = 10;
      group.add(im);
    }
    return { mesh: group, colliders, count: list.length };
  }

  _tileLand(tile, x, z) { return tile.land && tile.land.some((l) => pointInPolygon(x, z, l.outer, l.holes)); }

  _addCollider(tile, b, col = null) {
    const rings = [ensureCCW(b.outer), ...(b.holes || [])];
    const base = col ? col.base : this.ground(b.cx, b.cz) + (b.minHeight || 0);
    const top = col ? col.top : base + b.height;
    if (b.minHeight > 2.2) return; // overhang/bridge part: walk underneath
    rings.forEach((ring, ri) => { for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const item = { type: 'segment', a, b: c, r: 0.02, y0: base, top, kind: 'building', id: b.id, tile: tile.key, outer: ri === 0 };
      this.edgeGrid.insert(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]), item);
    } });
  }
  _addPrimitive(tile, c) {
    c.tile = tile.key;
    if (c.type === 'circle') this.circleGrid.insert(c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r, c);
    else this.edgeGrid.insert(Math.min(c.a[0], c.b[0]) - c.r, Math.min(c.a[1], c.b[1]) - c.r, Math.max(c.a[0], c.b[0]) + c.r, Math.max(c.a[1], c.b[1]) + c.r, c);
  }

  unloadTile(key) {
    const t = this.tiles.get(key); if (!t) return;
    if (t.group) {
      t.group.traverse((o) => { if (o.isMesh && o.geometry && !o.isInstancedMesh) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
      this.root.remove(t.group);
    }
    const pred = (it) => it.tile === key;
    for (const g of [this.edgeGrid, this.circleGrid, this.roadGrid, this.buildingGrid, this.areaGrid]) g.remove(pred);
    this.surfaces = this.surfaces.filter((s) => !(t.surfaces || []).includes(s));
    for (const id of t.pois || []) this.pois.delete(id);
    for (const [k, m] of t.signMaterials || []) { m.map.dispose(); m.dispose(); this._signMats.delete(k); }
    this.tiles.delete(key);
    this.dispatchEvent(new CustomEvent('tileunloaded', { detail: key }));
  }

  materialFor(key) {
    const [type, a, b] = key.split(':');
    if (type === 'facade') return { material: facadeMaterial(a, b === 'true', +(key.split(':')[3] || 0)), order: 10, shadow: true };
    if (type === 'door') return { material: doorMaterial(+a), order: 10, shadow: false };
    if (key === 'roller') return { material: rollerMaterial(), order: 10, shadow: false };
    if (type === 'pb') return { material: leisureMaterial(key), order: 10, shadow: true };
    if (type === 'sign') return { material: this._signMats.get(key), order: 10, shadow: false };
    if (type === 'shop') return { material: shopMaterial(+a), order: 10, shadow: true };
    if (type === 'roof') return { material: roofMaterial(a), order: 10, shadow: true };
    if (type === 'ground') return { material: groundMaterial(a, +b), order: +b === LAYER.deck ? 10 : +b, shadow: +b === LAYER.deck };
    if (key === 'waterOverlay') {
      const m = waterMaterial().clone(); m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -4;
      m.onBeforeCompile = waterMaterial().onBeforeCompile; m.customProgramCacheKey = waterMaterial().customProgramCacheKey; m.userData = waterMaterial().userData;
      return { material: m, order: LAYER.landcover, shadow: false };
    }
    if (key === 'plain:rail') return { material: plainMaterial('rail', 0x6d6a66, { metalness: 0.7, roughness: 0.35 }), order: 10, shadow: false };
    if (key === 'plain:sleeper') return { material: plainMaterial('sleeper', 0x7c776f, { roughness: 0.95 }), order: 10, shadow: false };
    if (key === 'plain:hedge') return { material: plainMaterial('hedge', 0x3d5a2a, { roughness: 1, vertexColors: true }), order: 10, shadow: true };
    if (key === 'plain:railing') return { material: plainMaterial('railing', 0xe8e8e4, { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }), order: 10, shadow: true };
    return { material: plainMaterial('fallback', 0xff00ff), order: 10, shadow: false };
  }

  /** Aggregated data-quality summary for the in-game data panel and test logs. */
  qualityReport() {
    const out = { tiles: [], totals: {} };
    for (const t of this.tiles.values()) {
      if (!t.quality) { out.tiles.push({ key: t.key, error: t.error }); continue; }
      out.tiles.push({ key: t.key, source: t.source, osmBase: t.osmBase, coast: t.coastStatus, timing: t.timing, draws: t.drawObjects, tris: t.triangles, ...t.quality });
      for (const [k, v] of Object.entries(t.quality)) if (typeof v === 'number') out.totals[k] = (out.totals[k] || 0) + v;
    }
    return out;
  }
}

/** Split a polyline into the pieces inside a rect (points interpolated at the edges). */
export function clipPolyline(pts, r) {
  const out = []; let cur = null;
  const ins = (p) => p[0] >= r.minX && p[0] <= r.maxX && p[1] >= r.minZ && p[1] <= r.maxZ;
  const cross = (a, b) => { // first boundary crossing between a and b
    let best = null;
    const tests = [[r.minX, 0], [r.maxX, 0], [r.minZ, 1], [r.maxZ, 1]];
    for (const [v, ax] of tests) {
      const da = a[ax] - v, db = b[ax] - v; if (da === db || (da > 0) === (db > 0)) continue;
      const t = da / (da - db); const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (p[0] >= r.minX - 1e-6 && p[0] <= r.maxX + 1e-6 && p[1] >= r.minZ - 1e-6 && p[1] <= r.maxZ + 1e-6) best = best && best.t < t ? best : { t, p };
    }
    return best;
  };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], inside = ins(p);
    if (i === 0) { if (inside) cur = [p]; continue; }
    const prev = pts[i - 1], pin = ins(prev);
    if (pin && inside) cur.push(p);
    else if (pin && !inside) { const c = cross(prev, p); if (c) cur.push(c.p); if (cur.length > 1) out.push(cur); cur = null; }
    else if (!pin && inside) { const c = cross(prev, p); cur = [c ? c.p : p, p]; }
    else { // both outside: segment may pass through the rect
      const cs = []; const tests = [[r.minX, 0], [r.maxX, 0], [r.minZ, 1], [r.maxZ, 1]];
      for (const [v, ax] of tests) { const da = prev[ax] - v, db = p[ax] - v; if (da === db || (da > 0) === (db > 0)) continue; const t = da / (da - db); const q = [prev[0] + (p[0] - prev[0]) * t, prev[1] + (p[1] - prev[1]) * t]; if (q[0] >= r.minX - 1e-6 && q[0] <= r.maxX + 1e-6 && q[1] >= r.minZ - 1e-6 && q[1] <= r.maxZ + 1e-6) cs.push({ t, q }); }
      if (cs.length >= 2) { cs.sort((x, y) => x.t - y.t); out.push([cs[0].q, cs[cs.length - 1].q]); }
    }
  }
  if (cur && cur.length > 1) out.push(cur);
  return out;
}
