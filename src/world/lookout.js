// The clifftop lookout above the Town Hall Garden shelter (Convalescent Hill / Undercliff Road West), modelled from the
// user's Street View photographs (September 2026, streetview-lookout-1..5): a wide ochre bound-gravel terrace with a
// concrete footway and a dark kerb on the road side; along the cliff edge a dark blue-grey wavy railing with gilt finials
// and gold ship's-wheel medallions; iron benches with timber slats facing the sea; a semicircular bench in a mosaic ring;
// a lantern lamp; a coin-operated viewer on a post; silver crowd barriers; and a large deciduous tree at the east end.
// Placed in the garden frame (lat along the garden's long side, up = away from the fountain, towards the cliff top).
import * as THREE from 'three';
import { makeKit } from './geo-kit.js';

let MM = null;
function mats() {
  if (MM) return MM;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const cvt = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  MM = {
    gravel: std({ map: cvt(128, 128, (g, w, h) => { g.fillStyle = '#b48c58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const l = 36 + r() * 30; g.fillStyle = `hsl(${28 + r() * 10},${35 + r() * 20}%,${l}%)`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); } }), roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    iron: std({ color: 0x35424d, roughness: 0.55, metalness: 0.45 }),
    gilt: std({ color: 0xc79a3a, roughness: 0.35, metalness: 0.8 }),
    slat: std({ color: 0x5a3326, roughness: 1 }),
    mosaic: std({ map: cvt(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(206,199,183,0.92)'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(120,112,98,0.55)'; g.lineWidth = 2; for (const f of [0.93, 0.62]) { g.beginPath(); g.arc(w / 2, h / 2, w / 2 * f, 0, Math.PI * 2); g.stroke(); } g.lineWidth = 1; g.strokeStyle = 'rgba(120,112,98,0.3)'; for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(t) * w * 0.31, h / 2 + Math.sin(t) * h * 0.31); g.lineTo(w / 2 + Math.cos(t) * w * 0.465, h / 2 + Math.sin(t) * h * 0.465); g.stroke(); } }), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    black: std({ color: 0x1b1d21, roughness: 0.5, metalness: 0.35 }),
    lamp: std({ color: 0xf2e6b8, emissive: 0xf2d98a, emissiveIntensity: 0.25, roughness: 0.4 }),
    steel: std({ color: 0xc4c9cd, roughness: 0.4, metalness: 0.7 }),
    blue: std({ color: 0x23468a, roughness: 0.5, metalness: 0.2 }), yellow: std({ color: 0xe5c12b, roughness: 0.5 }),
    wall: std({ map: cvt(128, 128, (g, w, h) => { g.fillStyle = '#b6b5ad'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 21) { g.fillStyle = 'rgba(70,68,60,.28)'; g.fillRect(0, y, w, 1.6); } for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,38,30'},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 8); } }), roughness: 0.95 }),
    concrete: std({ color: 0xc9c7bf, roughness: 0.9 }),
    bark: std({ color: 0x4e3f30, roughness: 0.95 }),
    leafA: std({ color: 0x4f6a2a, roughness: 0.95 }), leafB: std({ color: 0x6f6b2a, roughness: 0.95 }), leafC: std({ color: 0x8a6a28, roughness: 0.95 }),
  };
  MM.wall.map.repeat.set(1, 1);
  return MM;
}

const edgeUpOf = (lat) => 26.4 - 0.04 * lat;
const cl01 = (v) => Math.max(0, Math.min(1, v));
/** Terrain modifier: one flat level for the whole terrace (railing line to the footway), blended into the slope beyond the railing and into the verge at the ends. */
export function lookoutPlan(P, terrain) {
  const [cx, cz] = P.c, [nx, nz] = P.axis, [ax, az] = P.along, W = (lat, up) => [cx + nx * up + ax * lat, cz + nz * up + az * lat];
  let sum = 0, n = 0; for (let lat = 0; lat <= 30; lat += 3) for (let up = 28; up <= 33; up += 1.5) { const p = W(lat, up); sum += terrain.rawHeightAt(p[0], p[1]); n++; }
  const level = sum / n, LA = -5.5, LB = 36, U1 = 36.4;
  const ring = [W(LA - 1, 22.5), W(LB + 1, 22.5 - 0.04 * 40), W(LB + 1, U1 + 0.5), W(LA - 1, U1 + 0.5)];
  const fn = (x, z, h) => { const dx = x - cx, dz = z - cz, up = dx * nx + dz * nz, lat = dx * ax + dz * az;
    const wl = cl01((up - (edgeUpOf(lat) - 2.6)) / 2.3), wu = cl01((U1 - up) / 2.4), wa = cl01((lat - LA) / 1.8) * cl01((LB - lat) / 1.8), w = wl * wu * wa;
    return w <= 0 ? h : h + (level - h) * w; };
  const has = (x, z) => { const dx = x - cx, dz = z - cz, up = dx * nx + dz * nz, lat = dx * ax + dz * az; return lat > -6 && lat < 37 && up > 24 && up < 37.5; };
  return { ring, fn, level, has };
}

export function buildLookout(P, ctx) {
  const M = mats(), K = makeKit(), ground = ctx.ground, colliders = [], meshes = [];
  const [cx, cz] = P.c, [nx, nz] = P.axis, [ax, az] = P.along;
  const W = (lat, up) => [cx + nx * up + ax * lat, cz + nz * up + az * lat];
  const edgeUp = (lat) => 26.4 - 0.04 * lat;                         // the cliff-edge railing line
  const LAT0 = -4, LAT1 = 34;
  const roadAt = (x, z) => ctx.nearestRoad(x, z, 14, (q) => q.car);
  const kerbUp = (lat) => { for (let up = edgeUp(lat) + 2; up < edgeUp(lat) + 22; up += 0.15) { const p = W(lat, up), r = roadAt(p[0], p[1]); if (r && r.d <= r.road.width / 2 + 2.9) return up; } return edgeUp(lat) + 8; };
  const Y = (lat, up) => { const p = W(lat, up); return ground(p[0], p[1]); };
  // ochre bound-gravel terrace from the railing back to the footway
  { const P2 = [], UV = [], I = [], step = 1.5, nl = Math.ceil((LAT1 - LAT0) / step), nu = 5;
    for (let i = 0; i <= nl; i++) { const lat = LAT0 + (LAT1 - LAT0) * i / nl, u0 = edgeUp(lat) - 0.2, u1 = kerbUp(lat); for (let j = 0; j <= nu; j++) { const up = u0 + (u1 - u0) * j / nu, p = W(lat, up); { let gy = ground(p[0], p[1]); for (const [ox, oz] of [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]]) gy = Math.max(gy, ground(p[0] + ox, p[1] + oz) - 0.1); P2.push(p[0], gy + 0.08, p[1]); } UV.push(p[0] / 3, p[1] / 3); } }
    for (let i = 0; i < nl; i++) for (let j = 0; j < nu; j++) { const a = i * (nu + 1) + j, b = a + 1, c = a + nu + 1, d = c + 1; I.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    const me = new THREE.Mesh(g, M.gravel); me.receiveShadow = true; me.name = 'lookout-gravel'; meshes.push(me); }
  // the pale concrete cliff-top wall under the railing, facing the garden
  { const P2 = [], UV = [], I = [], step = 1.5, nl = Math.ceil((LAT1 - LAT0) / step); let k = 0;
    for (let i = 0; i < nl; i++) { const la = LAT0 + (LAT1 - LAT0) * i / nl, lb = LAT0 + (LAT1 - LAT0) * (i + 1) / nl, ua = edgeUp(la) - 0.25, ub = edgeUp(lb) - 0.25;
      const ta = Y(la, ua) + 0.12, tb = Y(lb, ub) + 0.12, ba = Math.min(Y(la, ua - 2.2), ta - 0.5) - 0.3, bb = Math.min(Y(lb, ub - 2.2), tb - 0.5) - 0.3, pa = W(la, ua), pb = W(lb, ub);
      P2.push(pa[0], ba, pa[1], pb[0], bb, pb[1], pb[0], tb, pb[1], pa[0], ta, pa[1]); UV.push(0, 0, 1.5 / 3, 0, 1.5 / 3, (tb - bb) / 3, 0, (ta - ba) / 3); I.push(k, k + 2, k + 1, k, k + 3, k + 2); k += 4; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: M.wall.map, roughness: 0.95, side: THREE.DoubleSide })); me.castShadow = me.receiveShadow = true; me.name = 'lookout-wall'; meshes.push(me); }
  // railing: dark blue-grey, wavy top rail, gilt finials on posts every 3 m, a gold ship's wheel on every second panel
  const bay = 3.0, nb = Math.round((LAT1 - LAT0) / bay), pick = [];
  for (let i = 0; i <= nb; i++) {
    const lat = LAT0 + i * bay, p = W(lat, edgeUp(lat)), y = Y(lat, edgeUp(lat)) + 0.1;
    K.box(M.iron, p[0] - 0.05, p[0] + 0.05, y, y + 1.2, p[1] - 0.05, p[1] + 0.05);
    K.cyl(M.gilt, p[0], y + 1.2, y + 1.3, p[1], 0.04, 0.04, 6); K.sph(M.gilt, p[0], y + 1.35, p[1], 0.065, 1, 6);
    if (i < nb) {
      const lb = lat + bay, q = W(lb, edgeUp(lb)), yb = Y(lb, edgeUp(lb)) + 0.1, L = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[0] - p[0], q[1] - p[1]);
      const wave = []; for (let s = 0; s <= 8; s++) { const t = s / 8, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, yy = y + (yb - y) * t + 1.0 + 0.1 * Math.sin(t * Math.PI * 2) * 0 + 0.12 * Math.sin(t * Math.PI); wave.push([x, yy, z]); }
      for (let s = 0; s < 8; s++) K.bar(M.iron, wave[s], wave[s + 1], 0.04);
      K.bar(M.iron, [p[0], y + 0.08, p[1]], [q[0], yb + 0.08, q[1]], 0.035); K.bar(M.iron, [p[0], y + 0.5, p[1]], [q[0], yb + 0.5, q[1]], 0.025);
      for (let s = 1; s < 25; s++) { const t = s / 25, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, yy = y + (yb - y) * t; pick.push([x, yy + 0.55, z, 1.0 + 0.12 * Math.sin(t * Math.PI) - 0.1]); }
      if (i % 2 === 1) { const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, my = (y + yb) / 2 + 0.55, g = new THREE.TorusGeometry(0.22, 0.03, 6, 16); g.rotateY(ang); g.translate(mx, my, mz); K.put(M.gilt, g);
        for (let sp = 0; sp < 4; sp++) { const a = sp * Math.PI / 4, dx = Math.sin(ang) * Math.cos(a) * 0.22, dz = Math.cos(ang) * Math.cos(a) * 0.22, dy = Math.sin(a) * 0.22; K.bar(M.gilt, [mx - dx, my - dy, mz - dz], [mx + dx, my + dy, mz + dz], 0.025); } }
      for (let s = 0; s < L; s += 3) { const t0 = s / L, t1 = Math.min(1, (s + 3) / L); colliders.push({ type: 'segment', a: [p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0], b: [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1], r: 0.1, y0: y - 0.3, top: y + 1.3, kind: 'railing' }); }
    }
  }
  // pickets instanced
  { const g = new THREE.BoxGeometry(0.022, 1, 0.022), im = new THREE.InstancedMesh(g, M.iron, pick.length), m4 = new THREE.Matrix4(); pick.forEach((q, i) => { m4.compose(new THREE.Vector3(q[0], q[1], q[2]), new THREE.Quaternion(), new THREE.Vector3(1, q[3] - 0.0, 1)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; im.castShadow = true; meshes.push(im); }
  // iron benches with timber slats, facing the sea (towards -up)
  const bench = (lat, up, rot = 0, L = 1.7) => {
    const p = W(lat, up), y = ground(p[0], p[1]) + 0.08, fx = -nx, fz = -nz, ex = ax, ez = az;       // f = facing the sea, e = along the bench
    const B = (mat, e0, e1, y0, y1, f0, f1) => { const g = new THREE.BoxGeometry(e1 - e0, y1 - y0, f1 - f0); g.translate((e0 + e1) / 2, (y0 + y1) / 2, (f0 + f1) / 2); g.rotateY(Math.atan2(-az, ax)); g.translate(p[0], y, p[1]); K.put(mat, g); };
    for (const e of [-L / 2 + 0.1, L / 2 - 0.1]) { B(M.iron, e - 0.04, e + 0.04, 0, 0.45, -0.25, 0.25); B(M.iron, e - 0.04, e + 0.04, 0.45, 0.95, -0.28, -0.22); B(M.iron, e - 0.06, e + 0.06, 0.55, 0.6, -0.28, 0.25); }
    for (const z0 of [-0.22, -0.07, 0.08]) B(M.slat, -L / 2, L / 2, 0.43, 0.47, z0 + 0.0, z0 + 0.13);
    for (const y0 of [0.62, 0.78]) B(M.slat, -L / 2 + 0.1, L / 2 - 0.1, y0, y0 + 0.11, -0.3, -0.26);
    colliders.push({ type: 'segment', a: [p[0] - ax * 0.7, p[1] - az * 0.7], b: [p[0] + ax * 0.7, p[1] + az * 0.7], r: 0.4, y0: y - 0.3, top: y + 1, kind: 'bench' });
  };
  [1.5, 7.8, 23.3, 26.7].forEach((lat) => bench(lat, edgeUp(lat) + 1.25));
  // semicircular bench in a mosaic ring (centre of the terrace)
  { const lat = 15.3, up = edgeUp(lat) + 4.0, p = W(lat, up), y = ground(p[0], p[1]) + 0.1, g = new THREE.CircleGeometry(3.3, 48); g.rotateX(-Math.PI / 2); g.translate(p[0], y + 0.01, p[1]);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i)); const me = new THREE.Mesh(g, M.mosaic); me.receiveShadow = true; meshes.push(me);
    const R = 2.5, nseg = 10, segL = Math.PI * R / nseg + 0.04;
    for (let k = 0; k < nseg; k++) { const th = ((k + 0.5) / nseg) * Math.PI, c = Math.cos(th), sn = Math.sin(th), mx = p[0] + (ax * c + nx * sn) * R, mz = p[1] + (az * c + nz * sn) * R, a = Math.atan2(-ax * sn + nx * c, -az * sn + nz * c);
      const mk = (mat, w, h, yy, rr) => { const g = new THREE.BoxGeometry(w, h, segL); g.rotateY(a); g.translate(p[0] + (ax * c + nx * sn) * rr, y + yy, p[1] + (az * c + nz * sn) * rr); K.put(mat, g); };
      mk(M.slat, 0.5, 0.05, 0.45, R); mk(M.slat, 0.05, 0.32, 0.7, R + 0.25); }
    for (let k = 0; k <= 5; k++) { const th = (k / 5) * Math.PI, mx = p[0] + (ax * Math.cos(th) + nx * Math.sin(th)) * R, mz = p[1] + (az * Math.cos(th) + nz * Math.sin(th)) * R; K.box(M.iron, mx - 0.05, mx + 0.05, y, y + 0.45, mz - 0.05, mz + 0.05); }
    colliders.push({ type: 'circle', x: p[0], z: p[1], r: 2.9, y0: y - 0.3, top: y + 0.6, kind: 'bench' }); }
  // lantern lamp, viewer on a post, crowd barriers
  { const lat = 11.4, p = W(lat, edgeUp(lat) + 3.8), y = ground(p[0], p[1]) + 0.08;
    K.cyl(M.black, p[0], y, y + 3.4, p[1], 0.07, 0.09, 8); K.cyl(M.black, p[0], y, y + 0.35, p[1], 0.14, 0.18, 8); K.cyl(M.black, p[0], y + 3.4, y + 3.5, p[1], 0.17, 0.12, 8); K.cyl(M.lamp, p[0], y + 3.5, y + 3.85, p[1], 0.2, 0.15, 8); K.cyl(M.black, p[0], y + 3.85, y + 3.95, p[1], 0.04, 0.22, 8);
    colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.2, y0: y - 0.3, top: y + 4, kind: 'lamp' }); }
  { const lat = 4.6, p = W(lat, edgeUp(lat) + 0.8), y = ground(p[0], p[1]) + 0.08;
    K.box(M.blue, p[0] - 0.08, p[0] + 0.08, y, y + 1.15, p[1] - 0.08, p[1] + 0.08); K.box(M.yellow, p[0] - 0.14, p[0] + 0.14, y + 1.15, y + 1.5, p[1] - 0.2, p[1] + 0.2);
    colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.2, y0: y - 0.3, top: y + 1.5, kind: 'viewer' }); }
  for (let k = 0; k < 4; k++) { const lat = 28.5 + k * 1.15, p = W(lat, edgeUp(lat) + 1.2), q = W(lat + 1.0, edgeUp(lat + 1.0) + 1.2), y = ground(p[0], p[1]) + 0.1;
    K.bar(M.steel, [p[0], y + 0.1, p[1]], [p[0], y + 1.1, p[1]], 0.035); K.bar(M.steel, [q[0], y + 0.1, q[1]], [q[0], y + 1.1, q[1]], 0.035);
    for (const h of [0.2, 0.45, 0.7, 0.95]) K.bar(M.steel, [p[0], y + h, p[1]], [q[0], y + h, q[1]], 0.025);
    colliders.push({ type: 'segment', a: p, b: q, r: 0.1, y0: y - 0.3, top: y + 1.1, kind: 'barrier' }); }
  // a large deciduous tree at the east end
  { const p = W(36.5, edgeUp(34) + 2.0), y = ground(p[0], p[1]);
    K.cyl(M.bark, p[0], y, y + 4.2, p[1], 0.3, 0.45, 8);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; K.bar(M.bark, [p[0], y + 3.0, p[1]], [p[0] + Math.cos(a) * 1.5, y + 5.6 + (k % 2) * 0.8, p[1] + Math.sin(a) * 1.5], 0.22); }
    const ml = [M.leafA, M.leafB, M.leafC, M.leafA];
    for (let k = 0; k < 20; k++) { const a = k * 2.4, r = 0.8 + (k % 5) * 0.55, h = 4.8 + (k % 6) * 1.1; K.sph(ml[k % 4], p[0] + Math.cos(a) * r, y + h, p[1] + Math.sin(a) * r, 1.4 + (k % 3) * 0.3, 0.9, 7); }
    K.sph(M.leafA, p[0], y + 10.4, p[1], 1.9, 0.9, 7);
    colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.5, y0: y - 0.3, top: y + 10, kind: 'tree' }); }
  const grp = new THREE.Group(); grp.name = 'landmark:lookout'; K.flush(grp, 'lookout'); meshes.push(grp);
  return { meshes, colliders };
}
