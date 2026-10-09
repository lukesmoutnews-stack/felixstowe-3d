// Procedural PBR texture library. Everything is generated at runtime on canvas, so the
// project ships no third-party image assets (no licensing exposure). Each texture comes
// with a height field that is converted to a normal map, and a roughness map where useful.
// These are generic UK building/ground materials – approximations, not photographs of
// specific Felixstowe buildings (see docs/visual-quality.md).

import * as THREE from 'three';
import { mulberry32 } from '../geo/polygon.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

/** Two canvases (colour + height) drawn in lock-step. */
class Painter {
  constructor(w, h, seed = 1) {
    this.w = w; this.h = h; this.rand = mulberry32(seed);
    this.c = canvas(w, h); this.ctx = this.c.getContext('2d', { willReadFrequently: true });
    this.hc = canvas(w, h); this.hctx = this.hc.getContext('2d', { willReadFrequently: true });
    this.rc = null;
    this.hctx.fillStyle = '#808080'; this.hctx.fillRect(0, 0, w, h);
  }
  fill(col, height = 128) { this.rect(0, 0, this.w, this.h, col, height); }
  rect(x, y, w, h, col, height) {
    this.ctx.fillStyle = col; this.ctx.fillRect(x, y, w, h);
    if (height != null) { this.hctx.fillStyle = grey(height); this.hctx.fillRect(x, y, w, h); }
  }
  /** Wrapped rect – draws copies across the edges so the texture tiles seamlessly. */
  wrect(x, y, w, h, col, height) {
    for (const dx of [0, -this.w, this.w]) for (const dy of [0, -this.h, this.h]) {
      if (x + dx + w < 0 || x + dx > this.w || y + dy + h < 0 || y + dy > this.h) continue;
      this.rect(x + dx, y + dy, w, h, col, height);
    }
  }
  circle(x, y, r, col, height) {
    for (const dx of [0, -this.w, this.w]) for (const dy of [0, -this.h, this.h]) {
      const cx = x + dx, cy = y + dy; if (cx + r < 0 || cx - r > this.w || cy + r < 0 || cy - r > this.h) continue;
      this.ctx.fillStyle = col; this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, Math.PI * 2); this.ctx.fill();
      if (height != null) {
        const g = this.hctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, grey(height)); g.addColorStop(1, grey(height * 0.55));
        this.hctx.fillStyle = g; this.hctx.beginPath(); this.hctx.arc(cx, cy, r, 0, Math.PI * 2); this.hctx.fill();
      }
    }
  }
  /** Per-pixel colour noise (multiplicative) and height noise. Seamless value noise. */
  noise(amount = 0.08, hAmount = 10, scale = 1, colourful = false) {
    const id = this.ctx.getImageData(0, 0, this.w, this.h), d = id.data;
    const hd = this.hctx.getImageData(0, 0, this.w, this.h), hdd = hd.data;
    const r = this.rand;
    const low = tileNoise(this.w, this.h, Math.max(4, Math.round(16 / scale)), r);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const n = (r() - 0.5) * 2 * amount + (low[p] - 0.5) * amount * 1.5;
      const k = 1 + n;
      if (colourful) { d[i] *= 1 + (r() - 0.5) * amount; d[i + 1] *= k; d[i + 2] *= 1 + (r() - 0.5) * amount; }
      else { d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
      hdd[i] = hdd[i + 1] = hdd[i + 2] = Math.max(0, Math.min(255, hdd[i] + (r() - 0.5) * hAmount + (low[p] - 0.5) * hAmount));
    }
    this.ctx.putImageData(id, 0, 0); this.hctx.putImageData(hd, 0, 0);
  }
  roughness(fn) { // fn(x, y, heightValue) -> 0..1
    this.rc = canvas(this.w, this.h); const rctx = this.rc.getContext('2d');
    const hd = this.hctx.getImageData(0, 0, this.w, this.h).data;
    const id = rctx.createImageData(this.w, this.h);
    for (let y = 0, i = 0; y < this.h; y++) for (let x = 0; x < this.w; x++, i += 4) {
      const v = Math.round(255 * fn(x, y, hd[i] / 255)); id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    rctx.putImageData(id, 0, 0);
  }
  result(normalStrength = 2, opts = {}) {
    const map = new THREE.CanvasTexture(this.c); map.colorSpace = THREE.SRGBColorSpace;
    const normalMap = new THREE.CanvasTexture(normalFromHeight(this.hc, normalStrength));
    const out = { map, normalMap };
    if (this.rc) out.roughnessMap = new THREE.CanvasTexture(this.rc);
    for (const t of Object.values(out)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = opts.anisotropy || 8;
      t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    }
    return out;
  }
}
function grey(v) { v = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${v},${v},${v})`; }
function tileNoise(w, h, cells, r) {
  const g = []; for (let i = 0; i < cells * cells; i++) g.push(r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x / w) * cells, fy = (y / h) * cells;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[(y0 % cells) * cells + (x0 % cells)], b = g[(y0 % cells) * cells + ((x0 + 1) % cells)];
    const c = g[((y0 + 1) % cells) * cells + (x0 % cells)], d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
    out[y * w + x] = (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  }
  return out;
}
function normalFromHeight(hc, strength) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), octx = out.getContext('2d'), id = octx.createImageData(w, h), d = id.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  octx.putImageData(id, 0, 0); return out;
}
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

// ---------------- facades ----------------
// One texture tile = one window bay (3.2 m wide) x one storey (2.9 m high).
export const BAY_W = 3.2, STOREY_H = 2.9, SHOP_H = 3.6;

function brickWall(P, palette, mortar, x0 = 0, y0 = 0, w = P.w, h = P.h, courses = 38, perRow = 14) {
  P.rect(x0, y0, w, h, mortar, 100);
  const ch = h / courses, bw = w / perRow;
  for (let row = 0; row < courses; row++) {
    const off = (row % 2) * bw / 2;
    for (let k = -1; k < perRow; k++) {
      const x = x0 + k * bw + off, y = y0 + row * ch;
      const base = palette[Math.floor(P.rand() * palette.length)];
      const l = (P.rand() - 0.5) * 8;
      P.wrect(x + 1, y + 1, bw - 2, ch - 1.6, `hsl(${base[0] + (P.rand() - 0.5) * 6},${base[1]}%,${base[2] + l}%)`, 150 + P.rand() * 20);
    }
  }
}

function windowAt(P, x, y, w, h, opts = {}) {
  const frame = opts.frame || '#eeeae2';
  // reveal shadow, frame, glazing
  P.rect(x - 3, y - 3, w + 6, h + 6, 'rgba(40,36,34,1)', 40);
  P.rect(x, y, w, h, frame, 120);
  const ft = Math.max(4, w * 0.07);
  const g = P.ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, '#5a6f80'); g.addColorStop(0.45, '#2b3a47'); g.addColorStop(1, '#1b252e');
  P.ctx.fillStyle = g; P.ctx.fillRect(x + ft, y + ft, w - 2 * ft, h - 2 * ft);
  P.hctx.fillStyle = grey(70); P.hctx.fillRect(x + ft, y + ft, w - 2 * ft, h - 2 * ft);
  // glazing bars by style: 0 Victorian sash (2-over-2), 1 casement with top-light, 2 Georgian 6-over-6
  const st = opts.style ?? 0;
  if (st === 1) { P.rect(x + ft, y + h * 0.3, w - 2 * ft, ft * 0.8, frame, 125); P.rect(x + w / 2 - ft * 0.4, y + h * 0.3, ft * 0.8, h * 0.7 - ft, frame, 125); }
  else if (st === 2) { for (const fy of [1 / 3, 1 / 2, 2 / 3]) P.rect(x + ft, y + h * fy, w - 2 * ft, ft * (fy === 0.5 ? 0.9 : 0.45), frame, 125); for (const fx of [1 / 3, 2 / 3]) P.rect(x + w * fx - ft * 0.2, y + ft, ft * 0.45, h - 2 * ft, frame, 125); }
  else { P.rect(x + ft, y + h * 0.48, w - 2 * ft, ft * 0.8, frame, 125); P.rect(x + w / 2 - ft * 0.3, y + ft, ft * 0.6, h - 2 * ft, frame, 125); }
  // curtains / interior variation behind the glass
  if (opts.curtain) { P.ctx.fillStyle = opts.curtain; P.ctx.fillRect(x + ft, y + ft, (w - 2 * ft) * 0.22, h - 2 * ft); P.ctx.fillRect(x + w - ft - (w - 2 * ft) * 0.22, y + ft, (w - 2 * ft) * 0.22, h - 2 * ft); }
  // sill
  P.rect(x - 6, y + h, w + 12, 7, opts.sill || '#d9d4c7', 170);
  if (opts.lintel) P.rect(x - 4, y - 12, w + 8, 10, opts.lintel, 160);
}

function facadeTexture(kind, windows, seed, style = 0) {
  const key = `facade:${kind}:${windows}:${seed}:${style}`; if (cache.has(key)) return cache.get(key);
  const P = new Painter(512, 464, seed); // 3.2 x 2.9 m
  const pxm = 512 / BAY_W;
  if (kind.startsWith('brick')) {
    const pal = {
      brick_red: [[10, 50, 30], [14, 46, 27], [8, 44, 33], [18, 40, 29], [6, 38, 24]],
      brick_dark: [[8, 40, 22], [12, 34, 19], [5, 36, 26], [20, 22, 24]],
      brick_yellow: [[40, 34, 60], [38, 30, 55], [44, 26, 64], [35, 24, 52], [30, 20, 47]],
    }[kind];
    brickWall(P, pal, kind === 'brick_yellow' ? '#a9a291' : '#958b7c');
    P.noise(0.06, 8, 2);
  } else if (kind === 'flint') {
    P.fill('#b9b3a6', 110);
    for (let i = 0; i < 900; i++) {
      const x = P.rand() * P.w, y = P.rand() * P.h, r = 4 + P.rand() * 7;
      const l = 20 + P.rand() * 45; P.circle(x, y, r, hsl(30 + P.rand() * 180, 6, l), 190);
    }
    P.noise(0.05, 6);
  } else if (kind === 'stone') {
    P.fill('#9a9384', 100);
    const rows = 12, rh = P.h / rows;
    for (let r = 0; r < rows; r++) { let x = (r % 2) * 40; while (x < P.w + 80) { const w = 60 + P.rand() * 70; P.wrect(x + 2, r * rh + 2, w - 4, rh - 4, hsl(40, 12, 62 + (P.rand() - 0.5) * 10), 150); x += w; } }
    P.noise(0.08, 12);
  } else if (kind === 'concrete') {
    P.fill('#b5b2aa', 128);
    for (let y = 0; y < P.h; y += P.h / 2) P.rect(0, y, P.w, 3, '#8e8b84', 90);
    P.noise(0.09, 10, 0.5);
  } else if (kind === 'timber') {
    P.fill('#d9d2c2', 128);
    for (let y = 0; y < P.h; y += 22) { P.rect(0, y, P.w, 20, '#ece6d8', 140); P.rect(0, y + 19, P.w, 3, '#9b9486', 90); }
    P.noise(0.04, 4);
  } else if (kind === 'metal') {
    P.fill('#9fa8ad', 128);
    for (let x = 0; x < P.w; x += 32) { P.rect(x, 0, 6, P.h, '#c3cacd', 190); P.rect(x + 6, 0, 3, P.h, '#7d878c', 70); }
    P.noise(0.04, 4, 0.5);
  } else if (kind === 'glass') {
    const g = P.ctx.createLinearGradient(0, 0, P.w, P.h); g.addColorStop(0, '#6f8796'); g.addColorStop(1, '#2a3b47');
    P.ctx.fillStyle = g; P.ctx.fillRect(0, 0, P.w, P.h);
    for (let x = 0; x < P.w; x += P.w / 2) P.rect(x, 0, 8, P.h, '#3a3f42', 160);
    P.rect(0, 0, P.w, 10, '#3a3f42', 160);
  } else { // render (painted, white base – tinted per building by vertex colour)
    P.fill('#f2efe8', 128);
    P.noise(0.035, 5, 0.6);
  }
  if (windows && kind !== 'glass' && kind !== 'metal') {
    const ww = (style === 1 ? 1.5 : 1.1) * pxm, wh = (style === 1 ? 1.2 : 1.55) * pxm, wx = (P.w - ww) / 2, wy = P.h - (style === 1 ? 0.95 : 0.8) * pxm - wh;
    const brick = kind.startsWith('brick');
    if (brick && style === 0) { // decorative string course at floor level (common on Victorian/Edwardian fronts)
      P.rect(0, P.h - 0.12 * pxm, P.w, 0.1 * pxm, kind === 'brick_yellow' ? '#8c3b2c' : '#cfc6b2', 160);
    }
    const curtains = ['#d8cfb8', '#9a8f7c', '#c9b49a', '#7d8a8f', '#e3dccb'];
    windowAt(P, wx, wy, ww, wh, { style, curtain: curtains[(seed + style) % curtains.length], lintel: brick ? (kind === 'brick_yellow' ? '#b9ad95' : style === 1 ? '#6f3a2d' : '#d6cfbf') : null, sill: brick ? '#d6d1c4' : '#e7e3da' });
  }
  P.roughness((x, y, hv) => 0.95 - Math.max(0, 0.45 - hv) * 1.2);
  const r = P.result(kind === 'render' ? 1.2 : 3);
  cache.set(key, r); return r;
}

function shopfrontTexture(fascia, seed) {
  const key = `shop:${fascia}:${seed}`; if (cache.has(key)) return cache.get(key);
  const P = new Painter(512, 576, seed); // 3.2 x 3.6 m
  const pxm = 512 / BAY_W;
  P.fill(fascia, 130);
  const fasciaH = 0.65 * pxm, riser = 0.45 * pxm;
  // fascia moulding
  P.rect(0, 0, P.w, 8, '#e8e4dc', 180); P.rect(0, fasciaH - 8, P.w, 8, '#e8e4dc', 170);
  // the fascia is left plain: named sign boards are added per shop unit (src/world/shopfronts.js)
  // glazing
  const g = P.ctx.createLinearGradient(0, fasciaH, P.w * 0.7, P.h);
  g.addColorStop(0, '#7d93a1'); g.addColorStop(0.4, '#3b4d5a'); g.addColorStop(1, '#25313a');
  P.ctx.fillStyle = g; P.ctx.fillRect(10, fasciaH + 10, P.w - 20, P.h - fasciaH - riser - 10);
  P.hctx.fillStyle = grey(70); P.hctx.fillRect(10, fasciaH + 10, P.w - 20, P.h - fasciaH - riser - 10);
  // warm interior glow + mullions
  P.ctx.fillStyle = 'rgba(255,214,150,0.12)'; P.ctx.fillRect(10, fasciaH + 60, P.w - 20, P.h - fasciaH - riser - 70);
  P.rect(P.w / 2 - 5, fasciaH, 10, P.h - fasciaH - riser, fascia, 130);
  P.rect(0, fasciaH, 10, P.h - fasciaH, fascia, 130); P.rect(P.w - 10, fasciaH, 10, P.h - fasciaH, fascia, 130);
  P.rect(0, P.h - riser, P.w, riser, fascia, 140);
  P.noise(0.03, 4);
  P.roughness((x, y, hv) => (hv < 0.35 ? 0.08 : 0.6));
  const r = P.result(2); cache.set(key, r); return r;
}

// ---------------- doors (one texture = the whole door surround) ----------------
const DOOR_COLOURS = ['#1d2b44', '#6c1a1a', '#21412f', '#151515', '#f0ede6', '#2f5d7c', '#5b3a5e'];
export const DOOR_COUNT = DOOR_COLOURS.length;
function doorTexture(i) {
  const key = 'door:' + i; if (cache.has(key)) return cache.get(key);
  const P = new Painter(128, 280, 70 + i); // 1.1 x 2.4 m
  P.fill('#ebe7de', 150);                                   // painted surround
  P.rect(10, 8, 108, 46, '#2b3a47', 80);                    // fanlight
  P.rect(12, 30, 104, 3, '#ebe7de', 150);
  P.rect(14, 62, 100, 206, DOOR_COLOURS[i], 120);           // door leaf
  for (const [x, y, w, h] of [[24, 74, 34, 70], [70, 74, 34, 70], [24, 160, 34, 96], [70, 160, 34, 96]]) { P.rect(x, y, w, h, DOOR_COLOURS[i], 100); P.rect(x + 3, y + 3, w - 6, h - 6, DOOR_COLOURS[i], 135); }
  P.circle(98, 160, 4, '#c9a74a', 200);                     // brass knob
  P.rect(0, 268, 128, 12, '#bdb7aa', 170);                  // step
  P.noise(0.03, 3);
  P.roughness((x, y, hv) => (hv < 0.35 ? 0.1 : 0.5));
  const r = P.result(2); cache.set(key, r); return r;
}
function rollerDoorTexture() {
  if (cache.has('roller')) return cache.get('roller');
  const P = new Painter(256, 256, 9);
  P.fill('#9aa3a8', 128);
  for (let y = 0; y < 256; y += 8) { P.rect(0, y, 256, 6, '#b3babe', 150); P.rect(0, y + 6, 256, 2, '#6f777b', 90); }
  P.rect(0, 0, 8, 256, '#4f5558', 170); P.rect(248, 0, 8, 256, '#4f5558', 170);
  P.noise(0.04, 4);
  P.roughness(() => 0.45);
  const r = P.result(2); cache.set('roller', r); return r;
}

/** Corrugated steel container side (white base, tinted per instance). One tile = 2.5 m x 2.6 m. */
function containerTexture() {
  if (cache.has('container')) return cache.get('container');
  const P = new Painter(256, 256, 12);
  P.fill('#e9e9e6', 128);
  for (let x = 0; x < 256; x += 12) { P.rect(x, 0, 6, 256, '#f6f6f3', 175); P.rect(x + 6, 0, 2, 256, '#bdbdb9', 80); }
  P.rect(0, 0, 256, 10, '#9a9a96', 160); P.rect(0, 246, 256, 10, '#9a9a96', 160);
  for (let i = 0; i < 40; i++) P.circle(P.rand() * 256, P.rand() * 256, 2 + P.rand() * 6, 'rgba(120,70,40,0.12)', null);
  P.noise(0.05, 5);
  P.roughness(() => 0.55);
  const r = P.result(2.5); cache.set('container', r); return r;
}

// ---------------- roofs (1 tile = 2 x 2 m) ----------------
function roofTexture(kind, seed) {
  const key = `roof:${kind}:${seed}`; if (cache.has(key)) return cache.get(key);
  const P = new Painter(256, 256, seed);
  if (kind === 'slate') {
    P.fill('#3b4048', 100);
    const rows = 10, rh = P.h / rows, sw = P.w / 6;
    for (let r = 0; r < rows; r++) for (let k = -1; k < 7; k++) {
      const x = k * sw + (r % 2) * sw / 2; P.wrect(x + 1, r * rh, sw - 2, rh - 2, hsl(215, 8 + P.rand() * 6, 24 + P.rand() * 8), 130 + P.rand() * 30);
    }
    P.noise(0.06, 6);
  } else if (kind === 'clay' || kind === 'concrete_tile' || kind === 'pantile') {
    const base = kind === 'clay' ? [14, 48, 34] : kind === 'pantile' ? [16, 55, 38] : [25, 15, 32];
    P.fill(hsl(base[0], base[1], base[2] - 10), 90);
    const rows = 12, rh = P.h / rows, tw = P.w / (kind === 'pantile' ? 6 : 8);
    for (let r = 0; r < rows; r++) for (let k = -1; k < 9; k++) {
      const x = k * tw + (r % 2) * tw / 2;
      P.wrect(x + 1, r * rh, tw - 2, rh - 3, hsl(base[0] + (P.rand() - 0.5) * 6, base[1] - P.rand() * 10, base[2] + (P.rand() - 0.5) * 10), 150);
      if (kind === 'pantile') P.wrect(x + tw * 0.55, r * rh, tw * 0.3, rh - 3, 'rgba(0,0,0,0.18)', 110);
    }
    // weathering / lichen speckle
    for (let i = 0; i < 160; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 1 + P.rand() * 2.5, `rgba(${150 + P.rand() * 40},${150 + P.rand() * 30},90,0.35)`, null);
    P.noise(0.07, 8);
  } else if (kind === 'metal') {
    P.fill('#8f9aa0', 128);
    for (let x = 0; x < P.w; x += 32) { P.rect(x, 0, 10, P.h, '#b5bec2', 200); P.rect(x + 10, 0, 4, P.h, '#6f797e', 60); }
    P.noise(0.05, 4, 0.3);
  } else { // flat: bitumen felt with gravel
    P.fill('#4a4a49', 120);
    for (let i = 0; i < 2500; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 0.6 + P.rand() * 1.4, hsl(30, 5, 30 + P.rand() * 35), 150);
    P.noise(0.08, 8, 0.5);
  }
  P.roughness(() => (kind === 'metal' ? 0.45 : 0.9));
  const r = P.result(kind === 'flat' ? 1.5 : 3); cache.set(key, r); return r;
}

// ---------------- ground ----------------
function groundTexture(kind, seed = 7) {
  const key = `ground:${kind}`; if (cache.has(key)) return cache.get(key);
  const P = new Painter(512, 512, seed);
  switch (kind) {
    case 'asphalt': {
      P.fill('#3d3e40', 128);
      for (let i = 0; i < 7000; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 0.5 + P.rand() * 1.1, hsl(30, 5, 20 + P.rand() * 18), 140 + P.rand() * 40);
      for (let i = 0; i < 900; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 0.6 + P.rand() * 0.8, hsl(35, 6, 42 + P.rand() * 10), 170);
      P.noise(0.07, 14, 0.5);
      P.roughness((x, y, h) => 0.88 - h * 0.1);
      break;
    }
    case 'paving': { // 600x600 slabs; tile = 2.4 m
      P.fill('#6f6a63', 90);
      const n = 4, s = P.w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) P.rect(i * s + 2, j * s + 2, s - 4, s - 4, hsl(35, 5, 47 + (P.rand() - 0.5) * 9), 150);
      for (let i = 0; i < 12; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 2 + P.rand() * 4, 'rgba(40,40,40,0.08)', null);
      P.noise(0.07, 8); P.roughness(() => 0.85); break;
    }
    case 'blockpaving': { // herringbone-ish block paving
      P.fill('#5b4a44', 90);
      const bw = 32, bh = 16;
      for (let y = 0; y < P.h; y += bh) for (let x = -bw; x < P.w; x += bw) {
        const off = ((y / bh) % 2) * bw / 2; const tone = P.rand();
        P.wrect(x + off + 1, y + 1, bw - 2, bh - 2, tone < 0.5 ? hsl(10, 25, 38 + P.rand() * 8) : hsl(20, 10, 50 + P.rand() * 8), 150);
      }
      P.noise(0.06, 6); P.roughness(() => 0.85); break;
    }
    case 'kerb': {
      P.fill('#b4b1aa', 150);
      for (let x = 0; x < P.w; x += 128) P.rect(x, 0, 3, P.h, '#77746e', 80);
      P.noise(0.06, 6); P.roughness(() => 0.8); break;
    }
    case 'grass': {
      P.fill('#4a5a30', 128);
      for (let i = 0; i < 14000; i++) {
        const x = P.rand() * P.w, y = P.rand() * P.h, l = 20 + P.rand() * 20;
        P.ctx.strokeStyle = hsl(65 + P.rand() * 30, 22 + P.rand() * 18, l); P.ctx.lineWidth = 1;
        P.ctx.beginPath(); P.ctx.moveTo(x, y); P.ctx.lineTo(x + (P.rand() - 0.5) * 3, y - 2 - P.rand() * 5); P.ctx.stroke();
      }
      P.noise(0.12, 16, 0.4, true); P.roughness(() => 0.95); break;
    }
    case 'park': { // mown amenity grass with stripes
      P.fill('#506b30', 128);
      for (let i = 0; i < 12000; i++) {
        const x = P.rand() * P.w, y = P.rand() * P.h;
        P.ctx.fillStyle = hsl(75 + P.rand() * 20, 30, 24 + P.rand() * 18); P.ctx.fillRect(x, y, 1, 2);
      }
      for (let y = 0; y < P.h; y += 128) P.ctx.fillStyle = 'rgba(255,255,255,0.04)', P.ctx.fillRect(0, y, P.w, 64);
      P.noise(0.08, 10, 0.4, true); P.roughness(() => 0.95); break;
    }
    case 'sand': {
      P.fill('#cdb98f', 128);
      for (let y = 0; y < P.h; y += 2) { const v = Math.sin(y * 0.09 + Math.sin(y * 0.011) * 3) * 8; P.hctx.fillStyle = grey(128 + v); P.hctx.fillRect(0, y, P.w, 2); }
      P.noise(0.07, 6, 2); P.roughness(() => 0.97); break;
    }
    case 'shingle': {
      P.fill('#6f6455', 80);
      for (let i = 0; i < 2600; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 3 + P.rand() * 6, hsl(25 + P.rand() * 20, 10 + P.rand() * 18, 30 + P.rand() * 32), 200);
      P.noise(0.06, 6); P.roughness((x, y, h) => 0.7 + (1 - h) * 0.2); break;
    }
    case 'gravel': case 'ballast': {
      P.fill(kind === 'ballast' ? '#6c6760' : '#9b9283', 100);
      for (let i = 0; i < 6000; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 1 + P.rand() * 2.5, hsl(30, 6, 30 + P.rand() * 40), 180);
      P.noise(0.08, 8); P.roughness(() => 0.95); break;
    }
    case 'concrete': { // large slabs with joints; tile = 10 m
      P.fill('#a8a59e', 128);
      P.rect(0, 0, P.w, 3, '#6f6c66', 70); P.rect(0, 0, 3, P.h, '#6f6c66', 70);
      P.rect(0, P.h / 2, P.w, 2, '#7f7c76', 90); P.rect(P.w / 2, 0, 2, P.h, '#7f7c76', 90);
      for (let i = 0; i < 25; i++) { const x = P.rand() * P.w, y = P.rand() * P.h; P.circle(x, y, 10 + P.rand() * 40, 'rgba(60,55,50,0.07)', null); }
      P.noise(0.08, 8, 0.3); P.roughness(() => 0.85); break;
    }
    case 'soil': case 'scrub': {
      P.fill(kind === 'soil' ? '#5d4b38' : '#5c6236', 120);
      for (let i = 0; i < 3500; i++) P.circle(P.rand() * P.w, P.rand() * P.h, 1 + P.rand() * 4, kind === 'soil' ? hsl(30, 25, 22 + P.rand() * 18) : hsl(70 + P.rand() * 30, 30, 18 + P.rand() * 18), 160);
      P.noise(0.12, 12, 0.4, true); P.roughness(() => 0.97); break;
    }
    case 'mud': {
      P.fill('#5e5446', 120); P.noise(0.15, 18, 0.25); P.roughness(() => 0.35); break;
    }
    case 'markings': {
      P.fill('#f2f0ea', 160); P.noise(0.05, 10); P.roughness(() => 0.6); break;
    }
    case 'wood_deck': {
      P.fill('#6e5a44', 90);
      for (let x = 0; x < P.w; x += 32) P.rect(x + 1, 0, 29, P.h, hsl(30, 25, 30 + P.rand() * 12), 150);
      P.noise(0.08, 8); P.roughness(() => 0.85); break;
    }
    default: P.fill('#808080'); P.noise(0.1, 10);
  }
  const r = P.result(kind === 'grass' || kind === 'park' ? 1.2 : 2.5);
  cache.set(key, r); return r;
}

/** Sea surface normal map (tileable value noise ripples). */
function waterNormals() {
  if (cache.has('water')) return cache.get('water');
  const P = new Painter(512, 512, 3);
  const id = P.hctx.getImageData(0, 0, 512, 512);
  const n1 = tileNoise(512, 512, 8, P.rand), n2 = tileNoise(512, 512, 24, P.rand), n3 = tileNoise(512, 512, 64, P.rand);
  for (let i = 0, p = 0; p < 512 * 512; p++, i += 4) { const v = 128 + (n1[p] - 0.5) * 120 + (n2[p] - 0.5) * 70 + (n3[p] - 0.5) * 30; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; }
  P.hctx.putImageData(id, 0, 0);
  const r = P.result(4); cache.set('water', r); return r;
}

function cloudTexture() {
  if (cache.has('clouds')) return cache.get('clouds');
  const c = canvas(1024, 1024), ctx = c.getContext('2d'), id = ctx.createImageData(1024, 1024);
  const r = mulberry32(11);
  const layers = [6, 12, 24, 48, 96].map((cells) => tileNoise(1024, 1024, cells, r));
  for (let p = 0; p < 1024 * 1024; p++) {
    let v = layers[0][p] * 0.45 + layers[1][p] * 0.25 + layers[2][p] * 0.15 + layers[3][p] * 0.1 + layers[4][p] * 0.05;
    v = Math.max(0, (v - 0.48) * 3.2);
    const i = p * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = Math.min(255, v * 255);
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  cache.set('clouds', t); return t;
}

export const Textures = { facadeTexture, shopfrontTexture, roofTexture, groundTexture, waterNormals, cloudTexture, doorTexture, rollerDoorTexture, containerTexture };
