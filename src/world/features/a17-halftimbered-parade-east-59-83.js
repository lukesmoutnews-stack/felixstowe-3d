// Area a17-halftimbered-parade-east-59-83: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// Hamilton Road east side, nos 59-83 and the half-timbered parade: Boots, VPZ/Subway block, British Heart Foundation, Costa,
// Nationwide, the banded Edwardian block (Vodafone, shops to let, Post Office), Shoe Zone, Iceland, The Works to Coes (half-timbered
// gables over bay windows), Felixstowe Emporium, H&T to Nailpro, and Taba Naba to 24 Hamilton Road (brick gables).
// From the user's Street View photos (docs/research/hamilton-road-streetview). Every dimension is an estimate scaled from the photos.
//
// These buildings face the PEDESTRIAN part of Hamilton Road (not a "car" road), so the shared frame K points at the back wall facing
// Victoria Street. Every feature therefore builds its own frame on the west-facing wall (frontOf) and ignores K.P / K.box.
import * as THREE from 'three';
import { Textures } from '../textures.js';

const MD = {
  blk: { color: 0x1b1c1f, roughness: 0.55 }, wht: { color: 0xf3f1ea }, rnd: { color: 0xe6dfcb }, stn: { color: 0xd9d1bc },
  gran: { color: 0x202126, roughness: 0.3, metalness: 0.3 }, glass: { color: 0x6c8693, roughness: 0.15, metalness: 0.35 },
  glassT: { color: 0x9fd4cc, roughness: 0.2, metalness: 0.2 }, glassD: { color: 0x34434c, roughness: 0.15, metalness: 0.4 },
  tile: { color: 0x9a4c36, roughness: 0.85 }, tileDk: { color: 0x6c3a30, roughness: 0.85 }, cop: { color: 0x5ea58d, roughness: 0.6 },
  red: { color: 0xd4202c, roughness: 0.45 }, grn: { color: 0x239a46, roughness: 0.45 }, navy: { color: 0x1a2a7a, roughness: 0.45 },
  blue: { color: 0x1d46c8, roughness: 0.45 }, gry: { color: 0x5c5f66, roughness: 0.5 }, teal: { color: 0x22b3a8, roughness: 0.5 },
  lilac: { color: 0xb7a2dc, roughness: 0.5 }, bwn: { color: 0x4a3324, roughness: 0.7 }, slate: { color: 0x44505a, roughness: 0.6 },
  tmbBrn: { color: 0x5a2c20, roughness: 0.8 }, orange: { color: 0xe8742a, roughness: 0.5 }, mid: { color: 0x8a8c90, roughness: 0.6 },
  interior: { color: 0x8c7a62, roughness: 0.8 },
};
const MCACHE = {};
const material = (k) => MCACHE[k] || (MCACHE[k] = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...MD[k] }));
let brickMat = null;
function brickMaterial(tint) {
  if (brickMat) return brickMat;
  const t = Textures.facadeTexture('brick_red', false, 61, 0);
  brickMat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, color: tint, side: THREE.DoubleSide });
  return brickMat;
}

/** Accumulating geometry kit on the west-facing wall: s along it (north to south), d out to the west, y up. */
function frontOf(K, ctx, o = {}) {
  const Geo = K.G.gw.constructor, ring = ctx.ring, R = ring;
  const want = o.facing || [-1, 0], minDot = o.minDot || 0.7, n = R.length;
  // outward unit normal of each wall segment, then runs of consecutive segments that face the wanted way (OSM often kinks a straight
  // wall into several short segments, e.g. Nationwide)
  const seg = R.map((a, i) => {
    const c = R[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1e-6, ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    let nx = uz, nz = -ux; if (ctx.pointInRing(mx + nx * 0.3, mz + nz * 0.3, ring)) { nx = -nx; nz = -nz; }
    return { a, c, L, ux, uz, nx, nz, ok: nx * want[0] + nz * want[1] >= minDot && L > 0.3 };
  });
  let best = null, start = seg.findIndex((q) => !q.ok); if (start < 0) start = 0;
  for (let k = 0; k < n;) {
    const q = seg[(start + k) % n]; if (!q.ok) { k++; continue; }
    let j = k; const run = []; while (j < n && seg[(start + j) % n].ok) { const q2 = seg[(start + j) % n]; if (run.length && q2.nx * run[0].nx + q2.nz * run[0].nz < 0.985) break; run.push(q2); j++; } k = j;
    const a = run[0].a, c = run[run.length - 1].c, L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < (o.minL || 2.5)) continue;
    let ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, nx = run[0].nx, nz = run[0].nz, aa = a, cc = c;
    if (uz < 0) { aa = c; cc = a; ux = -ux; uz = -uz; } // s runs north to south (z increasing)
    if (!best || L > best.L) best = { a: aa, c: cc, L, ux, uz, nx, nz };
  }
  if (!best) return null;
  const { a, ux, uz, nx, nz, L } = best, g = K.g + (o.dy || 0), A = {};
  const acc = (k) => A[k] || (A[k] = new Geo());
  const P = (s, d, y) => [a[0] + ux * s + nx * d, g + y, a[1] + uz * s + nz * d];
  const F = { L, g, P, acc };
  F.box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); acc(k).box(p[0], p[1], p[2], ux, uz, hs, hy, hd); };
  /** slab from s0..s1, d0..d1, y0..y1 */
  F.slab = (k, s0, s1, d0, d1, y0, y1) => F.box(k, (s0 + s1) / 2, (d0 + d1) / 2, (y0 + y1) / 2, Math.abs(s1 - s0) / 2, Math.abs(d1 - d0) / 2, Math.abs(y1 - y0) / 2);
  F.quad = (k, p0, p1, p2, p3) => acc(k).quad(P(...p0), P(...p1), P(...p2), P(...p3));
  F.tri = (k, p0, p1, p2) => acc(k).tri(P(...p0), P(...p1), P(...p2));
  /** wall-aligned brick quad (texture runs 3.2 m x 2.9 m) */
  F.brickQuad = (p0, p1, p2, p3) => { const v = (p) => [p[0] / 3.2, p[2] / 2.9]; acc('brick').quad(P(...p0), P(...p1), P(...p2), P(...p3), [v(p0), v(p1), v(p2), v(p3)]); };
  F.brickTri = (p0, p1, p2) => { const G = acc('brick'), n = G.p.length / 3; G.p.push(...P(...p0), ...P(...p1), ...P(...p2)); for (const p of [p0, p1, p2]) G.uv.push(p[0] / 3.2, p[2] / 2.9); G.idx.push(n, n + 1, n + 2); };
  /** thin strip between two points in the plane at depth d (width w across it) */
  F.strip = (k, s0, y0, s1, y1, d, w) => { const dx = s1 - s0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, px = -dy / l * w / 2, py = dx / l * w / 2; F.quad(k, [s0 - px, d, y0 - py], [s0 + px, d, y0 + py], [s1 + px, d, y1 + py], [s1 - px, d, y1 - py]); };
  /** fan of triangles for a half disc (arch) centred (s,yc) radius r at depth d, from angle 0..PI */
  F.arch = (k, s, yc, r, d, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; F.tri(k, [s, d, yc], [s + Math.cos(a0) * r, d, yc + Math.sin(a0) * r], [s + Math.cos(a1) * r, d, yc + Math.sin(a1) * r]); } };
  F.archRing = (k, s, yc, r0, r1, d, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; F.quad(k, [s + Math.cos(a0) * r0, d, yc + Math.sin(a0) * r0], [s + Math.cos(a0) * r1, d, yc + Math.sin(a0) * r1], [s + Math.cos(a1) * r1, d, yc + Math.sin(a1) * r1], [s + Math.cos(a1) * r0, d, yc + Math.sin(a1) * r0]); } };
  F.done = (tint) => {
    for (const [k, G] of Object.entries(A)) {
      const m = G.mesh(k === 'brick' ? brickMaterial(tint ?? 0xffe0cc) : material(k)); if (m) { m.name = 'a17:' + k; K.extra.push(m); }
    }
  };
  return F;
}

/** A sash window: glass, white frame, glazing bars (cols x rows), stone sill and optional head. */
function win(F, s, y0, y1, w, o = {}) {
  const fk = o.frame || 'wht', d = o.d ?? 0.05, cols = o.cols ?? 2, rows = o.rows ?? 2, t = o.t ?? 0.05;
  const yTop = o.arch ? y1 - w / 2 : y1;
  F.quad(o.glass || 'glass', [s - w / 2, d, y0], [s + w / 2, d, y0], [s + w / 2, d, yTop], [s - w / 2, d, yTop]);
  if (o.arch) { F.arch(o.glass || 'glass', s, yTop, w / 2, d, 10); F.archRing(fk, s, yTop, w / 2 - t, w / 2 + t, d + 0.02, 10); if (o.hood) F.archRing(o.hood, s, yTop, w / 2 + t, w / 2 + t + 0.22, d - 0.005, 10); }
  for (const e of [-1, 1]) F.slab(fk, s + e * (w / 2 - t / 2), s + e * (w / 2 - t / 2), d, d + 0.07, y0, yTop);
  F.slab(fk, s - w / 2, s + w / 2, d, d + 0.07, y0, y0 + t); if (!o.arch) F.slab(fk, s - w / 2, s + w / 2, d, d + 0.07, yTop - t, yTop);
  for (let i = 1; i < cols; i++) F.slab(fk, s - w / 2 + (w * i) / cols - t / 3, s - w / 2 + (w * i) / cols + t / 3, d, d + 0.06, y0, o.arch && i * 2 === cols ? y1 : yTop);
  for (let j = 1; j < rows; j++) F.slab(fk, s - w / 2, s + w / 2, d, d + 0.06, y0 + ((yTop - y0) * j) / rows - t / 3, y0 + ((yTop - y0) * j) / rows + t / 3);
  if (o.sill !== false) F.slab(o.sillK || 'stn', s - w / 2 - 0.12, s + w / 2 + 0.12, 0, 0.16, y0 - 0.1, y0);
  if (o.lintel) F.slab(o.lintel, s - w / 2 - 0.12, s + w / 2 + 0.12, 0, 0.14, yTop, yTop + 0.18);
}

/** A canted (three-faced) oriel or bay window: glazing, white posts, a bowl underneath and a flat or copper-hooded top. */
function bay(F, s, w, y0, y1, o = {}) {
  const dep = o.dep ?? 0.95, side = o.side ?? 0.5, fk = o.frame || 'wht', under = o.under || 'wht';
  const C = [[s - w / 2 - side, 0.03], [s - w / 2, dep], [s + w / 2, dep], [s + w / 2 + side, 0.03]];
  const lights = o.lights ?? 3;
  for (let k = 0; k < 3; k++) {
    const [sa, da] = C[k], [sb, db] = C[k + 1], n = k === 1 ? lights : 1;
    F.quad(o.glass || 'glass', [sa, da, y0], [sb, db, y0], [sb, db, y1], [sa, da, y1]);
    for (let i = 1; i < n; i++) { const f = i / n; F.slab(fk, sa + (sb - sa) * f - 0.025, sa + (sb - sa) * f + 0.025, da + (db - da) * f, da + (db - da) * f + 0.04, y0, y1); }
    F.slab(fk, Math.min(sa, sb), Math.max(sa, sb), Math.min(da, db) + 0.01, Math.max(da, db) + 0.05, y1 - 0.12, y1);
    F.slab(fk, Math.min(sa, sb), Math.max(sa, sb), Math.min(da, db) + 0.01, Math.max(da, db) + 0.05, y0, y0 + 0.1);
    F.slab(fk, Math.min(sa, sb), Math.max(sa, sb), Math.min(da, db) + 0.01, Math.max(da, db) + 0.05, y0 + (y1 - y0) * 0.68, y0 + (y1 - y0) * 0.68 + 0.05); // transom
    // underside bowl
    const sa2 = sa + (s - sa) * 0.45, sb2 = sb + (s - sb) * 0.45;
    F.quad(under, [sa, da, y0], [sb, db, y0], [sb2, 0.02, y0 - (o.bowl ?? 0.6)], [sa2, 0.02, y0 - (o.bowl ?? 0.6)]);
  }
  for (const [cs, cd] of C) F.slab(fk, cs - 0.05, cs + 0.05, cd, cd + 0.1, y0 - 0.02, y1 + 0.02);
  // top
  const top = y1 + 0.02, hood = o.hood || 'flat';
  if (hood === 'flat') { F.quad('wht', [C[0][0], 0.03, top + 0.1], [C[1][0], dep + 0.08, top + 0.1], [C[2][0], dep + 0.08, top + 0.1], [C[3][0], 0.03, top + 0.1]); F.slab('wht', s - w / 2 - side, s + w / 2 + side, 0, dep + 0.1, top, top + 0.1); }
  else { // sloping hood to the wall in copper (or pediment)
    const kk = hood === 'copper' ? 'cop' : 'wht', up = o.hoodH ?? 0.9;
    F.quad(kk, [C[0][0], 0.03, top], [C[1][0], dep + 0.06, top], [C[2][0], dep + 0.06, top], [C[3][0], 0.03, top]);
    F.quad(kk, [C[1][0], dep + 0.08, top], [C[2][0], dep + 0.08, top], [C[2][0] - 0.2, 0.02, top + up], [C[1][0] + 0.2, 0.02, top + up]);
    F.quad(kk, [C[0][0], 0.04, top], [C[1][0], dep + 0.08, top], [C[1][0] + 0.2, 0.02, top + up], [C[0][0] + 0.25, 0.02, top + up * 0.6]);
    F.quad(kk, [C[3][0], 0.04, top], [C[2][0], dep + 0.08, top], [C[2][0] - 0.2, 0.02, top + up], [C[3][0] - 0.25, 0.02, top + up * 0.6]);
    if (o.pediment) { F.tri('stn', [s - w / 2, dep + 0.1, top], [s + w / 2, dep + 0.1, top], [s, dep + 0.1, top + 0.9]); F.tri('stn', [s - w / 2 + 0.2, dep + 0.12, top + 0.05], [s + w / 2 - 0.2, dep + 0.12, top + 0.05], [s, dep + 0.12, top + 0.7]); }
  }
}

/** Ground-floor glazing between two points: stallriser, glass, white (or coloured) framing, optional door recess. */
function shopfront(F, s0, s1, o = {}) {
  const fk = o.frame || 'wht', rk = o.riser || 'wht', top = o.top ?? 2.85, step = o.step ?? 1.7, d = o.d ?? 0.09;
  F.slab(rk, s0, s1, 0, d + 0.04, 0, o.riserH ?? 0.55);
  F.quad(o.glass || 'glass', [s0, d, o.riserH ?? 0.55], [s1, d, o.riserH ?? 0.55], [s1, d, top], [s0, d, top]);
  const n = Math.max(1, Math.round((s1 - s0) / step));
  for (let i = 0; i <= n; i++) F.slab(fk, s0 + ((s1 - s0) * i) / n - 0.04, s0 + ((s1 - s0) * i) / n + 0.04, d, d + 0.08, o.riserH ?? 0.55, top);
  F.slab(fk, s0, s1, d, d + 0.1, top - 0.06, top); F.slab(fk, s0, s1, d, d + 0.1, (o.riserH ?? 0.55), (o.riserH ?? 0.55) + 0.07);
  if (o.mid) F.slab(fk, s0, s1, d, d + 0.06, o.mid - 0.03, o.mid + 0.03);
  if (o.door) { const [ds0, ds1] = o.door; F.slab('blk', ds0, ds1, d + 0.01, d + 0.04, 0.05, 2.3); F.slab(fk, ds0 - 0.05, ds0 + 0.05, d, d + 0.1, 0.05, 2.4); F.slab(fk, ds1 - 0.05, ds1 + 0.05, d, d + 0.1, 0.05, 2.4); F.slab(fk, ds0, ds1, d, d + 0.1, 2.3, 2.4); F.slab('glass', ds0 + 0.1, ds1 - 0.1, d + 0.05, d + 0.06, 0.2, 2.2); }
}
function pilaster(F, s, w, y0, y1, k = 'wht', dep = 0.2, cap = true) {
  F.slab(k, s - w / 2, s + w / 2, 0, dep, y0, y1);
  if (cap) { F.slab(k, s - w / 2 - 0.06, s + w / 2 + 0.06, 0, dep + 0.12, y1 - 0.45, y1 - 0.1); F.slab(k, s - w / 2 - 0.1, s + w / 2 + 0.1, 0, dep + 0.15, y1 - 0.1, y1 + 0.05); }
}
function band(F, s0, s1, y0, y1, k = 'rnd', dep = 0.1) { F.slab(k, s0, s1, 0, dep, y0, y1); }
/** cream stringcourse bands up a brick wall (Edwardian bands of stone every few courses) */
function brickBands(F, s0, s1, y0, y1, step = 0.8) { for (let y = y0; y < y1; y += step) F.slab('rnd', s0, s1, 0, 0.05, y, y + 0.17); }
/** an overlay of brick (so white-rendered walls can show brick panels) */
function brickPanel(F, s0, s1, y0, y1) { F.brickQuad([s0, 0.03, y0], [s1, 0.03, y0], [s1, 0.03, y1], [s0, 0.03, y1]); }
/** upright 8-sided column with base and capital */
function column(F, s, d, y0, y1, r, k = 'stn') {
  const n = 10; for (let i = 0; i < n; i++) { const a0 = (2 * Math.PI * i) / n, a1 = (2 * Math.PI * (i + 1)) / n; F.quad(k, [s + Math.cos(a0) * r, d + Math.sin(a0) * r, y0], [s + Math.cos(a1) * r, d + Math.sin(a1) * r, y0], [s + Math.cos(a1) * r, d + Math.sin(a1) * r, y1], [s + Math.cos(a0) * r, d + Math.sin(a0) * r, y1]); }
  F.slab(k, s - r * 1.35, s + r * 1.35, d - r * 1.35, d + r * 1.35, y0, y0 + 0.45); F.slab(k, s - r * 1.4, s + r * 1.4, d - r * 1.4, d + r * 1.4, y1 - 0.15, y1 + 0.5);
}

/**
 * A gable over a bay: front wall at depth d0, either half-timbered (white panels and black studs, braces and bargeboards) or brick
 * with stone coping, and a clay-tile roof running back into the roof (the buildings have flat roofs behind).
 */
function gable(F, sc, w, yE, rise, o = {}) {
  const d0 = o.d ?? 0.05, s0 = sc - w / 2, s1 = sc + w / 2, yP = yE + rise, back = o.back ?? 5.2, ov = 0.28;
  if (o.timber) {
    F.tri('wht', [s0, d0, yE], [s1, d0, yE], [sc, d0, yP]);
    const tk = o.timber, t = 0.07;
    F.slab(tk, s0, s1, d0, d0 + 0.07, yE, yE + 0.14);                    // sill beam
    F.slab(tk, sc - t, sc + t, d0, d0 + 0.07, yE, yP - 0.05);              // king stud
    const yM = yE + rise * 0.5, wM = w * 0.5 * (1 - 0.5);                  // tie beam half way up
    F.slab(tk, sc - wM, sc + wM, d0, d0 + 0.07, yM - 0.06, yM + 0.06);
    F.strip(tk, sc, yM, sc - w * 0.5 + 0.2, yE + 0.15, d0 + 0.05, 0.12);    // braces
    F.strip(tk, sc, yM, sc + w * 0.5 - 0.2, yE + 0.15, d0 + 0.05, 0.12);
    F.strip(tk, sc, yP - 0.2, sc - wM + 0.1, yM, d0 + 0.05, 0.1); F.strip(tk, sc, yP - 0.2, sc + wM - 0.1, yM, d0 + 0.05, 0.1);
    for (const e of [-0.28, 0.28]) F.slab(tk, sc + w * e - t, sc + w * e + t, d0, d0 + 0.07, yE, yE + rise * (1 - Math.abs(e) * 2) * 0.95);
  } else { F.brickTri([s0, d0, yE], [s1, d0, yE], [sc, d0, yP]); }
  // roof slopes (tile) and the underside/back
  const rk = o.roof || 'tile';
  F.quad(rk, [s0 - ov, d0 + 0.25, yE - 0.12], [sc, d0 + 0.25, yP + 0.12], [sc, -back, yP + 0.12 - 0.0], [s0 - ov, -back, yE - 0.12 + 0.0]);
  F.quad(rk, [s1 + ov, d0 + 0.25, yE - 0.12], [sc, d0 + 0.25, yP + 0.12], [sc, -back, yP + 0.12], [s1 + ov, -back, yE - 0.12]);
  F.tri(rk, [s0 - ov, -back, yE - 0.12], [s1 + ov, -back, yE - 0.12], [sc, -back, yP + 0.12]);
  // barge boards / stone coping along the rake
  const bk = o.timber ? (o.barge || 'blk') : 'stn', bw = o.timber ? 0.28 : 0.2;
  F.strip(bk, s0 - ov, yE - 0.12, sc, yP + 0.14, d0 + 0.27, bw); F.strip(bk, s1 + ov, yE - 0.12, sc, yP + 0.14, d0 + 0.27, bw);
  if (!o.timber) { F.slab('stn', sc - 0.18, sc + 0.18, d0, d0 + 0.2, yP - 0.05, yP + 0.28); }
  if (o.win) { const ww = o.win.w ?? 1.5, y0 = yE + (o.win.y0 ?? 0.35), y1 = y0 + (o.win.h ?? 1.0); win(F, sc, y0, y1, ww, { d: d0 + 0.04, cols: o.win.cols ?? 3, rows: 2, arch: o.win.arch, sill: false, frame: o.timber ? 'wht' : 'wht', hood: o.win.arch ? 'stn' : undefined }); }
}

/** half-timbered storey: jettied white render with black studs and a small window group (y0..y1). */
function timberStorey(F, s0, s1, y0, y1, o = {}) {
  const j = o.jetty ?? 0.28, tk = o.timber || 'blk', t = 0.06;
  F.slab('wht', s0, s1, 0, j, y0, y1);
  F.slab(tk, s0, s1, 0, j + 0.06, y0 - 0.22, y0 + 0.05);   // jetty bearer
  F.slab(tk, s0, s1, j - 0.02, j + 0.06, y1 - 0.14, y1);
  F.slab(tk, s0, s1, j - 0.02, j + 0.06, y0 + 0.5, y0 + 0.58);
  for (let s = s0 + 0.25; s < s1 - 0.1; s += o.stud ?? 0.95) F.slab(tk, s - t, s + t, j - 0.02, j + 0.06, y0 + 0.05, y1 - 0.1);
  F.slab(tk, s0, s0 + 0.12, j - 0.02, j + 0.07, y0, y1); F.slab(tk, s1 - 0.12, s1, j - 0.02, j + 0.07, y0, y1);
}

// ------------------------------------------------------------------------------------------------------------------------
export const FEATURES = {
  /** Boots: brick first floor between cream render pilasters, three windows, ribbed cream parapet, cream-tiled shopfront. */
  a17Boots(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    // ground floor: cream tiled piers, glazing, entrance
    for (const s of [0.3, 4.9, 10.1, L - 0.35]) pilaster(F, s, s < 1 || s > L - 1 ? 0.6 : 1.0, 0, 3.6, 'rnd', 0.18, false);
    shopfront(F, 0.65, 4.4, { frame: 'wht', riser: 'rnd', step: 1.9 });
    shopfront(F, 5.5, 9.6, { frame: 'wht', riser: 'rnd', step: 2.0, door: [6.6, 8.4], glass: 'glass' });
    shopfront(F, 10.6, L - 0.7, { frame: 'wht', riser: 'rnd', step: 2.0 });
    band(F, 0, L, 3.62, 4.5, 'rnd', 0.12);
    // first floor
    for (const [s, w] of [[2.3, 1.9], [6.9, 1.9]]) { F.slab('rnd', s - w / 2 - 0.25, s + w / 2 + 0.25, 0, 0.03, 4.9, 7.65); win(F, s, 5.2, 7.35, w, { arch: true, cols: 2, rows: 3, sillK: 'rnd', hood: 'rnd' }); }
    F.slab('rnd', 9.9, 13.7, 0, 0.03, 4.9, 7.65); win(F, 11.8, 5.2, 7.35, 3.1, { cols: 3, rows: 2, sillK: 'rnd', lintel: 'rnd' });
    for (const [s, w] of [[0.55, 1.1], [4.6, 1.2], [9.0, 1.2], [L - 0.8, 1.6]]) F.slab('rnd', s - w / 2, s + w / 2, 0, 0.1, 4.5, H);
    // ribbed parapet
    F.slab('rnd', 0, L, 0, 0.14, H - 0.05, H + 0.2); F.slab('wht', 0, L, 0.05, 0.1, H + 0.2, H + 1.15);
    for (let s = 0.2; s < L; s += 0.28) F.slab('wht', s - 0.045, s + 0.045, 0.1, 0.16, H + 0.2, H + 1.1);
    F.slab('wht', 0, L, 0, 0.2, H + 1.1, H + 1.22);
    F.done(0xf2cfb8);
  },

  /** VPZ / shop to let / Subway: white rendered block with red brick panels and windows over green and black shopfronts. */
  a17SubwayBlock(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    for (const [a, b] of [[0.4, 3.4], [4.2, 7.0], [8.0, L - 0.3]]) brickPanel(F, a, b, 5.0, H - 0.65);
    win(F, 1.9, 5.3, 6.9, 1.15, { cols: 2, rows: 2, sillK: 'wht' }); win(F, 5.5, 5.55, 6.75, 1.5, { cols: 2, rows: 1, sillK: 'wht' }); win(F, 10.3, 5.3, 6.95, 2.0, { cols: 2, rows: 2, sillK: 'wht' });
    // white fascia band and top edge, with a hanging TO LET box
    band(F, 0, L, 3.65, 4.95, 'wht', 0.14); band(F, 0, L, H - 0.7, H, 'wht', 0.14); F.slab('wht', 0, L, 0, 0.26, H, H + 0.14);
    F.slab('wht', 5.1, 5.7, 0.1, 0.8, 4.4, 5.35); F.slab('navy', 5.15, 5.65, 0.8, 0.82, 4.45, 5.3);
    // shopfronts: VPZ (green), vacant (black), Subway (green)
    for (const s of [0.15, 3.85, 8.4, L - 0.15]) pilaster(F, s, 0.3, 0, 3.6, 'wht', 0.1, false);
    shopfront(F, 0.3, 3.8, { frame: 'grn', riser: 'grn', step: 1.8, door: [2.75, 3.65] });
    F.slab('gran', 3.9, 8.3, 0, 0.1, 0, 3.6); shopfront(F, 4.0, 8.2, { frame: 'blk', riser: 'gran', step: 2.0, glass: 'glassD', door: [4.25, 5.3], riserH: 1.0 });
    shopfront(F, 8.5, L - 0.3, { frame: 'grn', riser: 'gry', step: 1.7, glass: 'glass' });
    F.done(0xe08a70);
  },

  /** British Heart Foundation: tall narrow brown-red brick house over a red shopfront. */
  a17Bhf(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    for (const s of [0.28, L - 0.28]) pilaster(F, s, 0.55, 0, 3.7, 'red', 0.12, false);
    shopfront(F, 0.55, L - 0.55, { frame: 'red', riser: 'red', step: 1.6, door: [0.8, 1.9], top: 2.95 });
    band(F, 0, L, 3.65, 4.3, 'red', 0.14);
    F.slab('rnd', 0, L, 0, 0.12, 4.3, 4.45);
    for (const s of [1.3, L / 2, L - 1.3]) { win(F, s, 5.0, 7.15, 1.05, { cols: 2, rows: 3, hood: 'rnd', arch: true, sillK: 'stn' }); }
    for (const s of [L * 0.3, L * 0.7]) win(F, s, 7.9, 10.0, 1.05, { cols: 2, rows: 3, sillK: 'stn', lintel: 'rnd' });
    F.slab('blk', 0, L, 0, 0.38, H - 0.5, H); F.slab('blk', 0, L, 0, 0.52, H, H + 0.14);
    for (let s = 0.3; s < L; s += 0.5) F.slab('rnd', s - 0.1, s + 0.1, 0.38, 0.42, H - 0.42, H - 0.2);
    F.done(0xe8a58a);
  },

  /** Costa: two-storey brick with three dark-framed windows under stone lintels, a dentil cornice and a dark grey shopfront. */
  a17Costa(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    pilaster(F, 0.22, 0.44, 0, 3.55, 'gry', 0.14, false); pilaster(F, L - 0.22, 0.44, 0, 3.55, 'gry', 0.14, false);
    shopfront(F, 0.45, L - 0.45, { frame: 'gry', riser: 'gry', step: 1.4, door: [2.1, 4.1], top: 2.85 });
    band(F, 0, L, 3.6, 4.3, 'gry', 0.16);
    for (const s of [L * 0.17, L * 0.5, L * 0.83]) win(F, s, 4.95, 7.1, 1.1, { frame: 'gry', cols: 3, rows: 3, sillK: 'stn', lintel: 'stn', t: 0.06 });
    F.slab('stn', 0, L, 0, 0.3, H - 0.55, H - 0.3); for (let s = 0.12; s < L; s += 0.26) F.slab('stn', s - 0.07, s + 0.07, 0, 0.26, H - 0.3, H - 0.05);
    F.slab('stn', 0, L, 0, 0.34, H - 0.05, H + 0.1);
    F.done(0xe9a589);
  },

  /** Nationwide: Edwardian stone bank, four engaged columns, three arched openings, blue frieze, balustraded parapet. */
  a17Nationwide(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    const cs = [0.55, 3.2, 6.2, L - 0.55];
    F.slab('stn', 0, L, 0, 0.5, 0, 0.45);                                                         // plinth
    for (const s of cs) column(F, s, 0.55, 0.45, 6.25, 0.4);
    // openings between the columns: window, ATM window, door; each under an arch
    const op = [[(cs[0] + cs[1]) / 2, 1.7], [(cs[1] + cs[2]) / 2, 2.0], [(cs[2] + cs[3]) / 2, 1.8]];
    op.forEach(([s, w], i) => {
      F.slab('stn', s - w / 2 - 0.3, s + w / 2 + 0.3, 0, 0.26, 0.45, 5.0); F.slab(i === 2 ? 'blk' : 'glassD', s - w / 2, s + w / 2, 0.26, 0.3, 0.8, 4.6);
      F.slab('blk', s - w / 2, s - w / 2 + 0.07, 0.26, 0.34, 0.8, 4.65); F.slab('blk', s + w / 2 - 0.07, s + w / 2, 0.26, 0.34, 0.8, 4.65); F.slab('blk', s - w / 2, s + w / 2, 0.26, 0.34, 4.55, 4.65);
      F.arch('stn', s, 5.0, w / 2 + 0.3, 0.2, 10); F.arch('glass', s, 5.0, w / 2 - 0.05, 0.3, 10); F.archRing('stn', s, 5.0, w / 2 - 0.05, w / 2 + 0.28, 0.33, 10);
      for (let k = 1; k < 3; k++) F.strip('blk', s, 5.0, s + Math.cos(Math.PI * k / 3) * (w / 2 - 0.05), 5.0 + Math.sin(Math.PI * k / 3) * (w / 2 - 0.05), 0.34, 0.05);
    });
    F.slab('glass', op[1][0] - 0.55, op[1][0] + 0.55, 0.3, 0.33, 1.3, 2.2); F.slab('blk', op[1][0] - 0.6, op[1][0] + 0.6, 0.3, 0.36, 0.8, 1.3);   // the ATM
    // entablature: architrave, blue frieze (lettered), cornice, parapet
    F.slab('stn', 0, L, 0, 0.75, 6.75, 7.3); F.slab('stn', 0, L, 0, 0.5, 7.3, 8.3);
    F.slab('navy', 0.8, L - 0.8, 0.5, 0.58, 7.45, 8.1);
    F.slab('stn', 0, L, 0, 0.85, 8.3, 8.75); F.slab('stn', 0, L, 0, 0.6, 8.75, H + 0.2);
    for (let s = 0.4; s < L; s += 0.5) F.slab('stn', s - 0.09, s + 0.09, 0.45, 0.55, 8.9, H + 0.1);
    F.slab('stn', 0, L, 0.4, 0.6, H + 0.1, H + 0.35);
    F.done();
    plaque(F, K, 'nationwide', 1.6, L - 1.6, 0.6, 7.5, 8.05, '#1a2a7a', '#f4f4f4');
  },

  /** Vodafone: three-storey Edwardian brick with cream bands, a three-light bay under a pediment, black granite pilasters. */
  a17Vodafone(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    brickBands(F, 0, L, 4.6, H - 0.7, 0.85);
    for (const s of [0.35, L - 0.35]) { pilaster(F, s, 0.7, 0, 3.7, 'gran', 0.25, false); F.slab('stn', s - 0.45, s + 0.45, 0, 0.45, 3.5, 4.2); }
    F.brickQuad([0.7, 0.14, 0.0], [L - 0.7, 0.14, 0.0], [L - 0.7, 0.14, 0.75], [0.7, 0.14, 0.75]);
    shopfront(F, 0.7, L - 0.7, { frame: 'wht', riser: 'wht', step: 3.0, riserH: 0.75, glass: 'red', door: [3.15, 4.35], top: 2.95 });
    band(F, 0, L, 3.7, 4.55, 'stn', 0.2);
    bay(F, L / 2, 3.2, 5.05, 7.55, { dep: 1.0, lights: 3, hood: 'copper', pediment: true, hoodH: 0.7 });
    for (const s of [L * 0.22, L * 0.78]) win(F, s, 5.4, 7.2, 1.2, { cols: 2, rows: 2, lintel: 'rnd', sillK: 'stn' });
    for (const s of [L * 0.22, L * 0.45, L * 0.7]) win(F, s, 8.5, 10.3, 1.35, { cols: 2, rows: 3, lintel: 'rnd', sillK: 'stn' });
    F.slab('rnd', 0, L, 0, 0.45, H - 0.55, H - 0.25); F.slab('rnd', 0, L, 0, 0.55, H - 0.25, H);
    F.done(0xecaa90);
  },

  /** Row of shops to let and the shaped central pediment: six tall arched openings under a white band, two bays, five windows. */
  a17ToLet(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    brickBands(F, 0, L, 5.2, H - 0.7, 0.85);
    const n = 6, w = 1.55, step = L / n;
    for (let i = 0; i <= n; i++) { const s = i * step; pilaster(F, Math.min(Math.max(s, 0.22), L - 0.22), i === 0 || i === n ? 0.44 : 0.5, 0, 4.4, 'rnd', 0.15, false); F.slab('gran', Math.max(s - 0.27, 0), Math.min(s + 0.27, L), 0, 0.2, 0, 0.9); }
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) * step, gk = i < 3 ? 'glassT' : i < 5 ? 'glassD' : 'wht';
      F.slab(gk, s - w / 2, s + w / 2, 0.08, 0.1, 0.9, 3.45); F.arch(gk, s, 3.45, w / 2, 0.1, 10); F.archRing('blk', s, 3.45, w / 2, w / 2 + 0.08, 0.12, 10);
      F.slab('blk', s - w / 2 - 0.05, s - w / 2 + 0.03, 0.08, 0.14, 0.4, 3.45); F.slab('blk', s + w / 2 - 0.03, s + w / 2 + 0.05, 0.08, 0.14, 0.4, 3.45);
      if (i === 1 || i === 5) { F.slab('wht', s - 0.4, s + 0.4, 0.1, 0.14, 0.8, 2.6); F.slab('glass', s - 0.3, s + 0.3, 0.14, 0.16, 1.1, 2.5); }
      F.slab('gran', s - w / 2 - 0.05, s + w / 2 + 0.05, 0, 0.12, 0, 0.45);
    }
    band(F, 0, L, 4.4, 5.15, 'rnd', 0.22); F.slab('rnd', 0, L, 0, 0.3, 5.15, 5.3);
    F.slab('wht', 3.9, 4.6, 0.12, 0.9, 3.75, 4.6); F.slab('navy', 3.95, 4.55, 0.9, 0.92, 3.8, 4.55);   // hanging SHOP TO LET box
    bay(F, L * 0.25, 3.0, 5.8, 8.0, { dep: 0.95, lights: 3, hood: 'copper', hoodH: 1.1 });
    bay(F, L * 0.78, 3.2, 5.8, 8.0, { dep: 0.95, lights: 3, hood: 'copper', pediment: true, hoodH: 0.9 });
    for (const s of [0.9, 3.3, 6.0, 8.5, 11.1]) if (s < L - 0.6) win(F, s, 8.7, 10.2, 1.2, { cols: 2, rows: 2, lintel: 'rnd', sillK: 'stn' });
    F.slab('rnd', 0, L, 0, 0.45, H - 0.6, H - 0.3); F.slab('rnd', 0, L, 0, 0.55, H - 0.3, H);
    // shaped central pediment
    const c = L * 0.5; F.brickQuad([c - 1.8, 0.05, H], [c + 1.8, 0.05, H], [c + 1.8, 0.05, H + 1.0], [c - 1.8, 0.05, H + 1.0]); F.brickQuad([c - 1.1, 0.05, H + 1.0], [c + 1.1, 0.05, H + 1.0], [c + 1.1, 0.05, H + 1.7], [c - 1.1, 0.05, H + 1.7]);
    F.slab('stn', c - 1.9, c + 1.9, 0, 0.2, H + 0.95, H + 1.05); F.slab('stn', c - 1.2, c + 1.2, 0, 0.2, H + 1.65, H + 1.78); F.arch('stn', c, H + 1.78, 0.9, 0.1, 10); F.arch('rnd', c, H + 1.78, 0.62, 0.12, 10);
    for (const s of [0.1, L - 0.1]) F.slab('stn', s - 0.3, s + 0.3, 0, 0.4, 3.8, 5.3);
    F.done(0xe9a589);
  },

  /** Post Office / TG Jones: brick house front with two stacked white bays under two steep brick gables. */
  a17PostOffice(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    F.slab('stn', 0, 0.9, 0, 0.35, 0, 4.3); pilaster(F, L - 0.35, 0.7, 0, 4.3, 'stn', 0.3, false);
    F.slab('bwn', 0.9, L - 0.7, 0, 0.14, 0, 0.7);
    shopfront(F, 0.95, 5.25, { frame: 'bwn', riser: 'bwn', step: 2.1, riserH: 0.7, top: 2.95 });
    F.slab('blk', 0.2, 1.7, 0.1, 0.16, 0.05, 2.7);                                                  // black door at the north end
    shopfront(F, 5.4, L - 0.8, { frame: 'blk', riser: 'bwn', step: 2.0, riserH: 0.7, top: 2.95 });
    F.slab('red', 0.9, 5.3, 0, 0.22, 3.0, 3.65); F.slab('navy', 5.3, L - 0.6, 0, 0.22, 3.0, 3.65);
    band(F, 0, L, 3.65, 4.3, 'blk', 0.18);
    for (const sc of [L * 0.27, L * 0.73]) {
      bay(F, sc, 2.5, 4.9, 6.9, { dep: 0.9, side: 0.45, lights: 3, under: 'blk', bowl: 0.8, hood: 'flat' });
      bay(F, sc, 2.5, 7.55, 9.2, { dep: 0.9, side: 0.45, lights: 3, under: 'blk', bowl: 0.8, hood: 'flat' });
      gable(F, sc, 4.4, H, 3.6, { win: { w: 0.95, y0: 0.5, h: 1.3, cols: 2 }, roof: 'tile' });
    }
    F.done(0xe9ac90);
  },

  /** Shoe Zone (71): ornate red-brick gabled front with cream quoins, twin first-floor windows and an arched gable window. */
  a17ShoeZone(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    for (const s of [0.28, L - 0.28]) { pilaster(F, s, 0.56, 0, 3.8, 'stn', 0.22, false); }
    for (let y = 3.9, i = 0; y < H + 3.0; y += 0.42, i++) for (const e of [0, 1]) { const w = i % 2 ? 0.34 : 0.62, s = e ? L - w / 2 - 0.02 : w / 2 + 0.02; const top = Math.min(y + 0.3, e ? H + 3.0 : H + 3.0); if (y < H) F.slab('stn', s - w / 2, s + w / 2, 0, 0.12, y, top); }
    shopfront(F, 0.6, L - 0.6, { frame: 'blue', riser: 'blue', step: 2.2, riserH: 0.6, top: 3.0, door: [3.3, 5.2], glass: 'glass' });
    for (const s of [2.95, 5.55]) column(F, s, 0.4, 0.2, 3.0, 0.2, 'rnd');
    band(F, 0, L, 3.65, 4.5, 'stn', 0.2);
    for (const s of [L * 0.27, L * 0.73]) { win(F, s, 5.0, 7.3, 2.0, { cols: 3, rows: 2, sillK: 'stn', lintel: 'stn', t: 0.06 }); F.archRing('stn', s, 7.5, 0.7, 1.05, 0.12, 10); F.arch('rnd', s, 7.5, 0.7, 0.1, 10); F.slab('stn', s - 1.1, s + 1.1, 0, 0.18, 7.35, 7.5); }
    F.slab('stn', 0, L, 0, 0.3, H - 0.4, H);
    gable(F, L / 2, L - 0.6, H, 3.55, { win: { w: 1.9, y0: 0.45, h: 1.9, cols: 4, arch: true } });
    // chimney stack behind the left shoulder
    F.slab('brick', L * 0.1, L * 0.1 + 0.9, -1.2, -0.3, H, H + 4.2); F.slab('stn', L * 0.1 - 0.05, L * 0.1 + 0.95, -1.25, -0.25, H + 4.2, H + 4.35);
    F.done(0xe3a085);
  },

  /** Iceland: 1960s two-storey block, red-framed glazed shopfront, white band, ribbon of dark windows, red entrance portal. */
  a17Iceland(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    F.brickQuad([0, 0.12, 0], [0.9, 0.12, 0], [0.9, 0.12, H], [0, 0.12, H]); F.slab('rnd', 0, 0.9, 0, 0.1, H - 0.1, H);
    F.brickQuad([L - 0.7, 0.12, 0], [L, 0.12, 0], [L, 0.12, H], [L - 0.7, 0.12, H]);
    const sx = L - 6.2;
    shopfront(F, 1.0, sx - 0.1, { frame: 'red', riser: 'mid', step: 2.2, riserH: 0.7, top: 2.95, glass: 'glass' });
    F.slab('red', sx - 0.1, sx + 0.12, 0, 0.3, 0, 3.1);
    // entrance portal: red box frame, doors
    F.slab('red', sx, L - 0.7, 0.05, 0.35, 3.0, 3.7); for (const s of [sx + 0.05, L - 0.85]) F.slab('red', s, s + 0.3, 0.05, 0.35, 0, 3.7);
    F.slab('glass', sx + 0.4, L - 0.9, 0.15, 0.2, 0.2, 2.9); F.slab('red', sx + 0.4, L - 0.9, 0.18, 0.26, 2.9, 3.0);
    for (let s = sx + 1.4; s < L - 1.2; s += 1.4) F.slab('red', s - 0.04, s + 0.04, 0.18, 0.26, 0.2, 2.9);
    // band over the shopfront and ribbon windows above
    band(F, 0, L, 3.75, 4.45, 'wht', 0.16); F.slab('orange', 1.0, sx, 0.16, 0.2, 3.95, 4.05);
    F.slab('wht', 0.9, L - 0.7, 0, 0.1, 4.45, H); F.slab('glass', 1.1, L - 0.9, 0.1, 0.12, 4.75, 7.45);
    const nb = Math.round((L - 2) / 1.55); for (let i = 0; i <= nb; i++) { const s = 1.1 + ((L - 2.0) * i) / nb; F.slab('wht', s - 0.05, s + 0.05, 0.1, 0.17, 4.7, 7.5); }
    for (const y of [4.7, 5.6, 6.5, 7.4]) F.slab('wht', 1.1, L - 0.9, 0.1, 0.17, y - 0.04, y + 0.04);
    F.slab('wht', 0.9, L - 0.7, 0, 0.3, H - 0.4, H + 0.05);
    F.done(0xe08c78);
  },

  /**
   * The Works to Coes: half-timbered gables over canted white bays, jettied half-timbered second floors, white-framed bow shopfronts.
   * it.units: [{ s0, s1, gable: bool, timber: 'blk'|'tmbBrn', bay: w, shop: { frame, riser, door } }]
   */
  a17Parade(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H, scale = L / (it.len || L);
    const eave = H, yJ = H - 2.45;
    for (const u of it.units) {
      const s0 = u.s0 * scale, s1 = Math.min(u.s1 * scale, L), sc = (s0 + s1) / 2, w = s1 - s0;
      // ground floor
      if (u.shop !== false) {
        const sh = u.shop || {};
        shopfront(F, s0 + 0.35, s1 - 0.35, { frame: sh.frame || 'wht', riser: sh.riser || 'wht', step: sh.step || 1.5, riserH: sh.riserH ?? 0.7, top: sh.top ?? 2.85, glass: sh.glass || 'glass', door: sh.door ? [sc + sh.door[0], sc + sh.door[1]] : undefined, mid: sh.mid });
        if (sh.bow) { // projecting curved bow: three faces with white frames
          const bd = 0.55, f0 = s0 + 0.5, f1 = s1 - 0.5;
          F.quad(sh.glass || 'glass', [f0, 0.1, 0.7], [f0 + 0.45, bd, 0.7], [f0 + 0.45, bd, 2.85], [f0, 0.1, 2.85]); F.quad(sh.glass || 'glass', [f0 + 0.45, bd, 0.7], [f1 - 0.45, bd, 0.7], [f1 - 0.45, bd, 2.85], [f0 + 0.45, bd, 2.85]); F.quad(sh.glass || 'glass', [f1 - 0.45, bd, 0.7], [f1, 0.1, 0.7], [f1, 0.1, 2.85], [f1 - 0.45, bd, 2.85]);
          F.slab('wht', f0, f1, 0.05, bd + 0.08, 0.0, 0.7); F.slab('wht', f0, f1, 0.05, bd + 0.1, 2.85, 2.97);
          for (let s = f0 + 0.45; s < f1 - 0.4; s += 1.2) F.slab('wht', s - 0.035, s + 0.035, bd, bd + 0.07, 0.7, 2.85);
        }
      }
      if (u.pil !== false) { pilaster(F, s0 + 0.12, 0.44, 0, 3.65, 'wht', 0.2, true); }
      // first floor: brick (the wall), white string course, bay
      F.slab('wht', s0, s1, 0, 0.14, 3.7, 3.95);
      const bw = u.bay ?? Math.min(3.0, w - 1.6);
      if (bw > 0) bay(F, sc, bw, 4.7, 6.65, { dep: 0.95, side: 0.5, lights: u.lights ?? 3, bowl: 0.62, hood: 'flat', under: 'wht' });
      if (u.flatBay) { const fw = u.flatBay; F.slab('wht', sc - fw / 2, sc + fw / 2, 0, 0.75, 4.5, 6.8); F.slab('glass', sc - fw / 2 + 0.15, sc + fw / 2 - 0.15, 0.75, 0.8, 4.9, 6.5); for (let s = sc - fw / 2 + 0.15 + (fw - 0.3) / 4; s < sc + fw / 2 - 0.2; s += (fw - 0.3) / 4) F.slab('wht', s - 0.03, s + 0.03, 0.75, 0.83, 4.9, 6.5); }
      F.slab('wht', s0, s1, 0, 0.12, yJ - 0.4, yJ - 0.2);
      // second floor: half-timber, jettied
      timberStorey(F, s0, s1, yJ, eave, { timber: u.timber || 'blk', jetty: 0.28, stud: u.stud });
      if (u.win1) win(F, sc, 4.95, 6.9, u.win1, { cols: 2, rows: 3, sillK: 'stn', lintel: 'rnd' });
      const wl = Math.min(2.6, w - 1.6);
      if (wl > 0.8) win(F, sc, yJ + 0.55, eave - 0.45, wl, { d: 0.36, cols: u.wcols ?? 4, rows: 2, sill: false });
      if (u.gable !== false) gable(F, sc, Math.min(w - 0.5, u.gw ?? 5.4), eave, u.rise ?? 3.3, { d: 0.28, timber: u.timber || 'blk', barge: u.timber === 'tmbBrn' ? 'tmbBrn' : 'blk', win: u.gwin === false ? undefined : { w: 1.5, y0: 0.35, h: 0.95, cols: 3 } });
      else { F.slab('blk', s0, s1, 0, 0.5, eave, eave + 0.18); F.slab('wht', s0, s1, 0, 0.3, eave + 0.18, eave + 0.6); }
    }
    // downpipes between units
    for (const u of it.units) F.slab('blk', u.s0 * scale + 0.02, u.s0 * scale + 0.1, 0.05, 0.13, 0, H - 0.2);
    F.done(0xf0b79b);
  },

  /** H & T to Nailpro and Taba Naba to Smith & Co: shop units named by fraction of the wall (it.units), plus brick gables. */
  a17Brick(K, it, ctx) {
    const F = frontOf(K, ctx); if (!F) return; const L = F.L, H = K.H;
    for (const u of it.units || []) {
      const s0 = u.s0, s1 = Math.min(u.s1, L), sc = (s0 + s1) / 2;
      const sh = u.shop || {};
      if (sh.kind !== 'none') {
        shopfront(F, s0 + 0.3, s1 - 0.3, { frame: sh.frame || 'blk', riser: sh.riser || 'blk', step: sh.step || 1.8, riserH: sh.riserH ?? 0.55, top: sh.top ?? 2.85, glass: sh.glass || 'glass', door: sh.door ? [sc + sh.door[0], sc + sh.door[1]] : undefined });
        pilaster(F, s0 + 0.14, 0.3, 0, 3.7, sh.pil || sh.frame || 'blk', 0.12, false);
        if (u.sign) plaque(F, K, u.sign.text, s0 + 0.35, s1 - 0.35, 0.2, 2.88, 3.58, u.sign.bg, u.sign.fg, u.sign.serif);
        if (sh.shutter) { F.slab(sh.shutter, s0 + 0.4, s1 - 0.4, 0.1, 0.2, 0.2, 2.9); for (let y = 0.3; y < 2.9; y += 0.13) F.slab('navy', s0 + 0.4, s1 - 0.4, 0.2, 0.22, y, y + 0.03); }
      }
    }
    for (const w of it.wide || []) win(F, w, 5.1, 7.35, 2.3, { arch: true, cols: 4, rows: 2, hood: 'rnd', sillK: 'stn', t: 0.05 });
    for (const w of it.narrow || []) win(F, w, 5.1, 7.35, 1.1, { arch: true, cols: 2, rows: 3, hood: 'rnd', sillK: 'stn', t: 0.05 });
    for (const w of it.upper || []) win(F, w, 7.75, 9.1, 0.95, { cols: 2, rows: 3, lintel: 'rnd', sillK: 'stn' });
    if (it.cornice) { F.slab('stn', 0, L, 0, 0.12, 4.65, 4.8); F.slab('stn', 0, L, 0, 0.12, 7.5, 7.62); F.slab('stn', 0, L, 0, 0.3, H - 0.4, H); }
    for (const g of it.gables || []) gable(F, g.s, g.w, H, g.rise ?? 3.5, { win: { w: 0.95, y0: 0.7, h: 1.3, cols: 2 } });
    for (const c of it.chimneys || []) { F.slab('brick', c - 0.45, c + 0.45, -1.3, -0.4, H, H + 2.6); F.slab('stn', c - 0.52, c + 0.52, -1.37, -0.33, H + 2.6, H + 2.75); for (const o of [-0.2, 0.2]) F.slab('tile', c + o - 0.08, c + o + 0.08, -0.95, -0.8, H + 2.75, H + 3.15); }
    F.done(0xf0a78c);
  },

  /** The 24 Hamilton Road corner: arched windows and a brick gable on the Orwell Road (south) face and the bevelled corner. */
  a17Corner(K, it, ctx) {
    for (const spec of [{ facing: [0, 1], minDot: 0.7 }, { facing: [-0.7, 0.7], minDot: 0.9, minL: 4 }]) {
      const F = frontOf(K, ctx, spec); if (!F) continue; const L = F.L, H = K.H;
      F.slab('stn', 0, L, 0, 0.12, 4.65, 4.8); F.slab('stn', 0, L, 0, 0.12, 7.5, 7.62); F.slab('stn', 0, L, 0, 0.3, H - 0.4, H);
      const n = Math.max(1, Math.round(L / 3.4));
      for (let i = 0; i < n; i++) { const s = ((i + 0.5) * L) / n; win(F, s, 5.1, 7.4, Math.min(2.3, L / n - 0.9), { arch: true, cols: 4, rows: 2, hood: 'rnd', sillK: 'stn' }); win(F, s - 0.55, 7.8, 9.0, 0.9, { cols: 2, rows: 3, sillK: 'stn' }); win(F, s + 0.55, 7.8, 9.0, 0.9, { cols: 2, rows: 3, sillK: 'stn' }); }
      if (spec.facing[1] === 0.7 || spec.minDot === 0.9) gable(F, L / 2, Math.min(L - 0.4, 5.0), H, 3.2, { win: { w: 1.0, y0: 0.6, h: 1.2, cols: 2 } });
      F.done(0xf0a78c);
    }
  },
};

/** Lettering plaque (own copy: the shared label() lays text on the street-facing edge, which is the wrong wall here). */
const TEX = new Map();
function plaque(F, K, text, s0, s1, d, y0, y1, bg, fg, serif) {
  if (typeof document === 'undefined') return;
  const key = text + bg + fg + (serif ? 's' : ''); let tex = TEX.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 1024, 128); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = serif ? 'bold 84px Georgia, "Times New Roman", serif' : 'bold 84px "Helvetica Neue", Arial, sans-serif'; const tw = x.measureText(text).width; if (tw > 960) x.font = x.font.replace('84px', Math.floor(84 * 960 / tw) + 'px'); x.fillText(text, 512, 68);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; TEX.set(key, tex);
  }
  const a = F.P(s0, d, y0), b = F.P(s1, d, y0), c2 = F.P(s1, d, y1), e = F.P(s0, d, y1); // facing east from the street, s (north to south) runs left to right
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c2, ...e], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'a17:plaque'; K.extra.push(m);
}
