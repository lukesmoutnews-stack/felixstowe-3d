// The cream Art Deco restaurant block immediately west of Felixstowe Town Hall (91 and 95 Undercliff Road
// West; OSM way 960050351), modelled from the user's Google Street View photographs (September 2026, six
// views, plus the 2022 view in docs/research/undercliff-road-west/95-pinsa-town-hall.png).
//
// What the photos show (and this module builds):
//  - cream/pale-butter rendered 1930s block, white UPVC sash and casement windows, a black cast downpipe at
//    each junction, a projecting white-lipped cornice, a parapet and BLUE-TINTED GLASS balustrades on every
//    roof-terrace level (stepped), stainless-steel posts and handrails;
//  - main block (no. 91): two canted bays (ground floor navy-framed bay windows under a cream apron with a
//    diamond tile motif, first floor white-framed bay windows); between them a recessed segmental-arched
//    entrance with a navy glazed door, a first-floor balcony with a glass balustrade carried on two slim navy
//    columns, hanging baskets and a small blank hanging sign;
//  - two-storey wing (no. 95) with a long ribbon of white windows behind vertical blinds on the first floor, a
//    low dark-slate hipped roof behind a deep eaves fascia, and a ground floor of navy glazing: a canted bay
//    window, a glazed double door, a narrow window, a navy door with a transom and stainless handrails;
//  - a dark slate-paved forecourt terrace along the whole front, edged by a row of blue bricks, with a
//    stainless-steel post-and-rail fence, folded black umbrellas, planters, a blue Victorian lamp-post, a blue
//    bollard with a 'P permit holders' plate and a '20 ZONE' sign.
// No business names are shown (the small hanging sign is left blank). Dimensions are estimated from the photos.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { ensureCCW } from '../geo/polygon.js';

export const isUndercliffRestaurant = (b) => b.id === 960050351;

const CREAM = 0xeadfb4, SHADE = 0xd6c997, WHITE = 0xf6f6f2, NAVY = 0x182b5a, STEEL = 0xc4c8cc;

function canvasTex(w, h, draw, rep = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  MATS = {
    cream: std({ color: CREAM, roughness: 0.92 }), shade: std({ color: SHADE, roughness: 0.92 }), white: std({ color: WHITE, roughness: 0.5 }),
    navy: std({ color: NAVY, roughness: 0.4, metalness: 0.1 }), black: std({ color: 0x1a1b1e, roughness: 0.5, metalness: 0.4 }),
    steel: std({ color: STEEL, roughness: 0.25, metalness: 0.85 }),
    glass: std({ color: 0x4d5d70, roughness: 0.06, metalness: 0.5 }),
    glassT: std({ color: 0x3b4b5e, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.5, depthWrite: false }),
    blueGlass: std({ color: 0x5fa7dc, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    slateRoof: std({ color: 0x484d54, roughness: 0.7, side: THREE.DoubleSide }),
    flat: std({ color: 0x55585c, roughness: 0.9 }),
    blindM: std({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#dde0dc'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = '#b9bdbb'; g.fillRect(x, 0, 1.5, h); } }), roughness: 0.9 }),
    slate: std({ map: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2f353b'; g.fillRect(0, 0, w, h);
      for (let y = 0, row = 0; y < h; y += 85, row++) for (let x = -((row * 53) % 128); x < w; x += 128) { const l = 38 + r() * 14; g.fillStyle = `hsl(212,10%,${l}%)`; g.fillRect(x + 2, y + 2, 124, 81); }
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    }), roughness: 0.75 }),
    blueBrick: std({ color: 0x24334f, roughness: 0.8 }),
    pave: std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#a9a291'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,250,235' : '60,55,45'},${0.04 + r() * 0.08})`; g.fillRect(r() * w, r() * h, 2 + r() * 14, 2 + r() * 10); } g.strokeStyle = 'rgba(70,65,55,.45)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    setts: std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6d6a66'; g.fillRect(0, 0, w, h); for (let y = 0, row = 0; y < h; y += 16, row++) for (let x = -(row % 2) * 8; x < w; x += 16 + ((r() * 8) | 0)) { const bw = 13 + r() * 4, l = 30 + r() * 24, hue = r() < 0.5 ? 285 : 20; g.fillStyle = `hsl(${hue},${6 + r() * 10}%,${l}%)`; g.fillRect(x + 1, y + 1, bw, 13); } }), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    pot: std({ color: 0xa95b3d, roughness: 0.9 }), leaf: std({ color: 0x4d6b3a, roughness: 0.95 }), leaf2: std({ color: 0x6f8a4c, roughness: 0.95 }),
    pink: std({ color: 0xd85a78, roughness: 0.9 }), bark: std({ color: 0x6a5a48, roughness: 0.95 }),
    umbrella: std({ color: 0x2a2b2e, roughness: 0.85 }),
    lamp: std({ color: 0x35557f, roughness: 0.55, metalness: 0.45 }),
    lampGlass: std({ color: 0xfff2c8, emissive: 0xffe6a0, emissiveIntensity: 0.25, roughness: 0.2 }),
    diamond: std({ color: 0xfbf7ea, roughness: 0.55 }),
    signWhite: std({ color: 0xf2f2f0, roughness: 0.6 }),
    permit: std({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1b4fa0'; g.fillRect(3, 3, 58, 36); g.fillStyle = '#fff'; g.font = '700 32px Arial'; g.textAlign = 'center'; g.fillText('P', 32, 33); g.fillStyle = '#1b4fa0'; g.fillRect(8, 44, 48, 3); g.fillRect(8, 51, 48, 3); }, false), roughness: 0.6 }),
    zone: std({ map: canvasTex(128, 160, (g) => { g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, 128, 160); g.strokeStyle = '#c0171d'; g.lineWidth = 7; g.strokeRect(6, 6, 116, 148); g.fillStyle = '#111'; g.font = '700 54px Arial'; g.textAlign = 'center'; g.fillText('20', 64, 70); g.font = '700 30px Arial'; g.fillText('ZONE', 64, 118); }, false), roughness: 0.6 }),
    restricted: std({ map: canvasTex(64, 96, (g) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 64, 96); g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 94); g.fillStyle = '#1b4fa0'; g.beginPath(); g.arc(32, 44, 20, 0, 7); g.fill(); g.strokeStyle = '#c0171d'; g.lineWidth = 5; g.beginPath(); g.arc(32, 44, 17, 0, 7); g.moveTo(21, 55); g.lineTo(43, 33); g.stroke(); g.fillStyle = '#111'; g.font = '700 9px Arial'; g.textAlign = 'center'; g.fillText('RESTRICTED', 32, 14); g.fillText('ZONE', 32, 24); g.fillText('At any time', 32, 82); }, false), roughness: 0.6 }),
    hangSign: std({ color: 0x1d1e21, roughness: 0.55, metalness: 0.2 }),
  };
  MATS.slate.map.repeat.set(1, 1);
  return MATS;
}

const XE_OF = (W) => W + 2.5;           // east end: the Town Hall's west wall (the OSM footprints leave a 2.5 m gap)
const smooth01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

/** The front frame: the south-facing long edge of the footprint (local x east along it, z out towards the road). */
function frameOf(b) {
  const outer = ensureCCW(b.outer); let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 10) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, score = nz * L; if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best;
  return { outer, A, B, W, Nx, Nz, Ex: (B[0] - A[0]) / W, Ez: (B[1] - A[1]) / W };
}

/**
 * Terrain plan, applied before the ground mesh is built: the forecourt strip in front of the building is levelled
 * (the OSM/LiDAR ground slopes about 0.5 m along it and rises towards the west corner), so the ground floor sits
 * on one level plinth with the slate terrace flush against it.
 */
export function undercliffPlan(b, terrain) {
  const F = frameOf(b), { A, Ex, Ez, Nx, Nz, W } = F, XE = XE_OF(W);
  const toW = (x, z) => [A[0] + Ex * x + Nx * z, A[1] + Ez * x + Nz * z];
  let sum = 0, n = 0; for (let x = 1; x <= XE - 1; x += 3) for (const z of [0.5, 2.0]) { const p = toW(x, z); sum += terrain.rawHeightAt(p[0], p[1]); n++; }
  const base = sum / n;
  const ring = [toW(-3.2, -0.3), toW(XE + 0.4, -0.3), toW(XE + 0.4, 3.4), toW(-3.2, 3.4)];
  const fn = (x, z, h) => {
    const lx = (x - A[0]) * Ex + (z - A[1]) * Ez, lz = (x - A[0]) * Nx + (z - A[1]) * Nz;
    if (lx < -3.2 || lx > XE + 0.4 || lz < -0.3 || lz > 3.4) return h;
    const w = smooth01((lx + 3.2) / 1.8) * smooth01((XE + 0.4 - lx) / 0.5) * (lz < 2.7 ? 1 : smooth01(1 - (lz - 2.7) / 0.7));
    return h + (base - h) * w;
  };
  return { ...F, base, ring, fn, XE };
}

export function buildUndercliffRestaurant(b, ctx, plan = null) {
  const m = mats(), F0 = plan || frameOf(b), outer = F0.outer;
  const { A, B, W, Nx, Nz, Ex, Ez } = F0;
  const toW = (x, z) => [A[0] + Ex * x + Nx * z, A[1] + Ez * x + Nz * z];
  const gAt = (x, z) => { const p = toW(x, z); return ctx.ground(p[0], p[1]); };
  const XE = XE_OF(W);                   // east end: the Town Hall's west wall
  const XM = 11.9, DEPTH = 13.8;         // main block / wing split, building depth
  let gMin = Infinity, gSum = 0, gn = 0; for (let x = 0; x <= XE; x += 3) for (const z of [0.5, 2.5]) { const g = gAt(x, z); gMin = Math.min(gMin, g); gSum += g; gn++; }
  const base = plan ? plan.base : gSum / gn;
  const group = new THREE.Group(); group.name = 'landmark:undercliff-restaurant';
  const local = new THREE.Group(); local.position.set(A[0], base, A[1]); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);

  // ---------- geometry accumulators (merged per material) ----------
  const acc = new Map();
  const put = (mat, g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let l = acc.get(mat); if (!l) acc.set(mat, l = []); l.push(g);
  };
  const box = (mat, x0, x1, y0, y1, z0, z1) => { if (x1 <= x0 || y1 <= y0 || z1 <= z0) return; const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); put(mat, g); };
  // a face frame: u along the face, w out from it; theta turns the face about +y
  const face = (ox, oz, th) => ({ ox, oz, th });
  const fbox = (F, mat, u0, u1, y0, y1, w0, w1) => { if (u1 <= u0 || y1 <= y0 || w1 <= w0) return; const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, w1 - w0); g.translate((u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2); g.rotateY(F.th); g.translate(F.ox, 0, F.oz); put(mat, g); };
  const prism = (mat, pts, y0, y1) => {
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); put(mat, g);
  };
  const bar = (mat, a, c, t = 0.03) => {
    const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); if (L < 1e-4) return;
    const g = new THREE.BoxGeometry(t, t, L); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); put(mat, g);
  };
  const tube = (mat, a, c, r = 0.02, seg = 6) => {
    const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), L = d.length(); if (L < 1e-4) return;
    const g = new THREE.CylinderGeometry(r, r, L, seg); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); put(mat, g);
  };
  const cyl = (mat, x, y0, y1, z, r0, r1 = r0, seg = 8) => { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); put(mat, g); };
  const sph = (mat, x, y, z, r, sy = 1, seg = 8) => { const g = new THREE.SphereGeometry(r, seg, seg - 2); g.scale(1, sy, 1); g.translate(x, y, z); put(mat, g); };

  // a window set into a face: frame bars, mullions (fractions along u), a transom (fraction of height from the top)
  const win = (F, u0, u1, y0, y1, o = {}) => {
    const fw = o.fw ?? 0.07, fm = o.frame ?? m.white, pd = o.pd ?? 0.09;
    if (o.blind) fbox(F, m.blindM, u0, u1, y0, y1, 0.012, 0.02);
    fbox(F, o.glass ?? m.glassT, u0 + fw * 0.5, u1 - fw * 0.5, y0 + fw * 0.5, y1 - fw * 0.5, 0.035, 0.05);
    fbox(F, fm, u0, u1, y0, y0 + fw, 0, pd); fbox(F, fm, u0, u1, y1 - fw, y1, 0, pd);
    fbox(F, fm, u0, u0 + fw, y0, y1, 0, pd); fbox(F, fm, u1 - fw, u1, y0, y1, 0, pd);
    for (const f of o.mul || []) { const u = u0 + (u1 - u0) * f; fbox(F, fm, u - fw / 2, u + fw / 2, y0, y1, 0, pd * 0.9); }
    if (o.tr) { const y = y1 - (y1 - y0) * o.tr; fbox(F, fm, u0, u1, y - fw / 2, y + fw / 2, 0, pd * 0.9); }
    for (const f of o.rows || []) { const y = y0 + (y1 - y0) * f; fbox(F, fm, u0, u1, y - fw / 2, y + fw / 2, 0, pd * 0.9); }
    if (o.sill) fbox(F, o.sill, u0 - 0.07, u1 + 0.07, y0 - 0.07, y0 + 0.01, 0, pd + 0.12);
  };

  // ---------- dimensions ----------
  const GF = 3.0;            // underside of the first-floor slab / balcony
  const CORN = 5.85;         // cornice
  const PAR = 6.55;          // top of the main parapet
  const EAVES = 5.9;         // wing eaves
  const UP = PAR + 0.8;      // set-back upper tier
  const D = 0.7;             // bay projection
  const FOOT = 1.3;          // foundation depth below the base

  // ---------- main block body ----------
  box(m.cream, 0, 4.3, -FOOT, PAR, -DEPTH, 0);
  box(m.cream, 7.3, XM, -FOOT, PAR, -DEPTH, 0);
  box(m.cream, 4.3, 7.3, -FOOT, PAR, -DEPTH, -1.2);
  // arched entrance: the spandrel above a segmental arch, then the solid wall above it
  { const sh = new THREE.Shape(); sh.moveTo(4.3, 2.3); sh.quadraticCurveTo(5.8, 3.2, 7.3, 2.3); sh.lineTo(7.3, 3.05); sh.lineTo(4.3, 3.05); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -1.2); put(m.cream, g); }
  box(m.cream, 4.3, 7.3, 3.05, PAR, -1.2, 0);
  box(m.slate, 4.3, 7.3, -0.3, 0.07, -1.2, 0);                        // threshold paving inside the recess
  box(m.shade, 4.3, 7.3, 2.25, 2.35, -1.2, -0.02);                    // darker soffit line under the arch
  // recessed navy double door with transom and side glass
  { const F = face(0, -1.2, 0);
    win(F, 5.0, 6.6, 0.1, 2.25, { frame: m.navy, glass: m.glass, mul: [0.5], tr: 0.2, fw: 0.07, pd: 0.07 });
    fbox(F, m.steel, 5.76, 5.8, 0.9, 1.5, 0.07, 0.09); fbox(F, m.steel, 5.82, 5.86, 0.9, 1.5, 0.07, 0.09);
    fbox(F, m.shade, 4.3, 5.0, 0.1, 2.35, 0.0, 0.01); fbox(F, m.shade, 6.6, 7.3, 0.1, 2.35, 0.0, 0.01); }
  // wall lamps either side of the arch, a blank menu case and a blank black hanging sign
  for (const x of [4.45, 7.15]) { const g = new THREE.SphereGeometry(0.07, 8, 6); g.translate(x, 2.55, 0.12); put(m.lampGlass, g); box(m.black, x - 0.04, x + 0.04, 2.5, 2.6, 0, 0.1); }
  box(m.white, 4.0, 4.3, 1.1, 1.85, 0, 0.05); box(m.black, 4.03, 4.27, 1.14, 1.81, 0.05, 0.06);
  box(m.black, 7.45, 7.5, 2.7, 3.0, 0.1, 0.12); box(m.hangSign, 7.5, 8.1, 1.85, 2.4, 0.12, 0.17);
  // balcony: slab, navy columns, glass balustrade on stainless posts
  box(m.cream, 3.7, 8.3, GF, GF + 0.22, -0.05, 1.25); box(m.white, 3.7, 8.3, GF + 0.18, GF + 0.24, 1.0, 1.28); box(m.shade, 3.7, 8.3, GF - 0.04, GF, 0.0, 1.25);
  for (const x of [3.85, 8.15]) box(m.navy, x - 0.07, x + 0.07, 0, GF, 1.08, 1.22);
  { const y0 = GF + 0.24, y1 = y0 + 1.0; const pts = [[3.78, -0.02], [3.78, 1.2], [8.22, 1.2], [8.22, -0.02]];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 1.25));
      for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n; const gx0 = a[0] + (c[0] - a[0]) * u0, gz0 = a[1] + (c[1] - a[1]) * u0, gx1 = a[0] + (c[0] - a[0]) * u1, gz1 = a[1] + (c[1] - a[1]) * u1;
        const gg = new THREE.PlaneGeometry(Math.hypot(gx1 - gx0, gz1 - gz0) - 0.1, y1 - y0 - 0.12); gg.rotateY(Math.atan2(gx1 - gx0, gz1 - gz0) - Math.PI / 2); gg.translate((gx0 + gx1) / 2, (y0 + y1) / 2 - 0.02, (gz0 + gz1) / 2); put(m.blueGlass, gg); }
      for (let k = 0; k <= n; k++) { const t = k / n; cyl(m.steel, a[0] + (c[0] - a[0]) * t, y0, y1, a[1] + (c[1] - a[1]) * t, 0.022); }
      tube(m.steel, [a[0], y1, a[1]], [c[0], y1, c[1]], 0.026); } }
  // first-floor french doors above the entrance
  { const F = face(0, 0, 0); win(F, 4.95, 7.45, 3.35, 5.35, { glass: m.glassT, blind: true, mul: [0.333, 0.667], tr: 0.22, pd: 0.1 }); }
  // two hanging baskets under the balcony
  for (const x of [4.6, 7.0]) { tube(m.black, [x, GF - 0.04, 0.35], [x, GF - 0.45, 0.35], 0.006); const g = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); g.translate(x, GF - 0.6, 0.35); put(m.black, g); sph(m.leaf, x, GF - 0.52, 0.35, 0.2, 0.7); for (let k = 0; k < 6; k++) sph(m.pink, x + Math.cos(k * 1.05) * 0.14, GF - 0.5 + (k % 2) * 0.05, 0.35 + Math.sin(k * 1.05) * 0.14, 0.05); }

  // ---------- the two canted bays ----------
  const bayAt = (xl, xr) => {
    const f = xr - xl - 2 * D, pts = [[xl, -0.2], [xl, 0], [xl + D, D], [xr - D, D], [xr, 0], [xr, -0.2]];
    prism(m.cream, pts, -FOOT, CORN);                                              // bay body: ground floor + first floor
    prism(m.cream, pts, CORN, PAR);                                                // parapet continues the bay
    const cp = [[xl - 0.2, -0.2], [xl - 0.2, 0], [xl + D - 0.2, D + 0.25], [xr - D + 0.2, D + 0.25], [xr + 0.2, 0], [xr + 0.2, -0.2]];
    prism(m.cream, cp, CORN - 0.03, CORN + 0.35); prism(m.white, cp.map(([x, z]) => [x, z + (z > 0.1 ? 0.04 : 0)]), CORN + 0.35, CORN + 0.42);
    prism(m.black, [[xl, -0.2], [xl, 0], [xl + D, D], [xr - D, D], [xr, 0], [xr, -0.2]].map(([x, z], i) => [x, z]), PAR, PAR + 0.06);
    prism(m.shade, cp.map(([x, z]) => [x, z]), CORN - 0.12, CORN - 0.02);
    // ground-floor navy windows (three faces) with a navy sill; first-floor white windows (large centre light, narrow sides)
    const FL = face(xl, 0, -Math.PI / 4), FC = face(xl + D, D, 0), FR = face(xr - D, D, Math.PI / 4), sideL = D * Math.SQRT2;
    for (const [F, len, mid] of [[FC, f, [0.5]], [FL, sideL, []], [FR, sideL, []]]) {
      win(F, 0.1, len - 0.1, 0.85, 2.65, { frame: m.navy, glass: m.glass, mul: mid, tr: 0.2, fw: 0.09, pd: 0.1, sill: m.navy });
    }
    win(FC, 0.12, f - 0.12, 3.85, 5.3, { glass: m.glassT, blind: true, fw: 0.08, pd: 0.1, sill: m.white });
    for (const F of [FL, FR]) win(F, 0.14, sideL - 0.14, 3.85, 5.3, { glass: m.glassT, blind: true, tr: 0.32, fw: 0.07, pd: 0.1, sill: m.white });
    // apron below the upper window: four small diamond tiles
    for (const [du, dy] of [[0, 0.2], [0, -0.2], [-0.2, 0], [0.2, 0]]) { const g = new THREE.PlaneGeometry(0.27, 0.27); g.rotateZ(Math.PI / 4); g.translate(f / 2 + du, 3.25 + dy, 0.012); g.rotateY(0); g.translate(xl + D, 0, D); put(m.diamond, g); }
    // folded black umbrella standing in front of the ground bay
    const ux = xl + D + f * 0.45;
    const lg = new THREE.LatheGeometry([[0.0, 0], [0.05, 0.1], [0.075, 0.4], [0.14, 1.0], [0.19, 1.45], [0.17, 1.8], [0.08, 2.1], [0.0, 2.2]].map(([r, h]) => new THREE.Vector2(r, h)), 10); lg.translate(ux, 0.12, D + 0.28); put(m.umbrella, lg);
    cyl(m.black, ux, 0, 0.14, D + 0.28, 0.09, 0.09);
  };
  bayAt(0.3, 3.7); bayAt(8.3, 11.6);

  // ---------- main block cornice and parapet between the bays ----------
  for (const [x0, x1] of [[0, 0.3], [3.7, 8.3], [11.6, XM]]) {
    box(m.shade, x0, x1, CORN - 0.12, CORN - 0.02, 0, 0.3); box(m.cream, x0, x1, CORN - 0.03, CORN + 0.35, 0, 0.3); box(m.white, x0, x1, CORN + 0.35, CORN + 0.42, 0, 0.34);
    box(m.black, x0, x1, PAR, PAR + 0.06, -0.3, 0.02);
  }
  // main-block roof deck, a stepped set-back upper tier, and the glass rails at each level
  box(m.flat, 0.1, XM - 0.05, PAR - 0.02, PAR, -DEPTH + 0.1, -0.2);
  box(m.cream, 3.2, XM - 0.1, PAR, UP, -9.0, -3.4); box(m.white, 3.15, XM - 0.05, UP, UP + 0.07, -9.05, -3.35);
  box(m.cream, 8.2, 10.6, UP, UP + 1.0, -8.4, -6.2); box(m.white, 8.15, 10.65, UP + 1.0, UP + 1.07, -8.45, -6.15);   // lift/stair head
  const railRun = (pts, y, h = 1.0, closed = false) => {
    const n = pts.length, last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i], c = pts[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.round(L / 1.4));
      const gg = new THREE.PlaneGeometry(L - 0.04, h - 0.12); gg.rotateY(Math.atan2(c[0] - a[0], c[1] - a[1]) - Math.PI / 2); gg.translate((a[0] + c[0]) / 2, y + h / 2 - 0.02, (a[1] + c[1]) / 2); put(m.blueGlass, gg);
      for (let j = 0; j < k; j++) { const t = j / k; cyl(m.steel, a[0] + (c[0] - a[0]) * t, y, y + h, a[1] + (c[1] - a[1]) * t, 0.022, 0.022, 6); }
      tube(m.steel, [a[0], y + h, a[1]], [c[0], y + h, c[1]], 0.026); tube(m.steel, [a[0], y + 0.12, a[1]], [c[0], y + 0.12, c[1]], 0.014);
    }
    if (!closed) { const e = pts[n - 1]; cyl(m.steel, e[0], y, y + h, e[1], 0.022, 0.022, 6); }
  };
  { railRun([[0.15, -DEPTH + 0.3], [0.15, -0.12], [0.4, -0.05], [0.3 + D - 0.02, D - 0.12], [3.7 - D + 0.02, D - 0.12], [3.6, -0.05], [3.8, -0.12], [8.2, -0.12], [8.4, -0.05], [8.3 + D - 0.02, D - 0.12], [11.6 - D + 0.02, D - 0.12], [11.5, -0.05], [11.7, -0.12], [XM - 0.1, -0.12], [XM - 0.1, -DEPTH + 0.3]], PAR + 0.06, 1.0, true);
    railRun([[3.3, -9.0 + 0.1], [3.3, -3.5], [XM - 0.2, -3.5], [XM - 0.2, -9.0 + 0.1], [3.3, -9.0 + 0.1]], UP + 0.07, 1.0, true);
    railRun([[8.3, -8.3], [10.5, -8.3], [10.5, -6.3], [8.3, -6.3], [8.3, -8.3]], UP + 1.07, 0.9, true); }
  // downpipes
  for (const x of [0.12, 11.95]) box(m.black, x - 0.05, x + 0.05, -0.1, CORN + 0.1, 0.04, 0.14);
  // west flank: windows, as seen in the photographs
  { const FW = face(0, -DEPTH, -Math.PI / 2);                       // u runs towards the front
    for (const u of [1.4, 4.6, 7.8, 11.0]) { win(FW, u, u + 1.1, 3.85, 5.3, { glass: m.glassT, blind: true, tr: 0.3, pd: 0.1, sill: m.white }); win(FW, u, u + 1.1, 1.0, 2.5, { glass: m.glass, pd: 0.1, tr: 0.28, sill: m.white }); }
    fbox(FW, m.black, DEPTH - 0.4, DEPTH - 0.3, -0.1, CORN + 0.1, 0.03, 0.12); fbox(FW, m.shade, 0.0, DEPTH, CORN - 0.12, CORN - 0.02, 0, 0.3); fbox(FW, m.cream, 0.0, DEPTH, CORN - 0.03, CORN + 0.35, 0, 0.3); fbox(FW, m.white, 0.0, DEPTH, CORN + 0.35, CORN + 0.42, 0, 0.34); }

  // ---------- the wing (no. 95) ----------
  box(m.cream, XM, XE, -FOOT, EAVES + 0.05, -DEPTH, 0);
  box(m.shade, XM, XE, 3.0 - 0.03, 3.0, 0, 0.22); box(m.cream, XM, XE, 3.0, 3.3, 0, 0.22); box(m.white, XM, XE, 3.3, 3.37, 0, 0.26);   // string course between floors
  box(m.shade, XM, XE, EAVES - 0.5, EAVES - 0.4, 0, 0.4); box(m.cream, XM, XE, EAVES - 0.4, EAVES + 0.1, 0, 0.4); box(m.white, XM, XE, EAVES + 0.1, EAVES + 0.18, 0, 0.44);
  box(m.black, XM, XE, EAVES + 0.18, EAVES + 0.27, 0.3, 0.42);                                       // gutter
  // hipped slate roof behind the eaves (low pitch)
  { const x0 = XM, x1 = XE, zF = 0.42, zB = -9.0, ry = EAVES + 0.2, hh = 1.55, ins = (zF - zB) / 2, zr = (zF + zB) / 2;
    const v = [x0, ry, zF, x1, ry, zF, x1, ry, zB, x0, ry, zB, x0 + ins, ry + hh, zr, x1 - ins, ry + hh, zr];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex([0, 1, 5, 0, 5, 4, 3, 4, 5, 3, 5, 2, 0, 4, 3, 1, 2, 5]); g.computeVertexNormals(); put(m.slateRoof, g); }
  box(m.flat, XM, XE, EAVES + 0.04, EAVES + 0.2, -DEPTH, -9.0);
  // first-floor ribbon window under the eaves: 6 lights, vertical blinds behind, hopper lights above
  { const F = face(0, 0, 0); win(F, 12.5, 22.9, 3.75, 5.3, { glass: m.glassT, blind: true, mul: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], tr: 0.22, fw: 0.075, pd: 0.1, sill: m.white }); }
  // ground floor of the wing: navy bay window, glazed double door, narrow window, navy door, louvred panel
  { const xl = 12.2, xr = 15.8, f = xr - xl - 2 * 0.5, pts = [[xl, -0.2], [xl, 0], [xl + 0.5, 0.5], [xr - 0.5, 0.5], [xr, 0], [xr, -0.2]];
    prism(m.cream, pts, -FOOT, 0.55); prism(m.cream, pts.map(([x, z]) => [x, z]), 2.85, 3.05); prism(m.white, pts.map(([x, z]) => [x, z + (z > 0.1 ? 0.03 : 0)]), 3.05, 3.1);
    const FL = face(xl, 0, -Math.PI / 4), FC = face(xl + 0.5, 0.5, 0), FR = face(xr - 0.5, 0.5, Math.PI / 4), side = 0.5 * Math.SQRT2;
    win(FC, 0.08, f - 0.08, 0.55, 2.85, { frame: m.navy, glass: m.glass, mul: [0.5], tr: 0.22, fw: 0.1, pd: 0.1, sill: m.navy });
    for (const F of [FL, FR]) win(F, 0.06, side - 0.06, 0.55, 2.85, { frame: m.navy, glass: m.glass, tr: 0.22, fw: 0.09, pd: 0.1 });
    const ux = xl + 0.5 + f * 0.52;
    const lg = new THREE.LatheGeometry([[0.0, 0], [0.05, 0.1], [0.075, 0.4], [0.14, 1.0], [0.19, 1.45], [0.17, 1.8], [0.08, 2.1], [0.0, 2.2]].map(([r, h]) => new THREE.Vector2(r, h)), 10); lg.translate(ux, 0.12, 0.78); put(m.umbrella, lg); cyl(m.black, ux, 0, 0.14, 0.78, 0.09); }
  { const F = face(0, 0, 0);
    box(m.navy, 16.05, 16.12, 0.0, 3.0, 0, 0.14); box(m.navy, 18.3, 18.37, 0.0, 3.0, 0, 0.14);                             // navy reveal posts
    win(F, 16.1, 18.3, 0.12, 2.9, { frame: m.navy, glass: m.glass, mul: [0.62], tr: 0.18, rows: [0.24], fw: 0.08, pd: 0.1 });
    for (const x of [16.55, 17.15]) { sph(m.black, x, 2.5, 0.3, 0.1, 0.8); }
    win(F, 18.6, 19.5, 0.9, 2.6, { frame: m.navy, glass: m.glassT, blind: true, fw: 0.07, pd: 0.09 });
    // navy door with a glazed leaf and a long transom light
    win(F, 19.9, 21.6, 0.12, 2.35, { frame: m.navy, glass: m.glass, mul: [0.5], fw: 0.09, pd: 0.1 }); box(m.navy, 20.78, 21.6, 0.14, 2.3, 0.095, 0.12);
    win(F, 19.9, 21.6, 2.4, 2.88, { frame: m.navy, glass: m.glassT, fw: 0.06, pd: 0.09 });
    fbox(F, m.steel, 20.6, 20.64, 1.0, 1.4, 0.12, 0.15);
    win(F, 21.85, 22.7, 0.7, 2.88, { frame: m.navy, glass: m.navy, fw: 0.06, pd: 0.08 });
    // stainless handrails up to the doors
    for (const [x0, x1] of [[16.2, 18.2], [19.95, 21.55]]) for (const x of [x0, x1]) { bar(m.steel, [x, 0.95, 2.2], [x, 0.95, 0.45], 0.03); cyl(m.steel, x, 0, 0.95, 2.2, 0.022); cyl(m.steel, x, 0, 0.95, 0.45, 0.022); }
    // hanging baskets by the double door
    for (const x of [16.6, 17.5]) { tube(m.black, [x, 3.0, 0.3], [x, 2.7, 0.3], 0.006); const g = new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); g.translate(x, 2.55, 0.3); put(m.black, g); sph(m.leaf, x, 2.62, 0.3, 0.17, 0.7); }
    box(m.black, 23.4, 23.5, -0.1, EAVES + 0.1, 0.04, 0.14);
  }

  // ---------- forecourt: dark slate flags, blue-brick edge, stainless railing ----------
  const TD = 3.0, tx1 = XE;
  { const nx = Math.ceil((tx1 + 0.5) / 1.0), nz = Math.ceil(TD / 1.0); const P = [], UV = [], I = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -0.5 + (i / nx) * (tx1 + 0.5), z = (j / nz) * TD; const y = Math.max(base + 0.05, gAt(x, z) + 0.04) - base; P.push(x, y, z); UV.push(x / 1.5, z / 1.5); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; I.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); put(m.slate, g);
    // blue-brick edge row, following the ground
    const n = Math.ceil((tx1 + 0.5) / 0.9);
    for (let k = 0; k < n; k++) { const x0 = -0.5 + k * (tx1 + 0.5) / n, x1 = -0.5 + (k + 1) * (tx1 + 0.5) / n, y = Math.max(base + 0.05, gAt((x0 + x1) / 2, TD) + 0.04) - base; box(m.blueBrick, x0, x1 - 0.02, y - 0.3, y + 0.04, TD, TD + 0.12); }
    // foundation skirt under the front wall to hide the ground slope
    box(m.cream, -0.0, XE, -FOOT, 0.02, -0.02, 0.05);
  }
  // ---------- pavement strip between the forecourt and the kerb, and the granite-sett parking strip beside it ----------
  const roadAt = (x, z) => { const p = toW(x, z); return ctx.nearestRoad(p[0], p[1], 14, (q) => q.car); };
  const scanZ = (x, off) => { for (let z = 3.2; z < 16; z += 0.15) { const r = roadAt(x, z); if (r && r.d <= r.road.width / 2 + off) return z; } return null; };
  const strip = (mat, xa, xb, z0f, z1f, lift, step = 1.0, uvs = 1.6) => {
    const n = Math.max(1, Math.ceil((xb - xa) / step)); const P = [], UV = [], I = [];
    for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n, za = z0f(x), zb = z1f(x); for (const z of [za, zb]) { P.push(x, Math.max(gAt(x, z), base - 0.6) + lift - base, z); UV.push(x / uvs, z / uvs); } }
    for (let i = 0; i < n; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); put(mat, g);
  };
  { const ze = (x) => (scanZ(x, 2.2) ?? 8.5) + 0.1; strip(m.pave, -0.5, XE, () => TD + 0.1, ze, 0.035);
    const zk = (x) => scanZ(x, 0.02) ?? 11; strip(m.setts, 1.0, XE + 7, zk, (x) => zk(x) + 2.4, 0.045, 1.0, 1.6); }
  // ---------- the west flank: a visible ground line (plinth, flagged footpath, black railing) ----------
  box(m.shade, -0.05, 0.0, -FOOT, 0.55, -DEPTH, 0.0);
  for (const [x0, x1] of [[0, 4.3], [7.3, 11.9], [XM, XE]]) box(m.shade, x0, x1, 0.0, 0.14, 0.0, 0.05);   // skirting line along the front
  { const n = Math.ceil((DEPTH - 1.0 + 2.4) / 1.0); const P = [], UV = [], I = [];
    for (let i = 0; i <= n; i++) { const z = 2.4 - (2.4 + DEPTH - 1.0) * i / n; for (const x of [-1.05, -0.02]) { P.push(x, Math.max(base + 0.05, gAt(x, z) + 0.05) - base, z); UV.push(x / 1.6, z / 1.6); } }
    for (let i = 0; i < n; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); put(m.slate, g); }
  const colliders = [];
  const rail = (x0, x1, z = 2.55, h = 0.95) => {
    const n = Math.max(1, Math.round((x1 - x0) / 1.7));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; cyl(m.steel, x, 0.05, h, z, 0.024, 0.024, 6); }
    tube(m.steel, [x0, h, z], [x1, h, z], 0.026); tube(m.steel, [x0, h * 0.5, z], [x1, h * 0.5, z], 0.018); tube(m.steel, [x0, h * 0.78, z], [x1, h * 0.78, z], 0.012);
    const a = toW(x0, z), c = toW(x1, z); colliders.push({ type: 'segment', a, b: c, r: 0.1, y0: base - 0.3, top: base + 1.0, kind: 'railing' });
  };
  rail(-0.5, 3.6); rail(8.1, 15.9); rail(16.3, 17.9); rail(19.0, 22.9); 
  { const x = XE - 0.15; tube(m.steel, [x, 0.95, 0.15], [x, 0.95, 2.55], 0.026); tube(m.steel, [x, 0.5, 0.15], [x, 0.5, 2.55], 0.018); cyl(m.steel, x, 0.05, 0.95, 0.15, 0.024); }
  // black railings beyond the west end, and a low black bow-top fence round the little garden there
  for (let k = 0; k <= 4; k++) cyl(m.black, -0.6 - k * 1.1, 0, 1.0, 2.4, 0.025, 0.025, 6);
  tube(m.black, [-0.6, 1.0, 2.4], [-5.0, 1.0, 2.4], 0.022); tube(m.black, [-0.6, 0.45, 2.4], [-5.0, 0.45, 2.4], 0.015);
  { const a = toW(-0.6, 2.4), c = toW(-5.0, 2.4); colliders.push({ type: 'segment', a, b: c, r: 0.1, y0: base - 0.3, top: base + 1.1, kind: 'railing' }); }
  { const zA = 2.4, zB = -DEPTH + 2.0, nW = Math.round((zA - zB) / 1.15), x = -1.1; const pts = [];
    for (let k = 0; k <= nW; k++) { const z = zA + (zB - zA) * k / nW; const y = Math.max(base + 0.05, gAt(x, z) + 0.05) - base; pts.push([z, y]); cyl(m.black, x, y, y + 0.95, z, 0.022, 0.022, 6); }
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], c = pts[k]; tube(m.black, [x, a[1] + 0.95, a[0]], [x, c[1] + 0.95, c[0]], 0.018); tube(m.black, [x, a[1] + 0.4, a[0]], [x, c[1] + 0.4, c[0]], 0.014);
      for (let t = 0.25; t < 1; t += 0.25) cyl(m.black, x, a[1] + (c[1] - a[1]) * t, a[1] + (c[1] - a[1]) * t + 0.9, a[0] + (c[0] - a[0]) * t, 0.008, 0.008, 4); }
    const a = toW(x, zA), c = toW(x, zB); colliders.push({ type: 'segment', a, b: c, r: 0.1, y0: base - 0.3, top: base + 1.1, kind: 'railing' });
    for (let k = 0; k < 6; k++) { const z = zA - 0.5 - k * 1.8, y = Math.max(base + 0.05, gAt(-1.5, z)) - base; sph(k % 2 ? m.leaf : m.leaf2, -1.55, y + 0.35, z, 0.42 + (k % 3) * 0.08, 0.8); } }
  // planters, olive trees, pots
  const pot = (x, z, h = 0.45, r = 0.2, plant = 'bush') => {
    cyl(m.pot, x, 0.06, 0.06 + h, z, r, r * 0.75, 8);
    if (plant === 'olive') { cyl(m.bark, x, 0.4, 1.5, z, 0.03, 0.05, 5); sph(m.leaf2, x, 1.65, z, 0.42, 0.9); sph(m.leaf2, x + 0.18, 1.4, z + 0.1, 0.25); sph(m.leaf, x - 0.2, 1.8, z - 0.05, 0.25); }
    else { sph(m.leaf, x, 0.06 + h + 0.12, z, r * 1.1, 0.8); if (plant === 'flower') for (let k = 0; k < 4; k++) sph(m.pink, x + Math.cos(k * 1.6) * r * 0.7, 0.06 + h + 0.3, z + Math.sin(k * 1.6) * r * 0.7, 0.06); }
  };
  pot(3.35, 0.9, 0.5, 0.26, 'olive'); pot(8.55, 0.8, 0.5, 0.26, 'olive'); pot(14.4, 0.6, 0.25, 0.15, 'bush'); pot(15.0, 0.6, 0.25, 0.15, 'flower'); pot(18.3, 0.6, 0.3, 0.16, 'bush'); pot(22.3, 1.2, 0.5, 0.3, 'flower');
  box(m.black, 11.65, 11.95, 0.0, 1.35, 0.5, 0.6);           // dark timber screen panel by the bay window
  // ---------- street furniture: blue Victorian lamp-post, permit bollard, 20 ZONE sign ----------
  { const x = 6.2, z = TD + 0.45;
    cyl(m.lamp, x, 0, 0.35, z, 0.2, 0.17, 10); cyl(m.lamp, x, 0.35, 1.0, z, 0.13, 0.17, 10); cyl(m.lamp, x, 1.0, 1.12, z, 0.16, 0.16, 10); cyl(m.lamp, x, 1.12, 6.0, z, 0.075, 0.085, 10);
    cyl(m.lamp, x, 5.75, 5.9, z, 0.11, 0.11, 8);
    const crv = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 5.9, z), new THREE.Vector3(x - 0.25, 6.35, z), new THREE.Vector3(x - 0.7, 6.4, z), new THREE.Vector3(x - 0.95, 6.05, z)]);
    put(m.lamp, new THREE.TubeGeometry(crv, 14, 0.03, 5));
    cyl(m.lamp, x - 0.95, 5.55, 5.75, z, 0.12, 0.16, 8); cyl(m.lampGlass, x - 0.95, 5.2, 5.55, z, 0.13, 0.12, 8); cyl(m.lamp, x - 0.95, 5.1, 5.2, z, 0.05, 0.12, 8);
    const sg = new THREE.PlaneGeometry(0.4, 0.6); sg.rotateY(-0.0); sg.translate(x + 0.02, 3.2, z - 0.1); put(m.restricted, sg);
    colliders.push({ type: 'circle', x: toW(x, z)[0], z: toW(x, z)[1], r: 0.22, y0: base - 0.3, top: base + 6, kind: 'lamp' }); }
  { const x = 14.8, z = TD + 0.4; cyl(m.lamp, x, 0, 1.15, z, 0.1, 0.11, 8); sph(m.lamp, x, 1.17, z, 0.1, 0.7); box(m.black, x - 0.01, x + 0.01, 1.0, 1.05, z, z + 0.005);
    const pg = new THREE.PlaneGeometry(0.32, 0.32); pg.translate(x, 0.9, z + 0.115); put(m.permit, pg);
    colliders.push({ type: 'circle', x: toW(x, z)[0], z: toW(x, z)[1], r: 0.14, y0: base - 0.3, top: base + 1.2, kind: 'bollard' }); }
  { const x = -1.4, z = 5.8;
    tube(m.steel, [x - 0.4, 0, z], [x - 0.4, 1.7, z], 0.03); tube(m.steel, [x + 0.4, 0, z], [x + 0.4, 1.7, z], 0.03);
    const arch = new THREE.TorusGeometry(0.4, 0.03, 6, 12, Math.PI); arch.translate(x, 1.7, z); put(m.steel, arch);
    const zg = new THREE.PlaneGeometry(0.7, 0.88); zg.translate(x, 1.05, z + 0.03); put(m.zone, zg); box(m.signWhite, x - 0.35, x + 0.35, 0.61, 1.49, z - 0.02, z + 0.02);
    colliders.push({ type: 'circle', x: toW(x, z)[0], z: toW(x, z)[1], r: 0.45, y0: base - 0.3, top: base + 2, kind: 'sign' }); }

  // ---------- merge into one mesh per material ----------
  for (const [mat, list] of acc) {
    const g = mergeGeometries(list, false); if (!g) continue;
    const me = new THREE.Mesh(g, mat); me.castShadow = !mat.transparent; me.receiveShadow = true; me.name = 'undercliff-restaurant'; local.add(me);
    if (mat.transparent) me.renderOrder = 2;
  }
  const rect = [toW(0, 0.05), toW(XE, 0.05), toW(XE, -DEPTH), toW(0, -DEPTH)];
  return { group, colliders, collider: { outer: rect, holes: [], base: gMin - 0.4, top: base + 9 }, front: { x: toW(6, 3)[0], z: toW(6, 3)[1], door: toW(6, 2.2), base } };
}
