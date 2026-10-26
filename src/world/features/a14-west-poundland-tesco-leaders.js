// Area a14-west-poundland-tesco-leaders: the 1960s Poundland / Tesco Express block and the Edwardian pair and
// Specsavers building between them, built from the user's Street View photos (docs/research/hamilton-road-streetview).
// Dimensions are estimates scaled from the photos (a door and the storey heights for scale), not surveyed.
// Every feature lays its own frames with ctx.sideFrame({ at, from }): the footprint edge whose middle is nearest `at`,
// with s running from the end nearest `from` (so s increases the same way whichever way OSM wound the ring).
// All meshes use this file's own materials and go into K.extra.

import * as THREE from 'three';
import { Geo } from '../seafront.js';

const COL = {
  creamLt: 0xe3dcc6, cream: 0xd2c8ac, white: 0xf2f0ea, dark: 0x1b1d21, black: 0x111214, glass: 0x93a9b6, glassDk: 0x56697a,
  teal: 0x0a88a6, tealDk: 0x07687d, blue: 0x1d44c2, red: 0xa8302a, yellow: 0xe9b92a, green: 0x17a05a, navy: 0x20297a, brown: 0x4c2c1c,
  granite: 0x8f8d88, brickDk: 0x5c2a22, orange: 0xb8683a, leaf: 0x5a7440, stone: 0xc9bfa5, interior: 0xdfe3e2, steel: 0xaab0b4,
};
let MATS = null;
function mats() {
  if (MATS) return MATS;
  MATS = {};
  for (const [k, c] of Object.entries(COL)) {
    const glassy = k === 'glass' || k === 'glassDk';
    MATS[k] = new THREE.MeshStandardMaterial({ color: c, roughness: glassy ? 0.12 : 0.75, metalness: glassy ? 0.3 : 0.02, side: THREE.DoubleSide });
  }
  return MATS;
}

/** Own geometry kit over a frame F from ctx.sideFrame: s along the wall, d out, y up. */
function kit(F) {
  const geos = {}, G = (m) => geos[m] || (geos[m] = new Geo());
  const k = {
    F, P: F.P,
    box: (m, s, d, y, hs, hd, hy) => { const p = F.P(s, d, y); G(m).box(p[0], p[1], p[2], F.e.ux, F.e.uz, hs, hy, hd); },
    rect: (m, s0, s1, d, y0, y1) => G(m).quad(F.P(s0, d, y0), F.P(s1, d, y0), F.P(s1, d, y1), F.P(s0, d, y1)),
    quad: (m, a, b, c, d) => G(m).quad(a, b, c, d),
    tri: (m, s0, s1, sa, d, y0, ya) => G(m).tri(F.P(s0, d, y0), F.P(s1, d, y0), F.P(sa, d, ya)),
    /** half disc (arched window head): centre s, radius r, springing y */
    arch: (m, s, r, d, y) => { const n = 8; for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; G(m).tri(F.P(s, d, y), F.P(s + Math.cos(a0) * r, d, y + Math.sin(a0) * r), F.P(s + Math.cos(a1) * r, d, y + Math.sin(a1) * r)); } },
    tex: (tex, s0, s1, d, y0, y1) => texQuad(k, tex, s0, s1, d, y0, y1),
    flush() { const M = mats(); for (const [m, g] of Object.entries(geos)) { const me = g.mesh(M[m]); if (me) { me.name = 'frontage:a14:' + m; F.extra.push(me); } } },
  };
  return k;
}

const texCache = new Map();
function canvasTex(key, w, h, paint) {
  if (typeof document === 'undefined') return null;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}
function texQuad(k, tex, s0, s1, d, y0, y1) {
  if (!tex) return;
  const e = k.F.e, flip = (e.ux * e.nz - e.uz * e.nx) > 0 ? 0 : 1, [u0, u1] = flip ? [1, 0] : [0, 1];
  const a = k.P(s0, d, y0), b = k.P(s1, d, y0), c = k.P(s1, d, y1), dd = k.P(s0, d, y1), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...dd], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  me.name = 'frontage:a14:tex'; k.F.extra.push(me);
}

// ---- textures (plain canvases; lettering is generic shop-window vinyl, no logos) ----
const posterTex = () => canvasTex('pound-poster', 256, 340, (x, w, h) => { // teal vinyl, "Amazing Value Everyday!"
  x.fillStyle = '#0a88a6'; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.fillStyle = '#ffffff';
  x.font = '600 34px Arial, sans-serif'; x.fillText('Amazing', w / 2, 80);
  x.fillStyle = '#f2c230'; x.font = '800 66px Arial, sans-serif'; x.fillText('Value', w / 2, 160);
  x.fillStyle = '#ffffff'; x.font = '600 38px Arial, sans-serif'; x.fillText('Everyday!', w / 2, 215);
});
const pound1Tex = () => canvasTex('pound-1', 256, 340, (x, w, h) => { // teal vinyl with the red GBP 1 disc
  x.fillStyle = '#0a88a6'; x.fillRect(0, 0, w, h); x.fillStyle = '#d6322a'; x.beginPath(); x.arc(w / 2, h / 2, 88, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.font = '800 96px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('£1', w / 2, h / 2 + 6);
});
const sprinkleTex = () => canvasTex('sprinkles', 512, 128, (x, w, h) => { // dark riser covered in coloured sprinkles
  x.fillStyle = '#17171c'; x.fillRect(0, 0, w, h); const cols = ['#f2c230', '#e84a8a', '#35b3e8', '#7ad05a', '#ffffff', '#f07a26'];
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { x.save(); x.translate(rnd() * w, rnd() * h); x.rotate(rnd() * 3.14); x.fillStyle = cols[i % cols.length]; x.fillRect(-11, -3, 22, 6); x.restore(); }
});
const dripTex = () => canvasTex('drip', 512, 64, (x, w, h) => { // white icing drip along the top of the shop window
  x.clearRect(0, 0, w, h); x.fillStyle = '#f4f4f1'; x.fillRect(0, 0, w, 14);
  for (let i = 0; i < 22; i++) { const cx = 12 + i * 23, len = 18 + ((i * 37) % 30); x.fillRect(cx - 6, 10, 12, len); x.beginPath(); x.arc(cx, 10 + len, 6, 0, 7); x.fill(); }
});

// ================= 1960s block (Poundland, Tesco Express) =================
const GH = 4.25;                         // ground floor (shopfront) height

/** Cream window strip over a brick band: cream spandrel with glazed bays, sill and head. */
function strip(k, s0, s1, y0, y1, seed) {
  const L = s1 - s0, n = Math.max(1, Math.round(L / 2.15)), w = L / n, h = y1 - y0;
  k.box('creamLt', (s0 + s1) / 2, 0.09, (y0 + y1) / 2, L / 2, 0.09, h / 2);
  for (let i = 0; i < n; i++) {
    const a = s0 + w * i, b = a + w, dark = (i * 7 + seed) % 5 === 0;
    k.rect(dark ? 'glassDk' : 'glass', a + 0.13, b - 0.13, 0.2, y0 + 0.2, y1 - 0.2);
    k.box('white', (a + b) / 2, 0.21, y0 + h * 0.74, (w - 0.26) / 2, 0.025, 0.022);   // top-hung light
    k.box('white', (a + b) / 2, 0.21, (y0 + y1) / 2, 0.022, 0.025, (h - 0.4) / 2);   // centre mullion
    k.box('white', a + 0.13, 0.21, (y0 + y1) / 2, 0.03, 0.03, (h - 0.36) / 2);       // frame
  }
  k.box('white', s1 - 0.13, 0.21, (y0 + y1) / 2, 0.03, 0.03, (h - 0.36) / 2);
  k.box('creamLt', (s0 + s1) / 2, 0.2, y0 + 0.04, L / 2, 0.2, 0.05);                   // sill ledge
}

function groundBase(k, s0, s1) { k.box('dark', (s0 + s1) / 2, 0.03, GH / 2, (s1 - s0) / 2, 0.03, GH / 2); }

function poundlandUnits(k, s0, s1, n) {
  const L = s1 - s0, w = L / n;
  for (let i = 0; i < n; i++) {
    const a = s0 + w * i, b = a + w, mid = (a + b) / 2, entrance = i === 1;
    k.box('creamLt', a, 0.2, GH / 2, 0.2, 0.2, GH / 2);                                 // cream pier between units
    k.box('teal', mid, 0.075, 3.4, w / 2 - 0.2, 0.05, 0.5);                              // fascia board 2.9-3.9
    k.rect('glassDk', a + 0.2, b - 0.2, 0.1, 3.92, GH - 0.05);                           // clerestory over the sign
    k.rect('glass', a + 0.2, b - 0.2, 0.1, 1.0, 2.88);                                   // shop window
    k.box('teal', mid, 0.07, 0.5, w / 2 - 0.2, 0.05, 0.5);                               // teal vinyl panels below the window
    for (let j = 1; j < 3; j++) k.box('tealDk', a + 0.2 + (w - 0.4) * j / 3, 0.11, 1.95, 0.03, 0.03, 0.95);
    if (!entrance) { // posters on the lower panels
      const pw = (w - 0.6) / 2;
      k.tex(posterTex(), a + 0.3, a + 0.3 + pw, 0.125, 0.06, 1.0);
      k.tex(pound1Tex(), b - 0.3 - pw, b - 0.3, 0.125, 0.06, 1.0);
    } else { // glazed double doors with teal frames and a "Value Everyday" panel beside them
      k.box('tealDk', mid - w * 0.12, 0.12, 1.95, 0.04, 0.04, 0.95); k.box('tealDk', mid + w * 0.12, 0.12, 1.95, 0.04, 0.04, 0.95);
      k.box('tealDk', mid, 0.12, 2.9, w * 0.12 + 0.04, 0.04, 0.04);
      k.tex(posterTex(), b - 1.8, b - 0.4, 0.125, 0.5, 2.7);
    }
  }
  k.box('creamLt', s1, 0.2, GH / 2, 0.2, 0.2, GH / 2);
}

function blackUnit(k, s0, s1) { // the empty unit at the north end: black frames, dark glass, grey fascia
  const L = s1 - s0, n = Math.max(1, Math.round(L / 2.3)), w = L / n;
  k.box('black', (s0 + s1) / 2, 0.08, 3.65, L / 2, 0.06, 0.62);                          // black fascia
  k.rect('glassDk', s0 + 0.2, s1 - 0.2, 0.1, 2.9, 3.0);
  k.rect('glass', s0 + 0.2, s1 - 0.2, 0.1, 0.2, 2.9);
  for (let i = 0; i <= n; i++) k.box('black', s0 + w * i, 0.12, 1.5, 0.05, 0.05, 1.5);
  k.box('interior', s0 + L * 0.2, 0.09, 1.6, 0.5, 0.01, 1.0);                              // vinyl / notice behind the glass
  k.box('black', s0 + 0.1, 0.2, GH / 2, 0.3, 0.2, GH / 2); k.box('black', s1 - 0.1, 0.2, GH / 2, 0.3, 0.2, GH / 2);
}

function tescoGround(k, s0, s1, o) {
  const L = s1 - s0, glassEnd = o.cobbold ? s0 + L * 0.58 : s1, n = Math.max(2, Math.round((glassEnd - s0) / 2.3)), w = (glassEnd - s0) / n;
  k.box('blue', (s0 + s1) / 2, 0.075, 3.6, L / 2, 0.05, 0.7);                              // blue fascia band 2.9-4.3
  k.box('creamLt', (s0 + s1) / 2, 0.2, GH + 0.1, L / 2 + 0.05, 0.2, 0.1);                  // cream course above the fascia
  k.rect('glass', s0, glassEnd, 0.1, 0.35, 2.88);
  const gfx = ['orange', 'leaf', 'orange', 'red'];
  for (let i = 0; i < n; i++) { // large food graphics on the glazing, as photographed (oranges, lettuce, croissants, strawberries)
    const a = s0 + w * i; k.rect(gfx[i % gfx.length], a + 0.15, a + w - 0.15, 0.115, 0.55, 2.2);
  }
  for (let i = 0; i <= n; i++) k.box('dark', s0 + w * i, 0.12, 1.6, 0.06, 0.06, 1.55);
  k.box('dark', (s0 + glassEnd) / 2, 0.12, 0.2, (glassEnd - s0) / 2, 0.06, 0.2);
  if (o.cobbold) { // dark clad delivery bay and the side doors
    k.box('dark', (glassEnd + s1) / 2, 0.1, 1.8, (s1 - glassEnd) / 2, 0.08, 1.8);
    for (let q = glassEnd + 1.0; q < s1 - 1.2; q += 2.2) k.box('black', q, 0.19, 1.2, 0.45, 0.02, 1.2);
  }
  if (o.atm) { // the cash machine kiosk at the north end: black box with a small canopy
    k.box('dark', s0 + 1.6, 0.45, 1.3, 1.5, 0.45, 1.3); k.box('white', s0 + 1.2, 0.92, 1.35, 0.6, 0.02, 0.8); k.box('dark', s0 + 1.6, 0.6, 2.75, 1.7, 0.7, 0.05);
    k.box('steel', s0 + 2.2, 0.92, 1.3, 0.25, 0.02, 0.3);
  }
}

function modernEdge(k, F, H, E) {
  const s0 = F.s0, s1 = F.L - 0.25, L = s1 - s0, mid = (s0 + s1) / 2;
  const top = H, yA = GH + 1.35, yB = yA + 1.6, yC = yB + 1.4, yD = Math.min(top - 0.2, yC + 1.75);
  // ground floor
  if (E.ground !== 'none') {
    groundBase(k, s0, s1);
    if (E.ground === 'poundland') poundlandUnits(k, s0, s1, E.units || 4);
    else if (E.ground === 'black') blackUnit(k, s0, s1);
    else if (E.ground === 'tesco') tescoGround(k, s0, s1, E);
  }
  k.box('creamLt', mid, 0.2, GH + 0.04, L / 2 + 0.05, 0.2, 0.06);                         // shopfront head course
  // upper floors: brick band, cream strip, brick band, cream strip (windows), overhanging cream coping
  strip(k, s0, s1, yA, yB, 1);
  strip(k, s0, s1, yC, yD, 3);
  k.box('creamLt', mid, 0.3, top - 0.1, L / 2 + 0.1, 0.3, 0.2);                           // overhanging cream roof edge
  k.box('creamLt', mid, 0.1, yD + (top - 0.3 - yD) / 2, L / 2, 0.1, (top - 0.3 - yD) / 2 + 0.02);
}

function roofPlant(k, F, H, E) { // flat roof: a low plant room, a rail and a mast (visible in the Tesco corner photo)
  const L = F.L;
  k.box('cream', L * 0.4, -6.5, H + 0.6, 2.4, 2.0, 0.6);
  for (let s = 0.6; s < L - 0.5; s += 1.6) k.box('steel', s, -0.15, H + 0.55, 0.025, 0.025, 0.55);
  k.box('steel', L / 2, -0.15, H + 1.1, L / 2 - 0.5, 0.025, 0.025);
  k.box('steel', L * 0.3, -3.0, H + 3.0, 0.05, 0.05, 3.0);
  void E;
}

// ================= Edwardian terrace dressing =================
/** Stone-dressed window: architrave, white sashes, dark glass, sill, optional pediment. */
function sash(k, s, w, y0, y1, o = {}) {
  const lights = o.lights || 2, d = 0.06, sw = o.surround === false ? 0 : 0.2;
  if (sw) k.box(o.stone || 'stone', s, d, (y0 + y1) / 2, w / 2 + sw, d, (y1 - y0) / 2 + sw);
  k.rect('glassDk', s - w / 2, s + w / 2, d * 2 + 0.01, y0, y1);
  k.box('white', s, d * 2 + 0.03, (y0 + y1) / 2, w / 2, 0.03, 0.04); // meeting rail
  for (let i = 0; i <= lights; i++) k.box('white', s - w / 2 + (w * i) / lights, d * 2 + 0.03, (y0 + y1) / 2, 0.035, 0.035, (y1 - y0) / 2);
  k.box('white', s, d * 2 + 0.03, y1 - 0.03, w / 2, 0.035, 0.04); k.box('white', s, d * 2 + 0.03, y0 + 0.03, w / 2, 0.035, 0.04);
  k.box('stone', s, 0.22, y0 - 0.1, w / 2 + sw + 0.15, 0.2, 0.07);                   // projecting sill
  if (o.pediment === 'seg') { k.box('stone', s, 0.2, y1 + sw + 0.16, w / 2 + sw + 0.2, 0.18, 0.16); k.tri('stone', s - w / 2 - sw, s + w / 2 + sw, s, 0.2, y1 + sw + 0.3, y1 + sw + 0.78); }
  else if (o.pediment === 'flat') k.box('stone', s, 0.2, y1 + sw + 0.13, w / 2 + sw + 0.18, 0.18, 0.13);
}

function pilaster(k, s, y0, y1, w = 0.38) {
  k.box('creamLt', s, 0.1, (y0 + y1) / 2, w / 2, 0.1, (y1 - y0) / 2);
  k.box('creamLt', s, 0.2, y0 + 0.2, w / 2 + 0.07, 0.17, 0.2);                              // base block
  k.box('creamLt', s, 0.2, y1 - 0.25, w / 2 + 0.08, 0.17, 0.25);                            // capital / corbel
}

function cornice(k, s0, s1, y, h = 0.5, out = 0.34) {
  const L = s1 - s0; k.box('creamLt', (s0 + s1) / 2, out / 2, y, L / 2 + 0.05, out / 2, h / 2);
  k.box('creamLt', (s0 + s1) / 2, 0.08, y - h / 2 - 0.25, L / 2, 0.08, 0.2);
}

/**
 * Leaders (north, nearest Poundland) and Evolved Cake & Desserts: two narrow Edwardian bays of orange-red brick
 * with stone string courses, pilasters, stone-surrounded sashes, a cornice and a pedimented shaped gable over the
 * dividing pilaster. `it.at` / `it.from` pick the footprint edge; s runs from the Poundland end.
 */
function leadersEvolved(K, it, ctx) {
  const F = ctx.sideFrame({ at: it.at, from: it.from }), k = kit(F), H = K.H, L = F.L, s0 = F.s0, s1 = L - 0.25;
  const split = s0 + (s1 - s0) * 0.515, cl = (s0 + split) / 2, ce = (split + s1) / 2;
  const gh = 3.95;
  // ground floor shop fronts (the fascia boards are the signs from shopfronts.js)
  k.box('dark', cl, 0.03, gh / 2, (split - s0) / 2, 0.03, gh / 2);
  k.box('dark', ce, 0.03, gh / 2, (s1 - split) / 2, 0.03, gh / 2);
  // Leaders: navy-fronted agency, glazed with listing boards, brick stall riser, door at the south side
  k.box('navy', cl, 0.075, 3.55, (split - s0) / 2 - 0.3, 0.05, 0.4);
  k.rect('glass', s0 + 0.35, split - 1.55, 0.11, 0.9, 3.1); k.rect('glassDk', split - 1.3, split - 0.45, 0.11, 0.2, 3.1);
  k.box('brickDk', cl, 0.1, 0.5, (split - s0) / 2 - 0.35, 0.06, 0.5);
  for (let q = 0; q < 3; q++) k.box('white', s0 + 0.9 + q * 0.62, 0.13, 1.8, 0.2, 0.01, 0.3);
  // Evolved: black fascia, big glazed window with white icing drip, sprinkle riser, recessed door at the north end
  k.box('black', ce, 0.06, 3.55, (s1 - split) / 2 - 0.3, 0.04, 0.4);
  k.rect('glass', split + 1.3, s1 - 0.35, 0.11, 0.9, 3.25); k.tex(dripTex(), split + 1.3, s1 - 0.35, 0.125, 2.7, 3.25);
  k.tex(sprinkleTex(), split + 1.3, s1 - 0.35, 0.125, 0.12, 0.92);
  k.rect('glassDk', split + 0.35, split + 1.15, 0.11, 0.2, 3.1); k.box('black', split + 0.75, 0.12, 1.65, 0.45, 0.04, 1.5);
  k.box('granite', ce + 0.5, 0.13, 0.11, (s1 - split) / 2 - 0.5, 0.13, 0.11);                // granite plinth
  // stone: string course over the shops, party pilasters with corbels, cornice, parapet
  k.box('creamLt', (s0 + s1) / 2, 0.14, gh + 0.1, (s1 - s0) / 2 + 0.05, 0.14, 0.12);
  for (const s of [s0 + 0.15, split, s1 - 0.12]) pilaster(k, s, 0.3, 10.0, 0.4);
  // first floor (sill about 5.2, head 7.3) and second floor (sill 8.0, head 9.7)
  sash(k, cl, 1.7, 5.0, 7.2, { lights: 3, pediment: 'seg' });
  sash(k, cl, 1.3, 8.0, 9.6, { lights: 2, pediment: 'flat' });
  sash(k, ce, 2.4, 5.0, 7.2, { lights: 3, pediment: 'seg' });
  sash(k, ce, 1.5, 8.0, 9.6, { lights: 2, pediment: 'flat' });
  cornice(k, s0, s1, 10.3);
  k.box('brickDk', (s0 + s1) / 2, 0.04, 10.7, (s1 - s0) / 2, 0.04, 0.2);                       // parapet
  k.box('creamLt', (s0 + s1) / 2, 0.15, 10.95, (s1 - s0) / 2 + 0.05, 0.16, 0.05);              // coping
  // shaped, pedimented gable over the dividing pilaster, and a ball finial on the party wall with Specsavers
  k.box('creamLt', split, 0.12, 11.3, 1.25, 0.12, 0.35);
  k.tri('creamLt', split - 1.35, split + 1.35, split, 0.12, 11.6, 12.9);
  k.rect('brickDk', split - 0.7, split + 0.7, 0.14, 11.65, 12.3);
  k.box('creamLt', split - 1.4, 0.12, 11.5, 0.2, 0.12, 0.4); k.box('creamLt', split + 1.4, 0.12, 11.5, 0.2, 0.12, 0.4);
  k.box('creamLt', s1 - 0.12, 0.12, 11.35, 0.17, 0.17, 0.2);
  void H; void L;
  k.flush();
}

/**
 * Specsavers (90), the building dated 1905: dark red brick with darker bands, white painted ground floor with a green
 * shop front between two arched doorways (brown double doors on the Evolved side, glazed entrance on the Tesco side),
 * canted white bay window at first floor, astragal sashes, an arched bay each end, and a balustraded top with the date panel.
 */
function specsavers90(K, it, ctx) {
  const F = ctx.sideFrame({ at: it.at, from: it.from }), k = kit(F), H = K.H, L = F.L, s0 = F.s0, s1 = L - 0.25, W = s1 - s0;
  const gh = 4.55, dN = s0 + 1.25, dS = s1 - 1.3, shopA = s0 + 2.5, shopB = s1 - 2.55;
  // painted white ground floor with pilasters, green fascia, plate glass
  k.box('white', (s0 + s1) / 2, 0.03, gh / 2, W / 2, 0.03, gh / 2);
  k.box('white', (s0 + s1) / 2, 0.3, gh + 0.12, W / 2 + 0.05, 0.3, 0.16);                                  // cornice over the ground floor
  k.box('creamLt', (s0 + s1) / 2, 0.12, gh + 0.4, W / 2 + 0.02, 0.1, 0.06);
  for (const s of [shopA, shopB]) { k.box('white', s, 0.25, gh / 2, 0.28, 0.25, gh / 2); k.box('white', s, 0.32, gh - 0.3, 0.38, 0.3, 0.28); }
  k.box('green', (shopA + shopB) / 2, 0.075, 3.85, (shopB - shopA) / 2 - 0.3, 0.04, 0.45);               // green fascia board
  k.rect('glass', shopA + 0.3, shopB - 0.3, 0.13, 0.45, 3.35);
  for (let i = 0; i <= 4; i++) k.box('white', shopA + 0.3 + (shopB - shopA - 0.6) * i / 4, 0.15, 1.9, 0.04, 0.04, 1.45);
  k.box('brickDk', (shopA + shopB) / 2, 0.11, 0.2, (shopB - shopA) / 2 - 0.3, 0.06, 0.25);              // brick stall riser
  // arched doorways
  for (const [c, brown] of [[dN, true], [dS, false]]) {
    k.box(brown ? 'brown' : 'interior', c, 0.12, 1.55, 0.78, 0.04, 1.55); k.arch(brown ? 'brown' : 'interior', c, 0.78, 0.16, 3.1);
    k.box('white', c - 0.98, 0.3, 2.0, 0.22, 0.28, 2.0); k.box('white', c + 0.98, 0.3, 2.0, 0.22, 0.28, 2.0);
    k.arch('white', c, 1.2, 0.08, 3.1); k.arch(brown ? 'brown' : 'interior', c, 0.8, 0.17, 3.1);
    if (brown) k.box('black', c, 0.16, 1.55, 0.02, 0.02, 1.5);
    k.box('white', c, 0.35, gh - 0.15, 1.2, 0.3, 0.18);
  }
  // brick storeys: dark banding
  for (const y of [5.0, 7.95, 10.7]) k.box('brickDk', (s0 + s1) / 2, 0.03, y, W / 2, 0.03, 0.09);
  for (const y of [5.2, 8.15]) k.box('stone', (s0 + s1) / 2, 0.06, y, W / 2, 0.06, 0.05);               // stone string courses
  const win = (s, y0, y1, w, o = {}) => sash(k, s, w, y0, y1, { stone: 'white', lights: 2, ...o });
  // second floor: arched window each end, four sashes between
  for (const c of [dN, dS]) { win(c, 8.4, 9.6, 1.0, { pediment: null }); k.arch('glassDk', c, 0.5, 0.14, 9.6); k.arch('white', c, 0.62, 0.1, 9.6); }
  for (const s of [3.0, 4.7, 6.4, 8.1]) win(s, 8.3, 10.0, 1.1, { lights: 3 });
  // first floor: small window over each doorway, a window, the canted bay over the shop, a window
  for (const c of [dN, dS]) win(c, 5.7, 7.5, 1.0, { pediment: 'flat' });
  win(3.0, 5.6, 7.6, 1.15, { lights: 2 });
  const bayC = (dN + dS) / 2, bw = 2.2; // canted bay window in three faces on a white corbelled base
  const C = [[bayC - bw / 2 - 0.5, 0.05], [bayC - bw / 2, 0.75], [bayC + bw / 2, 0.75], [bayC + bw / 2 + 0.5, 0.05]];
  for (let i = 0; i < 3; i++) {
    const [sa, da] = C[i], [sb, db] = C[i + 1], P = k.P;
    const q = (m, y0, y1) => k.quad(m, P(sa, da, y0), P(sb, db, y0), P(sb, db, y1), P(sa, da, y1));
    q('white', 5.0, 5.65); q('glassDk', 5.65, 7.45); q('white', 7.45, 7.95);
    k.box('white', (sa + sb) / 2, (da + db) / 2 + 0.03, 6.55, 0.03, 0.03, 0.9); // mullion in the middle of each face
  }
  k.box('white', bayC, 0.4, 4.95, bw / 2 + 0.35, 0.45, 0.12);
  win(8.05, 5.6, 7.6, 1.15, { lights: 2 });
  // balustraded parapet with the date panel
  k.box('creamLt', (s0 + s1) / 2, 0.3, 10.95, W / 2 + 0.05, 0.3, 0.17);
  k.box('brickDk', (s0 + s1) / 2, 0.05, 11.45, W / 2, 0.05, 0.3);
  for (let s = s0 + 0.2; s < s1; s += 0.38) k.box('creamLt', s, 0.12, 11.5, 0.05, 0.05, 0.28);
  k.box('creamLt', (s0 + s1) / 2, 0.14, 11.78, W / 2 + 0.05, 0.14, 0.05);
  k.box('creamLt', bayC, 0.12, 11.4, 0.9, 0.1, 0.38);
  for (const s of [s0 + 0.2, dN + 1.0, dS - 1.0, s1 - 0.2]) k.box('brickDk', s, 0.14, 11.4, 0.2, 0.14, 0.5);
  void H;
  k.flush();
}

function modernBlock(K, it, ctx) {
  for (const E of it.edges) {
    const F = ctx.sideFrame({ at: E.at, from: E.from }), k = kit(F);
    modernEdge(k, F, K.H, E);
    if (it.roofPlant && E.atm) roofPlant(k, F, K.H, E);
    k.flush();
  }
}

export const FEATURES = { modernBlock, leadersEvolved, specsavers90 };
