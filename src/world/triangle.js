// "The Triangle": the paved and planted traffic island between Hamilton Road (west carriageway, B1082) and the A1021
// (one-way east carriageway), north of the Cobbold Road junction, beside the Palace Cinema / Poundland / Tesco Express.
// From the user's Street View photos (docs/research/hamilton-road-streetview/h-triangle-*.png): buff concrete-flag paving
// to a low stone kerb; two raised planting beds with low sand-brown retaining walls (the north one narrowing to the tip);
// between them a paved circular seating area with a white tensile shelter on four navy posts and curved low walls;
// navy guard railings along the A1021 kerb (open round the shelter); navy lamp posts with hanging baskets; slatted timber
// benches; black bins; a green utility cabinet; navy bollards; mature trees, cordylines/palms, lavender and grasses.
// Positions are estimated from the OSM garden polygon ("The Triangle") and the photos, not surveyed.
//
//   plan  = trianglePlan(features, terrain)      // before the ground is built: also gives levelRing + heightFn for terrain.addModifier
//   built = buildTriangle(plan, ground)          // { meshes, colliders }
import * as THREE from 'three';
import { pointInRing, distToSegment, clipRingToRect } from '../geo/polygon.js';
import { Geo } from './seafront.js';
import { buildTreeMeshes } from './vegetation.js';

export const TRIANGLE = {
  gardenId: 618245250,          // OSM leisure=garden "The Triangle" (the raised planted part)
  canopyId: 732391352,          // OSM building=roof hexagon: the shelter (drawn here instead of as a block)
};
// OSM geometry (north to south), kept here so the island does not depend on which tile the roads are in
const WEST_ROAD = { half: 3.1, pts: [[108.4, -505.88], [98.68, -486.82], [97.93, -485.41], [89.7, -470.59], [88.85, -469.13], [87.95, -467.7], [79.04, -454.16], [77.84, -452.44], [76.57, -450.77], [66.34, -438], [65.17, -436.6], [54.91, -424.81]] };
const EAST_ROAD = { half: 2.625, pts: [[116.95, -501.08], [116.3, -498.71], [115.82, -496.39], [110.63, -466.91], [107.89, -450.62], [107.61, -448.61], [107.43, -446.58], [107.35, -444.55], [107.27, -438.67], [103.78, -418.07]] };
const GARDEN = [[92.47, -427.47], [95.68, -429.14], [102.3, -465.04], [108.67, -489.78], [108.2, -490.93], [106.92, -491.19], [96.87, -467.87], [91.09, -458.91], [75.98, -438.28], [73.56, -435.53], [73.44, -432.75], [74.7, -430.28]];
const CANOPY_C = [94.0, -452.7];
const KERB = 0.35, NORTH_Z = -495.5, PLAZA_R = 7.3, BED_H = 0.45, PAVE_LIFT = 0.04;
const SOUTH_LINE = (x) => -429.6 + (x - 54.9) * 0.2137; // the plaza's south edge: the Cobbold Road footway's outer edge (road centre 54.9,-424.8 -> 103.2,-414.5, plus ~4.7 m)

const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const std = (o) => new THREE.MeshStandardMaterial(o);
let M = null;
function mats() {
  if (M) return M;
  M = {
    navy: std({ color: 0x1c2b57, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }),
    kerb: lam(0xb9b6ae), wall: lam(0x9d8a74), coping: lam(0xcfc6b4), timber: lam(0x8c6238), steel: lam(0x8e949a, { side: THREE.DoubleSide }),
    black: lam(0x1a1c1f), green: lam(0x4a6a50), sign: lam(0xf1c232, { side: THREE.DoubleSide }), board: lam(0x1d4f9a, { side: THREE.DoubleSide }), lantern: lam(0xe9e6da, { emissive: 0x333022 }),
    fabric: lam(0xf0ece0, { side: THREE.DoubleSide }),
    grass: lam(0x66823f), soil: lam(0x5b4a38), band: lam(0x938f87),
    paving: lam(0xaaa69b, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    flora: lam(0xffffff, { vertexColors: true }), leaves: lam(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
  };
  return M;
}
function pavingTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 150 + rnd() * 22 | 0; g.fillStyle = `rgb(${v + 4},${v},${v - 8})`; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = 'rgba(60,58,52,0.55)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(256, k * 64); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- 2D helpers ----------
function offsetLine(pts, d, ref) { // mitred offset of a polyline by d towards ref
  const n = pts.length, nr = [];
  for (let i = 1; i < n; i++) { const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dz) || 1; nr.push([-dz / L, dx / L]); }
  const k = Math.floor(nr.length / 2), mid = pts[k], sg = ((ref[0] - mid[0]) * nr[k][0] + (ref[1] - mid[1]) * nr[k][1]) >= 0 ? 1 : -1;
  return pts.map((p, i) => { const a = nr[Math.max(0, i - 1)], b = nr[Math.min(nr.length - 1, i)]; let mx = a[0] + b[0], mz = a[1] + b[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; const kk = 1 / Math.max(0.5, mx * b[0] + mz * b[1]); return [p[0] + sg * mx * d * kk, p[1] + sg * mz * d * kk]; });
}
function cutNorth(pts, z0) { // pts run north to south (z increasing): start the line at z0
  const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (p[1] >= z0) { if (!out.length && i > 0) { const q = pts[i - 1], t = (z0 - q[1]) / (p[1] - q[1]); out.push([q[0] + (p[0] - q[0]) * t, z0]); } out.push(p); } }
  return out;
}
function clipSouth(ring) { // keep the part north of SOUTH_LINE (Sutherland-Hodgman against one half-plane)
  const f = (p) => p[1] - SOUTH_LINE(p[0]), out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function densify(ring, step) {
  const out = []; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  return out;
}
function lineAtZ(pts, z) { // [x, z, heading] on a north-south polyline at depth z
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) { const t = (z - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, z, Math.atan2(b[0] - a[0], b[1] - a[1])]; } }
  return null;
}
const distRing = (x, z, ring) => { let d = Infinity; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; d = Math.min(d, distToSegment(x, z, a[0], a[1], b[0], b[1]).d); } return d; };
const centroid2 = (ring) => ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);

/** The raised beds: the garden polygon minus a circle round the shelter -> a south bed and a north bed (arc-ended). */
function bedsFrom(G, C, R) {
  const dense = densify(G, 0.5), out = dense.map((p) => Math.hypot(p[0] - C[0], p[1] - C[1]) > R), n = dense.length, beds = [];
  if (out.every(Boolean)) return [G];
  const start = out.findIndex((o, i) => !o && out[(i + 1) % n]); // an inside point followed by an outside one
  if (start < 0) return [G];
  let run = null;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (out[i]) { (run ||= []).push(dense[i]); } else if (run) { beds.push(run); run = null; }
  }
  const ang = (p) => Math.atan2(p[1] - C[1], p[0] - C[0]);
  return beds.filter((r) => r.length > 4).map((r) => {
    const e = r[r.length - 1], s = r[0]; let a0 = ang(e), a1 = ang(s);
    const arcs = [0, 1].map((dir) => { let d = a1 - a0; if (dir === 0) { while (d < 0) d += Math.PI * 2; } else { while (d > 0) d -= Math.PI * 2; } return { d, mid: [C[0] + Math.cos(a0 + d / 2) * R, C[1] + Math.sin(a0 + d / 2) * R] }; });
    const rc = centroid2(r), pick = arcs.find((a) => (a.mid[0] - C[0]) * (rc[0] - C[0]) + (a.mid[1] - C[1]) * (rc[1] - C[1]) > 0 && pointInRing(a.mid[0], a.mid[1], G)) || arcs.reduce((a, b) => (Math.abs(a.d) < Math.abs(b.d) ? a : b));
    const m = Math.max(3, Math.ceil(Math.abs(pick.d) / 0.12)), arc = []; for (let k = 0; k <= m; k++) { const a = a0 + pick.d * k / m; arc.push([C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R]); }
    return r.concat(arc);
  });
}

/** Work out the island: kerb ring between the two carriageways, beds, levelling plane. Null when the area is not in these features. */
export function trianglePlan(f, terrain) {
  const gArea = f && f.areas && f.areas.find((a) => a.id === TRIANGLE.gardenId), G = gArea && gArea.outer && gArea.outer.length > 5 ? gArea.outer : GARDEN;
  const cb = f && f.buildings && f.buildings.find((b) => b.id === TRIANGLE.canopyId), C = cb ? [cb.cx, cb.cz] : CANOPY_C;
  const ref = [92, -455];
  const W = cutNorth(offsetLine(WEST_ROAD.pts, WEST_ROAD.half + KERB, ref), NORTH_Z), E = cutNorth(offsetLine(EAST_ROAD.pts, EAST_ROAD.half + KERB, ref), NORTH_Z);
  const nose = [(W[0][0] + E[0][0]) / 2, NORTH_Z - 1.3];
  const ring = clipSouth([...W, ...E.slice().reverse(), nose]);
  // levelling plane (the LiDAR ground is noisy at paving scale)
  let heightFn = null;
  if (terrain && terrain.rawHeightAt) {
    const S = new Array(9).fill(0); let cnt = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const q of ring) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    for (let x = x0; x <= x1; x += 2.5) for (let z = z0; z <= z1; z += 2.5) { if (!pointInRing(x, z, ring)) continue; const h = terrain.rawHeightAt(x, z); if (!Number.isFinite(h)) continue; cnt++; S[0] += 1; S[1] += x; S[2] += z; S[3] += x * x; S[4] += x * z; S[5] += z * z; S[6] += h; S[7] += x * h; S[8] += z * h; }
    if (cnt > 6) {
      const Mx = [[S[0], S[1], S[2]], [S[1], S[3], S[4]], [S[2], S[4], S[5]]], b = [S[6], S[7], S[8]];
      const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det3(Mx);
      if (Math.abs(D) > 1e-9) { const col = (k) => Mx.map((r, i) => r.map((x, j) => (j === k ? b[i] : x))); const pl = [det3(col(0)) / D, det3(col(1)) / D, det3(col(2)) / D]; heightFn = (x, z, h) => { const w = Math.min(1, distRing(x, z, ring) / 2.5); return h + (pl[0] + pl[1] * x + pl[2] * z - h) * w; }; }
    }
  }
  const beds = bedsFrom(G, C, PLAZA_R);
  const eRail = offsetLine(EAST_ROAD.pts, EAST_ROAD.half + KERB + 0.3, ref);
  return { ring, levelRing: ring, heightFn, G, C, beds, W, E, eRail, wLine: offsetLine(WEST_ROAD.pts, WEST_ROAD.half + KERB + 0.8, ref), eLine: offsetLine(EAST_ROAD.pts, EAST_ROAD.half + KERB + 0.8, ref), c: C };
}

// ---------- geometry builders ----------
function lineBox(g, a, b, hw, hh = hw) { // box along the 3D segment a-b
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, t = d.map((v) => v / L);
  let sx = -t[2], sz = t[0]; const sl = Math.hypot(sx, sz); if (sl < 1e-6) { sx = 1; sz = 0; } else { sx /= sl; sz /= sl; }
  let ux = t[1] * sz, uy = t[2] * sx - t[0] * sz, uz = -t[1] * sx; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
  const C = (p, s, u) => [p[0] + sx * hw * s + ux * hh * u, p[1] + uy * hh * u, p[2] + sz * hw * s + uz * hh * u];
  const A = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, u]) => C(a, s, u)), B = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, u]) => C(b, s, u));
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.quad(A[i], A[j], B[j], B[i]); }
  g.quad(A[0], A[3], A[2], A[1]); g.quad(B[0], B[1], B[2], B[3]);
}
class Surf { // triangles laid on the ground (lift above it), with world-scaled UVs and up normals
  constructor(ground, lift, uvScale = 0) { this.g = ground; this.lift = lift; this.s = uvScale; this.p = []; this.n = []; this.uv = []; this.i = []; }
  tri(a, b, c) {
    if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < 0) [b, c] = [c, b]; // face up
    const n0 = this.p.length / 3; for (const [x, z] of [a, b, c]) { this.p.push(x, this.g(x, z) + this.lift, z); this.n.push(0, 1, 0); this.uv.push(this.s ? x / this.s : 0, this.s ? z / this.s : 0); } this.i.push(n0, n0 + 1, n0 + 2);
  }
  poly(ring, cell = 3) { // cut into cell-sized pieces so the surface follows the levelled ground between the (kerb-height) edge vertices
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let x = Math.floor(x0 / cell) * cell; x < x1; x += cell) for (let z = Math.floor(z0 / cell) * cell; z < z1; z += cell) {
      const pc = clipRingToRect(ring, { minX: x, maxX: x + cell, minZ: z, maxZ: z + cell }); if (!pc) continue;
      const tr = THREE.ShapeUtils.triangulateShape(pc.map(([px, pz]) => new THREE.Vector2(px, pz)), []); for (const [i, j, k] of tr) this.tri(pc[i], pc[j], pc[k]);
    }
  }
  strip(pts, w) { for (let i = 1; i < pts.length; i++) { const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2; this.tri([x0 + nx, z0 + nz], [x0 - nx, z0 - nz], [x1 - nx, z1 - nz]); this.tri([x0 + nx, z0 + nz], [x1 - nx, z1 - nz], [x1 + nx, z1 + nz]); } }
  mesh(mat, order = 2) { if (!this.i.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.i); const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.receiveShadow = true; return m; }
}
class Blobs { // vertex-coloured low-poly ellipsoids with soft (radial) normals, merged into one mesh
  constructor() { this.p = []; this.n = []; this.c = []; let ico = new THREE.IcosahedronGeometry(1, 0); if (ico.index) ico = ico.toNonIndexed(); this.u = ico.attributes.position.array; }
  add(x, y, z, rx, ry, rz, hex, rnd) {
    const col = new THREE.Color(hex), j = 0.88 + rnd() * 0.24, u = this.u; col.multiplyScalar(j);
    for (let i = 0; i < u.length; i += 3) { const ux = u[i], uy = u[i + 1], uz = u[i + 2], k = 1 + (((ux * 12.9 + uy * 78.2 + uz * 37.7 + x * 3.1) % 1) - 0.5) * 0.2; this.p.push(x + ux * rx * k, y + uy * ry * k, z + uz * rz * k); this.n.push(ux, uy, uz); const sh = 0.8 + 0.2 * (uy * 0.5 + 0.5); this.c.push(col.r * sh, col.g * sh, col.b * sh); }
  }
  mesh(mat) { if (!this.p.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
}
class Fronds { // cordyline / palm crowns: tapered leaf strips from one point, merged
  constructor() { this.p = []; this.c = []; this.i = []; }
  crown(top, nLeaves, Lmin, Lmax, rnd, cols) {
    for (let i = 0; i < nLeaves; i++) {
      const az = rnd() * Math.PI * 2, el = 0.2 + rnd() * 1.05, L = Lmin + rnd() * (Lmax - Lmin), droop = 0.1 + rnd() * 0.22, dx = Math.cos(az), dz = Math.sin(az), px = -dz, pz = dx, N = 6, n0 = this.p.length / 3, base = new THREE.Color(cols[i % cols.length]);
      for (let k = 0; k <= N; k++) {
        const t = k / N, h = L * t, w = 0.07 * Math.pow(1 - t, 0.55) + 0.006, cx = top[0] + dx * h * Math.cos(el), cz = top[2] + dz * h * Math.cos(el), cy = top[1] + h * Math.sin(el) - droop * h * h;
        this.p.push(cx + px * w, cy, cz + pz * w, cx - px * w, cy, cz - pz * w); const cc = base.clone().lerp(new THREE.Color(0x7a8a3a), t * 0.4); this.c.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
        if (k) { const b = n0 + (k - 1) * 2; this.i.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
    }
  }
  mesh(mat) { if (!this.i.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; }
}
const rng = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

/** Meshes and colliders of the island (the terrain under it is levelled by the plan's heightFn). */
export function buildTriangle(plan, ground) {
  const m = mats(), group = new THREE.Group(); group.name = 'triangle-island'; const colliders = [], rnd = rng(11);
  const geo = { kerb: new Geo(), wall: new Geo(), coping: new Geo(), navy: new Geo(), timber: new Geo(), steel: new Geo(), black: new Geo(), green: new Geo(), sign: new Geo(), board: new Geo(), lantern: new Geo() };
  const P3 = (x, z, y) => [x, ground(x, z) + y, z];
  const box = (g, x, y, z, hl, hh, hw, ang = 0) => geo[g].box(x, ground(x, z) + y, z, Math.sin(ang), Math.cos(ang), hl, hh, hw);
  const circ = (x, z, r, top, kind) => colliders.push({ type: 'circle', x, z, r, y0: ground(x, z) - 0.3, top: ground(x, z) + top, kind });
  const seg = (a, b, r, top, kind) => colliders.push({ type: 'segment', a, b, r, y0: ground(a[0], a[1]) - 0.3, top: ground(a[0], a[1]) + top, kind });
  const { ring, C } = plan;

  // ---- paving, kerb and a darker band along the kerbs ----
  const tex = pavingTexture(); if (tex) { m.paving.map = tex; m.paving.needsUpdate = true; }
  const paving = new Surf(ground, PAVE_LIFT, 2.4); paving.poly(ring); { const me = paving.mesh(m.paving, 1); if (me) group.add(me); }
  const band = new Surf(ground, PAVE_LIFT + 0.01); band.strip(offsetLine(plan.W, 0.35, plan.C), 0.5); band.strip(offsetLine(plan.E, 0.35, plan.C), 0.5);
  { const me = band.mesh(m.band, 2); if (me) group.add(me); }
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (Math.abs(mz - SOUTH_LINE(mx)) < 0.3) continue; // the plaza runs on into the Cobbold Road footway here: no kerb
    geo.kerb.box(mx, ground(mx, mz) + 0.06, mz, ux, uz, L / 2 + 0.08, 0.06, 0.09);
  }

  // ---- raised beds ----
  const bedSoil = new Surf(ground, BED_H);
  plan.beds.forEach((bed) => {
    bedSoil.poly(bed);
    for (let i = 0; i < bed.length; i++) {
      const a = bed[i], b = bed[(i + 1) % bed.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.04) continue;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, y = ground(mx, mz);
      geo.wall.box(mx, y + (BED_H + 0.04) / 2, mz, ux, uz, L / 2 + 0.17, (BED_H + 0.04) / 2, 0.17);
      geo.coping.box(mx, y + BED_H + 0.07, mz, ux, uz, L / 2 + 0.2, 0.035, 0.24);
      if (i % 3 === 0) seg(a, [bed[(i + 3) % bed.length][0], bed[(i + 3) % bed.length][1]], 0.2, BED_H + 0.1, 'wall');
    }
  });
  { const me = bedSoil.mesh(m.grass, 3); if (me) group.add(me); }

  // ---- planting: grasses, shrubs, lavender, cordylines/palms ----
  const flora = new Blobs(), fronds = new Fronds(), trunks = new Geo();
  const inBed = (x, z, edge) => plan.beds.some((b) => pointInRing(x, z, b) && distRing(x, z, b) > edge);
  const bb = (r) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return [x0, x1, z0, z1]; };
  const scatter = (bed, n, edge, fn) => { const [x0, x1, z0, z1] = bb(bed); let placed = 0, tries = 0; while (placed < n && tries++ < n * 30) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (pointInRing(x, z, bed) && distRing(x, z, bed) > edge) { fn(x, z); placed++; } } };
  const GRASSY = [0xb4a468, 0xa39658, 0x8c9857], GREEN = [0x45652f, 0x517235, 0x3a552b], LAV = [0x8673ad, 0x9482bb, 0x76669f];
  plan.beds.forEach((bed, bi) => {
    const A = Math.abs(bed.reduce((s, p, i) => { const q = bed[(i + 1) % bed.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0)) / 2;
    scatter(bed, Math.round(A * 0.4), 0.45, (x, z) => { const y = ground(x, z) + BED_H, r = 0.16 + rnd() * 0.22, k = rnd(); if (k < 0.4) flora.add(x, y + r * 0.8, z, r * 0.8, r * 1.0, r * 0.8, GRASSY[(rnd() * 3) | 0], rnd); else if (k < 0.75) flora.add(x, y + r * 0.7, z, r * 1.3, r * 0.9, r * 1.3, GREEN[(rnd() * 3) | 0], rnd); else flora.add(x, y + 0.1, z, 0.18 + rnd() * 0.12, 0.12, 0.18 + rnd() * 0.12, LAV[(rnd() * 3) | 0], rnd); });
    const nP = bi === 0 ? 2 : 4; // cordylines and palms
    scatter(bed, nP, 1.1, (x, z) => {
      const y = ground(x, z) + BED_H, h = 1.2 + rnd() * 1.8, ang = (rnd() - 0.5) * 0.14;
      lineBox(trunks, [x, y, z], [x + ang * h, y + h, z], 0.07, 0.07);
      fronds.crown([x + ang * h, y + h, z], 34, 0.9, 1.6, rnd, [0x4f6b34, 0x5d7a3a, 0x43602f]);
      circ(x, z, 0.3, 2.2, 'palm');
    });
  });
  { const me = flora.mesh(m.flora); if (me) group.add(me); const fr = fronds.mesh(m.leaves); if (fr) group.add(fr); }
  // trees: two on the south bed, two on the north bed, one west of the shelter
  const trees = [];
  { const bS = plan.beds.length > 1 ? plan.beds.reduce((a, b) => (centroid2(a)[1] > centroid2(b)[1] ? a : b)) : plan.beds[0], bN = plan.beds.length > 1 ? plan.beds.find((b) => b !== bS) : null;
    const place = (bed, fx, sc) => { const [x0, x1, z0, z1] = bb(bed); for (let t = 0; t < 200; t++) { const x = x0 + (x1 - x0) * fx + (rnd() - 0.5) * 3, z = z0 + (z1 - z0) * (0.15 + rnd() * 0.7); if (pointInRing(x, z, bed) && distRing(x, z, bed) > 1.4 && !trees.some((q) => Math.hypot(q.x - x, q.z - z) < 5)) { trees.push({ x, z, kind: 'broadleaf', scale: sc, rot: rnd() * 6.28, source: 'triangle' }); circ(x, z, 0.35, 4, 'tree'); return; } } };
    place(bS, 0.55, 1.0); place(bS, 0.4, 0.8); if (bN) { place(bN, 0.5, 0.9); place(bN, 0.7, 0.7); }
  }
  if (trees.length) for (const me of buildTreeMeshes(trees, ground)) group.add(me);

  // ---- the shelter: white tensile canopy on four navy posts (square, ~7.4 m across, apex ~5 m) ----
  { const [cx, cz] = C, S = 3.4, hp = 3.1, apex = 4.9, rotA = Math.atan2(plan.eRail[1][0] - plan.eRail[0][0], plan.eRail[1][1] - plan.eRail[0][1]) + Math.PI / 4;
    const R = (dx, dz) => [cx + dx * Math.cos(rotA) + dz * Math.sin(rotA), cz - dx * Math.sin(rotA) + dz * Math.cos(rotA)];
    const corners = [[-S, -S], [S, -S], [S, S], [-S, S]].map(([dx, dz]) => R(dx, dz)), top = P3(cx, cz, apex), plate = corners.map(([x, z]) => P3(x, z, hp + 0.05));
    for (const [x, z] of corners) { box('navy', x, hp / 2, z, 0.075, hp / 2, 0.075); circ(x, z, 0.14, hp + 0.2, 'shelter-post'); box('navy', x, 0.06, z, 0.14, 0.06, 0.14); }
    // frame: ridge arms apex-to-post, eaves beams between the posts
    plate.forEach((p, i) => { lineBox(geo.navy, p, top, 0.05, 0.05); const q = plate[(i + 1) % 4]; lineBox(geo.navy, p, q, 0.04, 0.05); });
    // fabric: four sagging triangular panels, smooth-shaded (grid of N rows)
    const N = 6, pos = [], idx = [];
    corners.forEach((p, f) => {
      const q = corners[(f + 1) % 4], base = pos.length / 3, rows = [];
      for (let r = 0; r <= N; r++) { const row = []; for (let c = 0; c <= r; c++) { const t = r / N, u = r === 0 ? 0 : c / r, ex = p[0] + (q[0] - p[0]) * u, ez = p[1] + (q[1] - p[1]) * u, sag = 0.28 * 4 * u * (1 - u) * t, ex2 = cx + (ex - cx) * (1 + 0.1 * t), ez2 = cz + (ez - cz) * (1 + 0.1 * t), y = ground(cx, cz) + apex + (hp - apex) * t - sag * 0.5 - (1 - t) * 0.0; row.push(pos.length / 3); pos.push(cx + (ex2 - cx) * t, y, cz + (ez2 - cz) * t); } rows.push(row); }
      for (let r = 1; r <= N; r++) for (let c = 0; c < r; c++) { idx.push(rows[r - 1][Math.min(c, r - 1)], rows[r][c], rows[r][c + 1]); if (c > 0) idx.push(rows[r - 1][c - 1], rows[r][c], rows[r - 1][c]); }
      void base;
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const fab = new THREE.Mesh(g, m.fabric); fab.castShadow = true; group.add(fab);
    // finial
    lineBox(geo.navy, top, [top[0], top[1] + 0.4, top[2]], 0.03, 0.03);
    // paved circle round the shelter (slightly proud, darker flags) and benches with backs on the shelter's north and south rim
    const disc = new Surf(ground, PAVE_LIFT + 0.012); const pts = []; for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; pts.push([cx + Math.cos(a) * 4.9, cz + Math.sin(a) * 4.9]); } disc.poly(pts); { const me = disc.mesh(m.band, 3); if (me) group.add(me); }
    const bench = (x, z, ang, back) => { const ux = Math.sin(ang), uz = Math.cos(ang), nx = uz, nz = -ux; for (const sgn of [-0.75, 0.75]) box('steel', x + ux * sgn, 0.22, z + uz * sgn, 0.03, 0.22, 0.2, ang); for (let s = 0; s < 3; s++) geo.timber.box(x + nx * (s - 1) * 0.14, ground(x, z) + 0.46, z + nz * (s - 1) * 0.14, ux, uz, 0.95, 0.025, 0.06); if (back) for (let s = 0; s < 3; s++) geo.timber.box(x - nx * 0.22, ground(x, z) + 0.7 + s * 0.12, z - nz * 0.22, ux, uz, 0.95, 0.04, 0.012); seg([x - ux * 0.95, z - uz * 0.95], [x + ux * 0.95, z + uz * 0.95], 0.28, 0.9, 'bench'); };
    const A0 = Math.atan2(plan.eRail[1][0] - plan.eRail[0][0], plan.eRail[1][1] - plan.eRail[0][1]);
    const al = [Math.sin(A0), Math.cos(A0)], pe = [al[1], -al[0]]; // along the island (southwards) and across (towards the east kerb)
    if (pe[0] < 0) { pe[0] = -pe[0]; pe[1] = -pe[1]; }
    const at = (u, v) => [cx + al[0] * u + pe[0] * v, cz + al[1] * u + pe[1] * v];
    // two long flat benches on the east side of the plaza facing the shelter, two backed benches west of it
    for (const u of [-2.6, 2.6]) { const [x, z] = at(u, 6.4); bench(x, z, A0, false); }
    for (const u of [-3.2, 3.2]) { const [x, z] = at(u, -6.3); bench(x, z, A0, true); }
    // sign post with a yellow board at the front of the shelter (photo: pole in the foreground), navy bollards near it
    { const [x, z] = at(5.5, 1.5); box('steel', x, 1.2, z, 0.03, 1.2, 0.03); box('sign', x, 2.35, z, 0.22, 0.2, 0.012, A0 + Math.PI / 2); circ(x, z, 0.1, 2.6, 'sign'); }
  }

  // ---- railings along the A1021 kerb (open round the shelter for the crossing to the shops) ----
  { const line = plan.eRail, gapZ = [C[1] - 9, C[1] + 8], runs = []; let cur = null;
    for (let z = NORTH_Z + 0.6; z <= -400; z += 0.5) { if (z > gapZ[0] && z < gapZ[1]) { cur = null; continue; } const p = lineAtZ(line, z); if (!p || p[1] > SOUTH_LINE(p[0]) - 0.3) { cur = null; continue; } if (!cur) { cur = []; runs.push(cur); } cur.push(p); }
    for (const run of runs) {
      let acc = 0, nextPost = 0, nextBar = 0; const posts = [];
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1], b = run[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (const [h, w] of [[1.05, 0.03], [0.62, 0.025], [0.18, 0.03]]) lineBox(geo.navy, P3(a[0], a[1], h), P3(b[0], b[1], h), 0.02, w);
        while (nextBar < acc + L) { const t = (nextBar - acc) / L, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; lineBox(geo.navy, P3(x, z, 0.15), P3(x, z, 1.04), 0.011, 0.011); nextBar += 0.19; }
        while (nextPost < acc + L) { const t = (nextPost - acc) / L, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; posts.push([x, z]); nextPost += 2.4; }
        acc += L;
      }
      posts.push([run[run.length - 1][0], run[run.length - 1][1]]); for (const [x, z] of posts) lineBox(geo.navy, P3(x, z, 0), P3(x, z, 1.12), 0.035, 0.035);
      for (let i = 0; i < run.length - 1; i += 6) { const b = run[Math.min(run.length - 1, i + 6)]; seg([run[i][0], run[i][1]], [b[0], b[1]], 0.06, 1.1, 'railing'); }
    }
  }

  // ---- lamp posts (navy, swan-neck lantern, hanging basket), bins, cabinet, bollards, info board ----
  const lamp = (x, z, dirx, dirz) => {
    box('navy', x, 0.55, z, 0.14, 0.55, 0.14); box('navy', x, 3.1, z, 0.06, 2.6, 0.06);
    const T = [[0, 5.65], [0.12, 6.0], [0.45, 6.2], [0.85, 6.1]].map(([o, y]) => P3(x + dirx * o, z + dirz * o, y));
    for (let i = 1; i < T.length; i++) lineBox(geo.navy, T[i - 1], T[i], 0.035, 0.035);
    geo.lantern.box(x + dirx * 0.85, ground(x, z) + 5.95, z + dirz * 0.85, 1, 0, 0.17, 0.12, 0.17);
    lineBox(geo.navy, P3(x, z, 3.5), P3(x - dirz * 0.6, z + dirx * 0.6, 3.5), 0.025, 0.025); // basket bracket
    const bx = x - dirz * 0.6, bz = z + dirx * 0.6, by = ground(x, z) + 3.15;
    flora.add(bx, by, bz, 0.3, 0.24, 0.3, [0xd2467f, 0xc83a74, 0xe86aa0][(rnd() * 3) | 0], rnd); flora.add(bx, by + 0.12, bz, 0.22, 0.14, 0.22, 0x5a8a3a, rnd);
    circ(x, z, 0.16, 6.2, 'lamp');
  };
  const bin = (x, z) => { box('black', x, 0.5, z, 0.23, 0.5, 0.23); box('steel', x, 1.02, z, 0.25, 0.03, 0.25); circ(x, z, 0.3, 1.1, 'bin'); };
  { const wl = plan.wLine, el = plan.eLine, put = (line, z, d) => { const p = lineAtZ(line, z); if (p) lamp(p[0], p[1], d * 0.97, d * 0.24); };
    for (const z of [-437, -468, -483]) put(el, z, 1); for (const z of [-441, -465, -480]) put(wl, z, -1);
    const bins = [[wl, -447], [wl, -462], [el, -442], [el, -469]]; for (const [line, z] of bins) { const p = lineAtZ(line, z); if (p) bin(p[0] + (line === wl ? 0.4 : -0.4), p[1]); }
    for (const z of [-472, -475, -478, -481]) { const p = lineAtZ(wl, z); if (p) { box('navy', p[0] + 1.0, 0.45, p[1], 0.06, 0.45, 0.06); box('steel', p[0] + 1.0, 0.8, p[1], 0.065, 0.04, 0.065); circ(p[0] + 1.0, p[1], 0.1, 0.9, 'bollard'); } }
    const p = lineAtZ(wl, -437); if (p) { const x = p[0] + 2.3, z = p[1] - 0.5; box('green', x, 0.6, z, 0.5, 0.6, 0.22, 0.5); box('steel', x, 1.22, z, 0.52, 0.03, 0.24, 0.5); circ(x, z, 0.55, 1.2, 'cabinet'); } // green utility cabinet
    const q = lineAtZ(wl, -456); if (q) { const x = q[0] + 1.6, z = q[1]; box('navy', x - 0.5, 1.2, z, 0.05, 1.2, 0.05); box('navy', x + 0.5, 1.2, z, 0.05, 1.2, 0.05); box('board', x, 1.55, z, 0.62, 0.55, 0.03); circ(x, z, 0.7, 2.4, 'board'); } // navy information board
  }

  for (const [k, g] of Object.entries(geo)) { const me = g.mesh(k === 'kerb' ? m.kerb : k === 'wall' ? m.wall : k === 'coping' ? m.coping : k === 'timber' ? m.timber : m[k]); if (me) group.add(me); }
  { const me = trunks.mesh(lam(0x6d5a47, { side: THREE.DoubleSide })); if (me) group.add(me); }
  return { meshes: [group], colliders };
}
