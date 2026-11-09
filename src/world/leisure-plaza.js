// The plaza in front of Felixstowe Leisure Centre (Street View photos supplied by the user, 2018-2019): a pinkish-brown block-paved
// forecourt with a raised octagonal platform of two brick steps (benches round it), black litter bins with gold lids, navy triple-globe
// lamp posts, a group of navy cycle hoops with bikes in front of the porch, and a yellow hatched box by the doors. The platform is real
// ground: plazaPlan() adds a terrain modifier so the player walks up its steps.
// Positions are in the frame of the entrance edge (u along the front, w out from it). Estimates, no imagery reproduced.

import * as THREE from 'three';
import { makeKit } from './geo-kit.js';
import { ensureCCW } from '../geo/polygon.js';

export function leisureFront(outer) {
  const P = ensureCCW(outer), n = P.length; let best = null;
  for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 12) continue;
    const ex = (c[0] - a[0]) / L, ez = (c[1] - a[1]) / L, nx = -ez, nz = ex, mx = (a[0] + c[0]) / 2;
    if (nx * 0.41 + nz * 0.91 > 0.95 && (!best || mx > best.mx)) best = { a, c, L, ex, ez, nx, nz, mx }; }
  return best;
}

const PL = { u: 20.5, w: 12.5, A0: 7.0, A1: 5.7, h0: 0.2, h1: 0.42 };   // platform centre in the front frame, apothems of the two steps, heights

/** Terrain modifier for the raised platform: { ring, fn, g, cx, cz }. `terrain` needs rawHeightAt. */
export function plazaPlan(b, terrain) {
  const f = leisureFront(b.outer); if (!f) return null;
  const cx = f.a[0] + f.ex * PL.u + f.nx * PL.w, cz = f.a[1] + f.ez * PL.u + f.nz * PL.w, g = terrain.rawHeightAt(cx, cz);
  const ring = octagon(f, cx, cz, PL.A0 + 0.6, 0);
  const fn = (x, z, h) => { const d = octDist(f, cx, cz, x, z); return d <= PL.A1 ? g + PL.h1 : d <= PL.A0 ? g + PL.h0 : h; };
  return { ring, fn, g, cx, cz, front: f };
}

function octDist(f, cx, cz, x, z) { const dx = x - cx, dz = z - cz; let m = 0; for (let k = 0; k < 4; k++) { const an = k * Math.PI / 4, ax = f.ex * Math.cos(an) + f.nx * Math.sin(an), az = f.ez * Math.cos(an) + f.nz * Math.sin(an); m = Math.max(m, Math.abs(dx * ax + dz * az)); } return m; }
/** Regular octagon with flats facing the front's axes: apothem A. */
function octagon(f, cx, cz, A, rot = 0) { const R = A / Math.cos(Math.PI / 8), out = []; for (let k = 0; k < 8; k++) { const an = (k + 0.5) * Math.PI / 4 + rot, ax = f.ex * Math.cos(an) + f.nx * Math.sin(an), az = f.ez * Math.cos(an) + f.nz * Math.sin(an); out.push([cx + ax * R, cz + az * R]); } return out; }

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  const cv = (w, h, draw, rep = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // herringbone block paving in pinkish brown with a few darker and greyer blocks
  const paving = cv(256, 256, (g, w, h) => { g.fillStyle = '#7e6a60'; g.fillRect(0, 0, w, h); const bw = 32, bh = 16;
    for (let y = 0; y < h; y += bh) for (let x = 0; x < w; x += bw) { const k = ((x / bw) + (y / bh)) % 2; const l = 50 + (r() - 0.5) * 12; g.fillStyle = `hsl(${12 + r() * 10},${22 + r() * 12}%,${l}%)`; if (k) g.fillRect(x + 1, y + 1, bw - 2, bh - 2); else g.fillRect(x + 1, y + 1, bh - 2, bw - 2); } });
  const stepBrick = cv(256, 128, (g, w, h) => { g.fillStyle = '#4a3a34'; g.fillRect(0, 0, w, h); const ch = h / 6, bw = w / 6;
    for (let row = 0; row < 6; row++) for (let k = -1; k < 7; k++) { const x = k * bw + (row % 2) * bw / 2; g.fillStyle = `hsl(${8 + r() * 8},${38 + r() * 12}%,${26 + r() * 10}%)`; g.fillRect(x + 1.5, row * ch + 1.5, bw - 3, ch - 3); } });
  const hatch = cv(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#e8c92e'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.lineWidth = 7; for (let k = -h; k < w + h; k += 34) { g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } }, false);
  M = {
    paving: std({ map: paving, side: THREE.DoubleSide }), stepBrick: std({ map: stepBrick, side: THREE.DoubleSide }), top: std({ map: paving, color: 0xe6d6cc, side: THREE.DoubleSide }), coping: std({ color: 0x8b8178, roughness: 0.85 }),
    hatch: new THREE.MeshStandardMaterial({ map: hatch, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false }),
    pave: new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    bin: std({ color: 0x1c1d1f, roughness: 0.6 }), binLid: std({ color: 0xb8964a, roughness: 0.45, metalness: 0.5 }), navy: std({ color: 0x1f2d4d, roughness: 0.5, metalness: 0.3 }),
    iron: std({ color: 0x202226, roughness: 0.6, metalness: 0.4 }), wood: std({ color: 0x8a6a46, roughness: 0.85 }),
    globe: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.3, emissive: 0x555550, emissiveIntensity: 0.4 }),
    tyre: std({ color: 0x151515 }), bikeA: std({ color: 0x6b3a8a, metalness: 0.4, roughness: 0.4 }), bikeB: std({ color: 0xcfd3d8, metalness: 0.5, roughness: 0.4 }), bikeC: std({ color: 0x2c6e9e, metalness: 0.4, roughness: 0.4 }),
  };
  return M;
}

export function buildLeisurePlaza(b, ctx, front, plan) {
  const f = front || (plan && plan.front) || leisureFront(b.outer); if (!f) return null;
  const m = mats(), K = makeKit(), group = new THREE.Group(); group.name = 'landmark:leisure-plaza'; const colliders = [];
  const gnd = ctx.ground, W = (u, w) => [f.a[0] + f.ex * u + f.nx * w, f.a[1] + f.ez * u + f.nz * w], F = K.face(f.a[0], f.a[1], Math.atan2(-f.ez, f.ex));
  const cx = plan ? plan.cx : W(PL.u, PL.w)[0], cz = plan ? plan.cz : W(PL.u, PL.w)[1], g = plan ? plan.g : gnd(cx, cz);
  const tri = (mat, p, q, r2, uv) => { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r2], 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.computeVertexNormals(); K.put(mat, ge); };
  const quad = (mat, p, q, r2, s2, uv) => { tri(mat, p, q, r2, [...uv[0], ...uv[1], ...uv[2]]); tri(mat, p, r2, s2, [...uv[0], ...uv[2], ...uv[3]]); };

  // ---- block paving laid over the forecourt in front of the entrance (follows the ground)
  { const u0 = -6, u1 = 31, w0 = 0.5, w1 = 22, nu = Math.ceil((u1 - u0) / 1), nw = Math.ceil((w1 - w0) / 1), Pp = [], UV = [], I = [];
    for (let j = 0; j <= nw; j++) for (let i = 0; i <= nu; i++) { const u = u0 + (u1 - u0) * i / nu, w = w0 + (w1 - w0) * j / nw, p = W(u, w); Pp.push(p[0], gnd(p[0], p[1]) + 0.07, p[1]); UV.push(p[0] / 1.6, p[1] / 1.6); }
    for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, qc = W(u0 + (u1 - u0) * (i + 0.5) / nu, w0 + (w1 - w0) * (j + 0.5) / nw); if (octDist(f, cx, cz, qc[0], qc[1]) < PL.A0 + 0.5) continue; I.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); ge.setIndex(I); ge.computeVertexNormals(); K.put(m.pave, ge); }
  // ---- yellow hatched box by the doors
  { const u0 = 6.0, u1 = 9.4, w0 = 3.2, w1 = 7.0, pts = [W(u0, w0), W(u1, w0), W(u1, w1), W(u0, w1)].map(([x, z]) => [x, gnd(x, z) + 0.04, z]);
    quad(m.hatch, pts[0], pts[1], pts[2], pts[3], [[0, 0], [1, 0], [1, 1], [0, 1]]); }

  // ---- the raised octagonal platform: two brick steps and a paved top, benches on the top
  { const oct = (A) => octagon(f, cx, cz, A), yBot = g - 0.5;
    const ring = (A, y0, y1, mat) => { const o = oct(A); for (let k = 0; k < 8; k++) { const p = o[k], q = o[(k + 1) % 8], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      quad(mat, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [[0, 0], [L / 1.6, 0], [L / 1.6, (y1 - y0) / 0.8], [0, (y1 - y0) / 0.8]]); } };
    const cap = (A, y, mat, uvs = 2) => { const o = oct(A); for (let k = 0; k < 8; k++) { const p = o[k], q = o[(k + 1) % 8]; tri(mat, [cx, y, cz], [p[0], y, p[1]], [q[0], y, q[1]], [cx / uvs, cz / uvs, p[0] / uvs, p[1] / uvs, q[0] / uvs, q[1] / uvs]); } };
    ring(PL.A0, yBot, g + PL.h0, m.stepBrick); cap(PL.A0 + 0.0, g + PL.h0 + 0.001, m.paving, 1.6);
    ring(PL.A1, g + PL.h0, g + PL.h1, m.stepBrick); cap(PL.A1, g + PL.h1 + 0.001, m.top, 1.6);
    // coping bands on each step edge
    for (const [A, y] of [[PL.A0, g + PL.h0], [PL.A1, g + PL.h1]]) { const o = oct(A + 0.07); for (let k = 0; k < 8; k++) { const p = o[k], q = o[(k + 1) % 8]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]), an = Math.atan2(q[0] - p[0], q[1] - p[1]);
      const ge = new THREE.BoxGeometry(0.16, 0.05, L + 0.05); ge.rotateY(an); ge.translate((p[0] + q[0]) / 2, y + 0.01, (p[1] + q[1]) / 2); K.put(m.coping, ge); } }
    // benches: four on the top, backs to the lamp, facing outwards
    for (let k = 0; k < 4; k++) { const an = (k * 2 + 1) * Math.PI / 4 + Math.PI / 4 * 0, ax = f.ex * Math.cos(an) + f.nx * Math.sin(an), az = f.ez * Math.cos(an) + f.nz * Math.sin(an), r = PL.A1 - 0.9;
      const px = cx + ax * r, pz = cz + az * r, th = Math.atan2(ax, az), Fb = K.face(px, pz, th), y0 = g + PL.h1;
      K.fbox(Fb, m.wood, -0.9, 0.9, y0 + 0.42, y0 + 0.47, -0.22, 0.22); K.fbox(Fb, m.wood, -0.9, 0.9, y0 + 0.62, y0 + 0.9, -0.22, -0.18);
      for (const u of [-0.8, 0.8]) K.fbox(Fb, m.iron, u - 0.04, u + 0.04, y0, y0 + 0.9, -0.22, 0.22); }
  }

  // ---- litter bins (black with gold lids) round the platform and by the porch
  const bin = (x, z) => { const y = gnd(x, z); K.cyl(m.bin, x, y, y + 0.95, z, 0.29, 0.29, 10); K.cyl(m.binLid, x, y + 0.95, y + 1.05, z, 0.32, 0.3, 10); colliders.push({ type: 'circle', x, z, r: 0.33, y0: y, top: y + 1.05, kind: 'bin' }); };
  for (const k of [0, 2, 4, 6]) { const an = k * Math.PI / 4 + Math.PI / 8, p = [cx + (f.ex * Math.cos(an) + f.nx * Math.sin(an)) * 8.1, cz + (f.ez * Math.cos(an) + f.nz * Math.sin(an)) * 8.1]; bin(p[0], p[1]); }
  { const p = W(23.0, 2.2); bin(p[0], p[1]); }

  // ---- navy triple-globe lamp posts
  const lamp = (x, z, hgt = 6.2) => { const y = gnd(x, z), top = y + hgt; K.cyl(m.navy, x, y, top, z, 0.1, 0.075, 8); K.cyl(m.navy, x, y, y + 0.5, z, 0.16, 0.13, 8);
    for (let k = 0; k < 3; k++) { const an = k * 2.094 + 0.4, ex2 = x + Math.cos(an) * 0.55, ez2 = z + Math.sin(an) * 0.55; K.tube(m.navy, [x, top - 0.1, z], [ex2, top + 0.15, ez2], 0.03, 6); K.sph(m.globe, ex2, top + 0.4, ez2, 0.27, 1, 10); }
    colliders.push({ type: 'circle', x, z, r: 0.2, y0: y, top, kind: 'lamp' }); };
  { let p = W(PL.u - 1.8, PL.w - 3.0); lamp(p[0], p[1], 6.4); p = W(30.0, 6.0); lamp(p[0], p[1], 5.2); p = W(-1.5, 9.0); lamp(p[0], p[1], 5.2); }

  // ---- cycle hoops and bikes in front of the porch
  const hoop = (x, z, ang) => { const y = gnd(x, z), ax = Math.cos(ang), az = Math.sin(ang); const a0 = [x - ax * 0.4, z - az * 0.4], a1 = [x + ax * 0.4, z + az * 0.4];
    K.tube(m.navy, [a0[0], y, a0[1]], [a0[0], y + 0.85, a0[1]], 0.025, 6); K.tube(m.navy, [a1[0], y, a1[1]], [a1[0], y + 0.85, a1[1]], 0.025, 6); K.tube(m.navy, [a0[0], y + 0.85, a0[1]], [a1[0], y + 0.85, a1[1]], 0.025, 6); };
  const th = Math.atan2(f.ez, f.ex);
  for (let i = 0; i < 8; i++) { const p = W(13.5 + i * 1.05, 3.4); hoop(p[0], p[1], th + Math.PI / 2); }
  for (let i = 0; i < 6; i++) { const p = W(14.0 + i * 1.05, 3.4); const y = gnd(p[0], p[1]), mat = [m.bikeA, m.bikeB, m.bikeC][i % 3], dx = f.nx, dz = f.nz;   // each bike lies along the outward normal, between hoops
    const wheel = (t) => { const c = [p[0] + dx * t, y + 0.33, p[1] + dz * t]; const ge = new THREE.TorusGeometry(0.33, 0.025, 6, 16); ge.rotateY(Math.atan2(dx, dz) + Math.PI / 2); ge.translate(...c); K.put(m.tyre, ge); };
    wheel(-0.55); wheel(0.55); K.tube(mat, [p[0] - dx * 0.55, y + 0.33, p[1] - dz * 0.55], [p[0], y + 0.62, p[1]], 0.025, 5); K.tube(mat, [p[0], y + 0.62, p[1]], [p[0] + dx * 0.5, y + 0.66, p[1] + dz * 0.5], 0.025, 5); K.tube(mat, [p[0] + dx * 0.5, y + 0.66, p[1] + dz * 0.5], [p[0] + dx * 0.55, y + 0.33, p[1] + dz * 0.55], 0.025, 5); K.tube(mat, [p[0] - dx * 0.55, y + 0.33, p[1] - dz * 0.55], [p[0] + dx * 0.5, y + 0.66, p[1] + dz * 0.5], 0.025, 5); }
  void F;
  K.flush(group, 'leisure-plaza');
  return { group, colliders };
}
