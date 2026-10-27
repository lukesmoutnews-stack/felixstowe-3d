// Area a11-east-wainwrights-gallery: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// East side of Hamilton Road, 158 Wainwrights (north corner with St Andrews Road) to 142 Gallery (south corner with Gainsborough Road).
// OSM draws all of it as ONE footprint (506379223), so the single feature `a11Block` builds the whole street face from the Street View
// photos supplied 26 Oct 2026 (docs/research/hamilton-road-streetview, f-wainwrights-*, f-beijing-madison-rspca, f-rspca-hospice-142gallery,
// f-142-gallery-gainsborough-rd). Every dimension is an estimate scaled from the photos (doors ~2.1 m, sash windows ~1.1 m), not surveyed.
//
// Hamilton Road is pedestrianised here, so the shared frame K points at a different wall. This feature builds its own frames from the
// footprint corners (world metres, z south): the street face runs from the north corner (153.2,-675.8) to the south corner (145,-631), 45.6 m,
// and `s` is measured from the NORTH end (Wainwrights) southwards, `d` out to the west, `y` up from the ground. The base building is a plain
// brick box 6.7 m high (windows:false); everything else (hipped slate roof, gabled red-brick block, 1960s three-storey block, shopfronts,
// fascias and windows) is added here. The business signs the game draws itself are covered by the fascias built here (they stand proud).
import * as THREE from 'three';
import { Textures } from '../textures.js';

const MD = {
  blk: { color: 0x1b1c1f, roughness: 0.55 }, wht: { color: 0xf3f1ea, roughness: 0.6 }, cream: { color: 0xd9d0b6, roughness: 0.85 },
  stn: { color: 0xcfc6ae, roughness: 0.9 }, gold: { color: 0xb59253, roughness: 0.7 }, faience: { color: 0x6b9e86, roughness: 0.3, metalness: 0.1 },
  glass: { color: 0x58727e, roughness: 0.12, metalness: 0.35 }, glassD: { color: 0x27333b, roughness: 0.15, metalness: 0.4 },
  glassL: { color: 0xc9d3d6, roughness: 0.2, metalness: 0.1 }, slate: { color: 0x3e464e, roughness: 0.75 }, slateD: { color: 0x2a2f35, roughness: 0.7 },
  rtile: { color: 0x2c2f33, roughness: 0.8 }, brickDk: { color: 0x6d3224, roughness: 0.9 }, door: { color: 0x3a261c, roughness: 0.7 },
  charc: { color: 0x40454c, roughness: 0.5 }, lgrey: { color: 0xb4bcbf, roughness: 0.35 }, navy: { color: 0x14267c, roughness: 0.45 },
  blueR: { color: 0x1b3bbd, roughness: 0.45 }, lime: { color: 0xb7d62f, roughness: 0.5 }, teal: { color: 0x2fb2b6, roughness: 0.5 },
  mag: { color: 0xc2398b, roughness: 0.5 }, card: { color: 0xf1f1ec, roughness: 0.6 }, shelf: { color: 0xc9dccc, roughness: 0.6 },
  pot: { color: 0xa65a3a, roughness: 0.8 }, dkOpen: { color: 0x121316, roughness: 0.9 }, bunting: { color: 0xe0742c, roughness: 0.7 },
  mann1: { color: 0xc9a24a, roughness: 0.8 }, mann2: { color: 0xe6c9c0, roughness: 0.8 }, mann3: { color: 0x7a7f4a, roughness: 0.8 },
  plant: { color: 0x3e7a3a, roughness: 0.9 }, purple: { color: 0x4b1e5f, roughness: 0.5 }, red: { color: 0xd3202a, roughness: 0.5 },
  ccream: { color: 0xece7d6, roughness: 0.6 }, chim: { color: 0x9a4a35, roughness: 0.95 },
};

// painted boards: id -> { w, h (metres, for the aspect), bg, paint(ctx, W, H) }
const fit = (x, txt, fontFn, size, maxW) => { x.font = fontFn(size); const w = x.measureText(txt).width; return w > maxW ? Math.floor(size * maxW / w) : size; };
const line = (x, W, H, txt, fy, size, fontFn, fill, ax = 0.5, maxW = 0.9) => { const sz = fit(x, txt, fontFn, size * H, W * maxW); x.font = fontFn(sz); x.fillStyle = fill; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W * ax, H * fy); };
const TXT = {
  tWain: { w: 4.3, h: 0.8, bg: '#4b1e5f', paint: (x, W, H) => line(x, W, H, 'Wainwrights', 0.52, 0.62, (s) => `bold ${s}px Georgia, serif`, '#efe3c2') },
  tWain2: { w: 5.0, h: 0.8, bg: '#4b1e5f', paint: (x, W, H) => line(x, W, H, 'Wainwrights', 0.52, 0.62, (s) => `bold ${s}px Georgia, serif`, '#efe3c2') },
  tNick: { w: 6.2, h: 0.8, bg: '#14267c', paint: (x, W, H) => { line(x, W, H, 'Nick Barber Auctions Ltd', 0.34, 0.5, (s) => `bold ${s}px Arial, sans-serif`, '#ffffff'); line(x, W, H, 'Vintage Collectables & Memorabilia', 0.76, 0.3, (s) => `italic bold ${s}px Arial, sans-serif`, '#ffffff'); } },
  tBei: { w: 4.7, h: 0.7, bg: '#d3202a', paint: (x, W, H) => line(x, W, H, 'Beijing', 0.5, 0.66, (s) => `italic bold ${s}px Georgia, serif`, '#fbeee0', 0.5, 0.5) },
  tDrag: { w: 2.9, h: 0.7, bg: '#e9e1c8', paint: (x, W, H) => { x.strokeStyle = '#8fa7a2'; x.lineWidth = H * 0.05; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(W * (0.05 + i * 0.05), H * 0.7); x.bezierCurveTo(W * 0.3, H * (0.1 + i * 0.1), W * 0.55, H * 0.9, W * (0.95 - i * 0.04), H * 0.35); x.stroke(); } } },
  tMad: { w: 3.8, h: 0.75, bg: '#474d54', paint: (x, W, H) => line(x, W, H, 'Madison Boutique', 0.5, 0.34, (s) => `italic ${s}px Georgia, serif`, '#e4e6e8', 0.5, 0.8) },
  tRsp: { w: 4.8, h: 0.8, bg: '#1b3bbd', paint: (x, W, H) => line(x, W, H, 'RSPCA SUFFOLK CENTRAL', 0.5, 0.5, (s) => `bold ${s}px Arial, sans-serif`, '#ffffff', 0.5, 0.92) },
  tHos: { w: 7.4, h: 0.8, bg: '#b7d62f', paint: (x, W, H) => line(x, W, H, 'St Elizabeth Hospice', 0.5, 0.5, (s) => `${s}px Arial, sans-serif`, '#4e5a44', 0.45, 0.7) },
  t142a: { w: 4.0, h: 0.9, bg: '#ece7d6', paint: (x, W, H) => line(x, W, H, '142', 0.5, 0.6, (s) => `${s}px Georgia, serif`, '#1a1a1a', 0.38, 0.5) },
  t142b: { w: 6.0, h: 0.9, bg: '#ece7d6', paint: (x, W, H) => { line(x, W, H, '142', 0.5, 0.55, (s) => `${s}px Georgia, serif`, '#1a1a1a', 0.14, 0.2); line(x, W, H, 'GALLERY', 0.52, 0.5, (s) => `${s}px Georgia, serif`, '#1a1a1a', 0.62, 0.7); } },
  tMural: { w: 3.7, h: 3.8, bg: '#4a86c7', paint: (x, W, H) => { x.fillStyle = '#5f9a45'; x.beginPath(); x.moveTo(0, H * 0.7); x.quadraticCurveTo(W * 0.4, H * 0.45, W, H * 0.62); x.lineTo(W, H); x.lineTo(0, H); x.fill(); x.fillStyle = '#f2efe0'; x.beginPath(); x.arc(W * 0.8, H * 0.2, W * 0.07, 0, 7); x.fill(); x.fillStyle = '#e8e2d0'; x.fillRect(W * 0.35, H * 0.72, W * 0.16, H * 0.2); } },
  tGarage: { w: 6.0, h: 2.6, bg: null, alpha: true, paint: (x, W, H) => { x.save(); x.translate(W * 0.5, H * 0.5); x.rotate(0.29); x.globalAlpha = 0.62; x.fillStyle = '#e9d9c6'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${H * 0.58}px Georgia, serif`; x.fillText('GARAGE', 0, 0); x.restore(); } },
};
const MC = {};
let brickM = null;
function brickMaterial() {
  if (brickM) return brickM;
  const t = Textures.facadeTexture('brick_red', false, 61, 0);
  brickM = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, color: 0xffcdb0, side: THREE.DoubleSide });
  return brickM;
}
function material(k) {
  if (k === 'brick') return brickMaterial();
  if (MC[k]) return MC[k];
  const sp = TXT[k]; let m;
  if (sp) {
    const W = 1024, H = Math.max(64, Math.round(W * sp.h / sp.w)), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    if (sp.bg) { x.fillStyle = sp.bg; x.fillRect(0, 0, W, H); }
    sp.paint(x, W, H);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide, transparent: !!sp.alpha, depthWrite: !sp.alpha, polygonOffset: !!sp.alpha, polygonOffsetFactor: -2 });
  } else m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...MD[k] });
  return (MC[k] = m);
}

/** A local frame on a wall: s along it, d out of it, y up, sharing the geometry pool A. */
function makeFrame(K, Geo, a, c, A) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, nx = -uz, nz = ux, g = K.g;
  const acc = (k) => A[k] || (A[k] = new Geo());
  const P = (s, d, y) => [a[0] + ux * s + nx * d, g + y, a[1] + uz * s + nz * d];
  const F = { L, P, acc, g };
  F.box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); acc(k).box(p[0], p[1], p[2], ux, uz, hs, hy, hd); };
  F.slab = (k, s0, s1, d0, d1, y0, y1) => F.box(k, (s0 + s1) / 2, (d0 + d1) / 2, (y0 + y1) / 2, Math.abs(s1 - s0) / 2, Math.abs(d1 - d0) / 2, Math.abs(y1 - y0) / 2);
  F.quad = (k, p0, p1, p2, p3) => acc(k).quad(P(...p0), P(...p1), P(...p2), P(...p3));
  F.tri = (k, p0, p1, p2) => acc(k).tri(P(...p0), P(...p1), P(...p2));
  F.W = (k, p0, p1, p2, p3) => (p3 ? acc(k).quad(p0, p1, p2, p3) : acc(k).tri(p0, p1, p2)); // quad/tri from world points
  F.brickQuad = (p0, p1, p2, p3) => { const v = (p) => [p[0] / 3.2, p[2] / 2.9]; acc('brick').quad(P(...p0), P(...p1), P(...p2), P(...p3), [v(p0), v(p1), v(p2), v(p3)]); };
  F.brickQuadD = (p0, p1, p2, p3) => { const v = (p) => [-p[1] / 3.2, p[2] / 2.9]; acc('brick').quad(P(...p0), P(...p1), P(...p2), P(...p3), [v(p0), v(p1), v(p2), v(p3)]); };
  F.brickTri = (p0, p1, p2) => { const G = acc('brick'), n = G.p.length / 3; G.p.push(...P(...p0), ...P(...p1), ...P(...p2)); for (const p of [p0, p1, p2]) G.uv.push(p[0] / 3.2, p[2] / 2.9); G.idx.push(n, n + 1, n + 2); };
  F.strip = (k, s0, y0, s1, y1, d, w) => { const dx = s1 - s0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, px = -dy / l * w / 2, py = dx / l * w / 2; F.quad(k, [s0 - px, d, y0 - py], [s0 + px, d, y0 + py], [s1 + px, d, y1 + py], [s1 - px, d, y1 - py]); };
  F.arch = (k, s, yc, r, d, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; F.tri(k, [s, d, yc], [s + Math.cos(a0) * r, d, yc + Math.sin(a0) * r], [s + Math.cos(a1) * r, d, yc + Math.sin(a1) * r]); } };
  F.archRing = (k, s, yc, r0, r1, d, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; F.quad(k, [s + Math.cos(a0) * r0, d, yc + Math.sin(a0) * r0], [s + Math.cos(a0) * r1, d, yc + Math.sin(a0) * r1], [s + Math.cos(a1) * r1, d, yc + Math.sin(a1) * r1], [s + Math.cos(a1) * r0, d, yc + Math.sin(a1) * r0]); } };
  return F;
}

/** Sash window: glass, white frame, glazing bars (cols x rows), stone sill, optional cream concrete surround (1960s) or arched head. */
function win(F, s, y0, y1, w, o = {}) {
  const fk = o.frame || 'wht', d = o.d ?? 0.05, cols = o.cols ?? 2, rows = o.rows ?? 2, t = o.t ?? 0.05, yTop = o.arch ? y1 - w / 2 : y1, gk = o.glass || 'glass';
  F.quad(gk, [s - w / 2, d, y0], [s + w / 2, d, y0], [s + w / 2, d, yTop], [s - w / 2, d, yTop]);
  if (o.arch) { F.arch(gk, s, yTop, w / 2, d, 10); F.archRing(fk, s, yTop, w / 2 - t, w / 2 + t, d + 0.02, 10); if (o.hood) F.archRing(o.hood, s, yTop, w / 2 + t, w / 2 + t + 0.2, d - 0.005, 10); }
  for (const e of [-1, 1]) F.slab(fk, s + e * (w / 2 - t / 2), s + e * (w / 2 - t / 2), d, d + 0.07, y0, yTop);
  F.slab(fk, s - w / 2, s + w / 2, d, d + 0.07, y0, y0 + t); if (!o.arch) F.slab(fk, s - w / 2, s + w / 2, d, d + 0.07, yTop - t, yTop);
  for (let i = 1; i < cols; i++) F.slab(fk, s - w / 2 + (w * i) / cols - t / 3, s - w / 2 + (w * i) / cols + t / 3, d, d + 0.06, y0, o.arch && i * 2 === cols ? y1 : yTop);
  for (let j = 1; j < rows; j++) F.slab(fk, s - w / 2, s + w / 2, d, d + 0.06, y0 + ((yTop - y0) * j) / rows - t / 3, y0 + ((yTop - y0) * j) / rows + t / 3);
  if (o.sur) { const q = o.sur; F.slab('cream', s - w / 2 - q, s + w / 2 + q, 0, 0.1, y0 - q, y0); F.slab('cream', s - w / 2 - q, s + w / 2 + q, 0, 0.1, y1, y1 + q); F.slab('cream', s - w / 2 - q, s - w / 2, 0, 0.1, y0, y1); F.slab('cream', s + w / 2, s + w / 2 + q, 0, 0.1, y0, y1); }
  else if (o.sill !== false) F.slab(o.sillK || 'stn', s - w / 2 - 0.1, s + w / 2 + 0.1, 0, 0.14, y0 - 0.09, y0);
  if (o.lintel) F.slab(o.lintel, s - w / 2 - 0.1, s + w / 2 + 0.1, 0, 0.12, yTop, yTop + 0.16);
}

function hipRoof(F, ridgeY) {
  const y0 = 6.7, E = [[17.0, 0.3], [0.2, 0.3], [-3.2, -2.9], [-3.9, -12.7], [17.0, -12.7]], R = [3.2, -6.2], R2 = 17.0;
  const e = (i) => F.P(E[i][0], E[i][1], y0), r1 = F.P(R[0], R[1], ridgeY), r2 = F.P(R2, R[1], ridgeY);
  F.W('slate', e(0), e(1), r1, r2); F.W('slate', e(1), e(2), r1); F.W('slate', e(2), e(3), r1); F.W('slate', e(3), e(4), r2, r1);
  F.slab('slateD', R[0], R2, R[1] - 0.12, R[1] + 0.12, ridgeY, ridgeY + 0.14);
  // white fascia and black gutter along the street eaves, round the chamfer and along the north hip
  F.slab('wht', 0.2, 17.0, 0.28, 0.36, y0 - 0.2, y0 + 0.04); F.slab('blk', 0.2, 17.0, 0.34, 0.42, y0 - 0.16, y0 - 0.06);
  F.slab('wht', -3.9, -3.6, -12.7, -2.9, y0 - 0.2, y0 + 0.04);
}

function chimney(F, s, d, y0, y1, pots = 2, w = 1.0, dp = 0.7) {
  F.slab('chim', s - w / 2, s + w / 2, d - dp / 2, d + dp / 2, y0, y1);
  F.slab('brickDk', s - w / 2 - 0.06, s + w / 2 + 0.06, d - dp / 2 - 0.06, d + dp / 2 + 0.06, y1 - 0.22, y1);
  F.slab('cream', s - w / 2 - 0.1, s + w / 2 + 0.1, d - dp / 2 - 0.1, d + dp / 2 + 0.1, y1, y1 + 0.1);
  for (let i = 0; i < pots; i++) F.slab('pot', s - w / 2 + (w * (i + 0.5)) / pots - 0.07, s - w / 2 + (w * (i + 0.5)) / pots + 0.07, d - 0.07, d + 0.07, y1 + 0.1, y1 + 0.6);
}

/** A red-brick gable over the street wall with white bargeboards, slate roof running back and an arched window. */
function gable(F, sc, w, yE, rise, win0) {
  const s0 = sc - w / 2, s1 = sc + w / 2, yP = yE + rise, back = 9.5, ov = 0.28, d0 = 0.06;
  F.brickTri([s0, d0, yE], [s1, d0, yE], [sc, d0, yP]);
  F.quad('slate', [s0 - ov, d0 + 0.3, yE - 0.12], [sc, d0 + 0.3, yP + 0.1], [sc, -back, yP + 0.1], [s0 - ov, -back, yE - 0.12]);
  F.quad('slate', [s1 + ov, d0 + 0.3, yE - 0.12], [sc, d0 + 0.3, yP + 0.1], [sc, -back, yP + 0.1], [s1 + ov, -back, yE - 0.12]);
  F.tri('slateD', [s0 - ov, -back, yE - 0.12], [s1 + ov, -back, yE - 0.12], [sc, -back, yP + 0.1]);
  F.strip('wht', s0 - ov, yE - 0.12, sc, yP + 0.12, d0 + 0.32, 0.3); F.strip('wht', s1 + ov, yE - 0.12, sc, yP + 0.12, d0 + 0.32, 0.3);
  F.slab('wht', s0 - ov - 0.1, s1 + ov + 0.1, d0, d0 + 0.34, yE - 0.2, yE - 0.06); // eaves board across the foot
  F.slab('slateD', sc - 0.06, sc + 0.06, d0 + 0.3, -back, yP + 0.1, yP + 0.22);
  win(F, sc, yE + 0.3, yE + 0.3 + win0.h, win0.w, { d: d0 + 0.02, cols: win0.cols, rows: 2, arch: true, hood: 'brickDk', sill: false });
}

function groundFloor(F) {
  // ---------- 158 Wainwrights: green faience shopfront with gold stone piers and purple fascias (s 0.3 - 10.8) ----------
  F.slab('gold', 0.3, 10.8, 0, 0.18, 0, 0.12);                                   // plinth
  const pier = (s0, s1) => { F.slab('gold', s0, s1, 0, 0.22, 0.12, 3.0); F.slab('faience', s0 + 0.14, s1 - 0.14, 0.22, 0.26, 0.55, 2.7); F.slab('gold', s0 - 0.06, s1 + 0.06, 0, 0.3, 2.95, 3.65); };
  pier(0.3, 1.0); pier(4.5, 5.3); pier(10.0, 10.8);
  F.slab('cream', 0.2, 10.9, 0, 0.5, 3.65, 3.95);                                  // cornice over the fascia
  F.slab('brickDk', 0.2, 10.9, 0, 0.08, 3.95, 4.05);
  F.slab('purple', 1.0, 4.5, 0.15, 0.25, 2.85, 3.65);                               // (painted board, drawn as a thin box)
  F.quad('tWain', [1.0, 0.27, 2.85], [4.5, 0.27, 2.85], [4.5, 0.27, 3.65], [1.0, 0.27, 3.65]);
  F.slab('purple', 5.3, 10.0, 0.15, 0.25, 2.85, 3.65);
  F.quad('tWain2', [5.3, 0.27, 2.85], [10.0, 0.27, 2.85], [10.0, 0.27, 3.65], [5.3, 0.27, 3.65]);
  F.slab('purple', 0.3, 1.0, 0.15, 0.25, 2.95, 3.6);
  // left and right windows with green tiled stallrisers and estate-agent cards
  const win2 = (a, b) => {
    F.slab('faience', a, b, 0, 0.14, 0.12, 0.75); F.slab('gold', a, b, 0, 0.18, 0.75, 0.82);
    F.quad('glassD', [a, 0.1, 0.82], [b, 0.1, 0.82], [b, 0.1, 2.85], [a, 0.1, 2.85]);
    F.slab('cream', a, b, 0, 0.12, 2.8, 2.88);
    const n = Math.max(2, Math.round((b - a) / 1.25)); for (let i = 1; i < n; i++) F.slab('cream', a + ((b - a) * i) / n - 0.03, a + ((b - a) * i) / n + 0.03, 0.08, 0.16, 0.82, 2.82);
  };
  win2(1.0, 4.5); win2(5.9, 10.0);
  const cards = (a, b) => { const cols = Math.max(2, Math.round((b - a) / 0.5)), cw = (b - a) / cols; for (let c = 0; c < cols; c++) for (let r = 0; r < 4; r++) F.slab('card', a + c * cw + 0.05, a + (c + 1) * cw - 0.05, 0.12, 0.15, 0.95 + r * 0.42, 1.28 + r * 0.42); };
  cards(1.4, 4.1); cards(6.4, 9.6);
  // central door: cream painted door with glazed panels and a fanlight, stone step
  F.slab('cream', 5.3, 5.9, 0, 0.2, 0.12, 2.8);
  F.slab('cream', 4.95, 5.6, 0.05, 0.2, 0.0, 0.14);
  F.slab('cream', 5.25, 5.9, 0.0, 0.22, 0.0, 0.1);
  F.slab('stn', 5.2, 6.7, 0, 0.45, 0, 0.1);
  F.slab('cream', 5.5, 6.5, 0.1, 0.17, 0.1, 2.3); F.quad('glassD', [5.62, 0.19, 0.5], [6.38, 0.19, 0.5], [6.38, 0.19, 2.1], [5.62, 0.19, 2.1]);
  F.slab('cream', 5.95, 6.05, 0.17, 0.21, 0.5, 2.1); F.slab('cream', 5.5, 6.5, 0.1, 0.2, 2.3, 2.85);
  F.quad('glassD', [5.58, 0.21, 2.4], [6.42, 0.21, 2.4], [6.42, 0.21, 2.8], [5.58, 0.21, 2.8]);
  // ---------- Wainwrights' canted corner shop (north-west chamfer): glazed with a small purple board ----------
  // ---------- 156 Nick Barber Auctions (s 10.8 - 17.0): navy fascia, shelved window, dark flat door ----------
  F.slab('wht', 10.8, 17.0, 0, 0.12, 0.0, 0.14);
  F.slab('door', 11.05, 11.95, 0.0, 0.1, 0.0, 2.2); F.slab('stn', 10.95, 12.05, 0, 0.3, 0, 0.1); F.slab('wht', 10.98, 12.02, 0, 0.12, 2.2, 2.4);
  F.slab('navy', 10.8, 17.0, 0.14, 0.26, 2.85, 3.65); F.quad('tNick', [10.8, 0.28, 2.85], [17.0, 0.28, 2.85], [17.0, 0.28, 3.65], [10.8, 0.28, 3.65]);
  F.slab('wht', 12.85, 16.7, 0, 0.1, 0.14, 0.55);
  F.quad('glass', [12.85, 0.1, 0.55], [16.7, 0.1, 0.55], [16.7, 0.1, 2.85], [12.85, 0.1, 2.85]);
  for (let i = 0; i <= 4; i++) F.slab('wht', 12.85 + i * 0.96 - 0.04, 12.85 + i * 0.96 + 0.04, 0.09, 0.17, 0.55, 2.85);
  F.slab('wht', 12.85, 16.7, 0.09, 0.17, 2.8, 2.88);
  F.slab('wht', 16.7, 17.0, 0, 0.15, 0.1, 3.0);
  F.slab('shelf', 13.1, 14.9, 0.2, 0.55, 0.6, 2.0);                             // pigeon-hole shelving seen through the glass
  for (let i = 0; i <= 3; i++) F.slab('wht', 13.1 + i * 0.6 - 0.02, 13.1 + i * 0.6 + 0.02, 0.5, 0.58, 0.6, 2.0);
  for (let j = 0; j <= 3; j++) F.slab('wht', 13.1, 14.9, 0.5, 0.58, 0.6 + j * 0.46 - 0.02, 0.6 + j * 0.46 + 0.02);
  F.slab('cream', 10.8, 17.0, 0, 0.35, 3.65, 3.9); F.slab('brickDk', 10.8, 17.0, 0, 0.08, 3.9, 4.0);
  // ---------- Beijing (s 17.0 - 22.1): light grey tiled piers, red fascia, dragon panel, recessed doorway ----------
  F.slab('lgrey', 17.0, 18.2, 0, 0.3, 0.0, 3.0); F.slab('lgrey', 21.1, 22.1, 0, 0.3, 0.0, 3.0); F.slab('lgrey', 19.85, 20.2, 0, 0.25, 0.0, 2.3);
  F.quad('dkOpen', [18.2, 0.08, 0.1], [21.1, 0.08, 0.1], [21.1, 0.08, 2.3], [18.2, 0.08, 2.3]);
  F.quad('glassD', [20.2, 0.1, 0.5], [21.1, 0.1, 0.5], [21.1, 0.1, 2.3], [20.2, 0.1, 2.3]);
  F.slab('plant', 20.4, 20.9, 0.2, 0.6, 0.5, 1.2);
  F.slab('door', 18.55, 19.55, 0.1, 0.2, 0.1, 2.15); F.quad('glassD', [18.65, 0.21, 0.4], [19.45, 0.21, 0.4], [19.45, 0.21, 2.0], [18.65, 0.21, 2.0]);
  F.slab('cream', 18.2, 21.1, 0.1, 0.18, 2.3, 2.85); F.quad('tDrag', [18.2, 0.2, 2.3], [21.1, 0.2, 2.3], [21.1, 0.2, 2.85], [18.2, 0.2, 2.85]);
  F.slab('red', 17.2, 21.9, 0.14, 0.26, 2.85, 3.65); F.quad('tBei', [17.2, 0.28, 2.85], [21.9, 0.28, 2.85], [21.9, 0.28, 3.65], [17.2, 0.28, 3.65]);
  F.slab('wht', 17.0, 22.1, 0.14, 0.26, 3.65, 3.95); F.slab('wht', 17.0, 17.2, 0.14, 0.26, 2.85, 3.65); F.slab('wht', 21.9, 22.1, 0.14, 0.26, 2.85, 3.65);
  // the arcade / passage to the rear: dark opening under a plain white fascia (s 22.1 - 24.4)
  F.quad('dkOpen', [22.4, 0.05, 0.0], [24.2, 0.05, 0.0], [24.2, 0.05, 3.0], [22.4, 0.05, 3.0]);
  F.slab('wht', 22.1, 24.4, 0.14, 0.26, 2.95, 3.95); F.slab('lgrey', 22.1, 22.4, 0, 0.2, 0, 2.95); F.slab('lgrey', 24.2, 24.4, 0, 0.2, 0, 2.95);
  // ---------- Madison Boutique (s 24.4 - 28.2): charcoal frame, script fascia, pale window ----------
  F.slab('charc', 24.4, 28.2, 0, 0.12, 0, 0.45); F.slab('charc', 24.4, 24.8, 0, 0.2, 0, 2.95); F.slab('charc', 27.95, 28.2, 0, 0.2, 0, 2.95);
  F.quad('glassL', [24.8, 0.1, 0.45], [27.2, 0.1, 0.45], [27.2, 0.1, 2.85], [24.8, 0.1, 2.85]);
  F.slab('charc', 27.2, 27.95, 0, 0.14, 0.0, 2.9); F.quad('glassD', [27.35, 0.15, 0.2], [27.8, 0.15, 0.2], [27.8, 0.15, 2.4], [27.35, 0.15, 2.4]);
  F.slab('charc', 24.8, 27.2, 0.1, 0.18, 2.78, 2.9);
  F.slab('charc', 24.4, 28.2, 0.14, 0.26, 2.9, 3.65); F.quad('tMad', [24.4, 0.28, 2.9], [28.2, 0.28, 2.9], [28.2, 0.28, 3.65], [24.4, 0.28, 3.65]);
  F.slab('wht', 24.4, 28.2, 0.14, 0.26, 3.65, 3.8);
  // ---------- 1960s RSPCA Suffolk Central (s 28.2 - 33.0): blue fascia, blue door, window with bunting ----------
  F.slab('blueR', 28.2, 33.0, 0, 0.12, 0, 0.7);
  F.slab('blueR', 28.4, 29.5, 0, 0.16, 0.0, 2.85); F.quad('glassD', [28.55, 0.18, 0.2], [29.35, 0.18, 0.2], [29.35, 0.18, 2.5], [28.55, 0.18, 2.5]);
  F.quad('glass', [29.7, 0.1, 0.7], [32.7, 0.1, 0.7], [32.7, 0.1, 2.85], [29.7, 0.1, 2.85]);
  F.slab('blueR', 29.5, 29.7, 0, 0.16, 0.0, 2.85); F.slab('blueR', 32.6, 32.8, 0, 0.16, 0.0, 2.85); F.slab('blueR', 29.5, 32.8, 0, 0.16, 2.75, 2.88);
  for (let i = 0; i < 9; i++) F.tri('bunting', [29.8 + i * 0.33, 0.14, 2.7], [29.8 + i * 0.33 + 0.26, 0.14, 2.7], [29.8 + i * 0.33 + 0.13, 0.14, 2.3]);
  F.slab('mann3', 30.6, 31.0, 0.3, 0.5, 0.8, 1.8); F.slab('mann1', 31.7, 32.1, 0.3, 0.5, 0.8, 1.9);
  F.slab('blueR', 28.2, 33.0, 0.14, 0.26, 2.85, 3.65); F.quad('tRsp', [28.2, 0.28, 2.85], [33.0, 0.28, 2.85], [33.0, 0.28, 3.65], [28.2, 0.28, 3.65]);
  // ---------- St Elizabeth Hospice (s 33.0 - 40.2): lime fascia, big window, coloured Shop / Donate / Volunteer strip ----------
  F.slab('lime', 33.0, 40.2, 0.14, 0.26, 2.85, 3.65); F.quad('tHos', [33.0, 0.28, 2.85], [40.2, 0.28, 2.85], [40.2, 0.28, 3.65], [33.0, 0.28, 3.65]);
  F.slab('wht', 33.4, 38.9, 0, 0.1, 0.0, 0.14);
  F.quad('glass', [33.5, 0.1, 0.8], [38.8, 0.1, 0.8], [38.8, 0.1, 2.85], [33.5, 0.1, 2.85]);
  F.slab('teal', 33.5, 35.2, 0.05, 0.14, 0.14, 0.8); F.slab('mag', 35.2, 37.0, 0.05, 0.14, 0.14, 0.8); F.slab('lime', 37.0, 38.8, 0.05, 0.14, 0.14, 0.8);
  for (const s of [33.5, 35.8, 38.8]) F.slab('wht', s - 0.05, s + 0.05, 0.06, 0.16, 0.8, 2.85);
  F.slab('mann1', 34.2, 34.6, 0.3, 0.5, 0.95, 2.0); F.slab('mann2', 35.5, 35.9, 0.3, 0.5, 0.95, 2.0); F.slab('mann3', 36.7, 37.1, 0.3, 0.5, 0.95, 2.0);
  F.slab('mann2', 37.3, 38.1, 0.2, 0.5, 1.9, 2.5);
  F.slab('door', 33.0, 33.5, 0, 0.12, 0.0, 2.85);
  // ---------- 142 Gallery: white painted frame, glazed door (s 40.2 - 45.6) ----------
  F.slab('ccream', 40.2, 45.6, 0.14, 0.26, 2.85, 3.75); F.quad('t142a', [40.2, 0.28, 2.85], [45.6, 0.28, 2.85], [45.6, 0.28, 3.75], [40.2, 0.28, 3.75]);
  F.slab('wht', 42.0, 45.6, 0, 0.2, 0.0, 2.85);                                   // painted white wall / corner post
  F.slab('wht', 40.7, 42.2, 0, 0.2, 0.0, 2.85); F.quad('glassD', [41.0, 0.22, 0.1], [41.95, 0.22, 0.1], [41.95, 0.22, 2.3], [41.0, 0.22, 2.3]);
  F.quad('glassD', [41.0, 0.22, 2.4], [41.95, 0.22, 2.4], [41.95, 0.22, 2.8], [41.0, 0.22, 2.8]);
  F.slab('wht', 40.2, 45.6, 0, 0.5, 3.75, 3.95);
}

export const FEATURES = {
  a11Block(K, it) {
    const Geo = K.G.gw.constructor, A = {};
    const F = makeFrame(K, Geo, [153.2, -675.8], [145.0, -631.0], A);               // west street face, s north to south
    const S = makeFrame(K, Geo, [145.0, -631.0], [159.4, -626.5], A);               // south wall on Gainsborough Road, s west to east
    const N = makeFrame(K, Geo, [166.3, -677.3], [156.2, -678.0], A);               // north wall on St Andrews Road
    const C = makeFrame(K, Geo, [156.2, -678.0], [153.2, -675.8], A);               // chamfered north-west corner
    const B3 = makeFrame(K, Geo, F.P(33.0, -14.6, 0).filter((_, i) => i !== 1), F.P(33.0, 0, 0).filter((_, i) => i !== 1), A); // north flank of the 3-storey block
    // F.P returns [x, y, z]; the frames want [x, z]
    const H0 = 6.7;
    groundFloor(F);
    // ================= brick detailing on the street wall =================
    // bands and eaves courses
    F.slab('brickDk', 0.2, 17.0, 0, 0.05, 3.95, 4.05);
    F.slab('brickDk', 0.2, 10.8, 0, 0.06, 6.2, 6.3);
    F.slab('brickDk', 17.0, 28.4, 0, 0.1, 6.55, 6.8);
    F.slab('stn', 0.4, 10.7, 0, 0.12, 4.0, 4.06);
    // ---- Wainwrights: hipped slate roof, chimney, three casements ----
    hipRoof(F, 8.7);
    chimney(F, 12.9, -3.2, 8.0, 9.9, 3, 1.0, 0.7);
    for (const s of [3.9, 7.0, 8.9]) win(F, s, 3.95, 5.55, 1.1, { cols: 1, rows: 2, d: 0.05, sillK: 'stn', glass: 'glass' });
    win(F, 0.3, 4.2, 5.4, 0.6, { cols: 1, rows: 2, d: 0.05 });
    // ---- Nick Barber upstairs: three white sash windows, 6 over 6 ----
    for (const s of [12.1, 14.3, 16.3]) win(F, s, 4.05, 5.65, 1.0, { cols: 2, rows: 3, d: 0.05 });
    // ---- flank wall of the Victorian block above the roof, with the faded GARAGE ghost sign ----
    F.brickQuadD([17.02, 0.05, 6.4], [17.02, -9.0, 6.4], [17.02, -9.0, 10.2], [17.02, 0.05, 7.5]);
    F.W('slateD', F.P(17.0, 0.05, 7.5), F.P(17.0, -9.0, 10.2), F.P(17.0, -9.0, 10.4), F.P(17.0, 0.05, 7.7));
    F.quad('tGarage', [16.97, -7.8, 7.6], [16.97, -1.8, 7.6], [16.97, -1.8, 10.2], [16.97, -7.8, 10.2]);
    // ---- the gabled red-brick block (Beijing / Madison Boutique): two gables with white bargeboards and arched windows ----
    F.brickQuad([17.0, 0.04, 6.7], [28.4, 0.04, 6.7], [28.4, 0.04, 7.3], [17.0, 0.04, 7.3]);
    F.slab('wht', 17.0, 28.4, 0.05, 0.4, 7.2, 7.32);
    F.slab('blk', 17.0, 28.4, 0.38, 0.46, 7.22, 7.32);
    for (const s of [18.3, 19.6, 21.3, 22.5, 24.7, 25.8, 27.0, 28.0]) win(F, s, 4.2, 6.15, 0.9, { cols: 2, rows: 3, d: 0.05 });
    gable(F, 20.6, 4.2, 7.3, 2.5, { w: 1.9, h: 1.6, cols: 3 });
    gable(F, 26.3, 3.9, 7.3, 2.3, { w: 1.7, h: 1.35, cols: 3 });
    F.slab('slateD', 22.5, 24.5, 0.1, -9.0, 7.25, 7.4);
    chimney(F, 23.6, -3.0, 7.3, 10.2, 2, 1.0, 0.7);
    for (const s of [10.75, 17.1, 28.45]) F.slab('blk', s - 0.05, s + 0.05, 0.1, 0.2, 0, s > 20 ? 7.2 : 6.5);
    // ================= 1960s block: lower two-storey RSPCA part (s 28.4 - 33.0) =================
    F.slab('cream', 28.4, 33.0, 0, 0.1, 3.8, 4.0);
    win(F, 30.7, 4.3, 5.5, 3.4, { cols: 3, rows: 1, d: 0.05, sur: 0.14, frame: 'wht' });
    F.slab('cream', 28.4, 33.0, 0, 0.18, 6.55, 6.85); F.slab('cream', 28.4, 33.0, 0.1, 0.6, 6.75, 6.85);
    // ================= 1960s three-storey block (s 33.0 - 45.6): brick up to the eaves, low black-tiled gabled roof =================
    const EAVE = 8.7, RIDGE = 11.3;
    F.brickQuad([33.0, 0.03, H0], [45.6, 0.03, H0], [45.6, 0.03, EAVE], [33.0, 0.03, EAVE]);
    F.slab('cream', 33.0, 45.6, 0, 0.1, 3.95, 4.05); F.slab('cream', 33.0, 45.6, 0, 0.12, 5.6, 5.85);
    F.slab('cream', 33.0, 45.6, 0.05, 0.75, 3.65, 3.95);                           // flat canopy over the shops
    for (const [s, w] of [[34.6, 1.1], [37.1, 1.5], [40.3, 1.5], [43.8, 2.8]]) win(F, s, 4.3, 5.45, w, { cols: w > 2 ? 3 : 2, rows: 1, d: 0.05, sur: 0.13 });
    for (const [s, w] of [[34.3, 1.3], [36.8, 1.5], [40.0, 1.5], [43.7, 2.6]]) win(F, s, 6.5, 7.8, w, { cols: w > 2 ? 3 : 2, rows: 1, d: 0.05, sur: 0.13 });
    // north flank of the block above the lower RSPCA roof: brick to the eaves, gable, small windows
    B3.brickQuad([0, 0.03, H0], [14.6, 0.03, H0], [14.6, 0.03, EAVE], [0, 0.03, EAVE]);
    B3.brickTri([0, 0.03, EAVE], [14.6, 0.03, EAVE], [7.3, 0.03, RIDGE]);
    for (const s of [2.5, 6.0, 9.6]) win(B3, s, 6.9, 7.85, 0.9, { cols: 2, rows: 1, d: 0.05, sur: 0.1 });
    // roof: two slopes meeting at a ridge running north-south, black concrete tiles, white fascias
    const Lg = S.L, eFN = F.P(32.6, 0.55, EAVE - 0.1), eFS = S.P(-0.55, 0.55, EAVE - 0.1), rN = F.P(32.6, -7.4, RIDGE), rS = S.P(Lg / 2, 0.55, RIDGE);
    const eRN = F.P(32.6, -15.0, EAVE - 0.1), eRS = S.P(Lg + 0.55, 0.55, EAVE - 0.1);
    F.W('rtile', eFN, eFS, rS, rN); F.W('rtile', eRN, eRS, rS, rN);
    B3.strip('wht', -0.5, EAVE - 0.1, 7.3, RIDGE + 0.1, 0.5, 0.28); B3.strip('wht', 15.1, EAVE - 0.1, 7.3, RIDGE + 0.1, 0.5, 0.28);
    F.slab('wht', 32.6, 45.8, 0.05, 0.62, EAVE - 0.28, EAVE - 0.08);
    // ================= south wall (Gainsborough Road): gable end, bands, windows, mural =================
    S.brickQuad([0, 0.03, H0], [Lg, 0.03, H0], [Lg, 0.03, EAVE], [0, 0.03, EAVE]);
    S.brickTri([0, 0.03, EAVE], [Lg, 0.03, EAVE], [Lg / 2, 0.03, RIDGE]);
    S.strip('wht', -0.5, EAVE - 0.1, Lg / 2, RIDGE + 0.1, 0.5, 0.28); S.strip('wht', Lg + 0.5, EAVE - 0.1, Lg / 2, RIDGE + 0.1, 0.5, 0.28);
    S.slab('cream', 0, Lg, 0, 0.1, 3.55, 3.8); S.slab('cream', 0, Lg, 0, 0.1, 5.55, 5.8);
    for (const s of [3.3, 6.9]) { win(S, s, 4.15, 5.35, 1.6, { cols: 2, rows: 1, d: 0.05, sur: 0.13 }); win(S, s - 0.1, 6.55, 7.8, 1.5, { cols: 2, rows: 1, d: 0.05, sur: 0.13 }); }
    S.quad('tMural', [2.6, 0.06, 1.5], [6.3, 0.06, 1.5], [6.3, 0.06, 5.3], [2.6, 0.06, 5.3]);
    S.slab('wht', 2.5, 6.4, 0.04, 0.09, 1.4, 1.5); S.slab('wht', 2.5, 6.4, 0.04, 0.09, 5.3, 5.4);
    // 142 Gallery shopfront and fascia wrapping round the corner
    S.slab('ccream', 0, 6.4, 0.14, 0.26, 2.85, 3.75); S.quad('t142b', [0, 0.28, 2.85], [6.4, 0.28, 2.85], [6.4, 0.28, 3.75], [0, 0.28, 3.75]);
    S.slab('wht', 0, 6.5, 0, 0.5, 3.75, 3.95);
    S.slab('wht', 0, 0.5, 0, 0.18, 0, 2.85);
    S.quad('glass', [0.5, 0.1, 0.45], [6.1, 0.1, 0.45], [6.1, 0.1, 2.85], [0.5, 0.1, 2.85]);
    for (let i = 0; i <= 3; i++) S.slab('charc', 0.5 + i * 1.87 - 0.05, 0.5 + i * 1.87 + 0.05, 0.08, 0.16, 0.45, 2.85);
    S.slab('wht', 0.5, 6.1, 0.08, 0.16, 0.4, 0.5); S.slab('wht', 0, 6.4, 0, 0.12, 0, 0.45);
    for (const [s, y, c] of [[1.5, 1.2, 'mag'], [2.6, 1.7, 'teal'], [3.8, 1.3, 'bunting'], [4.9, 1.8, 'lime'], [5.6, 1.1, 'blueR']]) S.slab(c, s - 0.25, s + 0.25, 0.3, 0.34, y, y + 0.5);
    // ================= north wall (St Andrews Road): windows and the canted corner shop =================
    for (const s of [2.4, 5.2, 8.0]) win(N, s, 4.0, 5.55, 1.0, { cols: 2, rows: 2, d: 0.05 });
    C.slab('wht', 0.2, 3.5, 0, 0.12, 0, 0.4); C.quad('glass', [0.3, 0.1, 0.4], [3.4, 0.1, 0.4], [3.4, 0.1, 2.8], [0.3, 0.1, 2.8]);
    C.slab('purple', 0.2, 3.5, 0.1, 0.22, 2.85, 3.5); C.slab('gold', 0.0, 0.3, 0, 0.25, 0, 3.5); C.slab('gold', 3.4, 3.7, 0, 0.25, 0, 3.5);
    C.slab('cream', 0.0, 3.7, 0, 0.35, 3.5, 3.75);
    win(C, 1.85, 4.0, 5.5, 1.0, { cols: 1, rows: 2, d: 0.05 });
    // flush every pool as a mesh
    for (const [k, G] of Object.entries(A)) { const m = G.mesh(material(k)); if (m) { m.name = 'a11:' + k; K.extra.push(m); } }
  },
};
