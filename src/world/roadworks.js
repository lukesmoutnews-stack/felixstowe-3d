// Temporary road closures at the edge of the playable zone (world/zone.js), modelled on the user's reference
// photos of British roadworks kit:
//   - 750 mm traffic cone: orange body, collared top, silver reflective sleeve, black octagonal rubber base;
//   - "ROAD CLOSED" and "ROAD CLOSED AHEAD" signs: white plate, red panel with a rounded border, white capitals,
//     on a black steel A-frame stand;
//   - red-and-white interlocking barriers on black feet across the full width, kerb to kerb and over the
//     pavements, so a closure physically blocks walkers and vehicles (segment colliders).
// Closures for footpaths get a barrier and a smaller FOOTPATH CLOSED sign. Sizes follow the real kit
// (cone 750 mm tall; sign plate 1050 x 750 mm; barrier 1 m high, 2 m sections); they are approximations.

import * as THREE from 'three';
import { Geo } from './seafront.js';

let K = null;
function kit() {
  if (K) return K;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  K = {
    steel: std({ color: 0x1b1c1f, roughness: 0.55, metalness: 0.6 }),
    rubber: std({ color: 0x17181a, roughness: 0.95 }),
    plateBack: std({ color: 0x9a9fa6, roughness: 0.5, metalness: 0.5 }),
    barrier: std({ map: stripeTexture(), roughness: 0.6 }),
    signs: {},
    cone: coneParts(),
  };
  return K;
}
function signMaterial(key) {
  const k = kit(); if (k.signs[key]) return k.signs[key];
  const lines = { closed: ['ROAD', 'CLOSED'], ahead: ['ROAD', 'CLOSED', 'AHEAD'], foot: ['FOOTPATH', 'CLOSED'] }[key];
  const tex = signTexture(lines); k.signs[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.08 });
  return k.signs[key];
}

// ---------- textures ----------
function signTexture(lines) {
  const W = 1050, H = 750, c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * H / W);
  const g = c.getContext('2d'), s = c.width / W;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);                  // white plate
  g.fillStyle = '#c4161c'; rr(40 * s, 40 * s, (W - 80) * s, (H - 80) * s, 34 * s); g.fill(); // red panel inside a white border
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length, lh = (H - 160) / n, size = Math.min(lh * 0.86, 210 * (2 / Math.max(2, n)) + 40);
  g.font = `700 ${Math.round(size * s)}px "Helvetica Neue", Arial, sans-serif`;
  lines.forEach((t, i) => { const y = (80 + lh * (i + 0.5)) * s; let w = g.measureText(t).width; const max = (W - 170) * s; g.save(); g.translate(c.width / 2, y); if (w > max) g.scale(max / w, 1); g.fillText(t, 0, 0); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function stripeTexture() { // interlocking barrier board: red and white blocks, one pair per texture repeat (0.5 m)
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#d8141b'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#f6f6f2'; g.fillRect(64, 0, 64, 32);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 30, 128, 2); g.fillRect(63, 0, 2, 32); g.fillRect(127, 0, 1, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function sleeveTexture() { // retro-reflective sleeve: silver with the prismatic hexagon pattern and the maker's label panel
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#e9ecef'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = 'rgba(120,130,140,0.55)'; g.lineWidth = 1.2;
  for (let y = 0, row = 0; y < 110; y += 13, row++) for (let x = (row % 2) * 9; x < 270; x += 18) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); } g.closePath(); g.stroke(); }
  g.strokeStyle = 'rgba(90,95,100,0.7)'; g.strokeRect(150, 58, 58, 26); g.fillStyle = 'rgba(80,85,90,0.75)'; g.font = '700 8px Arial'; g.fillText('STARLUX', 168, 68); g.font = '6px Arial'; g.fillText('EN 13422 Class 1', 154, 78);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the cone (one geometry per part, drawn instanced) ----------
function coneParts() {
  const prof = [[0.0, 0.045], [0.172, 0.045], [0.168, 0.075], [0.148, 0.2], [0.112, 0.4], [0.075, 0.6], [0.06, 0.655], [0.067, 0.662], [0.067, 0.69], [0.05, 0.695], [0.043, 0.71], [0.05, 0.722], [0.05, 0.742], [0.03, 0.75], [0.0, 0.75]];
  const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  const rAt = (y) => 0.168 - (0.168 - 0.06) * (y - 0.075) / (0.655 - 0.075);
  const y0 = 0.27, y1 = 0.53, sleeve = new THREE.CylinderGeometry(rAt(y1) + 0.004, rAt(y0) + 0.004, y1 - y0, 20, 1, true); sleeve.translate(0, (y0 + y1) / 2, 0);
  const base = new THREE.CylinderGeometry(0.235, 0.245, 0.045, 8); base.rotateY(Math.PI / 8); base.translate(0, 0.0225, 0);
  const rim = new THREE.CylinderGeometry(0.182, 0.186, 0.03, 20); rim.translate(0, 0.058, 0);
  return {
    body, sleeve, base, rim,
    bodyMat: new THREE.MeshStandardMaterial({ color: 0xff5a14, roughness: 0.55 }),
    sleeveMat: new THREE.MeshStandardMaterial({ map: sleeveTexture(), roughness: 0.28, metalness: 0.25, emissive: 0x404448, emissiveIntensity: 0.25 }),
    baseMat: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.9 }),
  };
}

// ---------- geometry helpers ----------
/** A square-section bar between two 3D points (for the A-frame legs and the plate frame). */
function bar(G, a, b, t) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); if (L < 1e-4) return; d.divideScalar(L);
  const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const s1 = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(t / 2), s2 = new THREE.Vector3().crossVectors(d, s1).normalize().multiplyScalar(t / 2);
  const P = (end, i, j) => { const o = end ? b : a; return [o[0] + s1.x * i + s2.x * j, o[1] + s1.y * i + s2.y * j, o[2] + s1.z * i + s2.z * j]; };
  const c = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let k = 0; k < 4; k++) { const [i0, j0] = c[k], [i1, j1] = c[(k + 1) % 4]; G.quad(P(0, i0, j0), P(0, i1, j1), P(1, i1, j1), P(1, i0, j0)); }
}

/**
 * Build the closures that stand in one tile.
 * @param list closures from content/playable-zone.js (CLOSURES)
 * @param ctx { surfaceAt(x,z), roadById(id) -> OSM road (for sidewalks) }
 * @returns { meshes, colliders, count }
 */
export function buildClosures(list, ctx) {
  if (!list.length) return null;
  const k = kit(), G = { steel: new Geo(), rubber: new Geo(), plateBack: new Geo(), barrier: new Geo() }, SG = {}; const colliders = [], cones = [];
  const sg = (key) => (SG[key] ||= new Geo());
  const y = (x, z) => ctx.surfaceAt(x, z);

  /** An A-frame sign at (x, z) whose face looks along (fx, fz); plate w x h, bottom edge at yb. */
  const aframe = (x, z, fx, fz, key, w = 1.05, h = 0.75, yb = 0.62) => {
    const g0 = y(x, z), rx = fz, rz = -fx; // the viewer's right-hand side, for someone standing in front of the sign
    const P = (s, up, d = 0) => [x + rx * s + fx * d, g0 + up, z + rz * s + fz * d];
    const hw = w / 2, top = yb + h;
    // plate: front (sign face) and back (grey metal)
    sg(key).quad(P(-hw, yb, 0.012), P(hw, yb, 0.012), P(hw, top, 0.012), P(-hw, top, 0.012));
    G.plateBack.quad(P(hw, yb, -0.004), P(-hw, yb, -0.004), P(-hw, top, -0.004), P(hw, top, -0.004));
    // steel frame round the plate, front legs to the ground, rear legs splayed back, a spreader bar
    const t = 0.03; for (const [a, b] of [[P(-hw - 0.015, top + 0.015), P(hw + 0.015, top + 0.015)], [P(-hw - 0.015, yb - 0.015), P(hw + 0.015, yb - 0.015)]]) bar(G.steel, a, b, t);
    for (const s of [-hw - 0.015, hw + 0.015]) { bar(G.steel, P(s, top + 0.03), P(s, 0), t); bar(G.steel, P(s, top - 0.05, -0.02), P(s * 0.92, 0, -0.62), t * 0.9); bar(G.steel, P(s, 0.32), P(s * 0.95, 0.32, -0.33), t * 0.7); G.rubber.box(...P(s * 0.92, 0.015, -0.62), fx, fz, 0.06, 0.015, 0.05); G.rubber.box(...P(s, 0.015), fx, fz, 0.06, 0.015, 0.05); }
    bar(G.steel, P(-hw * 0.92, 0.32, -0.33), P(hw * 0.92, 0.32, -0.33), t * 0.7);
    colliders.push({ type: 'segment', a: [P(-hw, 0)[0], P(-hw, 0)[2]], b: [P(hw, 0)[0], P(hw, 0)[2]], r: 0.3, y0: g0 - 0.5, top: g0 + top + 0.2, kind: 'sign' });
  };
  /** A run of barrier sections from s0 to s1 across the closure line (frame origin o, right vector rgt). */
  const barrier = (ox, oz, rx, rz, s0, s1, d, ux, uz) => {
    const L = s1 - s0, n = Math.max(1, Math.round(L / 2)), sec = L / n;
    for (let i = 0; i < n; i++) {
      const a = s0 + i * sec + 0.04, b = s0 + (i + 1) * sec - 0.04, at = (s, up) => { const px = ox + rx * s + ux * d, pz = oz + rz * s + uz * d; return [px, y(px, pz) + up, pz]; };
      for (const [y0, y1] of [[0.8, 0.98], [0.12, 0.27]]) { // top rail and toe board, striped both sides
        const u = (b - a) / 0.5;
        for (const sd of [1, -1]) { const off = 0.025 * sd, A = at(a, y0), B = at(b, y0), C = at(b, y1), D = at(a, y1); const sh = (p) => [p[0] + ux * off, p[1], p[2] + uz * off]; if (sd > 0) G.barrier.quad(sh(A), sh(B), sh(C), sh(D), [[0, 0], [u, 0], [u, 1], [0, 1]]); else G.barrier.quad(sh(B), sh(A), sh(D), sh(C), [[u, 0], [0, 0], [0, 1], [u, 1]]); }
        const m = at((a + b) / 2, (y0 + y1) / 2); G.barrier.box(m[0], m[1] + (y1 - y0) / 2 + 0.004, m[2], rx, rz, (b - a) / 2, 0.004, 0.025); // top edge
      }
      for (const s of [a + 0.06, b - 0.06]) { const p = at(s, 0); G.steel.box(p[0], p[1] + 0.5, p[2], rx, rz, 0.03, 0.5, 0.03); G.rubber.box(p[0], p[1] + 0.03, p[2], ux, uz, 0.32, 0.03, 0.06); } // posts and rubber feet
    }
    const A = [ox + rx * (s0 - 0.2) + ux * d, oz + rz * (s0 - 0.2) + uz * d], B = [ox + rx * (s1 + 0.2) + ux * d, oz + rz * (s1 + 0.2) + uz * d];
    const gy = y(ox + ux * d, oz + uz * d); colliders.push({ type: 'segment', a: A, b: B, r: 0.3, y0: gy - 1000, top: gy + 1000, kind: 'roadworks' });
  };
  const cone = (x, z) => { cones.push([x, y(x, z), z, Math.random() * Math.PI]); colliders.push({ type: 'circle', x, z, r: 0.2, y0: y(x, z) - 0.3, top: y(x, z) + 0.8, kind: 'cone' }); };

  for (const c of list) {
    const ux = c.ux, uz = c.uz, rx = -uz, rz = ux; // outward along the road; right-hand vector across it
    const road = ctx.roadById(c.road), side = road && road.sidewalk && road.sidewalk !== 'no' && road.sidewalk !== 'none' ? 2.1 : 0.7;
    if (c.kind === 'foot') {
      const hw = c.hw === 'pedestrian' ? (c.width || 6) / 2 + 2.6 : Math.max(1.0, (c.width || 2) / 2 + 0.4); // the promenade is wider than its mapped width
      barrier(c.x, c.z, rx, rz, -hw, hw, 0, ux, uz);
      aframe(c.x - ux * 0.5, c.z - uz * 0.5, -ux, -uz, 'foot', 0.6, 0.45, 0.45);
      continue;
    }
    // barriers across the carriageway, both pavements and the verges beyond, out to MAXV either side unless a
    // building is in the way, so there is no way round the end over a pavement or the grass
    const hw = (c.width || 5) / 2, MAXV = c.kind === 'service' ? hw + 4 : hw + 9;
    const reach = (sg) => { let s = hw + 0.5; while (s < MAXV && !(ctx.inBuilding && ctx.inBuilding(c.x + rx * sg * (s + 0.5), c.z + rz * sg * (s + 0.5)))) s += 0.5; return Math.max(hw + Math.max(side, 2.3), s); };
    const sL = -reach(-1), sR = reach(1);
    barrier(c.x, c.z, rx, rz, sL, sR, 0, ux, uz);
    aframe(c.x - ux * 0.7, c.z - uz * 0.7, -ux, -uz, 'closed');
    // a line of cones across the carriageway in front of the barrier
    const n = Math.max(2, Math.round((2 * hw - 0.6) / 1.1));
    for (let i = 0; i <= n; i++) { const s = -hw + 0.3 + (2 * hw - 0.6) * i / n; if (Math.abs(s) < 0.65) continue; cone(c.x + rx * s - ux * 1.7, c.z + rz * s - uz * 1.7); }
    if (c.kind === 'road') for (const sd of [-1, 1]) for (const d of [3.4, 5.9, 8.4, 10.9]) { const s = sd * (hw - 0.35 - (d - 3.4) * 0.02); cone(c.x + rx * s - ux * d, c.z + rz * s - uz * d); } // along both kerbs
    if (c.ahead) { // advance warning on the nearside (left) verge, facing oncoming traffic
      const a = c.ahead, lx = a.uz, lz = -a.ux, off = hw + 0.55;
      aframe(a.x + lx * off, a.z + lz * off, -a.ux, -a.uz, 'ahead');
      cone(a.x + lx * (hw - 0.3) - a.ux * 1.2, a.z + lz * (hw - 0.3) - a.uz * 1.2); cone(a.x + lx * (hw - 0.3) + a.ux * 1.2, a.z + lz * (hw - 0.3) + a.uz * 1.2);
    }
  }

  const meshes = [];
  for (const [key, geo] of Object.entries(G)) { const m = geo.mesh(k[key]); if (m) { m.name = 'roadworks:' + key; meshes.push(m); } }
  for (const [key, geo] of Object.entries(SG)) { const m = geo.mesh(signMaterial(key)); if (m) { m.name = 'roadworks:sign-' + key; m.castShadow = false; meshes.push(m); } }
  if (cones.length) {
    const C = k.cone, M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (const [geo, mat, name] of [[C.body, C.bodyMat, 'cone'], [C.sleeve, C.sleeveMat, 'cone-sleeve'], [C.base, C.baseMat, 'cone-base'], [C.rim, C.baseMat, 'cone-rim']]) {
      const im = new THREE.InstancedMesh(geo, mat, cones.length); im.name = 'roadworks:' + name; im.castShadow = name === 'cone'; im.receiveShadow = true;
      cones.forEach(([x, yy, z, r], i) => { e.set(0, r, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(x, yy, z), q, one); im.setMatrixAt(i, M); });
      im.computeBoundingSphere(); meshes.push(im);
    }
  }
  return { meshes, colliders, count: list.length, cones: cones.length };
}
