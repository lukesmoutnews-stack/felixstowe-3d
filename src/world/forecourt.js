// Felixstowe Pier forecourt furniture (the block-paved plaza between the car park, the Leisure Centre and the pier).
// From the user's Street View photos (docs/research/hamilton-road-streetview/fc-1..fc-4.png): a raised, brick-edged,
// stepped platform with slatted timber benches; black ornate litter bins and green communal bins round it; tall navy
// lamp standards with a cluster of three bronze globes; navy steel guard railings along the road edge (open at the
// pelican crossing); navy Sheffield cycle stands. Positions are estimated from the photos, not surveyed.
import * as THREE from 'three';
import { pointInRing, insetRing } from '../geo/polygon.js';
import { Geo } from './seafront.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
let M = null;
function mats() {
  if (M) return M;
  M = {
    navy: std({ color: 0x1b2a55, roughness: 0.45, metalness: 0.5 }),
    brickDark: std({ color: 0x7c3c30, roughness: 0.9 }), brickMid: std({ color: 0xb15a3c, roughness: 0.9 }), top: std({ color: 0x9c6650, roughness: 0.95 }), coping: std({ color: 0xc9bfae, roughness: 0.9 }),
    timber: std({ color: 0x8a6035, roughness: 0.8 }), black: std({ color: 0x15171a, roughness: 0.5, metalness: 0.4 }), gold: std({ color: 0xb98d3e, roughness: 0.35, metalness: 0.7 }),
    green: std({ color: 0x2e5a3a, roughness: 0.7 }), globe: std({ color: 0xcaa35a, roughness: 0.25, metalness: 0.85, emissive: 0x2a1f08, emissiveIntensity: 0.4 }), steel: std({ color: 0xaab0b6, roughness: 0.4, metalness: 0.7 }),
  };
  return M;
}

export const FORECOURT_ID = 91786029, FORECOURT_ROAD_EDGE = [[-247, 189], [-256, 182], [-275, 190], [-283, 195]]; // the Undercliff Road West side

/** Layout in the pier facade's frame (x along the facade towards the Leisure Centre, z outwards over the forecourt). */
export function forecourtPlan(ring, fr) {
  const { Ex, Ez, Nx, Nz, Ox, Oz } = fr, W2 = (x, z) => [Ox + Ex * x + Nx * z, Oz + Ez * x + Nz * z];
  const inside = (x, z) => { const p = W2(x, z); return pointInRing(p[0], p[1], ring); };
  // the platform sits at the centre (area centroid) of the paved forecourt
  const L = ring.map(([x, y]) => { const dx = x - fr.Ox, dz = y - fr.Oz; return [dx * Ex + dz * Ez, dx * Nx + dz * Nz]; });
  let A = 0, gx = 0, gz = 0;
  for (let i = 0; i < L.length; i++) { const [x0, z0] = L[i], [x1, z1] = L[(i + 1) % L.length], c = x0 * z1 - x1 * z0; A += c; gx += (x0 + x1) * c; gz += (z0 + z1) * c; }
  const cx = gx / (3 * A), cz = gz / (3 * A);
  const ok = inside;
  // the platform is an elongated hexagon (from the aerial view) with its long axis pointing away from the pier, turned ~15 degrees
  const PHI = (14.6 * Math.PI) / 180, uA = [Math.cos(PHI), Math.sin(PHI)], vA = [-Math.sin(PHI), Math.cos(PHI)];
  const rot = ([u, v]) => [cx + u * uA[0] + v * vA[0], cz + u * uA[1] + v * vA[1]];
  const hex = [[-6, -9.5], [3, -9.5], [7, -5.5], [7, 9.5], [-3, 9.5], [-7, 5.5]].map(rot);
  const tiers = [hex, insetRing(hex, 0.55) || hex]; tiers.push(insetRing(tiers[1], 0.55) || tiers[1]);
  const seatRing = insetRing(tiers[2], 0.5) || tiers[2];
  const outward = (px, pz, d) => { const dx = px - cx, dz = pz - cz, L = Math.hypot(dx, dz) || 1; return [px + (dx / L) * d, pz + (dz / L) * d]; };
  // benches stand on the top tier all round its edge, facing outwards: [x, z, outward x, outward z]
  const benches = [];
  for (let i = 0; i < seatRing.length; i++) {
    const [x0, z0] = seatRing[i], [x1, z1] = seatRing[(i + 1) % seatRing.length], len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 2.7);
    if (n < 1) continue;
    let nx = (z1 - z0) / len, nz = -(x1 - x0) / len; const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if ((mx - cx) * nx + (mz - cz) * nz < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; benches.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, nx, nz]); }
  }
  const bins = hex.map(([x, z], i) => [...outward(x, z, 0.9), i % 3 === 1 ? 'green' : 'black']);
  const lamps = [0, 2, 3, 5].map((i) => outward(hex[i][0], hex[i][1], 3.6)).concat([outward(cx, cz - 16, 0)]).filter(([x, z]) => ok(x, z));
  const stands = [[11.5, -9], [13.1, -9.3], [14.7, -9.6]].map(([a, b]) => [cx + a, cz + b]).filter(([x, z]) => ok(x, z));
  return { W2, fr, cx, cz, tiers, lamps, bins, benches, stands, ring };
}

/** @param roadEdge polyline [[x,z],...] of the road side of the forecourt (offset inwards here) */
export function buildForecourt(plan, ground, roadEdge) {
  const m = mats(), { W2, cx, cz, fr } = plan, group = new THREE.Group(); group.name = 'pier-forecourt';
  const colliders = [], surfaces = [];
  const Ex = fr.Ex, Ez = fr.Ez, Nx = fr.Nx, Nz = fr.Nz, ang = Math.atan2(Ex, Ez); // heading of the facade axis
  const loc = (x, z) => { const [wx, wz] = W2(x, z); return [wx, wz]; };
  const put = (obj, x, y, z, rot = 0) => { const [wx, wz] = loc(x, z); obj.position.set(wx, ground(wx, wz) + y, wz); obj.rotation.y = ang + rot; group.add(obj); return obj; };
  const geo = { navy: new Geo(), brickDark: new Geo(), brickMid: new Geo(), top: new Geo(), coping: new Geo(), timber: new Geo(), black: new Geo(), green: new Geo(), steel: new Geo(), gold: new Geo() };
  const box = (g, x, y, z, hx, hy, hz, rot = 0) => { const [wx, wz] = loc(x, z), a = ang + rot; geo[g].box(wx, ground(wx, wz) + y, wz, Math.sin(a), Math.cos(a), hx, hy, hz); };
  // local helper: box with its long axis along the facade (x): u axis = (Ex, Ez)

  // ---- stepped platform: three brick tiers (hexagon prisms) ----
  const TH = [0.14, 0.28, 0.42], TM = [m.brickDark, m.brickMid, m.top];
  for (const mt of TM) mt.side = THREE.DoubleSide;
  { const [wx0, wz0] = loc(cx, cz), y0 = ground(wx0, wz0);
    plan.tiers.forEach((rg, k) => {
      const shape = new THREE.Shape(rg.map(([x, z]) => new THREE.Vector2(...loc(x, z))));
      const g = new THREE.ExtrudeGeometry(shape, { depth: TH[k] + 0.02, bevelEnabled: false }); g.rotateX(Math.PI / 2);
      const me = new THREE.Mesh(g, TM[k]); me.position.y = y0 + TH[k]; me.castShadow = me.receiveShadow = true; group.add(me);
    }); }
  const tierH = (lx, lz) => pointInRing(lx, lz, plan.tiers[2]) ? 0.42 : pointInRing(lx, lz, plan.tiers[1]) ? 0.28 : pointInRing(lx, lz, plan.tiers[0]) ? 0.14 : 0;
  { const ringW = plan.tiers[0].map(([x, z]) => loc(x, z));
    const toLocal = (x, z) => { const dx = x - fr.Ox, dz = z - fr.Oz; return [dx * Ex + dz * Ez, dx * Nx + dz * Nz]; };
    surfaces.push({ id: 'pier-forecourt-platform', kind: 'terrace', ring: ringW, heightAt: (x, z) => { const [lx, lz] = toLocal(x, z); return ground(x, z) + tierH(lx, lz); }, name: 'Pier forecourt platform', meshes: [] }); }
  // benches: timber slats on black steel ends, standing on the top tier, backs to the centre, facing outwards
  const wv = (a, b) => [Ex * a + Nx * b, Ez * a + Nz * b];
  for (const [bx, bz, ox, oz] of plan.benches) {
    const [wx, wz] = loc(bx, bz), [ux, uz] = wv(-oz, ox), [nx, nz] = wv(ox, oz), y = ground(wx, wz) + 0.42;
    geo.timber.box(wx, y + 0.44, wz, ux, uz, 0.9, 0.025, 0.22);
    geo.timber.box(wx - nx * 0.2, y + 0.7, wz - nz * 0.2, ux, uz, 0.9, 0.2, 0.02);
    for (const sgn of [-0.8, 0.8]) geo.black.box(wx + ux * sgn, y + 0.22, wz + uz * sgn, ux, uz, 0.03, 0.22, 0.2);
    colliders.push({ type: 'circle', x: wx, z: wz, r: 0.55, y0: y - 0.1, top: y + 1.2, kind: 'bench' });
  }
  // bins: black ornate with a gold band; green communal bins
  for (const [bx, bz, kind] of plan.bins) {
    const onPlat = tierH(bx, bz) > 0;
    if (kind === 'black') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.95, 14), m.black); body.castShadow = true; put(body, bx, 0.475 + (onPlat ? 0.42 : 0), bz);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.06, 14), m.gold); put(band, bx, 0.88 + (onPlat ? 0.42 : 0), bz);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.14, 14), m.black); put(lid, bx, 1.0 + (onPlat ? 0.42 : 0), bz);
    } else { box('green', bx, 0.55, bz, 0.34, 0.55, 0.3); box('black', bx, 1.12, bz, 0.36, 0.03, 0.32); }
    const [wx, wz] = loc(bx, bz); colliders.push({ type: 'circle', x: wx, z: wz, r: 0.38, y0: ground(wx, wz), top: ground(wx, wz) + 1.2, kind: 'bin' });
  }
  // lamp standards: navy pole, three curved arms each with a bronze globe
  for (const [lx, lz] of plan.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 7.2, 10), m.navy); pole.castShadow = true; put(pole, lx, 3.6, lz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10), m.navy); put(base, lx, 0.25, lz);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5, [wx, wz] = loc(lx, lz), y = ground(wx, wz);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), m.navy); arm.position.set(wx + Math.cos(a) * 0.3, y + 7.3, wz + Math.sin(a) * 0.3); arm.rotation.z = Math.cos(a) * 1.0; arm.rotation.x = -Math.sin(a) * 1.0; group.add(arm);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), m.globe); globe.position.set(wx + Math.cos(a) * 0.62, y + 7.38, wz + Math.sin(a) * 0.62); group.add(globe);
    }
    const [wx, wz] = loc(lx, lz); colliders.push({ type: 'circle', x: wx, z: wz, r: 0.22, y0: ground(wx, wz) - 0.3, top: ground(wx, wz) + 7, kind: 'lamp' });
  }
  // Sheffield cycle stands
  for (const [sx, sz] of plan.stands) {
    box('navy', sx - 0.4, 0.45, sz, 0.025, 0.45, 0.025); box('navy', sx + 0.4, 0.45, sz, 0.025, 0.45, 0.025); box('navy', sx, 0.9, sz, 0.42, 0.025, 0.025);
  }
  // guard railings along the road edge, open at the crossing
  const runs = [];
  if (roadEdge && roadEdge.length > 1) {
    const cen = plan.ring.reduce((s, p) => [s[0] + p[0] / plan.ring.length, s[1] + p[1] / plan.ring.length], [0, 0]);
    const pts = roadEdge.map(([x, z], i) => { const a = roadEdge[Math.max(0, i - 1)], b = roadEdge[Math.min(roadEdge.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; let nx = -dz / L, nz = dx / L; if ((cen[0] - x) * nx + (cen[1] - z) * nz < 0) { nx = -nx; nz = -nz; } return [x + nx * 0.7, z + nz * 0.7]; });
    let acc = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(acc); }
    const at = (s) => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = pts[i - 1], b = pts[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
    const gapAt = acc * 0.52, gapW = 3.6; runs.push([0, gapAt - gapW / 2], [gapAt + gapW / 2, acc]);
    for (const [s0, s1] of runs) {
      const n = Math.max(1, Math.round((s1 - s0) / 2));
      for (let k = 0; k <= n; k++) { const [px, pz] = at(s0 + ((s1 - s0) * k) / n), y = ground(px, pz); geo.navy.box(px, y + 0.57, pz, 1, 0, 0.035, 0.57, 0.035); }
      for (let s = s0; s <= s1; s += 0.14) { const [px, pz, h] = at(s), y = ground(px, pz); geo.navy.box(px, y + 0.55, pz, Math.sin(h + Math.PI / 2), Math.cos(h + Math.PI / 2), 0.012, 0.5, 0.012); }
      const segs = Math.ceil((s1 - s0) / 1.0);
      for (let k = 0; k < segs; k++) { const sa = s0 + k, sb = Math.min(s1, sa + 1), [ax, az] = at(sa), [bx, bz, h] = at((sa + sb) / 2), L = sb - sa; if (L < 0.05) continue; const y = ground(bx, bz); for (const hy of [0.14, 1.1]) geo.navy.box(bx, y + hy, bz, Math.sin(h), Math.cos(h), L / 2, 0.025, 0.025); void ax; void az; }
      for (let s = s0; s < s1; s += 3) { const [ax, az] = at(s), [bx, bz] = at(Math.min(s1, s + 3)); colliders.push({ type: 'segment', a: [ax, az], b: [bx, bz], r: 0.06, y0: ground(ax, az) - 0.2, top: ground(ax, az) + 1.15, kind: 'railing' }); }
    }
  }
  const meshes = [];
  for (const [k, g] of Object.entries(geo)) { const me = g.mesh(k === 'steel' ? m.steel : k === 'gold' ? m.gold : m[k]); if (me) group.add(me); }
  meshes.push(group);
  return { meshes, colliders, surfaces };
}
