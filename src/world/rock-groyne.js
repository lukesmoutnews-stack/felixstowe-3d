// Rock groynes (OSM man_made=groyne): a low ridge of big angular grey and buff blocks running from the
// promenade foot down the beach, as on the Felixstowe seafront (rock armour, not timber).
//
// Boulders are three shared low-poly angular shapes drawn with THREE.InstancedMesh (one draw call per
// shape per 250 m chunk). Placement is deterministic (seeded by the OSM way id) and follows the OSM
// line, each block sitting on ground(x,z). The groyne is widest and highest at the promenade end and
// tapers towards the sea. Colliders are short segments you can hop over (jump) and walk round the end of.

import * as THREE from 'three';
import { mulberry32, orientedBox, distToSegment } from '../geo/polygon.js';

// ---- shared boulder geometries (built once) ----
let GEOS = null, MAT = null;
const lerp = (a, b, t) => a + (b - a) * t;

/** A random convex block: a box with its corners and edges knocked off by random planes (intersection of half-spaces). */
function blockGeometry(rand, cuts) {
  const planes = [];
  for (const [nx, ny, nz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) planes.push({ n: [nx, ny, nz], d: 0.38 + rand() * 0.14 });
  for (let k = 0; k < cuts; k++) {
    let n = [rand() - 0.5, (rand() - 0.5) * 1.3, rand() - 0.5]; const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
    planes.push({ n, d: 0.3 + rand() * 0.16 });
  }
  const verts = [], seen = new Set();
  const P = planes.length;
  for (let a = 0; a < P; a++) for (let b = a + 1; b < P; b++) for (let c = b + 1; c < P; c++) {
    const [A, B, C] = [planes[a], planes[b], planes[c]];
    const det = A.n[0] * (B.n[1] * C.n[2] - B.n[2] * C.n[1]) - A.n[1] * (B.n[0] * C.n[2] - B.n[2] * C.n[0]) + A.n[2] * (B.n[0] * C.n[1] - B.n[1] * C.n[0]);
    if (Math.abs(det) < 1e-6) continue;
    const x = (A.d * (B.n[1] * C.n[2] - B.n[2] * C.n[1]) - A.n[1] * (B.d * C.n[2] - B.n[2] * C.d) + A.n[2] * (B.d * C.n[1] - B.n[1] * C.d)) / det;
    const y = (A.n[0] * (B.d * C.n[2] - B.n[2] * C.d) - A.d * (B.n[0] * C.n[2] - B.n[2] * C.n[0]) + A.n[2] * (B.n[0] * C.d - B.d * C.n[0])) / det;
    const z = (A.n[0] * (B.n[1] * C.d - B.d * C.n[1]) - A.n[1] * (B.n[0] * C.d - B.d * C.n[0]) + A.d * (B.n[0] * C.n[1] - B.n[1] * C.n[0])) / det;
    if (planes.some((q) => q.n[0] * x + q.n[1] * y + q.n[2] * z > q.d + 1e-5)) continue;
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`; if (seen.has(key)) continue; seen.add(key); verts.push([x, y, z]);
  }
  const pos = [], col = [];
  for (const q of planes) {
    const f = verts.filter((v) => Math.abs(q.n[0] * v[0] + q.n[1] * v[1] + q.n[2] * v[2] - q.d) < 1e-4); if (f.length < 3) continue;
    const m = f.reduce((s, v) => [s[0] + v[0] / f.length, s[1] + v[1] / f.length, s[2] + v[2] / f.length], [0, 0, 0]);
    const ref = Math.abs(q.n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = [q.n[1] * ref[2] - q.n[2] * ref[1], q.n[2] * ref[0] - q.n[0] * ref[2], q.n[0] * ref[1] - q.n[1] * ref[0]]; const ul = Math.hypot(...u); u.forEach((_, i) => (u[i] /= ul));
    const w = [q.n[1] * u[2] - q.n[2] * u[1], q.n[2] * u[0] - q.n[0] * u[2], q.n[0] * u[1] - q.n[1] * u[0]];
    f.sort((a, b) => Math.atan2((a[0] - m[0]) * w[0] + (a[1] - m[1]) * w[1] + (a[2] - m[2]) * w[2], (a[0] - m[0]) * u[0] + (a[1] - m[1]) * u[1] + (a[2] - m[2]) * u[2]) - Math.atan2((b[0] - m[0]) * w[0] + (b[1] - m[1]) * w[1] + (b[2] - m[2]) * w[2], (b[0] - m[0]) * u[0] + (b[1] - m[1]) * u[1] + (b[2] - m[2]) * u[2]));
    // face tone: brightness by facing (tops catch the sun), plus a random warm/cool/dark patch so one block shows grey and buff faces
    const up = Math.max(0, q.n[1]), br = (0.66 + rand() * 0.5) * (0.82 + 0.3 * up), warm = (rand() - 0.5) * 0.2;
    for (let t = 1; t + 1 < f.length; t++) for (const v of [f[0], f[t], f[t + 1]]) {
      const lo = 0.8 + 0.4 * Math.min(1, Math.max(0, v[1] + 0.5)); // darker towards the base (damp, in shadow)
      pos.push(v[0], v[1], v[2]); col.push(br * lo * (1 + warm), br * lo, br * lo * (1 - warm));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // winding: make every triangle face away from the block centre
  const pa = g.attributes.position.array;
  for (let t = 0; t < pa.length; t += 9) {
    const ax = pa[t], ay = pa[t + 1], az = pa[t + 2], bx = pa[t + 3], by = pa[t + 4], bz = pa[t + 5], cx = pa[t + 6], cy = pa[t + 7], cz = pa[t + 8];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (nx * (ax + bx + cx) + ny * (ay + by + cy) + nz * (az + bz + cz) < 0) { pa[t + 3] = cx; pa[t + 4] = cy; pa[t + 5] = cz; pa[t + 6] = bx; pa[t + 7] = by; pa[t + 8] = bz; }
  }
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
function geometries() {
  if (GEOS) return GEOS;
  const rand = mulberry32(5150);
  GEOS = [blockGeometry(rand, 2), blockGeometry(rand, 3), blockGeometry(rand, 2), blockGeometry(rand, 4)];
  return GEOS;
}
function material() {
  if (!MAT) MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, envMapIntensity: 0.5 });
  return MAT;
}

// grey granite, dark grey, buff limestone, pale grey-white limestone
const TINTS = [[0.42, 0.41, 0.39], [0.28, 0.28, 0.27], [0.58, 0.49, 0.36], [0.64, 0.62, 0.57]];
const TINT_W = [0.34, 0.24, 0.26, 0.16];

function polylineAt(pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = (s) => {
    s = Math.max(0, Math.min(L, s));
    let i = 1; while (i < pts.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / seg;
    const tx = (b[0] - a[0]) / seg, tz = (b[1] - a[1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx, tz };
  };
  return { L, at };
}

export function buildRockGroynes(lines, tile, ctx) {
  const r = tile.rect, inRect = (x, z) => x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;
  const ground = ctx.ground, colliders = [], stats = { groynes: 0, rocks: 0 };
  const buckets = new Map(); // chunk -> per shape { m: [Matrix4], c: [Color] }
  const geos = geometries();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), Pv = new THREE.Vector3(), C = new THREE.Color();

  for (const l of lines) {
    if (l.kind !== 'groyne' || !l.pts || l.pts.length < 2) continue;
    let pts = l.pts;
    if (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) { // mapped as an outline: use its long axis
      const ob = orientedBox(pts); if (!ob) continue;
      pts = [[ob.cx - ob.ux * ob.length / 2, ob.cz - ob.uz * ob.length / 2], [ob.cx + ob.ux * ob.length / 2, ob.cz + ob.uz * ob.length / 2]];
    }
    const first = pts[0], last = pts[pts.length - 1];
    if (ground(first[0], first[1]) < ground(last[0], last[1])) pts = pts.slice().reverse(); // pts[0] = landward (higher) end
    let line = polylineAt(pts); if (line.L < 4) continue;
    // keep the rocks off the promenade: the OSM line ends on the promenade's centre line
    let trim = 0; const near = (x, z) => {
      let best = 99; if (!ctx.roadGrid) return best;
      for (const s of ctx.roadGrid.query(x - 10, z - 10, x + 10, z + 10)) { const d = distToSegment(x, z, s.a[0], s.a[1], s.b[0], s.b[1]).d - s.road.width / 2; if (d < best) best = d; }
      return best;
    };
    while (trim < 7 && near(line.at(trim).x, line.at(trim).z) < 0.4) trim += 0.5;
    const L = line.L - trim - 0.3; if (L < 3) continue;
    const seed = (Number(String(l.id).replace(/\D/g, '')) || 1) >>> 0, rand = mulberry32(seed);
    stats.groynes++;
    const W = (f) => lerp(3.0, 2.0, f), H = (f) => lerp(1.4, 0.95, f);

    // ---- colliders: short pieces, each with its own crest height (the beach rises towards the promenade) ----
    for (let s = 0; s < L - 0.01; s += 4) {
      const e = Math.min(L, s + 4), a = line.at(trim + s), b = line.at(trim + e), f = (s + e) / 2 / L;
      if (!inRect((a.x + b.x) / 2, (a.z + b.z) / 2)) continue;
      colliders.push({ type: 'segment', a: [a.x, a.z], b: [b.x, b.z], r: W(f) * 0.38 + 0.1, top: Math.max(ground(a.x, a.z), ground(b.x, b.z)) + H(f) * 0.9, kind: 'groyne' });
    }

    // ---- boulders ----
    const put = (x, z, y, sx, sy, sz, v) => {
      if (!inRect(x, z)) return;
      const ck = Math.floor(x / 250) + ',' + Math.floor(z / 250);
      let b = buckets.get(ck); if (!b) { b = geos.map(() => ({ m: [], c: [] })); buckets.set(ck, b); }
      E.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5); Q.setFromEuler(E);
      Pv.set(x, y, z); S.set(sx, sy, sz); M.compose(Pv, Q, S);
      let w = rand(), ti = 0; while (ti < TINT_W.length - 1 && w > TINT_W[ti]) { w -= TINT_W[ti]; ti++; }
      const br = 0.86 + rand() * 0.26; C.setRGB(TINTS[ti][0] * br, TINTS[ti][1] * br, TINTS[ti][2] * br);
      b[v].m.push(M.clone()); b[v].c.push(C.clone()); stats.rocks++;
    };
    const pick = () => (rand() * 4) | 0;
    for (let s = 0.4; s < L; s += 1.0 + rand() * 0.3) {
      const f = s / L, w = W(f), h = H(f), p = line.at(trim + s), nx = -p.tz, nz = p.tx;
      const taper = lerp(1, 0.78, f), endTaper = Math.min(1, (L - s) / 1.6 + 0.35);
      const nb = Math.max(2, Math.round(w / 1.05));
      for (let k = 0; k < nb; k++) {
        const off = -w / 2 + (k + 0.5) * w / nb + (rand() - 0.5) * 0.4, ao = Math.abs(off) / (w / 2);
        const x = p.x + nx * off + p.tx * (rand() - 0.5) * 0.5, z = p.z + nz * off + p.tz * (rand() - 0.5) * 0.5;
        const hp = h * (1 - 0.62 * Math.pow(Math.min(1, ao), 1.5)) * endTaper;      // ridge cross-section height at this offset
        const sy = Math.max(0.5, hp * (0.72 + rand() * 0.4)), sx = (0.95 + rand() * 0.55) * taper * endTaper + 0.15, sz = (0.85 + rand() * 0.55) * taper * endTaper + 0.15;
        const g = ground(x, z);
        put(x, z, g + sy / 2 - 0.12, sx, sy, sz, pick());
        if (ao < 0.55 && hp > 0.55) { // a second course on the crest
          const sy2 = Math.max(0.35, (hp - sy) * 0.9 + 0.35 + rand() * 0.2), ox = (rand() - 0.5) * 0.5;
          const x2 = x + nx * ox, z2 = z + nz * ox;
          put(x2, z2, ground(x2, z2) + hp - sy2 * 0.42, (0.85 + rand() * 0.6) * taper * endTaper + 0.1, sy2, (0.8 + rand() * 0.5) * taper * endTaper + 0.1, pick());
        }
      }
    }
  }

  const meshes = [];
  for (const [ck, b] of buckets) b.forEach((d, v) => {
    if (!d.m.length) return;
    const im = new THREE.InstancedMesh(geos[v], material(), d.m.length);
    d.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, d.c[i]); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); im.renderOrder = 10; im.name = `props:rock:${ck}:${v}`;
    meshes.push(im);
  });
  return { meshes, colliders, stats };
}
