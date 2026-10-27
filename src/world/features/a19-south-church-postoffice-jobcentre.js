// Area a19-south-church-postoffice-jobcentre: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// South end of Hamilton Road around Victoria Street, from the Street View photos in docs/research/hamilton-road-streetview
// (j-* and k-* rows). Hamilton Road is pedestrianised here so, as in a15, every call carries its own street face:
// it.edge = [[x, z] start, [x, z] end]; s runs along the edge from the start, d is out from the wall (the edge normal is (-uz, ux)),
// y is up from the ground at the start. Everything is estimated from the photos (door, window or person for scale); none of it is surveyed.
// The generic `a19Row` feature (a copy of a15's shopRow plus slabs, cones and drums) skins, glazes and decorates a wall; `church` draws
// the Methodist church gable, rose window and porch.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const WHITE = '#efece4', PAINT = '#f1eee6';

function kit(K, it) {
  const [A, C] = it.edge, dx = C[0] - A[0], dz = C[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, g = K.g;
  const geos = new Map();
  const G = (key) => { if (!geos.has(key)) geos.set(key, new Geo()); return geos.get(key); };
  const P = (s, d, y) => [A[0] + ux * s + nx * d, g + y, A[1] + uz * s + nz * d];
  const box = (key, s, d, y0, y1, hs, hd) => { const p = P(s, d, (y0 + y1) / 2); G(key).box(p[0], p[1], p[2], ux, uz, hs, (y1 - y0) / 2, hd); };
  const quad = (key, s0, s1, y0, y1, d, uvm = 0) => {
    const uv = uvm ? [[0, 0], [(s1 - s0) / uvm[0], 0], [(s1 - s0) / uvm[0], (y1 - y0) / uvm[1]], [0, (y1 - y0) / uvm[1]]] : undefined;
    G(key).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  };
  const tri = (key, a, b, c) => G(key).tri(a, b, c);
  const triUV = (key, a, b, c, ua, ub, uc) => { const g2 = G(key), n = g2.p.length / 3; g2.p.push(...a, ...b, ...c); g2.uv.push(...ua, ...ub, ...uc); g2.idx.push(n, n + 1, n + 2); };
  const quadW = (key, a, b, c, d) => G(key).quad(a, b, c, d);
  const flush = () => {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide });
      else if (kind === 'brick') mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: col, roughness: 1, side: THREE.DoubleSide });
      else if (kind === 'stock') { const t = Textures.facadeTexture('brick_yellow', false, 62, 0); mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: col, roughness: 1, side: THREE.DoubleSide }); }
      else if (kind === 'flint') { const t = Textures.facadeTexture('flint', false, 63, 0); mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: col, roughness: 1, side: THREE.DoubleSide }); }
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: kind === 'metal' ? 0.4 : 0.8, metalness: kind === 'metal' ? 0.5 : 0, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a19:' + key; K.extra.push(me); }
    }
  };
  return { L, P, box, quad, tri, triUV, quadW, flush, G };
}

function archFan(k, key, s, yc, r, d, n = 8) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    k.tri(key, k.P(s, d, yc), k.P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), k.P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1)));
  }
}
/** pointed (lancet) head: a triangle over the rectangle, apex a little higher than a round arch */
function pointFan(k, key, s, y, hw, d, rise = 1.0) { k.tri(key, k.P(s - hw, d, y), k.P(s + hw, d, y), k.P(s, d, y + hw * rise * 1.9)); }

/** A sash window: surround, dark glass, glazing bars, sill. Optional arched head (arch), a hood over it (hood), or a pointed head (point). */
function win(k, w) {
  const s = w.s, hw = (w.w || 1.1) / 2, y0 = w.y, h = w.h || 1.7, y1 = y0 + h, fr = 'flat|' + (w.frame || WHITE), gl = 'glass|' + (w.glass || '#3d4a54');
  const sur = w.surround === false ? 0 : (w.surround || 0.11);
  if (sur) {
    if (w.arch) { k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 - hw, 0.08); archFan(k, fr, s, y1 - hw, hw + sur, 0.08); }
    else k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 + sur, 0.05);
  }
  if (w.arch) {
    if (w.ring) { // moulded brick/terracotta architrave round the arch
      const rc = 'flat|' + w.ring, r0 = hw + sur, r1 = hw + sur + (w.ringW ?? 0.22), n = 10;
      for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
        k.quadW(rc, k.P(s + r0 * Math.cos(a0), 0.06, y1 - hw + r0 * Math.sin(a0)), k.P(s + r1 * Math.cos(a0), 0.06, y1 - hw + r1 * Math.sin(a0)), k.P(s + r1 * Math.cos(a1), 0.06, y1 - hw + r1 * Math.sin(a1)), k.P(s + r0 * Math.cos(a1), 0.06, y1 - hw + r0 * Math.sin(a1))); }
      k.quad(rc, s - r1, s - r0, y0 - sur, y1 - hw, 0.06); k.quad(rc, s + r0, s + r1, y0 - sur, y1 - hw, 0.06);
    }
    k.quad(gl, s - hw, s + hw, y0, y1 - hw, 0.1); archFan(k, gl, s, y1 - hw, hw, 0.1);
  } else if (w.point) { k.quad(gl, s - hw, s + hw, y0, y1, 0.1); pointFan(k, gl, s, y1, hw, 0.1); }
  else k.quad(gl, s - hw, s + hw, y0, y1, 0.1);
  if (w.glassTop) { /* nothing: kept for symmetry */ }
  const bars = w.bars ?? 1, bw = 0.03;
  for (let i = 1; i <= bars; i++) k.box(fr, s, 0.11, y0 + (h * i) / (bars + 1) - bw, y0 + (h * i) / (bars + 1) + bw, hw, 0.02);
  if (w.mull ?? hw > 0.62) k.box(fr, s, 0.11, y0, y1, 0.03, 0.02);
  if (w.mull2) for (const f of [-1 / 3, 1 / 3]) k.box(fr, s + 2 * hw * f, 0.1, y0, y1, 0.03, 0.02);
  if (w.sill !== false) k.box(fr, s, 0.13, y0 - sur - 0.09, y0 - sur, hw + sur + 0.1, 0.1);
  if (w.hood) k.box('flat|' + w.hood, s, 0.2, y1 + sur, y1 + sur + 0.22, hw + 0.25, 0.2);
}

function cornice(k, H, L, c) {
  const y = c.y ?? H, a = c.s0 ?? 0, b = c.s1 ?? L - 0.5, col = 'flat|' + (c.col || WHITE), out = c.out ?? 0.32, hh = c.h ?? 0.2;
  k.box(col, (a + b) / 2, out / 2, y - hh, y + 0.05, (b - a) / 2, out / 2);
  if (c.dentils !== false) for (let s = a + 0.12; s < b - 0.05; s += 0.34) k.box(col, s, out * 0.5, y - hh - 0.14, y - hh, 0.07, out * 0.4);
}

/** regular n-gon drum (turret body) with windows on chosen faces; (s,d) is the centre in the edge frame */
function drum(k, t) {
  const n = t.n ?? 10, r = t.r, y0 = t.y0, y1 = t.y1, key = t.mat === 'brick' || !t.mat ? 'brick|' + (t.tint || '#ffffff') : 'flat|' + t.mat, a00 = t.a0 ?? 0;
  const pt = (a, y) => k.P(t.s + r * Math.cos(a), t.d + r * Math.sin(a), y);
  for (let i = 0; i < n; i++) {
    const a0 = a00 + (2 * Math.PI * i) / n, a1 = a00 + (2 * Math.PI * (i + 1)) / n;
    const face = [pt(a0, y0), pt(a1, y0), pt(a1, y1), pt(a0, y1)];
    if (key.startsWith('brick')) k.G(key).quad(...face, [[0, 0], [1, 0], [1, (y1 - y0) / 2.9], [0, (y1 - y0) / 2.9]]); else k.quadW(key, ...face);
    const am = (a0 + a1) / 2, rc = r * Math.cos(Math.PI / n) + 0.03, tx = -Math.sin(am), ty = Math.cos(am); // tangent in (s,d)
    for (const w of t.windows || []) {
      if (!(w.faces || []).includes(i)) continue;
      const hw = (w.w || 0.9) / 2, hh = w.h || 1.7, cs = t.s + rc * Math.cos(am), cd = t.d + rc * Math.sin(am);
      const sq = (half, off, yy0, yy1, col) => k.quadW(col,
        k.P(cs - tx * half + Math.cos(am) * off, cd - ty * half + Math.sin(am) * off, yy0), k.P(cs + tx * half + Math.cos(am) * off, cd + ty * half + Math.sin(am) * off, yy0),
        k.P(cs + tx * half + Math.cos(am) * off, cd + ty * half + Math.sin(am) * off, yy1), k.P(cs - tx * half + Math.cos(am) * off, cd - ty * half + Math.sin(am) * off, yy1));
      sq(hw + 0.1, 0.01, w.y - 0.1, w.y + hh + 0.1, 'flat|' + (w.frame || WHITE));
      sq(hw, 0.03, w.y, w.y + hh, 'glass|' + (w.glass || '#3d4a54'));
      sq(hw, 0.05, w.y + hh / 2 - 0.025, w.y + hh / 2 + 0.025, 'flat|' + (w.frame || WHITE));
    }
  }
  for (const rg of t.rings || []) for (let i = 0; i < n; i++) { // coloured bands wrapped round the drum (fascia)
    const a0 = a00 + (2 * Math.PI * i) / n, a1 = a00 + (2 * Math.PI * (i + 1)) / n, rr = rg.r, p = (a, y) => k.P(t.s + rr * Math.cos(a), t.d + rr * Math.sin(a), y);
    k.quadW('flat|' + rg.col, p(a0, rg.y0), p(a1, rg.y0), p(a1, rg.y1), p(a0, rg.y1));
  }
  // a dark cornice ring at the top
  for (let i = 0; i < n; i++) {
    const a0 = a00 + (2 * Math.PI * i) / n, a1 = a00 + (2 * Math.PI * (i + 1)) / n, rr = r + 0.18;
    const p = (a, rad, y) => k.P(t.s + rad * Math.cos(a), t.d + rad * Math.sin(a), y);
    k.quadW('flat|' + (t.cornice || '#d8d0bc'), p(a0, rr, y1 - 0.2), p(a1, rr, y1 - 0.2), p(a1, rr, y1 + 0.05), p(a0, rr, y1 + 0.05));
  }
}
/** conical roof over a drum */
function cone(k, c) {
  const n = c.n ?? 10, r = c.r + (c.over ?? 0.3), apex = k.P(c.s, c.d, c.y0 + c.rise), key = 'flat|' + (c.col || '#8a4d3b'), a00 = c.a0 ?? 0;
  for (let i = 0; i < n; i++) {
    const a0 = a00 + (2 * Math.PI * i) / n, a1 = a00 + (2 * Math.PI * (i + 1)) / n;
    k.tri(key, k.P(c.s + r * Math.cos(a0), c.d + r * Math.sin(a0), c.y0), k.P(c.s + r * Math.cos(a1), c.d + r * Math.sin(a1), c.y0), apex);
  }
  if (c.finial) k.box('flat|#2b2d31', c.s, c.d, c.y0 + c.rise, c.y0 + c.rise + 0.9, 0.03, 0.03);
}


function rowImpl(K, it, k) {
  const H = it.H ?? K.H, L = k.L, ytop = it.ytop ?? H;
  const uvm = [3.2, 2.9];
  const skinQuad = (p, d0) => {
    const d = p.d ?? d0, y0 = p.y0 ?? 3.6, y1 = p.y1 ?? ytop;
    if (p.mat === 'brick') k.quad('brick|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, d, uvm);
    else if (p.mat === 'stock') k.quad('stock|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, d, uvm);
    else if (p.mat === 'flint') k.quad('flint|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, d, uvm);
    else k.quad('flat|' + p.mat, p.s0, p.s1, y0, y1, d);
  };
  if (it.cover) { const c = it.cover; skinQuad({ ...c, y0: c.y0 ?? 3.58, y1: c.y1 ?? ytop, s0: c.s0 ?? 0, s1: c.s1 ?? L - 0.5 }, 0.03); }
  for (const p of it.skins || []) skinQuad(p, 0.06);
  for (const q of it.quads || []) k.quad(q.mat, q.s0, q.s1, q.y0, q.y1, q.d ?? 0.05);
  for (const w of it.windows || []) win(k, w);
  for (const c of it.cornices || [{}]) if (it.cornices !== false) cornice(k, H, L, c);
  for (const b of it.bands || []) k.box('flat|' + (b.col || WHITE), ((b.s0 ?? 0.2) + (b.s1 ?? L - 0.2)) / 2, (b.out ?? 0.1) / 2 + 0.02, b.y0, b.y1, ((b.s1 ?? L - 0.2) - (b.s0 ?? 0.2)) / 2, (b.out ?? 0.1) / 2);
  for (const p of it.pilasters || []) {
    const y0 = p.y0 ?? 3.55, y1 = p.y1 ?? H - 0.35, hw = (p.w || 0.5) / 2, col = 'flat|' + (p.col || WHITE);
    k.box(col, p.s, 0.1, y0, y1, hw, 0.08); if (p.cap !== false) k.box(col, p.s, 0.15, y1 - 0.5, y1 - 0.05, hw + 0.07, 0.12);
  }
  for (const b of it.bays || []) {
    const hw = b.w / 2, dp = b.depth ?? 0.55, fr = 'flat|' + (b.frame || WHITE), gl = 'glass|' + (b.glass || '#3d4a54');
    k.box(fr, b.s, dp / 2 + 0.04, b.y0, b.y0 + 0.28, hw, dp / 2);
    k.box(fr, b.s, dp / 2 + 0.04, b.y1 - 0.3, b.y1, hw + 0.05, dp / 2 + 0.05);
    k.quad(gl, b.s - hw + 0.08, b.s + hw - 0.08, b.y0 + 0.28, b.y1 - 0.3, dp + 0.05);
    const n = b.panes ?? Math.max(2, Math.round(b.w / 0.9));
    for (let i = 0; i <= n; i++) k.box(fr, b.s - hw + (b.w * i) / n, dp + 0.06, b.y0 + 0.28, b.y1 - 0.3, 0.035, 0.03);
    const nb = b.rails ?? 1; for (let i = 1; i <= nb; i++) { const yy = b.y0 + 0.28 + ((b.y1 - b.y0 - 0.58) * i) / (nb + 1); k.box(fr, b.s, dp + 0.06, yy - 0.03, yy + 0.03, hw, 0.03); }
    for (const sd of [-1, 1]) k.box(fr, b.s + sd * hw, dp / 2 + 0.04, b.y0 + 0.28, b.y1 - 0.3, 0.025, dp / 2);
    if (b.cap) k.box('flat|' + b.cap, b.s, dp / 2 + 0.04, b.y1, b.y1 + 0.12, hw + 0.12, dp / 2 + 0.1);
    if (b.corbel) k.box('flat|' + b.corbel, b.s, dp / 2, b.y0 - 0.7, b.y0, hw * 0.8, dp / 2 * 0.8);
  }
  for (const b of it.balconies || []) {
    const dp = b.depth ?? 0.75, cs = (b.s0 + b.s1) / 2, hs = (b.s1 - b.s0) / 2, col = 'flat|' + (b.col || WHITE);
    k.box(col, cs, dp / 2, b.y - 0.1, b.y + 0.04, hs, dp / 2);
    k.box(col, cs, dp, b.y + 0.98, b.y + 1.05, hs, 0.04);
    for (let s = b.s0 + 0.1; s < b.s1; s += 0.17) k.box(col, s, dp, b.y + 0.05, b.y + 1.0, 0.015, 0.015);
    for (const s of [b.s0 + 0.04, b.s1 - 0.04]) k.box(col, s, dp, b.y, b.y + 1.05, 0.05, 0.05);
  }
  // glass-panel balcony: { s0, s1, y, depth } - a slab with a frameless glass balustrade and thin steel posts
  for (const b of it.glassBalconies || []) {
    const dp = b.depth ?? 1.3, cs = (b.s0 + b.s1) / 2, hs = (b.s1 - b.s0) / 2;
    k.box('flat|#d5d7d3', cs, dp / 2, b.y - 0.18, b.y, hs, dp / 2);
    k.quad('glass|#8fb0bd', b.s0, b.s1, b.y, b.y + 1.05, dp);
    for (const s of [b.s0, (b.s0 + b.s1) / 2, b.s1]) k.box('flat|#aeb2b4', s, dp, b.y, b.y + 1.1, 0.03, 0.03);
    k.box('flat|#aeb2b4', cs, dp, b.y + 1.05, b.y + 1.1, hs, 0.025);
    for (const sd of [b.s0, b.s1]) { const d0 = dp / 2; k.box('glass|#8fb0bd', sd, d0, b.y, b.y + 1.0, 0.02, d0); }
  }
  // floor slabs and columns of the 1960s block: { s0, s1, y, depth, thick, col }
  for (const sl of it.slabs || []) k.box('flat|' + (sl.col || '#c9c6bd'), (sl.s0 + sl.s1) / 2, (sl.depth ?? 1) / 2, sl.y, sl.y + (sl.thick ?? 0.35), (sl.s1 - sl.s0) / 2, (sl.depth ?? 1) / 2);
  for (const c of it.cols || []) k.box('flat|' + (c.col || '#c9c6bd'), c.s, c.d ?? 0.9, c.y0, c.y1, (c.w ?? 0.4) / 2, (c.w ?? 0.4) / 2);
  for (const g of it.gables || []) {
    const hw = g.w / 2, y0 = g.y0 ?? H, yr = y0 + g.rise, dp = g.depth ?? 8, roof = 'flat|' + (g.roof || '#3b3f46'), cop = 'flat|' + (g.coping || '#d8d0b8');
    const face = g.mat === 'brick' ? 'brick|' + (g.tint || '#ffffff') : g.mat === 'flint' ? 'flint|' + (g.tint || '#ffffff') : g.mat === 'stock' ? 'stock|' + (g.tint || '#ffffff') : 'flat|' + (g.mat || WHITE);
    const A = k.P(g.s - hw, 0.04, y0 - 0.05), B = k.P(g.s + hw, 0.04, y0 - 0.05), C = k.P(g.s, 0.04, yr);
    k.triUV(face, A, B, C, [0, 0], [g.w / 3.2, 0], [g.w / 6.4, g.rise / 2.9]);
    const s1 = k.P(g.s - hw - 0.15, 0.22, y0 - 0.1), s2 = k.P(g.s, 0.22, yr + 0.08), s3 = k.P(g.s, -dp, yr + 0.08), s4 = k.P(g.s - hw - 0.15, -dp, y0 - 0.1);
    const t1 = k.P(g.s + hw + 0.15, 0.22, y0 - 0.1), t4 = k.P(g.s + hw + 0.15, -dp, y0 - 0.1);
    k.quadW(roof, s1, s2, s3, s4); k.quadW(roof, s2, t1, t4, s3);
    k.tri(cop, k.P(g.s - hw - 0.12, 0.07, y0 - 0.06), k.P(g.s - hw + 0.2, 0.07, y0 - 0.06), k.P(g.s, 0.07, yr + 0.02));
    k.tri(cop, k.P(g.s + hw + 0.12, 0.07, y0 - 0.06), k.P(g.s + hw - 0.2, 0.07, y0 - 0.06), k.P(g.s, 0.07, yr + 0.02));
    if (g.window) win(k, { s: g.s, w: g.window.w ?? 0.9, h: g.window.h ?? 1.3, y: y0 + (g.window.y ?? 0.5), frame: g.window.frame, glass: g.window.glass, surround: g.window.surround, bars: g.window.bars ?? 1, sill: g.window.sill });
    if (g.finial) k.box('flat|#c9bfa6', g.s, 0.1, yr, yr + 0.5, 0.1, 0.1);
  }
  for (const t of it.drums || []) drum(k, t);
  for (const c of it.cones || []) cone(k, c);
  // a round clock face on the wall: { s, d, y, r }
  for (const c of it.clocks || []) {
    const n = 14, r = c.r ?? 0.35;
    for (let i = 0; i < n; i++) { const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n;
      k.tri('flat|#6d6a63', k.P(c.s + (r + 0.12) * Math.cos(a0), c.d, c.y + (r + 0.12) * Math.sin(a0)), k.P(c.s + (r + 0.12) * Math.cos(a1), c.d, c.y + (r + 0.12) * Math.sin(a1)), k.P(c.s, c.d, c.y));
      k.tri('flat|#f1efe6', k.P(c.s + r * Math.cos(a0), c.d + 0.02, c.y + r * Math.sin(a0)), k.P(c.s + r * Math.cos(a1), c.d + 0.02, c.y + r * Math.sin(a1)), k.P(c.s, c.d + 0.02, c.y)); }
    k.box('flat|#222', c.s, c.d + 0.04, c.y, c.y + r * 0.8, 0.015, 0.01); k.box('flat|#222', c.s + r * 0.3, c.d + 0.04, c.y - 0.02, c.y + 0.02, r * 0.3, 0.01);
  }
  for (const f of it.fronts || []) {
    const y0 = f.y0 ?? 3.05, y1 = f.y1 ?? 3.95, cs = (f.s0 + f.s1) / 2, hs = (f.s1 - f.s0) / 2;
    if (f.fascia) k.box('flat|' + f.fascia, cs, 0.14, y0, y1, hs, 0.12);
    if (f.plinth) k.box('flat|' + f.plinth, cs, 0.1, 0, f.plinthH ?? 0.45, hs, 0.07);
    const gs = f.s0 + (f.inset ?? 0.25), ge = f.s1 - (f.inset ?? 0.25); k.quad('glass|' + (f.glass || '#27323a'), gs, ge, f.gy0 ?? 0.45, y0 - 0.08, 0.17);
    const n = Math.max(1, Math.round((ge - gs) / (f.bay ?? 1.7))); for (let i = 0; i <= n; i++) k.box('flat|' + (f.frame || f.fascia || '#222'), gs + ((ge - gs) * i) / n, 0.19, f.gy0 ?? 0.4, y0 - 0.05, f.bw ?? 0.04, f.bw ?? 0.04);
    if (f.door) k.quad('glass|' + (f.doorGlass || '#1c242a'), f.door - 0.6, f.door + 0.6, 0.1, 2.3, 0.2);
  }
  for (const dm of it.dormers || []) {
    const pitch = dm.pitch ?? it.pitch ?? 0.72, w = dm.w ?? 1.7, i0 = dm.inset ?? 0.7, s = dm.s, yb = H + i0 * pitch - 0.12, yt = yb + (dm.h ?? 1.35), yr = yt + 0.62;
    const dF = -i0, dS = -(yt - H) / pitch, dE = -(yr - H) / pitch, a = s - w / 2, b = s + w / 2, fr = 'flat|' + (dm.col || WHITE), sl = 'flat|' + (dm.roof || '#3d4046');
    k.quad(fr, a, b, yb, yt, dF); k.tri(fr, k.P(a, dF, yt), k.P(b, dF, yt), k.P(s, dF, yr));
    k.quad('glass|#3d4a54', a + 0.22, b - 0.22, yb + 0.18, yt - 0.14, dF + 0.03); k.box(fr, s, dF + 0.04, yb + 0.18, yt - 0.14, 0.025, 0.01);
    for (const x of [a, b]) k.tri(sl, k.P(x, dF, yb), k.P(x, dF, yt), k.P(x, dS, yt));
    k.quadW(sl, k.P(a - 0.08, dF + 0.1, yt), k.P(s, dF + 0.1, yr + 0.06), k.P(s, dE, yr + 0.06), k.P(a - 0.08, dS, yt));
    k.quadW(sl, k.P(s, dF + 0.1, yr + 0.06), k.P(b + 0.08, dF + 0.1, yt), k.P(b + 0.08, dS, yt), k.P(s, dE, yr + 0.06));
  }
  for (const c of it.chimneys || []) {
    const pitch = c.pitch ?? it.pitch ?? 0.72, i = c.inset ?? 2.6, y = H + i * pitch, top = y + (c.rise ?? 1.7);
    k.box('brick|' + (c.tint || '#c9a08c'), c.s, -i, y - 0.5, top, 0.36, 0.27); k.box('flat|#cfc9b9', c.s, -i, top, top + 0.1, 0.43, 0.33);
    for (const o of [-0.17, 0.17]) k.box('flat|#a05f3d', c.s + o, -i, top + 0.1, top + 0.56, 0.07, 0.07);
  }
  for (const w of it.extraBoxes || []) k.box('flat|' + w.col, w.s, w.d ?? 0.1, w.y0, w.y1, w.hs, w.hd ?? 0.05);
  k.flush();
}

/** Felixstowe Methodist (Trinity) church: the west gable end on Hamilton Road. Flint walls are the base building's own; this adds the
 *  cream-stone buttresses, lancets, rose window, string courses and the gabled porch with the bright blue double door. */
function churchImpl(K, it) {
  const k = kit(K, it), L = k.L, CR = '#d9cdae', CRD = '#c3b794', DK = '#2e3a4a', RS = it.rs ?? 6.4;
  // buttresses at both corners of the gable end and between the porch and the nave
  for (const s of [0.45, 9.25]) { k.box('flat|' + CR, s, 0.34, 0, 4.7, 0.42, 0.34); k.box('flat|' + CR, s, 0.5, 4.7, 5.1, 0.34, 0.26); k.box('flat|' + CRD, s, 0.4, 5.1, 5.3, 0.3, 0.2); }
  // plinth and string courses
  k.box('flat|' + CRD, L / 2 - 1.2, 0.07, 0, 0.55, L / 2 - 1.2, 0.07);
  k.box('flat|' + CR, 4.7, 0.1, 4.25, 4.5, 4.4, 0.1);
  k.box('flat|' + CR, RS, 0.14, 5.3, 5.55, 2.1, 0.14); for (let s = RS - 2.0; s < RS + 2.05; s += 0.3) k.box('flat|' + CRD, s, 0.2, 5.12, 5.3, 0.07, 0.07);
  // three lancets under the rose
  for (const s of [RS - 2.8, RS, RS + 2.8]) {
    k.quad('flat|' + CR, s - 0.62, s + 0.62, 1.1, 3.35, 0.05); pointFan(k, 'flat|' + CR, s, 3.35, 0.62, 0.05, 1.0);
    k.quad('glass|#1f2630', s - 0.4, s + 0.4, 1.35, 3.3, 0.09); pointFan(k, 'glass|#1f2630', s, 3.3, 0.4, 0.09, 1.0);
    k.box('flat|#171b20', s, 0.1, 1.35, 3.7, 0.02, 0.01); for (const y of [2.0, 2.7]) k.box('flat|#171b20', s, 0.1, y, y + 0.04, 0.4, 0.01);
    k.box('flat|' + CRD, s, 0.12, 1.0, 1.1, 0.7, 0.1);
  }
  // rose window: cream surround, dark glass, eight petal lobes and a hub
  const ry = it.roseY ?? 7.6, R0 = 1.95, R1 = 1.55, n = 28;
  for (let i = 0; i < n; i++) {
    const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, c = (r, a) => k.P(RS + r * Math.cos(a), 0.07, ry + r * Math.sin(a));
    k.quadW('flat|' + CR, c(R1, a0), c(R0, a0), c(R0, a1), c(R1, a1));
    k.tri('glass|#27303a', k.P(RS, 0.08, ry), c(R1, a0), c(R1, a1));
  }
  for (let j = 0; j < 8; j++) { // tracery: eight lobes ringed in cream round a hub
    const a = Math.PI * 2 * j / 8, cs = RS + 0.98 * Math.cos(a), cy = ry + 0.98 * Math.sin(a), m = 10;
    for (let i = 0; i < m; i++) { const b0 = 2 * Math.PI * i / m, b1 = 2 * Math.PI * (i + 1) / m;
      k.tri('flat|' + CR, k.P(cs + 0.5 * Math.cos(b0), 0.1, cy + 0.5 * Math.sin(b0)), k.P(cs + 0.5 * Math.cos(b1), 0.1, cy + 0.5 * Math.sin(b1)), k.P(cs, 0.1, cy));
      k.tri('glass|#1c2430', k.P(cs + 0.4 * Math.cos(b0), 0.11, cy + 0.4 * Math.sin(b0)), k.P(cs + 0.4 * Math.cos(b1), 0.11, cy + 0.4 * Math.sin(b1)), k.P(cs, 0.11, cy)); }
  }
  for (let i = 0; i < 12; i++) { const a0 = 2 * Math.PI * i / 12, a1 = 2 * Math.PI * (i + 1) / 12; k.tri('flat|' + CR, k.P(RS + 0.42 * Math.cos(a0), 0.12, ry + 0.42 * Math.sin(a0)), k.P(RS + 0.42 * Math.cos(a1), 0.12, ry + 0.42 * Math.sin(a1)), k.P(RS, 0.12, ry)); }
  // small slit light high in the gable
  k.quad('glass|#1c2430', RS - 0.1, RS + 0.1, ry + 2.5, ry + 3.1, 0.07);
  // the porch: stone gabled box with a pointed arched doorway and the blue double door
  const ps = it.porchS ?? 11.0, pw = 3.0, pd = 1.7, ph = 3.5, pr = 1.9; // centre s, width, depth, wall height, gable rise
  const sw = 'flint|#d6d0c4';
  k.quad(sw, ps - pw / 2, ps + pw / 2, 0, ph, pd, [3.2, 2.9]);
  for (const sd of [-1, 1]) { const x = ps + sd * pw / 2; const a = k.P(x, 0, 0), b = k.P(x, pd, 0), c = k.P(x, pd, ph), d = k.P(x, 0, ph); k.quadW(sw, a, b, c, d); k.tri(sw, k.P(x, 0, ph), k.P(x, pd, ph), k.P(x, pd / 2, ph + pr * 0.5)); }
  k.triUV(sw, k.P(ps - pw / 2, pd, ph), k.P(ps + pw / 2, pd, ph), k.P(ps, pd, ph + pr), [0, 0], [pw / 3.2, 0], [pw / 6.4, pr / 2.9]);
  const sl = 'flat|#474b52';
  k.quadW(sl, k.P(ps - pw / 2 - 0.15, -0.1, ph - 0.1), k.P(ps - pw / 2 - 0.15, pd + 0.12, ph - 0.1), k.P(ps, pd + 0.12, ph + pr + 0.05), k.P(ps, -0.1, ph + pr * 0.5 + 0.2));
  k.quadW(sl, k.P(ps, -0.1, ph + pr * 0.5 + 0.2), k.P(ps, pd + 0.12, ph + pr + 0.05), k.P(ps + pw / 2 + 0.15, pd + 0.12, ph - 0.1), k.P(ps + pw / 2 + 0.15, -0.1, ph - 0.1));
  k.tri('flat|' + CR, k.P(ps - pw / 2 - 0.1, pd + 0.06, ph - 0.1), k.P(ps - pw / 2 + 0.25, pd + 0.06, ph - 0.1), k.P(ps, pd + 0.06, ph + pr + 0.03));
  k.tri('flat|' + CR, k.P(ps + pw / 2 + 0.1, pd + 0.06, ph - 0.1), k.P(ps + pw / 2 - 0.25, pd + 0.06, ph - 0.1), k.P(ps, pd + 0.06, ph + pr + 0.03));
  // doorway: cream reveal, pointed arch, blue leaves, black strap hinges
  const dw = 1.05;
  k.quad('flat|' + CR, ps - dw - 0.28, ps + dw + 0.28, 0, 2.55, pd + 0.04); pointFan(k, 'flat|' + CR, ps, 2.55, dw + 0.28, pd + 0.04, 0.95);
  k.quad('flat|#cdbf9e', ps - dw - 0.1, ps + dw + 0.1, 0.12, 2.5, pd + 0.06); pointFan(k, 'flat|#cdbf9e', ps, 2.5, dw + 0.1, pd + 0.06, 0.95);
  k.quad('flat|#2f78d6', ps - dw, ps + dw, 0.15, 2.45, pd + 0.1); pointFan(k, 'flat|#2f78d6', ps, 2.45, dw, pd + 0.1, 0.95);
  for (let i = -3; i <= 3; i++) k.box('flat|#2467bd', ps + i * 0.3, pd + 0.11, 0.15, 2.45, 0.01, 0.005); // door boards
  k.box('flat|#14181c', ps, pd + 0.12, 0.15, 2.9, 0.012, 0.006); // meeting stile
  for (const y of [0.55, 1.35, 2.1]) for (const sd of [-1, 1]) { k.box('flat|#14181c', ps + sd * 0.55, pd + 0.13, y, y + 0.09, 0.42, 0.01); k.box('flat|#14181c', ps + sd * 0.95, pd + 0.13, y - 0.07, y + 0.16, 0.05, 0.01); }
  k.box('flat|' + CRD, ps, pd * 0.5, 0, 0.18, dw + 0.5, pd * 0.5 + 0.2); // step
  // wall-mounted bench row and the church notice board
  for (const s of [2.2, 6.0, 8.2]) { k.box('flat|#4a3523', s, 1.25, 0.42, 0.5, 0.9, 0.22); k.box('flat|#4a3523', s, 1.5, 0.5, 1.0, 0.9, 0.04); for (const o of [-0.8, 0.8]) k.box('flat|#222', s + o, 1.25, 0, 0.42, 0.03, 0.18); }
  k.flush();
}
export const FEATURES = {
  a19Row(K, it) { rowImpl(K, it, kit(K, it)); },
  church(K, it) { churchImpl(K, it); },
};
