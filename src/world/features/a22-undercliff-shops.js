// Area a22-undercliff-shops: custom shopfronts for the Undercliff Road West row, 49 to 77, drawn from the user's
// Google Street View photographs of Sept 2026 (docs/research/undercliff-road-west-2026). One feature, `shopFront`,
// whose `shop` field picks the unit: fourThree (49), nithin (51-53), grill (55-57), iceCream (59-61), lifesBeach (63),
// rockAround (65), bbq (67), dominos (73) and gmg (77).
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js.
//
// Everything is laid over the street face of the single-storey shop (or the ground floor of Domino's) as flat panels a few
// centimetres proud of the wall: dark or glazed windows with a painted interior behind the glass, doors, mullions, stall risers,
// awnings, the printed food panels, posters and fascia graphics. Positions are fractions of the unit's width read from the photo
// left to right (x 0..1) and heights in metres above the pavement, so they follow the width OpenStreetMap gives each unit.
// The shop-name boards themselves come from world/shopfronts.js (they sit at y 2.84-3.56); lettering that is part of a
// fascia in the photo (Premier, Rock Around the Shop, B.B.Q.) is drawn here over those boards.
// No brand logos are drawn: the food and shop pictures are generic painted illustrations. Sizes are estimates from the photos.

import * as THREE from 'three';
import { Geo } from '../seafront.js';

const SB = 2.84, ST = 3.56; // bottom and top of the shop-name board (world/shopfronts.js, BOARD_H 0.72 under shopTop - 0.04)

// ---- painted textures (canvas) -------------------------------------------------------------------------------------------------------
const cache = new Map();
function cv(key, w, h, draw, alpha = false) {
  const k = key + w + 'x' + h; if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.alpha = alpha; cache.set(k, t); return t;
}
const FONT = '"Helvetica Neue", Arial, sans-serif';
function words(g, txt, x, y, size, col, o = {}) {
  g.save(); g.font = `${o.italic ? 'italic ' : ''}${o.weight || 800} ${size}px ${o.font || FONT}`; g.fillStyle = col; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  if (o.maxW) { const tw = g.measureText(txt).width; if (tw > o.maxW) { size *= o.maxW / tw; g.font = `${o.italic ? 'italic ' : ''}${o.weight || 800} ${size}px ${o.font || FONT}`; } }
  g.fillText(txt, x, y); g.restore();
}
function burger(g, x, y, r) {
  g.fillStyle = '#c9893f'; g.beginPath(); g.ellipse(x, y + r * 0.42, r, r * 0.26, 0, 0, Math.PI * 2); g.fill(); // base bun
  g.fillStyle = '#5a2a18'; g.fillRect(x - r * 0.95, y + r * 0.06, r * 1.9, r * 0.24); // patty
  g.fillStyle = '#f2c230'; g.fillRect(x - r * 0.98, y - r * 0.08, r * 1.96, r * 0.14); // cheese
  g.fillStyle = '#5fa83a'; g.fillRect(x - r * 1.02, y - r * 0.2, r * 2.04, r * 0.13); // lettuce
  g.fillStyle = '#d6372a'; g.fillRect(x - r * 0.9, y - r * 0.3, r * 1.8, r * 0.1); // tomato
  g.fillStyle = '#d9a04d'; g.beginPath(); g.ellipse(x, y - r * 0.3, r, r * 0.62, 0, Math.PI, 0); g.fill(); // top bun
  g.fillStyle = '#f5e7c4'; for (let i = -2; i <= 2; i++) g.fillRect(x + i * r * 0.3, y - r * (0.62 - Math.abs(i) * 0.08), r * 0.1, r * 0.05);
}
function pizza(g, x, y, r) {
  g.fillStyle = '#e0a458'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#d2432b'; g.beginPath(); g.arc(x, y, r * 0.82, 0, 7); g.fill();
  g.fillStyle = '#f0d77a'; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.fill(); g.fillStyle = '#b8321f';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + Math.cos(i * 1.05) * r * 0.42, y + Math.sin(i * 1.05) * r * 0.42, r * 0.11, 0, 7); g.fill(); }
}
function kebab(g, x, y, r) {
  g.fillStyle = '#7a4a2a'; g.beginPath(); g.moveTo(x - r * 0.55, y - r); g.lineTo(x + r * 0.55, y - r); g.lineTo(x + r * 0.32, y + r); g.lineTo(x - r * 0.32, y + r); g.fill();
  g.fillStyle = 'rgba(40,20,10,.45)'; for (let i = 0; i < 6; i++) g.fillRect(x - r * 0.5, y - r + i * r * 0.33, r, r * 0.07); g.fillStyle = '#c9a15a'; g.fillRect(x - r * 0.1, y - r * 1.15, r * 0.2, r * 0.25);
}
function chips(g, x, y, r) {
  g.fillStyle = '#e9c24a'; for (let i = -3; i <= 3; i++) { g.save(); g.translate(x + i * r * 0.2, y - r * 0.3); g.rotate(i * 0.12); g.fillRect(-r * 0.07, -r * 0.5, r * 0.14, r); g.restore(); }
  g.fillStyle = '#c8202c'; g.beginPath(); g.moveTo(x - r * 0.6, y); g.lineTo(x + r * 0.6, y); g.lineTo(x + r * 0.45, y + r * 0.8); g.lineTo(x - r * 0.45, y + r * 0.8); g.fill();
}
function wrap(g, x, y, r) { g.fillStyle = '#d8b878'; g.save(); g.translate(x, y); g.rotate(-0.5); g.fillRect(-r * 0.9, -r * 0.32, r * 1.8, r * 0.64); g.fillStyle = '#8fb24a'; g.fillRect(-r * 0.9, -r * 0.1, r * 0.5, r * 0.2); g.fillStyle = '#b8452d'; g.fillRect(r * 0.4, -r * 0.1, r * 0.5, r * 0.2); g.restore(); }
function plate(g, x, y, r) { g.fillStyle = '#f3f1ec'; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, 7); g.fill(); g.fillStyle = '#efe3c0'; g.beginPath(); g.ellipse(x, y - r * 0.08, r * 0.62, r * 0.3, 0, 0, 7); g.fill(); g.fillStyle = '#9a5a30'; g.beginPath(); g.ellipse(x + r * 0.25, y - r * 0.15, r * 0.32, r * 0.18, 0, 0, 7); g.fill(); }
const ICONS = { burger, pizza, kebab, chips, wrap, plate };
/** A printed food panel: flames-and-dark backdrop with a row of dishes. */
function foodPanel(name, w, h, dishes, bg = ['#3a0c08', '#a8300f']) {
  return cv('food:' + name, w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,150,30,.55)'; for (let i = 0; i < 9; i++) { const x = (i + 0.5) * w / 9; g.beginPath(); g.moveTo(x - w / 22, h); g.quadraticCurveTo(x, h * (0.45 + 0.2 * ((i * 7) % 3) / 3), x + w / 22, h); g.fill(); }
    const n = dishes.length; dishes.forEach((d, i) => ICONS[d](g, (i + 0.5) * w / n, h * 0.52, Math.min(h * 0.34, w / n * 0.42)));
    g.strokeStyle = '#e04a2a'; g.lineWidth = Math.max(3, h * 0.03); g.strokeRect(1.5, 1.5, w - 3, h - 3);
  });
}
function sunburst(name, w, h, c1, c2, n = 28) {
  return cv('sun:' + name, w, h, (g) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2; const cx = w / 2, cy = h / 2, R = Math.hypot(w, h);
    for (let i = 0; i < n; i += 2) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2); g.closePath(); g.fill(); }
  });
}
function interior(kind) {
  return cv('int:' + kind, 128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    const sets = { grill: ['#2a2420', '#14100e'], shop: ['#3a352e', '#1a1816'], dark: ['#1d1e22', '#0c0c0e'], cafe: ['#4a3a30', '#221a16'], china: ['#2a1c18', '#120c0a'], chippy: ['#c9c2a8', '#6c6858'], pizza: ['#3b2f26', '#1a1411'] };
    const [a, b] = sets[kind] || sets.dark; gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (kind === 'grill' || kind === 'cafe' || kind === 'pizza') { // tables and red stools
      g.fillStyle = 'rgba(255,230,190,.22)'; g.fillRect(0, h * 0.06, w, h * 0.05);
      g.fillStyle = '#7a4a2f'; g.fillRect(0, h * 0.58, w, h * 0.06);
      for (let i = 0; i < 4; i++) { const x = (i + 0.5) * w / 4; g.fillStyle = '#c0281f'; g.fillRect(x - 9, h * 0.66, 18, h * 0.1); g.fillStyle = '#1b1b1d'; g.fillRect(x - 1.5, h * 0.76, 3, h * 0.2); g.fillRect(x - 8, h * 0.94, 16, 3); }
    } else if (kind === 'shop') {
      g.fillStyle = 'rgba(255,240,200,.28)'; for (let i = 0; i < 3; i++) g.fillRect(6, h * (0.3 + i * 0.22), w - 12, 3); g.fillStyle = '#c95a3a'; for (let i = 0; i < 10; i++) g.fillRect(8 + i * 12, h * 0.2 + (i % 3) * h * 0.22, 7, 10);
    } else if (kind === 'china') {
      g.fillStyle = '#6b4a30'; for (let i = 0; i < 4; i++) g.fillRect(4, h * (0.2 + i * 0.2), w - 8, 3);
      for (let i = 0; i < 30; i++) { g.fillStyle = ['#f0ece2', '#6fb3b0', '#d8a23a', '#a8c6d8'][i % 4]; g.fillRect(6 + (i * 13) % 112, h * (0.1 + Math.floor(i / 8) * 0.2) + (i % 3), 8, 12); }
    } else if (kind === 'chippy') {
      g.fillStyle = '#7a7a70'; g.fillRect(0, h * 0.55, w, h * 0.08); g.fillStyle = '#e8e4d6'; g.fillRect(w * 0.1, h * 0.35, w * 0.8, h * 0.2); g.fillStyle = '#e9c24a'; for (let i = 0; i < 8; i++) g.fillRect(w * 0.14 + i * 11, h * 0.4, 7, 10);
    }
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.45, 0); g.lineTo(w * 0.7, 0); g.lineTo(w * 0.15, h); g.fill(); // reflection sheen
  });
}

// ---- the kit: flat panels positioned by view fractions -------------------------------------------------------------------------------
function kit(K) {
  const e = K.e, L = e.L, g = K.g;
  const rx = e.nz, rz = -e.nx; // the viewer's right, standing outside the facade
  const flip = e.ux * rx + e.uz * rz < 0; // true when the edge runs from the viewer's right to left
  const S = (x) => (flip ? 1 - x : x) * L;
  const geos = new Map();
  const G = (key) => { if (!geos.has(key)) geos.set(key, new Geo()); return geos.get(key); };
  const P = (x, d, y) => K.P(S(x), d, y);
  const rect = (col, x0, x1, y0, y1, d) => G('flat|' + col).quad(P(x0, d, y0), P(x1, d, y0), P(x1, d, y1), P(x0, d, y1));
  const tex = (t, x0, x1, y0, y1, d) => { const kk = 'tex|' + (t.userData.alpha ? 'a|' : '') + (t.id); geos.has(kk) || (G(kk).tex = t); G(kk).quad(P(x0, d, y0), P(x1, d, y0), P(x1, d, y1), P(x0, d, y1)); };
  const glass = (kind, x0, x1, y0, y1, d = 0.06) => tex(interior(kind), x0, x1, y0, y1, d);
  const box = (col, x0, x1, y0, y1, d0, d1) => { const p = K.P(S((x0 + x1) / 2), (d0 + d1) / 2, (y0 + y1) / 2); G('flat|' + col).box(p[0], p[1], p[2], e.ux, e.uz, Math.abs(x1 - x0) * L / 2, (y1 - y0) / 2, (d1 - d0) / 2); };
  const frame = (col, x0, x1, y0, y1, t = 0.06, d = 0.1) => { // four bars (t metres thick) round an opening
    const tx = t / L; box(col, x0, x1, y0, y0 + t, d - 0.03, d + 0.03); box(col, x0, x1, y1 - t, y1, d - 0.03, d + 0.03); box(col, x0, x0 + tx, y0, y1, d - 0.03, d + 0.03); box(col, x1 - tx, x1, y0, y1, d - 0.03, d + 0.03);
  };
  const mull = (col, x, y0, y1, t = 0.05, d = 0.1) => box(col, x - t / L / 2, x + t / L / 2, y0, y1, d - 0.03, d + 0.03);
  const transom = (col, x0, x1, y, t = 0.05, d = 0.1) => box(col, x0, x1, y - t / 2, y + t / 2, d - 0.03, d + 0.03);
  const slope = (t, x0, x1, yTop, dTop, yBot, dBot) => { // a sloping panel (awning)
    const kk = 'tex|' + t.id; geos.has(kk) || (G(kk).tex = t); G(kk).quad(P(x0, dBot, yBot), P(x1, dBot, yBot), P(x1, dTop, yTop), P(x0, dTop, yTop));
  };
  const flush = () => {
    for (const [key, geo] of geos) {
      const [kind, a] = key.split('|'); let mat;
      if (kind === 'flat') mat = new THREE.MeshStandardMaterial({ color: a, roughness: 0.7, side: THREE.DoubleSide });
      else mat = new THREE.MeshStandardMaterial({ map: geo.tex, roughness: 0.55, metalness: 0.02, side: THREE.DoubleSide, transparent: !!geo.tex.userData.alpha, alphaTest: geo.tex.userData.alpha ? 0.35 : 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      if (kind === 'flat') { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1; }
      const me = geo.mesh(mat); if (me) { me.name = 'frontage:a22:' + key; K.extra.push(me); }
    }
  };
  return { L, front: e.front, rect, tex, glass, box, frame, mull, transom, slope, flush, P, S };
}

// ---- small canvas texts and pictures ----------------------------------------------------------------------------------------------------
const label = (name, w, h, bg, fg, txt, o = {}) => cv('lab:' + name, w, h, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } words(g, txt, w / 2, h / 2 + 1, o.size || h * 0.6, fg, { maxW: w - 16, weight: o.weight, italic: o.italic, font: o.font }); }, !bg);
const label2 = (name, w, h, bg, fg, a, b, o = {}) => cv('lab2:' + name, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); words(g, a, w / 2, h * 0.32, h * 0.3, fg, { maxW: w - 16, weight: o.weight }); words(g, b, w / 2, h * 0.7, h * 0.3, fg, { maxW: w - 16, weight: o.weight }); });
const poster = (name, w, h, bg, lines, fg = '#fff') => cv('post:' + name, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(w / 2, h * 0.38, w * 0.28, 0, 7); g.fill(); lines.forEach((t, i) => words(g, t, w / 2, h * (0.7 + i * 0.14), h * 0.11, fg, { maxW: w - 8 })); });

// ---- the units ----------------------------------------------------------------------------------------------------------------------------
const NAVY = '#1b2140', STEEL = '#2a2d33', WHITE = '#f4f2ee', BLACK = '#17181b';

const UNITS = {
  // 55-57: navy-black steel frame, recessed glass door at the left, a window with menus and a red burger panel, a big glazed bay at the right
  grill(k) {
    k.rect('#20253d', 0, 1, 0, SB, 0.05);
    k.tex(foodPanel('strip', 64, 256, ['burger', 'wrap', 'plate', 'kebab', 'burger', 'chips'].slice(0, 3)), 0.004, 0.07, 0.35, 2.4, 0.09); // narrow printed strip down the left pier
    k.glass('dark', 0.09, 0.36, 0.06, 2.4); k.frame(STEEL, 0.09, 0.36, 0.06, 2.4, 0.07); k.mull(STEEL, 0.225, 0.06, 2.4, 0.06); k.box('#b8bcc4', 0.31, 0.325, 1.0, 1.1, 0.07, 0.13); // door and handle
    k.glass('grill', 0.39, 0.625, 0.3, 2.4); k.frame(STEEL, 0.39, 0.625, 0.06, 2.4, 0.07);
    k.tex(foodPanel('hdr', 256, 96, ['burger', 'chips', 'burger']), 0.39, 0.625, 1.75, 2.4, 0.09);
    const menu = cv('menu', 64, 96, (g, w, h) => { g.fillStyle = '#f3ecd9'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8322a'; g.fillRect(4, 4, w - 8, 10); g.fillStyle = '#6a6458'; for (let y = 22; y < h - 6; y += 7) g.fillRect(6, y, w - 20 - (y * 7) % 14, 2); });
    k.tex(menu, 0.43, 0.52, 0.95, 1.65, 0.09); k.tex(menu, 0.53, 0.60, 0.95, 1.65, 0.09); // menus taped to the glass
    k.tex(label2('sb', 128, 64, '#c3322a', '#fff', 'Smash Burger', 'Charcoal Grilled Meats', {}), 0.39, 0.625, 0.3, 0.95, 0.09); // red lower panel
    k.tex(foodPanel('strip2', 64, 256, ['burger', 'wrap', 'plate']), 0.63, 0.69, 0.35, 2.4, 0.09);
    k.glass('grill', 0.70, 0.985, 0.12, 2.42); k.frame(STEEL, 0.70, 0.985, 0.06, 2.42, 0.07); for (const x of [0.795, 0.89]) k.mull(STEEL, x, 0.06, 2.42, 0.07); k.transom(STEEL, 0.70, 0.985, 1.1, 0.05); // three tall panes
    k.rect('#14161f', 0.07, 0.99, 2.42, SB, 0.07); k.tex(label2('str', 256, 40, NAVY, '#fff', 'Burgers  •  Rice  •  Kebabs  •  Pizzas', ''), 0.15, 0.93, 2.46, 2.82, 0.1); // sub-fascia strip
    k.tex(foodPanel('big1', 128, 64, ['kebab', 'burger']), 0.015, 0.2, SB + 0.04, ST - 0.04, 0.16); k.tex(foodPanel('big2', 128, 64, ['burger', 'wrap']), 0.8, 0.985, SB + 0.04, ST - 0.04, 0.16); // photo panels at the ends of the big fascia
  },
  // 49: painted blue front, a shop window, a glazed blue door on an orange threshold, a big window; dark brick stall riser
  fourThree(k) {
    k.rect('#1c2f8e', 0, 1, 0, 3.9, 0.04);
    k.rect('#3a2a26', 0, 1, 0, 0.55, 0.05); // brick stall riser
    k.glass('shop', 0.03, 0.30, 0.6, 2.5); k.frame('#16256f', 0.03, 0.30, 0.55, 2.55, 0.07); k.mull('#16256f', 0.165, 0.55, 2.55, 0.05);
    k.glass('dark', 0.34, 0.50, 0.15, 2.5); k.frame('#16256f', 0.34, 0.50, 0.05, 2.55, 0.08); k.mull('#16256f', 0.42, 0.05, 2.55, 0.06); k.transom('#16256f', 0.34, 0.50, 1.0, 0.06); k.box('#d6d9e0', 0.37, 0.39, 1.0, 1.15, 0.07, 0.14);
    k.rect('#d8672f', 0.30, 0.54, 0.0, 0.0, 0.1); k.box('#d8672f', 0.30, 0.54, 0.0, 0.05, 0.06, 0.55); // orange tile step
    k.glass('shop', 0.55, 0.97, 0.6, 2.5); k.frame('#16256f', 0.55, 0.97, 0.55, 2.55, 0.07); for (const x of [0.69, 0.83]) k.mull('#16256f', x, 0.55, 2.55, 0.05);
    k.box('#16256f', 0, 1, 2.55, 2.84, 0.04, 0.14); // header under the board
    const gd = Math.max(0.5, Math.min(1.5, k.front - 0.2)); k.box('#7d7f82', 0.02, 0.34, 0, 0.62, gd - 0.55, gd); k.box('#6f7174', 0.36, 0.46, 0, 0.45, gd - 0.45, gd);
    const gab = cv('gab', 128, 64, (g, w, h) => { g.fillStyle = '#8a8579'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = ['#a39c8c', '#6f6a60', '#b8b0a0', '#5c5850'][i % 4]; g.beginPath(); g.ellipse((i * 37) % w, (i * 23) % h, 7, 5, i, 0, 7); g.fill(); } g.strokeStyle = '#3a3a3a'; g.lineWidth = 1.5; for (let x = 0; x < w; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    k.tex(gab, 0.02, 0.34, 0.0, 0.62, gd + 0.01); k.tex(gab, 0.36, 0.46, 0.0, 0.45, gd + 0.01); // gabion baskets by the kerb
  },
  // 51-53: grey render, a green awning over the windows, black glazing with yellow posters, a maroon pier with a drinks panel, yellow-maroon-yellow fascia
  nithin(k) {
    k.rect('#e9e6de', 0, 1, 3.56, 3.95, 0.05); for (let y = 3.62; y < 3.95; y += 0.1) k.rect('#cfccc4', 0, 1, y, y + 0.015, 0.06); // white cladding above the board
    k.tex(label('nith1', 256, 64, '#f2c62e', '#2a2a2a', 'Nithin Convenience Store', { size: 36 }), 0, 0.37, SB, ST, 0.17);
    k.rect('#6a1c30', 0.37, 0.665, SB, ST, 0.17); k.tex(label('prem', 128, 64, null, '#fff', 'Premier', { size: 46, italic: true }), 0.37, 0.665, SB + 0.05, ST - 0.02, 0.18);
    k.tex(label2('open', 128, 64, '#f2c62e', '#2a2a2a', 'OPEN EVERY DAY', '7am-11pm'), 0.665, 1, SB, ST, 0.17);
    k.rect('#d9d6cf', 0, 1, 0, 2.5, 0.04);
    k.glass('dark', 0.04, 0.40, 0.12, 2.45); k.frame('#9a9da2', 0.04, 0.40, 0.1, 2.5, 0.07); k.mull('#9a9da2', 0.22, 0.1, 2.5, 0.06);
    for (const x of [0.12, 0.27]) k.tex(poster('pr' + x, 64, 96, '#f2b51f', ['MEGA', 'DEAL']), x, x + 0.1, 1.15, 2.05, 0.09);
    k.tex(label('cof', 128, 40, null, '#fff', 'COFFEE TO GO', { size: 22 }), 0.06, 0.2, 0.7, 0.95, 0.09); k.tex(label('san', 128, 40, null, '#fff', 'FRESH SANDWICHES', { size: 20 }), 0.23, 0.38, 0.7, 0.95, 0.09);
    k.rect('#c9c7c0', 0.40, 0.45, 0, 2.5, 0.06); // pier
    k.glass('shop', 0.45, 0.66, 0.15, 2.45); k.frame('#9a9da2', 0.45, 0.66, 0.1, 2.5, 0.07); k.rect('#2f6fb0', 0.5, 0.58, 1.3, 1.5, 0.09); // chilled-drinks window
    k.tex(label2('chill', 64, 96, '#58203a', '#fff', 'CHILLED', 'BEER & WINE'), 0.69, 0.88, 0.3, 2.35, 0.08); k.rect('#e8e6de', 0.73, 0.78, 0.5, 0.75, 0.1); k.rect('#4a8fc4', 0.79, 0.84, 0.5, 0.75, 0.1);
    k.slope(label('awn', 512, 48, '#2e5a3e', '#e9eee4', 'FRESH VEGETABLES  •  SCRATCH CARDS  •  GROCERY', { size: 24 }), 0.03, 0.68, SB - 0.02, 0.08, SB - 0.32, 0.42); // green awning
    k.box('#2a2a2a', 0.9, 0.93, 0, 0.95, 1.2, 1.28); // A-frame board on the pavement
  },
  // 59-61: white frame, a glazed transom row, tall panes either side of a double door, cow-print panel at the bottom left, orange sign with a roundel; banner on stanchions
  iceCream(k) {
    k.rect(WHITE, 0, 1, 0, SB, 0.04);
    k.glass('cafe', 0.03, 0.97, 2.1, 2.78); k.frame(WHITE, 0.02, 0.98, 2.05, 2.82, 0.06); for (const x of [0.2, 0.37, 0.5, 0.63, 0.8]) k.mull(WHITE, x, 2.05, 2.82, 0.05);
    k.glass('cafe', 0.03, 0.97, 0.1, 2.05); k.frame(WHITE, 0.02, 0.98, 0.05, 2.07, 0.08); for (const x of [0.17, 0.33, 0.5, 0.67, 0.83]) k.mull(WHITE, x, 0.05, 2.07, 0.07);
    k.glass('dark', 0.34, 0.49, 0.1, 2.0); k.box('#c9ced3', 0.455, 0.47, 0.95, 1.1, 0.07, 0.14); k.box('#c9ced3', 0.51, 0.525, 0.95, 1.1, 0.07, 0.14); // double door handles
    k.tex(cv('cow', 64, 128, (g, w, h) => { g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1c1c'; for (const [x, y, r] of [[14, 30, 14], [44, 60, 16], [20, 96, 13], [52, 112, 9], [38, 12, 8]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0.5, 0, 7); g.fill(); } }), 0.03, 0.14, 0.1, 1.2, 0.09);
    k.tex(cv('roundel', 128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = '#e8622c'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 36, 0, 7); g.fill(); g.fillStyle = '#1c1c1c'; for (const [x, y, r] of [[52, 56, 10], [74, 70, 11], [58, 78, 7]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0.4, 0, 7); g.fill(); } g.fillStyle = '#e8c8a8'; g.beginPath(); g.ellipse(64, 86, 12, 7, 0, 0, 7); g.fill(); }, true), 0.015, 0.115, SB - 0.1, ST + 0.14, 0.17);
    k.tex(label('bl', 128, 64, '#17301f', '#f4f1ea', 'BRUNCH · LUNCH · CREAM TEA', { size: 14 }), 0.62, 0.86, 0.1, 0.95, 1.0); k.box(BLACK, 0.61, 0.62, 0, 1.0, 0.95, 1.05); k.box(BLACK, 0.86, 0.87, 0, 1.0, 0.95, 1.05); // banner on its stanchions
  },
  // 63: grey frontage under the timber-look sign, grey panelled door, a roller shutter, a window of beach toys; surfboard, bucket and beach ball painted on the sign
  lifesBeach(k) {
    k.rect('#8c949c', 0, 1, 0, SB, 0.04);
    k.rect('#6f777f', 0.02, 0.98, 1.4, 2.55, 0.06); for (let y = 1.42; y < 2.55; y += 0.075) k.rect('#5c636a', 0.02, 0.98, y, y + 0.018, 0.07); // roller shutter box
    k.rect('#6f777f', 0, 1, 2.55, SB, 0.05);
    k.rect('#9aa2aa', 0.03, 0.22, 0.05, 1.35, 0.07); k.frame('#767e86', 0.03, 0.22, 0.05, 1.35, 0.05); k.rect('#858d95', 0.06, 0.19, 0.2, 1.2, 0.09); k.box('#d9dcdf', 0.19, 0.205, 0.65, 0.78, 0.07, 0.13); // grey panelled door
    k.tex(cv('toys', 128, 64, (g, w, h) => { g.fillStyle = '#272a30'; g.fillRect(0, 0, w, h); const cols = ['#e86f2c', '#f3c53a', '#2c82d8', '#d8402c', '#4aa86a', '#f0f0f0']; for (let i = 0; i < 22; i++) { g.fillStyle = cols[i % 6]; g.beginPath(); g.arc((i * 29) % 122 + 6, 12 + ((i * 17) % 44), 6 + (i % 3) * 2, 0, 7); g.fill(); } g.fillStyle = '#2a6fb8'; g.fillRect(40, 8, 36, 40); g.fillStyle = '#e9c74a'; g.fillRect(44, 14, 28, 6); }), 0.26, 0.97, 0.3, 1.32, 0.08);
    k.frame('#767e86', 0.25, 0.98, 0.25, 1.36, 0.06); k.box('#9aa2aa', 0.24, 0.99, 0.22, 0.3, 0.06, 0.2); // sill
    k.tex(cv('decor', 512, 64, (g, w, h) => { // beach graphics painted on the sign: surfboard, crab, bucket and spade, gull, ball
      g.save(); g.translate(22, 32); g.rotate(-0.35); g.fillStyle = '#2f9f9a'; g.beginPath(); g.ellipse(0, 0, 26, 11, 0, 0, 7); g.fill(); g.fillStyle = '#e9c74a'; g.fillRect(-26, -3, 52, 6); g.fillStyle = '#7a3a1a'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#d8402c'; g.beginPath(); g.ellipse(70, 50, 11, 7, 0, 0, 7); g.fill(); g.fillRect(56, 42, 4, 4); g.fillRect(80, 42, 4, 4);
      g.fillStyle = '#3a86d8'; g.beginPath(); g.moveTo(396, 40); g.lineTo(424, 40); g.lineTo(420, 62); g.lineTo(400, 62); g.fill(); g.fillStyle = '#e9c74a'; g.fillRect(396, 34, 28, 6);
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(446, 20, 12, 6, -0.2, 0, 7); g.fill(); g.fillStyle = '#777'; g.fillRect(438, 14, 10, 3);
      g.fillStyle = '#f3d23a'; g.beginPath(); g.arc(482, 32, 20, 0, 7); g.fill(); g.fillStyle = '#2c82d8'; g.beginPath(); g.moveTo(482, 32); g.arc(482, 32, 20, 0, 1.3); g.fill(); g.fillStyle = '#e8502c'; g.beginPath(); g.moveTo(482, 32); g.arc(482, 32, 20, 2.6, 3.9); g.fill();
    }, true), 0.05, 0.95, SB, ST, 0.16);
  },
  // 65: all pink; sunburst piers and a big sunburst fascia with the shop name in a magenta panel; double glass doors with pink stickers
  rockAround(k) {
    k.rect('#e9569f', 0, 1, 0, 3.95, 0.04);
    k.tex(sunburst('pierL', 64, 256, '#e9569f', '#fbe3ef'), 0, 0.12, 0.2, 2.45, 0.08); k.tex(sunburst('pierR', 64, 256, '#e9569f', '#fbe3ef'), 0.88, 1, 0.2, 2.45, 0.08);
    for (const [a, b] of [[0.14, 0.47], [0.53, 0.86]]) { k.glass('shop', a, b, 0.2, 2.4); k.frame('#ff7fbd', a, b, 0.12, 2.45, 0.07); k.mull('#ff7fbd', (a + b) / 2, 0.12, 2.45, 0.06); }
    k.tex(cv('stk', 64, 64, (g) => { g.fillStyle = '#e8368a'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); words(g, 'ROCK', 32, 32, 14, '#fff'); }, true), 0.19, 0.3, 1.2, 1.7, 0.09);
    k.tex(cv('stk', 64, 64, (g) => { g.fillStyle = '#e8368a'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); words(g, 'ROCK', 32, 32, 14, '#fff'); }, true), 0.7, 0.81, 1.2, 1.7, 0.09);
    k.tex(label('mst', 512, 40, '#e8368a', '#fff', 'MILKSHAKES    TEA & COFFEE    ICE CREAM', { size: 24 }), 0, 1, 2.5, SB, 0.1);
    k.tex(cv('fasc', 512, 128, (g, w, h) => { g.drawImage(sunburst('fasc', w, h, '#f06aa8', '#fbd6e6', 36).image, 0, 0); g.fillStyle = '#d0267f'; g.beginPath(); g.roundRect(w * 0.18, 8, w * 0.64, h - 16, 16); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.roundRect(w * 0.18 + 6, 14, w * 0.64 - 12, h - 28, 12); g.stroke(); words(g, 'ROCK AROUND', w / 2, h * 0.36, h * 0.28, '#fff', { maxW: w * 0.56 }); words(g, 'THE SHOP', w / 2, h * 0.7, h * 0.28, '#fff', { maxW: w * 0.56 });
      for (const [t, x, y] of [['Rock', 0.07, 0.2], ['Fudge', 0.08, 0.5], ['Ice Cream', 0.09, 0.8]]) words(g, t, w * x, h * y, 18, '#fff', { maxW: 70 }); for (const [t, x, y] of [['Candy Floss', 0.92, 0.2], ['Lollipops', 0.92, 0.5], ['Donuts', 0.92, 0.8]]) words(g, t, w * x, h * y, 18, '#fff', { maxW: 70 }); }), 0, 1, SB, 3.9, 0.17);
  },
  // 67: cream front, a two-tier blue fascia with red lettering above the board, black-framed shopfront with a glass counter and an open doorway
  bbq(k) {
    k.rect('#e2dcc8', 0, 1, 0, 3.95, 0.04); k.rect('#3f9a58', 0, 0.025, 0, 3.95, 0.07);
    k.rect('#1a1b1e', 0.03, 0.97, 0.12, 2.48, 0.06);
    k.glass('chippy', 0.05, 0.44, 0.45, 2.42); k.frame(BLACK, 0.04, 0.45, 0.4, 2.46, 0.07); k.rect(BLACK, 0.04, 0.45, 0, 0.45, 0.08);
    k.glass('dark', 0.48, 0.70, 0.12, 2.42); k.frame(BLACK, 0.47, 0.71, 0.1, 2.48, 0.07); // open doorway
    k.glass('chippy', 0.73, 0.96, 0.45, 2.42); k.frame(BLACK, 0.72, 0.97, 0.4, 2.46, 0.07); k.rect(BLACK, 0.72, 0.97, 0, 0.45, 0.08);
    k.tex(cv('tier2', 512, 80, (g, w, h) => { g.fillStyle = '#2c78d0'; g.fillRect(0, 0, w, h); for (const x of [0.07, 0.93]) { g.fillStyle = '#123a78'; g.beginPath(); g.ellipse(w * x, h / 2, 32, 15, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(w * x + (x < 0.5 ? -30 : 30), h / 2); g.lineTo(w * x + (x < 0.5 ? -46 : 46), h / 2 - 12); g.lineTo(w * x + (x < 0.5 ? -46 : 46), h / 2 + 12); g.fill(); } words(g, 'FISH & CHIPS', w / 2, h * 0.52, h * 0.62, '#fff', { maxW: w * 0.7 }); }), 0, 1, 2.5, 3.2, 0.19);
    k.tex(cv('tier1', 512, 56, (g, w, h) => { g.fillStyle = '#1d4fa8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); words(g, 'B.B.Q. FISH & CHIPS', w / 2, h * 0.53, h * 0.66, '#e32a24', { maxW: w * 0.86, weight: 900 }); }), 0, 1, 3.2, 3.9, 0.19);
  },
  // 73: Domino's. A buff-brick two-storey block: the shop at the left, a white arched entrance, a second grey-fascia unit at the right
  dominos(k) {
    k.rect('#f1efe9', 0.31, 0.53, 0, ST + 0.05, 0.05); // white painted piers either side of the arch
    k.rect('#14120f', 0.37, 0.5, 0, 2.55, 0.08); k.tex(cv('arch', 64, 64, (g) => { g.fillStyle = '#14120f'; g.beginPath(); g.arc(32, 64, 32, Math.PI, 0); g.fill(); g.fillRect(0, 64, 64, 1); }, true), 0.37, 0.5, 2.55, 3.35, 0.08); // arched opening
    k.glass('dark', 0.39, 0.48, 0.1, 2.4); k.frame('#2a2b2e', 0.39, 0.48, 0.1, 2.4, 0.05); k.mull('#2a2b2e', 0.435, 0.1, 2.4, 0.04); k.rect('#9a5a46', 0.31, 0.53, 0, 0.0, 0.1); // paved entrance
    k.glass('pizza', 0.04, 0.30, 0.2, 2.78); k.frame('#e9e7e1', 0.035, 0.305, 0.12, 2.82, 0.07); k.mull('#e9e7e1', 0.17, 0.12, 2.82, 0.05); k.rect('#e9e7e1', 0.02, 0.32, 0, 0.14, 0.07);
    k.rect('#3b4146', 0.53, 0.89, SB, ST + 0.04, 0.08); // blank grey fascia of the second unit
    k.glass('cafe', 0.56, 0.87, 0.15, 2.78); k.frame('#2e3338', 0.55, 0.88, 0.1, 2.82, 0.07); k.mull('#2e3338', 0.715, 0.1, 2.82, 0.07); k.transom('#2e3338', 0.55, 0.88, 1.9, 0.04);
    k.rect('#f1efe9', 0.53, 0.9, 0, 0.14, 0.07); k.rect('#f1efe9', 0.53, 0.55, 0, 2.84, 0.07); k.rect('#f1efe9', 0.88, 0.9, 0, 2.84, 0.07); // white surround and cill
    k.tex(poster('drv', 64, 96, '#1f4fa0', ['DRIVERS', 'WANTED']), 0.62, 0.7, 1.3, 2.3, 0.09);
  },
  // 77: GMG Collectables: red frame, black brick stall riser, a big window of china, a red glazed door, a narrow side window
  gmg(k) {
    k.rect('#b4222c', 0, 1, 0, SB, 0.04); k.rect('#262021', 0.02, 0.98, 0, 0.55, 0.06);
    k.glass('china', 0.05, 0.60, 0.6, 2.5); k.frame('#8f1820', 0.04, 0.61, 0.55, 2.55, 0.08); k.mull('#8f1820', 0.325, 0.55, 2.55, 0.05);
    k.rect('#8f1820', 0.62, 0.76, 0, 2.55, 0.06); k.glass('dark', 0.65, 0.73, 0.2, 2.3); k.frame('#8f1820', 0.64, 0.74, 0.15, 2.4, 0.06); k.box('#e8c24a', 0.665, 0.675, 1.0, 1.15, 0.07, 0.13);
    k.glass('china', 0.79, 0.96, 0.6, 2.5); k.frame('#8f1820', 0.78, 0.97, 0.55, 2.55, 0.07);
    k.rect('#b4222c', 0, 1, ST, 3.95, 0.05);
  },
};

export const FEATURES = {
  shopFront(K, it) {
    const make = UNITS[it.shop]; if (!make) return;
    const k = kit(K); make(k); k.flush();
  },
};
