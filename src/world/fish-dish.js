// Fish Dish, 69-71 Undercliff Road West (OSM restaurant node 9382433174 inside building way 1017204179).
// Front elevation from a street-level photo supplied by the user (Google Street View, 2022): two-storey
// cream render with dark grey coping; a central bay with a curved first-floor window under a white
// curved fascia lettered FISH DISH, a dark canopy lettered FISH & CHIPS RESTAURANT over the glazed
// entrance; wide dark-framed windows on the left; three windows and LICENSED / RESTAURANT / TAKEAWAY
// plaques on the right. Footprint from OSM; proportions estimated from the photo.

import * as THREE from 'three';
import { ensureCCW, insetRing } from '../geo/polygon.js';

export const isFishDish = (b) => b.id === 1017204179;

let M = null;
function textTex(text, wPx, hPx, { bg = null, fg = '#5d636a', font = 'Georgia, serif', weight = 600, border = null, spacing = 2 } = {}) {
  const c = document.createElement('canvas'); c.width = wPx; c.height = hPx; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, wPx, hPx); }
  if (border) { g.strokeStyle = border; g.lineWidth = hPx * 0.06; g.strokeRect(hPx * 0.06, hPx * 0.06, wPx - hPx * 0.12, hPx - hPx * 0.12); g.lineWidth = hPx * 0.025; g.strokeRect(hPx * 0.14, hPx * 0.14, wPx - hPx * 0.28, hPx - hPx * 0.28); }
  const t = spacing ? text.split('').join(' '.repeat(spacing)) : text;
  let fs = hPx * 0.62; g.font = `${weight} ${fs}px ${font}`; const tw = g.measureText(t).width; if (tw > wPx * 0.9) { fs *= (wPx * 0.9) / tw; g.font = `${weight} ${fs}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!bg) { g.fillStyle = 'rgba(40,40,40,0.5)'; g.fillText(t, wPx / 2 + 2, hPx / 2 + 3); }
  g.fillStyle = fg; g.fillText(t, wPx / 2, hPx / 2 + 1);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M = {
    render: std({ color: 0xe2ddc4, roughness: 0.85 }),
    white: std({ color: 0xf2f2ee, roughness: 0.6 }),
    coping: std({ color: 0x3c4146, roughness: 0.6 }),
    frame: std({ color: 0x2b2f33, roughness: 0.5, metalness: 0.3 }),
    glass: std({ color: 0x1e2731, roughness: 0.08, metalness: 0.6 }),
    warm: std({ color: 0x3a2f28, emissive: 0x6b4a2a, emissiveIntensity: 0.35, roughness: 0.5 }),
    slate: std({ color: 0x4a5057, roughness: 0.6, metalness: 0.2 }),
    name: std({ map: textTex('FISH DISH', 1024, 160, { fg: '#5f666e' }), transparent: true, alphaTest: 0.3, metalness: 0.6, roughness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    canopySign: std({ map: textTex('FISH & CHIPS RESTAURANT', 1024, 80, { bg: '#eceae3', fg: '#7a8087', spacing: 1 }), roughness: 0.5 }),
    plaques: ['LICENSED', 'RESTAURANT', 'TAKEAWAY'].map((t) => std({ map: textTex(t, 512, 128, { bg: '#e7e1c9', fg: '#3b3b38', border: '#3b3b38', spacing: 1 }), roughness: 0.7 })),
    lamp: std({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 }),
  };
  return M;
}

export function buildFishDish(b, ctx) {
  const m = mats(), outer = ensureCCW(b.outer);
  // front: the long edge with a car road in front of it
  let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 8) continue;
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, mx = (a[0] + c[0]) / 2 + nx * 6, mz = (a[1] + c[1]) / 2 + nz * 6;
    const road = ctx.nearestRoad(mx, mz, 20, (r) => r.car);
    const score = L + (road ? 30 - road.d : 0); if (!best || score > best.score) best = { score, a, c, L, nx, nz };
  }
  const { a: A, c: B, L: W, nx: Nx, nz: Nz } = best;
  const Ex = (B[0] - A[0]) / W, Ez = (B[1] - A[1]) / W, Ox = (A[0] + B[0]) / 2, Oz = (A[1] + B[1]) / 2;
  const base = ctx.ground(Ox + Nx * 2, Oz + Nz * 2);
  let gMin = Infinity; for (const [x, z] of outer) gMin = Math.min(gMin, ctx.ground(x, z));
  const group = new THREE.Group(); group.name = 'landmark:fish-dish';
  const local = new THREE.Group(); local.position.set(Ox, base, Oz); local.rotation.y = Math.atan2(-Ez, Ex); group.add(local);
  const box = (mat, x0, x1, y0, y1, z0, z1) => { const me = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = me.receiveShadow = true; local.add(me); return me; };
  const plane = (mat, x0, x1, y0, y1, z) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); local.add(me); return me; };
  const H1 = 3.2, H2 = 6.3, TOP = 6.9;
  // body: footprint extruded, set just behind the front line
  const core = insetRing(outer, 0.15) || outer;
  const shape = new THREE.Shape(core.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: base + TOP - (gMin - 0.3), bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, gMin - 0.3, 0);
  const body = new THREE.Mesh(g, m.render); body.castShadow = body.receiveShadow = true; group.add(body);
  const coping = insetRing(outer, -0.12) || outer; // dark coping band round the roof edge
  for (let i = 0; i < coping.length; i++) { const p = coping[i], q = coping[(i + 1) % coping.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.1) continue;
    const me = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.3, 0.3), m.coping); me.position.set((p[0] + q[0]) / 2, base + TOP - 0.1, (p[1] + q[1]) / 2); me.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); group.add(me); }
  const hw = W / 2, c0 = -hw + W * 0.38, c1 = -hw + W * 0.68; // centre bay
  // left wing: wide dark-framed windows on both floors
  const win = (x0, x1, y0, y1, panes) => { box(m.frame, x0 - 0.08, x1 + 0.08, y0 - 0.08, y1 + 0.08, -0.02, 0.06); plane(m.glass, x0, x1, y0, y1, 0.07); for (let k = 1; k < panes; k++) { const x = x0 + ((x1 - x0) * k) / panes; box(m.frame, x - 0.04, x + 0.04, y0, y1, 0.05, 0.1); } };
  win(-hw + 0.4, c0 - 0.6, 0.25, 2.3, 6); plane(m.warm, -hw + 0.6, c0 - 0.8, 0.4, 2.1, 0.065);
  win(-hw + 0.9, c0 - 1.0, 3.7, 5.6, 4); box(m.frame, -hw + 0.9, c0 - 1.0, 4.8, 4.88, 0.05, 0.1);
  // right wing: plaques, three first-floor windows, ground-floor windows
  const rw = (c1 + 0.5 + hw - 0.3) / 2, span = hw - 0.3 - (c1 + 0.5);
  [0, 1, 2].forEach((k) => {
    const x = c1 + 0.5 + span * (k + 0.5) / 3;
    win(x - 0.75, x + 0.75, 3.8, 5.6, 2);
    plane(m.plaques[k], x - 0.95, x + 0.95, 2.75, 3.3, 0.04);
    if (k < 2) win(x - 0.85, x + 0.85, 0.4, 2.2, 2);
    box(m.lamp, x - 1.2, x - 1.05, 4.6, 4.85, 0, 0.18);
  });
  void rw;
  // centre bay: projecting, curved first-floor window, curved fascia with lettering, canopy, entrance
  box(m.white, c0, c1, 0, H1, -0.1, 0.25);
  box(m.white, c0 - 0.15, c0 + 0.15, 0, TOP + 0.4, -0.1, 0.5); box(m.white, c1 - 0.15, c1 + 0.15, 0, TOP + 0.4, -0.1, 0.5);
  plane(m.glass, c0 + 0.3, c1 - 0.3, 0.05, 2.95, 0.27);
  plane(m.warm, c0 + 0.5 + (c1 - c0) * 0.3, c0 + 0.5 + (c1 - c0) * 0.55, 0.05, 2.6, 0.275);
  for (const t of [0.12, 0.3, 0.7, 0.88]) { const x = c0 + (c1 - c0) * t; box(m.frame, x - 0.05, x + 0.05, 0, 2.95, 0.25, 0.32); }
  // canopy and its lettered fascia
  box(m.slate, c0 - 0.3, c1 + 0.3, H1 + 0.2, H1 + 0.5, -0.1, 1.2);
  box(m.white, c0 - 0.3, c1 + 0.3, H1 - 0.3, H1 + 0.2, 1.05, 1.25);
  plane(m.canopySign, c0 - 0.2, c1 + 0.2, H1 - 0.27, H1 + 0.17, 1.26);
  // curved bow window (half cylinder) between 3.8 and 5.6 m, with small panes
  const R = (c1 - c0) / 2 - 0.25, cx = (c0 + c1) / 2;
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.7, 24, 1, true, -Math.PI / 2, Math.PI), m.glass); bow.scale.z = 0.35; bow.position.set(cx, 4.7, 0.25); local.add(bow);
  for (let k = 0; k <= 8; k++) { const th = -Math.PI / 2 + (Math.PI * k) / 8; box(m.white, cx + Math.sin(th) * R - 0.05, cx + Math.sin(th) * R + 0.05, 3.85, 5.55, 0.25 + Math.cos(th) * R * 0.35 - 0.05, 0.25 + Math.cos(th) * R * 0.35 + 0.05); }
  const sill = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.15, R + 0.15, 0.2, 24, 1, false, -Math.PI / 2, Math.PI), m.white); sill.scale.z = 0.38; sill.position.set(cx, 3.75, 0.25); local.add(sill);
  const fascia = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 1.2, 24, 1, false, -Math.PI / 2, Math.PI), m.white); fascia.scale.z = 0.4; fascia.position.set(cx, 6.3, 0.25); local.add(fascia);
  plane(m.name, cx - R * 0.85, cx + R * 0.85, 5.95, 6.65, 0.25 + (R + 0.2) * 0.4 + 0.05);
  return { group, collider: { outer, holes: [], base: gMin - 0.3, top: base + TOP } };
}
