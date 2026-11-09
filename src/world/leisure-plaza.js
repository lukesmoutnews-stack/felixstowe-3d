// Extras in front of Felixstowe Leisure Centre's entrance (Street View photos supplied by the user): the yellow hatched box in front of the door wall and the cycle hoops with parked bikes in front of the glazed bay and porch. The raised platform, bins, lamps, railings and paving of the
// forecourt already come from forecourt.js, so none of that is repeated here. Positions are estimates; no imagery is reproduced.

import * as THREE from 'three';
import { makeKit } from './geo-kit.js';
import { ensureCCW } from '../geo/polygon.js';

/** The plaza-side face: the entrance front (long edge facing about SSE, east-most) and the east-facing edge that follows it. */
export function leisureFront(outer) {
  const P = ensureCCW(outer), n = P.length; let best = null, bi = -1;
  for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 12) continue;
    const ex = (c[0] - a[0]) / L, ez = (c[1] - a[1]) / L, nx = -ez, nz = ex, mx = (a[0] + c[0]) / 2;
    if (nx * 0.41 + nz * 0.91 > 0.95 && (!best || mx > best.mx)) { best = { a, c, L, ex, ez, nx, nz, mx }; bi = i; } }
  if (!best) return null;
  const edge = (k) => { const a = P[(bi + k) % n], c = P[(bi + k + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]), ex = (c[0] - a[0]) / L, ez = (c[1] - a[1]) / L; return { a, c, L, ex, ez, nx: -ez, nz: ex }; };
  best.door = edge(1); best.next = edge(4); // the door wall (south of the entrance) and the entrance bay / porch
  return best;
}

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  const hc = document.createElement('canvas'); hc.width = hc.height = 256; const hg = hc.getContext('2d'), hw = 256;
  hg.strokeStyle = '#e8c92e'; hg.lineWidth = 8; hg.strokeRect(6, 6, hw - 12, hw - 12); hg.lineWidth = 7; for (let k = -hw; k < 2 * hw; k += 34) { hg.beginPath(); hg.moveTo(k, hw); hg.lineTo(k + hw, 0); hg.stroke(); }
  const ht = new THREE.CanvasTexture(hc); ht.colorSpace = THREE.SRGBColorSpace;
  M = {
    hatch: new THREE.MeshStandardMaterial({ map: ht, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false, side: THREE.DoubleSide }),
    navy: std({ color: 0x1f2d4d, roughness: 0.5, metalness: 0.3 }), tyre: std({ color: 0x151515 }),
    bikeA: std({ color: 0x6b3a8a, metalness: 0.4, roughness: 0.4 }), bikeB: std({ color: 0xcfd3d8, metalness: 0.5, roughness: 0.4 }), bikeC: std({ color: 0x2c6e9e, metalness: 0.4, roughness: 0.4 }),
  };
  return M;
}

export function buildLeisurePlaza(b, ctx, front) {
  void front; const f = leisureFront(b.outer); if (!f) return null;
  const m = mats(), K = makeKit(), group = new THREE.Group(); group.name = 'landmark:leisure-plaza'; const gnd = ctx.ground;
  // yellow hatched box on the paving in front of the door wall
  { const e = f.door, W = (u, w) => [e.a[0] + e.ex * u + e.nx * w, e.a[1] + e.ez * u + e.nz * w], P = [W(2.5, 1.0), W(7.5, 1.0), W(7.5, 5.0), W(2.5, 5.0)].map(([x, z]) => [x, gnd(x, z) + 0.06, z]);
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); ge.setIndex([0, 1, 2, 0, 2, 3]); ge.computeVertexNormals(); K.put(m.hatch, ge); }
  // cycle hoops and parked bikes in front of the porch, along the east-facing edge
  { const e = f.next, W = (u, w) => [e.a[0] + e.ex * u + e.nx * w, e.a[1] + e.ez * u + e.nz * w], th = Math.atan2(e.ez, e.ex);
    const hoop = (x, z) => { const y = gnd(x, z), ax = Math.cos(th), az = Math.sin(th); const a0 = [x - ax * 0.4, z - az * 0.4], a1 = [x + ax * 0.4, z + az * 0.4];
      K.tube(m.navy, [a0[0], y, a0[1]], [a0[0], y + 0.85, a0[1]], 0.025, 6); K.tube(m.navy, [a1[0], y, a1[1]], [a1[0], y + 0.85, a1[1]], 0.025, 6); K.tube(m.navy, [a0[0], y + 0.85, a0[1]], [a1[0], y + 0.85, a1[1]], 0.025, 6); };
    for (let i = 0; i < 6; i++) { const p = W(1.0 + i * 1.15, 4.0); hoop(p[0], p[1]); }
    for (let i = 0; i < 5; i++) { const p = W(1.58 + i * 1.15, 4.0), y = gnd(p[0], p[1]), mat = [m.bikeA, m.bikeB, m.bikeC][i % 3], dx = e.nx, dz = e.nz;
      for (const t of [-0.55, 0.55]) { const ge = new THREE.TorusGeometry(0.33, 0.025, 6, 16); ge.rotateY(Math.atan2(dx, dz) + Math.PI / 2); ge.translate(p[0] + dx * t, y + 0.33, p[1] + dz * t); K.put(m.tyre, ge); }
      const pt = (t, h) => [p[0] + dx * t, y + h, p[1] + dz * t];
      K.tube(mat, pt(-0.55, 0.33), pt(0, 0.62), 0.025, 5); K.tube(mat, pt(0, 0.62), pt(0.5, 0.66), 0.025, 5); K.tube(mat, pt(0.5, 0.66), pt(0.55, 0.33), 0.025, 5); K.tube(mat, pt(-0.55, 0.33), pt(0.5, 0.66), 0.025, 5); } }
  K.flush(group, 'leisure-plaza');
  return { group, colliders: [] };
}
