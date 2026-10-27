// Road, pavement, kerb, footpath, marking and railway surfaces.
//
// Car roads are built from the shared RoadNetwork (road-surface.js): smoothed centre lines
// (road-smooth.js), a smoothed and junction-pinned long profile, a crowned carriageway, 3D kerbs
// with raised pavements (dropped at mapped crossings), edge skirts down to the graded ground,
// junction polygons with real kerb-corner radii, dead-end turning heads, centre lines and
// give-way markings. Every vertex height comes from the same functions vehicles and walkers use,
// so what you see is what you drive on.
//
// Overlapping pieces of the same layer share a material and world-space UVs; layers are ordered
// by renderOrder without depth writes (materials.js), so overlaps never z-fight.

import { LAYER, GROUND_TEX_SIZE } from './materials.js';
import { distToSegment } from '../geo/polygon.js';
import { faceNormal } from './accum.js';
import { ROAD } from './road-surface.js';

const LIFT = 0.04;
const MARK = 0.012;

function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

/** Ribbon between lateral offsets [o0, o1] (metres, +left) along a polyline (used by bridges, gardens, furniture). */
export function ribbon(acc, pts, o0, o1, ground, texSize, lift = LIFT) {
  if (pts.length < 2) return;
  const n = pts.length; const L = [], R = [];
  for (let i = 0; i < n; i++) {
    let nx = 0, nz = 0;
    const seg = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; }; // left normal in xz (EN-left)
    if (i > 0) { const s = seg(pts[i - 1], pts[i]); nx += s[0]; nz += s[1]; }
    if (i < n - 1) { const s = seg(pts[i], pts[i + 1]); nx += s[0]; nz += s[1]; }
    const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    let m = 1;
    if (i > 0 && i < n - 1) { const s = seg(pts[i], pts[i + 1]); const c = nx * s[0] + nz * s[1]; m = Math.min(2.2, 1 / Math.max(0.3, c)); }
    const [x, z] = pts[i];
    L.push([x + nx * o1 * m, z + nz * o1 * m]); R.push([x + nx * o0 * m, z + nz * o0 * m]);
  }
  const V = (p) => { const y = ground(p[0], p[1]) + lift; return [p[0], y, p[1]]; };
  const UV = (p) => [p[0] / texSize, -p[1] / texSize];
  for (let i = 0; i < n - 1; i++) {
    const a = R[i], b = R[i + 1], c = L[i + 1], d = L[i];
    const p = [V(a), V(b), V(c), V(d)];
    const ux = p[1][0] - p[0][0], uz = p[1][2] - p[0][2], vx = p[2][0] - p[0][0], vz = p[2][2] - p[0][2];
    if (uz * vx - ux * vz >= 0) acc.quad(p[0], p[1], p[2], p[3], UV(a), UV(b), UV(c), UV(d));
    else acc.quad(p[0], p[3], p[2], p[1], UV(a), UV(d), UV(c), UV(b));
  }
}

export function disc(acc, x, z, r, ground, texSize, lift = LIFT, segs = 14) {
  const y = ground(x, z) + lift;
  const c = [x, y, z];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = [x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r];
    p0[1] = ground(p0[0], p0[2]) + lift; p1[1] = ground(p1[0], p1[2]) + lift;
    acc.triFlat(c, p1, p0, [x / texSize, -z / texSize], [p1[0] / texSize, -p1[2] / texSize], [p0[0] / texSize, -p0[2] / texSize]);
  }
}

function surfaceTex(surface, foot) {
  if (/asphalt|tarmac|paved/.test(surface)) return 'asphalt';
  if (/paving_stones|sett|concrete:plates/.test(surface)) return 'paving';
  if (/concrete/.test(surface)) return 'concrete';
  if (/brick|block|cobble/.test(surface)) return 'blockpaving';
  if (/wood/.test(surface)) return 'wood_deck';
  if (/sand/.test(surface)) return 'sand';
  if (/grass|dirt|earth|ground|mud/.test(surface)) return 'soil';
  return foot ? 'gravel' : 'gravel';
}

// ---------- geometry helpers ----------

/** Up-facing triangle with world-space UVs. */
function triUp(acc, a, b, c, tex) {
  const n = faceNormal(a, b, c); if (n[1] < 0) { const t = b; b = c; c = t; }
  acc.triFlat(a, b, c, [a[0] / tex, -a[2] / tex], [b[0] / tex, -b[2] / tex], [c[0] / tex, -c[2] / tex]);
}
/** Quad that faces `dir` ([x,y,z] hint) with UVs given. */
function quadFacing(acc, p0, p1, p2, p3, uv, dir) {
  const n = faceNormal(p0, p1, p2);
  if (n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2] >= 0) acc.quad(p0, p1, p2, p3, uv[0], uv[1], uv[2], uv[3]);
  else acc.quad(p0, p3, p2, p1, uv[0], uv[3], uv[2], uv[1]);
}

/** Stations along a way between arc lengths s0..s1: every vertex (so arcs stay round) plus every `step` m. */
function stations(W, s0, s1, step = 2) {
  const S = [s0];
  for (let s = Math.ceil(s0 / step) * step; s < s1; s += step) if (s > s0 + 0.05 && s < s1 - 0.05) S.push(s);
  for (let i = 1; i < W.pts.length - 1; i++) { const c = W.cum[i]; if (c > s0 + 0.05 && c < s1 - 0.05) S.push(c); }
  S.push(s1); S.sort((a, b) => a - b);
  const out = [];
  for (const s of S) {
    if (out.length && s - out[out.length - 1].s < 0.04) continue;
    const p = W.pointAt(s); let lx = p.uz, lz = -p.ux, m = 1;
    // at a vertex: bisector normal with a mitre so both sides stay parallel to the centre line
    let vi = -1; for (let i = Math.max(1, p.i); i <= Math.min(W.pts.length - 2, p.i + 1); i++) if (Math.abs(W.cum[i] - s) < 1e-6) vi = i;
    if (vi > 0) {
      const a = W.pts[vi - 1], b = W.pts[vi], c = W.pts[vi + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
      const n1 = [(b[1] - a[1]) / l1, -(b[0] - a[0]) / l1], n2 = [(c[1] - b[1]) / l2, -(c[0] - b[0]) / l2];
      lx = n1[0] + n2[0]; lz = n1[1] + n2[1]; const l = Math.hypot(lx, lz) || 1; lx /= l; lz /= l;
      m = 1 / Math.max(0.5, lx * n1[0] + lz * n1[1]);
    }
    out.push({ s, x: p.x, z: p.z, lx: lx * m, lz: lz * m });
  }
  return out;
}
/** Up-facing strip between offsets o0..o1 (+left) with heights y(s, o). */
function strip(acc, st, o0, o1, y, tex, lift = 0) {
  for (let k = 0; k < st.length - 1; k++) {
    const A = st[k], B = st[k + 1];
    const P = (q, o) => [q.x + q.lx * o, y(q.s, o) + lift, q.z + q.lz * o];
    const a = P(A, o0), b = P(B, o0), c = P(B, o1), d = P(A, o1);
    const uv = [a, b, c, d].map((p) => [p[0] / tex, -p[2] / tex]);
    quadFacing(acc, a, b, c, d, uv, [0, 1, 0]);
  }
}
/** Vertical face along offset o from yBot(s) to yTop(s), facing +left (face = 1) or -left (face = -1). */
function wall(acc, st, o, yTop, yBot, face, tex = 1) {
  for (let k = 0; k < st.length - 1; k++) {
    const A = st[k], B = st[k + 1];
    const ax = A.x + A.lx * o, az = A.z + A.lz * o, bx = B.x + B.lx * o, bz = B.z + B.lz * o;
    const p0 = [ax, yBot(A.s), az], p1 = [bx, yBot(B.s), bz], p2 = [bx, yTop(B.s), bz], p3 = [ax, yTop(A.s), az];
    const nx = (A.lx + B.lx) / 2 * face, nz = (A.lz + B.lz) / 2 * face;
    quadFacing(acc, p0, p1, p2, p3, [[A.s / tex, p0[1] / tex], [B.s / tex, p1[1] / tex], [B.s / tex, p2[1] / tex], [A.s / tex, p3[1] / tex]], [nx, 0, nz]);
  }
}
/** Flat ring sector around (cx,cz) between radii r0..r1, angles a0..a0+sweep, height y(f, r) with f = 0..1 along the arc. */
function ring(acc, cx, cz, r0, r1, a0, sweep, y, tex) {
  const n = Math.max(2, Math.ceil(Math.abs(sweep) / 0.12));
  for (let j = 0; j < n; j++) {
    const f0 = j / n, f1 = (j + 1) / n, t0 = a0 + sweep * f0, t1 = a0 + sweep * f1;
    const P = (r, t, f) => [cx + Math.cos(t) * r, y(f, r), cz + Math.sin(t) * r];
    const a = P(r0, t0, f0), b = P(r0, t1, f1), c = P(r1, t1, f1), d = P(r1, t0, f0);
    if (r0 < 0.01) triUp(acc, a, c, d, tex);
    else { const uv = [a, b, c, d].map((p) => [p[0] / tex, -p[2] / tex]); quadFacing(acc, a, b, c, d, uv, [0, 1, 0]); }
  }
}
/** Vertical arc face at radius r; out = true faces away from the centre. */
function arcWall(acc, cx, cz, r, a0, sweep, yTop, yBot, out, tex = 1) {
  const n = Math.max(2, Math.ceil(Math.abs(sweep) / 0.12));
  for (let j = 0; j < n; j++) {
    const f0 = j / n, f1 = (j + 1) / n, t0 = a0 + sweep * f0, t1 = a0 + sweep * f1, tm = (t0 + t1) / 2;
    const p0 = [cx + Math.cos(t0) * r, yBot(f0), cz + Math.sin(t0) * r], p1 = [cx + Math.cos(t1) * r, yBot(f1), cz + Math.sin(t1) * r];
    const p2 = [p1[0], yTop(f1), p1[2]], p3 = [p0[0], yTop(f0), p0[2]];
    const u0 = (r * t0) / tex, u1 = (r * t1) / tex;
    quadFacing(acc, p0, p1, p2, p3, [[u0, p0[1] / tex], [u1, p1[1] / tex], [u1, p2[1] / tex], [u0, p3[1] / tex]], [Math.cos(tm) * (out ? 1 : -1), 0, Math.sin(tm) * (out ? 1 : -1)]);
  }
}

// ---------- intervals along a way ----------

/** Arc-length intervals where the centre line lies inside the rect (tile ownership). */
function clipIntervals(W, r) {
  const out = [];
  for (let i = 1; i < W.pts.length; i++) {
    const [x0, z0] = W.pts[i - 1], [x1, z1] = W.pts[i], dx = x1 - x0, dz = z1 - z0;
    let t0 = 0, t1 = 1; let ok = true;
    for (const [p, q] of [[-dx, x0 - r.minX], [dx, r.maxX - x0], [-dz, z0 - r.minZ], [dz, r.maxZ - z0]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) { ok = false; break; } continue; }
      const t = q / p; if (p < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
    }
    if (!ok || t1 - t0 < 1e-9) continue;
    const a = W.cum[i - 1] + (W.cum[i] - W.cum[i - 1]) * t0, b = W.cum[i - 1] + (W.cum[i] - W.cum[i - 1]) * t1;
    if (out.length && Math.abs(out[out.length - 1][1] - a) < 1e-6) out[out.length - 1][1] = b; else out.push([a, b]);
  }
  return out;
}
function subtract(ivs, cuts) {
  let cur = ivs.map((v) => v.slice());
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [a, b] of cur) { if (c1 <= a || c0 >= b) { next.push([a, b]); continue; } if (c0 > a) next.push([a, c0]); if (c1 < b) next.push([c1, b]); }
    cur = next;
  }
  return cur.filter(([a, b]) => b - a > 0.05);
}

// ---------- builders ----------

/**
 * @param roads whole OSM ways from the tile's features
 * @param ctx { acc, ground, net: RoadNetwork, rect, tileKey, points }
 */
export function buildRoads(roads, ctx) {
  const { acc, net, rect } = ctx;
  const inR = (x, z) => x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
  const layerKey = (tex, layer) => `ground:${tex}:${layer}`;
  const seen = new Set(), coreIds = new Set();
  const stats = { ways: 0, junctions: 0, caps: 0 };
  for (const r of roads) {
    if (seen.has(r.id) || r.tunnel) continue; seen.add(r.id);
    const W = net.ways.get(r.id);
    if (!W) { // steps (and anything not in the network) as a plain ribbon on the ground
      if (r.kind === 'steps' && !ctx.profiles?.get(r.id)) for (const pts of clipToRect(r.pts, rect)) { const [mx, mz] = pts[0]; ribbon(acc.get(mx, mz, layerKey(surfaceTex(r.surface, true), LAYER.path)), densify(pts, 2), -r.width / 2, r.width / 2, ctx.ground, 3); }
      continue;
    }
    const ivs = clipIntervals(W, rect); if (!ivs.length) continue;
    stats.ways++;
    if (W.car) { buildCarWay(W, ivs, ctx, layerKey, coreIds, inR); }
    else buildFootWay(W, ivs, ctx, layerKey);
  }
  // junction polygons, kerb corners and give-way lines, built by the tile that holds the node
  for (const id of coreIds) {
    const core = net.junction(id); if (!core || !inR(core.x, core.z)) continue;
    buildJunction(core, ctx, layerKey); net.addCore(core, ctx.tileKey); stats.junctions++;
  }
  buildZebras(roads, ctx, layerKey);
  return stats;
}

function clipToRect(pts, r) {
  const out = []; let cur = [];
  const inR = (p) => p[0] >= r.minX && p[0] < r.maxX && p[1] >= r.minZ && p[1] < r.maxZ;
  for (const p of pts) { if (inR(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }
  if (cur.length > 1) out.push(cur); return out;
}

function trimsFor(W, net, coreIds) {
  const cw = [], pl = [], pr = [], mk = [];
  for (const nd of W.nodes) {
    const core = net.junction(nd.id); if (!core) continue; coreIds.add(nd.id);
    for (const a of core.arms) {
      if (a.W !== W || a.i !== nd.i) continue;
      const kL = a.dir > 0 ? a.kPrev : a.kNext, kR = a.dir > 0 ? a.kNext : a.kPrev;
      const span = (d) => (a.dir > 0 ? [a.s - 1e-3, a.s + d] : [a.s - d, a.s + 1e-3]);
      if (a.cw > 0) cw.push(span(a.cw));
      if (kL > 0) pl.push(span(kL)); if (kR > 0) pr.push(span(kR));
      mk.push(span(a.cw + 2));
    }
  }
  return { cw, pl, pr, mk };
}

function buildCarWay(W, ivs, ctx, layerKey, coreIds, inR) {
  const { acc, net } = ctx;
  const tex = surfaceTex(W.road.surface, false), T = GROUND_TEX_SIZE[tex] || 5;
  const tr = trimsFor(W, net, coreIds);
  const mid = W.pointAt((ivs[0][0] + ivs[ivs.length - 1][1]) / 2), key = (t) => acc.get(mid.x, mid.z, t);
  const kerbM = key(layerKey('kerb', LAYER.kerb)), paveM = key(layerKey('paving', LAYER.pavement)), roadM = key(layerKey(tex, LAYER.road));
  const cy = (s, o) => W.carriageY(s, o), hw = W.hw, KW = ROAD.kerbW;
  const ground = (s) => W.edgeY(s) - 0.12;            // edge skirts reach just below the verge
  // carriageway: two half-strips so the crown is modelled
  for (const [a, b] of subtract(ivs, tr.cw)) {
    const st = stations(W, a, b);
    strip(roadM, st, 0, hw, cy, T); strip(roadM, st, -hw, 0, cy, T);
    if (!W.pl) wall(roadM, st, hw, (s) => W.edgeY(s), ground, 1, T);
    if (!W.pr) wall(roadM, st, -hw, (s) => W.edgeY(s), ground, -1, T);
  }
  // kerbs and pavements (trimmed at kerb corners; continuous along straight sides of a junction)
  for (const [side, pw, cuts] of [[1, W.pl, tr.pl], [-1, W.pr, tr.pr]]) {
    if (!pw) continue;
    for (const [a, b] of subtract(ivs, cuts)) {
      const st = stations(W, a, b), py = (s) => W.paveY(s);
      wall(kerbM, st, side * hw, py, (s) => W.edgeY(s) - 0.03, -side, 1);            // kerb face, towards the road
      strip(kerbM, st, side > 0 ? hw : -hw - KW, side > 0 ? hw + KW : -hw, (s) => py(s), 2);
      const o0 = side * (hw + KW), o1 = side * (hw + KW + pw);
      strip(paveM, st, Math.min(o0, o1), Math.max(o0, o1), (s) => py(s), GROUND_TEX_SIZE.paving);
      wall(kerbM, st, o1, py, (s) => py(s) - 0.12, side, 1);                         // back edge down to the verge
    }
  }
  // turning heads at dead ends
  for (const end of [0, 1]) {
    const s = end ? W.L : 0, p = W.pts[end ? W.pts.length - 1 : 0];
    if (!inR(p[0], p[1]) || !net.isDeadEnd(W, end)) continue;
    const q = W.pointAt(s), ux = end ? q.ux : -q.ux, uz = end ? q.uz : -q.uz; // outward
    const a0 = Math.atan2(uz, ux) - Math.PI / 2, sweep = Math.PI;               // from the right side round to the left
    const yc = W.hc(s), ye = W.edgeY(s), pw = Math.max(W.pl, W.pr);
    ring(roadM, p[0], p[1], 0, hw, a0, sweep, (f, r) => yc + (ye - yc) * (r / hw), T);
    if (pw) {
      const yk = W.paveY(s);
      arcWall(kerbM, p[0], p[1], hw, a0, sweep, () => yk, () => ye - 0.03, false);
      ring(kerbM, p[0], p[1], hw, hw + KW, a0, sweep, () => yk, 2);
      ring(paveM, p[0], p[1], hw + KW, hw + KW + pw, a0, sweep, () => yk, GROUND_TEX_SIZE.paving);
      arcWall(kerbM, p[0], p[1], hw + KW + pw, a0, sweep, () => yk, () => ye - ROAD.drop - 0.12, true);
    } else arcWall(roadM, p[0], p[1], hw, a0, sweep, () => ye, () => ye - ROAD.drop - 0.12, true);
  }
  // centre line: 4 m dashes, 5 m gaps (phase along the whole way so tiles agree)
  if (W.road.markings && !W.road.oneway && W.road.width >= 5) {
    const mkM = key(layerKey('markings', LAYER.marking));
    for (const [a, b] of subtract(ivs, [...tr.mk, [-1, 5], [W.L - 5, W.L + 1]])) {
      for (let d0 = Math.floor(a / 9) * 9; d0 < b; d0 += 9) {
        const s0 = Math.max(a, d0), s1 = Math.min(b, d0 + 4); if (s1 - s0 < 0.4) continue;
        strip(mkM, stations(W, s0, s1, 1), -0.05, 0.05, cy, 2, MARK);
      }
    }
  }
}

function buildFootWay(W, ivs, ctx, layerKey) {
  const { acc } = ctx;
  const r = W.road, tex = r.kind === 'pedestrian' && (!r.surface || r.surface === 'paving_stones') ? 'blockpaving' : surfaceTex(r.surface, true), T = GROUND_TEX_SIZE[tex] || 3;
  const mid = W.pointAt(ivs[0][0]), m = acc.get(mid.x, mid.z, layerKey(tex, LAYER.path));
  const y = (s) => W.hc(s), hw = W.hw;
  // the promenade slabs run 0.45 m under the sea wall and out past the seaward edge: the wall and the paving are
  // built from differently mitred stations, so without this a wedge of grass showed between them
  const pw = ctx.promIds && ctx.promIds.has(W.id) ? 0.45 : 0;
  for (const [a, b] of ivs) {
    const st = stations(W, a, b);
    strip(m, st, -hw - pw, hw + pw, (s) => y(s), T);
    if (hw >= 0.5) { wall(m, st, hw, y, (s) => y(s) - 0.16, 1, T); wall(m, st, -hw, y, (s) => y(s) - 0.16, -1, T); }
  }
  for (const end of [0, 1]) {
    const s = end ? W.L : 0; if (!ivs.some(([a, b]) => s >= a - 1e-6 && s <= b + 1e-6)) continue;
    const p = W.pts[end ? W.pts.length - 1 : 0], ys = y(s);
    ring(m, p[0], p[1], 0, hw, 0, Math.PI * 2, () => ys, T);
  }
}

function buildJunction(core, ctx, layerKey) {
  const { acc } = ctx;
  const top = core.arms.reduce((b, a) => (a.W.rank > b.W.rank ? a : b), core.arms[0]);
  const tex = surfaceTex(top.W.road.surface, false), T = GROUND_TEX_SIZE[tex] || 5;
  const roadM = acc.get(core.x, core.z, layerKey(tex, LAYER.road)), kerbM = acc.get(core.x, core.z, layerKey('kerb', LAYER.kerb));
  const paveM = acc.get(core.x, core.z, layerKey('paving', LAYER.pavement)), mkM = acc.get(core.x, core.z, layerKey('markings', LAYER.marking));
  for (const [p, q, r] of core.tris) triUp(roadM, [p[0], p[2], p[1]], [q[0], q[2], q[1]], [r[0], r[2], r[1]], T);
  const KW = ROAD.kerbW;
  for (const k of core.corners) {
    const pw = Math.max(k.A.pNext, k.B.pPrev);
    const yE = (f) => k.yA + (k.yB - k.yA) * f;
    const kh = k.kh ?? ROAD.kerb;
    if (k.type === 'arc') {
      const { C, rc, a0, sweep } = k;
      if (pw) {
        arcWall(kerbM, C[0], C[1], rc, a0, sweep, (f) => yE(f) + kh, (f) => yE(f) - 0.03, true);
        ring(kerbM, C[0], C[1], Math.max(0, rc - KW), rc, a0, sweep, (f) => yE(f) + kh, 2);
        const r0 = Math.max(0, rc - KW - pw);
        if (rc - KW > 0.01) ring(paveM, C[0], C[1], r0, rc - KW, a0, sweep, (f) => yE(f) + kh, GROUND_TEX_SIZE.paving);
        if (r0 > 0.05) arcWall(kerbM, C[0], C[1], r0, a0, sweep, (f) => yE(f) + kh, (f) => yE(f) - ROAD.drop - 0.12, false);
      } else arcWall(roadM, C[0], C[1], rc, a0, sweep, yE, (f) => yE(f) - ROAD.drop - 0.12, false, T);
    } else if (k.type === 'wedge') {
      const r = k.rw;
      if (pw) {
        arcWall(kerbM, core.x, core.z, r, k.a0w, k.sweepW, (f) => yE(f) + kh, (f) => yE(f) - 0.03, false);
        ring(kerbM, core.x, core.z, r, r + KW, k.a0w, k.sweepW, (f) => yE(f) + kh, 2);
        ring(paveM, core.x, core.z, r + KW, r + KW + pw, k.a0w, k.sweepW, (f) => yE(f) + kh, GROUND_TEX_SIZE.paving);
        arcWall(kerbM, core.x, core.z, r + KW + pw, k.a0w, k.sweepW, (f) => yE(f) + kh, (f) => yE(f) - ROAD.drop - 0.12, true);
      } else arcWall(roadM, core.x, core.z, r, k.a0w, k.sweepW, yE, (f) => yE(f) - ROAD.drop - 0.12, true, T);
    }
  }
  // give-way lines (UK: double broken white line) where a minor road meets a bigger one
  if (core.arms.length >= 3) {
    const maxRank = Math.max(...core.arms.map((a) => a.W.rank));
    for (const a of core.arms) {
      if (a.W.rank >= maxRank || a.cw <= 0.5 || a.len < a.cw + 3) continue;
      const W = a.W, hw = W.hw;
      // approach lane: on the left of traffic heading into the junction
      const [o0, o1] = W.road.oneway ? [-hw, hw] : a.dir > 0 ? [-hw, 0] : [0, hw];
      for (const d of [a.cw + 0.3, a.cw + 0.9]) {
        const s0 = a.s + a.dir * d, s1 = a.s + a.dir * (d + 0.2), st = stations(W, Math.min(s0, s1), Math.max(s0, s1), 1);
        for (let o = o0 + 0.15; o < o1 - 0.2; o += 0.9) strip(mkM, st, o, Math.min(o + 0.6, o1 - 0.1), (s, oo) => W.carriageY(s, oo), 2, MARK);
      }
    }
  }
}

function buildZebras(roads, ctx, layerKey) {
  const { acc, net } = ctx;
  const surf = (x, z) => net.surface(x, z)?.y ?? ctx.ground(x, z);
  for (const p of ctx.points || []) {
    if (p.kind !== 'crossing') continue;
    const t = p.tags; if (!(t.crossing === 'zebra' || t.crossing_ref === 'zebra' || t['crossing:markings'] === 'zebra')) continue;
    let best = null;
    for (const r of roads) if (!r.footOnly) for (let i = 1; i < r.pts.length; i++) {
      const d = distToSegment(p.x, p.z, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]);
      if (d.d < 3 && (!best || d.d < best.d)) best = { ...d, r, i };
    }
    if (!best) continue;
    const a = best.r.pts[best.i - 1], b = best.r.pts[best.i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const vx = uz, vz = -ux; const hw = best.r.width / 2;
    const ma = acc.get(p.x, p.z, layerKey('markings', LAYER.marking));
    for (let s = -hw + 0.3; s < hw - 0.3; s += 1.0) {
      const c = [p.x + vx * (s + 0.25), p.z + vz * (s + 0.25)];
      ribbon(ma, densify([[c[0] - ux * 1.5, c[1] - uz * 1.5], [c[0] + ux * 1.5, c[1] + uz * 1.5]], 1), -0.25, 0.25, surf, 2, MARK);
    }
    p.zebra = { ux, uz, hw: hw + ROAD.kerbW + ROAD.pave / 2 + 0.4 };
  }
}

/** Railway: ballast bed + two 3D rails. */
export function buildRail(lines, ctx) {
  const { acc } = ctx;
  for (const l of lines) {
    if (l.kind !== 'rail' || l.tags.tunnel) continue;
    const prof = ctx.profiles?.get(l.id); if (prof && !prof.ramp) continue;
    const ground = prof ? prof.heightAt : ctx.ground;
    const pts = ctx.hasTerrain ? densify(l.pts, 4) : l.pts;
    const [mx, mz] = l.pts[Math.floor(l.pts.length / 2)];
    ribbon(acc.get(mx, mz, `ground:ballast:${LAYER.paved}`), pts, -1.6, 1.6, ground, 3);
    if (l.tags.railway === 'disused' || l.tags.railway === 'abandoned') continue;
    const railAcc = acc.get(mx, mz, 'plain:rail');
    for (const off of [-0.7175, 0.7175]) ribbon(railAcc, pts, off - 0.035, off + 0.035, ground, 1, 0.16);
    const sleeperAcc = acc.get(mx, mz, 'plain:sleeper');
    let along = 0;
    for (let i = 1; i < l.pts.length; i++) {
      const [x0, z0] = l.pts[i - 1], [x1, z1] = l.pts[i]; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) continue;
      const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
      for (let s = (0.65 - (along % 0.65)); s < L; s += 0.65) {
        const c = [x0 + ux * s, z0 + uz * s];
        ribbon(sleeperAcc, [[c[0] - ux * 0.13, c[1] - uz * 0.13], [c[0] + ux * 0.13, c[1] + uz * 0.13]], -1.25, 1.25, ground, 1, 0.09);
      }
      along += L;
    }
  }
}
