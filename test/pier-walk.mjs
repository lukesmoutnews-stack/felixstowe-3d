// Pier building boardwalk: can you walk the whole way round the building on the deck, and out onto the pier?
//   node test/pier-walk.mjs      (also run from test/zone.test.mjs)
// Builds the real pier building (src/world/pier-building.js, pier-boardwalk.js) in Node from the OSM footprint (way 91786049) and the
// pier (way 28724732), with a stub canvas and a synthetic ground that rises towards the promenade, then rasterises the deck at 0.2 m
// and flood-fills it with a walker of radius 0.75 m (a 1.5 m wide corridor) using the same colliders the game uses.
import fs from 'node:fs';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { CONFIG } from '../src/config.js';
import { ensureCCW, pointInRing } from '../src/geo/polygon.js';

export async function pierWalkChecks(ok) {
  // stub the canvas the texture helpers draw on (no pixels are needed for geometry and colliders)
  const ctx2d = new Proxy(function () {}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === Symbol.toPrimitive ? () => 0 : ctx2d), set: () => true, apply: () => ctx2d });
  const hadDoc = 'document' in globalThis;
  if (!hadDoc) globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) };
  const { buildPierBuilding, pierFrame } = await import('../src/world/pier-building.js');

  const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon), dir = new URL('../fx/tiles/', import.meta.url);
  let bld = null, pierLine = null;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) {
    const F = buildFeatures(parseOverpass(JSON.parse(fs.readFileSync(new URL(f, dir))), frame));
    bld = bld || F.buildings.find((b) => b.id === 91786049); pierLine = pierLine || F.lines.find((l) => l.kind === 'pier' && l.id === 28724732);
  }
  ok(!!bld && !!pierLine, 'pier walk: the pier building (91786049) and the pier (28724732) are in the OSM tiles'); if (!bld || !pierLine) return;

  // the front (promenade) is the high side: ground rises towards the north-west of the building
  const dirIn = [-0.6946, -0.7155], c0 = [bld.cx, bld.cz];
  const ground = (x, z) => 3 + 0.12 * Math.max(-20, Math.min(20, (x - c0[0]) * dirIn[0] + (z - c0[1]) * dirIn[1]));
  const fr = pierFrame(bld, ground), floorY = fr.floorY, pierY = floorY - 0.34; // the pier deck is a step lower than the boardwalk
  const toLocal = (x, z) => { const dx = x - fr.Ox, dz = z - fr.Oz; return [dx * fr.Ex + dz * fr.Ez, dx * fr.Nx + dz * fr.Nz]; };
  const W2 = (x, z) => [fr.Ox + fr.Ex * x + fr.Nx * z, fr.Oz + fr.Ez * x + fr.Nz * z];
  // the pier as buildPiers (furniture.js) makes it: a 5 m strip round the centreline, rails on its long edges and the land end
  const pts = pierLine.pts, w = pierLine.width || 5, left = [], right = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L; left.push([pts[i][0] + nx * w / 2, pts[i][1] + nz * w / 2]); right.push([pts[i][0] - nx * w / 2, pts[i][1] - nz * w / 2]); }
  const pierRing = ensureCCW(left.concat(right.reverse())), pierColliders = [];
  for (let i = 0; i < pierRing.length; i++) { const a = pierRing[i], b = pierRing[(i + 1) % pierRing.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) pierColliders.push({ type: 'segment', a, b, r: 0.1, top: 99, kind: 'railing', y0: pierY }); }
  const surfaceAt = (x, z) => { const [lx, lz] = toLocal(x, z); return pointInRing(x, z, pierRing) && lz < -43 ? pierY : ground(x, z); };

  const pb = buildPierBuilding(bld, { ground, surfaceAt, pierStarts: pierRing, pierColliders });
  const deck = pb.surfaces.find((s) => s.id === 'pier-boardwalk');
  ok(!!deck, 'pier walk: the boardwalk deck surface exists'); if (!deck) return;
  // everything the game's collision sees: the boardwalk's own colliders, the building walls, the pier rails
  const segs = [], circs = [];
  const add = (c) => { if (c.type === 'circle') circs.push(c); else segs.push(c); };
  for (const c of pb.colliders) add(c);
  for (let i = 0; i < bld.outer.length; i++) segs.push({ type: 'segment', a: bld.outer[i], b: bld.outer[(i + 1) % bld.outer.length], r: 0.02, y0: pb.collider.base, top: pb.collider.top, kind: 'building' });
  for (const c of pierColliders) segs.push(c);
  const dseg = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)) : 0; return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); };
  const blocked = (x, z, R) => { // would a walker of radius R standing on the deck / the pier at (x,z) be pushed by anything?
    const [, lz] = toLocal(x, z), yf = lz < -47 ? pierY : floorY, yh = yf + 1.7;
    for (const c of segs) { if (c.top != null && c.top < yf + 0.45) continue; if (c.y0 != null && c.y0 > yh) continue; if (dseg(x, z, c.a, c.b) < R + (c.r || 0)) return true; }
    for (const c of circs) { if (c.top != null && c.top < yf + 0.45) continue; if (c.y0 != null && c.y0 > yh) continue; if (Math.hypot(x - c.x, z - c.z) < R + c.r) return true; }
    return false;
  };
  const deckRing = deck.ring, st = 0.2, X0 = -30, X1 = 40, Z0 = -150, Z1 = -1.5; // local frame; z -1.5 and up (the front terrace) is left out so the only way round is the back
  const nx = Math.round((X1 - X0) / st) + 1, nz = Math.round((Z1 - Z0) / st) + 1;
  const walkable = (x, z) => { const [wx, wz] = W2(x, z); return (pointInRing(wx, wz, deckRing) && !pointInRing(wx, wz, bld.outer)) || pointInRing(wx, wz, pierRing); };
  const flood = (R, start) => {
    const seen = new Uint8Array(nx * nz), gi = (x) => Math.round((x - X0) / st), gj = (z) => Math.round((Z1 - z) / st), free = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= nz) return false; const x = X0 + i * st, z = Z1 - j * st; return walkable(x, z) && !blocked(...W2(x, z), R); };
    const q = [[gi(start[0]), gj(start[1])]]; if (!free(...q[0])) return { seen, gi, gj, startFree: false };
    seen[q[0][1] * nx + q[0][0]] = 1;
    while (q.length) { const [i, j] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz || seen[nj * nx + ni] || !free(ni, nj)) continue; seen[nj * nx + ni] = 1; q.push([ni, nj]); } }
    return { seen, gi, gj, startFree: true };
  };
  const pc = pierLine.pts.map(([x, z]) => toLocal(x, z)), pcx = (z) => pc[0][0] + (pc[1][0] - pc[0][0]) * (z - pc[0][1]) / (pc[1][1] - pc[0][1]); // the pier centreline's x at local z
  // key places, local to the building (x along the facade, z out from it; the sea is -z, the cafe side is +x)
  const stops = [['south-west side, cafe terrace (north end)', 30.5, -14], ['south-west side, cafe terrace (middle)', 30.5, -30], ['south-west side, cafe terrace (south end)', 30.8, -42], ['south-west back corner', 31, -45.4],
    ['back deck, right of the pier', 15, -45.6], ['back deck, at the pier mouth', 4.5, -45.6], ['back deck, left of the pier', -12, -45.8], ['north-east back corner', -22.7, -45], ['north-east side (south end)', -22.7, -30], ['north-east side (north end)', -22.7, -8],
    ['pier deck at its land end', pcx(-49) - 1.2, -49], ['pier deck beside THE DECK kiosk', pcx(-58.5) - 1.2, -58.5], ['pier deck past the kiosk', pcx(-80), -80], ['pier deck, 100 m out', pcx(-140), -140]];
  for (const [R, label] of [[0.35, 'a walker'], [0.75, 'a 1.5 m wide corridor']]) {
    const f = flood(R, [stops[0][1], stops[0][2]]); ok(f.startFree, `pier walk (${label}): the start of the walk is free`); if (!f.startFree) continue;
    for (const [name, x, z] of stops) ok(f.seen[f.gj(z) * nx + f.gi(x)] === 1, `pier walk (${label}): cannot walk from the south-west cafe terrace to the ${name} (${x.toFixed(1)}, ${z})`);
  }
  // the outer rails still stop you: no free cell within 0.3 m of the deck's outer edge (back and both sides), and the mouth is the only opening in the back edge
  { const f = flood(0.35, [stops[0][1], stops[0][2]]); let leaks = 0;
    const R = deckRing.map(([x, z]) => toLocal(x, z)); for (let i = 1; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Math.max(a[1], b[1]) > -1.5) continue;
      for (let s = 0.3; s < L; s += 0.25) { const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L, mouthX = z > -49 && x > -0.5 && x < 8; if (mouthX) continue; // the pier mouth
        const ex = (b[1] - a[1]) / L, ez = -(b[0] - a[0]) / L, px = x - ex * 0.15, pz = z - ez * 0.15; // 0.15 m inside the outer edge (normal pointing out for this winding)
        const gi = f.gi(px), gj = f.gj(pz); if (gi >= 0 && gj >= 0 && gi < nx && gj < nz && f.seen[gj * nx + gi]) leaks++; } }
    ok(leaks === 0, `pier walk: ${leaks} places where you can stand on the outer edge of the deck, past the railings`); }
  // the building itself and the cafe terrace posts are solid: nothing walkable inside the footprint
  ok(blocked(...W2(0, -20), 0.35) || !walkable(0, -20), 'pier walk: the building interior is not part of the deck');
  if (!hadDoc) delete globalThis.document;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  await pierWalkChecks(ok); console.log(`${pass}/${pass + fail} pier walk checks passed`); process.exit(fail ? 1 : 0);
}
