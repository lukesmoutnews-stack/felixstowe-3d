// Felixstowe Town Hall Garden (part of the Seafront Gardens, Grade II registered as a whole).
//
// Sources: Parks & Gardens UK describe a small public garden laid out in 1902 on the cliff beside the
// Town Hall: steps and terraced paths forming a symmetrical semicircle up the cliff to a seat and
// shelter, banked planting, and a three-tier fountain at the base, level with Undercliff Road West,
// flanked by two small lawns. Felixstowe Town Council (2015) records the new wooden-framed shelter
// as the last part of the restoration. Photos supplied by the game's owner show the present layout:
// dry-stone terrace walls, oak post-and-rail fencing with X-braces, stone steps, an open oak
// shelter with a clay-tiled hipped roof, red-hot pokers, lavender and cordyline palms.
//
// Geometry: the garden outline is OSM way 402525404 ("Felixstowe Gardens"), the shelter footprint
// is the Microsoft/Overture building traced there, and the ground is the EA LiDAR DTM. The fountain
// is not mapped, so it is placed on the garden's axis by the road (the description's "base"), and
// the terrace radii, wall heights and planting positions are reconstructions (documented approximation).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { ensureCCW, pointInRing, distToSegment, orientedBox, hash01 } from '../geo/polygon.js';
import { LAYER } from './materials.js';
import { ribbon, disc } from './roads.js';
import { instances } from './furniture.js';
import { buildLookout } from './lookout.js';

export const GARDEN_ID = 402525404;
export const isTownHallGarden = (a) => a.id === GARDEN_ID; // several Seafront Gardens sections share the name "Felixstowe Gardens"

// R0: the flat lawn at the bottom (fountain level with the road); terraces rise from its edge by steps.
const R0 = 8, BAND = 2.8, N = 7, KX = 0.6; // elliptical terrace metric: lateral distances count KX, so the terraces are a wide horseshoe (satellite plan)
const lerp = (a, b, t) => a + (b - a) * t, clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Work out the layout from the outline and the raw (unmodified) terrain. */
export function gardenPlan(area, terrain, buildings = []) {
  const ring = ensureCCW(area.outer);
  let best = 0, bi = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; bi = i; } }
  const a = ring[bi], b = ring[(bi + 1) % ring.length], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const along = [(b[0] - a[0]) / best, (b[1] - a[1]) / best]; let n = [-along[1], along[0]];
  const cen = ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
  if ((cen[0] - mid[0]) * n[0] + (cen[1] - mid[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const c = [mid[0] + n[0] * 6.5, mid[1] + n[1] * 6.5];
  const raw = (x, z) => terrain.rawHeightAt(x, z);
  const P = { ring, c, axis: n, along, base: raw(c[0], c[1]) + 0.05, L: [], area, roadEdge: { a, b, len: best } };
  P.polar = (x, z) => { const dx = x - c[0], dz = z - c[1]; const up = dx * n[0] + dz * n[1], lat = dx * along[0] + dz * along[1]; return { r: Math.hypot(lat * KX, up), up, lat }; };
  P.at = (r, lat) => { const up = Math.sqrt(Math.max(0, r * r - lat * lat * KX * KX)); return [c[0] + n[0] * up + along[0] * lat, c[1] + n[1] * up + along[1] * lat]; };
  P.atAngle = (r, th) => [c[0] + n[0] * Math.cos(th) * r + along[0] * Math.sin(th) * r / KX, c[1] + n[1] * Math.cos(th) * r + along[1] * Math.sin(th) * r / KX];
  P.fc = [c[0] + along[0] * 2.5 - n[0] * 1.5, c[1] + along[1] * 2.5 - n[1] * 1.5]; // fountain: just right of the axis, near the road (satellite plan)
  P.edgeDist = (x, z) => { let d = Infinity; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; d = Math.min(d, distToSegment(x, z, p[0], p[1], q[0], q[1]).d); } return pointInRing(x, z, ring) ? d : -d; };
  // level of each terrace band: the mean ground across it (inside the garden), always rising
  let prev = P.base;
  for (let k = 0; k < N; k++) {
    const r = R0 + (k + 0.5) * BAND; let s = 0, m = 0;
    for (let th = -1.4; th <= 1.4; th += 0.07) { const [x, z] = P.atAngle(r, th); if (P.edgeDist(x, z) > 1) { s += raw(x, z); m++; } }
    const L = Math.max(m ? s / m : prev + 0.6, prev + 0.35); P.L.push(L); prev = L;
  }
  // even terraces: share the measured rise from the lawn to the top terrace equally between the walls
  { const top = P.L[N - 1]; for (let k = 0; k < N; k++) P.L[k] = P.base + ((k + 1) * (top - P.base)) / N; }
  // the shelter: the traced footprint up the axis, else a 9.3 x 4.6 m reconstruction
  const fp = buildings.find((bd) => bd.outer && pointInRing(bd.cx, bd.cz, ring) && (bd.area || 0) < 90 && Math.hypot(bd.cx - c[0], bd.cz - c[1]) > 15);
  let obb = fp ? orientedBox(fp.outer) : null;
  if (!obb) { const sc = [c[0] + n[0] * 26, c[1] + n[1] * 26]; obb = { cx: sc[0], cz: sc[1], ux: along[0], uz: along[1], length: 9.3, width: 4.6 }; }
  // The shelter sits square to the garden: centred on its axis at the top, long side parallel to the
  // terraces, facing straight down to the fountain (the machine-traced footprint is slightly skewed,
  // so only its size and distance up the slope are used).
  { const up = 21, L = Math.max(10.4, obb.length, obb.width), W = Math.max(4.2, Math.min(obb.length, obb.width));
    obb = { cx: c[0] + n[0] * up, cz: c[1] + n[1] * up, ux: along[0], uz: along[1], length: L, width: W }; }
  // The shelter sits square to the garden: centred on its axis at the top, long side parallel to the
  // terraces, facing straight down to the fountain (the machine-traced footprint is slightly skewed,
  // so only its size and distance up the slope are used).
  { const up = 21, L = Math.max(10.4, obb.length, obb.width), W = Math.max(4.2, Math.min(obb.length, obb.width));
    obb = { cx: c[0] + n[0] * up, cz: c[1] + n[1] * up, ux: along[0], uz: along[1], length: L, width: W }; }
  const sp = P.polar(obb.cx, obb.cz), band = Math.min(N - 1, Math.max(0, Math.floor((sp.r - R0) / BAND)));
  P.shelter = { ...obb, id: fp?.id ?? null, level: P.L[band], band, traced: !!fp };
  P.inShelter = (x, z, m = 1.2) => { const dx = x - obb.cx, dz = z - obb.cz; return Math.abs(dx * obb.ux + dz * obb.uz) < obb.length / 2 + m && Math.abs(-dx * obb.uz + dz * obb.ux) < obb.width / 2 + m; };
  // stair flights: twin flights up from the fountain level, then one central flight to the shelter
  P.flights = []; for (let j = 0; j < N; j++) { const lo = j ? P.L[j - 1] : P.base, hi = P.L[j], run = Math.max(1.4, (hi - lo) / 0.55); if (j === 0) for (const lat of [-10, 0, 10]) P.flights.push({ j, lat, lo, hi, run, re: R0 }); else if (j <= band) P.flights.push({ j, lat: 0, lo, hi, run, re: R0 + j * BAND }); }
  P.onFlight = (j, lat, pad = 0) => P.flights.find((f) => f.j === j && Math.abs(lat - f.lat) < 1.25 + pad);
  /** Reshaped ground: level terraces, ramps through the stair flights, blended out at the garden edge. */
  P.fn = (x, z, h) => {
    const d = P.edgeDist(x, z); if (d <= 0) return h;
    const w = clamp01((d - 0.4) / 2.6);
    if (P.inShelter(x, z, 1.0)) return lerp(h, P.shelter.level, Math.max(w, 0.85));
    const { r, lat } = P.polar(x, z);
    let target;
    if (r < R0) target = P.base;
    else { const k = Math.floor((r - R0) / BAND); if (k >= N) return h; target = P.L[k]; }
    for (const f of P.flights) if (Math.abs(lat - f.lat) < 1.25 && Math.abs(r - f.re) < f.run / 2) target = lerp(f.lo, f.hi, clamp01((r - f.re + f.run / 2) / f.run));
    return lerp(h, target, w);
  };
  return P;
}

// ---------- materials ----------
const cache = new Map();
const M = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
function stoneTexture() {
  return M('stoneTex', () => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#6f6556'; g.fillRect(0, 0, 512, 256); let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 0; y < 256;) { const h = 22 + rnd() * 26; for (let x = -20; x < 512;) { const w = 34 + rnd() * 60; const t = rnd(); g.fillStyle = `hsl(${34 + t * 14}, ${10 + t * 16}%, ${44 + rnd() * 22}%)`; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, h - 4, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 2, y + h - 8, w - 4, 5); x += w; } y += h; }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  });
}
const stoneMat = () => M('stone', () => new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }));
const copingMat = () => M('coping', () => new THREE.MeshStandardMaterial({ color: 0xc9b48e, roughness: 0.9 }));
const oakMat = () => M('oak', () => new THREE.MeshStandardMaterial({ color: 0xa59d8c, roughness: 0.85 }));
const pavingMat = () => M('paving', () => new THREE.MeshStandardMaterial({ color: 0xd6c7a6, roughness: 0.9 }));
function tileTexture() {
  return M('tileTex', () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    for (let y = 0; y < 256; y += 16) for (let x = -16; x < 256; x += 24) { const o = (y / 16) % 2 ? 12 : 0; const l = 42 + ((x * 7 + y * 13) % 11); g.fillStyle = `hsl(22, 58%, ${l + 2}%)`; g.fillRect(x + o, y, 23, 15); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + o, y + 13, 23, 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

// ---------- small geometry helpers ----------
class Geo { constructor() { this.p = []; this.uv = []; this.i = []; }
  quad(a, b, c, d, ua = [0, 0], ub = [1, 0], uc = [1, 1], ud = [0, 1]) { const o = this.p.length / 3; this.p.push(...a, ...b, ...c, ...d); this.uv.push(...ua, ...ub, ...uc, ...ud); this.i.push(o, o + 1, o + 2, o, o + 2, o + 3); }
  mesh(m) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.i); g.computeVertexNormals(); const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; }
}
const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; return o; };

/** X-braced oak post-and-rail fence along a polyline of [x, y, z] tops (y = ground level along it). */
function oakFence(group, pts, height = 1.0, bay = 1.8) {
  const m = oakMat();
  let acc = 0; const posts = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]); acc += L; if (acc >= bay || i === pts.length - 1) { posts.push(pts[i]); acc = 0; } }
  for (const p of posts) group.add(box(0.12, height + 0.1, 0.12, m, p[0], p[1] + (height + 0.1) / 2, p[2]));
  for (let i = 1; i < posts.length; i++) {
    const a = posts[i - 1], b = posts[i], L = Math.hypot(b[0] - a[0], b[2] - a[2]), ang = Math.atan2(b[0] - a[0], b[2] - a[2]), mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, my = (a[1] + b[1]) / 2;
    const slope = Math.atan2(b[1] - a[1], L);
    for (const yy of [height, 0.12]) { const r = box(0.08, 0.08, L, m, mx, my + yy, mz, ang); r.rotation.order = 'YXZ'; r.rotation.x = -slope; group.add(r); }
    const diag = Math.hypot(L, height - 0.12), da = Math.atan2(height - 0.12, L);
    for (const sg of [1, -1]) { const d = box(0.05, 0.06, diag, m, mx, my + (height + 0.12) / 2, mz, ang); d.rotation.order = 'YXZ'; d.rotation.x = -(slope + sg * da); group.add(d); }
  }
}

// ---------- plants (instanced) ----------
function plantGeo(kind) {
  return M('plant:' + kind, () => {
    const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
    if (kind === 'poker') { const parts = []; for (let k = 0; k < 5; k++) { const a = k * 1.26, r = 0.08 + (k % 2) * 0.05, h = 0.85 + (k % 3) * 0.18; parts.push(col(new THREE.CylinderGeometry(0.01, 0.012, h, 4).translate(Math.cos(a) * r, h / 2, Math.sin(a) * r), 0x5a7d33)); parts.push(col(new THREE.ConeGeometry(0.045, 0.24, 6).translate(Math.cos(a) * r, h + 0.06, Math.sin(a) * r), 0xf26a1b)); parts.push(col(new THREE.ConeGeometry(0.05, 0.1, 6).rotateX(Math.PI).translate(Math.cos(a) * r, h - 0.08, Math.sin(a) * r), 0xf4c64a)); } parts.push(col(new THREE.ConeGeometry(0.25, 0.4, 7).translate(0, 0.2, 0), 0x4f6e2c)); return mergeGeometries(parts); }
    if (kind === 'lavender') { const g = new THREE.SphereGeometry(0.32, 9, 6); g.scale(1, 0.62, 1); g.translate(0, 0.18, 0); return mergeGeometries([col(g, 0x8b86b8), col(new THREE.SphereGeometry(0.26, 8, 5).scale(1, 0.5, 1).translate(0, 0.1, 0), 0x7d8f73)]); }
    if (kind === 'grass') return col(new THREE.ConeGeometry(0.28, 0.75, 7).translate(0, 0.37, 0), 0xa7a96a);
    if (kind === 'shrub') { const g = new THREE.IcosahedronGeometry(0.45, 1); g.scale(1, 0.8, 1); g.translate(0, 0.35, 0); return col(g, 0x5b7a3e); }
    if (kind === 'cordyline') { const parts = [col(new THREE.CylinderGeometry(0.06, 0.09, 1.4, 6).translate(0, 0.7, 0), 0x7a6650)]; for (let k = 0; k < 10; k++) { const a = k * 0.63; parts.push(col(new THREE.ConeGeometry(0.035, 0.75, 3).translate(0, 0.37, 0).rotateZ(0.9 + (k % 3) * 0.25).rotateY(a).translate(0, 1.4, 0), 0x6d8a3a)); } return mergeGeometries(parts); }
    if (kind === 'mound' || kind === 'mound2' || kind === 'mound3') { const g = new THREE.IcosahedronGeometry(0.75, 1); g.scale(1, 0.62, 1); g.translate(0, 0.38, 0); return col(g, kind === 'mound' ? 0x3d5f33 : kind === 'mound2' ? 0x86a03e : 0x6e3a31); }
    if (kind === 'yellow') { const g = new THREE.SphereGeometry(0.3, 8, 5); g.scale(1, 0.6, 1); g.translate(0, 0.16, 0); return col(g, 0xe9c441); }
    return null;
  });
}
function plantMesh(kind, list) {
  if (!list.length) return null; const im = new THREE.InstancedMesh(plantGeo(kind), M('plantMat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })), list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((p, i) => { q.setFromAxisAngle(up, p.rot); m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s * (p.sy || 1), p.s)); im.setMatrixAt(i, m4); });
  im.castShadow = true; im.receiveShadow = true; im.name = 'garden:' + kind; return im;
}

// ---------- the fountain ----------
function fountain(c, y) {
  const g = new THREE.Group(); g.position.set(c[0], y, c[1]);
  const stone = M('fstone', () => new THREE.MeshStandardMaterial({ color: 0xd1c6ad, roughness: 0.85 }));
  const water = M('water', () => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 64; const x = cv.getContext('2d'); for (let i = 0; i < 64; i++) { x.fillStyle = `rgba(220,240,255,${0.25 + 0.5 * Math.abs(Math.sin(i * 0.7))})`; x.fillRect(0, i, 16, 1); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.1, color: 0xbfe0f0, side: THREE.DoubleSide, depthWrite: false }); });
  const pool = M('pool', () => new THREE.MeshStandardMaterial({ color: 0x4f7d8a, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }));
  // basin with a rope-moulded rim
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.6, 0.5, 40, 1, true), stone); wall.position.y = 0.25; wall.material.side = THREE.DoubleSide; g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.13, 8, 48), stone); rim.rotation.x = Math.PI / 2; rim.position.y = 0.52; g.add(rim);
  for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; const s = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 4, 8), stone); s.position.set(Math.cos(a) * 2.6, 0.55, Math.sin(a) * 2.6); s.rotation.y = -a; s.rotation.x = 0.6; g.add(s); }
  const surf = new THREE.Mesh(new THREE.CircleGeometry(2.5, 40), pool); surf.rotation.x = -Math.PI / 2; surf.position.y = 0.38; g.add(surf);
  // three tiers on a turned pedestal (lathe profiles)
  const lathe = (pts, m, yy) => { const l = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 28), m); l.position.y = yy; l.castShadow = true; g.add(l); return l; };
  lathe([[0.55, 0], [0.5, 0.15], [0.32, 0.3], [0.26, 0.9], [0.34, 1.0], [0.22, 1.25], [0.0, 1.3]], stone, 0.3);
  const bowl = (r, yy) => { lathe([[0.1, 0], [r * 0.45, 0.06], [r, 0.22], [r * 1.02, 0.3], [r * 0.95, 0.31], [0.1, 0.16]], stone, yy); const w = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 24), pool); w.rotation.x = -Math.PI / 2; w.position.y = yy + 0.27; g.add(w); return yy; };
  bowl(1.35, 1.55); lathe([[0.2, 0], [0.14, 0.2], [0.12, 0.7], [0.18, 0.8], [0, 0.85]], stone, 1.85);
  bowl(0.85, 2.6); lathe([[0.14, 0], [0.1, 0.15], [0.09, 0.5], [0.14, 0.58], [0, 0.6]], stone, 2.88);
  bowl(0.45, 3.4); lathe([[0.1, 0], [0.12, 0.12], [0.07, 0.25], [0.11, 0.35], [0, 0.55]], stone, 3.7); // finial
  // falling water sheets, animated
  const sheets = [];
  for (const [r, top, bot] of [[1.36, 1.84, 0.4], [0.86, 2.89, 1.85], [0.46, 3.69, 2.9]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.08, top - bot, 28, 1, true), water); s.position.y = (top + bot) / 2; g.add(s); sheets.push(s); }
  sheets[0].onBeforeRender = () => { water.map.offset.y -= 0.01; };
  g.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- Mr. Felixstowe's Shelter (its name in the gardens) ----------
function shelter(S, ground) {
  const g = new THREE.Group(); const y0 = S.level + 0.12; g.position.set(S.cx, y0, S.cz); g.rotation.y = Math.atan2(S.ux, S.uz) - Math.PI / 2;
  // local frame: +x along the long side, +z = front (towards the fountain); set by the caller via S.front
  const L = S.length, W = S.width, oak = oakMat(), post = M('darkpost', () => new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.6, metalness: 0.2 })), H = 2.55;
  g.add(box(L + 0.4, 0.24, W + 0.4, pavingMat(), 0, -0.12, 0)); // floor
  const front = W / 2, back = -W / 2, xs = []; const nb = Math.round(L / 1.55); for (let i = 0; i <= nb; i++) xs.push(-L / 2 + (i * L) / nb);
  const posts = [...xs.map((x) => [x, front]), ...xs.map((x) => [x, back]), [-L / 2, 0], [L / 2, 0]];
  for (const [x, z] of posts) { g.add(box(0.2, H, 0.2, post, x, H / 2, z)); g.add(box(0.26, 0.12, 0.26, M('plinth', () => new THREE.MeshStandardMaterial({ color: 0x8c8478 })), x, 0.06, z)); }
  // wall plates and curved knee braces
  for (const z of [front, back]) g.add(box(L + 0.2, 0.22, 0.2, post, 0, H + 0.08, z));
  for (const x of [-L / 2, L / 2]) g.add(box(0.2, 0.22, W + 0.2, post, x, H + 0.08, 0));
  for (const [x, z] of posts) for (const sx of [-1, 1]) { if (Math.abs(x + sx * 0.5) > L / 2 + 0.01) continue; const k = box(0.12, 0.12, 0.7, post, x + sx * 0.28, H - 0.26, z, Math.PI / 2); k.rotation.order = 'YXZ'; k.rotation.x = sx * 0.78; g.add(k); }
  // X-pattern balustrade between front posts (gap in the middle for the steps) and on the ends
  const bay = (x0, z0, x1, z1) => { const Lb = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; g.add(box(0.1, 0.1, Lb, oak, mx, 1.0, mz, a)); g.add(box(0.08, 0.08, Lb, oak, mx, 0.15, mz, a)); const d = Math.hypot(Lb, 0.85), da = Math.atan2(0.85, Lb); for (const sg of [1, -1]) { const dd = box(0.06, 0.06, d, oak, mx, 0.58, mz, a); dd.rotation.order = 'YXZ'; dd.rotation.x = sg * da; g.add(dd); } };
  const mi = Math.floor(xs.length / 2);
  for (let i = 1; i < xs.length; i++) if (i !== mi) bay(xs[i - 1], front, xs[i], front);
  for (const x of [-L / 2, L / 2]) { bay(x, back, x, 0); bay(x, 0, x, front); }
  // back wall: boarded, dark
  g.add(box(L, H - 0.1, 0.06, M('boards', () => new THREE.MeshStandardMaterial({ color: 0x3b3a3d, roughness: 0.8 })), 0, (H - 0.1) / 2, back - 0.05));
  // benches inside along the back
  for (const x of [-L / 4, L / 4]) { g.add(box(L / 2 - 0.6, 0.06, 0.45, oak, x, 0.45, back + 0.4)); g.add(box(L / 2 - 0.6, 0.45, 0.05, oak, x, 0.72, back + 0.15)); }
  // hipped clay-tile roof with dark fascia and ridge cresting
  const ov = 0.55, rl = L / 2 + ov, rw = W / 2 + ov, rh = 1.75, ridge = Math.max(0.6, rl - rw), eave = H + 0.2;
  const geo = new THREE.BufferGeometry(); const v = [-rl, eave, -rw, rl, eave, -rw, rl, eave, rw, -rl, eave, rw, -ridge, eave + rh, 0, ridge, eave + rh, 0];
  const uv = [0, 0, 4, 0, 4, 0, 0, 0, 1.4, 2, 2.6, 2];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv.map((x, i) => (i % 2 ? x : x)), 2));
  geo.setIndex([3, 2, 5, 3, 5, 4, 1, 0, 4, 1, 4, 5, 2, 1, 5, 0, 3, 4]); geo.computeVertexNormals();
  const tm = M('roofTiles', () => new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.85, side: THREE.DoubleSide }));
  const roof = new THREE.Mesh(geo, tm); roof.castShadow = roof.receiveShadow = true; g.add(roof);
  const fascia = M('fascia', () => new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.7 }));
  for (const z of [rw, -rw]) g.add(box(2 * rl + 0.05, 0.2, 0.05, fascia, 0, eave - 0.05, z));
  for (const x of [rl, -rl]) g.add(box(0.05, 0.2, 2 * rw, fascia, x, eave - 0.05, 0));
  g.add(box(2 * ridge + 0.1, 0.1, 0.18, M('ridge', () => new THREE.MeshStandardMaterial({ color: 0xb4532f, roughness: 0.8 })), 0, eave + rh + 0.03, 0));
  for (let x = -ridge; x <= ridge + 0.01; x += 0.3) g.add(box(0.06, 0.16, 0.04, M('crest', () => new THREE.MeshStandardMaterial({ color: 0xb4532f })), x, eave + rh + 0.15, 0));
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/**
 * Build the garden. Returns { meshes, colliders, surfaces, pois }.
 * `ctx.acc` is the tile's chunked accumulator (for ground-hugging gravel and lawns).
 */
export function buildTownHallGardens(P, ctx) {
  const meshes = [], colliders = [], surfaces = [], pois = [], ground = ctx.ground;
  const walls = new Geo(), coping = new Geo(), fences = new THREE.Group(); meshes.push(fences);
  // --- terrace walls (dry stone, coping on top), with fences where the drop is over 0.9 m ---
  for (let j = 0; j < N; j++) {
    const re = R0 + j * BAND, lo = j ? P.L[j - 1] : P.base, hi = P.L[j], drop = hi - lo;
    if (drop < 0.25) continue;
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const fenceTops = [];
        for (let i = 1; i < run.length; i++) {
          const [a, b] = [run[i - 1], run[i]]; const seg = Math.hypot(b.x - a.x, b.z - a.z);
          const ta = a.w * hi + (1 - a.w) * a.g + 0.12, tb = b.w * hi + (1 - b.w) * b.g + 0.12, ba = lo - 0.35, bb = lo - 0.35;
          walls.quad([b.x, bb, b.z], [a.x, ba, a.z], [a.x, ta, a.z], [b.x, tb, b.z], [a.u + seg, 0], [a.u, 0], [a.u, (ta - ba) / 0.8], [a.u + seg, (tb - bb) / 0.8]);
          const ox = (P.c[0] - a.x) / Math.max(1e-3, Math.hypot(P.c[0] - a.x, P.c[1] - a.z)), oz = (P.c[1] - a.z) / Math.max(1e-3, Math.hypot(P.c[0] - a.x, P.c[1] - a.z));
          coping.quad([a.x, ta, a.z], [b.x, tb, b.z], [b.x - ox * 0.5, tb, b.z - oz * 0.5], [a.x - ox * 0.5, ta, a.z - oz * 0.5]);
          colliders.push({ type: 'segment', a: [a.x, a.z], b: [b.x, b.z], r: 0.25, y0: lo - 0.5, top: Math.max(ta, tb) + (drop > 0.9 ? 1.0 : 0.0), kind: 'garden-wall' });
          if (drop > 0.9) fenceTops.push([a.x - ox * 0.3, Math.min(ta, tb) - 0.1, a.z - oz * 0.3]);
          if (i === run.length - 1 && drop > 0.9) fenceTops.push([b.x - ox * 0.3, tb - 0.1, b.z - oz * 0.3]);
        }
        if (fenceTops.length >= 2) oakFence(fences, fenceTops);
      }
      run = [];
    };
    let u = 0;
    for (let th = -1.45; th <= 1.45; th += 0.7 * KX / re) {
      const [x, z] = P.atAngle(re - 0.2, th), d = P.edgeDist(x, z), { lat } = P.polar(x, z);
      const ok = d > 0.9 && !P.onFlight(j, lat, 0.05) && !P.inShelter(x, z, 0.6);
      if (!ok) { flush(); continue; }
      const w = clamp01((d - 0.4) / 2.6);
      if (run.length) u += Math.hypot(x - run[run.length - 1].x, z - run[run.length - 1].z);
      run.push({ x, z, w, g: ground(x, z), u });
    }
    flush();
  }
  meshes.push(walls.mesh(stoneMat()), coping.mesh(copingMat()));
  // --- stair flights: stone treads and oak X-balustrades ---
  const treadM = M('tread', () => new THREE.MeshStandardMaterial({ color: 0xb6a07c, roughness: 0.9 }));
  for (const f of P.flights) {
    const n = Math.max(3, Math.round((f.hi - f.lo) / 0.16)), w = 2.3;
    const pA = P.at(Math.max(0.1, f.re - f.run / 2), f.lat), pB = P.at(f.re + f.run / 2, f.lat), dx = pB[0] - pA[0], dz = pB[1] - pA[1], L = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, y = f.lo + (f.hi - f.lo) * ((k + 1) / n); const tr = box(w, 0.16, L / n + 0.02, treadM, pA[0] + dx * t, y - 0.08, pA[1] + dz * t, ang); meshes.push(tr); }
    const stoneN = M('newel', () => new THREE.MeshStandardMaterial({ color: 0xa79d88, roughness: 0.95 })), capN = M('newelcap', () => new THREE.MeshStandardMaterial({ color: 0xbab099, roughness: 0.9 }));
    for (const s of [-1, 1]) for (const t of [0, 1]) { const nxp = pA[0] + dx * t + Math.cos(ang) * (w / 2 + 0.1) * s, nzp = pA[1] + dz * t - Math.sin(ang) * (w / 2 + 0.1) * s, ny = f.lo + (f.hi - f.lo) * t; meshes.push(box(0.38, 0.9, 0.38, stoneN, nxp, ny + 0.4, nzp, ang)); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.16, 4), capN); cap.rotation.y = ang + Math.PI / 4; cap.position.set(nxp, ny + 0.98, nzp); meshes.push(cap); }
    if (f.lat === 0 && f.j > 0) { // the central flight: twin stainless-steel handrails on slim posts down the middle
      const steel = M('steel', () => new THREE.MeshStandardMaterial({ color: 0xc9ced2, roughness: 0.3, metalness: 0.85 }));
      for (let k = 0; k <= 4; k++) { const t = k / 4, py = f.lo + (f.hi - f.lo) * t, post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), steel); post.position.set(pA[0] + dx * t, py + 0.5, pA[1] + dz * t); meshes.push(post); }
      for (const hy of [0.95, 0.55]) { const a0 = [pA[0], f.lo + hy, pA[1]], b0 = [pB[0], f.hi + hy, pB[1]], d3 = new THREE.Vector3(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]), rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, d3.length(), 6), steel); rail.position.set((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, (a0[2] + b0[2]) / 2); rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d3.normalize()); meshes.push(rail); }
      colliders.push({ type: 'segment', a: [pA[0], pA[1]], b: [pB[0], pB[1]], r: 0.05, y0: f.lo - 0.5, top: f.hi + 1.0, kind: 'railing' });
    }
    else for (const s of [-1, 1]) {
      const ox = Math.cos(ang) * (w / 2 + 0.1) * s, oz = -Math.sin(ang) * (w / 2 + 0.1) * s;
      const pts = []; for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push([pA[0] + dx * t + ox, f.lo + (f.hi - f.lo) * t, pA[1] + dz * t + oz]); }
      oakFence(fences, pts, 0.95, 1.2);
      colliders.push({ type: 'segment', a: [pA[0] + ox, pA[1] + oz], b: [pB[0] + ox, pB[1] + oz], r: 0.12, y0: f.lo - 0.5, top: f.hi + 1.0, kind: 'railing' });
    }
  }
  // --- gravel terrace paths and the fountain lawns ---
  const [mx, mz] = P.c;
  for (let j = 0; j < N - 1; j++) {
    const r = R0 + j * BAND + 1.25, pts = [];
    for (let th = -1.45; th <= 1.45; th += 0.9 * KX / r) { const p = P.atAngle(r, th); if (P.edgeDist(p[0], p[1]) > 1.6 && !P.inShelter(p[0], p[1], 0.4)) pts.push(p); else if (pts.length > 1) { ribbon(ctx.acc.get(mx, mz, `ground:gravel:${LAYER.path}`), pts.splice(0), -0.75, 0.75, ground, 4); } else pts.length = 0; }
    if (pts.length > 1) ribbon(ctx.acc.get(mx, mz, `ground:gravel:${LAYER.path}`), pts, -0.75, 0.75, ground, 4);
  }
  // the flat ground at the bottom (satellite plan): a broad gravel promenade behind the road hedge, the small round fountain just right of the axis, a long rounded lawn strip to its right,
  // and the horseshoe gravel path sweeping round the central planted bed up to the foot of the central steps
  { const g6 = ctx.acc.get(mx, mz, `ground:gravel:${LAYER.paved}`), W = (lat, up) => [P.c[0] + P.axis[0] * up + P.along[0] * lat, P.c[1] + P.axis[1] * up + P.along[1] * lat];
    ribbon(g6, [W(-17, -2.8), W(-8, -2.8), W(0, -2.8), W(8, -2.8), W(17, -2.8)], -3.0, 3.0, ground, 4);
    ribbon(g6, [W(-14, 1.5), W(-14, 4), W(-12, 6)], -1.0, 1.0, ground, 4);
    const hs = []; for (let th = -1.5; th <= 1.5; th += 0.12) hs.push(P.atAngle(R0 - 1.0, th));
    ribbon(ctx.acc.get(mx, mz, `ground:gravel:${LAYER.path}`), hs, -0.95, 0.95, ground, 4);
    const lawn = ctx.acc.get(mx, mz, `ground:park:${LAYER.path}`), a = W(9.0, -0.7), b = W(16.6, -0.7);
    ribbon(lawn, [a, b], -1.9, 1.9, ground, 6, 0.06); disc(lawn, a[0], a[1], 1.9, ground, 6, 0.06, 20); disc(lawn, b[0], b[1], 1.9, ground, 6, 0.06, 20); }
  for (const f of P.flights.filter((q) => q.j === 0 && q.lat !== 0)) { const a = P.at(R0 - 1.0, f.lat), b = P.at(R0 - f.run / 2, f.lat); ribbon(ctx.acc.get(mx, mz, `ground:gravel:${LAYER.path}`), [a, b], -1.0, 1.0, ground, 4); }
  // --- fountain (collider, sign, point of interest) ---
  { const fo = fountain(P.fc, P.base); fo.scale.set(0.68, 0.68, 0.68); meshes.push(fo); }
  colliders.push({ type: 'circle', x: P.fc[0], z: P.fc[1], r: 1.95, y0: P.base - 0.5, top: P.base + 4, kind: 'fountain' });
  const signTex = M('signTex', () => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#1b1f24'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#fff'; g.font = '700 26px Georgia, serif'; g.fillText('Town Hall Fountain', 14, 40); g.font = '16px Georgia, serif'; g.fillStyle = '#d7d7d7'; g.fillText('Felixstowe Seafront Gardens', 14, 70); g.fillText('Please do not climb', 14, 96); g.fillText('on the fountain', 14, 118); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
  { const sp = [P.fc[0] - P.along[0] * 3.0 - P.axis[0] * 1.2, P.fc[1] - P.along[1] * 3.0 - P.axis[1] * 1.2]; const sg = new THREE.Group(); sg.position.set(sp[0], ground(sp[0], sp[1]), sp[1]); sg.rotation.y = Math.atan2(-P.axis[0], -P.axis[1]); sg.add(box(0.06, 1.1, 0.06, M('signpost', () => new THREE.MeshStandardMaterial({ color: 0x1b1f24 })), 0, 0.55, 0)); const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ map: signTex })); plate.position.set(0, 1.15, 0.04); plate.rotation.x = -0.35; sg.add(plate); meshes.push(sg); }
  pois.push({ id: 'g:fountain', name: 'Town Hall Fountain', kind: 'fountain', x: P.fc[0], z: P.fc[1], tags: { amenity: 'fountain', note: 'position reconstructed on the garden axis' } });
  pois.push({ id: 'g:garden', name: 'Town Hall Garden (Seafront Gardens)', kind: 'garden', x: P.c[0] + P.axis[0] * 14, z: P.c[1] + P.axis[1] * 14, tags: { leisure: 'garden' }, ring: P.ring });
  // --- Mr. Felixstowe's Shelter (open-sided: you can walk in; the Town Hall itself stays closed in the game) ---
  const S = P.shelter, sx = S.ux, sz = S.uz; let fx = -sz, fz = sx; // short-axis normal
  if ((P.c[0] - S.cx) * fx + (P.c[1] - S.cz) * fz < 0) { fx = -fx; fz = -fz; }
  // orient the model so its +z (front) faces the fountain
  const sh = shelter({ ...S }, ground); sh.rotation.y = Math.atan2(fx, fz); meshes.push(sh);
  const cosA = Math.cos(sh.rotation.y), sinA = Math.sin(sh.rotation.y), Lx = (x, z) => [S.cx + x * cosA + z * sinA, S.cz - x * sinA + z * cosA];
  const hw = S.length / 2, hd = S.width / 2, yS = S.level + 0.12;
  for (const [ax, az, bx, bz] of [[-hw, -hd, hw, -hd], [-hw, -hd, -hw, hd], [hw, -hd, hw, hd], [-hw, hd, -0.8, hd], [0.8, hd, hw, hd]]) colliders.push({ type: 'segment', a: Lx(ax, az), b: Lx(bx, bz), r: 0.15, y0: yS - 0.3, top: yS + 1.05, kind: 'shelter-rail' });
  surfaces.push({ id: 'garden:shelter', ring: [Lx(-hw - 0.2, -hd - 0.2), Lx(hw + 0.2, -hd - 0.2), Lx(hw + 0.2, hd + 0.2), Lx(-hw - 0.2, hd + 0.2)], heightAt: () => yS, name: 'Mr. Felixstowe’s Shelter', meshes: [] });
  pois.push({ id: 'g:shelter', name: 'Mr. Felixstowe’s Shelter', kind: 'shelter', x: S.cx, z: S.cz, tags: { amenity: 'shelter', shelter_type: 'gazebo' } });
  // --- planting and benches on the terraces ---
  const plants = { poker: [], lavender: [], grass: [], shrub: [], cordyline: [], yellow: [], mound: [], mound2: [], mound3: [] }, benches = [];
  const rnd = (i) => hash01(i * 7919 + 13);
  let id = 0;
  for (let j = 0; j < N - 1; j++) {
    const r0 = R0 + j * BAND + 2.15, r1 = R0 + (j + 1) * BAND - 0.55;
    for (let th = -1.4; th <= 1.4; th += 0.42 * KX / (r0 + 0.5)) for (let rr = r0; rr <= r1; rr += 0.42) {
      id++; const jit = (rnd(id) - 0.5) * 0.3, p = P.atAngle(rr + jit, th + (rnd(id + 1) - 0.5) * 0.05), d = P.edgeDist(p[0], p[1]), { lat } = P.polar(p[0], p[1]);
      if (d < 1.4 || P.inShelter(p[0], p[1], 0.8) || P.flights.some((f) => Math.abs(lat - f.lat) < 1.8 && Math.abs(rr - f.re) < f.run / 2 + 1.5)) continue;
      const y = ground(p[0], p[1]), t = rnd(id + 2);
      const kind = Math.abs(th) > 1.15 && t < 0.25 ? 'cordyline' : t < 0.26 ? 'poker' : t < 0.52 ? 'lavender' : t < 0.68 ? 'grass' : t < 0.86 ? 'shrub' : 'yellow';
      const big = rnd(id + 5);
      if (big < 0.1) plants[big < 0.05 ? 'mound' : big < 0.075 ? 'mound2' : 'mound3'].push({ x: p[0], y, z: p[1], rot: rnd(id + 3) * 6.28, s: 1.1 + rnd(id + 4) * 0.9, sy: 1 });
      else plants[kind].push({ x: p[0], y, z: p[1], rot: rnd(id + 3) * 6.28, s: (kind === 'cordyline' ? 1.4 : 0.8) + rnd(id + 4) * 0.45 });
    }
    for (const th of [-0.95, -0.45, 0.45, 0.95]) { const p = P.atAngle(R0 + j * BAND + 2.05, th); if (P.edgeDist(p[0], p[1]) < 1.6 || P.inShelter(p[0], p[1], 1)) continue; benches.push({ x: p[0], y: ground(p[0], p[1]), z: p[1], rot: Math.atan2(P.c[0] - p[0], P.c[1] - p[1]) + Math.PI }); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.5, y0: ground(p[0], p[1]) - 0.2, top: ground(p[0], p[1]) + 1, kind: 'bench' }); }
  }
  for (let rr = 2.6; rr <= R0 - 2.0; rr += 0.55) for (let th = -1.25; th <= 1.25; th += 0.4 * KX / rr) { id++; const p = P.atAngle(rr, th), { lat } = P.polar(p[0], p[1]); const sp = P.polar(p[0], p[1]); if (Math.hypot(p[0] - P.fc[0], p[1] - P.fc[1]) < 3 || sp.up < 1.8) continue; const t = rnd(id + 2); const kind = t < 0.3 ? 'mound' : t < 0.45 ? 'mound2' : t < 0.55 ? 'mound3' : t < 0.7 ? 'cordyline' : t < 0.82 ? 'lavender' : 'shrub'; plants[kind].push({ x: p[0], y: ground(p[0], p[1]), z: p[1], rot: rnd(id) * 6.28, s: 0.9 + rnd(id + 4) * 0.7, sy: 1 }); void lat; }
  for (let th = -1.45; th <= 1.45; th += 0.05) { const p = P.atAngle(R0 - 0.9, th), { lat } = P.polar(p[0], p[1]); if (P.edgeDist(p[0], p[1]) < 1.2 || P.flights.some((f) => f.j === 0 && Math.abs(lat - f.lat) < 1.8)) continue; id++; plants[rnd(id) < 0.5 ? 'poker' : 'lavender'].push({ x: p[0], y: ground(p[0], p[1]), z: p[1], rot: th * 7, s: 0.9 }); } // bed along the foot of the first terrace
  for (const [k, list] of Object.entries(plants)) { const m = plantMesh(k, list); if (m) meshes.push(m); }
  const bm = instances('bench', benches); if (bm) meshes.push(bm);
  // --- the road edge: low cream retaining wall, black bow-top railing, clipped hedge; Victorian lamps, blue lamp column with baskets, info board, bin, pillar box ---
  { const E = P.roadEdge, ex = (E.b[0] - E.a[0]) / E.len, ez = (E.b[1] - E.a[1]) / E.len, [inx, inz] = P.axis, K2 = [];
    const at = (t, d) => [E.a[0] + ex * t + inx * d, E.a[1] + ez * t + inz * d];
    const latOf = (t) => { const q = at(t, 0); return P.polar(q[0], q[1]).lat; };
    const cream = M('cream', () => new THREE.MeshStandardMaterial({ color: 0xc9bfa6, roughness: 0.95 })), black = M('railblack', () => new THREE.MeshStandardMaterial({ color: 0x23201d, roughness: 0.6, metalness: 0.4 })), hedge = M('hedge', () => new THREE.MeshStandardMaterial({ color: 0x35582d, roughness: 1 }));
    const gap = (t) => Math.abs(latOf(t)) < 1.9;
    const segs = Math.floor(E.len / 1.5);
    for (let i = 0; i < segs; i++) { const t0 = i * 1.5, t1 = t0 + 1.5, tm = (t0 + t1) / 2; if (gap(tm) || P.edgeDist(...at(tm, 0.2)) < 0.05) continue;
      const w0 = at(t0, 0.35), w1 = at(t1, 0.35), r0 = at(t0, -0.2), g0 = ground(w0[0], w0[1]), g1 = ground(w1[0], w1[1]), gr = Math.min(ground(r0[0], r0[1]), g0) - 0.15, top = Math.max(g0, g1) + 0.3;
      const m1 = box(0.42, top - gr, 1.55, cream, (w0[0] + w1[0]) / 2, (top + gr) / 2, (w0[1] + w1[1]) / 2, Math.atan2(ex, ez)); meshes.push(m1);
      colliders.push({ type: 'segment', a: w0, b: w1, r: 0.25, y0: gr, top: top + 0.8, kind: 'garden-wall' });
      const h0 = at(tm, 1.35), hy = ground(h0[0], h0[1]); for (const k of [-0.5, 0, 0.5]) { const hb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), hedge); hb.scale.set(1, 0.95, 1.05); hb.position.set(h0[0] + ex * k, hy + 0.5, h0[1] + ez * k); hb.rotation.y = k * 3; hb.castShadow = true; meshes.push(hb); }
      const rp = at(t0, 0.85), rq = at(t1, 0.85), ry = ground(rp[0], rp[1]);
      meshes.push(box(0.05, 0.85, 0.05, black, rp[0], ry + 0.42, rp[1])); meshes.push(box(0.03, 0.03, 1.5, black, (rp[0] + rq[0]) / 2, ry + 0.8, (rp[1] + rq[1]) / 2, Math.atan2(ex, ez))); meshes.push(box(0.025, 0.025, 1.5, black, (rp[0] + rq[0]) / 2, ry + 0.3, (rp[1] + rq[1]) / 2, Math.atan2(ex, ez)));
      for (let k = 1; k < 6; k++) { const q = at(t0 + k * 0.25, 0.85); meshes.push(box(0.016, 0.5, 0.016, black, q[0], ry + 0.55, q[1])); } }
    void K2;
    const lampMesh = (x, z, h = 3.3) => { const y = ground(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.add(box(0.07, h, 0.07, black, 0, h / 2, 0)); g.add(box(0.2, 0.4, 0.2, black, 0, 0.2, 0)); const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.4, 4), M('lantern', () => new THREE.MeshStandardMaterial({ color: 0xf0e2b0, emissive: 0xf0d890, emissiveIntensity: 0.3 }))); lan.rotation.y = Math.PI / 4; lan.position.y = h + 0.1; g.add(lan); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 4), black); cap.rotation.y = Math.PI / 4; cap.position.y = h + 0.42; g.add(cap); meshes.push(g); colliders.push({ type: 'circle', x, z, r: 0.18, y0: y - 0.3, top: y + h, kind: 'lamp' }); };
    for (const [r, lat] of [[11, -7.5], [11, 7.5], [17, -9], [17, 9], [23, -9], [23, 9], [27.5, -5], [27.5, 5]]) { const p = P.at(r, lat); if (P.edgeDist(p[0], p[1]) > 1.6 && !P.inShelter(p[0], p[1], 1.2)) lampMesh(p[0], p[1]); }
    // the blue Victorian lamp column on the pavement, with two hanging baskets
    { const tm = E.len / 2 - 8, q = at(tm, -1.0), y = ground(q[0], q[1]), blue = M('bluecol', () => new THREE.MeshStandardMaterial({ color: 0x2f4e8c, roughness: 0.5, metalness: 0.4 })), g = new THREE.Group(); g.position.set(q[0], y, q[1]);
      g.add(box(0.1, 5.0, 0.1, blue, 0, 2.5, 0)); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.9, 10), blue); base.position.y = 0.45; g.add(base);
      for (const sx of [-1, 1]) { g.add(box(0.8, 0.04, 0.04, blue, sx * 0.4, 3.9, 0)); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.28, 10), M('pot', () => new THREE.MeshStandardMaterial({ color: 0x6f8a80, roughness: 0.7 }))); pot.position.set(sx * 0.8, 3.65, 0); g.add(pot); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), M('geranium', () => new THREE.MeshStandardMaterial({ color: 0xd8445a, roughness: 0.9 }))); fl.scale.y = 0.65; fl.position.set(sx * 0.8, 3.9, 0); g.add(fl); }
      g.add(box(0.3, 0.4, 0.3, black, 0, 5.2, 0)); meshes.push(g); colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.2, y0: y - 0.3, top: y + 5, kind: 'lamp' }); }
    // information board (black frame on two posts) facing the road
    { const q = [P.c[0] + P.along[0] * -6 - P.axis[0] * 4.2, P.c[1] + P.along[1] * -6 - P.axis[1] * 4.2], y = ground(q[0], q[1]), g = new THREE.Group(); g.position.set(q[0], y, q[1]); g.rotation.y = Math.atan2(-P.axis[0], -P.axis[1]); for (const sx of [-0.4, 0.4]) g.add(box(0.05, 0.95, 0.05, black, sx, 0.47, 0)); const bd = box(1.0, 0.55, 0.05, M('board', () => new THREE.MeshStandardMaterial({ color: 0xcfcab8, roughness: 0.6 })), 0, 1.0, 0); bd.rotation.x = -0.25; g.add(bd); meshes.push(g); colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.5, y0: y - 0.3, top: y + 1.4, kind: 'sign' }); }
    // pillar box and litter bin beside the central path
    { const q = at(E.len / 2 + 0, -0.4), px = q[0] + ex * 2.6 + inx * 1.2, pz = q[1] + ez * 2.6 + inz * 1.2, y = ground(px, pz), g = new THREE.Group(); g.position.set(px, y, pz);
      const red = M('pillar', () => new THREE.MeshStandardMaterial({ color: 0xc4161c, roughness: 0.45, metalness: 0.2 }));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.3, 14), red).translateY(0.65)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.14, 14), red).translateY(1.37)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.3, 0.1, 14), red).translateY(1.47)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.25, 14), black).translateY(0.12)); meshes.push(g); colliders.push({ type: 'circle', x: px, z: pz, r: 0.35, y0: y - 0.3, top: y + 1.5, kind: 'postbox' });
      const bx = q[0] + ex * 1.6 + inx * 2.2, bz = q[1] + ez * 1.6 + inz * 2.2, by = ground(bx, bz), bin = new THREE.Group(); bin.position.set(bx, by, bz); bin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 10), black).translateY(0.45)); bin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 10), M('bingold', () => new THREE.MeshStandardMaterial({ color: 0xc2a24a, metalness: 0.6, roughness: 0.4 }))).translateY(0.93)); meshes.push(bin); colliders.push({ type: 'circle', x: bx, z: bz, r: 0.3, y0: by - 0.3, top: by + 1, kind: 'bin' }); }
  }
  // --- the clifftop lookout above the shelter ---
  { const lk = buildLookout(P, ctx); meshes.push(...lk.meshes); colliders.push(...lk.colliders); }
  return { meshes, colliders, surfaces, pois };
}
