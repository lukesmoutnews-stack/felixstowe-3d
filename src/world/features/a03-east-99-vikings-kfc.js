// Area a03-east-99-vikings-kfc: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// The Edwardian red-brick terrace on the west side of upper Hamilton Road, from GSK News & Booze and No. 99 up to 127 Vintage
// (Street View photos e-palace-side-busstop .. e-kfc-nailsspa-127vintage, supplied 26 Oct 2026). One feature, `a03`, builds a whole
// plot from a spec in content/frontage-parts/a03-east-99-vikings-kfc.js: a pitched slate roof with the ridge parallel to the street
// (the footprint is drawn flat in OSM), gable infill at the ends, white sash windows and canted oriel bays on the first floor,
// dormers with their own cheeks and roofs, chimney stacks, and the glazed shopfronts with piers, risers and awnings.
// All dimensions are scaled from the photos (a door is about 2.1 m, a window head about 6 m), not surveyed. Spec s-values are
// metres from the south end of the street edge, measured on a reference edge length `ref` and rescaled to the real edge.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';
import { triangulate } from '../accum.js';

const BAY_W = 3.2, STOREY_H = 2.9;
const PARAPET = 0.45; // the building code draws a 0.45 m parapet above every flat-roofed wall; the real eaves line sits on top of it
const WHITE = '#f3f1ea', CREAM = '#e9e4d6', GLASS = '#6f8caa!g', CURT = '#c9d0da', SHOPGLASS = '#4f6676!g', DARKGLASS = '#262d34!g';

// ---- materials (cached; DoubleSide so winding never matters) ----
const MC = new Map();
function mat(key) {
  let m = MC.get(key); if (m) return m;
  const hasDoc = typeof document !== 'undefined';
  if (key === 'brick') {
    const o = { roughness: 1, side: THREE.DoubleSide };
    if (hasDoc) { const t = Textures.facadeTexture('brick_red', false, 61, 0); o.map = t.map; o.normalMap = t.normalMap; }
    m = new THREE.MeshStandardMaterial(o); m.color.setRGB(1.2, 0.95, 0.85);
  } else if (key.startsWith('slate') || key.startsWith('clay')) {
    const [kind, hex, lift] = key.split(':'); const o = { roughness: 0.9, side: THREE.DoubleSide };
    if (hasDoc) { const t = Textures.roofTexture(kind, 5); o.map = t.map; o.normalMap = t.normalMap; }
    m = new THREE.MeshStandardMaterial(o); m.color.set(hex || '#ffffff'); const k = parseFloat(lift || '1.5'); m.color.multiplyScalar(k);
  } else {
    const [hex, flag] = key.split('!');
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: flag === 'g' ? 0.12 : flag === 'm' ? 0.35 : 0.8, metalness: flag === 'g' ? 0.25 : flag === 'm' ? 0.6 : 0, side: THREE.DoubleSide });
  }
  MC.set(key, m); return m;
}

function makeAcc(K) {
  const geos = new Map(), e = K.e;
  const g = (k) => { let x = geos.get(k); if (!x) geos.set(k, x = new Geo()); return x; };
  const A = {
    P: K.P,
    box(k, s, d, y, hs, hd, hy) { const p = K.P(s, d, y); g(k).box(p[0], p[1], p[2], e.ux, e.uz, hs, hy, hd); },
    quad(k, a, b, c, d, uv) { g(k).quad(a, b, c, d, uv); },
    tri(k, a, b, c) { g(k).tri(a, b, c); },
    rect(k, s0, s1, d, y0, y1, uv) { g(k).quad(K.P(s0, d, y0), K.P(s1, d, y0), K.P(s1, d, y1), K.P(s0, d, y1), uv); },
    brickRect(s0, s1, d, y0, y1) { g('brick').quad(K.P(s0, d, y0), K.P(s1, d, y0), K.P(s1, d, y1), K.P(s0, d, y1), [[s0 / BAY_W, y0 / STOREY_H], [s1 / BAY_W, y0 / STOREY_H], [s1 / BAY_W, y1 / STOREY_H], [s0 / BAY_W, y1 / STOREY_H]]); },
    flush() { for (const [k, geo] of geos) { const me = geo.mesh(mat(k)); if (me) { me.name = 'frontage:a03'; K.extra.push(me); } } },
  };
  return A;
}

// ---- roof ----
function clipPoly(poly, f) { // Sutherland-Hodgman against f(p) >= 0
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

/** Roof height above the eaves at depth d (d < 0 is into the building): up the front slope to the ridge, down the back slope. */
const rise = (d, p, R) => (d >= -R ? Math.max(-0.25, p * -d) : d >= -2 * R ? p * (d + 2 * R) : 0);

function roof(A, K, it, ring) {
  const e = K.e, a = e.a, H = K.H + PARAPET, p = it.pitch || 0.72;
  const loc = ring.map((v) => [(v[0] - a[0]) * e.ux + (v[1] - a[1]) * e.uz, (v[0] - a[0]) * e.nx + (v[1] - a[1]) * e.nz]);
  const depth = Math.max(...loc.map((v) => -v[1]));
  const R = Math.max(1.8, Math.min(it.run || 3.6, depth / 2 - 0.4));
  const rk = it.roofMat || 'slate:#ffffff:1.5';
  // slope surface, eaves overhanging the front by 0.3 m
  const ext = loc.map(([s, d]) => [s, d > -0.3 ? 0.3 : d]);
  const front = clipPoly(ext, (v) => v[1] + R);                                         // d >= -R, out to the 0.3 m overhang
  const back = clipPoly(clipPoly(ext, (v) => -R - v[1]), (v) => v[1] + 2 * R);        // -2R <= d <= -R
  const Y = (d) => H + rise(d, p, R);
  const slope = Math.sqrt(1 + p * p);
  for (const poly of [front, back]) {
    if (poly.length < 3) continue;
    const { verts, tris } = triangulate(poly);
    for (const [i, j, k] of tris) {
      const q = [verts[i], verts[j], verts[k]];
      const pt = (v) => K.P(v[0], v[1], Y(v[1]));
      const uv = (v) => [v[0] / 2, (v[1] < -R ? -(v[1] + 2 * R) : -v[1]) * slope / 2];
      A.quad(rk, pt(q[0]), pt(q[1]), pt(q[2]), pt(q[2]), [uv(q[0]), uv(q[1]), uv(q[2]), uv(q[2])]);
    }
  }
  // gable infill on every wall that is not the street front (party walls and flank walls)
  for (let i = 0; i < loc.length; i++) {
    const u = loc[i], v = loc[(i + 1) % loc.length];
    if (Math.abs(v[1] - u[1]) < 0.4) continue; // runs along the street: no infill
    const ts = [0, 1];
    for (const dk of [-R, -2 * R]) { const t = (dk - u[1]) / (v[1] - u[1]); if (t > 0.001 && t < 0.999) ts.push(t); }
    ts.sort((x, y) => x - y);
    const pts = ts.map((t) => ({ s: u[0] + (v[0] - u[0]) * t, d: u[1] + (v[1] - u[1]) * t, t }));
    const len = Math.hypot(v[0] - u[0], v[1] - u[1]);
    for (let k = 0; k + 1 < pts.length; k++) {
      const P0 = pts[k], P1 = pts[k + 1], r0 = Math.max(0, rise(P0.d, p, R)), r1 = Math.max(0, rise(P1.d, p, R));
      if (r0 < 0.01 && r1 < 0.01) continue;
      const uA = P0.t * len / BAY_W, uB = P1.t * len / BAY_W;
      A.quad('brick', K.P(P0.s, P0.d, H - 0.02), K.P(P1.s, P1.d, H - 0.02), K.P(P1.s, P1.d, H + r1), K.P(P0.s, P0.d, H + r0), [[uA, 0], [uB, 0], [uB, r1 / STOREY_H], [uA, r0 / STOREY_H]]);
    }
  }
  return { R, p };
}

// ---- windows ----
function sash(A, s, sill, w, h, k = 'one', o = {}) {
  const fr = o.frame || WHITE, glass = o.curtain ? CURT : (o.glass || GLASS);
  A.box(fr, s, 0.05, sill + h / 2, w / 2 + 0.07, 0.05, h / 2 + 0.07);       // frame and reveal block, face at d = 0.10
  A.rect(glass, s - w / 2, s + w / 2, 0.115, sill, sill + h);
  const n = k === 'three' ? 3 : k === 'two' ? 2 : 1;
  for (let i = 1; i < n; i++) A.box(fr, s - w / 2 + (w * i) / n, 0.12, sill + h / 2, 0.03, 0.025, h / 2);
  A.box(fr, s, 0.12, sill + h * (o.rail ?? 0.5), w / 2, 0.025, 0.03);         // meeting rail
  A.box(o.sillCol || CREAM, s, 0.12, sill - 0.09, w / 2 + 0.12, 0.12, 0.04);  // projecting sill
  if (o.lintel) A.box(o.lintel, s, 0.1, sill + h + 0.14, w / 2 + 0.14, 0.07, 0.07);
}

/** Canted oriel bay on the first floor, three glazed faces, flat roof, tapered underside. */
function bay(A, s, y0, y1, w, o = {}) {
  const dd = o.deep || 0.8, side = 0.5, fr = o.frame || WHITE, under = o.under || CREAM;
  const C = [[s - w / 2 - side, 0.06], [s - w / 2, dd], [s + w / 2, dd], [s + w / 2 + side, 0.06]];
  for (let k = 0; k < 3; k++) {
    const [sa, da] = C[k], [sb, db] = C[k + 1];
    A.quad(fr, A.P(sa, da, y0), A.P(sb, db, y0), A.P(sb, db, y1), A.P(sa, da, y1));
    A.quad(o.curtain ? CURT : GLASS, A.P(sa, da + 0.015, y0 + 0.18), A.P(sb, db + 0.015, y0 + 0.18), A.P(sb, db + 0.015, y1 - 0.18), A.P(sa, da + 0.015, y1 - 0.18));
    A.quad(fr, A.P(sa, da + 0.02, (y0 + y1) / 2 - 0.03), A.P(sb, db + 0.02, (y0 + y1) / 2 - 0.03), A.P(sb, db + 0.02, (y0 + y1) / 2 + 0.03), A.P(sa, da + 0.02, (y0 + y1) / 2 + 0.03));
    A.tri(under, A.P(sa, da, y0), A.P(sb, db, y0), A.P(s, 0.05, y0 - 0.6));
  }
  for (const [cs, cd] of C) A.box(fr, cs, cd, (y0 + y1) / 2, 0.045, 0.045, (y1 - y0) / 2);
  for (const q of [-1 / 6, 1 / 6]) A.box(fr, s + w * q, dd + 0.02, (y0 + y1) / 2, 0.03, 0.03, (y1 - y0) / 2);
  A.quad(o.roof || '#6d7075', A.P(C[0][0] - 0.05, 0.02, y1 + 0.06), A.P(C[1][0] - 0.05, dd + 0.08, y1 + 0.06), A.P(C[2][0] + 0.05, dd + 0.08, y1 + 0.06), A.P(C[3][0] + 0.05, 0.02, y1 + 0.06));
  A.quad(fr, A.P(C[0][0] - 0.05, 0.02, y1), A.P(C[1][0] - 0.05, dd + 0.08, y1), A.P(C[2][0] + 0.05, dd + 0.08, y1), A.P(C[3][0] + 0.05, 0.02, y1));
}

/** Dormer on the front slope: cheeks, face with white-framed windows, gabled / flat / hipped roof. */
function dormer(A, H, p, s, w, n, o = {}) {
  const i0 = o.inset || 0.95, fh = o.h || 1.45, cheek = o.cheek || WHITE, rc = o.roofCol || '#4a4e54', fr = o.frame || WHITE;
  const dF = -i0, yb = H + p * i0 - 0.06, yt = yb + fh, dB = -(yt - H) / p, a = s - w / 2, b = s + w / 2;
  A.quad(cheek, A.P(a, dF, yb), A.P(b, dF, yb), A.P(b, dF, yt), A.P(a, dF, yt));                           // face
  const pw = (w - 0.3) / n;
  for (let i = 0; i < n; i++) {
    const c = a + 0.15 + pw * (i + 0.5), y0 = yb + 0.2, y1 = yt - 0.14;
    A.box(fr, c, dF + 0.04, (y0 + y1) / 2, pw / 2 - 0.02, 0.04, (y1 - y0) / 2 + 0.04);
    A.rect(o.curtain ? CURT : GLASS, c - pw / 2 + 0.06, c + pw / 2 - 0.06, dF + 0.085, y0 + 0.04, y1 - 0.04);
    A.box(fr, c, dF + 0.09, (y0 + y1) / 2 + 0.05, pw / 2 - 0.04, 0.02, 0.025);
    A.box(fr, c, dF + 0.09, (y0 + y1) / 2, 0.025, 0.02, (y1 - y0) / 2 - 0.04);
  }
  for (const sx of [a, b]) A.tri(o.cheekSide || cheek, A.P(sx, dF, yb), A.P(sx, dF, yt), A.P(sx, dB, yt));    // cheeks
  const style = o.roof || 'gable';
  if (style === 'gable') {
    const yr = yt + 0.6, dR = -(yr - H) / p, df = dF + 0.12;
    A.tri(cheek, A.P(a, dF, yt), A.P(b, dF, yt), A.P(s, dF, yr));
    A.quad(rc, A.P(a - 0.1, df, yt - 0.03), A.P(s, df, yr + 0.04), A.P(s, dR, yr + 0.04), A.P(a - 0.1, dB, yt - 0.03));
    A.quad(rc, A.P(s, df, yr + 0.04), A.P(b + 0.1, df, yt - 0.03), A.P(b + 0.1, dB, yt - 0.03), A.P(s, dR, yr + 0.04));
    A.box(fr, s - w / 4 - 0.02, dF + 0.1, (yt + yr) / 2 + 0.02, w / 4 + 0.1, 0.02, 0.04);
  } else if (style === 'hip') {
    const yr = yt + 0.45, dR = -(yr - H) / p, df = dF + 0.12, dm = (df + dR) / 2;
    A.quad(rc, A.P(a - 0.1, df, yt - 0.03), A.P(b + 0.1, df, yt - 0.03), A.P(s + w * 0.2, dm, yr), A.P(s - w * 0.2, dm, yr));
    A.quad(rc, A.P(a - 0.1, dB, yt - 0.03), A.P(b + 0.1, dB, yt - 0.03), A.P(s + w * 0.2, dm, yr), A.P(s - w * 0.2, dm, yr));
    A.tri(rc, A.P(a - 0.1, df, yt - 0.03), A.P(a - 0.1, dB, yt - 0.03), A.P(s - w * 0.2, dm, yr));
    A.tri(rc, A.P(b + 0.1, df, yt - 0.03), A.P(b + 0.1, dB, yt - 0.03), A.P(s + w * 0.2, dm, yr));
  } else { // flat lead roof, slightly sloped
    A.quad(rc, A.P(a - 0.1, dF + 0.12, yt + 0.1), A.P(b + 0.1, dF + 0.12, yt + 0.1), A.P(b + 0.1, dB, yt + 0.02), A.P(a - 0.1, dB, yt + 0.02));
    A.box(fr, s, dF + 0.08, yt + 0.06, w / 2 + 0.12, 0.05, 0.07);
  }
}

function chimney(A, H, p, R, s, pots = 3) {
  const d = -Math.min(R, 2.6), base = H + p * -d, top = H + p * R + 1.15;
  A.box('brick', s, d, (H - 0.6 + top) / 2, 0.38, 0.3, (top - H + 0.6) / 2);
  A.box('#cfc8ba', s, d, top + 0.05, 0.45, 0.37, 0.06);
  for (let i = 0; i < pots; i++) { const o = (i - (pots - 1) / 2) * (0.62 / Math.max(1, pots - 1)); A.box('#b9602f', s + (pots > 1 ? o : 0), d, top + 0.36, 0.075, 0.075, 0.3); }
  void base;
}

// ---- shopfronts ----
function shop(A, sp, f) {
  const riserCol = sp.riser || '#6f3a2e';
  A.brickRect(0, A.L, 0.06, 0, 2.9);                         // brick backing (hides the generic door texture)
  for (const q of sp.parts) {
    const a = q.a * f, b = q.b * f, mid = (a + b) / 2, hw = (b - a) / 2, fr = q.frame || WHITE;
    if (q.k === 'pier') { A.box(q.col || '#4a2c26', mid, 0.12, 1.45, hw, 0.12, 1.45); continue; }
    if (q.k === 'win') {
      A.box(q.riser || riserCol, mid, 0.1, 0.32, hw, 0.1, 0.32);
      A.box(fr, mid, 0.13, 1.7, hw, 0.07, 1.1);                                                    // frame block
      A.rect(q.glass || SHOPGLASS, a + 0.09, b - 0.09, 0.215, 0.7, 2.62);
      if (q.panel) A.rect(q.panel, a + 0.09, b - 0.09, 0.225, q.py0 ?? 0.7, q.py1 ?? 1.2);        // painted lower panel
      const n = q.n || Math.max(1, Math.round((b - a) / 1.5));
      for (let i = 1; i < n; i++) A.box(fr, a + ((b - a) * i) / n, 0.2, 1.66, 0.04, 0.04, 0.96);
      A.box(fr, mid, 0.2, 2.7, hw, 0.06, 0.07);
      for (const dc of q.deco || []) A.rect(dc.col, a + dc.s0 * (b - a), a + dc.s1 * (b - a), 0.23, dc.y0, dc.y1);
    } else if (q.k === 'door') {
      A.box(fr, mid, 0.13, 1.35, hw, 0.07, 1.35);
      A.rect(q.leaf || DARKGLASS, a + 0.1, b - 0.1, 0.215, 0.08, 2.1);
      A.rect(q.glass || SHOPGLASS, a + 0.1, b - 0.1, 0.215, 2.2, 2.62);
      if (q.glassLeaf) A.rect(q.glassLeaf, a + 0.18, b - 0.18, 0.225, 0.4, 1.95);
      A.box('#c7a24a', b - 0.22, 0.24, 1.0, 0.02, 0.02, 0.14);
    } else if (q.k === 'fascia') { A.box(q.col, mid, 0.14, 3.25, hw, 0.08, 0.36); }
    else if (q.k === 'awning') { A.quad(q.col, A.P(a, 0.12, 2.88), A.P(b, 0.12, 2.88), A.P(b, 1.55, 2.5), A.P(a, 1.55, 2.5)); A.rect(q.col, a, b, 1.55, 2.2, 2.5); }
    else if (q.k === 'canopy') { A.quad(q.col, A.P(a, 0.12, 2.88), A.P(b, 0.12, 2.88), A.P(b, 1.2, 2.55), A.P(a, 1.2, 2.55)); A.rect(q.col, a, b, 1.2, 2.3, 2.55); }
    else if (q.k === 'board') { A.rect(q.col, a, b, 0.2, q.y0, q.y1); }
  }
}

function a03(K, it, ctx) {
  const A = makeAcc(K); A.L = K.e.L; const H = K.H + PARAPET;
  const f = (A.L) / (it.ref || A.L);
  const { R, p } = roof(A, K, it, ctx.ring);
  A.box(it.eave || CREAM, A.L / 2, 0.16, H - 0.14, A.L / 2 + 0.05, 0.18, 0.12);    // eaves board and gutter
  A.box('#2c2f33!m', A.L / 2, 0.3, H - 0.3, A.L / 2 + 0.05, 0.03, 0.04);
  const head = H - 0.62;
  for (const w of it.win || []) sash(A, w.s * f, head - (w.h || 1.75), w.w || 0.95, w.h || 1.75, w.k || 'one', { curtain: w.c, frame: w.frame, lintel: w.lintel });
  for (const b of it.bays || []) bay(A, b.s * f, head - 1.95, head + 0.1, b.w || 2.2, { under: b.under, curtain: b.c, roof: b.roof });
  for (const q of it.quoin || []) for (let y = head - 1.75; y < head + 0.1; y += 0.3) A.box('#d6c39b', q * f, 0.05, y, 0.17, 0.05, 0.065);
  for (const dm of it.dorm || []) dormer(A, H, p, dm.s * f, dm.w || 1.9, dm.n || 2, { cheek: dm.cheek, roofCol: dm.roofCol || it.dormRoof, roof: dm.roof, curtain: dm.c, frame: dm.frame, cheekSide: dm.cheekSide });
  for (const c of it.chim || []) chimney(A, H, p, R, c.s * f, c.pots || 3);
  if (it.joists) { const [s0, s1] = it.joists.map((v) => v * f); A.box('#4a3426', (s0 + s1) / 2, 0.11, 3.88, (s1 - s0) / 2, 0.08, 0.3); for (let s = s0 + 0.2; s < s1 - 0.1; s += 0.42) A.box('#1f1712', s, 0.2, 3.88, 0.07, 0.02, 0.25); }
  if (it.shop) shop(A, it.shop, f);
  A.flush();
}

export const FEATURES = { a03 };
