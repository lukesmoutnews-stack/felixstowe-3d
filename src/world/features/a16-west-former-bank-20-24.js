// Area a16-west-former-bank-20-24: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// The former bank (Barclays) at 20/24 Hamilton Road, OSM way 688756416, on the corner with Orwell Road. Victorian red brick with
// terracotta dressings: a stepped (Dutch) gable on the Hamilton Road front, a second stepped gable on the long Orwell Road wall,
// and a chamfered corner tower with the arched entrance, a "BANK" panel, a pierced balcony and a carved pediment.
// Positions are metres along each wall, scaled from the photos former-bank-24-front / -corner and former-barclays-20-side
// (estimates, not surveyed). The street-edge frame in frontage-details.js only knows car roads, so the walls are given here.

import * as THREE from 'three';
import { Geo } from '../seafront.js';

const TERRA = '#c4603e', STONE = '#d3bf9d', BRICKF = '#a9482c', WHITE = '#eeeadd', PALE = '#b9bfbb', DOOR = '#1d3f8f', SLATEBOARD = '#1c4d95';

// the footprint walls: [A, C] with the outward normal on the left of A->C (n = (-uz, ux)); measured from the OSM outline
const FR = {
  H: [[73.1, -197.8], [72.9, -204.7]], // Hamilton Road front, south end to north end
  T: [[69.5, -192.9], [73.1, -197.8]], // chamfered corner (entrance), Orwell Road end to Hamilton Road end
  S: [[50.3, -185.7], [69.5, -192.9]], // long Orwell Road wall, west end to the corner
  W: [[40.8, -195.7], [43.9, -186.3]], // west wing, rear
  J: [[43.9, -186.3], [49.3, -188.4]], // small south-facing jog of the west wing
};

function kit(K, [A, C]) {
  const dx = C[0] - A[0], dz = C[1] - A[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, g = K.g;
  const geos = new Map();
  const G = (key) => { if (!geos.has(key)) geos.set(key, new Geo()); return geos.get(key); };
  const P = (s, d, y) => [A[0] + ux * s + nx * d, g + y, A[1] + uz * s + nz * d];
  const box = (key, s, d, y0, y1, hs, hd) => { const p = P(s, d, (y0 + y1) / 2); G(key).box(p[0], p[1], p[2], ux, uz, hs, (y1 - y0) / 2, hd); };
  const quad = (key, s0, s1, y0, y1, d, uvm = 0) => {
    const uv = uvm ? [[0, 0], [(s1 - s0) / uvm[0], 0], [(s1 - s0) / uvm[0], (y1 - y0) / uvm[1]], [0, (y1 - y0) / uvm[1]]] : undefined;
    G(key).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  };
  const tri = (key, a, b, c) => G(key).tri(a, b, c);
  const flush = (tag) => {
    for (const [key, geo] of geos) {
      const [kind, col] = key.split('|'); let mat;
      if (kind === 'glass') mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.12, metalness: 0.3, side: THREE.DoubleSide });
      else if (kind === 'brick') mat = new THREE.MeshStandardMaterial({ map: K.m.brick.map, normalMap: K.m.brick.normalMap, color: col, roughness: 1, side: THREE.DoubleSide });
      else mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide });
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a16:' + tag + ':' + key; K.extra.push(me); }
    }
  };
  return { L, P, box, quad, tri, flush };
}

function archFan(k, key, s, yc, r, d, n = 8) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    k.tri(key, k.P(s, d, yc), k.P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), k.P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1)));
  }
}

/** Tall sash window: white frame, pale blind-covered glass, a meeting rail, terracotta sill and a bracketed hood. */
function win(k, w) {
  const s = w.s, hw = w.w / 2, y0 = w.y, y1 = y0 + w.h, fr = 'flat|' + WHITE, gl = 'glass|' + (w.glass || PALE);
  k.quad(fr, s - hw - 0.09, s + hw + 0.09, y0 - 0.09, y1 + 0.09, 0.05);
  k.quad(gl, s - hw, s + hw, y0, y1, 0.09);
  k.box(fr, s, 0.11, y0 + w.h * 0.62 - 0.03, y0 + w.h * 0.62 + 0.03, hw, 0.02);
  if (w.w > 1.0) k.box(fr, s, 0.11, y0, y1, 0.03, 0.02);
  if (w.circle) { // the little circle-and-cross glazing pattern in the transom lights
    const cy = y1 - 0.45, r = Math.min(0.28, hw * 0.4);
    for (let i = 0; i < 12; i++) { const a = (Math.PI * 2 * i) / 12; k.box(fr, s + Math.cos(a) * r, 0.12, cy + Math.sin(a) * r - 0.02, cy + Math.sin(a) * r + 0.02, 0.03, 0.01); }
    k.box(fr, s, 0.12, cy - 0.02, cy + 0.02, r, 0.01); k.box(fr, s, 0.12, cy - r, cy + r, 0.02, 0.01);
  }
  if (w.sill !== false) k.box('flat|' + TERRA, s, 0.13, y0 - 0.2, y0 - 0.09, hw + 0.2, 0.12);
  if (w.hood !== false) { k.box('flat|' + TERRA, s, 0.14, y1 + 0.1, y1 + 0.3, hw + 0.2, 0.12); k.box('flat|' + TERRA, s, 0.12, y1 + 0.3, y1 + 0.42, hw * 0.45, 0.08); }
}

/** A stepped (Dutch) gable standing on the wall top: brick steps with stone copings and a spiked finial. */
function steppedGable(k, g, H) {
  const y0 = H - 0.3, n = g.steps ?? 7, dh = g.dh ?? 0.58, dx = (g.hw - 0.5) / n, tint = g.tint || '#ffffff';
  for (let i = 0; i < n; i++) {
    const hw = g.hw - i * dx, ya = y0 + i * dh, yb = y0 + (i + 1) * dh;
    k.quad('brick|' + tint, g.s - hw, g.s + hw, ya, yb, 0.03, [3.2, 2.9]);
    k.box('flat|' + BRICKF, g.s - hw + 0.18, -0.16, ya, yb, 0.18, 0.2); k.box('flat|' + BRICKF, g.s + hw - 0.18, -0.16, ya, yb, 0.18, 0.2);
    for (const sg of [-1, 1]) k.box('flat|' + STONE, g.s + sg * (hw - 0.25), -0.04, yb, yb + 0.12, 0.34, 0.27); // coping block on each step
  }
  const top = y0 + n * dh;
  k.box('flat|' + BRICKF, g.s, -0.16, top - dh, top, 0.5, 0.2);
  k.box('flat|' + STONE, g.s, -0.04, top, top + 0.14, 0.5, 0.27);
  k.box('flat|' + TERRA, g.s, -0.04, top + 0.14, top + 1.1, 0.045, 0.045); // finial spike
  k.box('flat|' + TERRA, g.s, -0.04, top + 0.14, top + 0.34, 0.12, 0.12);
  if (g.band !== false) k.box('flat|' + TERRA, g.s, 0.12, y0 + 0.05, y0 + 0.27, g.hw + 0.1, 0.1); // string course along the foot of the gable
  return top;
}

function eaves(k, H, s0, s1, out = 0.24) { k.box('flat|' + TERRA, (s0 + s1) / 2, out / 2, H - 0.3, H + 0.04, (s1 - s0) / 2, out / 2); }
function band(k, y0, y1, s0, s1, out = 0.14, col = TERRA) { k.box('flat|' + col, (s0 + s1) / 2, out / 2 + 0.02, y0, y1, (s1 - s0) / 2, out / 2); }
function pilaster(k, s, H, w = 0.5, y1) {
  const top = y1 ?? H - 0.3;
  k.box('flat|' + TERRA, s, 0.1, 0.3, top, w / 2, 0.09); k.box('flat|' + TERRA, s, 0.14, 0, 0.45, w / 2 + 0.07, 0.13); // base
  k.box('flat|' + TERRA, s, 0.17, top - 0.45, top, w / 2 + 0.08, 0.14); // bracketed head
  for (const y of [1.6, 3.0]) k.box('flat|' + STONE, s, 0.13, y, y + 0.1, w / 2 + 0.03, 0.12); // stone bands round the column
}

export const FEATURES = {
  bankFront(K, it) {
    const H = K.H, tint = '#ffd9bb';
    // ---------- Hamilton Road front (photo former-bank-24-front) ----------
    {
      const k = kit(K, FR.H), L = k.L; // 6.9 m: terracotta columns each side, two tall ground-floor windows, one first-floor window, stepped gable
      k.box('flat|#b3a186', L / 2, 0.06, 0, 0.5, L / 2, 0.08); // stone plinth
      pilaster(k, 0.3, H); pilaster(k, L - 0.3, H);
      win(k, { s: 2.1, w: 1.5, h: 2.9, y: 0.95, circle: true }); win(k, { s: 4.8, w: 1.5, h: 2.9, y: 0.95, circle: true });
      band(k, 4.0, 4.25, 0.6, L - 0.6);
      win(k, { s: L / 2, w: 1.0, h: 1.5, y: 5.5, circle: true, hood: true });
      band(k, 7.0, 7.2, 0.6, L - 0.6, 0.12);
      eaves(k, H, 0, L);
      steppedGable(k, { s: L / 2, hw: 3.45, tint }, H);
      win(k, { s: L / 2, w: 0.75, h: 1.2, y: H + 0.75, circle: true, sill: true, hood: true });
      k.box('flat|#2f6fb0', L / 2 + 0.2, 0.45, 4.2, 5.1, 0.55, 0.12); k.box('flat|#e9edf0', L / 2 + 0.2, 0.58, 4.3, 4.9, 0.4, 0.02); // the hanging "To Let" board
      k.box('flat|#3b4046', 1.2, 0.08, 3.5, 3.78, 0.28, 0.03); // street-name plate
      k.flush('H');
    }
    // ---------- the chamfered corner: entrance tower (photo former-bank-24-corner) ----------
    {
      const k = kit(K, FR.T), L = k.L, c = L / 2;
      k.box('flat|#b3a186', c, 0.06, 0, 0.5, L / 2, 0.08);
      pilaster(k, 0.3, H); pilaster(k, L - 0.3, H);
      // arched doorway in a terracotta surround, blue double doors with a fanlight
      k.quad('flat|' + TERRA, c - 1.0, c + 1.0, 0.4, 3.0, 0.1); archFan(k, 'flat|' + TERRA, c, 3.0, 1.0, 0.1);
      k.quad('flat|' + DOOR, c - 0.72, c + 0.72, 0.45, 2.9, 0.16); archFan(k, 'flat|' + DOOR, c, 2.9, 0.72, 0.16);
      k.box('flat|#16306c', c, 0.18, 0.45, 2.9, 0.025, 0.02); k.box('flat|#c9c4b4', c + 0.55, 0.2, 1.1, 1.2, 0.08, 0.03);
      for (const sg of [-1, 1]) k.box('flat|' + TERRA, c + sg * 1.12, 0.2, 2.5, 3.2, 0.14, 0.14); // corbels at the springing
      // "BANK" panel and cornice
      k.box('flat|' + TERRA, c, 0.17, 3.85, 4.85, (L - 1.1) / 2, 0.15);
      for (let i = 0; i < 4; i++) k.box('flat|#7a3520', c - 1.35 + i * 0.9, 0.34, 4.12, 4.62, 0.17, 0.02);
      k.box('flat|' + TERRA, c, 0.3, 4.85, 5.05, (L - 0.8) / 2, 0.25);
      // pierced balcony balustrade above
      k.box('flat|' + TERRA, c, 0.42, 5.05, 5.15, (L - 1.3) / 2, 0.36);
      k.box('flat|' + TERRA, c, 0.7, 5.15, 6.0, (L - 1.3) / 2, 0.08);
      for (let i = 0; i < 6; i++) k.box('flat|#5d2b1b', c - 1.9 + i * 0.76, 0.79, 5.35, 5.8, 0.18, 0.01);
      k.box('flat|' + TERRA, c, 0.72, 6.0, 6.18, (L - 1.1) / 2, 0.14);
      // first-floor window and carved pediment
      win(k, { s: c, w: 1.1, h: 1.55, y: 6.2, hood: false, sill: false });
      k.box('flat|' + TERRA, c, 0.16, 7.95 - 0.45, 8.0 - 0.15, (L - 1.0) / 2, 0.14);
      k.box('flat|' + TERRA, c, 0.2, H - 0.3, H + 0.04, (L - 0.6) / 2, 0.2);
      for (let i = 0; i < 5; i++) k.box('flat|' + TERRA, c - 1.5 + i * 0.75, 0.12, H + 0.04, H + 0.38 + (i === 2 ? 0.3 : 0), 0.22, 0.1);
      // step up to the door
      k.box('flat|#b3a186', c, 0.75, 0, 0.3, 1.5, 0.7); k.box('flat|#b3a186', c, 1.5, 0, 0.14, 1.9, 0.55);
      for (const s of [0.3, L - 0.3]) k.box('flat|' + TERRA, s, 0.16, H, H + 1.4, 0.07, 0.07); // pinnacles on the columns
      k.flush('T');
    }
    // ---------- the long Orwell Road wall (photo former-barclays-20-side) ----------
    {
      const k = kit(K, FR.S), L = k.L;
      k.box('flat|#b3a186', L / 2, 0.06, 0, 0.5, L / 2, 0.08);
      // west part (the lower wing): three tall ground windows, two above, eaves cornice
      for (const s of [1.5, 3.6, 5.7]) win(k, { s, w: 1.3, h: 2.7, y: 1.0 });
      for (const s of [2.5, 4.7]) win(k, { s, w: 1.25, h: 1.9, y: 4.6, hood: true, circle: true });
      band(k, 4.0, 4.22, 0.4, 8.4, 0.12);
      eaves(k, H - 0.6, 0, 8.4);
      // main gable bay: narrow pair either side of a column, two big circle-pattern windows, narrow window above, gable with two small lights
      pilaster(k, 8.7, H); pilaster(k, 19.3, H);
      win(k, { s: 7.8, w: 0.6, h: 2.6, y: 1.0, hood: true }); win(k, { s: 9.7, w: 0.6, h: 2.6, y: 1.0, hood: true });
      win(k, { s: 13.2, w: 1.7, h: 2.7, y: 1.0, circle: true }); win(k, { s: 16.1, w: 1.7, h: 2.7, y: 1.0, circle: true });
      win(k, { s: 10.7, w: 0.75, h: 1.7, y: 4.7 });
      win(k, { s: 13.2, w: 1.35, h: 1.85, y: 4.6, circle: true }); win(k, { s: 16.1, w: 1.35, h: 1.85, y: 4.6, circle: true });
      band(k, 3.95, 4.2, 8.9, 19.0, 0.14);
      band(k, 6.95, 7.12, 8.9, 19.0, 0.1);
      steppedGable(k, { s: 13.3, hw: 4.55, tint }, H);
      win(k, { s: 12.6, w: 0.7, h: 1.25, y: H + 0.75, hood: false }); win(k, { s: 14.0, w: 0.7, h: 1.25, y: H + 0.75, hood: false });
      eaves(k, H, 17.9, 19.6);
      // tall brick chimney stack behind the wing roof
      k.box('flat|#a14a2e', 2.9, -3.0, 5.5, 11.0, 0.5, 0.38); k.box('flat|' + STONE, 2.9, -3.0, 11.0, 11.15, 0.6, 0.46);
      for (const o of [-0.22, 0.22]) k.box('flat|#b4552f', 2.9 + o, -3.0, 11.15, 11.6, 0.1, 0.1);
      k.flush('S');
    }
    // ---------- west wing, rear wall ----------
    {
      const k = kit(K, FR.W);
      for (const s of [2.0, 5.0, 8.0]) { win(k, { s, w: 1.15, h: 2.3, y: 1.0, hood: false }); win(k, { s, w: 1.1, h: 1.4, y: 4.6, hood: false }); }
      k.flush('W');
    }
    {
      const k = kit(K, FR.J);
      for (const s of [1.4, 4.3]) { win(k, { s, w: 1.2, h: 2.5, y: 1.0, hood: true }); win(k, { s, w: 1.1, h: 1.6, y: 4.6, hood: true }); }
      k.flush('J');
    }
  },
};
