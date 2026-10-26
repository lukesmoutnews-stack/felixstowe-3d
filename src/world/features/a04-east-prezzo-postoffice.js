// Area a04-east-prezzo-postoffice: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
// Prezzo to Wine Boutique (pitched slate roof, dormers, chimneys, shopfront details) and the single-storey post office
// range with its roofed arcade, from the Street View photos in docs/research/hamilton-road-streetview (e-*.png).
// Every dimension is an estimate scaled from the photos.
import * as THREE from 'three';

const PITCH = 0.72;   // roof slope, rise over run (about 36 degrees; same as the shared dormer helper)
const MATS = {};
function mat(k, o) { return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, ...o })); }
const OWN = {
  green: () => mat('green', { color: 0x1d4733, roughness: 0.5 }),
  tileBlack: () => mat('tileBlack', { color: 0x121416, roughness: 0.25, metalness: 0.2 }),
  awning: () => mat('awning', { color: 0x16171b, roughness: 0.85 }),
  fasciaBlack: () => mat('fasciaBlack', { color: 0x15161a, roughness: 0.4 }),
  slat: () => mat('slat', { color: 0x8c5a38, roughness: 0.8 }),
  slatDark: () => mat('slatDark', { color: 0x3b2517, roughness: 0.9 }),
  darkTile: () => mat('darkTile', { color: 0x4d413c, roughness: 0.85 }),
  hadoBlue: () => mat('hadoBlue', { color: 0x1c3f9c, roughness: 0.45 }),
  hadoPale: () => mat('hadoPale', { color: 0xdfe3e8, roughness: 0.6 }),
  dusk: () => mat('dusk', { color: 0x4b4a4c, roughness: 0.25, metalness: 0.2 }),
  warm: () => mat('warm', { color: 0x9b8468, roughness: 0.3, metalness: 0.1 }),
  doorRed: () => mat('doorRed', { color: 0xb02a2a, roughness: 0.45 }),
  hood: () => mat('hood', { color: 0xa5303c, roughness: 0.55 }),
  timberDark: () => mat('timberDark', { color: 0x2c2a26, roughness: 0.8 }),
};

/** A frame along the wall from A (south end) to C (north end), s northward, d out to the east (the street), y up. */
function frame(K, A, C) {
  const L = Math.hypot(C[0] - A[0], C[1] - A[1]);
  const ux = (C[0] - A[0]) / L, uz = (C[1] - A[1]) / L;   // north is -z
  const nx = -uz, nz = ux;                                  // outward normal, toward +x (the street)
  const P = (s, d, y) => [A[0] + ux * s + nx * d, K.g + y, A[1] + uz * s + nz * d];
  return { A, C, L, ux, uz, nx, nz, P };
}

/** Accumulators for my own colours plus the shared ones on K.G; `flush` adds my own to K.extra. */
function kit(K, F) {
  const Geo = K.G.gw.constructor, own = {};
  const g = (k) => (K.G[k] || (own[k] || (own[k] = new Geo())));
  const box = (k, s, d, y, hs, hd, hy) => { const p = F.P(s, d, y); g(k).box(p[0], p[1], p[2], F.ux, F.uz, hs, hy, hd); };
  const quad = (k, a, b, c, d) => g(k).quad(a, b, c, d);
  const tri = (k, a, b, c) => g(k).tri(a, b, c);
  const flush = () => { for (const [k, geo] of Object.entries(own)) { const m = geo.mesh(OWN[k]()); if (m) { m.name = 'a04:' + k; K.extra.push(m); } } };
  return { g, box, quad, tri, flush, P: F.P, L: F.L };
}

/** White-framed sash: frame, glass, bars. s centre, y0..y1, width w. */
function sash(Q, s, y0, y1, w, o = {}) {
  const d = o.d ?? 0.07, t = 0.06, glass = o.glass || 'pane', cols = o.cols || 2, rows = o.rows || 3;
  Q.quad(glass, Q.P(s - w / 2, d, y0), Q.P(s + w / 2, d, y0), Q.P(s + w / 2, d, y1), Q.P(s - w / 2, d, y1));
  Q.box('white', s - w / 2, d + 0.02, (y0 + y1) / 2, t / 2, 0.03, (y1 - y0) / 2);
  Q.box('white', s + w / 2, d + 0.02, (y0 + y1) / 2, t / 2, 0.03, (y1 - y0) / 2);
  Q.box('white', s, d + 0.02, y0, w / 2, 0.03, t / 2);
  Q.box('white', s, d + 0.02, y1, w / 2, 0.03, t / 2);
  for (let i = 1; i < cols; i++) Q.box('white', s - w / 2 + (w * i) / cols, d + 0.03, (y0 + y1) / 2, 0.015, 0.02, (y1 - y0) / 2);
  for (let i = 1; i < rows; i++) Q.box('white', s, d + 0.03, y0 + ((y1 - y0) * i) / rows, w / 2, 0.02, 0.015);
  if (o.sill !== false) Q.box('white', s, d + 0.07, y0 - 0.05, w / 2 + 0.1, 0.07, 0.04);
}

/** Round-headed opening: fan of triangles over a rectangle. */
function archFill(Q, k, s, w, y0, ys, d) {
  const r = w / 2, n = 10;
  Q.quad(k, Q.P(s - r, d, y0), Q.P(s + r, d, y0), Q.P(s + r, d, ys), Q.P(s - r, d, ys));
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    Q.tri(k, Q.P(s, d, ys), Q.P(s + Math.cos(a0) * r, d, ys + Math.sin(a0) * r), Q.P(s + Math.cos(a1) * r, d, ys + Math.sin(a1) * r));
    Q.tri(k, Q.P(s, d, ys), Q.P(s + Math.cos(a1) * r, d, ys + Math.sin(a1) * r), Q.P(s + Math.cos(a0) * r, d, ys + Math.sin(a0) * r));
  }
}

/** Black drainpipe down the wall. */
function pipe(Q, s, H, d = 0.07) { Q.box('black', s, d, H / 2 + 0.2, 0.04, 0.04, H / 2 - 0.2); }

/** Pitched slate roof with white-framed dormers and chimneys over a flat-roofed block. */
function roof(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), H = K.H, L = F.L, r = it.ridge || 3.7, yr = H + r * PITCH, ov = 0.2;
  const s0 = 0.0, s1 = L;
  // slate slopes, with a white fascia and black gutter at the eaves
  Q.quad('slate', Q.P(s0, ov, H - 0.14), Q.P(s1, ov, H - 0.14), Q.P(s1, -r, yr), Q.P(s0, -r, yr));
  Q.quad('slate', Q.P(s0, -r, yr), Q.P(s1, -r, yr), Q.P(s1, -2 * r, H), Q.P(s0, -2 * r, H));
  Q.box('white', (s0 + s1) / 2, ov, H - 0.07, L / 2, 0.04, 0.09);
  Q.box('black', (s0 + s1) / 2, ov + 0.06, H - 0.16, L / 2, 0.05, 0.04);
  Q.box('coping', (s0 + s1) / 2, -r, yr + 0.03, L / 2, 0.08, 0.04);     // ridge
  // brick gable ends where the terrace stops
  if (it.endS) Q.tri('brick', Q.P(s0 + 0.02, 0, H), Q.P(s0 + 0.02, -2 * r, H), Q.P(s0 + 0.02, -r, yr));
  if (it.endN) Q.tri('brick', Q.P(s1 - 0.02, -2 * r, H), Q.P(s1 - 0.02, 0, H), Q.P(s1 - 0.02, -r, yr));
  // dormers: white boxes with a flat dark roof, a two-column sash
  for (const f of it.dormers || []) {
    const s = s0 + L * f, w = it.dormerW || 1.55, fr = 0.55, yb = H + fr * PITCH - 0.08, yt = yb + 1.55, back = (yt - H) / PITCH;
    Q.box('white', s, -fr, (yb + yt) / 2, w / 2, 0.05, (yt - yb) / 2);
    Q.quad('pane', Q.P(s - w / 2 + 0.2, -fr + 0.06, yb + 0.14), Q.P(s + w / 2 - 0.2, -fr + 0.06, yb + 0.14), Q.P(s + w / 2 - 0.2, -fr + 0.06, yt - 0.14), Q.P(s - w / 2 + 0.2, -fr + 0.06, yt - 0.14));
    Q.box('white', s, -fr + 0.08, (yb + yt) / 2, 0.025, 0.02, (yt - yb) / 2 - 0.12);
    for (const k of [1, 2]) Q.box('white', s, -fr + 0.08, yb + 0.14 + ((yt - yb - 0.28) * k) / 3, w / 2 - 0.2, 0.02, 0.015);
    for (const sg of [-1, 1]) Q.quad('white', Q.P(s + sg * w / 2, -fr, yb), Q.P(s + sg * w / 2, -fr, yt), Q.P(s + sg * w / 2, -back, yt), Q.P(s + sg * w / 2, -back + 0.1, H + (back - 0.1) * PITCH));
    Q.box('slate', s, -(fr - 0.28 + back) / 2, yt + 0.06, w / 2 + 0.14, (back + fr - 0.28) / 2, 0.06);
    Q.box('white', s, -fr + 0.26, yt - 0.05, w / 2 + 0.1, 0.03, 0.06);
  }
  // chimney stacks with pots
  for (const f of it.chimneys || []) {
    const s = L * f, i = 2.6, y = H + i * PITCH, top = y + 1.8;
    Q.box('brick', s, -i, (y - 0.5 + top) / 2, 0.38, 0.28, (top - y + 0.5) / 2);
    Q.box('coping', s, -i, top + 0.04, 0.44, 0.34, 0.05);
    for (const o of [-0.17, 0.17]) Q.box('tile', s + o, -i, top + 0.3, 0.07, 0.07, 0.24);
  }
  Q.flush();
}

/** Prezzo: black fascia over the whole front, black awnings, dark glazing, a dark brick/black stall riser. */
function prezzo(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L;
  Q.box('fasciaBlack', L / 2, 0.09, 4.0, L / 2 - 0.05, 0.09, 0.5);              // upper black board above the lettered sign
  Q.box('steel', L / 2, 0.19, 4.2, L / 2 - 0.4, 0.01, 0.015);                  // thin light line along it
  Q.box('fasciaBlack', L / 2, 0.05, 3.22, L / 2 - 0.05, 0.05, 0.4);             // black board behind the lettered sign (sign face is at d 0.13)
  Q.box('fasciaBlack', L / 2, 0.06, 0.6, L / 2 - 0.05, 0.06, 0.6);              // black stall riser
  for (const [a, b] of [[0.3, 5.9], [6.1, 11.7], [11.9, L - 0.3]]) {            // three black awnings under the lettered sign
    Q.quad('awning', Q.P(a, 0.14, 2.95), Q.P(b, 0.14, 2.95), Q.P(b, 1.7, 2.32), Q.P(a, 1.7, 2.32));
    Q.quad('awning', Q.P(a, 1.7, 2.32), Q.P(b, 1.7, 2.32), Q.P(b, 1.7, 2.1), Q.P(a, 1.7, 2.1));
    Q.quad('awning', Q.P(a, 0.14, 2.95), Q.P(a, 1.7, 2.32), Q.P(a, 1.7, 2.1), Q.P(a, 0.14, 2.8));
    Q.quad('awning', Q.P(b, 0.14, 2.95), Q.P(b, 1.7, 2.32), Q.P(b, 1.7, 2.1), Q.P(b, 0.14, 2.8));
  }
  for (const s of [0.25, L - 0.25]) pipe(Q, s, K.H);
  Q.flush();
}

/** Hado Pharmacy: brick pilasters, a royal-blue lower panel and door surround, pale board over. */
function hado(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L;
  Q.box('brick', 0.35, 0.1, 1.3, 0.35, 0.1, 1.3);                               // brick plinth/pier at the south end
  Q.box('hadoBlue', L * 0.62, 0.07, 0.55, L * 0.34, 0.07, 0.55);                // blue panels under the glazing
  Q.box('hadoBlue', L * 0.62, 0.06, 2.62, L * 0.34, 0.05, 0.2);                 // blue band over the shop windows, under the lettered sign
  Q.box('hadoPale', L / 2, 0.1, 4.0, L / 2 - 0.1, 0.1, 0.4);                    // pale board above the lettered sign
  pipe(Q, L - 0.2, K.H);
  Q.flush();
}

/** Jenny Riddell-Carpenter MP office: dark green fascia and panel, black tiled stall riser and pilaster. */
function mp(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L;
  Q.box('tileBlack', L / 2, 0.07, 0.5, L / 2 - 0.2, 0.07, 0.5);                 // black glazed tile stall riser
  Q.box('tileBlack', 0.45, 0.09, 2.2, 0.35, 0.09, 2.2);                          // tiled pilaster at the south end
  Q.box('green', L / 2, 0.09, 4.05, L / 2 - 0.1, 0.09, 0.42);                    // green board above the lettered sign
  Q.box('green', L / 2, 0.05, 2.55, L / 2 - 0.9, 0.05, 0.32);                    // 'Working hard for Suffolk Coastal' panel over the glazing
  for (const s of [1.2, 2.6, 4.6, 5.9, L - 0.9]) Q.box('green', s, 0.05, 1.5, 0.045, 0.05, 1.0); // green window and door frames
  Q.box('green', L * 0.6, 0.05, 2.15, 1.0, 0.05, 0.05);
  pipe(Q, L - 0.15, K.H);
  Q.flush();
}

/** Wine Boutique: slatted timber fascia, black stall riser, large corner-style shop window. */
function wine(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L;
  Q.box('slat', L / 2, 0.1, 4.15, L / 2 - 0.1, 0.1, 0.45);                      // slatted timber board above the lettered sign
  for (let k = 0; k < 6; k++) Q.box('slatDark', L / 2, 0.2, 3.75 + k * 0.17, L / 2 - 0.1, 0.01, 0.012);
  Q.box('tileBlack', L / 2, 0.07, 0.3, L / 2 - 0.1, 0.07, 0.3);
  Q.box('white', 0.25, 0.1, 2.0, 0.22, 0.1, 2.0);                                // white pilaster between the MP office and the shop
  Q.box('slat', L * 0.4, 0.1, 2.45, 0.9, 0.05, 0.05);
  pipe(Q, L - 0.15, K.H);
  Q.flush();
}

/** Single-storey red-brick range: black plinth, tall white sashes with bars, a red door, a white band under a raised parapet. */
function postOffice(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L, H = K.H;
  Q.box('black', L / 2, 0.05, 0.55, L / 2, 0.05, 0.55);                          // black plinth (to just under the sill height)
  Q.box('brick', L / 2, -0.15, H + 0.3, L / 2, 0.16, 0.3);                       // parapet above the arcade's eaves line
  Q.box('black', L / 2, -0.12, H + 0.62, L / 2 + 0.03, 0.21, 0.035);             // dark coping
  Q.box('white', L / 2, 0.05, H - 0.15, L / 2, 0.06, 0.17);                      // white band
  const win = [1.0, 2.75, 4.5, 6.25, 9.9, 11.7];
  for (const s of win) {
    sash(Q, s, 1.22, 3.1, 1.15, { cols: 3, rows: 4, glass: 'warm' });
    Q.box('white', s, 0.06, 3.5, 0.14, 0.05, 0.2);                               // white keystone block up to the band
    Q.box('hood', s, 0.04, 3.25, 0.6, 0.04, 0.07);                               // red-brick arched head, simplified to a flat header
  }
  // red-framed door with a glazed fanlight
  const sd = 8.05;
  Q.box('doorRed', sd - 0.5, 0.06, 1.35, 0.05, 0.05, 1.35); Q.box('doorRed', sd + 0.5, 0.06, 1.35, 0.05, 0.05, 1.35);
  Q.box('doorRed', sd, 0.06, 2.72, 0.55, 0.05, 0.05); Q.box('doorRed', sd, 0.06, 1.0, 0.5, 0.05, 0.05);
  Q.quad('warm', Q.P(sd - 0.45, 0.08, 0.1), Q.P(sd + 0.45, 0.08, 0.1), Q.P(sd + 0.45, 0.08, 2.7), Q.P(sd - 0.45, 0.08, 2.7));
  Q.quad('pane', Q.P(sd - 0.45, 0.08, 2.78), Q.P(sd + 0.45, 0.08, 2.78), Q.P(sd + 0.45, 0.08, 3.2), Q.P(sd - 0.45, 0.08, 3.2));
  pipe(Q, 7.3, H + 0.5); pipe(Q, 0.1, H + 0.5);
  Q.flush();
}

/** Roofed arcade: red-banded hood, a tall arched gateway with dark doors, round-arched glazed bays, a low dark-tiled roof. */
function arcade(K, it) {
  const F = frame(K, it.A, it.C), Q = kit(K, F), L = F.L, H = K.H;
  Q.box('black', L / 2, 0.05, 0.25, L / 2, 0.05, 0.25);                           // dark brick plinth
  Q.box('hood', L / 2, 0.16, H - 0.28, L / 2, 0.16, 0.12);                        // red hood moulding along the top of the arches
  Q.box('coping', L / 2, 0.16, H - 0.14, L / 2 + 0.02, 0.2, 0.025);
  // tiled lean-to roof rising behind the hood
  Q.quad('darkTile', Q.P(0, 0.12, H - 0.05), Q.P(L, 0.12, H - 0.05), Q.P(L, -3.4, H + 1.15), Q.P(0, -3.4, H + 1.15));
  Q.tri('brick', Q.P(0.02, 0.0, H - 0.05), Q.P(0.02, -3.4, H + 1.15), Q.P(0.02, -3.4, H - 0.05));
  Q.tri('brick', Q.P(L - 0.02, -3.4, H - 0.05), Q.P(L - 0.02, -3.4, H + 1.15), Q.P(L - 0.02, 0.0, H - 0.05));
  // gateway: big arch with a red band round it and dark boarded doors
  const gs = 2.0, gw = 2.9, gy = 2.6;
  archFill(Q, 'hood', gs, gw + 0.5, 0.0, gy - 0.1, 0.045);
  archFill(Q, 'timberDark', gs, gw, 0.0, gy - 0.1, 0.07);
  for (let s = gs - gw / 2 + 0.2; s < gs + gw / 2; s += 0.2) Q.box('black', s, 0.085, 1.2, 0.008, 0.01, 1.2);
  // arched glazed bays
  const pitch = 2.6, w = 1.7;
  for (let s = 5.1; s + w / 2 < L - 0.3; s += pitch) {
    archFill(Q, 'hood', s, w + 0.34, 0.45, 1.85, 0.04);
    archFill(Q, 'dusk', s, w, 0.5, 1.85, 0.065);
    Q.box('white', s, 0.09, 1.2, 0.02, 0.02, 0.75 + w / 4);
    Q.box('white', s, 0.09, 1.5, w / 2, 0.02, 0.02);
    Q.box('white', s, 0.09, 0.5, w / 2 + 0.08, 0.05, 0.04);
  }
  Q.flush();
}

export const FEATURES = {
  a04Roof: roof, a04Prezzo: prezzo, a04Hado: hado, a04Mp: mp, a04Wine: wine, a04PostOffice: postOffice, a04Arcade: arcade,
};
