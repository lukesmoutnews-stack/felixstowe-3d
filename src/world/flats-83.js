// The 1960s flats at 79-83 Undercliff Road West, modelled from the user's Google Street View photographs
// (September 2026: streetview-flats-83-1..3.png, plus 83-flats-kw-autos.png and 83-car-park.png).
//
//  - the SLAB (OSM way 506378788, 18.6 m high by LiDAR): seven floors of flats behind pale cream horizontal
//    cladding panels, a row of white-framed windows and a balcony on every floor, slim pale concrete fins at every
//    bay, dark-brown brick end walls (stair and lift towers), a flat roof with a thin parapet railing and a
//    brick lift-motor room;
//  - the WING (OSM way 1017204177, 79-83): three floors of flats cantilevered over an open undercroft on slim white
//    pilotis, brown-brick end towers, balconies with black bar or glass railings, a green-fascia workshop and
//    reception under it (no readable names), a car park in front with white bay lines, blue bollards, a ticket
//    machine and signs, a low red-brick boundary wall with stepped piers and a curved end next to the pavement,
//    and a big autumn-coloured tree at the east end.
// Dimensions are estimated from the photographs (floor height 2.6 m).

import * as THREE from 'three';
import { makeKit } from './geo-kit.js';
import { ensureCCW } from '../geo/polygon.js';

export const isFlatsSlab = (b) => b.id === 506378788;
export const isFlatsWing = (b) => b.id === 1017204177;

function cv(w, h, draw, rep = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const brick = (hue, sat, lig, vary) => cv(256, 128, (g, w, h) => {
    g.fillStyle = '#6a5a4c'; g.fillRect(0, 0, w, h); const ch = h / 8, bw = w / 5.5;
    for (let row = 0; row < 8; row++) for (let k = -1; k < 6; k++) { const x = k * bw + (row % 2) * bw / 2, l = lig + (r() - 0.5) * vary; g.fillStyle = `hsl(${hue + (r() - 0.5) * 8},${sat}%,${l}%)`; g.fillRect(x + 1.5, row * ch + 1.5, bw - 3, ch - 3); }
  });
  MATS = {
    clad: std({ map: cv(128, 128, (g, w, h) => { g.fillStyle = '#e6e2d3'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(120,112,95,.55)'; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y + 1.5, w, 1.2); } for (let i = 0; i < 250; i++) { g.fillStyle = `rgba(90,85,70,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 2); } }), roughness: 0.8 }),
    brown: std({ map: brick(24, 24, 28, 7), roughness: 0.95 }),
    boundary: std({ map: brick(10, 48, 42, 14), roughness: 0.95 }),
    concrete: std({ color: 0xd4d1c7, roughness: 0.9 }), concreteDark: std({ color: 0x8e8a82, roughness: 0.95 }),
    white: std({ color: 0xf4f4f0, roughness: 0.55 }),
    glass: std({ color: 0x46566a, roughness: 0.08, metalness: 0.5 }),
    glassT: std({ color: 0x9cc3da, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    rail: std({ map: cv(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#4a4d52'; g.fillRect(0, 4, w, 4); g.fillRect(0, h - 6, w, 3); for (let x = 3; x < w; x += 8) g.fillRect(x, 4, 2, h - 8); }), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    railGrey: std({ map: cv(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#9ba0a6'; g.fillRect(0, 2, w, 3); g.fillRect(0, h * 0.5, w, 2); g.fillRect(0, h - 5, w, 3); for (let x = 6; x < w; x += 16) g.fillRect(x, 2, 2, h - 6); }), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }),
    black: std({ color: 0x1c1d20, roughness: 0.5, metalness: 0.3 }),
    dark: std({ color: 0x2a2a28, roughness: 0.95 }),
    green: std({ color: 0x55a83c, roughness: 0.6 }), greenDark: std({ color: 0x2e7a2a, roughness: 0.6 }),
    tarmac: std({ map: cv(128, 128, (g, w, h) => { g.fillStyle = '#4b4c4e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    line: std({ color: 0xe9e9e4, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    blue: std({ color: 0x1d3a78, roughness: 0.45, metalness: 0.2 }),
    grey: std({ color: 0xa3a6aa, roughness: 0.5, metalness: 0.4 }),
    sign: std({ color: 0x2a6a38, roughness: 0.6 }), signWhite: std({ color: 0xf0f0ee, roughness: 0.6 }),
    hedge: std({ color: 0x3c5c2c, roughness: 0.95 }), hedge2: std({ color: 0x55703a, roughness: 0.95 }),
    bark: std({ color: 0x5c4a38, roughness: 0.95 }),
    leafA: std({ color: 0x8a8a2c, roughness: 0.95 }), leafB: std({ color: 0xa8742a, roughness: 0.95 }), leafC: std({ color: 0x5f7a2c, roughness: 0.95 }), leafD: std({ color: 0xb2501f, roughness: 0.95 }),
    car: std({ color: 0x24282c, roughness: 0.4, metalness: 0.6 }),
  };
  MATS.clad.map.repeat.set(1, 1);
  return MATS;
}

function frameOf(b) {
  const outer = ensureCCW(b.outer); let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 10) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, score = nz * L; if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best, Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W;
  let D = 0; for (const [x, z] of outer) D = Math.max(D, -((x - A[0]) * Nx + (z - A[1]) * Nz));
  return { outer, A, W, D, Nx, Nz, Ex, Ez };
}

/** One white-framed window set in a face: frame bars, optional mullions. */
function win(K, F, u0, u1, y0, y1, M, mul = [], tr = 0) {
  const fw = 0.06;
  K.fbox(F, M.glass, u0 + fw / 2, u1 - fw / 2, y0 + fw / 2, y1 - fw / 2, 0.02, 0.04);
  K.fbox(F, M.white, u0, u1, y0, y0 + fw, 0, 0.08); K.fbox(F, M.white, u0, u1, y1 - fw, y1, 0, 0.08);
  K.fbox(F, M.white, u0, u0 + fw, y0, y1, 0, 0.08); K.fbox(F, M.white, u1 - fw, u1, y0, y1, 0, 0.08);
  for (const f of mul) { const u = u0 + (u1 - u0) * f; K.fbox(F, M.white, u - fw / 2, u + fw / 2, y0, y1, 0, 0.07); }
  if (tr) { const y = y1 - (y1 - y0) * tr; K.fbox(F, M.white, u0, u1, y - fw / 2, y + fw / 2, 0, 0.07); }
}
const planeOn = (K, F, mat, u0, u1, y0, y1, w) => {
  const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0); const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ((u1 - u0) * uv.getX(i)) / 1.9, uv.getY(i));
  g.translate((u0 + u1) / 2, (y0 + y1) / 2, w); g.rotateY(F.th); g.translate(F.ox, 0, F.oz); K.put(mat, g);
};

/**
 * The front elevation of a slab-like block: brick end towers, fins at every bay, per floor a cladding spandrel, a
 * window set and a cantilevered balcony with a bar or glass railing.
 */
function elevation(K, M, o) {
  const { F, W, floors, FH, y0, endW, endE, balconies, fins = true } = o;
  const u0 = endW, u1 = W - endE, nb = o.bays, bw = (u1 - u0) / nb, top = y0 + floors * FH;
  // end towers (brick)
  K.panel(F, M.brown, 0, endW, y0, top + 0.3, 0.015, [1.2, 0.6]); K.panel(F, M.brown, W - endE, W, y0, top + 0.3, 0.015, [1.2, 0.6]);
  // cladding band across the bays
  K.panel(F, M.clad, u0, u1, y0, top, 0.01, [1.6, 1.6]);
  for (let k = 0; k < nb; k++) {
    const a = u0 + k * bw, c = a + bw;
    for (let f = 0; f < floors; f++) {
      const yf = y0 + f * FH;
      win(K, F, a + 0.3, c - 0.3, yf + 0.8, yf + 2.15, M, [0.34, 0.67], 0);
      // curtain / blind glint behind some of the glass
      if ((k + f) % 3 === 1) K.fbox(F, M.white, a + 0.36, a + 0.36 + (bw - 0.72) * 0.34, yf + 0.86, yf + 2.09, 0.005, 0.015);
      if (balconies && (f > 0 || o.groundBalconies)) {
        K.fbox(F, M.concrete, a, c, yf - 0.14, yf + 0.04, 0, 1.15);                                   // balcony slab
        const kind = (k * 2 + f) % 5;
        if (kind === 3 || kind === 0 && f % 2) { planeOn(K, F, M.glassT, a + 0.05, c - 0.05, yf + 0.04, yf + 1.02, 1.1); K.fbox(F, M.grey, a, c, yf + 1.0, yf + 1.04, 1.07, 1.13); }
        else planeOn(K, F, kind % 2 ? M.rail : M.railGrey, a + 0.05, c - 0.05, yf + 0.04, yf + 1.04, 1.1);
      }
    }
  }
  if (fins) for (let k = 0; k <= nb; k++) { const u = u0 + k * bw; K.fbox(F, M.concrete, u - 0.12, u + 0.12, y0 - 0.1, top + 0.95, 0, 0.5); }
  // parapet and roof rail
  K.fbox(F, M.clad, 0, W, top, top + 0.5, 0, 0.32); K.fbox(F, M.concrete, 0, W, top + 0.5, top + 0.58, -0.02, 0.36);
  planeOn(K, F, M.railGrey, u0 - 0.2, u1 + 0.2, top + 0.58, top + 1.5, 0.27);
}

function pilotis(K, M, F, us, y0, y1, w) { for (const u of us) { const g = new THREE.CylinderGeometry(0.17, 0.17, y1 - y0, 12); g.translate(u, (y0 + y1) / 2, w); g.rotateY(F.th); g.translate(F.ox, 0, F.oz); K.put(M.white, g); } }

function makeFrame(b, ctx, plan) {
  const Fm = frameOf(b), { A, Nx, Nz, Ex, Ez } = Fm;
  const toW = (x, z) => [A[0] + Ex * x + Nx * z, A[1] + Ez * x + Nz * z];
  const gAt = (x, z) => { const p = toW(x, z); return ctx.ground(p[0], p[1]); };
  let gMin = Infinity, gSum = 0, n = 0; for (let x = 0; x <= Fm.W; x += 3) { const g = gAt(x, 0.3); gMin = Math.min(gMin, g); gSum += g; n++; }
  return { ...Fm, toW, gAt, gMin, base: gSum / n };
}

// ----------------------------------------------------------------------------------------- the slab
export function buildFlatsSlab(b, ctx) {
  const M = mats(), P = makeFrame(b, ctx), { A, W, D, Ex, Ez, Nx, Nz, toW, gAt } = P, K = makeKit();
  const FH = 2.6, floors = 7, FOOT = 4.0, base = P.gMin;
  const top = floors * FH;
  const group = new THREE.Group(); group.name = 'landmark:flats-slab';
  const local = new THREE.Group(); local.position.set(A[0], base, A[1]); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  // core body (rendered brick/cladding behind the panels)
  K.box(M.clad, 0, W, -FOOT, top, -D, 0);
  const F = K.face(0, 0, 0);
  elevation(K, M, { F, W, floors, FH, y0: 0, endW: 2.0, endE: 3.4, bays: 7, balconies: true, groundBalconies: true });
  // end walls (brick) and the back (cladding with window bands)
  K.panel(K.face(0, 0, -Math.PI / 2), M.brown, 0, D, -1, top + 0.3, 0.015, [1.2, 0.6]);
  K.panel(K.face(W, 0, Math.PI / 2), M.brown, 0, D, -1, top + 0.3, 0.015, [1.2, 0.6]);
  { const FB = K.face(W, -D, Math.PI); K.panel(FB, M.clad, 0, W, 0, top, 0.015, [1.6, 1.6]);
    for (let f = 0; f < floors; f++) for (let k = 0; k < 7; k++) win(K, FB, 2.2 + k * 3.7, 3.9 + k * 3.7, f * FH + 0.9, f * FH + 2.0, M, [0.5], 0); }
  // lift motor room and stair head (brick) on the roof
  K.box(M.brown, W - 3.2, W - 0.3, top, top + 2.5, -5.0, -0.4); K.box(M.concrete, W - 3.3, W - 0.2, top + 2.5, top + 2.6, -5.1, -0.3);
  K.box(M.brown, 0.3, 2.0, top, top + 2.2, -4.0, -0.4); K.box(M.concrete, 0.2, 2.1, top + 2.2, top + 2.3, -4.1, -0.3);
  // front garden: clipped hedge and shrubs along the foot of the slab (the slab stands behind a planted terrace)
  for (let u = 0.5; u < W; u += 1.3) { const y = Math.max(-0.3, gAt(u, 2.4) - base); K.sph(u % 2.6 < 1.3 ? M.hedge : M.hedge2, u, y + 0.55, 2.4, 0.7 + ((u * 7) % 3) * 0.1, 0.8, 7); }
  K.flush(local, 'flats-slab');
  const rect = [toW(0, 0), toW(W, 0), toW(W, -D), toW(0, -D)];
  return { group, collider: { outer: rect, holes: [], base: base - FOOT, top: base + top + 2.6 } };
}

// ------------------------------------------------------------------------------------------ the wing
export function buildFlatsWing(b, ctx) {
  const M = mats(), P = makeFrame(b, ctx), { A, W, D, Ex, Ez, Nx, Nz, toW, gAt } = P, K = makeKit();
  const U = 2.7, FH = 2.2, floors = 3, FOOT = 1.2, base = P.gMin;
  const top = U + floors * FH, BACK = 5.0;
  const group = new THREE.Group(); group.name = 'landmark:flats-wing';
  const local = new THREE.Group(); local.position.set(A[0], base, A[1]); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  const F = K.face(0, 0, 0), colliders = [];
  // upper floors: a box that reaches over the undercroft to the front line
  K.box(M.clad, 0, W, U, top, -D, 0.0);
  elevation(K, M, { F, W, floors, FH, y0: U, endW: 0.5, endE: 3.4, bays: 8, balconies: true, groundBalconies: true });
  // underside of the cantilevered floor and the open undercroft: slab, back wall in dark brick, pilotis
  K.box(M.concreteDark, 0, W, U - 0.35, U, -BACK, 1.15);
  K.box(M.brown, 0, W, -FOOT, U - 0.35, -D, -BACK);              // the back wall and the closed rear of the building
  K.box(M.concrete, 0, W, -0.2, 0.05, -BACK, 1.2);               // the car-port floor
  K.fbox(F, M.brown, W - 3.4, W, 0, 0.0, 0, 0);
  pilotis(K, M, F, [0.9, 7.0, 13.5, 20.0, 26.0, W - 3.6], 0, U - 0.35, 1.0);
  // workshop and reception under the building: green fascia, roller shutters, a glazed office (no names)
  { const FB = K.face(0, -BACK, 0);
    K.fbox(FB, M.green, 6.0, 25.0, U - 1.25, U - 0.45, 0.02, 0.12);
    K.fbox(FB, M.greenDark, 12.0, 17.5, U - 1.9, U - 1.25, 0.02, 0.5);
    K.fbox(FB, M.glass, 12.3, 17.2, 0.1, U - 1.95, 0.02, 0.06); K.fbox(FB, M.green, 12.0, 12.3, 0.0, U - 1.25, 0.02, 0.12); K.fbox(FB, M.green, 17.2, 17.5, 0.0, U - 1.25, 0.02, 0.12); K.fbox(FB, M.green, 14.4, 14.7, 0.0, U - 1.95, 0.02, 0.1);
    for (const [a, c] of [[6.4, 11.4], [18.2, 23.0]]) { K.fbox(FB, M.grey, a, c, 0.1, U - 1.35, 0.02, 0.08); for (let y = 0.3; y < U - 1.35; y += 0.18) K.fbox(FB, M.concreteDark, a, c, y, y + 0.02, 0.08, 0.1); } }
  K.box(M.dark, 0, W, 0.0, 0.0, 0, 0);
  K.flush(local, 'flats-wing');
  // the wing is open below: collider for the walls only
  const rect = [toW(0, 0), toW(W, 0), toW(W, -D), toW(0, -D)];
  const colls = [];
  for (const u of [0.9, 7.0, 13.5, 20.0, 26.0, W - 3.6]) { const p = toW(u, 1.0); colls.push({ type: 'circle', x: p[0], z: p[1], r: 0.2, y0: base - 0.3, top: base + U, kind: 'pilotis' }); }
  const rear = [[toW(0, -BACK), toW(W, -BACK)], [toW(0, -BACK), toW(0, 0)], [toW(W, -BACK), toW(W, 0)]];
  for (const [a, c] of rear) colls.push({ type: 'segment', a, b: c, r: 0.2, y0: base - 0.3, top: base + top, kind: 'building' });
  // ---- car park in front, boundary wall and street furniture ----
  const out = makeKit(); const loc2 = new THREE.Group(); loc2.position.set(A[0], base, A[1]); loc2.rotation.y = local.rotation.y; group.add(loc2);
  const roadAt = (x, z) => { const p = toW(x, z); return ctx.nearestRoad(p[0], p[1], 16, (q) => q.car); };
  const scanZ = (x, off) => { for (let z = 2.0; z < 22; z += 0.15) { const r = roadAt(x, z); if (r && r.d <= r.road.width / 2 + off) return z; } return null; };
  const wallZ = (x) => (scanZ(x, 2.4) ?? 12) + 0.15;        // just behind the back of the pavement
  // tarmac surface with white bay lines
  { const xa = -2, xb = W + 3, n = Math.ceil((xb - xa) / 1.0), Pp = [], UV = [], I = [];
    for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n; for (const z of [1.6, wallZ(x) - 0.25]) { const y = Math.max(gAt(x, z) - base, -1) + 0.04; Pp.push(x, y, z); UV.push(x / 4, z / 4); } }
    for (let i = 0; i < n; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); out.put(M.tarmac, g);
    // bay lines every 2.6 m, 5 m long, pointing at the building
    for (let x = 1.0; x < W + 2; x += 2.6) { const zE = wallZ(x) - 0.5, zS = Math.max(3.2, zE - 5.0); const y = Math.max(gAt(x, (zE + zS) / 2) - base, -1) + 0.06; const g2 = new THREE.PlaneGeometry(0.1, zE - zS); g2.rotateX(-Math.PI / 2); g2.translate(x, y, (zE + zS) / 2); out.put(M.line, g2); }
  }
  // low red-brick boundary wall behind the pavement with stepped piers and a curved west end
  { const x0 = 3.0, x1 = W + 1.0, step = 2.4; let prev = null;
    for (let x = x0; x < x1; x += step) { const xa = x, xb = Math.min(x1, x + step), zc = wallZ((xa + xb) / 2); const gy = Math.max(gAt((xa + xb) / 2, zc) - base, -1); const hgt = Math.round((gy + 1.0) / 0.2) * 0.2 + 0.0;
      out.box(M.boundary, xa, xb + 0.05, gy - 0.6, hgt + 0.0, zc - 0.17, zc + 0.17); out.box(M.concrete, xa, xb + 0.05, hgt, hgt + 0.09, zc - 0.22, zc + 0.22);
      const pier = (x_) => { const pz = wallZ(x_), pg = Math.max(gAt(x_, pz) - base, -1); out.box(M.boundary, x_ - 0.27, x_ + 0.27, pg - 0.6, pg + 1.35, pz - 0.27, pz + 0.27); out.box(M.concrete, x_ - 0.32, x_ + 0.32, pg + 1.35, pg + 1.45, pz - 0.32, pz + 0.32); };
      if (Math.round((x - x0) / step) % 3 === 0) pier(xa);
      const a = toW(xa, zc), c = toW(xb, zc); colliders.push({ type: 'segment', a, b: c, r: 0.2, y0: base - 0.5, top: base + 1.2, kind: 'wall' }); }
    // the curved end: a quarter circle sweeping in towards the car park
    { const zc = wallZ(x0), cx = x0, cz = zc - 3.4, gy = Math.max(gAt(cx, zc) - base, -1);
      for (let k = 0; k < 8; k++) { const a0 = (k / 8) * Math.PI / 2, a1 = ((k + 1) / 8) * Math.PI / 2; const p0 = [cx - Math.sin(a0) * 3.4 * 0 - (1 - Math.cos(a0)) * 3.4 * 0, 0]; const xA = cx - (3.4 - 3.4 * Math.cos(a0)), zA = cz + 3.4 * Math.sin(a0), xB = cx - (3.4 - 3.4 * Math.cos(a1)), zB = cz + 3.4 * Math.sin(a1);
        const L = Math.hypot(xB - xA, zB - zA), ang = Math.atan2(xB - xA, zB - zA); const g = new THREE.BoxGeometry(0.34, 1.0 + 0.6, L + 0.05); g.rotateY(ang); g.translate((xA + xB) / 2, gy + 0.2, (zA + zB) / 2); out.put(M.boundary, g);
        const g3 = new THREE.BoxGeometry(0.44, 0.09, L + 0.08); g3.rotateY(ang); g3.translate((xA + xB) / 2, gy + 1.0, (zA + zB) / 2); out.put(M.concrete, g3);
        const a = toW(xA, zA), c = toW(xB, zB); colliders.push({ type: 'segment', a, b: c, r: 0.2, y0: base - 0.5, top: base + 1.2, kind: 'wall' }); } } }
  // blue bollards, pay-and-display machine, signs
  for (const [x, z] of [[4.2, 6.0], [5.4, 5.6], [W - 6, 6.6]]) { const y = Math.max(gAt(x, z) - base, -1); out.cyl(M.blue, x, y, y + 1.05, z, 0.07, 0.07, 8); const p = toW(x, z); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.1, y0: base - 0.5, top: base + 1.1, kind: 'bollard' }); }
  { const x = 8.2, z = 7.4, y = Math.max(gAt(x, z) - base, -1); out.box(M.grey, x - 0.22, x + 0.22, y, y + 1.55, z - 0.17, z + 0.17); out.box(M.black, x - 0.16, x + 0.16, y + 1.0, y + 1.3, z + 0.17, z + 0.19); out.box(M.blue, x - 0.22, x + 0.22, y + 1.55, y + 1.7, z - 0.17, z + 0.17); const p = toW(x, z); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.3, y0: base - 0.5, top: base + 1.7, kind: 'sign' }); }
  for (const [x, z, w, h, mat] of [[9.6, 7.2, 0.55, 0.8, M.sign], [3.4, 5.2, 0.5, 0.7, M.signWhite], [W - 4, 6.0, 0.6, 0.45, M.sign]]) { const y = Math.max(gAt(x, z) - base, -1); out.cyl(M.grey, x, y, y + 2.3, z, 0.035, 0.035, 6); out.box(mat, x - w / 2, x + w / 2, y + 2.3 - h, y + 2.3, z - 0.03, z + 0.03); const p = toW(x, z); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.1, y0: base - 0.5, top: base + 2.4, kind: 'sign' }); }
  // a big deciduous tree at the east end with autumn colour (green, yellow, orange, rust)
  { const x = W + 5.5, z = 9.0, y = Math.max(gAt(x, z) - base, -1); out.cyl(M.bark, x, y, y + 4.5, z, 0.45, 0.55, 8);
    for (let k = 0; k < 5; k++) { const a = k * 1.26, bx = x + Math.cos(a) * 1.4, bz = z + Math.sin(a) * 1.4; out.bar(M.bark, [x, y + 3.2, z], [bx, y + 5.2 + (k % 2) * 0.6, bz], 0.28); }
    const mats_ = [M.leafC, M.leafA, M.leafB, M.leafD, M.leafC, M.leafA];
    for (let k = 0; k < 16; k++) { const a = k * 2.4, r = 1.2 + (k % 5) * 0.65, h = 5.0 + (k % 4) * 1.35; out.sph(mats_[k % 6], x + Math.cos(a) * r, y + h, z + Math.sin(a) * r, 1.5 + (k % 3) * 0.35, 0.85, 7); }
    out.sph(M.leafB, x, y + 8.4, z, 2.2, 0.8, 8); colliders.push({ type: 'circle', x: toW(x, z)[0], z: toW(x, z)[1], r: 0.55, y0: base - 0.5, top: base + 8, kind: 'tree' }); }
  { const CC = [0x24282c, 0x1d4a9a, 0xb9bcc0, 0x2f4a3f, 0x8c1e1e]; const cm = CC.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.6 }));
    [[5.6, 9.4, 0], [8.2, 9.4, 1], [14.2, 9.4, 2], [20.8, 9.2, 3], [24.4, 9.2, 4]].forEach(([x, z, k]) => { const y = Math.max(gAt(x, z) - base, -1) + 0.05, zc = Math.min(z, wallZ(x) - 3);
      out.box(cm[k], x - 0.85, x + 0.85, y + 0.25, y + 0.95, zc - 2.1, zc + 2.1); out.box(cm[k], x - 0.78, x + 0.78, y + 0.95, y + 1.4, zc - 1.1, zc + 0.9); out.box(M.glass, x - 0.8, x + 0.8, y + 0.98, y + 1.36, zc - 1.0, zc + 0.8);
      for (const [dx, dz] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) out.cyl(M.black, x + dx, y, y + 0.62, zc + dz, 0.31, 0.31, 8); });
  }
  out.flush(loc2, 'flats-car-park');
  return { group, collider: { outer: rect, holes: [], base: base - FOOT, top: base + top + 0.6 }, colliders: [...colls, ...colliders] };
}
