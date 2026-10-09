// Felixstowe Pier building (opened 2017; arcade, restaurant and the entrance to the pier).
// Footprint: OpenStreetMap way 91786049. Heights: tower top from Environment Agency LiDAR (about
// 11.9 m above the ground). Front elevation proportions measured from a photograph supplied by the
// user (Oct 2026): two white towers with dark louvred caps, a bowed roof fascia lettered
// "FELIXSTOWE PIER" over a wide blue glazed panel, a canopy lettered FISH & CHIPS / ENTRANCE /
// ICE CREAM, open arcade frontage and broad steps with navy railings. The glazed panel is drawn
// as a generic blue mosaic, not a copy of the real artwork; the towers' monogram is not drawn.

import * as THREE from 'three';
import { ensureCCW, insetRing, pointInRing } from '../geo/polygon.js';
import { triangulate } from './accum.js';

export const PIER_BUILDING_IDS = new Set([91786049]);
export const isPierBuilding = (b) => PIER_BUILDING_IDS.has(b.id) || /^felixstowe pier( amusements)?$/i.test(b.name || '') || /^felixstowe pier$/i.test(b.tags?.old_name || '');

const H = { // heights above the terrace floor, metres
  canopyLow: 2.75, canopyTop: 3.25, canopyDepth: 2.6, rail: 3.75, glassLo: 3.9, glassHi: 5.75, letterLo: 5.85, letterHi: 6.55,
  eaveLo: 6.55, eaveHi: 7.3, wingEaveEnd: 5.7, body: 5.9, towerShaft: 9.2, louvre: 10.35, cap: 11.15, dome: 11.6,
};
const STEPS = { n: 8, rise: 0.15, tread: 0.33, terrace: 3.6 };

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M = {
    white: std({ color: 0xf1f3f4, roughness: 0.55 }),
    panel: std({ color: 0xdfe3e6, roughness: 0.45, metalness: 0.15 }),
    silver: std({ color: 0xb9c0c6, roughness: 0.35, metalness: 0.6 }),
    cap: std({ color: 0x8e979f, roughness: 0.45, metalness: 0.35 }),
    louvre: std({ map: louvreTex(), roughness: 0.6, metalness: 0.3 }),
    darkGlass: std({ color: 0x1d2633, roughness: 0.12, metalness: 0.5 }),
    wingGlass: std({ color: 0x8e9aa6, roughness: 0.1, metalness: 0.65 }),
    stained: std({ map: stainedTex(), roughness: 0.2, metalness: 0.1, emissive: 0x0a1a3a, emissiveIntensity: 0.35 }),
    arcade: std({ map: arcadeTex(), roughness: 0.6, emissive: 0xffffff, emissiveMap: arcadeTex(), emissiveIntensity: 0.35 }),
    shutter: std({ map: shutterTex(), roughness: 0.6, metalness: 0.4 }),
    stone: std({ color: 0xdcd4c4, roughness: 0.85 }),
    navy: std({ color: 0x1c2638, roughness: 0.4, metalness: 0.5 }),
    deck: std({ color: 0x8a6b4e, roughness: 0.9 }),
    letters: {},
  };
  return M;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat = false) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function louvreTex() {
  const [c, g] = canvas(64, 128); g.fillStyle = '#2a3340'; g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 14) { g.fillStyle = '#56616e'; g.fillRect(0, y, 64, 5); g.fillStyle = '#141a22'; g.fillRect(0, y + 5, 64, 3); }
  const t = tex(c, true); return t;
}
function stainedTex() { // generic leaded mosaic in sea blues with wave bands (not the real artwork)
  const [c, g] = canvas(1024, 192); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let x = 0; x < 1024; x += 26) for (let y = 0; y < 192; y += 24) {
    const t = y / 192, band = Math.sin(x / 90 + y / 30) * 0.5 + 0.5;
    const l = 28 + t * 30 + band * 14 + r() * 10, hue = 205 + r() * 25 - t * 10;
    g.fillStyle = `hsl(${hue},${55 + r() * 25}%,${l}%)`;
    g.beginPath(); g.moveTo(x + r() * 6, y + r() * 6); g.lineTo(x + 26 + r() * 6, y + r() * 4); g.lineTo(x + 24 + r() * 6, y + 24 + r() * 6); g.lineTo(x + r() * 4, y + 22 + r() * 6); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(220,235,250,0.55)'; g.lineWidth = 5; // light wave bands
  for (const y0 of [70, 120, 160]) { g.beginPath(); for (let x = 0; x <= 1024; x += 8) g.lineTo(x, y0 + Math.sin(x / 55 + y0) * 9); g.stroke(); }
  g.strokeStyle = 'rgba(20,24,30,0.85)'; g.lineWidth = 3; // leading and mullions
  for (let x = 0; x <= 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 192); g.stroke(); }
  for (const y of [0, 96, 192]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.lineWidth = 1; g.strokeStyle = 'rgba(15,20,28,0.5)';
  for (let i = 0; i < 260; i++) { g.beginPath(); const x = r() * 1024, y = r() * 192; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 40); g.stroke(); }
  return tex(c);
}
let arcadeT = null;
function arcadeTex() {
  if (arcadeT) return arcadeT;
  const [c, g] = canvas(512, 128); g.fillStyle = '#20161a'; g.fillRect(0, 0, 512, 128); let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 22; i++) { // machines and lights glimpsed inside
    const x = r() * 500, w = 14 + r() * 26, h = 50 + r() * 50;
    g.fillStyle = `hsl(${r() * 360},45%,${22 + r() * 18}%)`; g.fillRect(x, 128 - h, w, h);
    g.fillStyle = 'rgba(255,240,200,0.8)'; g.fillRect(x + 3, 128 - h + 6, w - 6, 10);
  }
  g.fillStyle = 'rgba(255,220,160,0.35)'; for (let x = 10; x < 512; x += 40) g.fillRect(x, 4, 20, 4);
  arcadeT = tex(c); return arcadeT;
}
function shutterTex() { const [c, g] = canvas(64, 64); g.fillStyle = '#c9cdd0'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 6) { g.fillStyle = '#9da3a8'; g.fillRect(0, y, 64, 1.5); } const t = tex(c, true); return t; }
function letterMat(text, wM, hM) {
  const m = mats(); const key = text + wM;
  if (m.letters[key]) return m.letters[key];
  const ppm = 160, [c, g] = canvas(Math.round(wM * ppm), Math.round(hM * ppm));
  const fs = c.height * 0.8; g.font = `600 ${fs}px Georgia, "Times New Roman", serif`;
  const spaced = text.split('').join('  '); let tw = g.measureText(spaced).width; const sc = Math.min(1, (c.width * 0.98) / tw);
  g.save(); g.translate(c.width / 2, c.height / 2 + fs * 0.05); g.scale(sc, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(40,46,54,0.7)'; g.fillText(spaced, 3, 4); // shadow
  const grad = g.createLinearGradient(0, -fs / 2, 0, fs / 2); grad.addColorStop(0, '#d9dee3'); grad.addColorStop(0.45, '#7d8791'); grad.addColorStop(0.55, '#68727c'); grad.addColorStop(1, '#b5bcc3');
  g.fillStyle = grad; g.fillText(spaced, 0, 0); g.lineWidth = Math.max(2, fs / 22); g.strokeStyle = '#3e4650'; g.strokeText(spaced, 0, 0); g.restore();
  return (m.letters[key] = new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, alphaTest: 0.3, roughness: 0.3, metalness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
}

/**
 * Build the model. b: OSM building; ctx: tile build context (ground). Returns
 * { group, collider: {outer, base, top}, surfaces: [...], floorY }.
 */
export function buildPierBuilding(b, ctx) {
  const m = mats();
  const outer = ensureCCW(b.outer);
  // Front = edge whose outward side has the highest ground (the promenade); the sea is behind.
  let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 15) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    let g = 0; for (const d of [8, 12, 16]) g += ctx.ground(mx + nx * d, mz + nz * d);
    const score = g / 3 + L * 0.02; if (!best || score > best.score) best = { a, c, L, nx, nz, score };
  }
  // ensureCCW on the map gives an outward normal of (-dz, dx) in world x,z (z south)
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best;
  const Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W, Ox = (A[0] + B[0]) / 2, Oz = (A[1] + B[1]) / 2;
  let G = Infinity; for (const d of [9, 11, 13]) for (const t of [-0.3, 0, 0.3]) G = Math.min(G, ctx.ground(Ox + Ex * t * W + Nx * d, Oz + Ez * t * W + Nz * d));
  const floorY = G + STEPS.n * STEPS.rise;
  const group = new THREE.Group(); group.name = 'landmark:pier-building';
  const local = new THREE.Group(); local.position.set(Ox, floorY, Oz); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  // local axes: x along the facade (left -> right seen from the promenade), z outwards, y up.
  const box = (mat, x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); const me = new THREE.Mesh(g, mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = true; me.receiveShadow = true; local.add(me); return me; };
  const plane = (mat, x0, x1, y0, y1, z) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); local.add(me); return me; };
  const hw = W / 2, tw = 4.2, tA = -7, tB = 7; // tower centres: spacing 1.2 x tower height, as in the photograph
  const gapL = tA + tw / 2, gapR = tB - tw / 2;

  // --- main body: the OSM footprint extruded, walls down to the beach ---
  let gMin = Infinity; for (const [x, z] of outer) gMin = Math.min(gMin, ctx.ground(x, z));
  const core = insetRing(outer, 0.75) || outer; // facade details stand on the footprint line in front of it
  const shape = new THREE.Shape(core.map(([x, z]) => new THREE.Vector2(x, -z)));
  const body = new THREE.ExtrudeGeometry(shape, { depth: floorY + H.body - (gMin - 0.5), bevelEnabled: false });
  body.rotateX(-Math.PI / 2); body.translate(0, gMin - 0.5, 0);
  const bodyMesh = new THREE.Mesh(body, m.white); bodyMesh.castShadow = bodyMesh.receiveShadow = true; group.add(bodyMesh);
  // raised centre hall between the towers (the curved roof seen above the lettering)
  box(m.panel, gapL - 0.3, gapR + 0.3, H.body - 0.1, H.eaveLo, -18, -0.7);
  // --- front elevation ---
  // ground floor: shutter (fish & chips, left), open arcade (centre), kiosk glazing (right)
  box(m.white, -hw, hw, 0, H.canopyLow, -0.6, -0.4);
  plane(m.shutter, -hw + 1, tA - 1, 0.05, H.canopyLow - 0.1, -0.35);
  plane(m.arcade, tA - 0.5, tB + 0.5, 0.05, H.canopyLow - 0.1, -0.35);
  plane(m.darkGlass, tB + 1, hw - 1, 0.05, H.canopyLow - 0.1, -0.35);
  plane(m.arcade, tB + 1.5, hw - 1.5, 0.6, H.canopyLow - 0.3, -0.33);
  for (let x = -hw + 0.6; x <= hw - 0.5; x += W / 9) box(m.white, x - 0.18, x + 0.18, 0, H.canopyLow, -0.4, -0.05); // piers between openings
  // canopy along the whole front, lettered
  box(m.panel, -hw - 0.5, hw + 0.5, H.canopyLow + 0.32, H.canopyTop + 0.1, -0.4, H.canopyDepth - 0.25); // soffit/roof
  box(m.white, -hw - 0.5, hw + 0.5, H.canopyLow, H.canopyTop, H.canopyDepth - 0.25, H.canopyDepth); // fascia
  const cy = (H.canopyLow + H.canopyTop) / 2, ch = H.canopyTop - H.canopyLow - 0.08;
  plane(letterMat('FISH & CHIPS', 6.2, ch), (-hw + tA) / 2 - 3.1, (-hw + tA) / 2 + 3.1, cy - ch / 2, cy + ch / 2, H.canopyDepth + 0.01);
  plane(letterMat('ENTRANCE', 4.6, ch), -2.3, 2.3, cy - ch / 2, cy + ch / 2, H.canopyDepth + 0.01);
  plane(letterMat('ICE CREAM', 5.2, ch), (hw + tB) / 2 - 2.6, (hw + tB) / 2 + 2.6, cy - ch / 2, cy + ch / 2, H.canopyDepth + 0.01);
  // upper storey: white wall, wing glazing, central blue glazed panel
  box(m.white, -hw, hw, H.canopyTop, H.body, -0.6, -0.3);
  box(m.white, gapL, gapR, H.body, H.eaveLo, -0.6, -0.3);
  plane(m.wingGlass, -hw + 2.5, tA - tw / 2 - 1.2, H.glassLo + 0.1, H.glassHi - 0.4, -0.28);
  plane(m.wingGlass, tB + tw / 2 + 1.2, hw - 2.5, H.glassLo + 0.1, H.glassHi - 0.4, -0.28);
  plane(m.stained, gapL + 0.4, gapR - 0.4, H.glassLo, H.glassHi, -0.27);
  for (let x = gapL + 0.4; x <= gapR - 0.3; x += (gapR - gapL - 0.8) / 8) box(m.silver, x - 0.05, x + 0.05, H.glassLo, H.glassHi, -0.3, -0.2);
  plane(letterMat('FELIXSTOWE PIER', gapR - gapL - 1.2, H.letterHi - H.letterLo), gapL + 0.6, gapR - 0.6, H.letterLo, H.letterHi, -0.27);
  // wavy rail across the upper facade
  const wave = []; for (let x = -hw + 1; x <= hw - 1; x += 0.5) wave.push(new THREE.Vector3(x, H.rail + Math.sin(x * 0.55) * 0.18, -0.15));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wave), 200, 0.05, 6), m.silver); local.add(tube);
  // bowed roof fascia over the centre and sloping eaves over the wings
  const bow = (x) => 1.1 * (1 - (x / hw) ** 2);
  const eave = (x0, x1, y0a, y0b, y1a, y1b, segs) => {
    for (let i = 0; i < segs; i++) {
      const xa = x0 + ((x1 - x0) * i) / segs, xb = x0 + ((x1 - x0) * (i + 1)) / segs, f = (x) => (x - x0) / (x1 - x0);
      const loA = y0a + (y0b - y0a) * f(xa), loB = y0a + (y0b - y0a) * f(xb), hiA = y1a + (y1b - y1a) * f(xa), hiB = y1a + (y1b - y1a) * f(xb);
      const za = 0.6 + bow(xa), zb = 0.6 + bow(xb);
      const g = new THREE.BufferGeometry(); // front band + soffit back to the wall
      const P = [xa, loA, za, xb, loB, zb, xb, hiB, zb, xa, hiA, za, xa, loA, -0.3, xb, loB, -0.3];
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex([0, 1, 2, 0, 2, 3, 4, 1, 0, 4, 5, 1, 3, 2, 5, 3, 5, 4]);
      const gn = g.toNonIndexed(); gn.computeVertexNormals(); const me = new THREE.Mesh(gn, m.panel); me.material.side = THREE.DoubleSide; me.castShadow = true; local.add(me);
    }
  };
  eave(gapL - 0.4, gapR + 0.4, H.eaveLo, H.eaveLo, H.eaveHi, H.eaveHi, 12);
  eave(-hw - 0.8, tA - tw / 2, H.wingEaveEnd, H.body + 0.1, H.wingEaveEnd + 0.6, H.body + 0.9, 8);
  eave(tB + tw / 2, hw + 0.8, H.body + 0.1, H.wingEaveEnd, H.body + 0.9, H.wingEaveEnd + 0.6, 8);
  // towers
  for (const tx of [tA, tB]) {
    box(m.white, tx - tw / 2, tx + tw / 2, H.canopyTop - 0.4, H.towerShaft, -tw + 1.4, 1.4);
    plane(m.darkGlass, tx - 0.55, tx + 0.55, 4.3, 7.1, 1.41);
    box(m.louvre, tx - tw / 2 + 0.25, tx + tw / 2 - 0.25, H.towerShaft, H.louvre, -tw + 1.65, 1.15);
    const capG = new THREE.CylinderGeometry(tw * 0.62, tw * 0.78, H.cap - H.louvre, 4, 1); capG.rotateY(Math.PI / 4);
    const cap = new THREE.Mesh(capG, m.cap); cap.position.set(tx, (H.louvre + H.cap) / 2, 1.4 - tw / 2); cap.castShadow = true; local.add(cap);
    const slab = box(m.panel, tx - tw * 0.72, tx + tw * 0.72, H.cap - 0.12, H.cap + 0.02, 1.4 - tw / 2 - tw * 0.72, 1.4 - tw / 2 + tw * 0.72);
    slab.castShadow = true;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.silver); dome.position.set(tx, H.cap, 1.4 - tw / 2); dome.scale.y = 0.6; local.add(dome);
  }
  // terrace, steps and railings
  const T = STEPS.terrace, run = STEPS.n * STEPS.tread, stepX0 = -hw + W * 0.3; // steps on the right 70 %, wall + railing on the left
  box(m.stone, -hw - 0.5, hw + 0.5, -G - 1, 0, -0.5, T);
  for (let k = 1; k <= STEPS.n; k++) box(m.stone, stepX0, hw + 0.5, -G - 1, -k * STEPS.rise, T, T + k * STEPS.tread);
  box(m.stone, -hw - 0.5, stepX0, -G - 1, 0.25, T, T + 0.5); // plinth wall
  const rails = [];
  const post = (x, z, y) => box(m.navy, x - 0.04, x + 0.04, y, y + 1.05, z - 0.04, z + 0.04);
  for (let x = -hw - 0.3; x <= stepX0; x += 1.6) post(x, T + 0.25, 0.25);
  box(m.navy, -hw - 0.3, stepX0, 1.27, 1.32, T + 0.22, T + 0.28); rails.push([[-hw - 0.3, T + 0.25], [stepX0, T + 0.25]]);
  for (const x of [stepX0 + W * 0.18, stepX0 + W * 0.36, stepX0 + W * 0.52]) { // sloped handrails down the flight
    for (let k = 0; k <= STEPS.n; k += 2) post(x, T + k * STEPS.tread, -k * STEPS.rise);
    const g = new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(run, STEPS.n * STEPS.rise), 6); g.rotateX(Math.PI / 2 - Math.atan2(STEPS.n * STEPS.rise, run));
    const me = new THREE.Mesh(g, m.navy); me.position.set(x, 1.05 - (STEPS.n * STEPS.rise) / 2, T + run / 2); local.add(me);
  }
  // boardwalk wrapping the building (deck level = terrace level) with railings
  const walkRing = insetRing(outer, -3) || outer;
  const { verts, tris } = triangulate(walkRing, [outer.slice().reverse()]);
  const pos = []; for (const [i, j, k] of tris) for (const q of [i, k, j]) pos.push(verts[q][0], floorY + 0.02, verts[q][1]);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.computeVertexNormals();
  const deck = new THREE.Mesh(dg, m.deck); deck.material.side = THREE.DoubleSide; deck.receiveShadow = true; group.add(deck);

  // world-space helpers for walking surfaces and colliders
  const W2 = (x, z) => [Ox + Ex * x + Nx * z, Oz + Ez * x + Nz * z];
  const toLocal = (x, z) => { const dx = x - Ox, dz = z - Oz; return [dx * Ex + dz * Ez, dx * Nx + dz * Nz]; };
  const stepsRing = [W2(-hw - 0.5, -0.5), W2(hw + 0.5, -0.5), W2(hw + 0.5, T + run), W2(stepX0, T + run), W2(stepX0, T + 0.5), W2(-hw - 0.5, T + 0.5)];
  const stepsH = (x, z) => { const [, lz] = toLocal(x, z); if (lz <= T) return floorY; const k = Math.min(STEPS.n, Math.ceil((lz - T) / STEPS.tread)); return Math.max(ctx.ground(x, z), floorY - k * STEPS.rise); };
  const colliders = [];
  for (const [p, q] of rails) colliders.push({ type: 'segment', a: W2(...p), b: W2(...q), r: 0.06, y0: floorY, top: floorY + 1.3, kind: 'railing' });
  // boardwalk outer railing, open at the front (steps) and where the pier deck leaves
  const pierEnds = ctx.pierStarts || [];
  for (let i = 0; i < walkRing.length; i++) {
    const p = walkRing[i], q = walkRing[(i + 1) % walkRing.length];
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [, lz] = toLocal(...mid);
    if (lz > -1) continue; // the front: steps and terrace
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (let s = 0; s < L; s += 2) {
      const x = p[0] + ((q[0] - p[0]) * s) / L, z = p[1] + ((q[1] - p[1]) * s) / L;
      if (pierEnds.some((e) => Math.hypot(e[0] - x, e[1] - z) < 5)) continue;
      const s2 = Math.min(L, s + 2), x2 = p[0] + ((q[0] - p[0]) * s2) / L, z2 = p[1] + ((q[1] - p[1]) * s2) / L;
      colliders.push({ type: 'segment', a: [x, z], b: [x2, z2], r: 0.06, y0: floorY, top: floorY + 1.2, kind: 'railing' });
      const g = new THREE.BoxGeometry(0.08, 1.05, 0.08); const me = new THREE.Mesh(g, m.navy); me.position.set(x, floorY + 0.55, z); group.add(me);
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, Math.hypot(x2 - x, z2 - z)), m.navy); rl.position.set((x + x2) / 2, floorY + 1.08, (z + z2) / 2); rl.rotation.y = Math.atan2(x2 - x, z2 - z); group.add(rl);
    }
  }
  const surfaces = [
    { id: 'pier-steps', kind: 'terrace', ring: stepsRing, heightAt: stepsH, name: 'Felixstowe Pier steps', meshes: [] },
    { id: 'pier-boardwalk', kind: 'terrace', ring: walkRing, heightAt: () => floorY, name: 'Felixstowe Pier boardwalk', meshes: [] },
  ];
  group.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = true; } });
  return { group, collider: { outer, holes: [], base: gMin - 0.5, top: floorY + H.dome }, surfaces, colliders, floorY, front: { O: [Ox, Oz], E: [Ex, Ez], N: [Nx, Nz], W } };
}

export function inside(ring, x, z) { return pointInRing(x, z, ring); }
