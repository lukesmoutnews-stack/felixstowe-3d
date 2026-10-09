// The Regal fish bar and restaurant, Sea Road (OSM nodes 2721904455/2721904460 inside building
// relation 5474936). Front from a street-level photo supplied by the user (Google Street View): a
// cream-rendered two-storey building with a navy frieze under the cornice and a small clock on a
// raised parapet panel; a single-storey front extension with a violet-blue fascia lettered
// "Regal Fish Bar & Restaurant" (and "Regal Fish Bar · Takeaway" at the left end), a taller board over
// the entrance lettered "The REGAL / Fish Bar & Restaurant / Fully Licensed"; blue-framed shop windows
// on blue tiled stall risers; arched timber entrance doors; a glass-balustraded roof terrace on the
// left. The fish emblem on the fascia is not drawn. Footprint and height (LiDAR median 6.1 m,
// 90th percentile 7.3 m) from OSM / EA; proportions estimated from the photo.

import * as THREE from 'three';
import { ensureCCW } from '../geo/polygon.js';

export const isRegal = (b) => b.id === 5474936;

let M = null;
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const violet = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3a2c8c'); gr.addColorStop(0.6, '#4b3fb0'); gr.addColorStop(1, '#5d55c4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, h * 0.08); };
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const sans = '"Helvetica Neue", Arial, sans-serif';
  M = {
    render: std({ color: 0xece8da, roughness: 0.85 }),
    cream: std({ color: 0xe4dcc6, roughness: 0.8 }),
    navy: std({ color: 0x223a6e, roughness: 0.6 }),
    blueFrame: std({ color: 0x1f3f8f, roughness: 0.5, metalness: 0.2 }),
    tiles: std({ map: canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#21357a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa6c8'; g.lineWidth = 1.5; for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }), roughness: 0.25 }),
    glass: std({ color: 0x24303b, roughness: 0.08, metalness: 0.6 }),
    blinds: std({ map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#e6e6e2'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = '#c3c3bd'; g.fillRect(0, y, w, 1.5); } }), roughness: 0.7 }),
    timber: std({ color: 0x5b3524, roughness: 0.6 }),
    white: std({ color: 0xf4f4f0, roughness: 0.5 }),
    balustrade: std({ color: 0xbfd4dc, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }),
    steel: std({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.8 }),
    fascia: std({ map: canvasTex(2048, 96, (g, w, h) => {
      violet(g, w, h); g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
      g.font = `600 ${h * 0.34}px ${sans}`; g.textAlign = 'left'; g.fillText('Regal Fish Bar', w * 0.01, h * 0.38); g.font = `500 ${h * 0.22}px ${sans}`; g.fillText('Takeaway', w * 0.035, h * 0.76);
      g.font = `600 ${h * 0.5}px ${sans}`; g.textAlign = 'center'; g.fillText('Regal Fish Bar & Restaurant', w * 0.5, h * 0.52);
    }), roughness: 0.4 }),
    board: std({ map: canvasTex(768, 256, (g, w, h) => {
      violet(g, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${h * 0.3}px Georgia, "Times New Roman", serif`; g.fillText('The REGAL', w / 2, h * 0.36);
      g.font = `500 ${h * 0.13}px ${sans}`; g.fillText('Fish Bar & Restaurant', w / 2, h * 0.6); g.font = `500 ${h * 0.11}px ${sans}`; g.fillText('Fully Licensed', w / 2, h * 0.8);
    }), roughness: 0.4 }),
    clock: std({ map: canvasTex(128, 128, (g, w) => { g.fillStyle = '#1d2a4a'; g.fillRect(0, 0, w, w); g.fillStyle = '#f2f2ee'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.38, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2, w * 0.2); g.moveTo(w / 2, w / 2); g.lineTo(w * 0.7, w * 0.58); g.stroke(); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = '#333'; g.fillRect(w / 2 + Math.sin(a) * w * 0.32 - 2, w / 2 - Math.cos(a) * w * 0.32 - 2, 4, 4); } }), roughness: 0.4 }),
  };
  return M;
}

export function buildRegal(b, ctx) {
  const m = mats(), outer = ensureCCW(b.outer);
  let best = null; // front: long edge facing Sea Road
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 10) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, mx = (a[0] + c[0]) / 2 + nx * 8, mz = (a[1] + c[1]) / 2 + nz * 8;
    const road = ctx.nearestRoad(mx, mz, 25, (r) => r.car);
    const score = L * 0.5 + (road ? 40 - road.d : 0); if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best;
  const Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W, Ox = (A[0] + B[0]) / 2, Oz = (A[1] + B[1]) / 2;
  const base = ctx.ground(Ox + Nx * 3, Oz + Nz * 3);
  let gMin = Infinity; for (const [x, z] of outer) gMin = Math.min(gMin, ctx.ground(x, z));
  const group = new THREE.Group(); group.name = 'landmark:regal';
  const local = new THREE.Group(); local.position.set(Ox, base, Oz); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  const box = (mat, x0, x1, y0, y1, z0, z1) => { const me = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = me.receiveShadow = true; local.add(me); return me; };
  const plane = (mat, x0, x1, y0, y1, z) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); local.add(me); return me; };
  const hw = W / 2, X = (f) => -hw + W * f; // fraction along the front, left -> right
  const toLocal = (x, z) => { const dx = x - Ox, dz = z - Oz; return [dx * Ex + dz * Ez, dx * Nx + dz * Nz]; };
  // back mass: the footprint behind the front extension, two storeys
  const back = clipHalf(outer, (p) => toLocal(...p)[1] + 4.6); // keep local z <= -4.6
  const H2 = 6.3;
  if (back.length >= 3) {
    const shape = new THREE.Shape(back.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: base + H2 - (gMin - 0.3), bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, gMin - 0.3, 0);
    const me = new THREE.Mesh(g, m.render); me.castShadow = me.receiveShadow = true; group.add(me);
  }
  // single-storey front extension across the whole frontage
  box(m.render, -hw, hw, -0.3, 3.3, -4.7, -0.05);
  // upper storey brought forward over the middle and right, with sash windows, frieze, cornice, clock
  const u0 = X(0.24);
  box(m.render, u0, hw, 3.3, H2 - 0.4, -4.7, -1.0);
  box(m.navy, u0 - 0.05, hw + 0.05, H2 - 0.4, H2 - 0.05, -4.75, -0.95);
  box(m.white, u0 - 0.2, hw + 0.2, H2 - 0.05, H2 + 0.25, -4.8, -0.8);
  box(m.white, -hw, u0, 3.3, H2 + 0.15, -9, -4.7);
  box(m.navy, -hw - 0.05, u0, H2 - 0.4, H2 - 0.05, -4.76, -4.72);
  box(m.white, X(0.42), X(0.52), H2 + 0.25, H2 + 1.1, -1.3, -0.85);
  plane(m.clock, X(0.47) - 0.35, X(0.47) + 0.35, H2 + 0.35, H2 + 1.0, -0.84);
  const sash = (x0, x1, y0, y1, z) => { box(m.white, x0 - 0.1, x1 + 0.1, y0 - 0.1, y1 + 0.1, z - 0.03, z + 0.03); plane(m.glass, x0, x1, y0, y1, z + 0.04); box(m.white, x0, x1, (y0 + y1) / 2 - 0.04, (y0 + y1) / 2 + 0.04, z + 0.03, z + 0.08); };
  for (const f of [0.3, 0.44, 0.6, 0.86]) sash(X(f) - (f === 0.6 ? 1.3 : 0.8), X(f) + (f === 0.6 ? 1.3 : 0.8), 3.9, 5.5, -0.98);
  sash(X(0.06), X(0.16), 3.95, 5.4, -4.68);
  // glass balustrade on the roof terrace (left)
  plane(m.balustrade, -hw + 0.1, u0, 3.3, 4.35, -0.25);
  box(m.steel, -hw + 0.1, u0, 4.35, 4.42, -0.3, -0.2);
  for (let x = -hw + 0.1; x <= u0; x += 1.6) box(m.steel, x - 0.03, x + 0.03, 3.3, 4.4, -0.28, -0.22);
  // fascia (sloped board) and the taller REGAL board over the entrance
  const fa = plane(m.fascia, -hw, X(0.62), 2.7, 3.45, 0.32); fa.rotation.x = -0.18;
  box(m.blueFrame, -hw, X(0.62), 3.45, 3.55, -0.1, 0.35);
  plane(m.board, X(0.62), X(0.86), 2.75, 3.9, 0.3); box(m.blueFrame, X(0.62), X(0.86), 2.65, 2.75, -0.1, 0.32);
  // ground floor: pilasters, blue-framed windows on tiled risers, blinds, arched doors, right window
  for (const f of [0.0, 0.1, 0.18, 0.32, 0.46, 0.62, 0.86]) box(m.cream, X(f) - 0.3, X(f) + 0.3, 0, 2.7, -0.05, 0.25);
  const shopWin = (x0, x1, mat = m.glass) => { box(m.tiles, x0, x1, 0, 0.55, -0.1, 0.12); box(m.blueFrame, x0, x1, 0.55, 2.55, -0.1, 0.06); plane(mat, x0 + 0.1, x1 - 0.1, 0.65, 2.45, 0.07); };
  shopWin(X(0.0) + 0.3, X(0.1) - 0.3); shopWin(X(0.1) + 0.3, X(0.18) - 0.3); shopWin(X(0.18) + 0.3, X(0.32) - 0.3); shopWin(X(0.32) + 0.3, X(0.46) - 0.3, m.blinds);
  box(m.render, X(0.46) + 0.3, X(0.62) - 0.3, 0, 2.7, -0.1, 0.05);
  box(m.timber, X(0.66), X(0.82), 0, 2.6, -0.1, 0.1); plane(m.glass, X(0.70), X(0.78), 0.3, 2.0, 0.11);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry((X(0.82) - X(0.66)) / 2, (X(0.82) - X(0.66)) / 2, 0.14, 20, 1, false, 0, Math.PI), m.timber); arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.set(X(0.74), 2.6, 0.03); arch.scale.set(1, 1, 0.45); local.add(arch);
  sash(X(0.9), X(0.97), 0.7, 2.4, 0.06);
  return { group, collider: { outer, holes: [], base: gMin - 0.3, top: base + H2 + 1.1 } };
}

/** Sutherland-Hodgman clip of a ring against f(p) <= 0. */
function clipHalf(ring, f) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], fp = f(p), fq = f(q);
    if (fp <= 0) out.push(p);
    if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
