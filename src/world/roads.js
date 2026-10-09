// Road, pavement, kerb, footpath, marking and railway surfaces from OSM centre lines.
// Overlapping pieces of the same layer share a material and world-space UVs, and layers
// are ordered by renderOrder without depth writes, so junction overlaps are seamless.

import { LAYER, GROUND_TEX_SIZE, groundTexName } from './materials.js';
import { distToSegment } from '../geo/polygon.js';

const LIFT = 0.04;

function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

/** Ribbon between lateral offsets [o0, o1] (metres, +left) along a polyline. */
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
    // order so the face points up: a(right,i) -> d(left,i) ... compute and let accum handle normal
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
    // (c, p1, p0) faces up for increasing angle in x/z
    acc.triFlat(c, p1, p0, [x / texSize, -z / texSize], [p1[0] / texSize, -p1[2] / texSize], [p0[0] / texSize, -p0[2] / texSize]);
  }
}

function surfaceTex(surface, foot) {
  if (/asphalt|tarmac|paved/.test(surface)) return foot ? 'asphalt' : 'asphalt';
  if (/paving_stones|sett|concrete:plates/.test(surface)) return 'paving';
  if (/concrete/.test(surface)) return 'concrete';
  if (/brick|block|cobble/.test(surface)) return 'blockpaving';
  if (/wood/.test(surface)) return 'wood_deck';
  if (/sand/.test(surface)) return 'sand';
  if (/grass|dirt|earth|ground|mud/.test(surface)) return 'soil';
  return 'gravel';
}

/**
 * @param roads classified OSM roads
 * @param ctx { acc: ChunkedAccum, ground, points: crossing nodes }
 */
export function buildRoads(roads, ctx) {
  const { acc, ground } = ctx;
  const hasTerrain = !!ctx.hasTerrain;
  // Junction detection via shared OSM node ids (falls back to coordinates).
  const use = new Map();
  const key = (r, i) => r.pts[i][0].toFixed(2) + ',' + r.pts[i][1].toFixed(2);
  for (const r of roads) for (let i = 0; i < r.pts.length; i++) { const k = key(r, i); use.set(k, (use.get(k) || 0) + 1); }
  const junctions = [];
  for (const r of roads) for (let i = 0; i < r.pts.length; i++) { if (use.get(key(r, i)) > 1 || i === 0 || i === r.pts.length - 1) junctions.push({ x: r.pts[i][0], z: r.pts[i][1], r }); }

  const layerKey = (tex, layer) => `ground:${tex}:${layer}`;
  for (const r of roads) {
    if (r.tunnel) continue;
    const pts = hasTerrain ? densify(r.pts, 4) : r.pts;
    const [mx, mz] = r.pts[Math.floor(r.pts.length / 2)];
    const hw = r.width / 2;
    if (!r.footOnly) {
      const pw = 1.9;
      const left = r.sidewalk === 'both' || r.sidewalk === 'left', right = r.sidewalk === 'both' || r.sidewalk === 'right';
      if (left || right) ribbon(acc.get(mx, mz, layerKey('paving', LAYER.pavement)), pts, right ? -(hw + pw) : -hw, left ? hw + pw : hw, ground, GROUND_TEX_SIZE.paving);
      ribbon(acc.get(mx, mz, layerKey('kerb', LAYER.kerb)), pts, -(hw + 0.15), hw + 0.15, ground, GROUND_TEX_SIZE.kerb);
      const tex = surfaceTex(r.surface, false);
      ribbon(acc.get(mx, mz, layerKey(tex, LAYER.road)), pts, -hw, hw, ground, GROUND_TEX_SIZE[tex] || 5);
      for (const end of [r.pts[0], r.pts[r.pts.length - 1]]) {
        if (left || right) disc(acc.get(mx, mz, layerKey('paving', LAYER.pavement)), end[0], end[1], hw + (left || right ? 1.9 : 0), ground, GROUND_TEX_SIZE.paving);
        disc(acc.get(mx, mz, layerKey('kerb', LAYER.kerb)), end[0], end[1], hw + 0.15, ground, GROUND_TEX_SIZE.kerb);
        disc(acc.get(mx, mz, layerKey(tex, LAYER.road)), end[0], end[1], hw, ground, GROUND_TEX_SIZE[tex] || 5);
      }
      if (r.markings && !r.oneway && r.width >= 5) centreLine(acc.get(mx, mz, layerKey('markings', LAYER.marking)), r, junctions, ground);
    } else {
      const tex = r.kind === 'pedestrian' ? (r.surface === 'asphalt' ? 'asphalt' : 'blockpaving') : surfaceTex(r.surface, true);
      ribbon(acc.get(mx, mz, layerKey(tex, LAYER.path)), pts, -hw, hw, ground, GROUND_TEX_SIZE[tex] || 3);
      for (const end of [r.pts[0], r.pts[r.pts.length - 1]]) disc(acc.get(mx, mz, layerKey(tex, LAYER.path)), end[0], end[1], hw, ground, GROUND_TEX_SIZE[tex] || 3, LIFT, 8);
    }
  }
  // zebra crossings (only where OSM says zebra)
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
      ribbon(ma, [[c[0] - ux * 1.5, c[1] - uz * 1.5], [c[0] + ux * 1.5, c[1] + uz * 1.5]], -0.25, 0.25, ground, 2);
    }
    p.zebra = { ux, uz, hw: hw + 1.9 / 2 + 0.5 };
  }
}

function centreLine(acc, r, junctions, ground) {
  // dashed centre line, trimmed near junctions (7 m)
  let along = 0; const dash = 4, gap = 5;
  for (let i = 1; i < r.pts.length; i++) {
    const [x0, z0] = r.pts[i - 1], [x1, z1] = r.pts[i];
    const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) continue;
    const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    let s = 0;
    while (s < L) {
      const phase = (along + s) % (dash + gap);
      if (phase < dash) {
        const e = Math.min(L, s + (dash - phase));
        const a = [x0 + ux * s, z0 + uz * s], b = [x0 + ux * e, z0 + uz * e];
        const near = junctions.some((j) => j.r !== r && (Math.hypot(j.x - a[0], j.z - a[1]) < 7 || Math.hypot(j.x - b[0], j.z - b[1]) < 7))
          || Math.hypot(a[0] - r.pts[0][0], a[1] - r.pts[0][1]) < 6 || Math.hypot(b[0] - r.pts[r.pts.length - 1][0], b[1] - r.pts[r.pts.length - 1][1]) < 6;
        if (!near && e - s > 0.5) ribbon(acc, [a, b], -0.06, 0.06, ground, 2, LIFT);
        s = e;
      } else s += dash + gap - phase;
    }
    along += L;
  }
}

/** Railway: ballast bed + two 3D rails. */
export function buildRail(lines, ctx) {
  const { acc, ground } = ctx;
  for (const l of lines) {
    if (l.kind !== 'rail' || l.tags.tunnel) continue;
    const pts = ctx.hasTerrain ? densify(l.pts, 4) : l.pts;
    const [mx, mz] = l.pts[Math.floor(l.pts.length / 2)];
    ribbon(acc.get(mx, mz, `ground:ballast:${LAYER.paved}`), pts, -1.6, 1.6, ground, 3);
    if (l.tags.railway === 'disused' || l.tags.railway === 'abandoned') continue;
    const railAcc = acc.get(mx, mz, 'plain:rail');
    for (const off of [-0.7175, 0.7175]) {
      ribbon(railAcc, pts, off - 0.035, off + 0.035, ground, 1, 0.16);
    }
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
