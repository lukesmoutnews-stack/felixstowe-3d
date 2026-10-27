// Area a08-station-building: Great Eastern Square. The Edwardian former station building (OSM way 357281655), seen from the
// square on its east side: red brick, a dark clay-tile hipped roof, two Dutch (shaped) gables with stone dressings, a copper-roofed
// cupola on the ridge, brick chimney stacks and a glazed canopy with three glass gablets over the entrance. Also the blue bollards,
// the bus shelter on the Hamilton Road kerb, the Great Eastern Square totem sign, the blue hoarding round the empty site to the
// north and the big pine behind it.
// Source: Street View photos supplied by the user (docs/research/hamilton-road-streetview: e-ges-station-building-1/2,
// e-ges-station-busshelter, e-ges-hoarding-pine). All dimensions are estimates scaled from those photos (door about 2.2 m),
// not surveyed. Frame: world x east, z SOUTH; the front looks east, the Sainsbury's wing is to the south (z -762).
// Frontage details signature: (K, it, ctx). Everything here is built in world coordinates, so it does not depend on which
// footprint edge frontage-details picks as "the street edge".
import * as THREE from 'three';
import { Textures } from '../textures.js';

const MATS = {};
const mat = (k, f) => MATS[k] || (MATS[k] = f());
const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, ...o });
const TINT = [1.5, 1.14, 0.86];                       // brick: orange-red, lighter than the default maroon
const OWN = {
  brick: () => { const t = Textures.facadeTexture('brick_red', false, 61, 0); return std({ map: t.map, normalMap: t.normalMap, roughness: 1, color: new THREE.Color(TINT[0], TINT[1], TINT[2]) }); },
  roof: () => { const t = Textures.roofTexture('clay', 9); return std({ map: t.map, normalMap: t.normalMap, roughness: 0.9, color: new THREE.Color(0.56, 0.42, 0.4) }); },
  stone: () => std({ color: 0xd9cfb4, roughness: 0.85 }),
  white: () => std({ color: 0xf3f1ea, roughness: 0.55 }),
  black: () => std({ color: 0x1c1d20, roughness: 0.5, metalness: 0.3 }),
  dark: () => std({ color: 0x23282c, roughness: 0.3, metalness: 0.2 }),
  pane: () => std({ color: 0x56707e, roughness: 0.12, metalness: 0.3 }),
  glass: () => std({ color: 0xa8c8d6, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.38, depthWrite: false }),
  lead: () => std({ color: 0x6b7176, roughness: 0.55, metalness: 0.3 }),
  copper: () => std({ color: 0x5f8f7c, roughness: 0.6, metalness: 0.25 }),          // weathered green copper
  slategrey: () => std({ color: 0x4d5258, roughness: 0.8 }),
  pot: () => std({ color: 0xb05a35, roughness: 0.85 }),
  bollard: () => std({ color: 0x1b4fae, roughness: 0.5, metalness: 0.2 }),
  navy: () => std({ color: 0x1f2c4a, roughness: 0.55, metalness: 0.3 }),
  gold: () => std({ color: 0xd2a22b, roughness: 0.5, metalness: 0.3 }),
  tan: () => std({ color: 0xcdb98a, roughness: 0.7 }),
  bin: () => std({ color: 0x1c55b8, roughness: 0.6 }),
  timber: () => std({ color: 0x8a6a45, roughness: 0.85 }),
  hoard: () => std({ color: 0x27354f, roughness: 0.8 }),
  hoardPost: () => std({ color: 0x6a4d33, roughness: 0.9 }),
  hedge: () => std({ color: 0x2d5a2f, roughness: 1 }),
  trunk: () => std({ color: 0x5b4331, roughness: 1 }),
  needles: () => std({ color: 0x2c4a2c, roughness: 1, flatShading: true }),
  needles2: () => std({ color: 0x395f35, roughness: 1, flatShading: true }),
  orange: () => std({ color: 0xe9701a, roughness: 0.55 }),
  red: () => std({ color: 0xc8202a, roughness: 0.55 }),
};

let muralMat = null, totemMat = null;
function muralMaterial() { // abstract coloured hoarding art (not a copy of the real artwork): teal, pink, yellow and blue swirls
  if (muralMat) return muralMat;
  if (typeof document === 'undefined') return (muralMat = std({ color: 0x3b9aa8 }));
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#3aa3b0'; x.fillRect(0, 0, 1024, 128);
  const cols = ['#f0c53a', '#e86a8f', '#2f4fa8', '#7ad0b2', '#f58a3a', '#8b5cc4', '#ffffff'];
  for (let i = 0; i < 26; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); const cx = 20 + i * 40 + (i % 3) * 7, cy = 30 + ((i * 53) % 90), r = 22 + (i * 11) % 26; x.ellipse(cx, cy, r * 1.4, r, (i % 5) * 0.4, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#16213a'; x.fillRect(0, 0, 1024, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (muralMat = std({ map: t, roughness: 0.7 }));
}
function totemMaterial() {
  if (totemMat) return totemMat;
  if (typeof document === 'undefined') return (totemMat = std({ color: 0xe9701a }));
  const c = document.createElement('canvas'); c.width = 256; c.height = 640; const x = c.getContext('2d');
  x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 256, 640);
  x.fillStyle = '#333'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillText('GREAT EASTERN SQUARE', 128, 34);
  x.fillStyle = '#ee6a1b'; x.fillRect(8, 56, 240, 190); x.fillStyle = '#fff'; x.font = 'bold 38px sans-serif'; x.fillText("Sainsbury's", 128, 110);
  x.fillStyle = '#d5121f'; x.fillRect(24, 134, 208, 60); x.fillStyle = '#fff'; x.font = 'bold 40px sans-serif'; x.fillText('Argos', 128, 178);
  x.fillStyle = '#1d5fb0'; x.fillRect(24, 204, 100, 34); x.fillStyle = '#e9c22a'; x.fillRect(132, 204, 100, 34);
  x.fillStyle = '#1d5fb0'; x.fillRect(88, 290, 80, 90); x.fillStyle = '#fff'; x.font = 'bold 64px sans-serif'; x.fillText('P', 128, 358);
  x.fillStyle = '#ee6a1b'; x.fillRect(8, 440, 240, 150); x.fillStyle = '#fff'; x.font = 'bold 44px sans-serif'; x.fillText('Travel', 150, 540);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (totemMat = std({ map: t, roughness: 0.5 }));
}

function station(K, it) {
  const g = K.g, Geo = K.G.gw.constructor, own = {};
  const G = (k) => own[k] || (own[k] = new Geo());
  const W = (x, y, z) => [x, g + y, z];
  const H = K.H;                                           // eaves height (the shared building box ends here)
  const box = (k, x, y, z, hx, hy, hz) => G(k).box(x, g + y, z, 1, 0, hx, hy, hz);
  const quad = (k, a, b, c, d, uv) => G(k).quad(a, b, c, d, uv);
  const tri = (k, a, b, c) => G(k).tri(a, b, c);
  const triUV = (k, a, b, c, ua, ub, uc) => { const o = G(k), n = o.p.length / 3; o.p.push(...a, ...b, ...c); o.uv.push(...ua, ...ub, ...uc); o.idx.push(n, n + 1, n + 2); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const rquad = (k, a, b, c, d) => { const u = dist(a, b) / 2, v = dist(b, c) / 2; quad(k, a, b, c, d, [[0, 0], [u, 0], [u * 0.9, v], [u * 0.1, v]]); };   // roof tiles: 2 m per texture repeat
  const rtri = (k, a, b, c) => { const u = dist(a, b) / 2, v = Math.hypot(dist(a, c), 0) / 2; triUV(k, a, b, c, [0, 0], [u, 0], [u / 2, v * 0.8]); };
  const col = (x, z, r, top) => K.colliders.push({ type: 'circle', x, z, r, y0: g - 0.3, top: g + top, kind: 'post' });
  const seg = (a, b, top, r = 0.12) => K.colliders.push({ type: 'segment', a, b, r, y0: g - 0.3, top: g + top, kind: 'wall' });

  // ---------------- main hipped roof (ridge runs north-south, parallel to the front) ----------------
  const XE = 138.0, XW = 122.4, XR = (XE + XW) / 2, ZS = -772.4, ZN = -794.0, TAN = 0.52;
  const HL = (XE - XW) / 2, RISE = HL * TAN, YR = H + RISE;
  const zr0 = ZS, zr1 = ZN + HL;                                              // ridge ends: the south end is a gable hidden behind the south wing
  rquad('roof', W(XE, H, ZS), W(XE, H, ZN), W(XR, YR, zr1), W(XR, YR, zr0));
  rquad('roof', W(XW, H, ZN), W(XW, H, ZS), W(XR, YR, zr0), W(XR, YR, zr1));
  rtri('roof', W(XE, H, ZN), W(XW, H, ZN), W(XR, YR, zr1));
  triUV('brick', W(XW, H, ZS), W(XE, H, ZS), W(XR, YR, ZS), [XW / 3.2, H / 2.9], [XE / 3.2, H / 2.9], [XR / 3.2, YR / 2.9]);   // south end of the main range
  box('stone', XR, YR + 0.05, (zr0 + zr1) / 2, 0.12, 0.08, Math.abs(zr1 - zr0) / 2);      // ridge capping
  box('black', XE + 0.1, H + 0.05, (ZS + ZN) / 2, 0.05, 0.05, Math.abs(ZS - ZN) / 2);   // gutter along the east eaves
  { // the lower hipped roof over the extension at the north end (wall at x 134.7)
    const xe = 135.05, xw = 123.0, zs = -793.7, zn = -800.9, zm = (zs + zn) / 2, yr = H + (zs - zn) / 2 * 0.62, hl = (zs - zn) / 2;
    rquad('roof', W(xe, H, zs), W(xe, H, zn), W(xe - hl, yr, zn + hl), W(xe - hl, yr, zs - hl));
    rquad('roof', W(xw, H, zn), W(xw, H, zs), W(xw + hl, yr, zs - hl), W(xw + hl, yr, zn + hl));
    rquad('roof', W(xw, H, zs), W(xe, H, zs), W(xe - hl, yr, zs - hl), W(xw + hl, yr, zs - hl));
    rquad('roof', W(xe, H, zn), W(xw, H, zn), W(xw + hl, yr, zn + hl), W(xe - hl, yr, zn + hl));
    box('black', xe + 0.05, H + 0.05, zm, 0.05, 0.05, hl);
  }

  // ---------------- Dutch gables: brick wall above the eaves, stone coping, roof behind ----------------
  function gable(xf, zc, Wh, R) {
    const nw = 0.28 * Wh, yc = R - nw, pts = [];
    for (let i = 0; i <= 8; i++) { const s = i / 8; pts.push([nw + (Wh - nw) * Math.pow(1 - s, 1.4), yc * s]); }   // eaves up to the neck (right side)
    const right = pts;                                                                                           // eaves .. neck
    const arc = []; for (let a = 15; a <= 165; a += 15) arc.push([nw * Math.cos(a * Math.PI / 180), yc + nw * Math.sin(a * Math.PI / 180)]);
    const loop = [...right, ...arc, ...right.slice().reverse().map(([w, y]) => [-w, y])];               // right base .. neck .. over the top .. left neck .. left base
    const P = (t, y, dx = 0) => W(xf + dx, H + y, zc + t);
    const uvOf = (t, y) => [(zc + t) / 3.2, (H + y) / 2.9];
    const c0 = [0, 0];
    for (let i = 0; i < loop.length - 1; i++) {
      const a = loop[i], b = loop[i + 1];
      triUV('brick', P(c0[0], c0[1]), P(a[0], a[1]), P(b[0], b[1]), uvOf(...c0), uvOf(...a), uvOf(...b));
    }
    // coping: a stone band just inside the silhouette, and a cap along the top
    const cx = 0, cy = R * 0.35;
    for (let i = 0; i < loop.length - 1; i++) {
      const a = loop[i], b = loop[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      let nx = -dy / L, ny = dx / L; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (nx * (cx - mx) + ny * (cy - my) < 0) { nx = -nx; ny = -ny; }                                        // point inwards
      const w = 0.2;
      quad('stone', P(a[0], a[1], 0.04), P(b[0], b[1], 0.04), P(b[0] + nx * w, b[1] + ny * w, 0.04), P(a[0] + nx * w, a[1] + ny * w, 0.04));
    }
    // string course across the gable, oculus, slit
    box('stone', xf + 0.04, H + R * 0.2, zc, 0.06, 0.07, Wh * 0.92);
    const ox = xf + 0.05, oy = H + yc + 0.05, nseg = 14;
    for (let i = 0; i < nseg; i++) {
      const a0 = i / nseg * 2 * Math.PI, a1 = (i + 1) / nseg * 2 * Math.PI;
      tri('stone', [ox, g + oy, zc], [ox, g + oy + Math.sin(a0) * 0.42, zc + Math.cos(a0) * 0.42], [ox, g + oy + Math.sin(a1) * 0.42, zc + Math.cos(a1) * 0.42]);
      tri('dark', [ox + 0.01, g + oy, zc], [ox + 0.01, g + oy + Math.sin(a0) * 0.26, zc + Math.cos(a0) * 0.26], [ox + 0.01, g + oy + Math.sin(a1) * 0.26, zc + Math.cos(a1) * 0.26]);
    }
    box('dark', xf + 0.03, H + R * 0.3, zc, 0.04, 0.45, 0.12); box('stone', xf + 0.02, H + R * 0.3, zc, 0.04, 0.5, 0.2);
    // wing roof behind the gable: ridge at 0.61 of the half-width
    const Rr = 0.61 * Wh, xr = xf - (xf - XR) - 1.2, ridge = H + Rr;
    rquad('roof', W(xf - 0.05, H, zc - Wh), W(xr, H, zc - Wh), W(xr, ridge, zc), W(xf - 0.05, ridge, zc));
    rquad('roof', W(xr, H, zc + Wh), W(xf - 0.05, H, zc + Wh), W(xf - 0.05, ridge, zc), W(xr, ridge, zc));
  }
  gable(136.2, -767.8, 4.4, 3.9);
  gable(139.3, -791.0, 3.0, 3.2);

  // ---------------- cupola on the ridge over the entrance ----------------
  { const cx = XR, cz = -779.5, y0 = YR - 0.1, n = 8, r0 = 1.7, r1 = 1.3;
    const ring = (r, y, a0 = Math.PI / 8) => Array.from({ length: n }, (_, i) => W(cx + Math.cos(a0 + i * 2 * Math.PI / n) * r, y, cz + Math.sin(a0 + i * 2 * Math.PI / n) * r));
    const a = ring(r0, y0), b = ring(r1, y0 + 1.3), c = ring(r1 + 0.1, y0 + 1.42), d = ring(r1 + 0.1, y0 + 3.0), e = ring(r1 + 0.36, y0 + 3.06), top = W(cx, y0 + 4.35, cz);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n;
      quad('slategrey', a[i], a[j], b[j], b[i]);                         // tapering louvred base
      quad('white', b[i], b[j], c[j], c[i]);                             // cornice
      quad('pane', c[i], c[j], d[j], d[i]);                              // lantern glazing
      tri('copper', e[i], e[j], top);                                     // copper roof
      quad('white', d[i], d[j], e[j], e[i]);                              // eaves ring
      const m = [(c[i][0] + d[i][0]) / 2, (c[i][1] + d[i][1]) / 2, (c[i][2] + d[i][2]) / 2];
      G('white').box(m[0], m[1], m[2], 1, 0, 0.06, 0.8, 0.06);          // mullions at every corner
    }
    box('black', cx, y0 + 4.9, cz, 0.03, 0.6, 0.03);                    // finial and weathervane
    box('black', cx, y0 + 5.2, cz, 0.5, 0.02, 0.02); box('black', cx, y0 + 5.0, cz, 0.02, 0.02, 0.4);
    box('gold', cx + 0.35, y0 + 5.35, cz, 0.14, 0.09, 0.015);
  }

  // ---------------- chimney stacks ----------------
  for (const [x, z, h] of [[133.6, -766.8, 9.5], [127.0, -775.0, 9.6], [132.6, -790.6, 9.7], [127.0, -798.0, 8.9]]) {
    box('brick', x, (H + h) / 2 - 0.4, z, 0.45, (h - H + 0.8) / 2, 0.4);
    box('stone', x, h - 0.45, z, 0.5, 0.06, 0.45); box('stone', x, h + 0.02, z, 0.55, 0.08, 0.5);
    for (const o of [-0.2, 0.2]) box('pot', x + o, h + 0.4, z, 0.1, 0.3, 0.1);
  }

  // ---------------- east wall dressing: string courses, windows, doors ----------------
  const walls = [[136.2, -763.4, -772.4], [140.2, -772.5, -779.1], [138.0, -779.1, -787.9], [139.3, -787.9, -794.0], [134.7, -794.0, -800.4]];
  for (const [x, za, zb] of walls) {
    const zc = (za + zb) / 2, hz = Math.abs(zb - za) / 2;
    box('stone', x + 0.05, 0.95, zc, 0.07, 0.07, hz); box('stone', x + 0.05, 3.45, zc, 0.07, 0.06, hz);
    box('stone', x + 0.07, H - 0.12, zc, 0.12, 0.1, hz);                    // eaves cornice
    box('stone', x + 0.03, 0.3, zc, 0.06, 0.3, hz);                         // plinth
  }
  const sash = (x, z, w, y0, y1, bars = 3) => {                           // white sash window on the east wall
    box('stone', x + 0.03, y0 - 0.06, z, 0.09, 0.06, w / 2 + 0.12);        // sill
    box('stone', x + 0.03, y1 + 0.08, z, 0.05, 0.09, w / 2 + 0.1);          // lintel
    quad('pane', W(x + 0.05, y0, z - w / 2), W(x + 0.05, y0, z + w / 2), W(x + 0.05, y1, z + w / 2), W(x + 0.05, y1, z - w / 2));
    box('white', x + 0.07, (y0 + y1) / 2, z - w / 2, 0.03, (y1 - y0) / 2, 0.04); box('white', x + 0.07, (y0 + y1) / 2, z + w / 2, 0.03, (y1 - y0) / 2, 0.04);
    box('white', x + 0.07, y0, z, 0.03, 0.04, w / 2); box('white', x + 0.07, y1, z, 0.03, 0.04, w / 2);
    for (let k = 1; k < bars; k++) box('white', x + 0.07, (y0 + y1) / 2, z - w / 2 + w * k / bars, 0.02, (y1 - y0) / 2, 0.02);
    box('white', x + 0.07, y0 + (y1 - y0) * 0.62, z, 0.02, 0.025, w / 2); box('white', x + 0.08, (y0 + y1) / 2, z, 0.02, (y1 - y0) / 2, 0.025);
  };
  const board = (x, z, w, y0, y1) => {                                    // tall white boarded panel (south wing, no glass)
    box('stone', x + 0.03, y0 - 0.06, z, 0.09, 0.06, w / 2 + 0.1); box('stone', x + 0.03, y1 + 0.08, z, 0.05, 0.09, w / 2 + 0.1);
    box('white', x + 0.06, (y0 + y1) / 2, z, 0.04, (y1 - y0) / 2, w / 2);
    for (let k = -1; k <= 1; k++) box('stone', x + 0.1, (y0 + y1) / 2, z + k * w * 0.28, 0.01, (y1 - y0) / 2 - 0.1, 0.012);
  };
  const arch = (x, z, w, y0, y1, door = false) => {                       // round-headed window or doorway with a stone surround
    const r = w / 2, ys = y1 - r, n = 10;
    const outline = (rr, yb, yt, dx, k) => {
      quad(k, W(x + dx, yb, z - rr), W(x + dx, yb, z + rr), W(x + dx, ys, z + rr), W(x + dx, ys, z - rr));
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI; tri(k, W(x + dx, ys, z), W(x + dx, ys + Math.sin(a0) * (yt - ys), z + Math.cos(a0) * rr), W(x + dx, ys + Math.sin(a1) * (yt - ys), z + Math.cos(a1) * rr)); }
    };
    outline(r + 0.2, y0 - 0.12, y1 + 0.2, 0.03, 'stone');
    outline(r, y0, y1, 0.05, door ? 'dark' : 'pane');
    box('stone', x + 0.04, y0 - 0.1, z, 0.1, 0.07, r + 0.28);
    for (const o of [-r, 0, r]) box('white', x + 0.07, (y0 + ys) / 2, z + o, 0.025, (ys - y0) / 2, 0.035);
    box('white', x + 0.07, y0 + (ys - y0) * 0.66, z, 0.025, 0.03, r); box('white', x + 0.07, ys, z, 0.025, 0.03, r);
    for (let i = 1; i < 4; i++) { const a = i / 4 * Math.PI; box('white', x + 0.07, ys + Math.sin(a) * (y1 - ys) * 0.5, z + Math.cos(a) * r * 0.5, 0.02, Math.sin(a) * (y1 - ys) * 0.5, 0.02); }
  };
  // south wing: three tall white panels; central block: arched windows either side of the doorway under the canopy
  for (const z of [-765.4, -767.8, -770.2]) board(136.2, z, 1.15, 0.85, 3.65);
  arch(140.2, -773.8, 1.35, 0.9, 3.2); arch(140.2, -777.8, 1.35, 0.9, 3.2);
  arch(140.2, -775.8, 2.1, 0.0, 3.25, true);
  arch(138.0, -781.8, 1.35, 0.9, 3.2); arch(138.0, -785.6, 1.35, 0.9, 3.2);
  // north wing and extension
  sash(139.3, -789.3, 1.1, 0.95, 3.4, 3); sash(139.3, -792.6, 1.1, 0.95, 3.4, 3);
  sash(134.7, -795.5, 1.0, 0.95, 3.3, 3); sash(134.7, -797.7, 1.0, 0.95, 3.3, 3);
  box('stone', 134.74, 1.2, -799.55, 0.06, 1.25, 0.62); box('dark', 134.78, 1.15, -799.55, 0.03, 1.1, 0.5);   // dark green door, shown dark
  box('black', 136.28, 4.2, -763.7, 0.04, 0.5, 0.05);                      // downpipes
  box('black', 138.05, 3.8, -779.6, 0.04, 0.75, 0.05); box('black', 134.75, 3.8, -794.2, 0.04, 0.7, 0.05);
  // small upper vent windows in the central wall (shown above the canopy)
  sash(138.0, -783.7, 0.7, 3.65, 4.25, 2);

  // ---------------- glazed canopy over the entrance ----------------
  { const za = -772.1, zb = -788.0, zc = (za + zb) / 2, hz = Math.abs(zb - za) / 2, xo = 141.6, yb = 3.35, yw = 3.95;
    quad('lead', W(138.0, yw, za), W(xo, yb + 0.1, za), W(xo, yb + 0.1, zb), W(138.0, yw, zb));        // sloping lead roof
    quad('white', W(138.0, yw - 0.04, za), W(138.0, yw - 0.04, zb), W(xo, yb, zb), W(xo, yb, za));      // white soffit
    box('white', xo, yb + 0.26, zc, 0.04, 0.3, hz);                                                      // valance board
    for (let z = za - 0.2; z > zb + 0.2; z -= 0.34) tri('white', W(xo + 0.01, yb - 0.04, z), W(xo + 0.01, yb - 0.04, z - 0.34), W(xo + 0.01, yb - 0.3, z - 0.17));   // scalloped edge
    for (const z of [-772.5, -775.0, -778.6, -782.4, -787.5]) { box('white', xo - 0.12, yb / 2, z, 0.07, yb / 2, 0.07); col(xo - 0.12, z, 0.14, yb); }
    const leadY = (x) => yw + (yb + 0.1 - yw) * (x - 138) / (xo - 138);
    for (const zg of [-774.7, -780.2, -785.7]) {                                                          // glass gablets
      const hw = 1.7, xa = 138.4, xb = 141.1, b0 = leadY(xa) + 0.02, b1 = leadY(xb) + 0.02, r0 = b0 + 0.95, r1 = b1 + 0.95;
      quad('glass', W(xa, b0, zg - hw), W(xb, b1, zg - hw), W(xb, r1, zg), W(xa, r0, zg));
      quad('glass', W(xa, r0, zg), W(xb, r1, zg), W(xb, b1, zg + hw), W(xa, b0, zg + hw));
      tri('white', W(xb, b1, zg - hw), W(xb, b1, zg + hw), W(xb, r1, zg));
      G('white').box((xa + xb) / 2, g + (r0 + r1) / 2, zg, 1, 0, (xb - xa) / 2, 0.03, 0.03);                   // ridge bar
      for (const s of [-1, 1]) G('white').box((xa + xb) / 2, g + (b0 + b1) / 2, zg + s * hw, 1, 0, (xb - xa) / 2, 0.03, 0.04);   // eaves bars
      box('white', xb, (b1 + r1) / 2 - 0.1, zg, 0.03, 0.04, hw * 0.55);
    }
  }
  // blue bollards across the square (two rows, as in the photos)
  {
    const row = [];
    for (let i = 0; i < 9; i++) { const z = -766 - i * 3.5; row.push([151.4 + (-766 - z) * 0.09, z]); }          // along the kerb of the square
    for (let i = 0; i < 5; i++) { const z = -768 - i * 4.8; row.push([146.4, z]); }                               // inner row
    for (let i = 0; i < 4; i++) row.push([136.4 + i * 3.2, -805.5]);                                              // north edge, by the hoarding
    for (const [x, z] of row) {
      const k = 'bollard', n = 8, r = 0.06;
      for (let a = 0; a < n; a++) { const a0 = a / n * 2 * Math.PI, a1 = (a + 1) / n * 2 * Math.PI; quad(k, W(x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r), W(x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r), W(x + Math.cos(a1) * r, 0.95, z + Math.sin(a1) * r), W(x + Math.cos(a0) * r, 0.95, z + Math.sin(a0) * r)); }
      box('white', x, 0.78, z, 0.066, 0.03, 0.066);
      col(x, z, 0.11, 0.95);
    }
  }
  // flat roof behind the main hip: nothing more is added (OSM footprint stays a plain box there)

  // ---------------- bus shelter on the Hamilton Road kerb (photo: e-ges-station-busshelter) ----------------
  { const cx = 157.3, cz = -781.5, hl = 1.75, hd = 0.8, ph = 2.45;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('navy', cx + sx * hd, ph / 2, cz + sz * hl, 0.05, ph / 2, 0.05);
    box('navy', cx, ph, cz, hd + 0.2, 0.05, hl + 0.2);
    quad('tan', W(cx - hd - 0.3, ph + 0.05, cz - hl - 0.25), W(cx - hd - 0.3, ph + 0.05, cz + hl + 0.25), W(cx, ph + 0.5, cz + hl + 0.25), W(cx, ph + 0.5, cz - hl - 0.25));
    quad('tan', W(cx, ph + 0.5, cz - hl - 0.25), W(cx, ph + 0.5, cz + hl + 0.25), W(cx + hd + 0.3, ph + 0.05, cz + hl + 0.25), W(cx + hd + 0.3, ph + 0.05, cz - hl - 0.25));
    box('gold', cx + hd + 0.3, ph + 0.05, cz, 0.03, 0.05, hl + 0.25); box('gold', cx - hd - 0.3, ph + 0.05, cz, 0.03, 0.05, hl + 0.25);
    quad('glass', W(cx - hd, 0.15, cz - hl), W(cx - hd, 0.15, cz + hl), W(cx - hd, ph - 0.05, cz + hl), W(cx - hd, ph - 0.05, cz - hl));              // back glass
    quad('glass', W(cx - hd, 0.15, cz - hl), W(cx + hd, 0.15, cz - hl), W(cx + hd, ph - 0.05, cz - hl), W(cx - hd, ph - 0.05, cz - hl));           // ends
    quad('glass', W(cx - hd, 0.15, cz + hl), W(cx + hd, 0.15, cz + hl), W(cx + hd, ph - 0.05, cz + hl), W(cx - hd, ph - 0.05, cz + hl));
    quad('glass', W(cx + hd, 0.15, cz - hl), W(cx + hd, 0.15, cz - hl * 0.15), W(cx + hd, ph - 0.05, cz - hl * 0.15), W(cx + hd, ph - 0.05, cz - hl));   // front panel, open gap in the middle
    quad('glass', W(cx + hd, 0.15, cz + hl * 0.55), W(cx + hd, 0.15, cz + hl), W(cx + hd, ph - 0.05, cz + hl), W(cx + hd, ph - 0.05, cz + hl * 0.55));
    box('timber', cx - hd + 0.3, 0.5, cz, 0.22, 0.04, hl - 0.2);                                                                                       // bench
    for (const z of [-1, 1]) box('gold', cx + hd, ph - 0.25, cz + z * (hl - 0.05), 0.02, 0.22, 0.2);            // ornamental brackets
    box('bin', cx - 0.1, 0.55, cz + hl + 0.75, 0.3, 0.55, 0.3);                                                  // blue litter bin
    col(cx, cz, 0.5, ph);
  }
  // ---------------- totem sign at the mouth of the square, with clipped hedges ----------------
  { const x = 154.2, z = -804.2, m = totemMaterial(); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.9), m); p.position.set(x, g + 1.9, z); p.rotation.y = 0; p.castShadow = true; p.name = 'a08:totem'; K.extra.push(p);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.9), m); p2.position.set(x, g + 1.9, z - 0.04); p2.rotation.y = Math.PI; K.extra.push(p2);
    box('slategrey', x, 0.3, z - 0.02, 0.07, 0.3, 0.07);
    box('hedge', 152.3, 0.38, z + 0.2, 1.5, 0.38, 0.5); box('hedge', 156.1, 0.38, z + 0.2, 1.5, 0.38, 0.5);
  }

  // ---------------- blue hoarding round the empty site to the north, and the pine ----------------
  { const pts = [[126.3, -816.8], [162.0, -818.9], [163.6, -832.0], [164.2, -842.0]], hh = 2.4;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      G('hoard').box(mx, g + hh / 2, mz, ux, uz, L / 2, hh / 2, 0.04);
      G('black').box(mx, g + hh + 0.04, mz, ux, uz, L / 2, 0.04, 0.07);                              // cap rail
      const n = Math.max(1, Math.round(L / 2.4)); for (let k = 0; k <= n; k++) { const s = -L / 2 + L * k / n; G('hoardPost').box(mx + ux * s, g + hh / 2, mz + uz * s, ux, uz, 0.07, hh / 2 + 0.05, 0.09); }
      if (i === 0) { // the colourful mural panel on the west part, facing south into the square (+z side)
        const mL = 14.5, a = [x0 + 0.5 * ux, z0 + 0.5 * uz], b = [x0 + (0.5 + mL) * ux, z0 + (0.5 + mL) * uz], nz = 0.07;
        const mm = new THREE.Mesh(new THREE.PlaneGeometry(mL, hh - 0.4), muralMaterial()); mm.position.set((a[0] + b[0]) / 2 + 0.0, g + hh / 2 - 0.05, (a[1] + b[1]) / 2 + nz); mm.rotation.y = -Math.atan2(uz, ux) + 0; mm.name = 'a08:mural'; K.extra.push(mm);
      }
      seg([x0, z0], [x1, z1], hh, 0.1);
    }
    // the big pine: bare lower trunk, flat layered clumps of dark needles
    const px = 160.4, pz = -826.5; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.6, 11.5, 8), mat('trunk', OWN.trunk)); trunk.position.set(px, g + 5.7, pz); trunk.castShadow = true; trunk.name = 'a08:pine'; K.extra.push(trunk);
    const clump = (cx, cy, cz, r, kk) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat(kk, OWN[kk])); m.scale.set(r * 1.5, r * 0.62, r * 1.5); m.position.set(cx, g + cy, cz); m.rotation.y = rnd() * 6; m.castShadow = true; m.name = 'a08:pine'; K.extra.push(m); };
    for (let i = 0; i < 30; i++) { const f = i / 29, ang = rnd() * 6.28, rad = (1 - f * 0.8) * (2.0 + rnd() * 3.6); clump(px + Math.cos(ang) * rad, 6.4 + f * 9.6 + rnd() * 0.8, pz + Math.sin(ang) * rad, 3.1 - f * 1.5 + rnd() * 0.8, i % 2 ? 'needles' : 'needles2'); }
    clump(px + 3.8, 11.0, pz + 0.5, 2.5, 'needles'); clump(px + 6.4, 11.6, pz - 0.4, 2.0, 'needles2'); clump(px - 4.0, 9.5, pz + 1.0, 2.4, 'needles2');   // limbs, one reaching toward the road
    clump(px, 16.3, pz, 1.5, 'needles');
    K.colliders.push({ type: 'circle', x: px, z: pz, r: 0.6, y0: g - 0.3, top: g + 12, kind: 'post' });
  }

  // ---------------- flush own geometry into meshes ----------------
  for (const [k, geo] of Object.entries(own)) { const m = geo.mesh(mat(k, OWN[k])); if (m) { m.name = 'a08:' + k; K.extra.push(m); } }
}

export const FEATURES = { a08Station: station };
