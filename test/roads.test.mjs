// Node tests for smooth road geometry and the shared road surface (synthetic data, no browser).
import assert from 'node:assert/strict';
import { filletPolyline, smoothRoads } from '../src/geo/road-smooth.js';
import { RoadNetwork, ROAD, earClip } from '../src/world/road-surface.js';

const results = [];
const test = (name, fn) => { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL', name, e.stack); } };
const turn = (pts) => { let m = 0; for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], p = pts[i], c = pts[i + 1]; let d = Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]); d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); m = Math.max(m, d); } return m * 180 / Math.PI; };
const road = (id, pts, nodeIds, extra = {}) => ({ id, pts, nodeIds, kind: 'residential', width: 6, sidewalk: 'both', car: true, footOnly: false, surface: 'asphalt', markings: true, ...extra });

test('a 90-degree bend becomes an arc: no vertex turns more than 8 degrees, ends unchanged', () => {
  const r = filletPolyline([[0, 0], [40, 0], [40, 40]], [1, 2, 3], () => false, 15);
  assert.ok(turn(r.pts) < 8, `max turn ${turn(r.pts).toFixed(1)}`);
  assert.deepEqual(r.pts[0], [0, 0]); assert.deepEqual(r.pts[r.pts.length - 1], [40, 40]);
  assert.equal(r.nodeIds[0], 1); assert.equal(r.nodeIds[r.nodeIds.length - 1], 3); assert.ok(r.nodeIds.slice(1, -1).every((v) => v === null));
  // the arc keeps to the radius: its middle point is r(1 - 1/sqrt2) inside the corner
  const mid = r.pts[Math.floor(r.pts.length / 2)], d = Math.hypot(mid[0] - 40, mid[1] - 0);
  assert.ok(Math.abs(d - 15 * (Math.SQRT2 - 1)) < 0.2, `corner offset ${d.toFixed(2)}`);
});
test('junction nodes shared by two ways never move', () => {
  const a = road(1, [[0, 0], [30, 0], [60, 10]], [10, 11, 12]), b = road(2, [[30, 0], [30, 40]], [11, 13]);
  smoothRoads([a, b]);
  assert.ok(a.pts.some((p, i) => p[0] === 30 && p[1] === 0 && a.nodeIds[i] === 11), 'node 11 kept in way 1');
  assert.deepEqual(b.pts[0], [30, 0]);
});
test('roads meet at one shared height; the profile is smooth even on noisy terrain', () => {
  const noisy = (x, z) => 5 + 0.02 * x + 0.25 * Math.sin(x * 2.3) * Math.cos(z * 1.7); // lumpy 1 m terrain
  const net = new RoadNetwork(noisy);
  const a = road(1, [[0, 0], [50, 0], [100, 0]], [1, 2, 3]), b = road(2, [[50, 0], [50, 60]], [2, 4]);
  net.addWays([a, b], new Map(), 't');
  const A = net.ways.get(1), B = net.ways.get(2);
  assert.ok(Math.abs(A.hc(50) - B.hc(0)) < 1e-9, `node heights ${A.hc(50)} vs ${B.hc(0)}`);
  let maxStep = 0; for (let s = 1; s < 99; s += 0.5) maxStep = Math.max(maxStep, Math.abs(A.hc(s + 0.5) - 2 * A.hc(s) + A.hc(s - 0.5)));
  assert.ok(maxStep < 0.01, `second difference ${maxStep.toFixed(4)} m per 0.5 m (terrain lumps are 0.25 m)`);
});
test('carriageway crown, kerb and raised pavement, and the ground is graded below them', () => {
  const net = new RoadNetwork(() => 3);
  net.addWays([road(1, [[0, 0], [100, 0]], [1, 2])], new Map(), 't');
  const c = net.surface(50, 0), e = net.surface(50, 2.9), p = net.surface(50, 4), out = net.surface(50, 12);
  assert.equal(c.kind, 'road'); assert.equal(p.kind, 'pavement'); assert.equal(out, null);
  assert.ok(c.y - e.y > 0.05 && c.y - e.y < 0.1, `crown fall ${(c.y - e.y).toFixed(3)}`);
  assert.ok(Math.abs(p.y - (net.ways.get(1).edgeY(50) + ROAD.kerb)) < 1e-6, 'pavement = edge + kerb');
  for (const z of [0, 2, 3.5, 4.5]) assert.ok(net.grade(50, z, 3.5) < (net.surface(50, z)?.y ?? Infinity) - 0.03, `ground below the surface at z=${z}`);
  assert.ok(Math.abs(net.grade(50, 30, 3.0) - 3.0) < 1e-9, 'terrain untouched far from the road');
});
test('kerbs drop at a mapped crossing', () => {
  const net = new RoadNetwork(() => 0);
  net.addPoints([{ id: 7, kind: 'crossing', tags: {} }]);
  net.addWays([road(1, [[0, 0], [40, 0], [80, 0]], [1, 7, 2])], new Map(), 't');
  const W = net.ways.get(1);
  assert.ok(W.kerbH(40) < 0.03 && W.kerbH(20) === ROAD.kerb, `kerb ${W.kerbH(40)} at the crossing, ${W.kerbH(20)} elsewhere`);
});
test('a T junction gets a polygon with kerb-corner arcs that answers height queries', () => {
  const net = new RoadNetwork(() => 2);
  const a = road(1, [[-50, 0], [0, 0], [50, 0]], [1, 2, 3]), b = road(2, [[0, 0], [0, 50]], [2, 4]);
  net.addWays([a, b], new Map(), 't'); net.prepareCores({ minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, 't');
  const core = net.junction(2); assert.ok(core, 'junction built');
  assert.equal(core.arms.length, 3); assert.equal(core.corners.filter((k) => k.type === 'arc').length, 2);
  assert.ok(core.heightAt(0, 2) != null && Math.abs(core.heightAt(0, 2) - 2) < 0.1, 'covers the mouth of the side road');
  assert.equal(net.surface(5, 5).kind, 'pavement', 'corner pavement between the side road and the main road is walkable');
  assert.equal(net.surface(0, 0).kind, 'road');
});
test('ear clipping triangulates a concave polygon fully', () => {
  const P = [[0, 0], [4, 0], [4, 4], [2, 1], [0, 4]]; const t = earClip(P);
  const area = t.reduce((s, [a, b, c]) => s + Math.abs((P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0])) / 2, 0);
  assert.ok(Math.abs(area - 10) < 1e-9, `area ${area}`);
});
test('bridge decks are not part of the road surface, and their end nodes pin the joining roads', () => {
  const net = new RoadNetwork(() => 0);
  const deck = road(5, [[0, 0], [40, 0]], [1, 2], { bridge: true }), appr = road(6, [[40, 0], [90, 0]], [2, 3]);
  const prof = { ramp: false, heightAt: () => 6 };
  net.addWays([deck, appr], new Map([[5, prof]]), 't');
  assert.equal(net.ways.has(5), false);
  assert.ok(Math.abs(net.ways.get(6).hc(0) - 6) < 1e-9, 'approach starts at the deck height');
});

const failed = results.filter((r) => r[0] !== 'ok');
for (const r of results) console.log(r[0].padEnd(5), r[1], r[2] || '');
console.log(`\n${results.length - failed.length}/${results.length} road tests passed`);
process.exit(failed.length ? 1 : 0);
