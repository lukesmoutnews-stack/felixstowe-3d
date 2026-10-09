// Build land polygons for a rectangular tile from OSM natural=coastline ways.
// OSM convention: land is on the LEFT of the coastline direction, sea on the right.
// In east/north terms a land polygon is therefore traversed counter-clockwise.

import { joinChains } from './osm.js';
import { signedAreaEN, closeless, pointInRing } from './polygon.js';

/** Perimeter parameter of a boundary point, walking CCW in EN terms (east along south edge first). */
function perim(p, r) {
  const W = r.maxX - r.minX, H = r.maxZ - r.minZ, e = 1e-6;
  const [x, z] = p;
  if (Math.abs(z - r.maxZ) < e) return x - r.minX;                 // south edge, west->east
  if (Math.abs(x - r.maxX) < e) return W + (r.maxZ - z);           // east edge, south->north
  if (Math.abs(z - r.minZ) < e) return W + H + (r.maxX - x);       // north edge, east->west
  return 2 * W + H + (z - r.minZ);                                 // west edge, north->south
}
const CORNERS = (r) => [ // in CCW perimeter order with their parameters
  { p: [r.maxX, r.maxZ], s: r.maxX - r.minX },
  { p: [r.maxX, r.minZ], s: (r.maxX - r.minX) + (r.maxZ - r.minZ) },
  { p: [r.minX, r.minZ], s: 2 * (r.maxX - r.minX) + (r.maxZ - r.minZ) },
  { p: [r.minX, r.maxZ], s: 2 * (r.maxX - r.minX) + 2 * (r.maxZ - r.minZ) },
];

/** Liang–Barsky clip of segment a-b; returns [t0, t1] or null. */
function clipSeg(a, b, r) {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dz = b[1] - a[1];
  const p = [-dx, dx, -dz, dz], q = [a[0] - r.minX, r.maxX - a[0], a[1] - r.minZ, r.maxZ - a[1]];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
    else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [t0, t1];
}
/** Point where the ray from a through b (continuing past b) leaves the rect. */
function rayToRect(a, b, r) {
  const dx = b[0] - a[0], dz = b[1] - a[1]; if (!dx && !dz) return null;
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (r.maxX - b[0]) / dx); if (dx < 0) t = Math.min(t, (r.minX - b[0]) / dx);
  if (dz > 0) t = Math.min(t, (r.maxZ - b[1]) / dz); if (dz < 0) t = Math.min(t, (r.minZ - b[1]) / dz);
  if (!isFinite(t) || t < 0) return null;
  return [b[0] + dx * t, b[1] + dz * t];
}
const inside = (p, r) => p[0] > r.minX && p[0] < r.maxX && p[1] > r.minZ && p[1] < r.maxZ;

/** Split a chain into pieces inside the rect; each piece runs boundary->boundary. */
function clipChain(chain, r) {
  const pieces = []; let cur = null;
  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i], b = chain[i + 1];
    const c = clipSeg(a, b, r);
    if (!c) { if (cur) { pieces.push(cur); cur = null; } continue; }
    const [t0, t1] = c;
    const pa = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
    const pb = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
    if (!cur) cur = { pts: [pa], startsInside: t0 === 0 && inside(a, r) };
    cur.pts.push(pb);
    if (t1 < 1) { pieces.push(cur); cur = null; }
  }
  if (cur) { cur.endsInside = true; pieces.push(cur); }
  return pieces;
}

/**
 * @param coastLines array of polylines ([x,z][]) from natural=coastline ways
 * @param r rect {minX,minZ,maxX,maxZ}
 * @param landHint fallback when no coastline crosses the rect: true=land, false=sea
 * @returns {{land: Array<{outer, holes}>, status: string}}
 */
export function landPolygons(coastLines, r, landHint = true) {
  const rectRing = [[r.minX, r.maxZ], [r.maxX, r.maxZ], [r.maxX, r.minZ], [r.minX, r.minZ]];
  if (!coastLines.length) return { land: landHint ? [{ outer: rectRing, holes: [] }] : [], status: landHint ? 'no-coast:land' : 'no-coast:sea' };
  const chains = joinChains(coastLines);
  const pieces = [], islands = [], lakes = [];
  let broken = 0;
  for (const ch of chains) {
    const closed = ch.length > 3 && Math.hypot(ch[0][0] - ch[ch.length - 1][0], ch[0][1] - ch[ch.length - 1][1]) < 0.01;
    if (closed && ch.every((p) => inside(p, r))) {
      const ring = closeless(ch);
      (signedAreaEN(ring) > 0 ? islands : lakes).push(ring);
      continue;
    }
    for (const pc of clipChain(ch, r)) {
      if (pc.startsInside || pc.endsInside) {
        // Incomplete coastline in the downloaded box: extend the dangling end straight to the
        // tile edge along its last segment (documented approximation) and report it.
        broken++;
        if (pc.startsInside) { const e = rayToRect(pc.pts[1] || pc.pts[0], pc.pts[0], r); if (!e) continue; pc.pts.unshift(e); }
        if (pc.endsInside) { const n = pc.pts.length; const e = rayToRect(pc.pts[n - 2] || pc.pts[n - 1], pc.pts[n - 1], r); if (!e) continue; pc.pts.push(e); }
      }
      if (pc.pts.length >= 2) pieces.push({ pts: pc.pts, sIn: perim(pc.pts[0], r), sOut: perim(pc.pts[pc.pts.length - 1], r) });
    }
  }
  const land = [];
  if (pieces.length) {
    const P = 2 * ((r.maxX - r.minX) + (r.maxZ - r.minZ));
    const used = new Set();
    for (let start = 0; start < pieces.length; start++) {
      if (used.has(start)) continue;
      const ring = []; let k = start, guard = 0;
      while (guard++ < pieces.length + 2) {
        used.add(k);
        const pc = pieces[k];
        ring.push(...pc.pts);
        // walk the boundary CCW from this exit to the nearest entry
        let best = -1, bestD = Infinity;
        for (let j = 0; j < pieces.length; j++) {
          let d = pieces[j].sIn - pc.sOut; if (d < 0) d += P;
          if (d < bestD) { bestD = d; best = j; }
        }
        for (const c of CORNERS(r)) {
          let d = c.s - pc.sOut; if (d < 0) d += P;
          if (d > 0 && d < bestD) ring.push({ corner: c, d });
        }
        // sort the corner entries we just pushed by distance
        const tail = []; while (ring.length && ring[ring.length - 1].corner) tail.push(ring.pop());
        tail.sort((a, b) => a.d - b.d).forEach((c) => ring.push(c.corner.p.slice()));
        if (best === start) break;
        if (used.has(best)) break;
        k = best;
      }
      const cr = closeless(ring);
      if (cr.length >= 3) land.push({ outer: cr, holes: [] });
    }
  } else {
    // No crossing pieces: whole rect is land if lakes (sea holes) exist or hint says so.
    if (landHint || lakes.length) land.push({ outer: rectRing, holes: [] });
  }
  for (const isl of islands) land.push({ outer: isl, holes: [] });
  for (const lk of lakes) {
    const host = land.find((l) => pointInRing(lk[0][0], lk[0][1], l.outer));
    if (host) host.holes.push(lk);
  }
  return { land, status: `pieces:${pieces.length} islands:${islands.length} seaHoles:${lakes.length} brokenEnds:${broken}` };
}
