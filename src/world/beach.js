// Beach ground (OSM natural=beach / shingle).
//
// The base terrain is a 5 m grid (see landcover.js buildGround). A normally triangulated overlay polygon
// with its own vertices never matches that mesh exactly, so wherever the LiDAR beach is lumpy or drops
// off a bank (the slope below the promenade, the cliff at the water's edge where the DTM has no data)
// the grass base poked through as green patches. Here the beach is instead drawn as the very same 5 m
// grid cells (same vertices, same diagonal, same normals) that have any part inside the beach polygon,
// raised a hair, so the overlay can never dip below the base mesh. The cell edge is a little stepped,
// but it lies under the promenade on the land side and under the sea on the water side.
// Sand/shingle is blended in the material (materials.js beachMaterial) by height, not by geometry.

import * as THREE from 'three';
import { LAYER, GROUND_TEX_SIZE } from './materials.js';

const STEP = 5;           // must equal the base terrain grid step in landcover.js buildGround
const LIFT = 0.05;
const WET_PROBE = [[8, 0], [-8, 0], [0, 8], [0, -8], [5.7, 5.7], [-5.7, 5.7], [5.7, -5.7], [-5.7, -5.7], [4, 0], [0, 4], [-4, 0], [0, -4]];

/** Even-odd inside flags for a regular grid of sample points; xs[i] = x0 + i*STEP (+ off), one z row at a time. */
function rowInside(ring, z, x0, n, off, out) {
  const xs = [];
  for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) {
    const a = ring[k], b = ring[m];
    if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + (z - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
  }
  xs.sort((p, q) => p - q);
  out.fill(0);
  for (let p = 0; p + 1 < xs.length; p += 2) {
    const i0 = Math.max(0, Math.ceil((xs[p] - x0 - off) / STEP)), i1 = Math.min(n - 1, Math.floor((xs[p + 1] - x0 - off) / STEP));
    for (let i = i0; i <= i1; i++) out[i] = 1;
  }
}

/** Draw one beach/shingle polygon as base-mesh cells. ring: world [x,z] outer ring (holes ignored: none in the data). */
export function buildBeachCells(a, tile, ctx) {
  const { acc, ground } = ctx, r = tile.rect;
  const ring = a.outer;
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  for (const [x, z] of ring) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); bz0 = Math.min(bz0, z); bz1 = Math.max(bz1, z); }
  const x0 = Math.floor(Math.max(bx0 - STEP, r.minX) / STEP) * STEP, x1 = Math.min(bx1 + STEP, r.maxX);
  const z0 = Math.floor(Math.max(bz0 - STEP, r.minZ) / STEP) * STEP, z1 = Math.min(bz1 + STEP, r.maxZ);
  const nx = Math.ceil((x1 - x0) / STEP), nz = Math.ceil((z1 - z0) / STEP);
  if (nx <= 0 || nz <= 0) return 0;
  // sample flags: corners (nx+1 x nz+1) and cell centres (nx x nz)
  const corner = [], centre = [];
  const row = new Uint8Array(nx + 1);
  for (let j = 0; j <= nz; j++) { rowInside(ring, z0 + j * STEP, x0, nx + 1, 0, row); corner.push(Uint8Array.from(row)); }
  for (let j = 0; j < nz; j++) { rowInside(ring, z0 + (j + 0.5) * STEP, x0, nx, STEP / 2, row); centre.push(Uint8Array.from(row.subarray(0, nx))); }
  const tex = GROUND_TEX_SIZE.sand, key = `ground:beach:${LAYER.landcover}`;
  const cache = new Map();
  const vtx = (i, j) => {
    const k = j * (nx + 1) + i; let v = cache.get(k); if (v) return v;
    const x = x0 + i * STEP, z = z0 + j * STEP, y = ground(x, z);
    const hx = ground(x + 1, z) - ground(x - 1, z), hz = ground(x, z + 1) - ground(x, z - 1);
    const l = Math.hypot(hx / 2, 1, hz / 2);
    // damp sand: darker where the ground within ~8 m falls to the waterline (vertex colour, interpolated across the cell)
    let lo = y; for (const [ox, oz] of WET_PROBE) lo = Math.min(lo, ground(x + ox, z + oz));
    const wet = Math.min(1, Math.max(0, (1.3 - lo) / 1.1)), tone = [1 - 0.34 * wet, 1 - 0.38 * wet, 1 - 0.42 * wet];
    v = { x, y: y + LIFT, z, n: [-hx / 2 / l, 1 / l, -hz / 2 / l], c: tone }; cache.set(k, v); return v;
  };
  let cells = 0;
  const emit = (A, B, C, ac) => {
    const ny = (B.z - A.z) * (C.x - A.x) - (B.x - A.x) * (C.z - A.z);
    const P = ny >= 0 ? [A, B, C] : [A, C, B];
    const ids = P.map((q) => ac.vert(q.x, q.y, q.z, q.n[0], q.n[1], q.n[2], q.x / tex, -q.z / tex, q.c));
    ac.tri(ids[0], ids[1], ids[2]);
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = x0 + (i + 0.5) * STEP, cz = z0 + (j + 0.5) * STEP;
    if (cx < r.minX || cx >= r.maxX || cz < r.minZ || cz >= r.maxZ) continue;
    if (!(centre[j][i] || corner[j][i] || corner[j][i + 1] || corner[j + 1][i] || corner[j + 1][i + 1])) continue;
    const ac = acc.get(cx, cz, key, true);
    const A = vtx(i, j), B = vtx(i, j + 1), C = vtx(i + 1, j), D = vtx(i + 1, j + 1);
    emit(A, B, C, ac); emit(C, B, D, ac); cells++;
  }
  return cells;
}
