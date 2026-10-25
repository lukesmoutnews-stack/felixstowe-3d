// Playable-zone checks against the OSM road data (no browser):
//  1. every road or path that crosses the zone edge has a closure on it, whose barrier spans the way;
//  2. the town centre and the seafront are connected by car inside the zone (Triangle <-> pier, Spa, Town Hall,
//     Breakwater Bikes on Sea Road, the station), and on foot;
//  3. every game location in the town centre / seafront areas is inside the zone;
//  4. closures sit on their road (not in a junction of another road that stays open).
//   node test/zone.test.mjs
import fs from 'node:fs';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { CONFIG } from '../src/config.js';
import { inZone, CLOSURES, playable } from '../src/world/zone.js';
import { LOCATIONS } from '../src/mayor/content.js';

const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon), dir = new URL('../fx/tiles/', import.meta.url);
const roads = new Map();
for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) { const F = buildFeatures(parseOverpass(JSON.parse(fs.readFileSync(new URL(f, dir))), frame)); for (const r of F.roads) roads.set(r.id, r); }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const densify = (pts, step) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
const cross = (p1, p2, q1, q2) => { const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return d(p1, p2, q1) * d(p1, p2, q2) <= 0 && d(q1, q2, p1) * d(q1, q2, p2) <= 0; };

// 1. every crossing is closed, and the closure's barrier line cuts the way
let crossings = 0;
for (const r of roads.values()) {
  if (r.tunnel) continue; const P = densify(r.pts, 2);
  for (let i = 1; i < P.length; i++) {
    if (inZone(P[i - 1][0], P[i - 1][1]) === inZone(P[i][0], P[i][1])) continue; crossings++;
    const c = CLOSURES.find((k) => k.road === r.id && Math.hypot(k.x - P[i][0], k.z - P[i][1]) < 25);
    if (!c) { ok(false, `no closure on ${r.name || r.kind} ${r.id} at ${P[i].map(Math.round)}`); continue; }
    const hw = (c.width || 2) / 2 + 0.4, A = [c.x - c.uz * -hw, c.z + c.ux * -hw], B = [c.x - c.uz * hw, c.z + c.ux * hw]; // barrier line across the way
    let cut = false; for (let k = 1; k < P.length && !cut; k++) cut = cross(A, B, P[k - 1], P[k]);
    ok(cut, `closure on ${r.name || r.kind} ${r.id} does not cross the way`);
  }
}
ok(crossings > 0 && CLOSURES.length > 0, 'zone has crossings and closures');
console.log(`crossings ${crossings}, closures ${CLOSURES.length}`);

// 2. connectivity inside the zone (by node ids), by car and on foot
function graph(filter) {
  const adj = new Map(), add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
  for (const r of roads.values()) {
    if (!filter(r) || !r.nodeIds) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.nodeIds[i - 1] ?? `${r.id}:${i - 1}`, b = r.nodeIds[i] ?? `${r.id}:${i}`;
      const m = [(r.pts[i - 1][0] + r.pts[i][0]) / 2, (r.pts[i - 1][1] + r.pts[i][1]) / 2];
      const sl = filter.car ? 2.8 : 0.35; if (!playable(r.pts[i - 1][0], r.pts[i - 1][1], sl) || !playable(r.pts[i][0], r.pts[i][1], sl) || !playable(m[0], m[1], sl)) continue;
      add(a, b); if (!(r.oneway && filter.car)) add(b, a);
    }
  }
  return adj;
}
const nearestNode = (filter, x, z) => { let best = null, bd = Infinity; for (const r of roads.values()) { if (!filter(r) || !r.nodeIds) continue; r.pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd && inZone(p[0], p[1])) { bd = d; best = r.nodeIds[i] ?? `${r.id}:${i}`; } }); } return { id: best, d: bd }; };
const reach = (adj, from) => { const seen = new Set([from]), q = [from]; while (q.length) { const n = q.shift(); for (const m of adj.get(n) || []) if (!seen.has(m)) { seen.add(m); q.push(m); } } return seen; };
const W = (id) => { const l = LOCATIONS.find((k) => k.id === id); const w = frame.toWorld(l.lat, l.lon); return [w.x, w.z]; };
const car = (r) => r.car && !r.footOnly && r.kind !== 'track'; car.car = true;
const foot = (r) => true;
for (const [label, filter] of [['car', car], ['foot', foot]]) {
  const adj = graph(filter), start = nearestNode(filter, ...W('triangle')), seen = reach(adj, start.id);
  for (const id of ['town_hall', 'pier', 'spa', 'breakwater', 'station', 'kittiwake', 'bellbuoy', 'seaholly', 'driftlight']) {
    const n = nearestNode(filter, ...W(id)); ok(n.d < 90 && seen.has(n.id), `${label}: Triangle -> ${id} not connected inside the zone (nearest node ${Math.round(n.d)} m)`);
  }
}

// 2b. no open road is cut by a closure's blocked band: every car road segment that is inside the zone along its
//     whole length (an open road, not a stub up to a closure) stays playable, with a car's slack
{ let cut = 0; const seen = [];
  for (const r of roads.values()) { if (!car(r)) continue; const P = densify(r.pts, 3); if (r.kind === 'service' && P.length < 8) continue; // a driveway stub off a closed road
    // split into runs of in-zone points; a run that touches a crossing is a stub to a closure, so skip runs at the ends of a crossing
    let run = []; const flush = (endsAtEdge) => { if (run.length > 2 && !endsAtEdge.some(Boolean)) for (const p of run) if (!playable(p[0], p[1], 2.8)) { cut++; if (seen.length < 5) seen.push(`${r.name || r.id} ${p.map(Math.round)}`); } run = []; };
    let startEdge = false;
    for (let i = 0; i < P.length; i++) { const inside = inZone(P[i][0], P[i][1]); if (inside) { if (!run.length) startEdge = i > 0; run.push(P[i]); } else if (run.length) flush([startEdge, true]); }
    if (run.length) flush([startEdge, false]);
  }
  ok(cut === 0, `open roads cut by a closure band at ${cut} points: ${seen.join('; ')}`); }

// 3. town-centre and seafront locations are inside; the rest are outside
for (const l of LOCATIONS) { const [x, z] = W(l.id), want = /Town centre|^Seafront/.test(l.area); ok(inZone(x, z) === want, `${l.id} (${l.area}) inZone=${inZone(x, z)}`); }

// 4. closures are on their way and away from other open roads' junctions
for (const c of CLOSURES) {
  const r = roads.get(c.road); let d = Infinity; const P = densify(r.pts, 1); for (const p of P) d = Math.min(d, Math.hypot(p[0] - c.x, p[1] - c.z));
  ok(d < 1.5, `closure ${c.name || c.road} is ${d.toFixed(1)} m off its way`);
  { const P = densify(r.pts, 1), dEnd = Math.min(...[P[0], P.at(-1)].map((e) => Math.hypot(e[0] - c.x, e[1] - c.z))); const wayLen = P.length - 1; ok(dEnd > 7 || c.kind === 'foot' || wayLen < 16, `closure ${c.name || c.road} is ${dEnd.toFixed(1)} m from the end of its way (in a junction)`); }
}
console.log(`${pass}/${pass + fail} zone checks passed`);
process.exit(fail ? 1 : 0);
