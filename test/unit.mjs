// Node unit tests for the geographic core (no browser needed):  node test/unit.mjs
import assert from 'node:assert/strict';
import { tmForward, tmInverse, gridRef, parseGridRef, LocalFrame, wgs84ToOsgbHelmert } from '../src/geo/projection.js';
import { landPolygons } from '../src/geo/coast.js';
import { area, insetRing, orientedBox, signedAreaEN, pointInRing } from '../src/geo/polygon.js';
import { classifyBuilding, classifyRoad, num, assembleRings, parseOverpass, buildFeatures } from '../src/geo/osm.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ', name); };
const AIRY = { a: 6377563.396, b: 6356256.909 };

t('OS worked example: Airy TM forward (OS guide, Annex C)', () => {
  const lat = 52 + 39 / 60 + 27.2531 / 3600, lon = 1 + 43 / 60 + 4.5177 / 3600;
  const p = tmForward(lat, lon, AIRY);
  assert.ok(Math.abs(p.E - 651409.903) < 0.002 && Math.abs(p.N - 313177.270) < 0.002, JSON.stringify(p));
  const q = tmInverse(p.E, p.N, AIRY);
  assert.ok(Math.abs(q.lat - lat) < 1e-8 && Math.abs(q.lon - lon) < 1e-8);
});
t('grid references round-trip', () => {
  assert.equal(gridRef(651409.903, 313177.270), 'TG 51409 13177');
  assert.deepEqual(parseGridRef('TM 30251 33918'), { E: 630251, N: 233918 });
});
t('local frame round-trips within 1 mm across the town', () => {
  const f = new LocalFrame(51.96, 1.35);
  for (const [la, lo] of [[51.93, 1.27], [52.0, 1.4], [51.9567, 1.3496]]) {
    const w = f.toWorld(la, lo), b = f.toLatLon(w.x, w.z);
    assert.ok(Math.abs(b.lat - la) < 1e-8 && Math.abs(b.lon - lo) < 1e-8);
  }
  // world axes: north is -z, east is +x
  const n1 = f.toWorld(51.97, 1.35), e1 = f.toWorld(51.96, 1.36);
  // grid convergence at 1.35°E: true north is ~2.6° west of grid north, so a due-north offset drifts ~50 m in x per km
  assert.ok(n1.z < -1000 && n1.x < 0 && Math.abs(Math.atan2(-n1.x, -n1.z) * 180 / Math.PI - 2.64) < 0.1 && e1.x > 600, JSON.stringify(n1));
});
t('Helmert OSGB shift is about 100 m and consistent with the frame', () => {
  const f = new LocalFrame(51.96, 1.35);
  const d = Math.hypot(f.osgbShift.se, f.osgbShift.sn);
  assert.ok(d > 80 && d < 140, String(d));
  const h = wgs84ToOsgbHelmert(51.95, 1.32), w = f.toWorld(51.95, 1.32), o = f.toOSGB(w.x, w.z);
  assert.ok(Math.hypot(h.E - o.E, h.N - o.N) < 0.5);
});
const rect = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
t('coastline: land on the left of the way (west of a northbound coast)', () => {
  const { land } = landPolygons([[[60, 150], [60, -50]]], rect, true);
  assert.equal(land.length, 1);
  assert.ok(Math.abs(area(land[0].outer) - 6000) < 1, String(area(land[0].outer)));
  assert.ok(pointInRing(10, 50, land[0].outer) && !pointInRing(90, 50, land[0].outer));
  assert.ok(signedAreaEN(land[0].outer) > 0);
});
t('coastline: reversed direction gives the complementary land', () => {
  const { land } = landPolygons([[[60, -50], [60, 150]]], rect, true);
  assert.ok(Math.abs(area(land[0].outer) - 4000) < 1);
});
t('coastline: two separate crossings make two land pieces (an inlet)', () => {
  const coast = [[[30, 150], [30, 50], [-50, 50]], [[150, 50], [70, 50], [70, 150]]];
  const { land } = landPolygons(coast, rect, true);
  const total = land.reduce((s, l) => s + area(l.outer), 0);
  assert.ok(Math.abs(total - 3000) < 1 && land.length === 2, String(total)); // two 30x50 headlands either side of the inlet
});
t('coastline: dangling end inside the tile is extended to the edge', () => {
  const { land, status } = landPolygons([[[60, 150], [60, 40]]], rect, true);
  assert.ok(/brokenEnds:1/.test(status));
  assert.ok(Math.abs(area(land[0].outer) - 6000) < 1);
});
t('coastline: island ring inside the tile', () => {
  const island = [[40, 60], [60, 60], [60, 40], [40, 40], [40, 60]]; // CCW in east/north terms
  const { land } = landPolygons([island], rect, false);
  assert.equal(land.length, 1); assert.ok(Math.abs(area(land[0].outer) - 400) < 1);
});
t('inset roof ring for an L-shaped footprint', () => {
  const L = [[0, 0], [20, 0], [20, -8], [8, -8], [8, -20], [0, -20]];
  const r = insetRing(L, 2); assert.ok(r && area(r) < area(L) && area(r) > 50);
  assert.equal(insetRing(L, 5), null);
});
t('oriented box finds the long axis of a rotated rectangle', () => {
  const a = 0.5, c = Math.cos(a), s = Math.sin(a);
  const R = [[-10, -3], [10, -3], [10, 3], [-10, 3]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
  const o = orientedBox(R); assert.ok(Math.abs(o.length - 20) < 1e-6 && Math.abs(o.width - 6) < 1e-6);
});
t('tag parsing: heights and widths', () => {
  assert.equal(num('12 m'), 12); assert.equal(num('12.5'), 12.5); assert.ok(Math.abs(num("30'") - 9.144) < 1e-9);
  const ring = [[0, 0], [6, 0], [6, -9], [0, -9]];
  assert.equal(classifyBuilding(1, { building: 'house', height: '11' }, ring).heightSource, 'osm:height');
  const lv = classifyBuilding(2, { building: 'yes', 'building:levels': '3' }, ring); assert.equal(lv.heightSource, 'osm:levels'); assert.ok(Math.abs(lv.height - 9) < 0.01);
  assert.equal(classifyBuilding(3, { building: 'terrace' }, ring).heightSource, 'estimated');
  const r = classifyRoad({ highway: 'residential', width: '7' }); assert.equal(r.width, 7); assert.equal(r.widthSource, 'osm:width');
  assert.equal(classifyRoad({ highway: 'primary', lanes: '2' }).widthSource, 'osm:lanes');
  assert.equal(classifyRoad({ highway: 'footway' }).footOnly, true);
});
t('multipolygon ring assembly from split ways', () => {
  const rings = assembleRings([[[0, 0], [10, 0], [10, 10]], [[10, 10], [0, 10], [0, 0]]]);
  assert.equal(rings.length, 1); assert.equal(rings[0].length, 4);
});
t('Overpass JSON (out geom) -> features keeps OSM ids', () => {
  const f = new LocalFrame(51.96, 1.35);
  const json = { elements: [
    { type: 'way', id: 42, nodes: [1, 2, 3, 4, 1], tags: { building: 'house' }, geometry: [{ lat: 51.96, lon: 1.35 }, { lat: 51.96, lon: 1.3501 }, { lat: 51.9601, lon: 1.3501 }, { lat: 51.9601, lon: 1.35 }, { lat: 51.96, lon: 1.35 }] },
    { type: 'way', id: 7, nodes: [5, 6], tags: { highway: 'residential', name: 'Hamilton Road' }, geometry: [{ lat: 51.959, lon: 1.35 }, { lat: 51.959, lon: 1.351 }] },
    { type: 'node', id: 9, lat: 51.9595, lon: 1.3505, tags: { natural: 'tree' } },
  ] };
  const feats = buildFeatures(parseOverpass(json, f));
  assert.equal(feats.buildings[0].id, 42); assert.equal(feats.roads[0].name, 'Hamilton Road'); assert.equal(feats.points[0].kind, 'tree');
  assert.ok(Math.abs(area(feats.buildings[0].outer) - 6.88 * 11.12) < 3, String(area(feats.buildings[0].outer)));
});
console.log(`\n${n} unit tests passed`);
