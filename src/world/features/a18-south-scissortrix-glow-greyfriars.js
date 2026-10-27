// Area a18-south-scissortrix-glow-greyfriars: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// West side of Hamilton Road at the south end (Scissor Trix on the corner, Livia's, Nutshells, Glow / Studio8, Blue Naan,
// China Palace, Greyfriars), from the Street View photos in docs/research/hamilton-road-streetview (k-*.png).
// One generic feature, `southRow`, draws everything above and around the shop fronts: brick / painted skins laid over the
// base wall, sash windows, bays, cornices, bands, gables, front dormers, pitched roof prisms, pent roofs, awnings, doors,
// glazed shop fronts and painted lettering. Positions are metres along the street face from the SOUTH end of the edge it.edge.
// (The shared street-edge finder only knows about car roads, so each call carries its own street face.)
// Dimensions are scaled from the photos (a door, a sash window or a person for scale); they are estimates, not surveyed.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const WHITE = '#efece4', BLACK = '#17181b';

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
  const triUV = (key, a, b, c, ua, ub, uc) => { const gg = G(key), n = gg.p.length / 3; gg.p.push(...a, ...b, ...c); gg.uv.push(...ua, ...ub, ...uc); gg.idx.push(n, n + 1, n + 2); };
  const quadW = (key, a, b, c, d) => G(key).quad(a, b, c, d);
  const texts = [];
  const flush = () => {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide });
      else if (kind === 'brick') mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: col, roughness: 1, side: THREE.DoubleSide });
      else if (kind === 'stock') { const t = Textures.facadeTexture('brick_yellow', false, 62, 0); mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: col, roughness: 1, side: THREE.DoubleSide }); }
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: kind === 'metal' ? 0.4 : 0.8, metalness: kind === 'metal' ? 0.5 : 0, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a18:' + key; K.extra.push(me); }
    }
    for (const t of texts) { const me = t.geo.mesh(t.mat); if (me) { me.name = 'frontage:a18:text'; K.extra.push(me); } }
  };
  return { L, P, box, quad, tri, triUV, quadW, texts, flush };
}

/** A sash window: surround, dark glass, glazing bars, sill. Optional arched head (arch). */
function win(k, w) {
  const s = w.s, hw = (w.w || 1.1) / 2, y0 = w.y, h = w.h || 1.7, y1 = y0 + h, fr = 'flat|' + (w.frame || WHITE), gl = 'glass|' + (w.glass || '#3d4a54');
  const sur = w.surround === false ? 0 : (w.surround ?? 0.09);
  if (sur) {
    if (w.arch) { k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 - hw, 0.05); archFan(k, fr, s, y1 - hw, hw + sur, 0.05); }
    else k.quad(fr, s - hw - sur, s + hw + sur, y0 - sur, y1 + sur, 0.05);
  }
  if (w.arch) { k.quad(gl, s - hw, s + hw, y0, y1 - hw, 0.08); archFan(k, gl, s, y1 - hw, hw, 0.08); }
  else k.quad(gl, s - hw, s + hw, y0, y1, 0.08);
  const bars = w.bars ?? 1, bw = 0.03;
  for (let i = 1; i <= bars; i++) k.box(fr, s, 0.09, y0 + (h * i) / (bars + 1) - bw, y0 + (h * i) / (bars + 1) + bw, hw, 0.02);
  if (w.mull ?? hw > 0.62) k.box(fr, s, 0.09, y0, y1, 0.03, 0.02);
  if (w.mull2) for (const f of [-1 / 3, 1 / 3]) k.box(fr, s + 2 * hw * f, 0.09, y0, y1, 0.03, 0.02);
  if (w.sill !== false && sur) k.box(fr, s, 0.11, y0 - sur - 0.07, y0 - sur, hw + sur + 0.08, 0.09);
  if (w.rail) { // Juliet rail: two black bars and uprights across the lower sash
    const rc = 'flat|' + BLACK, ry = y0 + 0.05;
    k.box(rc, s, 0.17, ry + 0.55, ry + 0.6, hw + 0.08, 0.02); k.box(rc, s, 0.17, ry, ry + 0.04, hw + 0.08, 0.02);
    for (let x = s - hw; x <= s + hw + 0.01; x += 0.2) k.box(rc, x, 0.17, ry, ry + 0.58, 0.012, 0.012);
  }
}
function archFan(k, key, s, yc, r, d, n = 8) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    k.tri(key, k.P(s, d, yc), k.P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), k.P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1)));
  }
}

function cornice(k, H, L, c) {
  const y = c.y ?? H, a = c.s0 ?? 0, b = c.s1 ?? L - 0.2, col = 'flat|' + (c.col || WHITE), out = c.out ?? 0.32, hh = c.h ?? 0.2;
  k.box(col, (a + b) / 2, out / 2, y - hh, y + 0.05, (b - a) / 2, out / 2);
  if (c.dentils) for (let s = a + 0.12; s < b - 0.05; s += 0.34) k.box(col, s, out * 0.5, y - hh - 0.14, y - hh, 0.07, out * 0.4);
}

/** Shop front: fascia board (behind the automatic business sign, which sits at d 0.03-0.13 and y 2.9-3.56), plinth, piers, glazing. */
function front(k, f) {
  const y0 = f.y0 ?? 2.85, y1 = f.y1 ?? 3.95, fa = 'flat|' + f.fascia, fr = 'flat|' + (f.frame || f.fascia), pl = f.plinth ?? 0.5;
  k.quad(fa, f.s0, f.s1, y0, y1, 0.05);
  if (f.wall) k.quad('flat|' + f.wall, f.s0, f.s1, pl, y0, 0.055);
  k.quad('flat|' + (f.plinthCol || f.frame || f.fascia), f.s0, f.s1, 0, pl, 0.06);
  for (const s of [f.s0 + 0.1, f.s1 - 0.1]) k.box(fr, s, 0.08, 0, y0, 0.1, 0.07);
  for (const gz of f.glaze || []) {
    const gy0 = gz.y0 ?? pl, gy1 = gz.y1 ?? y0 - 0.12;
    if (gz.frost) k.quad('flat|' + gz.frost, gz.s0, gz.s1, gy0, gy1, 0.07); else k.quad('glass|' + (gz.col || '#27323a'), gz.s0, gz.s1, gy0, gy1, 0.07);
    if (gz.board) k.quad('flat|' + gz.board, gz.s0, gz.s1, gy1 - (gz.boardH ?? 0.7), gy1, 0.075);
    const n = Math.max(1, Math.round((gz.s1 - gz.s0) / (gz.bay ?? 1.7)));
    for (let i = 0; i <= n; i++) k.box(fr, gz.s0 + ((gz.s1 - gz.s0) * i) / n, 0.1, gy0, gy1, 0.035, 0.035);
    k.box(fr, (gz.s0 + gz.s1) / 2, 0.1, gy1 - 0.05, gy1, (gz.s1 - gz.s0) / 2, 0.035);
  }
}

/** A street door with optional fanlight, panels and a step. */
function door(k, d) {
  const hw = (d.w ?? 0.95) / 2, h = d.h ?? 2.2, fr = 'flat|' + (d.frame || BLACK), col = 'flat|' + d.col;
  k.quad(fr, d.s - hw - 0.1, d.s + hw + 0.1, 0, h + 0.08, 0.05);
  if (d.fan) archFan(k, fr, d.s, h + 0.08, hw + 0.1, 0.05);
  k.quad(col, d.s - hw, d.s + hw, 0.04, h, 0.08);
  if (d.fan) { k.quad('glass|#4b5963', d.s - hw, d.s + hw, h, h + 0.08, 0.09); archFan(k, 'glass|#4b5963', d.s, h + 0.08, hw, 0.09); archFan(k, fr, d.s, h + 0.08, hw * 0.12, 0.1); }
  if (d.glass) k.quad('glass|' + d.glass, d.s - hw * 0.7, d.s + hw * 0.7, 1.1, h - 0.15, 0.1);
  else for (const [a, b] of [[0.2, 1.0], [1.15, 2.0]]) { const lite = new THREE.Color(d.col).offsetHSL(0, 0, 0.05).getStyle(); k.box('flat|' + lite, d.s, 0.095, Math.min(a, h - 0.4), Math.min(b, h - 0.15), hw * 0.65, 0.012); }
  k.box('flat|' + (d.step || '#7d7a72'), d.s, 0.3, 0, 0.1, hw + 0.2, 0.28);
  if (d.handle !== false) k.box('metal|#b8b4a8', d.s + hw * 0.7, 0.11, 1.0, 1.08, 0.03, 0.03);
}

/** Painted lettering (canvas texture). */
function paint(k, p) {
  if (typeof document === 'undefined') return;
  const aspect = (p.w) / (p.h), W = 1024, Hh = Math.max(32, Math.round(W / aspect));
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  const fs = Hh * 0.9; g.font = `${p.weight || 'bold'} ${fs}px ${p.font || 'Georgia, serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = p.col || '#2a2c30';
  const tw = g.measureText(p.text).width; if (tw > W * 0.98) g.font = `${p.weight || 'bold'} ${fs * (W * 0.98) / tw}px ${p.font || 'Georgia, serif'}`;
  g.fillText(p.text, W / 2, Hh / 2 + Hh * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new Geo(); const d = p.d ?? 0.075, s0 = p.s - p.w / 2, s1 = p.s + p.w / 2;
  geo.quad(k.P(s0, d, p.y), k.P(s1, d, p.y), k.P(s1, d, p.y + p.h), k.P(s0, d, p.y + p.h), [[0, 0], [1, 0], [1, 1], [0, 1]]);
  k.texts.push({ geo, mat: new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }) });
}

export const FEATURES = {
  southRow(K, it) {
    const k = kit(K, it), H = it.H ?? K.H, L = k.L, ytop = it.ytop ?? H;
    // brick / painted skins over the base wall (hide the base building's own windows): { s0, s1, mat: '#rrggbb' | 'brick' | 'stock', y0, y1, tint }
    for (const p of it.skins || []) {
      const y0 = p.y0 ?? 3.58, y1 = p.y1 ?? ytop;
      if (p.mat === 'brick') k.quad('brick|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, 0.03, [3.2, 2.9]);
      else if (p.mat === 'stock') k.quad('stock|' + (p.tint || '#ffffff'), p.s0, p.s1, y0, y1, 0.03, [3.2, 2.9]);
      else k.quad('flat|' + p.mat, p.s0, p.s1, y0, y1, 0.03);
    }
    // solid masses standing on the wall top (a raised party wall or gable shoulder): { s0, s1, y0, y1, depth, mat, tint, side }
    for (const b of it.blocks || []) {
      const sd = 'flat|' + (b.side || '#9c4b30'), dp = b.depth ?? 4;
      if (b.mat === 'brick') k.quad('brick|' + (b.tint || '#ffffff'), b.s0, b.s1, b.y0, b.y1, 0.02, [3.2, 2.9]); else k.quad('flat|' + (b.mat || WHITE), b.s0, b.s1, b.y0, b.y1, 0.02);
      k.quadW(sd, k.P(b.s0, 0.02, b.y1), k.P(b.s1, 0.02, b.y1), k.P(b.s1, -dp, b.y1), k.P(b.s0, -dp, b.y1));
      k.quadW(sd, k.P(b.s0, 0.02, b.y0), k.P(b.s0, 0.02, b.y1), k.P(b.s0, -dp, b.y1), k.P(b.s0, -dp, b.y0));
      k.quadW(sd, k.P(b.s1, 0.02, b.y0), k.P(b.s1, 0.02, b.y1), k.P(b.s1, -dp, b.y1), k.P(b.s1, -dp, b.y0));
    }
    for (const fr of it.fronts || []) front(k, fr);
    for (const d of it.doors || []) door(k, d);
    for (const w of it.windows || []) win(k, w);
    for (const c of it.cornices || [{}]) if (it.cornices !== false) cornice(k, H, L, c);
    // string courses / bands: { y0, y1, s0, s1, col, out }
    for (const b of it.bands || []) k.box('flat|' + (b.col || WHITE), ((b.s0 ?? 0.2) + (b.s1 ?? L - 0.2)) / 2, (b.out ?? 0.1) / 2 + 0.02, b.y0, b.y1, ((b.s1 ?? L - 0.2) - (b.s0 ?? 0.2)) / 2, (b.out ?? 0.1) / 2);
    // projecting bays (flat-fronted or canted): { s, w, y0, y1, depth, frame, cap, canted }
    for (const b of it.bays || []) {
      const hw = b.w / 2, dp = b.depth ?? 0.55, fr = 'flat|' + (b.frame || WHITE), gl = 'glass|' + (b.glass || '#3d4a54'), n = b.panes ?? Math.max(2, Math.round(b.w / 0.9));
      if (b.canted) { // three-sided: front face narrower, two angled cheeks
        const fw = hw * 0.55, P = k.P;
        k.quadW(fr, P(b.s - hw, 0.03, b.y0), P(b.s - fw, dp, b.y0), P(b.s - fw, dp, b.y1), P(b.s - hw, 0.03, b.y1));
        k.quadW(fr, P(b.s + fw, dp, b.y0), P(b.s + hw, 0.03, b.y0), P(b.s + hw, 0.03, b.y1), P(b.s + fw, dp, b.y1));
        k.quadW(fr, P(b.s - fw, dp, b.y0), P(b.s + fw, dp, b.y0), P(b.s + fw, dp, b.y1), P(b.s - fw, dp, b.y1));
        k.quad(gl, b.s - fw + 0.08, b.s + fw - 0.08, b.y0 + 0.3, b.y1 - 0.3, dp + 0.02);
        k.quadW(gl, P(b.s - hw + 0.1, 0.06, b.y0 + 0.3), P(b.s - fw - 0.02, dp + 0.02, b.y0 + 0.3), P(b.s - fw - 0.02, dp + 0.02, b.y1 - 0.3), P(b.s - hw + 0.1, 0.06, b.y1 - 0.3));
        k.quadW(gl, P(b.s + fw + 0.02, dp + 0.02, b.y0 + 0.3), P(b.s + hw - 0.1, 0.06, b.y0 + 0.3), P(b.s + hw - 0.1, 0.06, b.y1 - 0.3), P(b.s + fw + 0.02, dp + 0.02, b.y1 - 0.3));
        for (const x of [-fw, 0, fw]) k.box(fr, b.s + x, dp + 0.03, b.y0 + 0.3, b.y1 - 0.3, 0.03, 0.03);
        k.box(fr, b.s, dp / 2 + 0.03, b.y1 - 0.02, b.y1 + 0.12, hw + 0.08, dp / 2 + 0.08);
        k.box(fr, b.s, dp / 2 + 0.03, b.y0 - 0.12, b.y0 + 0.02, hw + 0.04, dp / 2 + 0.04);
        continue;
      }
      k.box(fr, b.s, dp / 2 + 0.04, b.y0, b.y0 + 0.28, hw, dp / 2);
      k.box(fr, b.s, dp / 2 + 0.04, b.y1 - 0.3, b.y1, hw + 0.05, dp / 2 + 0.05);
      k.quad(gl, b.s - hw + 0.08, b.s + hw - 0.08, b.y0 + 0.28, b.y1 - 0.3, dp + 0.05);
      for (let i = 0; i <= n; i++) k.box(fr, b.s - hw + (b.w * i) / n, dp + 0.06, b.y0 + 0.28, b.y1 - 0.3, 0.035, 0.03);
      if (b.transom !== false) k.box(fr, b.s, dp + 0.06, (b.y0 + b.y1) / 2 - 0.03, (b.y0 + b.y1) / 2 + 0.03, hw, 0.03);
      for (const sd of [-1, 1]) k.box(fr, b.s + sd * hw, dp / 2 + 0.04, b.y0 + 0.28, b.y1 - 0.3, 0.025, dp / 2);
      if (b.cap) k.box('flat|' + b.cap, b.s, dp / 2 + 0.04, b.y1, b.y1 + 0.12, hw + 0.12, dp / 2 + 0.1);
    }
    // front gables over the wall top: { s, w, y0, rise, depth, mat, tint, coping, roof, fret }
    for (const g of it.gables || []) {
      const hw = g.w / 2, y0 = g.y0 ?? H, yr = y0 + g.rise, dp = g.depth ?? 8, roof = 'flat|' + (g.roof || '#3b3f46'), cop = 'flat|' + (g.coping || '#d8d0b8');
      const face = g.mat === 'brick' ? 'brick|' + (g.tint || '#ffffff') : g.mat === 'stock' ? 'stock|' + (g.tint || '#ffffff') : 'flat|' + (g.mat || WHITE);
      const A = k.P(g.s - hw, 0.04, y0 - 0.05), B = k.P(g.s + hw, 0.04, y0 - 0.05), C = k.P(g.s, 0.04, yr);
      k.triUV(face, A, B, C, [0, 0], [g.w / 3.2, 0], [g.w / 6.4, g.rise / 2.9]);
      const s1 = k.P(g.s - hw - 0.15, 0.24, y0 - 0.1), s2 = k.P(g.s, 0.24, yr + 0.08), s3 = k.P(g.s, -dp, yr + 0.08), s4 = k.P(g.s - hw - 0.15, -dp, y0 - 0.1);
      const t1 = k.P(g.s + hw + 0.15, 0.24, y0 - 0.1), t4 = k.P(g.s + hw + 0.15, -dp, y0 - 0.1);
      k.quadW(roof, s1, s2, s3, s4); k.quadW(roof, s2, t1, t4, s3);
      // bargeboards: a slim board up each slope
      const bw = g.board ?? 0.2;
      k.quadW(cop, k.P(g.s - hw - 0.16, 0.26, y0 - 0.1), k.P(g.s - hw - 0.16 + bw * 0.6, 0.26, y0 - 0.1 - bw), k.P(g.s, 0.26, yr + 0.08 - bw), k.P(g.s, 0.26, yr + 0.1));
      k.quadW(cop, k.P(g.s + hw + 0.16, 0.26, y0 - 0.1), k.P(g.s + hw + 0.16 - bw * 0.6, 0.26, y0 - 0.1 - bw), k.P(g.s, 0.26, yr + 0.08 - bw), k.P(g.s, 0.26, yr + 0.1));
      if (g.fret) { // scalloped / pierced fretwork under the bargeboards
        const n = Math.max(4, Math.round(g.w / 0.45)), col = 'flat|' + g.fret;
        for (const sd of [-1, 1]) for (let i = 1; i < n; i++) {
          const t = i / n, sx = g.s + sd * hw * (1 - t), sy = y0 - 0.05 + g.rise * t;
          k.tri(col, k.P(sx - 0.14, 0.2, sy - 0.12), k.P(sx + 0.14, 0.2, sy - 0.12), k.P(sx, 0.2, sy - 0.46));
        }
      }
    }
    // front dormers standing on the wall top, flush with the facade: { s, w, y0, wallH, rise, depth, front, barge, roof, win }
    for (const dm of it.dormers || []) {
      const w = dm.w ?? 1.7, hw = w / 2, yb = dm.y0 ?? H, yt = yb + (dm.wallH ?? 1.0), yr = yt + (dm.rise ?? 0.8), dp = dm.depth ?? 2.2;
      const fr = 'flat|' + (dm.front || WHITE), roof = 'flat|' + (dm.roof || '#3d4046'), bar = 'flat|' + (dm.barge || BLACK), s = dm.s;
      k.quad(fr, s - hw, s + hw, yb, yt, 0.05); k.tri(fr, k.P(s - hw, 0.05, yt), k.P(s + hw, 0.05, yt), k.P(s, 0.05, yr));
      const wc = dm.win || '#3d4a54', wf = 'flat|' + (dm.winFrame || WHITE);
      k.quad(wf, s - hw + 0.18, s + hw - 0.18, yb + 0.16, yt - 0.04, 0.07);
      k.quad('glass|' + wc, s - hw + 0.28, s + hw - 0.28, yb + 0.26, yt - 0.12, 0.09);
      k.box(wf, s, 0.1, yb + 0.26, yt - 0.12, 0.03, 0.02); k.box(wf, s, 0.1, (yb + yt) / 2 - 0.02, (yb + yt) / 2 + 0.04, hw - 0.28, 0.02);
      for (const sd of [-1, 1]) { const x = s + sd * hw; k.quadW(fr, k.P(x, 0.05, yb), k.P(x, -dp, yb), k.P(x, -dp, yt), k.P(x, 0.05, yt)); k.tri(roof, k.P(x, 0.05, yt), k.P(x, -dp, yt), k.P(x, -dp, yr)); }
      k.quadW(roof, k.P(s - hw - 0.1, 0.22, yt - 0.06), k.P(s, 0.22, yr + 0.06), k.P(s, -dp, yr + 0.06), k.P(s - hw - 0.1, -dp, yt - 0.06));
      k.quadW(roof, k.P(s, 0.22, yr + 0.06), k.P(s + hw + 0.1, 0.22, yt - 0.06), k.P(s + hw + 0.1, -dp, yt - 0.06), k.P(s, -dp, yr + 0.06));
      k.quadW(bar, k.P(s - hw - 0.12, 0.24, yt - 0.08), k.P(s - hw + 0.08, 0.24, yt - 0.26), k.P(s, 0.24, yr - 0.14), k.P(s, 0.24, yr + 0.08));
      k.quadW(bar, k.P(s + hw + 0.12, 0.24, yt - 0.08), k.P(s + hw - 0.08, 0.24, yt - 0.26), k.P(s, 0.24, yr - 0.14), k.P(s, 0.24, yr + 0.08));
      k.box(bar, s, 0.24, yr + 0.05, yr + 0.3, 0.02, 0.02);
    }
    // pitched roof prisms (ridge parallel to the street) over a flat base roof: { s0, s1, y0, rise, depth, col, hipL, hipR }
    for (const r of it.roofs || []) {
      const col = 'flat|' + (r.col || '#4a4d55'), dp = r.depth ?? 7, rd = dp / 2, y0 = r.y0 ?? H, yr = y0 + r.rise, ov = 0.28;
      k.quadW(col, k.P(r.s0 - 0.1, ov, y0 - 0.05), k.P(r.s1 + 0.1, ov, y0 - 0.05), k.P(r.s1 + 0.1, -rd, yr), k.P(r.s0 - 0.1, -rd, yr));
      k.quadW(col, k.P(r.s0 - 0.1, -rd, yr), k.P(r.s1 + 0.1, -rd, yr), k.P(r.s1 + 0.1, -dp, y0 - 0.05), k.P(r.s0 - 0.1, -dp, y0 - 0.05));
      for (const x of [r.s0 - 0.1, r.s1 + 0.1]) k.tri(col, k.P(x, ov, y0 - 0.05), k.P(x, -dp, y0 - 0.05), k.P(x, -rd, yr));
    }
    // pent (lean-to) roofs over a shop front: { s0, s1, y, rise, depth, col }
    for (const p of it.pents || []) {
      const col = 'flat|' + (p.col || '#c4703f'), r = p.rise ?? 0.5, dp = p.depth ?? 0.75;
      k.quadW(col, k.P(p.s0, dp, p.y), k.P(p.s1, dp, p.y), k.P(p.s1, 0.03, p.y + r), k.P(p.s0, 0.03, p.y + r));
      k.quad('flat|' + (p.edge || '#9a5230'), p.s0, p.s1, p.y - 0.1, p.y + 0.03, dp);
      for (const x of [p.s0, p.s1]) k.tri(col, k.P(x, dp, p.y), k.P(x, 0.03, p.y), k.P(x, 0.03, p.y + r));
      for (let s = p.s0 + 0.12; s < p.s1; s += 0.2) k.box('flat|' + (p.rib || '#a9592f'), s, dp / 2, p.y + (r * (dp - 0.35)) / dp * 0.5 - 0.02, p.y + (r * (dp - 0.35)) / dp * 0.5 + 0.03, 0.012, dp / 2 - 0.15);
    }
    // sloping shop awning: { s0, s1, y, depth, col }
    for (const a of it.awnings || []) {
      const col = 'flat|' + (a.col || BLACK), dp = a.depth ?? 1.0;
      k.quadW(col, k.P(a.s0, 0.04, a.y + 0.45), k.P(a.s1, 0.04, a.y + 0.45), k.P(a.s1, dp, a.y), k.P(a.s0, dp, a.y)); k.quad(col, a.s0, a.s1, a.y - 0.18, a.y, dp);
      for (const x of [a.s0, a.s1]) k.tri(col, k.P(x, 0.04, a.y + 0.45), k.P(x, dp, a.y), k.P(x, 0.04, a.y));
    }
    for (const t of it.paints || []) paint(k, t);
    for (const c of it.chimneys || []) {
      const pitch = c.pitch ?? it.pitch ?? 0.72, i = c.inset ?? 2.6, y = H + i * pitch, top = y + (c.rise ?? 1.7), col = c.col || '#8c4f3b';
      k.box('flat|' + col, c.s, -i, y - 0.5, top, 0.36, 0.27); k.box('flat|#cfc9b9', c.s, -i, top, top + 0.1, 0.43, 0.33);
      for (const o of [-0.17, 0.17]) k.box('flat|#a05f3d', c.s + o, -i, top + 0.1, top + 0.56, 0.07, 0.07);
    }
    for (const w of it.extraBoxes || []) k.box('flat|' + w.col, w.s, w.d ?? 0.1, w.y0, w.y1, w.hs, w.hd ?? 0.05);
    k.flush();
  },
};
