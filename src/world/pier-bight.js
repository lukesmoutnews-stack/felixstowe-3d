// Pier Bight car park (Undercliff Road West, opposite Felixstowe Pier): the game's start point.
// OSM only maps the road-side part of it; in real life the tarmac runs right up to the low red-brick sea wall.
// Reference: docs/research/hamilton-road-streetview/pb-1..9.png (bays nose-in to the wall, a wide aisle with grey
// direction discs and white X marks, a block-paved island with a cordyline palm and the car park sign).
//
// plan -> one level tarmac polygon from the road kerb to the wall, marked bays in rows, island, sign, arrows.
import * as THREE from 'three';
import { ensureCCW, pointInRing, distToSegment } from '../geo/polygon.js';

export const PB = {
  lotId: 1017338024, promId: 603405717, forecourtId: 91786029,
  hidden: new Set([1017338023, 1017338025, 402524431]), // service aisles and the cycleway drawn across the car park
};
const BW = 2.6, BL = 5.0, AISLE = 6.6, WALL_GAP = 3.36 + 0.36; // promenade centre -> wall landward face -> tarmac edge (coping)
// distance from the wall edge (m): [from, to, nose direction toward the wall (+1) or away (-1)]
const ROWS = [[0, BL, 1], [BL + AISLE, 2 * BL + AISLE, -1], [2 * BL + AISLE, 3 * BL + AISLE, 1], [3 * BL + 2 * AISLE, 4 * BL + 2 * AISLE, -1]];

/** Work out the car park from the OSM lot and the promenade. Returns null if the lot isn't in these features. */
export function pierBightPlan(f, terrain) {
  const lot = f.areas.find((a) => a.id === PB.lotId); if (!lot) return null;
  const ring0 = ensureCCW(lot.outer), n = ring0.length;
  let len = 0, ia = 0; for (let i = 0; i < n; i++) { const a = ring0[i], b = ring0[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > len) { len = L; ia = i; } }
  const A0 = ring0[ia], A1 = ring0[(ia + 1) % n]; // the road-side edge
  const cen = ring0.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  // frame along the promenade (the wall): u along, v towards the sea
  let ux = (A1[0] - A0[0]) / len, uz = (A1[1] - A0[1]) / len, wallV = null;
  const prom = f.roads.find((r) => r.id === PB.promId);
  if (prom) {
    let best = null; for (let i = 1; i < prom.pts.length; i++) { const a = prom.pts[i - 1], b = prom.pts[i], d = distToSegment(cen[0], cen[1], a[0], a[1], b[0], b[1]); if (!best || d.d < best.d) best = { d: d.d, a, b }; }
    const dx = best.b[0] - best.a[0], dz = best.b[1] - best.a[1], L = Math.hypot(dx, dz) || 1; let px = dx / L, pz = dz / L; if (px * ux + pz * uz < 0) { px = -px; pz = -pz; }
    ux = px; uz = pz; const vx0 = -uz, vz0 = ux; // v = (-uz, ux): +z when u is along +x
    // the sea side is where the promenade is relative to the lot
    const sgn = ((best.a[0] - cen[0]) * vx0 + (best.a[1] - cen[1]) * vz0) >= 0 ? 1 : -1; if (sgn < 0) { ux = -ux; uz = -uz; }
    const vx = -uz, vz = ux; wallV = (best.a[0] * vx + best.a[1] * vz) - WALL_GAP;
  }
  const vx = -uz, vz = ux, U = (p) => p[0] * ux + p[1] * uz, V = (p) => p[0] * vx + p[1] * vz, at = (u, v) => [ux * u + vx * v, uz * u + vz * v];
  let u0 = Infinity, u1 = -Infinity, vmax = -Infinity; for (const p of ring0) { u0 = Math.min(u0, U(p)); u1 = Math.max(u1, U(p)); vmax = Math.max(vmax, V(p)); }
  if (wallV == null) wallV = vmax + 8.9;
  const legV = (u) => { const ua = U(A0), ub = U(A1), t = (u - ua) / (ub - ua || 1); return V(A0) + (V(A1) - V(A0)) * t; }; // road-side kerb line
  const ue = u0 - 0.8; // overlaps the forecourt by a hair so no seam shows
  const ring = ensureCCW([at(ue, legV(ue)), at(u1, legV(u1)), at(u1, wallV + 0.25), at(ue, wallV + 0.25)]); // the tarmac runs just under the wall coping
  // level the tarmac and the pier forecourt beside it as one plane (LiDAR noise would otherwise poke through the paving as
  // green patches): least-squares plane through the terrain, blended into the surroundings along the outer edge only
  const fcArea = f.areas.find((x) => x.id === PB.forecourtId), fcRing = fcArea ? ensureCCW(fcArea.outer) : null, rings = fcRing ? [ring, fcRing] : [ring];
  let plane = null;
  if (terrain) {
    const S = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; let cnt = 0; // normal equations for h = a + b x + c z
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity; for (const r of rings) for (const q of r) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[1]); bz1 = Math.max(bz1, q[1]); }
    for (let x = bx0; x <= bx1; x += 3) for (let z = bz0; z <= bz1; z += 3) {
      if (!rings.some((r) => pointInRing(x, z, r))) continue;
      const h = terrain.rawHeightAt(x, z); if (!Number.isFinite(h)) continue; cnt++;
      S[0] += 1; S[1] += x; S[2] += z; S[3] += x * x; S[4] += x * z; S[5] += z * z; S[6] += h; S[7] += x * h; S[8] += z * h;
    }
    if (cnt > 6) {
      const M = [[S[0], S[1], S[2]], [S[1], S[3], S[4]], [S[2], S[4], S[5]]], b = [S[6], S[7], S[8]];
      const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det3(M); if (Math.abs(D) > 1e-9) { const col = (k) => M.map((r, i) => r.map((x, j) => (j === k ? b[i] : x))); plane = [det3(col(0)) / D, det3(col(1)) / D, det3(col(2)) / D]; }
    }
  }
  // outer boundary: edges that are not inside (or against) the other ring
  const edges = [];
  rings.forEach((r, ri) => { for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length], mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const shared = rings.some((o, oi) => { if (oi === ri) return false; if (pointInRing(mx, mz, o)) return true; for (let k = 0; k < o.length; k++) { const p = o[k], q = o[(k + 1) % o.length]; if (distToSegment(mx, mz, p[0], p[1], q[0], q[1]).d < 2.5) return true; } return false; });
    if (!shared) edges.push([a, c]); } });
  const edgeDist = (x, z) => { let d = Infinity; for (const [a, c] of edges) d = Math.min(d, distToSegment(x, z, a[0], a[1], c[0], c[1]).d); return d; };
  const heightFn = plane ? (x, z, h) => { const w = Math.min(1, edgeDist(x, z) / 3); const p = plane[0] + plane[1] * x + plane[2] * z; return h + (p - h) * w; } : null;

  // marked bays: columns every 2.6 m along the wall
  const polyIn = (x, z) => pointInRing(x, z, ring);
  const island = { c: at(u0 + 9.5, wallV - (BL + AISLE + BL)), r: 2.55 }; // between the two back-to-back rows, near the entrance
  const bays = [], lines = [];
  const hatch = [[u0 + 5.2, 4.6, 5.2, 4.6], [u0 + 50, 11.6, 3.6, 3.6]]; // yellow cross-hatched boxes seen on the aerial: [u, distance from the wall, size along u, size across]
  for (let u = u0 + 3.2; u < u1 - BW / 2; u += BW) ROWS.forEach(([d0, d1, nose], ri) => {
    const vN = wallV - d0, vF = wallV - d1, cv = (vN + vF) / 2, [cx, cz] = at(u, cv);
    const corners = [[-1, vN], [1, vN], [1, vF], [-1, vF]].map(([s, v]) => at(u + s * BW / 2, v));
    if (!corners.every(([x, z]) => polyIn(x, z))) return;
    if (Math.hypot(cx - island.c[0], cz - island.c[1]) < island.r + 3.2) return;
    if (hatch.some(([hu, hd, hs, ht]) => Math.abs(u - hu) < hs / 2 + BW / 2 - 0.2 && !(d1 < hd - ht / 2 || d0 > hd + ht / 2))) return;
    const dirV = nose > 0 ? 1 : -1; // wall row noses to the wall (+v); the far rows alternate
    bays.push({ x: cx, z: cz, row: ri, heading: Math.atan2(vx * dirV, vz * dirV), ux, uz, vx, vz, dir: dirV, vN, vF, u });
  });
  const aisleMid = [wallV - BL - AISLE / 2, wallV - 3 * BL - AISLE - AISLE / 2];
  const sp = at(u0 + 7.5, aisleMid[0]);
  return { start: { x: sp[0], z: sp[1], yaw: Math.atan2(-ux, -uz) }, lotId: PB.lotId, ring, ux, uz, vx, vz, u0, u1, wallV, bays, hatch, island, heightFn, levelRings: rings, at, aisleMid, U, V, sign: { p: at(u0 + 9.5 - 0.1, wallV - (BL + AISLE + BL) + 3.4), faceU: -1 } };
}

// ---------- materials and small helpers ----------
const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const paint = (color) => lam(color, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });

class Flat { // flat triangles laid on the (levelled) ground
  constructor(ground, lift = 0.04) { this.g = ground; this.lift = lift; this.p = []; this.i = []; }
  tri(a, b, c) { const n = this.p.length / 3; for (const [x, z] of [a, b, c]) this.p.push(x, this.g(x, z) + this.lift, z); this.i.push(n, n + 1, n + 2); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  strip(x0, z0, x1, z1, w) { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2; this.quad([x0 + nx, z0 + nz], [x0 - nx, z0 - nz], [x1 - nx, z1 - nz], [x1 + nx, z1 + nz]); }
  shape(pts, cx, cz, ax, az, bx, bz) { // local (a,b) points -> world, ear-clipped
    const tris = THREE.ShapeUtils.triangulateShape(pts.map(([a, b]) => new THREE.Vector2(a, b)), []);
    const W = pts.map(([a, b]) => [cx + ax * a + bx * b, cz + az * a + bz * b]); for (const [i, j, k] of tris) this.tri(W[i], W[j], W[k]);
  }
  mesh(mat, order = 2) { if (!this.i.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setIndex(this.i); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.receiveShadow = true; return m; }
}
const disc = (r, k = 28) => Array.from({ length: k }, (_, i) => [Math.cos((i / k) * Math.PI * 2) * r, Math.sin((i / k) * Math.PI * 2) * r]);
const ARROW = [[-0.95, -0.24], [0.1, -0.24], [0.1, -0.62], [1.0, 0], [0.1, 0.62], [0.1, 0.24], [-0.95, 0.24]];

function signTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#1b3a73'; g.fillRect(0, 0, 512, 1024); g.fillStyle = '#f3f4f1'; g.beginPath(); g.roundRect(26, 26, 460, 560, 34); g.fill();
  // wave logo (generic): teal and blue bands
  for (let k = 0; k < 3; k++) { g.strokeStyle = ['#2b8a8c', '#1f6fa8', '#2b8a8c'][k]; g.lineWidth = 17; g.beginPath(); for (let x = 70; x <= 442; x += 6) { const y = 150 + k * 30 + Math.sin((x / 372) * Math.PI * 4 + k) * 17; x === 70 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#1b3a73'; g.textAlign = 'center'; g.font = '800 62px Arial, sans-serif'; g.fillText('PIER BIGHT', 256, 330); g.fillText('CAR PARK', 256, 405);
  g.font = '600 38px Arial, sans-serif'; g.fillStyle = '#34495e'; g.fillText('Pay and display', 256, 480); g.fillText('Short stay', 256, 530);
  // P sign and disabled-badge sign below the board
  g.fillStyle = '#1456b8'; g.beginPath(); g.roundRect(40, 620, 200, 250, 18); g.fill(); g.fillStyle = '#fff'; g.font = '800 170px Arial, sans-serif'; g.fillText('P', 140, 790);
  g.fillStyle = '#1456b8'; g.beginPath(); g.roundRect(272, 620, 200, 250, 18); g.fill(); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.arc(372, 690, 15, 0, 7); g.fill(); g.beginPath(); g.moveTo(372, 708); g.lineTo(372, 770); g.lineTo(410, 770); g.lineTo(422, 820); g.stroke(); g.beginPath(); g.arc(366, 795, 38, 0.6, 4.9); g.stroke();
  g.fillStyle = '#fff'; g.font = '600 30px Arial, sans-serif'; g.fillText('Charges apply', 256, 925); g.fillText('see tariff board', 256, 965);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function palm(group, x, y, z, seed = 3) {
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 2.7, 8), lam(0x6d5a47)); trunk.position.set(x, y + 1.35, z); trunk.rotation.z = 0.05; trunk.castShadow = true; group.add(trunk);
  const top = [x - Math.sin(0.05) * 1.35, y + 2.68, z];
  const pos = [], idx = [], col = [];
  const leaf = (az, el, L, droop, shade) => {
    const dx = Math.cos(az), dz = Math.sin(az), px = -dz, pz = dx, N = 7;
    for (let k = 0; k <= N; k++) {
      const t = k / N, h = L * t, w = 0.085 * Math.pow(1 - t, 0.55) + 0.006;
      const cx = top[0] + dx * h * Math.cos(el), cz = top[2] + dz * h * Math.cos(el), cy = top[1] + h * Math.sin(el) - droop * h * h;
      pos.push(cx + px * w, cy, cz + pz * w, cx - px * w, cy, cz - pz * w);
      const c = new THREE.Color(shade).lerp(new THREE.Color(0x56602f), t * 0.45); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k) { const b = (k - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
  };
  const base = []; // quads from several leaves: offset indices
  for (let i = 0; i < 38; i++) {
    const n0 = pos.length / 3; const before = idx.length;
    leaf(rnd() * Math.PI * 2, 0.15 + rnd() * 1.1, 1.1 + rnd() * 0.9, 0.12 + rnd() * 0.22, [0x5a2a25, 0x6b3328, 0x4b2a22][i % 3]);
    for (let k = before; k < idx.length; k++) idx[k] += n0; base.push(n0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.castShadow = true; group.add(m);
}

/** Meshes and colliders for the car park furniture; the tarmac itself is the lot area (landcover) on the levelled ground. */
export function buildPierBight(plan, ground) {
  const meshes = [], colliders = [], group = new THREE.Group(); group.name = 'pier-bight';
  const white = new Flat(ground, 0.11), grey = new Flat(ground, 0.115), dark = new Flat(ground, 0.12), bay = plan.bays;
  const { ux, uz, vx, vz } = plan;
  // bay lines: a side line between neighbouring bays and a back line
  const seen = new Set();
  for (const b of bay) {
    const half = BW / 2, hl = BL / 2, c = (su, sv) => [b.x + ux * half * su + vx * hl * sv, b.z + uz * half * su + vz * hl * sv];
    for (const su of [-1, 1]) { const k = `${b.row}:${Math.round((b.u + su * half) * 10)}`; if (seen.has(k)) continue; seen.add(k); const a = c(su, -1), d = c(su, 1); white.strip(a[0], a[1], d[0], d[1], 0.1); }
    const back = c(-1, b.dir), back2 = c(1, b.dir); white.strip(back[0], back[1], back2[0], back2[1], 0.1);
  }
  // direction discs and X marks on the aisles
  const aisleDisc = (u, v, dirU) => { const [cx, cz] = plan.at(u, v); grey.shape(disc(1.9), cx, cz, ux, uz, vx, vz); dark.shape(ARROW.map(([a, b]) => [a * dirU * 1.5, b * 1.5]), cx, cz, ux, uz, vx, vz); };
  for (const v of plan.aisleMid) { aisleDisc(plan.u0 + 6, v, 1); aisleDisc(plan.u1 - 6, v, -1); }
  const X = [[-0.8, -0.8, 0.8, 0.8], [-0.8, 0.8, 0.8, -0.8]];
  for (const v of plan.aisleMid) for (let u = plan.u0 + 22; u < plan.u1 - 12; u += 24) { const [cx, cz] = plan.at(u, v); for (const [a, b, c2, d] of X) white.strip(cx + ux * a + vx * b, cz + uz * a + vz * b, cx + ux * c2 + vx * d, cz + uz * c2 + vz * d, 0.14); }
  const yel = new Flat(ground, 0.118);
  for (const [hu, hd, hs, ht] of plan.hatch) { // yellow cross-hatched box: border plus diagonal lines both ways
    const P = (a, b) => plan.at(hu + a, plan.wallV - hd + b), hx = hs / 2, hy = ht / 2;
    for (const [a0, b0, a1, b1] of [[-hx, -hy, hx, -hy], [hx, -hy, hx, hy], [hx, hy, -hx, hy], [-hx, hy, -hx, -hy]]) { const p0 = P(a0, b0), p1 = P(a1, b1); yel.strip(p0[0], p0[1], p1[0], p1[1], 0.13); }
    for (const sg of [1, -1]) for (let k = -hx - hy; k <= hx + hy; k += 0.7) { // the line a = k + sg*b clipped to the box
      const pts = [];
      for (const b of [-hy, hy]) { const a = k + sg * b; if (Math.abs(a) <= hx + 1e-6) pts.push([a, b]); }
      for (const a of [-hx, hx]) { const b = sg * (a - k); if (Math.abs(b) < hy - 1e-6) pts.push([a, b]); }
      if (pts.length >= 2) { const p0 = P(...pts[0]), p1 = P(...pts[1]); yel.strip(p0[0], p0[1], p1[0], p1[1], 0.09); } }
  }
  for (const [f, m] of [[white, paint(0xeeeeea)], [yel, paint(0xe0b73a)], [grey, paint(0x8b8e90)], [dark, paint(0x45484b)]]) { const mesh = f.mesh(m); if (mesh) group.add(mesh); }

  // island: stone kerb, mulch, brick paviors round it, a cordyline palm
  const [ix, iz] = plan.island.c, iy = ground(ix, iz), R = plan.island.r;
  const flat = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(ix, iy + y, iz); m.receiveShadow = true; group.add(m); return m; };
  const pav = flat(new THREE.RingGeometry(R, R + 0.9, 40), lam(0x94604f, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0.11); pav.renderOrder = 2;
  const kerb = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.14, 40, 1, true), lam(0xc3bfb5, { side: THREE.DoubleSide })); kerb.position.set(ix, iy + 0.14, iz); group.add(kerb);
  flat(new THREE.RingGeometry(R - 0.3, R, 40), lam(0xcfcbc1), 0.21);
  flat(new THREE.CircleGeometry(R - 0.3, 36), lam(0x5a4632), 0.18);
  palm(group, ix, iy + 0.17, iz, 7);
  // low shrubs round the palm
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.4, s = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), lam(0x4a5a30)); s.scale.y = 0.6; s.position.set(ix + Math.cos(a) * 1.5, iy + 0.38, iz + Math.sin(a) * 1.5); group.add(s); }
  colliders.push({ type: 'circle', x: ix, z: iz, r: R, y0: iy - 0.5, top: iy + 0.6, kind: 'island' });
  // sign: navy post, board with the car park name, P and disabled-badge signs
  const [sx, sz] = plan.sign.p, sy = ground(sx, sz);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.7, 0.11), lam(0x14284f)); post.position.set(sx, sy + 1.35, sz); group.add(post);
  const tex = signTexture(), board = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  board.position.set(sx + ux * 0.08 * plan.sign.faceU, sy + 1.55, sz + uz * 0.08 * plan.sign.faceU); board.rotation.y = Math.atan2(ux * plan.sign.faceU, uz * plan.sign.faceU); group.add(board);
  colliders.push({ type: 'circle', x: sx, z: sz, r: 0.18, y0: sy - 0.3, top: sy + 2.8, kind: 'sign' });
  meshes.push(group);
  return { meshes, colliders };
}
