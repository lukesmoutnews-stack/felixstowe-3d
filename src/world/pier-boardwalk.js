// The Boardwalk at the Felixstowe Pier building: a timber deck on rusty steel piles all round the building,
// seven metres wide along the right-hand (south-west) side where The Boardwalk Cafe Bar stands, three metres
// elsewhere; white tubular railings; a deep grey soffit over the cafe terrace on slim silver columns; glazed
// cafe frontage with its sign; red pyramid umbrellas on poles; picnic tables, cafe tables and chairs; bunting;
// and the two gentle ramps that bring the promenade up to the entrance terrace. Optionally a pale-blue "THE DECK"
// kiosk with picnic tables where the pier deck leaves the building.
//
// Sources: three photographs supplied by the user (Oct 2026): the side of the building seen from the beach (rusty
// round piles, timber walings, white curved railings, red umbrellas lettered BOARDWALK CAFE - BAR, deep grey
// soffit on slim columns, glazed frontage lettered "The BOARDWALK CAFE BAR"), the deck close up (grey boards,
// picnic tables and benches, chairs, festoon lights) and the view along the deck to the pier ("THE DECK" kiosk).
// All dimensions are estimates scaled from those photographs. The railings are straight, not the curved
// stanchions of the real thing; the festoon lights are not drawn.
import * as THREE from 'three';
import { Geo } from './seafront.js';
import { triangulate } from './accum.js';
import { pointInRing } from '../geo/polygon.js';

const TEXS = {};
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tx(c, repeat = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function boardsTex() { // weathered grey-brown deck boards running along u
  const [c, g] = cv(512, 512), r = rng(5); g.fillStyle = '#3a342d'; g.fillRect(0, 0, 512, 512);
  const n = 24, h = 512 / n;
  for (let i = 0; i < n; i++) {
    let x = -r() * 120; const y = i * h;
    while (x < 512) {
      const len = 150 + r() * 220, l = 52 + r() * 14 + (i % 3) * 3;
      g.fillStyle = `hsl(${30 + r() * 12},${3 + r() * 6}%,${l - 4}%)`; g.fillRect(x + 1.5, y + 1.5, len - 3, h - 3);
      for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(40,32,24,${0.05 + r() * 0.12})`; g.fillRect(x + r() * len, y + 2 + r() * (h - 4), 20 + r() * 80, 1); }
      x += len;
    }
  }
  return tx(c, true);
}
function glazingTex() { // one bay of the cafe frontage: dark glass, warm interior lights, white mullions
  const [c, g] = cv(256, 160), r = rng(9); const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#31434a'); gr.addColorStop(1, '#161d21'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 10; i++) { const x = 14 + r() * 228, y = 20 + r() * 60; const rg = g.createRadialGradient(x, y, 0, x, y, 26); rg.addColorStop(0, 'rgba(255,214,150,0.55)'); rg.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = rg; g.fillRect(x - 26, y - 26, 52, 52); }
  g.fillStyle = 'rgba(190,200,205,0.35)'; for (let i = 0; i < 4; i++) { const x = 22 + r() * 200; g.fillRect(x, 70 + r() * 40, 26, 36); g.fillRect(x + 4, 56 + r() * 20, 18, 14); } // furniture seen inside
  g.fillStyle = 'rgba(210,225,235,0.13)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(120, 0); g.lineTo(60, 160); g.lineTo(-20, 160); g.fill(); // reflection
  g.fillStyle = '#e9edef'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 0, 7, 160); g.fillRect(249, 0, 7, 160); g.fillRect(0, 150, 256, 10); // transom, mullions, kick rail
  return tx(c, true);
}
function signTex() { // "The BOARDWALK" in white capitals, "CAFE · BAR" in yellow, on a charcoal board
  const [c, g] = cv(1536, 256); g.fillStyle = '#2d3238'; g.fillRect(0, 0, 1536, 256); g.fillStyle = '#c9ced2'; g.fillRect(0, 0, 1536, 8); g.fillRect(0, 248, 1536, 8);
  g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = '#f4f4f1'; g.font = 'italic 600 74px Georgia, serif'; g.fillText('The', 330, 82);
  g.font = '700 150px "Trebuchet MS", Arial, sans-serif'; g.fillText('BOARDWALK', 440, 98);
  g.fillStyle = '#f2c230'; g.font = '700 70px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('C A F E   ·   B A R', 768 + 160, 208);
  return tx(c);
}
function umbrellaTex() {
  const [c, g] = cv(512, 128); g.fillStyle = '#b3141c'; g.fillRect(0, 0, 512, 128); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 512, 6);
  g.fillStyle = '#f6efe8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 34px Arial, sans-serif'; g.fillText('BOARDWALK', 256, 92); g.font = '600 15px Arial, sans-serif'; g.fillText('CAFE · BAR', 256, 114);
  const t = tx(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t;
}
function kioskSignTex() {
  const [c, g] = cv(256, 128); g.clearRect(0, 0, 256, 128); g.fillStyle = '#f2f4f5'; g.beginPath(); g.ellipse(128, 64, 124, 60, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#6f93b3'; g.lineWidth = 5; g.stroke();
  g.fillStyle = '#35566f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 34px Georgia, serif'; g.fillText('· THE DECK ·', 128, 70); g.fillRect(104, 20, 48, 4);
  return tx(c);
}

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M = {
    deck: std({ map: boardsTex(), roughness: 0.92 }), under: std({ color: 0x2c2823, roughness: 0.95 }), timber: std({ color: 0x6b655b, roughness: 0.9 }),
    pile: std({ color: 0xffffff, roughness: 0.85, metalness: 0.2 }), white: std({ color: 0xf3f5f6, roughness: 0.4, metalness: 0.15 }), silver: std({ color: 0xb4bbc1, roughness: 0.32, metalness: 0.65 }),
    soffit: std({ color: 0x8c949a, roughness: 0.55, metalness: 0.2 }), charcoal: std({ color: 0x2d3238, roughness: 0.5, metalness: 0.2 }),
    glass: std({ map: glazingTex(), roughness: 0.15, metalness: 0.35, emissive: 0x2a2218, emissiveIntensity: 0.3 }),
    sign: std({ map: signTex(), roughness: 0.4, metalness: 0.1, emissive: 0x222222, emissiveIntensity: 0.25 }),
    umbrella: std({ map: umbrellaTex(), roughness: 0.7, side: THREE.DoubleSide }), pole: std({ color: 0x7c8388, roughness: 0.4, metalness: 0.6 }),
    tableTop: std({ color: 0x4d4944, roughness: 0.8 }), chair: std({ color: 0xcfd3d5, roughness: 0.6 }), bench: std({ color: 0x55504a, roughness: 0.85 }),
    bunting: std({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), blue: std({ color: 0xa9c6dc, roughness: 0.7 }), hatch: std({ color: 0x1b242b, roughness: 0.3, metalness: 0.4 }),
    ramp: std({ color: 0x9d9e99, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    kioskSign: std({ map: kioskSignTex(), transparent: true, alphaTest: 0.2, roughness: 0.5 }),
  };
  M.pile.vertexColors = false; return M;
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** Offset a polygon outwards by a distance per edge (mitred). fp is traversed so that the outward normal of edge i is (-dz, dx). */
function offsetRing(fp, ds) {
  const n = fp.length, N = [];
  for (let i = 0; i < n; i++) { const p = fp[i], q = fp[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; N.push([-(q[1] - p[1]) / L, (q[0] - p[0]) / L, L]); }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = N[(i - 1 + n) % n], b = N[i], da = ds[(i - 1 + n) % n], db = ds[i], V = fp[i];
    const ra = dot(a, V) + da, rb = dot(b, V) + db, det = a[0] * b[1] - a[1] * b[0];
    out.push(Math.abs(det) < 1e-6 ? [V[0] + b[0] * db, V[1] + b[1] * db] : [(ra * b[1] - rb * a[1]) / det, (a[0] * rb - b[0] * ra) / det]);
  }
  return { ring: out, N };
}

/**
 * @param o { fp, core, floorY, hw, T, W2, toLocal, ground, surfaceAt, pierStarts, stone } local frame: x along the facade, z outwards, y relative to floorY
 * @returns { group, colliders, surfaces } (colliders and surface rings in world coordinates)
 */
export function buildBoardwalk(o) {
  const m = mats(), { fp, core, floorY, hw, T, W2, toLocal, ground } = o, n = fp.length;
  const group = new THREE.Group(); group.name = 'pier-boardwalk';
  const colliders = [], surfaces = [];
  const gW = (lx, lz) => { const [x, z] = W2(lx, lz); return ground(x, z); };
  const G = { white: new Geo(), silver: new Geo(), soffit: new Geo(), charcoal: new Geo(), timber: new Geo(), tableTop: new Geo(), stone: new Geo(), blue: new Geo() };
  const ALIAS = { chair: 'white', bench: 'tableTop', hatch: 'charcoal' };
  const gk = (g) => ALIAS[g] || g;
  const box = (g, cx, cy, cz, hl, hh, hw2, ux = 1, uz = 0) => G[gk(g)].box(cx, cy, cz, ux, uz, hl, hh, hw2);
  const addCol = (type, a, b, r, y0, top, kind) => { if (type === 'circle') { const [x, z] = W2(a[0], a[1]); colliders.push({ type, x, z, r, y0, top, kind }); } else colliders.push({ type, a: W2(...a), b: W2(...b), r, y0, top, kind }); };

  // ---- the deck outline: offset the footprint (front 3.6 m, right-hand side 7 m, elsewhere 3 m) ----
  const ds = fp.map((p, i) => { const q = fp[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / L; return i === 0 ? T : nx > 0.5 ? 7 : 3; });
  const { ring, N } = offsetRing(fp, ds);
  // the cafe side: the longest edge facing right
  let cafe = -1, cl = 0; fp.forEach((p, i) => { const q = fp[(i + 1) % n]; if (N[i][0] > 0.9 && N[i][2] > cl) { cl = N[i][2]; cafe = i; } });
  const backZ = Math.min(...fp.map((p) => p[1])) + 3.2;

  // ---- the pier mouth: where the pier deck leaves the building (found first: the boards are cut away there) ----
  const pl = (o.pierStarts || []).map(([x, z]) => toLocal(x, z)), near = pl.filter((p) => p[1] < backZ + 1.5 && p[1] > backZ - 8 && Math.abs(p[0]) < 40), far = pl.filter((p) => p[1] < -100 && Math.abs(p[0]) < 80);
  let mouth = null;
  if (near.length >= 2 && far.length >= 2) {
    const c0 = [near.reduce((s, p) => s + p[0], 0) / near.length, near.reduce((s, p) => s + p[1], 0) / near.length], c1 = [far.reduce((s, p) => s + p[0], 0) / far.length, far.reduce((s, p) => s + p[1], 0) / far.length];
    const L = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), u = [(c1[0] - c0[0]) / L, (c1[1] - c0[1]) / L], xs = near.map((p) => p[0]);
    mouth = { c: c0, u, x0: Math.min(...xs), x1: Math.max(...xs), w: Math.max(...xs) - Math.min(...xs) };
  }
  const inMouth = (x, z) => mouth && z < backZ + 1.5 && x > mouth.x0 - 0.3 && x < mouth.x1 + 0.3;
  const clipPoly = (poly, a, b, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const P = poly[i], Q = poly[(i + 1) % poly.length], dp = a * P[0] + b * P[1] + c, dq = a * Q[0] + b * Q[1] + c; if (dp >= 0) out.push(P); if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } } return out; };
  const pieces = (tri) => { // cut the strip of the pier mouth out of the boards (the pier deck, a little lower, runs through it)
    if (!mouth) return [tri]; const xa = mouth.x0 - 0.05, xb = mouth.x1 + 0.05;
    return [clipPoly(tri, -1, 0, xa), clipPoly(tri, 1, 0, -xb), clipPoly(clipPoly(clipPoly(tri, 1, 0, -xa), -1, 0, xb), 0, 1, -(backZ + 1.5))].filter((p) => p.length >= 3);
  };
  const spans = (A, B, L) => { // parts of a back edge outside the mouth
    if (!mouth || Math.max(A[1], B[1]) > backZ + 1.5) return [[0, L]]; const ux = (B[0] - A[0]) / L; if (Math.abs(ux) < 0.3) return [[0, L]];
    let t0 = (mouth.x0 - 0.05 - A[0]) / ux, t1 = (mouth.x1 + 0.05 - A[0]) / ux; if (t0 > t1) [t0, t1] = [t1, t0];
    const out = []; if (t0 > 0.05) out.push([0, Math.min(L, t0)]); if (t1 < L - 0.05) out.push([Math.max(0, t1), L]); return out.filter(([p, q]) => q - p > 0.05);
  };

  // boards
  { const { verts, tris } = triangulate(ring, [core]), pos = [], uv = [], upos = [];
    for (const [i, j, k] of tris) for (const poly of pieces([verts[i], verts[j], verts[k]])) for (let q = 1; q + 1 < poly.length; q++) {
      const a = poly[0], b = poly[q], c = poly[q + 1], cz = (a[1] + b[1] + c[1]) / 3, along = cz > backZ;
      const cr = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]); // y of (b-a)x(c-a)
      const t = cr > 0 ? [a, b, c] : [a, c, b];
      for (const p of t) { pos.push(p[0], 0.03, p[1]); if (along) uv.push(p[1] / 3.2, p[0] / 3.2); else uv.push(p[0] / 3.2, p[1] / 3.2); }
      for (const p of [t[0], t[2], t[1]]) upos.push(p[0], -0.5, p[1]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const deck = new THREE.Mesh(g, m.deck); deck.receiveShadow = true; group.add(deck);
    const gu = new THREE.BufferGeometry(); gu.setAttribute('position', new THREE.Float32BufferAttribute(upos, 3)); gu.computeVertexNormals();
    group.add(new THREE.Mesh(gu, m.under)); // dark underside so the deck is not see-through from the beach
  }
  // deck surface (walkable)
  surfaces.push({ id: 'pier-boardwalk', kind: 'terrace', ring: ring.map(([x, z]) => W2(x, z)), heightAt: () => floorY, layered: true, name: 'Felixstowe Pier boardwalk', meshes: [] });

  // ---- fascia, walings, cross beams ----
  for (let i = 0; i < n; i++) {
    const A = ring[i], B = ring[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 0.3) continue;
    const ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L, cx = (A[0] + B[0]) / 2, cz = (A[1] + B[1]) / 2, nx = N[i][0], nz = N[i][1];
    if (i === 0) { // front: only the stubs of deck either side of the stone terrace
      for (const [xa, xb] of [[ring[0][0], -(hw + 0.5)], [hw + 0.5, ring[1][0]]]) { const mx = (xa + xb) / 2, hl = Math.abs(xb - xa) / 2; box('timber', mx, -0.27, T - 0.05, hl, 0.27, 0.05); box('timber', mx, -0.42, T - 0.45, hl, 0.16, 0.16); }
      continue;
    }
    for (const [t0, t1] of spans(A, B, L)) { const tm = (t0 + t1) / 2, mx = A[0] + ux * tm, mz = A[1] + uz * tm, hl = (t1 - t0) / 2;
      box('timber', mx - nx * 0.05, -0.27, mz - nz * 0.05, hl + 0.05, 0.27, 0.05, ux, uz);           // fascia board
      box('timber', mx - nx * 0.45, -0.42, mz - nz * 0.45, hl, 0.16, 0.16, ux, uz); }                // waling
    const d = ds[i], k = Math.max(1, Math.round(L / 4));
    for (let s = 0; s <= k; s++) { const t = (s + 0.5) / (k + 1) * L, px = A[0] + ux * t - nx * d / 2, pz = A[1] + uz * t - nz * d / 2; if (!inMouth(px, pz)) box('timber', px, -0.4, pz, (d - 0.3) / 2, 0.14, 0.09, nx, nz); } // cross beams
  }

  // ---- piles: rusty round steel piles with weed bands, instanced ----
  const piles = []; const r2 = rng(3);
  const addPile = (lx, lz) => { const gy = gW(lx, lz) - 0.25, top = -0.5, h = top - (gy - floorY); if (h < 0.45) return; piles.push([lx, lz, gy - floorY, h]); };
  for (let i = 0; i < n; i++) {
    if (i === 0) continue;
    const A = ring[i], B = ring[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 1) continue;
    const ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L, nx = N[i][0], nz = N[i][1], k = Math.max(1, Math.round(L / 4.2));
    for (let s = 0; s <= k; s++) { const t = Math.min(L - 0.3, Math.max(0.3, (s / k) * L)); addPile(A[0] + ux * t - nx * 0.4, A[1] + uz * t - nz * 0.4); }
    if (ds[i] > 5) for (let s = 0; s <= k; s++) { const t = (s / k) * L; addPile(A[0] + ux * t - nx * (ds[i] * 0.52), A[1] + uz * t - nz * (ds[i] * 0.52)); }
  }
  // under the building: a grid of piles, cross beams and a dark soffit (the building stands on the beach on piles; see pierFrame/buildPierBuilding)
  { const xs = fp.map((p) => p[0]), zs = fp.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), sp = 5;
    for (let x = Math.ceil((x0 + 1.5) / sp) * sp; x < x1 - 1; x += sp) for (let z = Math.ceil((z0 + 1.5) / sp) * sp; z < z1 - 1; z += sp) if (pointInRing(x, z, core)) addPile(x, z);
    for (let z = Math.ceil((z0 + 1.5) / sp) * sp; z < z1 - 1; z += sp) { let a = null, b = null; for (let x = x0; x <= x1; x += 0.5) if (pointInRing(x, z, core)) { if (a == null) a = x; b = x; } if (a != null && b - a > 2) box('timber', (a + b) / 2, -0.4, z, (b - a) / 2, 0.14, 0.12); }
    for (let x = Math.ceil((x0 + 1.5) / sp) * sp; x < x1 - 1; x += sp) { let a = null, b = null; for (let z = z0; z <= z1; z += 0.5) if (pointInRing(x, z, core)) { if (a == null) a = z; b = z; } if (a != null && b - a > 2) box('timber', x, -0.4, (a + b) / 2, 0.12, 0.14, (b - a) / 2); }
    { const zS = -17; let a = null, b = null; for (let x = x0; x <= x1; x += 0.25) if (pointInRing(x, zS, core)) { if (a == null) a = x; b = x; }
      if (a != null) { box('charcoal', (a + b) / 2, -1.8, zS, (b - a) / 2, 1.2, 0.05); addCol('segment', [a, zS], [b, zS], 0.12, floorY - 9, floorY - 0.5, 'wall'); } } // solid skirt where the beach rises towards the front and the headroom runs out
    const { verts, tris } = triangulate(core, []), pp = []; for (const [i, j, k] of tris) { const a = verts[i], b = verts[j], c = verts[k], cr = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]), t = cr > 0 ? [a, c, b] : [a, b, c]; for (const q of t) pp.push(q[0], -0.62, q[1]); }
    const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gs.computeVertexNormals(); group.add(new THREE.Mesh(gs, m.under)); }
  if (piles.length) {
    const pg = new THREE.CylinderGeometry(0.2, 0.23, 1, 9, 1, true), im = new THREE.InstancedMesh(pg, m.pile, piles.length), mt = new THREE.Matrix4(), col = new THREE.Color();
    piles.forEach(([x, z, y0, h], q) => { mt.compose(new THREE.Vector3(x, y0 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)); im.setMatrixAt(q, mt); const w = r2(); im.setColorAt(q, col.set(w < 0.12 ? 0x55603f : w < 0.55 ? 0x6e3f2c : 0x5f3a2e)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; group.add(im);
    for (const [x, z, y0, h] of piles) addCol('circle', [x, z], null, 0.26, floorY + y0, floorY + y0 + h, 'pile');
  }

  // ---- white railings with colliders along the outer edge ----
  const rail = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az); if (L < 0.2) return; const ux = (bx - ax) / L, uz = (bz - az) / L, cx = (ax + bx) / 2, cz = (az + bz) / 2;
    for (const y of [0.22, 0.52, 0.82]) box('white', cx, y, cz, L / 2, 0.016, 0.016, ux, uz);
    box('white', cx, 1.1, cz, L / 2, 0.028, 0.028, ux, uz);
    const k = Math.max(1, Math.round(L / 1.25)); for (let s = 0; s <= k; s++) { const t = (s / k) * L; box('white', ax + ux * t, 0.57, az + uz * t, 0.022, 0.57, 0.022); }
    for (let s = 0; s < L; s += 4) { const e = Math.min(L, s + 4); addCol('segment', [ax + ux * s, az + uz * s], [ax + ux * e, az + uz * e], 0.05, floorY - 0.05, floorY + 1.15, 'railing'); }
  };
  const railRun = (A, B, nx, nz, skip) => { // run along an edge inset 0.12 from the outer line, skipping the pier mouth and the parts where ramps join
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L, step = 0.25; let start = null;
    const pt = (t) => [A[0] + ux * t - nx * 0.12, A[1] + uz * t - nz * 0.12], seg = (t0, t1) => { if (t1 - t0 > 0.3) { const a = pt(t0), b = pt(t1); rail(a[0], a[1], b[0], b[1]); } };
    for (let t = 0; t <= L + 1e-6; t += step) { const tt = Math.min(t, L), p = pt(tt), bad = skip(p) || inMouth(p[0], p[1]); if (!bad && start == null) start = tt; if (bad && start != null) { seg(start, Math.max(start, tt - step)); start = null; } }
    if (start != null) seg(start, L);
  };
  for (let i = 0; i < n; i++) {
    const A = ring[i], B = ring[(i + 1) % n];
    if (i === 0) railRun(A, B, N[i][0], N[i][1], (p) => p[0] < hw + 0.9); // front: only the stub of deck to the right of the terrace
    else railRun(A, B, N[i][0], N[i][1], (p) => p[1] > -0.4);              // elsewhere open at the front where the ramps join
  }

  // ---- the cafe side ----
  if (cafe >= 0) {
    const P = fp[cafe], Q = fp[(cafe + 1) % n], zNear = Math.max(P[1], Q[1]), zFar = Math.min(P[1], Q[1]), x0 = core[cafe][0] + 0.02, xo = P[0];
    const cZ = (zNear + zFar) / 2, len = zNear - zFar;
    // glazed frontage on the building wall
    { const gl = new THREE.PlaneGeometry(len - 1.6, 2.95); gl.rotateY(Math.PI / 2); const uv = gl.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setX(q, uv.getX(q) * Math.round((len - 1.6) / 2.2));
      const me = new THREE.Mesh(gl, m.glass); me.position.set(x0 + 0.03, 0.1 + 1.475, cZ); group.add(me);
      box('white', x0 + 0.06, 0.05, cZ, 0.06, 0.05, (len - 1.6) / 2); box('white', x0 + 0.06, 3.0, cZ, 0.06, 0.05, (len - 1.6) / 2); }
    // soffit over the terrace: grey underside, charcoal sign fascia on the outer edge, slim silver columns
    const out = 3.9, xs0 = x0 - 0.02, xs1 = x0 + out, zA = zNear + 0.1, zB = zFar - 0.1, sl = zA - zB, sc = (zA + zB) / 2;
    box('soffit', (xs0 + xs1) / 2, 3.3, sc, (xs1 - xs0) / 2, 0.22, sl / 2);
    box('white', (xs0 + xs1) / 2, 3.55, sc, (xs1 - xs0) / 2 + 0.02, 0.03, sl / 2 + 0.02);
    { const bh = 1.4; box('charcoal', xs1 + 0.12, 3.08 + bh / 2, sc, 0.1, bh / 2, sl / 2); box('silver', xs1 + 0.12, 3.08 + bh + 0.04, sc, 0.13, 0.04, sl / 2 + 0.03);
      const sg = new THREE.PlaneGeometry((bh - 0.12) * 6, bh - 0.12); sg.rotateY(Math.PI / 2); const sm = new THREE.Mesh(sg, m.sign); sm.position.set(xs1 + 0.225, 3.08 + bh / 2, sc); group.add(sm); }
    const nc = Math.max(2, Math.round(sl / 4.1));
    for (let q = 0; q <= nc; q++) { const z = zB + 0.6 + (q / nc) * (sl - 1.2), x = xs1 - 0.25; box('silver', x, 1.5, z, 0.065, 1.5, 0.065); addCol('circle', [x, z], null, 0.12, floorY, floorY + 3.1, 'column'); }
    // bunting under the soffit edge
    { const pos = [], colr = [], cs = [[1, 1, 1], [0.55, 0.78, 0.92], [0.85, 0.12, 0.15]], x = xs1 - 0.05; let q = 0;
      for (let z = zB + 0.5; z < zA - 0.5; z += 0.55, q++) { const y = 3.04 - Math.sin(((z - zB) % 4.1) / 4.1 * Math.PI) * 0.18; pos.push(x, y, z - 0.22, x, y, z + 0.22, x, y - 0.4, z); for (let k = 0; k < 3; k++) colr.push(...cs[q % 3]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.computeVertexNormals(); group.add(new THREE.Mesh(g, m.bunting)); }
    // umbrellas, picnic tables, cafe tables and chairs
    const xu = xo + 4.8, zu = []; for (let z = zFar + 3.8; z < zNear - 4; z += 4.8) zu.push(z);
    const um = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 2.26, 0.66, 4, 1, true).rotateY(Math.PI / 4), m.umbrella, zu.length), pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 2.9, 6), m.pole, zu.length), mt = new THREE.Matrix4();
    zu.forEach((z, q) => { mt.makeTranslation(xu, 2.58, z); um.setMatrixAt(q, mt); mt.makeTranslation(xu, 1.45, z); pm.setMatrixAt(q, mt);
      box('tableTop', xu, 0.75, z, 0.4, 0.025, 1.0); box('bench', xu - 0.76, 0.46, z, 0.15, 0.025, 1.0); box('bench', xu + 0.76, 0.46, z, 0.15, 0.025, 1.0);
      for (const dz of [-0.8, 0.8]) { box('white', xu, 0.38, z + dz, 0.8, 0.37, 0.03); }
      addCol('circle', [xu, z], null, 1.15, floorY, floorY + 0.95, 'bench'); });
    um.castShadow = true; group.add(um, pm);
    for (let z = zFar + 1.8; z < zNear - 1.2; z += 3.1) { const x = xs0 + 1.9;
      box('tableTop', x, 0.74, z, 0.38, 0.02, 0.38); box('white', x, 0.37, z, 0.03, 0.37, 0.03); box('white', x, 0.02, z, 0.22, 0.02, 0.03);
      for (const sx of [-0.78, 0.78]) { const cx = x + sx; box('chair', cx, 0.45, z, 0.21, 0.025, 0.21); box('chair', cx + Math.sign(sx) * 0.2, 0.7, z, 0.02, 0.22, 0.21); box('chair', cx, 0.22, z, 0.17, 0.22, 0.02); }
      addCol('circle', [x, z], null, 0.5, floorY, floorY + 0.8, 'bench'); }
    o.cafe = { x0, xs1, zNear, zFar, sc, sl };
  }

  // ---- ramps from the promenade up to the entrance terrace ----
  const ramps = [];
  const mkRamp = (xHigh, dir, lenR, id) => {
    const xLow = xHigh + dir * lenR, z0 = 0.0, z1 = 4.0, // stops short of the flood-wall gates (their paths join the promenade at z 6.5), so the gate exits stay level
    probe = [0.5, 2, 3.6].map((z) => { const [wx, wz] = W2(xLow, z); return o.surfaceAt(wx, wz); });
    const hp = probe.reduce((s, v) => s + v, 0) / probe.length, yw = (s) => hp + s * (floorY - hp), sOf = (lx) => Math.min(1, Math.max(0, (lx - xLow) / (xHigh - xLow)));
    const top = (x, z) => [x, yw(sOf(x)) - floorY + 0.01, z], bot = hp - floorY - 0.7;
    const face = (a, b, c, d, out) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const dn = (u[1] * w[2] - u[2] * w[1]) * out[0] + (u[2] * w[0] - u[0] * w[2]) * out[1] + (u[0] * w[1] - u[1] * w[0]) * out[2]; if (dn >= 0) G.stone.quad(a, b, c, d); else G.stone.quad(d, c, b, a); };
    face(top(xLow, z0), top(xHigh, z0), top(xHigh, z1), top(xLow, z1), [0, 1, 0]);
    face(top(xLow, z1), top(xHigh, z1), [xHigh, bot, z1], [xLow, bot, z1], [0, 0, 1]);
    face(top(xLow, z0), top(xHigh, z0), [xHigh, bot, z0], [xLow, bot, z0], [0, 0, -1]);
    face(top(xLow, z0), top(xLow, z1), [xLow, bot, z1], [xLow, bot, z0], [dir, 0, 0]);
    surfaces.push({ id, kind: 'terrace', ring: [W2(xHigh, z0), W2(xLow, z0), W2(xLow, z1), W2(xHigh, z1)], heightAt: (x, z) => { const lx = toLocal(x, z)[0]; return yw(sOf(lx)); }, name: 'Felixstowe Pier promenade ramp', meshes: [] });
    ramps.push({ id, xHigh, xLow, hp });
  };
  mkRamp(ring[0][0], -1, 12, 'pier-ramp-left');   // from the deck's front-left corner
  mkRamp(ring[1][0], 1, 10, 'pier-ramp-right');   // from the deck's front-right corner

  // ---- "THE DECK" kiosk and picnic tables where the pier deck begins ----
  let kiosk = false;
  if (mouth) {
    const { c, u } = mouth, v = [-u[1], u[0]], yDeck = (() => { const [wx, wz] = W2(c[0] + u[0] * 4, c[1] + u[1] * 4); return o.surfaceAt(wx, wz) - floorY; })();
    const P = (a, b, y) => [c[0] + u[0] * a + v[0] * b, y, c[1] + u[1] * a + v[1] * b], ang = Math.atan2(u[1], u[0]);
    void ang;
    if (isFinite(yDeck) && yDeck > -1.2 && yDeck < 0.6) {
      kiosk = true; const side = v[0] > 0 ? 1 : -1, off = side * (mouth.w / 2 - 1.3), ka = 15, kb = off;
      const kp = (a, b, y, hl, hh, hw2, g = 'blue') => { const p = P(ka + a, kb + b, 0); G[gk(g)].box(p[0], yDeck + y, p[2], u[0], u[1], hl, hh, hw2); };
      kp(0, 0, 1.3, 1.7, 1.3, 1.05); kp(0, 0, 2.65, 1.85, 0.06, 1.2, 'white'); kp(0, 0, 0.05, 1.72, 0.05, 1.07, 'white');
      // serving hatch on the face towards the pier building (-u): white frame, dark opening, shelf, striped-grey awning on two posts, oval sign above
      kp(-1.725, 0, 1.2, 0.015, 0.46, 0.95, 'white'); kp(-1.74, 0, 1.2, 0.015, 0.4, 0.86, 'hatch'); kp(-1.9, 0, 0.8, 0.2, 0.03, 0.98, 'white');
      kp(-2.0, 0, 1.82, 0.38, 0.025, 1.12, 'soffit'); kp(-2.38, 0, 1.78, 0.02, 0.07, 1.12, 'white');
      for (const sb of [-1.0, 1.0]) kp(-2.33, sb, 0.9, 0.025, 0.9, 0.025, 'white');
      for (const [sa, sb, nx, nz, w, sy] of [[-1.72, 0, -u[0], -u[1], 1.7, 2.24], [0, -side * 1.07, -v[0] * side, -v[1] * side, 2.0, 1.75]]) { // oval signs
        const p = P(ka + sa, kb + sb, 0), sgm = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), m.kioskSign); sgm.position.set(p[0] + nx * 0.03, yDeck + sy, p[2] + nz * 0.03); sgm.rotation.y = Math.atan2(nx, nz); group.add(sgm); }
      const kc = P(ka, kb, 0); addCol('segment', [kc[0] - u[0] * 1.7, kc[2] - u[1] * 1.7], [kc[0] + u[0] * 1.7, kc[2] + u[1] * 1.7], 1.05, floorY + yDeck, floorY + yDeck + 2.6, 'kiosk');
      for (const a of [6.5, 9.5, 12.0]) { // picnic tables between the kiosk and the building (queue side), kept to the far side of the deck so the hatch stays clear
        const p = P(a, -off * 1.05, 0), W = (g, a2, b2, y, hl, hh, hw2) => { const q = [p[0] + u[0] * a2 + v[0] * b2, p[2] + u[1] * a2 + v[1] * b2]; G[gk(g)].box(q[0], yDeck + y, q[1], u[0], u[1], hl, hh, hw2); };
        W('tableTop', 0, 0, 0.75, 1.0, 0.025, 0.38); W('bench', 0, -0.72, 0.46, 1.0, 0.025, 0.14); W('bench', 0, 0.72, 0.46, 1.0, 0.025, 0.14); W('white', -0.75, 0, 0.38, 0.03, 0.37, 0.75); W('white', 0.75, 0, 0.38, 0.03, 0.37, 0.75);
        addCol('circle', [p[0], p[2]], null, 1.0, floorY + yDeck, floorY + yDeck + 0.9, 'bench'); }
    }
  }
  o.mouth = mouth;
  // the pier's own rail colliders close its land end and run right up to the building: open the mouth so you can step from the boardwalk onto the pier
  if (mouth) for (const c of o.pierColliders || []) {
    if (c.kind !== 'railing' || c.type !== 'segment') continue;
    const la = toLocal(...c.a), lb = toLocal(...c.b), d = (p) => Math.hypot(p[0] - mouth.c[0], p[1] - mouth.c[1]), nA = d(la) < 6, nB = d(lb) < 6;
    if (nA && nB) c.y0 = 1e9;
    else if (nA || nB) { const [p, q] = nA ? [c.a, c.b] : [c.b, c.a], Lq = Math.hypot(q[0] - p[0], q[1] - p[1]), t = 5.5 / Lq, np = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; if (nA) c.a = np; else c.b = np; }
  }
  for (const [k, g] of Object.entries(G)) { const mat = { white: m.white, silver: m.silver, soffit: m.soffit, charcoal: m.charcoal, timber: m.timber, tableTop: m.tableTop, stone: m.ramp, blue: m.blue }[k]; const me = g.mesh(mat); if (me) { me.castShadow = k !== 'stone'; me.receiveShadow = true; group.add(me); } }
  return { group, colliders, surfaces, ramps, mouth, kiosk, cafe: o.cafe };
}
