// 2D geometry helpers in the world XZ plane. Points are [x, z] arrays.
// Note: z points south, so "north-up" maps flip z. Orientation helpers below use the
// (x, -z) = (east, north) convention so CCW means counter-clockwise on a map.

export function signedAreaEN(ring) { // >0 when CCW in east/north terms
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % n];
    a += x1 * (-z2) - x2 * (-z1);
  }
  return a / 2;
}
export const area = (ring) => Math.abs(signedAreaEN(ring));

export function closeless(ring) { // drop duplicated closing vertex + consecutive duplicates
  const out = [];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.01) out.push(p);
  }
  if (out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.01) out.pop();
  }
  return out;
}
export function ensureCCW(ring) { return signedAreaEN(ring) < 0 ? ring.slice().reverse() : ring; }
export function ensureCW(ring) { return signedAreaEN(ring) > 0 ? ring.slice().reverse() : ring; }

export function centroid(ring) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % n];
    const f = x1 * z2 - x2 * z1; a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sz = 0; for (const p of ring) { sx += p[0]; sz += p[1]; }
    return [sx / ring.length, sz / ring.length];
  }
  return [cx / (3 * a), cz / (3 * a)];
}
export function bounds(points) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minZ, maxX, maxZ };
}
export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInPolygon(x, z, outer, holes = []) {
  if (!pointInRing(x, z, outer)) return false;
  for (const h of holes) if (pointInRing(x, z, h)) return false;
  return true;
}
export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cz = az + t * dz;
  return { d: Math.hypot(px - cx, pz - cz), t, cx, cz };
}
export function polylineLength(pts) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

/** Minimum-area oriented bounding box via rotating calipers over hull edges. */
export function orientedBox(ring) {
  const hull = convexHull(ring);
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const [x1, z1] = hull[i], [x2, z2] = hull[(i + 1) % hull.length];
    const len = Math.hypot(x2 - x1, z2 - z1); if (len < 1e-6) continue;
    const ux = (x2 - x1) / len, uz = (z2 - z1) / len; // axis u, v = perp
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, z] of hull) {
      const u = x * ux + z * uz, v = -x * uz + z * ux;
      if (u < minU) minU = u; if (u > maxU) maxU = u; if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const a = (maxU - minU) * (maxV - minV);
    if (!best || a < best.area) best = { area: a, ux, uz, minU, maxU, minV, maxV };
  }
  if (!best) return null;
  let { ux, uz, minU, maxU, minV, maxV } = best;
  // make u the long axis
  if (maxV - minV > maxU - minU) {
    [ux, uz] = [-uz, ux]; // rotate axes by +90deg: new u = old v direction
    const nminU = minV, nmaxU = maxV; const nminV = -maxU, nmaxV = -minU;
    minU = nminU; maxU = nmaxU; minV = nminV; maxV = nmaxV;
  }
  const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
  return {
    cx: cu * ux - cv * uz, cz: cu * uz + cv * ux,
    ux, uz, length: maxU - minU, width: maxV - minV, area: best.area,
  };
}
export function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}

/** Inward offset of a simple polygon (CCW in EN terms). Returns null if it degenerates. */
export function insetRing(ring, d) {
  const r = ensureCCW(ring), n = r.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % n];
    const len = Math.hypot(x2 - x1, z2 - z1); if (len < 1e-6) return null;
    // EN coords: e = x, n = -z. For CCW polygon interior is to the left: left normal = (-dn, de)
    const de = (x2 - x1) / len, dn = (-(z2) + z1) / len;
    const ne = -dn, nn = de; // inward normal in EN
    lines.push({ e: x1 + ne * d, n: -z1 + nn * d, de, dn });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = lines[(i - 1 + n) % n], B = lines[i];
    const den = A.de * B.dn - A.dn * B.de;
    let e, nn;
    if (Math.abs(den) < 1e-9) { e = B.e; nn = B.n; }
    else {
      const t = ((B.e - A.e) * B.dn - (B.n - A.n) * B.de) / den;
      e = A.e + A.de * t; nn = A.n + A.dn * t;
    }
    out.push([e, -nn]);
  }
  // validity: every edge keeps its direction and area shrinks positively, no self-intersection
  for (let i = 0; i < n; i++) {
    const [x1, z1] = out[i], [x2, z2] = out[(i + 1) % n];
    const de = x2 - x1, dn = -(z2 - z1);
    if (de * lines[i].de + dn * lines[i].dn <= 0.05) return null;
  }
  if (signedAreaEN(out) <= 0.5 || selfIntersects(out)) return null;
  return out;
}
export function segmentsIntersect(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}
export function selfIntersects(ring) {
  const n = ring.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segmentsIntersect(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
  }
  return false;
}

/** Sutherland–Hodgman clip of a ring against an axis-aligned rectangle. */
export function clipRingToRect(ring, r) {
  let pts = ring;
  const edges = [
    (p) => p[0] >= r.minX, (p) => p[0] <= r.maxX, (p) => p[1] >= r.minZ, (p) => p[1] <= r.maxZ,
  ];
  const isect = [
    (a, b) => { const t = (r.minX - a[0]) / (b[0] - a[0]); return [r.minX, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (r.maxX - a[0]) / (b[0] - a[0]); return [r.maxX, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (r.minZ - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.minZ]; },
    (a, b) => { const t = (r.maxZ - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), r.maxZ]; },
  ];
  for (let k = 0; k < 4 && pts.length; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i], prev = pts[(i - 1 + pts.length) % pts.length];
      const ci = edges[k](cur), pi = edges[k](prev);
      if (ci) { if (!pi) out.push(isect[k](prev, cur)); out.push(cur); }
      else if (pi) out.push(isect[k](prev, cur));
    }
    pts = out;
  }
  return pts.length >= 3 ? pts : null;
}

/** Deterministic hash -> [0,1) for stable per-feature variation. */
export function hash01(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
