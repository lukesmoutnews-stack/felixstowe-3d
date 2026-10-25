// Builds src/content/playable-zone.js: the playable town-centre + seafront zone and the road closures at its edge.
//
//   node tools/build-zone.mjs [tilesDir]
//
// 1. Corridors: real street centrelines from the OSM tiles (by name, clipped to a box, or by way id), each with
//    a buffer radius that takes in the buildings either side. Plus a shore polygon: the beach, promenade and sea
//    between the seafront roads and the water, from Manwick Road (Sea Road) to past the Spa Pavilion.
// 2. Closures: every road or path that leaves the zone (sampled every 2 m with the same inZone() the game uses)
//    gets a closure a few metres inside the edge: cones, signs and barriers for roads, a barrier for footpaths.
// Nothing is moved or deleted; the closures sit on the existing road data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { CONFIG } from '../src/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2] || path.join(root, 'fx/tiles');
const out = path.join(root, 'src/content/playable-zone.js');
const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon);

const roads = new Map();
for (const f of fs.readdirSync(dir)) { if (!f.endsWith('.json')) continue; const F = buildFeatures(parseOverpass(JSON.parse(fs.readFileSync(path.join(dir, f))), frame)); for (const r of F.roads) roads.set(r.id, r); }
console.log('roads', roads.size);

// ---- 1. corridors ----
const BIG = [-1e9, -1e9, 1e9, 1e9];
const SPEC = [
  { name: 'Hamilton Road', r: 45, why: 'main shopping street, Bent Hill to the High Road roundabout' },
  { name: 'Bent Hill', r: 40, why: 'links Hamilton Road to the seafront' },
  { name: 'Undercliff Road West', r: 45, why: 'seafront road, Sea Road roundabout to below the Spa Pavilion' },
  { name: 'Hamilton Gardens', r: 40, box: [-1e9, -1e9, 430, 1e9], why: 'cliff-top road past the Spa Pavilion' },
  { name: 'Sea Road', r: 45, box: [-1e9, -1e9, 1e9, 720], why: 'seafront road south to Manwick Road (Breakwater Bikes)' },
  { name: 'Orwell Road', r: 40, box: [-300, -1e9, 1e9, 1e9], why: 'shops west of Hamilton Road (to Bellbuoy Vintage)' },
  { name: 'Victoria Street', r: 40, why: 'town-centre street (Lantern Lane Books)' },
  { name: 'Cobbold Road', r: 40, box: [60, -1e9, 320, 1e9], why: 'east of the Triangle (Seaholly Plants)' },
  { name: 'Convalescent Hill', r: 35, why: 'Town Hall to the cliff top' },
  { ids: [6149340, 357281673, 357281672, 357281670, 357281669, 357281668, 357281665, 357281666, 357281730], r: 30, why: 'station forecourt and car park off Hamilton Road' },
  { name: 'The Promenade', r: 30, box: [-660, -1e9, 530, 1e9], why: 'promenade' },
  { ids: [1281417446, 164058647, 1228469198], r: 35, why: 'Wolsey Gardens: the way back down from Bent Hill (one-way up) to the Town Hall' },
  { name: 'Railway Approach', r: 30, why: 'the station road (the station car park has no car link to Hamilton Road in OSM)' },
  { name: 'High Road West', r: 35, box: [-10, -1e9, 1e9, 1e9], why: 'from Railway Approach to the Hamilton Road roundabout' },
];
function densify(pts, step) { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; }
const inBox = (p, b) => p[0] >= b[0] && p[1] >= b[1] && p[0] <= b[2] && p[1] <= b[3];
const corridors = [];
for (const s of SPEC) {
  const ways = [...roads.values()].filter((r) => (s.name ? r.name === s.name : s.ids.includes(r.id)));
  if (!ways.length) { console.warn('no ways for', s.name || s.ids); continue; }
  for (const w of ways) {
    let run = [];
    for (const p of densify(w.pts, 5)) { if (inBox(p, s.box || BIG)) run.push([+p[0].toFixed(1), +p[1].toFixed(1)]); else { if (run.length > 1) corridors.push({ r: s.r, src: s.name || 'station', pts: simplify(run) }); run = []; } }
    if (run.length > 1) corridors.push({ r: s.r, src: s.name || 'station', pts: simplify(run) });
  }
}
function simplify(pts) { // drop points that sit on a straight line within 0.5 m
  const o = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) { const a = o[o.length - 1], b = pts[i + 1], p = pts[i]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; if (Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / L > 0.5) o.push(p); }
  o.push(pts[pts.length - 1]); return o;
}

// shore polygon: landward edge along Sea Road and Undercliff Road West (from the OSM centrelines), seaward edge
// 420 m out to sea, square to the coast (which runs SW-NE here)
const land = [[-629, 720], [-594, 652], [-521, 510], [-428, 324], [-384, 242], [-343, 210], [-277, 184], [-143, 115], [63, 14], [165, -32], [279, -84], [412, -126], [522, -164]];
const sea = [0.62, 0.78], OFF = 420;
const shore = [...land, ...land.slice().reverse().map((p) => [Math.round(p[0] + sea[0] * OFF), Math.round(p[1] + sea[1] * OFF)])];

write({ corridors, shore, closures: [] });

// ---- 2. closures (using the game's own inZone) ----
const { inZone } = await import(pathToFileURL(path.join(root, 'src/world/zone.js')).href + '?v=' + Date.now());
const closures = [];
// where other car-going ways join each way (not at the way's own ends), for the back-lane rule below
const joinPts = new Map();
{ const byNode = new Map(); for (const r of roads.values()) if (r.car && !r.footOnly) (r.nodeIds || []).forEach((n, i) => { if (n == null) return; if (!byNode.has(n)) byNode.set(n, []); byNode.get(n).push([r, i]); });
  for (const list of byNode.values()) if (list.length > 1) for (const [r, i] of list) { if (!joinPts.has(r.id)) joinPts.set(r.id, []); joinPts.get(r.id).push(r.pts[i]); } }
const nodeUse = new Map(); for (const r of roads.values()) for (const id of r.nodeIds || []) if (id != null) nodeUse.set(id, (nodeUse.get(id) || 0) + 1);
for (const r of roads.values()) {
  if (r.tunnel) continue;
  const P = densify(r.pts, 2);
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], ia = inZone(a[0], a[1]), ib = inZone(b[0], b[1]);
    if (ia === ib) continue;
    // inside point and the outward direction along the road
    const [pin, pout] = ia ? [a, b] : [b, a];
    let ux = pout[0] - pin[0], uz = pout[1] - pin[1]; const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L; // replaced below by the way's direction at the closure
    const back = r.footOnly ? 1 : 2.5; // stand the closure a little inside the edge, stepping back along the way (2 m samples)
    let j = ia ? Math.max(0, i - 1 - back) : Math.min(P.length - 1, i + back);
    // never in the junction the way leaves from: at least 9 m (4-5 samples) up the side road from its inner end,
    // even if that puts the closure a few metres beyond the zone edge (the soft boundary covers the gap)
    const MIN = 6; if (ia && j < MIN) j = Math.min(P.length - 1, MIN); if (!ia && P.length - 1 - j < MIN) j = Math.max(0, P.length - 1 - MIN);
    // a car-going way that branches off just inside the closure (a back lane, a drive) must stay reachable: move the
    // closure out until it is at least 8 m (4 samples) beyond any such junction
    if (!r.footOnly) for (let guard = 0; guard < 20; guard++) {
      const k = Math.round(j), lo = ia ? Math.max(0, k - 4) : k, hi = ia ? k : Math.min(P.length - 1, k + 4);
      const hit = joinPts.get(r.id)?.some(([jx, jz]) => { for (let q = lo; q <= hi; q++) if (Math.hypot(P[q][0] - jx, P[q][1] - jz) < 1.2) return true; return false; });
      if (!hit) break; const nj = ia ? j + 1 : j - 1; if (nj < 0 || nj > P.length - 1) break; j = nj;
    }
    const x = P[Math.round(j)][0], z = P[Math.round(j)][1];
    { const k2 = Math.round(j), nb = ia ? Math.min(P.length - 1, k2 + 1) : Math.max(0, k2 - 1); let vx = P[nb][0] - x, vz = P[nb][1] - z; const vl = Math.hypot(vx, vz); if (vl > 1e-6) { ux = vx / vl; uz = vz / vl; } } // the way's own direction there
    closures.push({ road: r.id, name: r.name || '', kind: r.footOnly ? 'foot' : r.car ? (r.kind === 'service' || r.kind === 'track' ? 'service' : 'road') : 'foot', hw: r.kind, width: +(r.width || 5).toFixed(1), x: +x.toFixed(2), z: +z.toFixed(2), ux: +ux.toFixed(4), uz: +uz.toFixed(4), bridge: !!r.bridge });
  }
}
// "ROAD CLOSED AHEAD" warning: 28 m back along the same way (towards the zone), only where the way is long enough
// that the warning is not inside the junction it leaves from, and the spot is still in the zone
for (const c of closures) {
  if (c.kind !== 'road') continue;
  const r = roads.get(c.road), P = densify(r.pts, 1);
  let k = 0, bd = Infinity; for (let i = 0; i < P.length; i++) { const d = Math.hypot(P[i][0] - c.x, P[i][1] - c.z); if (d < bd) { bd = d; k = i; } }
  // which way along the polyline points back into the zone (against the closure's outward direction)?
  const fwd = k + 1 < P.length ? (P[k + 1][0] - P[k][0]) * c.ux + (P[k + 1][1] - P[k][1]) * c.uz : -1, step = fwd > 0 ? -1 : 1;
  let walked = 0, j = k; while (walked < 28 && j + step >= 0 && j + step < P.length) { walked += Math.hypot(P[j + step][0] - P[j][0], P[j + step][1] - P[j][1]); j += step; }
  const endGap = step < 0 ? j : P.length - 1 - j; // metres of way left beyond the warning before the way ends (a junction)
  if (walked < 27 || endGap < 10 || !inZone(P[j][0], P[j][1])) continue;
  const q = P[j + (step < 0 ? 1 : -1)] || P[j]; let ux = q[0] - P[j][0], uz = q[1] - P[j][1]; const L = Math.hypot(ux, uz) || 1; // facing direction of travel towards the closure
  c.ahead = { x: +P[j][0].toFixed(2), z: +P[j][1].toFixed(2), ux: +(ux / L).toFixed(4), uz: +(uz / L).toFixed(4) };
}
// one closure per road per place
const kept = [];
for (const c of closures) if (!kept.some((k) => k.road === c.road && Math.hypot(k.x - c.x, k.z - c.z) < 20)) kept.push(c);
kept.sort((p, q) => p.kind.localeCompare(q.kind) || p.name.localeCompare(q.name));
write({ corridors, shore, closures: kept });
const by = {}; for (const c of kept) by[c.kind] = (by[c.kind] || 0) + 1;
console.log('corridors', corridors.length, 'closures', kept.length, JSON.stringify(by), 'warning signs', kept.filter((c) => c.ahead).length);

function write(Z) {
  const meta = { generated: new Date().toISOString().slice(0, 10), source: 'OSM tiles in fx/tiles via tools/build-zone.mjs', spec: SPEC.map((s) => ({ name: s.name || 'station', r: s.r, why: s.why })) };
  fs.writeFileSync(out, `// GENERATED by tools/build-zone.mjs from the OSM road data. Do not edit by hand; edit SPEC there and rerun.\n// The playable town-centre + seafront zone (corridors around real streets + the shore) and the closures at its edge.\nexport const PLAYABLE_ZONE = ${JSON.stringify({ meta, ...Z })};\n`);
}
