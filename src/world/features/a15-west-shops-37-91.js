// Area a15-west-shops-37-91: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// West side of Hamilton Road, the shop terraces 37 to 91, from the Street View photos in
// docs/research/hamilton-road-streetview. One generic feature, `shopRow`, draws everything above the shop fronts:
// painted or brick skins laid over the base facade, sash windows with surrounds, cornices, string courses, pilasters,
// bays, gables, turrets and a few shopfront boards. Positions are metres along the street face measured from the
// SOUTH end (the footprint edges here all run south to north), so they can be read straight off the photos.
// Dimensions are scaled from the photos (a door, a window or a person for scale); they are estimates, not surveyed.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const WHITE = '#efece4', PAINT = '#f1eee6';

function kit(K, it) {
  // The street-edge frame in frontage-details.js only knows about roads cars can use, and Hamilton Road is pedestrianised
  // here, so it picks a back wall. Each call therefore carries its own street face: it.edge = [[x, z] south end, [x, z] north end].
  const [A, C] = it.edge, dx = C[0] - A[0], dz = C[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, g = K.g;
  const geos = new Map();
  const G = (key) => { if (!geos.has(key)) geos.set(key, new Geo()); return geos.get(key); };
  const P = (s, d, y) => [A[0] + ux * s + nx * d, g + y, A[1] + uz * s + nz * d];
  const box = (key, s, d, y0, y1, hs, hd) => { const p = P(s, d, (y0 + y1) / 2); G(key).box(p[0], p[1], p[2], ux, uz, hs, (y1 - y0) / 2, hd); };
  // a flat panel on the facade; uvm = metres per texture tile (textured skins) or 0 for plain colour
  const quad = (key, s0, s1, y0, y1, d, uvm = 0) => {
    const uv = uvm ? [[0, 0], [(s1 - s0) / uvm[0], 0], [(s1 - s0) / uvm[0], (y1 - y0) / uvm[1]], [0, (y1 - y0) / uvm[1]]] : undefined;
    G(key).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  };
  const tri = (key, a, b, c) => G(key).tri(a, b, c);
  const triUV = (key, a, b, c, ua, ub, uc) => { const g = G(key), n = g.p.length / 3; g.p.push(...a, ...b, ...c); g.uv.push(...ua, ...ub, ...uc); g.idx.push(n, n + 1, n + 2); };
  const quadW = (key, a, b, c, d) => G(key).quad(a, b, c, d);
  const flush = () => {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide });
      else if (kind === 'brick') mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: col, roughness: 1, side: THREE.DoubleSide });
      else if (kind === 'stock') { const t = Textures.facadeTexture('brick_yellow', false, 62, 0); mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: col, roughness: 1, side: THREE.DoubleSide }); }
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: kind === 'metal' ? 0.4 : 0.8, metalness: kind === 'metal' ? 0.5 : 0, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a15:' + key; K.extra.push(me); }
    }
  };
  return { L, P, box, quad, tri, triUV, quadW, flush };
}

/** A sash window: surround, dark glass, glazing bars, sill. Optional arched head (arch) or small casement panes. */
function win(k, w) {
  const s = w.s, hw = (w.w || 1.1) / 2, y0 = w.y, h = w.h || 1.7, y1 = y0 + h, fr = 'flat|' + (w.frame || WHITE), gl = 'glass|' + (w.glass || '#3d4a54');
  const sur = w.surround === false ? 0 : (w.surround || 0.11);
  if (sur) {
    if (w.arch) { k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 - hw, 0.08); archFan(k, fr, s, y1 - hw, hw + sur, 0.08); }
    else k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 + sur, 0.05);
  }
  if (w.arch) { k.quad(gl, s - hw, s + hw, y0, y1 - hw, 0.1); archFan(k, gl, s, y1 - hw, hw, 0.1); }
  else k.quad(gl, s - hw, s + hw, y0, y1, 0.1);
  const bars = w.bars ?? 1, bw = 0.03; // horizontal sash meeting rail(s) and a central bar when wide
  for (let i = 1; i <= bars; i++) k.box(fr, s, 0.11, y0 + (h * i) / (bars + 1) - bw, y0 + (h * i) / (bars + 1) + bw, hw, 0.02);
  if (w.mull ?? hw > 0.62) k.box(fr, s, 0.11, y0, y1, 0.03, 0.02);
  if (w.mull2) for (const f of [-1 / 3, 1 / 3]) k.box(fr, s + 2 * hw * f, 0.1, y0, y1, 0.03, 0.02);
  if (w.sill !== false) k.box(fr, s, 0.13, y0 - sur - 0.09, y0 - sur, hw + sur + 0.1, 0.1);
}
function archFan(k, key, s, yc, r, d, n = 8) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    k.tri(key, k.P(s, d, yc), k.P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), k.P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1)));
  }
}

/** Eaves cornice: a projecting band with a row of small dentil blocks under it. */
function cornice(k, H, L, c) {
  const y = c.y ?? H, a = c.s0 ?? 0, b = c.s1 ?? L - 0.5, col = 'flat|' + (c.col || WHITE), out = c.out ?? 0.32, hh = c.h ?? 0.2;
  k.box(col, (a + b) / 2, out / 2, y - hh, y + 0.05, (b - a) / 2, out / 2);
  if (c.dentils !== false) for (let s = a + 0.12; s < b - 0.05; s += 0.34) k.box(col, s, out * 0.5, y - hh - 0.14, y - hh, 0.07, out * 0.4);
}

export const FEATURES = {
  shopRow(K, it) {
    const k = kit(K, it), H = it.H ?? K.H, L = k.L, ytop = it.ytop ?? H;
    // cover: one skin over the whole upper wall (above the shop front) so the base building's own windows are hidden
    if (it.cover) { const c = it.cover, y0 = c.y0 ?? 3.58, y1 = c.y1 ?? ytop, s0 = c.s0 ?? 0, s1 = c.s1 ?? L - 0.5; const uvm = [3.2, 2.9];
      if (c.mat === 'brick') k.quad('brick|' + (c.tint || '#ffffff'), s0, s1, y0, y1, 0.03, uvm); else if (c.mat === 'stock') k.quad('stock|' + (c.tint || '#ffffff'), s0, s1, y0, y1, 0.03, uvm); else k.quad('flat|' + c.mat, s0, s1, y0, y1, 0.03); }
    // painted / brick skins over the base wall: { s0, s1, mat: '#rrggbb' | 'brick' | 'stock', y0, y1, tint }
    for (const p of it.skins || []) {
      const y0 = p.y0 ?? 3.6, y1 = p.y1 ?? ytop;
      if (p.mat === 'brick') k.quad('brick|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, 0.06, [3.2, 2.9]);
      else if (p.mat === 'stock') k.quad('stock|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, 0.06, [3.2, 2.9]);
      else k.quad('flat|' + p.mat, p.s0, p.s1, y0, y1, 0.06);
    }
    for (const w of it.windows || []) win(k, w);
    for (const c of it.cornices || [{}]) if (it.cornices !== false) cornice(k, H, L, c);
    // string courses / bands: { y0, y1, s0, s1, col, out }
    for (const b of it.bands || []) k.box('flat|' + (b.col || WHITE), ((b.s0 ?? 0.2) + (b.s1 ?? L - 0.2)) / 2, (b.out ?? 0.1) / 2 + 0.02, b.y0, b.y1, ((b.s1 ?? L - 0.2) - (b.s0 ?? 0.2)) / 2, (b.out ?? 0.1) / 2);
    // pilasters with a small console at the head: { s, w, y0, y1 }
    for (const p of it.pilasters || []) {
      const y0 = p.y0 ?? 3.55, y1 = p.y1 ?? H - 0.35, hw = (p.w || 0.5) / 2, col = 'flat|' + (p.col || WHITE);
      k.box(col, p.s, 0.1, y0, y1, hw, 0.08); k.box(col, p.s, 0.15, y1 - 0.5, y1 - 0.05, hw + 0.07, 0.12);
    }
    // projecting bays: { s, w, y0, y1, depth, frame, cap }
    for (const b of it.bays || []) {
      const hw = b.w / 2, dp = b.depth ?? 0.55, fr = 'flat|' + (b.frame || WHITE), gl = 'glass|' + (b.glass || '#3d4a54');
      k.box(fr, b.s, dp / 2 + 0.04, b.y0, b.y0 + 0.28, hw, dp / 2);              // base
      k.box(fr, b.s, dp / 2 + 0.04, b.y1 - 0.3, b.y1, hw + 0.05, dp / 2 + 0.05); // head
      k.quad(gl, b.s - hw + 0.08, b.s + hw - 0.08, b.y0 + 0.28, b.y1 - 0.3, dp + 0.05);
      const n = b.panes ?? Math.max(2, Math.round(b.w / 0.9));
      for (let i = 0; i <= n; i++) k.box(fr, b.s - hw + (b.w * i) / n, dp + 0.06, b.y0 + 0.28, b.y1 - 0.3, 0.035, 0.03);
      k.box(fr, b.s, dp + 0.06, (b.y0 + b.y1) / 2 - 0.03, (b.y0 + b.y1) / 2 + 0.03, hw, 0.03);
      for (const sd of [-1, 1]) k.box(fr, b.s + sd * hw, dp / 2 + 0.04, b.y0 + 0.28, b.y1 - 0.3, 0.025, dp / 2);
      if (b.cap) k.box('flat|' + b.cap, b.s, dp / 2 + 0.04, b.y1, b.y1 + 0.12, hw + 0.12, dp / 2 + 0.1);
    }
    // balcony with white balustrade: { s0, s1, y, depth }
    for (const b of it.balconies || []) {
      const dp = b.depth ?? 0.75, cs = (b.s0 + b.s1) / 2, hs = (b.s1 - b.s0) / 2, col = 'flat|' + (b.col || WHITE);
      k.box(col, cs, dp / 2, b.y - 0.1, b.y + 0.04, hs, dp / 2);
      k.box(col, cs, dp, b.y + 0.98, b.y + 1.05, hs, 0.04);
      for (let s = b.s0 + 0.1; s < b.s1; s += 0.17) k.box(col, s, dp, b.y + 0.05, b.y + 1.0, 0.015, 0.015);
      for (const s of [b.s0 + 0.04, b.s1 - 0.04]) k.box(col, s, dp, b.y, b.y + 1.05, 0.05, 0.05);
    }
    // gables over a flat-roofed block: { s, w, y0, rise, depth, mat, tint, coping, roof }
    for (const g of it.gables || []) {
      const hw = g.w / 2, y0 = g.y0 ?? H, yr = y0 + g.rise, dp = g.depth ?? 8, roof = 'flat|' + (g.roof || '#3b3f46'), cop = 'flat|' + (g.coping || '#d8d0b8');
      const face = g.mat === 'brick' ? 'brick|' + (g.tint || '#ffffff') : g.mat === 'stock' ? 'stock|' + (g.tint || '#ffffff') : 'flat|' + (g.mat || WHITE);
      const A = k.P(g.s - hw, 0.04, y0 - 0.05), B = k.P(g.s + hw, 0.04, y0 - 0.05), C = k.P(g.s, 0.04, yr);
      k.triUV(face, A, B, C, [0, 0], [g.w / 3.2, 0], [g.w / 6.4, g.rise / 2.9]);
      const s1 = k.P(g.s - hw - 0.15, 0.22, y0 - 0.1), s2 = k.P(g.s, 0.22, yr + 0.08), s3 = k.P(g.s, -dp, yr + 0.08), s4 = k.P(g.s - hw - 0.15, -dp, y0 - 0.1);
      const t1 = k.P(g.s + hw + 0.15, 0.22, y0 - 0.1), t4 = k.P(g.s + hw + 0.15, -dp, y0 - 0.1);
      k.quadW(roof, s1, s2, s3, s4); k.quadW(roof, s2, t1, t4, s3);
      k.tri(cop, k.P(g.s - hw - 0.12, 0.07, y0 - 0.06), k.P(g.s - hw + 0.2, 0.07, y0 - 0.06), k.P(g.s, 0.07, yr + 0.02));
      k.tri(cop, k.P(g.s + hw + 0.12, 0.07, y0 - 0.06), k.P(g.s + hw - 0.2, 0.07, y0 - 0.06), k.P(g.s, 0.07, yr + 0.02));
    }
    // octagonal-ish corner turret with a verdigris cap: { s, w, y0, y1, mat, cap }
    for (const t of it.turrets || []) {
      const hw = t.w / 2, col = 'flat|' + (t.mat || '#cdbf9c');
      k.box(col, t.s, hw * 0.55, t.y0, t.y1, hw, hw * 0.55);
      const apex = k.P(t.s, hw * 0.55, t.y1 + (t.cap ?? 2.2)), c0 = k.P(t.s - hw - 0.1, -0.1, t.y1), c1 = k.P(t.s + hw + 0.1, -0.1, t.y1), c2 = k.P(t.s + hw + 0.1, hw * 1.1 + 0.1, t.y1), c3 = k.P(t.s - hw - 0.1, hw * 1.1 + 0.1, t.y1);
      const cg = 'flat|#6fa38f'; k.tri(cg, c0, c1, apex); k.tri(cg, c1, c2, apex); k.tri(cg, c2, c3, apex); k.tri(cg, c3, c0, apex);
      k.box('flat|#7a6a50', t.s, hw * 0.55, t.y0 + 1.6, t.y0 + 2.5, hw * 0.35, hw * 0.55 + 0.02);
    }
    // shopfront boards and glazing where there is no business sign of our own: { s0, s1, fascia, y0, y1, glass }
    for (const f of it.fronts || []) {
      const y0 = f.y0 ?? 3.05, y1 = f.y1 ?? 3.95, cs = (f.s0 + f.s1) / 2, hs = (f.s1 - f.s0) / 2;
      k.box('flat|' + f.fascia, cs, 0.14, y0, y1, hs, 0.12);
      k.box('flat|' + (f.frame || f.fascia), cs, 0.1, 0, y0, hs, 0.06);
      const gs = f.s0 + 0.25, ge = f.s1 - 0.25; k.quad('glass|' + (f.glass || '#27323a'), gs, ge, 0.35, y0 - 0.08, 0.17);
      const n = Math.max(2, Math.round((ge - gs) / 1.7)); for (let i = 0; i <= n; i++) k.box('flat|' + (f.frame || f.fascia), gs + ((ge - gs) * i) / n, 0.19, 0.3, y0 - 0.05, 0.04, 0.04);
      if (f.door) { k.quad('glass|' + (f.doorGlass || '#1c242a'), f.door - 0.6, f.door + 0.6, 0.1, 2.3, 0.2); }
    }
    // pitched-roof dormers (white front, slate cheeks and roof) and brick chimney stacks, on the roof slope behind the eaves
    for (const dm of it.dormers || []) {
      const pitch = dm.pitch ?? it.pitch ?? 0.72, w = dm.w ?? 1.7, i0 = 0.7, s = dm.s, yb = H + i0 * pitch - 0.12, yt = yb + 1.35, yr = yt + 0.62;
      const dF = -i0, dS = -(yt - H) / pitch, dE = -(yr - H) / pitch, a = s - w / 2, b = s + w / 2, fr = 'flat|' + WHITE, sl = 'flat|#3d4046';
      k.quad(fr, a, b, yb, yt, dF); k.tri(fr, k.P(a, dF, yt), k.P(b, dF, yt), k.P(s, dF, yr));
      k.quad('glass|#3d4a54', a + 0.22, b - 0.22, yb + 0.18, yt - 0.14, dF + 0.03); k.box(fr, s, dF + 0.04, yb + 0.18, yt - 0.14, 0.025, 0.01);
      for (const x of [a, b]) k.tri(sl, k.P(x, dF, yb), k.P(x, dF, yt), k.P(x, dS, yt));
      k.quadW(sl, k.P(a - 0.08, dF + 0.1, yt), k.P(s, dF + 0.1, yr + 0.06), k.P(s, dE, yr + 0.06), k.P(a - 0.08, dS, yt));
      k.quadW(sl, k.P(s, dF + 0.1, yr + 0.06), k.P(b + 0.08, dF + 0.1, yt), k.P(b + 0.08, dS, yt), k.P(s, dE, yr + 0.06));
    }
    for (const c of it.chimneys || []) {
      const pitch = c.pitch ?? it.pitch ?? 0.72, i = c.inset ?? 2.6, y = H + i * pitch, top = y + (c.rise ?? 1.7);
      k.box('flat|#8c4f3b', c.s, -i, y - 0.5, top, 0.36, 0.27); k.box('flat|#cfc9b9', c.s, -i, top, top + 0.1, 0.43, 0.33);
      for (const o of [-0.17, 0.17]) k.box('flat|#a05f3d', c.s + o, -i, top + 0.1, top + 0.56, 0.07, 0.07);
    }
    for (const w of it.extraBoxes || []) k.box('flat|' + w.col, w.s, w.d ?? 0.1, w.y0, w.y1, w.hs, w.hd ?? 0.05);
    k.flush();
  },
};
