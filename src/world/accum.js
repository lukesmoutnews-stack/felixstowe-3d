// Geometry accumulation: many features -> one BufferGeometry per (chunk, material).

import * as THREE from 'three';

export class Accum {
  constructor(hasColor = false) { this.p = []; this.n = []; this.uv = []; this.c = hasColor ? [] : null; this.idx = []; this.count = 0; }
  vert(x, y, z, nx, ny, nz, u, v, col) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v);
    if (this.c) this.c.push(col ? col[0] : 1, col ? col[1] : 1, col ? col[2] : 1);
    return this.count++;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  /** Quad from 4 points (counter-clockwise when viewed from the front) with flat normal. */
  quad(p0, p1, p2, p3, uv0, uv1, uv2, uv3, col) {
    const n = faceNormal(p0, p1, p2);
    const a = this.vert(...p0, ...n, ...uv0, col), b = this.vert(...p1, ...n, ...uv1, col);
    const c = this.vert(...p2, ...n, ...uv2, col), d = this.vert(...p3, ...n, ...uv3, col);
    this.idx.push(a, b, c, a, c, d);
  }
  triFlat(p0, p1, p2, uv0, uv1, uv2, col) {
    const n = faceNormal(p0, p1, p2);
    const a = this.vert(...p0, ...n, ...uv0, col), b = this.vert(...p1, ...n, ...uv1, col), c = this.vert(...p2, ...n, ...uv2, col);
    this.idx.push(a, b, c);
  }
  get empty() { return this.count === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
export function faceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l];
}

/** Accumulators keyed by chunk then material key. */
export class ChunkedAccum {
  constructor(chunkSize = 250) { this.size = chunkSize; this.chunks = new Map(); }
  get(x, z, matKey, hasColor = false) {
    const ck = Math.floor(x / this.size) + ',' + Math.floor(z / this.size);
    let c = this.chunks.get(ck); if (!c) { c = new Map(); this.chunks.set(ck, c); }
    let a = c.get(matKey); if (!a) { a = new Accum(hasColor); c.set(matKey, a); }
    return a;
  }
}

/** Triangulate a polygon with holes (world [x,z] rings). Returns {verts:[[x,z]], tris:[i,j,k]} */
export function triangulate(outer, holes = []) {
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = holes.filter((h) => h.length >= 3).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  let tris;
  try { tris = THREE.ShapeUtils.triangulateShape(contour, hs); } catch (e) { return { verts: [], tris: [] }; }
  const verts = outer.concat(...holes.filter((h) => h.length >= 3));
  return { verts, tris };
}

/** Subdivide triangles until every edge is shorter than maxEdge (for draping on terrain). */
export function subdivide(verts, tris, maxEdge) {
  const V = verts.map((v) => v.slice()); const out = [];
  const mid = new Map();
  const midpoint = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!mid.has(k)) { V.push([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]); mid.set(k, V.length - 1); } return mid.get(k); };
  const stack = tris.map((t) => [t[0], t[1], t[2], 0]);
  while (stack.length) {
    const [a, b, c, d] = stack.pop();
    const lab = Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]), lbc = Math.hypot(V[b][0] - V[c][0], V[b][1] - V[c][1]), lca = Math.hypot(V[c][0] - V[a][0], V[c][1] - V[a][1]);
    const m = Math.max(lab, lbc, lca);
    if (m <= maxEdge || d > 10) { out.push([a, b, c]); continue; }
    if (m === lab) { const e = midpoint(a, b); stack.push([a, e, c, d + 1], [e, b, c, d + 1]); }
    else if (m === lbc) { const e = midpoint(b, c); stack.push([a, b, e, d + 1], [a, e, c, d + 1]); }
    else { const e = midpoint(c, a); stack.push([a, b, e, d + 1], [e, b, c, d + 1]); }
  }
  return { verts: V, tris: out };
}
