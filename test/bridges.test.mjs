// Node tests for bridge profiles, layered collision and the no-false-junction rule (synthetic data).
import assert from 'node:assert/strict';
import { profileBridge, profileNetwork, BRIDGE } from '../src/world/bridge-profile.js';
import { Collision } from '../src/play/collision.js';
import { SpatialGrid } from '../src/geo/spatial.js';

const results = [];
const test = (name, fn) => { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); console.log('FAIL', name, e.stack); } };
// a 6 m deep cutting along z = 0 (|z| < 12), ground 20 m elsewhere; the DTM-style gap under the bridge
const ground = (x, z) => (Math.abs(z) < 12 ? 14 : 20);
const road = (id, pts, extra = {}) => ({ id, pts, kind: 'tertiary', width: 7, sidewalk: 'both', car: true, bridge: false, ...extra });

test('deck follows the real abutments, not the gap underneath', () => {
  const br = road(1, [[0, -20], [0, 20]], { bridge: true });
  const p = profileBridge(br, ground, [road(2, [[-50, 0], [50, 0]])]);
  assert.ok(Math.abs(p.yAtS(0) - 20) < 0.3 && Math.abs(p.yAtS(p.L) - 20) < 0.3, 'ends at abutments');
  assert.ok(p.yAtS(20) > 19.5, `mid deck ${p.yAtS(20)} must not dip into the cutting`);
  assert.equal(p.crossings.length, 1); assert.ok(p.crossings[0].clearance > 4.5, `clearance ${p.crossings[0].clearance}`);
});
test('a deck is raised (with a ramp gradient) only when the crossing needs more headroom', () => {
  const flat = () => 20; // a road crossing at the same ground level: deck must rise over it
  const p = profileBridge(road(1, [[0, -40], [0, 40]], { bridge: true }), flat, [road(2, [[-50, 0], [50, 0]])]);
  const need = 20 + BRIDGE.clearance.road + BRIDGE.depth.road; assert.ok(p.yAtS(40) >= need - 1e-6);
  for (let s = 0; s < p.L; s += 2) assert.ok(Math.abs(p.yAtS(s + 2) - p.yAtS(s)) / 2 <= BRIDGE.grades.road + 0.02, 'gradient ≤ 6 %');
});
test('bridge ways split at a junction on the deck are profiled as one chain; raised ends get approach ramps', () => {
  const ways = [road(1, [[0, -20], [0, 0]], { bridge: true, nodeIds: [10, 11] }), road(2, [[0, 0], [0, 20]], { bridge: true, nodeIds: [11, 12] }),
    road(3, [[0, -60], [0, -20]], { nodeIds: [9, 10] }), road(5, [[0, -160], [0, -60]], { nodeIds: [8, 9] }), road(4, [[-50, 5], [50, 5]], { nodeIds: [20, 21] })];
  const net = profileNetwork(ways, () => 20);
  assert.equal(net.get(1), net.get(2), 'one profile for the chain'); assert.ok(net.get(3)?.ramp, 'approach ramp on the joining way');
  assert.ok(!net.has(4), 'the road underneath is not changed');
  const ramp = net.get(3); assert.ok(ramp.heightAt(0, -20.5) > 24, 'ramp starts at the deck'); const r2 = net.get(5); assert.ok(r2?.ramp, 'ramp continues onto the next way'); assert.ok(Math.abs(r2.heightAt(0, -150) - 20) < 0.05 && r2.heightAt(0, -61) > 21, 'and meets the ground');
});
test('layered collision: the slab stops a vehicle too tall for the headroom, not one that fits, nor anything on the deck', () => {
  const world = { edgeGrid: new SpatialGrid(16), circleGrid: new SpatialGrid(16), buildingGrid: new SpatialGrid(32) };
  const deckTop = 20, depth = 1.1, under = 14; // 4.9 m headroom
  const slab = { type: 'segment', a: [-5, 0], b: [5, 0], r: 0.05, y0: deckTop - depth, top: deckTop - 0.05, kind: 'bridge-slab' };
  const parapet = { type: 'segment', a: [-5, 0.5], b: [5, 0.5], r: 0.2, y0: deckTop - 0.3, top: deckTop + 1.15, kind: 'parapet' };
  for (const c of [slab, parapet]) world.edgeGrid.insert(Math.min(c.a[0], c.b[0]) - 1, Math.min(c.a[1], c.b[1]) - 1, Math.max(c.a[0], c.b[0]) + 1, Math.max(c.a[1], c.b[1]) + 1, c);
  const col = new Collision(world);
  assert.equal(col.resolve(0, 0.3, 1.2, under + 0.35, under + 4.38).hit, false, 'double-decker (4.38 m) fits under 4.9 m');
  assert.equal(col.resolve(0, 0.3, 1.2, under + 0.35, under + 5.2).hit, true, 'a 5.2 m load is stopped by the slab edge');
  assert.equal(col.resolve(0, -1.5, 0.9, deckTop + 0.35, deckTop + 1.5).hit, false, 'a car on the deck is not hit by the slab');
  assert.equal(col.resolve(0, 0.0, 0.9, deckTop + 0.35, deckTop + 1.5).hit, true, 'but it is kept on the deck by the parapet');
});

const failed = results.filter((r) => r[0] === 'FAIL').length;
for (const r of results) console.log(r[0].padEnd(5), r[1], r[2] || '');
console.log(`\n${results.length - failed}/${results.length} bridge tests passed`); process.exit(failed ? 1 : 0);
