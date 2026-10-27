// Area a10-east-quilting-fairstep-coral: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// East side of Hamilton Road south of the Orwell Hotel, from the supplied Street View photos
// (docs/research/hamilton-road-streetview/f-quilting-cancer-research-sense.png, f-sense-original-factory-shop.png,
// f-fairstep-looksharp-saxon.png, f-saxon-favorite-coral.png, f-coral-corner-block.png).
// Everything is drawn as extra meshes in frames laid along each street face. Sizes are estimates scaled from the photos
// (doors, pavement and storey heights for scale), not surveyed. Frame: mkFrame(p0, p1) lays a local frame along a wall,
// s running to the viewer's RIGHT when looking at the wall from outside, d out from the wall, y up from the ground (K.g).
// The base building is extruded plain brick to its height plus a 0.45 m parapet, so walls end at height + 0.45.
// The shared street-edge frame K only counts car roads and picks a back wall here, so each feature builds its own frames
// from the footprint edges (OSM outlines) and uses ctx.pointInRing to find the outward side.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';

const BAY = 3.2, STO = 2.9; // facade texture tile: 3.2 m wide, 2.9 m high
const TE = [1.22, 1.04, 0.9], TI = [1.12, 0.9, 0.8], TB = [1.0, 0.88, 0.7]; // Edwardian orange, interwar red-brown, buff

let MM = null;
function mats(K) {
  if (MM) return MM;
  const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, ...o });
  const bm = K.m.brick, tc = (t, k) => new THREE.Color(t[0] * k, t[1] * k, t[2] * k);
  const bf = Textures.facadeTexture('brick_yellow', false, 62, 0);
  const roof = (kind, col) => { const t = Textures.roofTexture(kind, 5); return std({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, color: col }); };
  MM = {
    brickE: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tc(TE, 1) }),
    brickEd: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tc(TE, 0.8) }),
    brickI: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tc(TI, 1) }),
    brickId: std({ map: bm.map, normalMap: bm.normalMap, roughness: 1, color: tc(TI, 0.78) }),
    buff: std({ map: bf.map, normalMap: bf.normalMap, roughness: 1, color: tc(TB, 1) }),
    brickArch: std({ color: 0x8e4426, roughness: 1 }),
    stone: std({ color: 0xd9d2bf }), cream: std({ color: 0xe9dfc2 }), creamT: std({ color: 0xe3d8b8, roughness: 0.5 }),
    white: std({ color: 0xf2f0ea, roughness: 0.55 }), black: std({ color: 0x1a1b1e, roughness: 0.45, metalness: 0.3 }),
    dark: std({ color: 0x242a2e, roughness: 0.9 }), charcoal: std({ color: 0x2c2e31, roughness: 0.8 }),
    glass: std({ color: 0x586c78, roughness: 0.1, metalness: 0.35 }), glassShop: std({ color: 0x8c9fa9, roughness: 0.15, metalness: 0.2 }),
    glassPale: std({ color: 0x9fb3c1, roughness: 0.12, metalness: 0.25 }),
    blue: std({ color: 0x1f3fbf, roughness: 0.45, metalness: 0.1 }), royal: std({ color: 0x2a2fa6, roughness: 0.5 }),
    navy: std({ color: 0x1d3f96, roughness: 0.5 }), teal: std({ color: 0x4aaed0, roughness: 0.5 }),
    tileBlue: std({ color: 0x1c3fb5, roughness: 0.3 }), posterBlue: std({ color: 0x3f68d0, roughness: 0.6 }),
    wood: std({ color: 0x8a5a3c, roughness: 0.8 }), woodDk: std({ color: 0x4a3322, roughness: 0.8 }),
    red: std({ color: 0xc4202b, roughness: 0.6 }), yellow: std({ color: 0xf1e24a, roughness: 0.7 }), lightBlue: std({ color: 0x6ea8e0, roughness: 0.7 }),
    tile: roof('clay', 0xe0a98a), tileDk: roof('clay', 0xc89478), brown: std({ color: 0x33251d, roughness: 0.6 }),
    deck: std({ color: 0x55585b, roughness: 0.95 }),
  };
  return MM;
}

function makeKit(K) {
  const geos = {}, M = mats(K);
  return {
    geo: (k) => { if (!M[k]) throw new Error('a10: no material ' + k); return geos[k] || (geos[k] = new Geo()); },
    flush() { for (const k of Object.keys(geos)) { const m = geos[k].mesh(M[k]); if (m) { m.name = 'a10:' + k; K.extra.push(m); } } },
  };
}
function kitQuad(a, b, c, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- frames
function mkFrame(K, ctx, kit, p0, p1) {
  let L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / L, uz = (p1[1] - p0[1]) / L;
  const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
  let nx = uz, nz = -ux;
  if (ctx.pointInRing(mx + nx * 0.4, mz + nz * 0.4, ctx.ring)) { nx = -nx; nz = -nz; }
  if (ux * nz - uz * nx < 0) { const t = p0; p0 = p1; p1 = t; ux = -ux; uz = -uz; } // s runs to the viewer's right
  const g = K.g;
  const P = (s, d, y) => [p0[0] + ux * s + nx * d, g + y, p0[1] + uz * s + nz * d];
  const F = { P, L, ux, uz, nx, nz, p0 };
  F.box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); kit.geo(k).box(p[0], p[1], p[2], ux, uz, hs, hy, hd); };
  F.rect = (k, s0, s1, d, y0, y1, uv) => kit.geo(k).quad(P(s0, d, y0), P(s1, d, y0), P(s1, d, y1), P(s0, d, y1), uv);
  F.brick = (k, s0, s1, d, y0, y1) => F.rect(k, s0, s1, d, y0, y1, [[s0 / BAY, y0 / STO], [s1 / BAY, y0 / STO], [s1 / BAY, y1 / STO], [s0 / BAY, y1 / STO]]);
  F.tri = (k, a, b, c) => kit.geo(k).tri(P(...a), P(...b), P(...c));
  F.fan = (k, s, yc, r, d, n = 10) => { for (let i = 0; i < n; i++) { const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n); kit.geo(k).tri(P(s, d, yc), P(s + r * Math.cos(a0), d, yc + r * Math.sin(a0)), P(s + r * Math.cos(a1), d, yc + r * Math.sin(a1))); } };
  /** rectangular sash window: frame, glass, bars, stone sill, optional lintel. s centre, yc centre height. */
  F.win = (s, yc, w, h, o = {}) => {
    const fk = o.frame || 'white', ft = o.ft || 0.06, gl = o.glass || 'glass', d = o.d || 0.05;
    F.rect(gl, s - w / 2, s + w / 2, d, yc - h / 2, yc + h / 2);
    F.box(fk, s, d + 0.025, yc + h / 2 - ft / 2, w / 2, 0.04, ft / 2); F.box(fk, s, d + 0.025, yc - h / 2 + ft / 2, w / 2, 0.04, ft / 2);
    F.box(fk, s - w / 2 + ft / 2, d + 0.025, yc, ft / 2, 0.04, h / 2); F.box(fk, s + w / 2 - ft / 2, d + 0.025, yc, ft / 2, 0.04, h / 2);
    const nv = o.v ?? 2; for (let i = 1; i < nv; i++) F.box(fk, s - w / 2 + (w * i) / nv, d + 0.03, yc, ft / 3, 0.04, h / 2);
    for (const f of o.hbar ?? [0.5]) F.box(fk, s, d + 0.03, yc - h / 2 + h * f, w / 2, 0.04, ft / 3);
    if (o.sill !== false) F.box(o.sill || 'stone', s, d + 0.06, yc - h / 2 - 0.04, w / 2 + 0.1, 0.1, 0.035);
    if (o.lintel) F.box(o.lintel, s, d + 0.02, yc + h / 2 + 0.11, w / 2 + 0.1, 0.05, 0.1);
  };
  /** arched sash window between brick pilasters: s centre, y0 sill height, h total height including the arch. */
  F.awin = (s, y0, w, h, o = {}) => {
    const hw = w / 2, yc = y0 + h - hw, fk = o.frame || 'white', gi = hw - 0.07;
    F.rect('brickArch', s - hw - 0.17, s + hw + 0.17, 0.03, y0 - 0.02, yc); F.fan('brickArch', s, yc, hw + 0.17, 0.03);
    F.rect(fk, s - hw, s + hw, 0.045, y0, yc); F.fan(fk, s, yc, hw, 0.045);
    F.rect('glass', s - gi, s + gi, 0.055, y0 + 0.07, yc); F.fan('glass', s, yc, gi, 0.055);
    F.box(fk, s, 0.075, (y0 + yc + hw) / 2, 0.025, 0.02, (yc + hw - y0) / 2);                 // centre mullion
    F.box(fk, s, 0.075, y0 + (yc - y0) * 0.45, hw, 0.02, 0.025);                                 // meeting rail
    F.box(fk, s, 0.075, yc, hw, 0.02, 0.022);                                                    // spring bar
    F.box('stone', s, 0.1, y0 - 0.05, hw + 0.22, 0.1, 0.04);
  };
  /** shopfront bay: dark back panel (hides any generated door), glazing with mullions, plinth. */
  F.shopWin = (s0, s1, y0, y1, o = {}) => {
    const fk = o.frame || 'white', ft = o.ft || 0.07, w = s1 - s0, n = Math.max(1, Math.round(w / (o.pane || 1.2)));
    F.rect(o.back || 'dark', s0, s1, 0.06, 0.02, y1 + 0.05);
    F.rect(o.glass || 'glassShop', s0, s1, 0.075, y0, y1);
    for (let i = 0; i <= n; i++) F.box(fk, s0 + (w * i) / n, 0.1, (y0 + y1) / 2, ft / 2, 0.05, (y1 - y0) / 2 + ft / 2);
    F.box(fk, (s0 + s1) / 2, 0.1, y1, w / 2, 0.05, ft / 2); F.box(fk, (s0 + s1) / 2, 0.1, y0, w / 2, 0.05, ft / 2);
    if (o.transom) F.box(fk, (s0 + s1) / 2, 0.1, o.transom, w / 2, 0.04, ft / 3);
    if (o.bulk === 'brick') F.brick('brickE', s0, s1, 0.09, 0.02, y0 - 0.02); else if (o.bulk) F.rect(o.bulk, s0, s1, 0.09, 0.02, y0 - 0.02);
  };
  /** painted sign board with lettering, as a separate textured mesh. spec: { bg, edge, rects: [{ x0, y0, x1, y1, c }], items: [{ t, x, y, size, color, weight, italic, font, align }] } */
  F.sign = (spec, s0, s1, d, y0, y1, depth = 0.14) => {
    F.box(spec.edge || 'navy', (s0 + s1) / 2, d - depth / 2, (y0 + y1) / 2, (s1 - s0) / 2, depth / 2, (y1 - y0) / 2);
    if (typeof document === 'undefined') return;
    const cw = 1024, ch = Math.max(64, Math.round(cw * (y1 - y0) / (s1 - s0)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    x.fillStyle = spec.bg; x.fillRect(0, 0, cw, ch);
    for (const r of spec.rects || []) { x.fillStyle = r.c; x.fillRect(r.x0 * cw, r.y0 * ch, (r.x1 - r.x0) * cw, (r.y1 - r.y0) * ch); }
    for (const it of spec.items) {
      const px = Math.round(ch * it.size); x.font = `${it.italic ? 'italic ' : ''}${it.weight || 'bold'} ${px}px ${it.font || 'Georgia, "Times New Roman", serif'}`;
      x.fillStyle = it.color; x.textAlign = it.align || 'center'; x.textBaseline = 'middle'; x.fillText(it.t, it.x * cw, it.y * ch);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const q = kitQuad(P(s0, d + 0.005, y0), P(s1, d + 0.005, y0), P(s1, d + 0.005, y1), P(s0, d + 0.005, y1));
    const mesh = new THREE.Mesh(q, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.name = 'a10:sign'; K.extra.push(mesh);
  };
  return F;
}

const SANS = 'Arial, Helvetica, sans-serif';
const wuv = (p) => [p[0] / 2, p[2] / 2];
/** brick-textured triangle in a vertical plane (world points [x,y,z]); u runs along (dx,dz). */
function brickTri(kit, key, a, b, c, dx, dz) {
  const uv = (p) => [(p[0] * dx + p[2] * dz) / BAY, p[1] / STO];
  kit.geo(key).quad(a, b, c, c, [uv(a), uv(b), uv(c), uv(c)]);
}
function chimney(kit, K, x, z, ux, uz, yBase, yTop) {
  const gy = K.g, g = kit.geo('brickE'); g.box(x, gy + (yBase + yTop) / 2, z, ux, uz, 0.4, (yTop - yBase) / 2, 0.32);
  kit.geo('stone').box(x, gy + yTop + 0.05, z, ux, uz, 0.47, 0.06, 0.39);
  for (const o of [-0.17, 0.17]) kit.geo('tileDk').box(x + ux * o, gy + yTop + 0.38, z + uz * o, ux, uz, 0.08, 0.28, 0.08);
}

// ================================================================ Edwardian range: KIS Quilting, Cancer Research UK, Sense (506379227)
function edwardian(K, it, ctx) {
  const kit = makeKit(K), WT = 6.6 + 0.45;
  const F = mkFrame(K, ctx, kit, [168.8, -767.5], [166.3, -747.0]), L = F.L; // s from the north (passage) end
  const SK = 0.042, Q = (s, d, y) => F.P(s - SK * d, d, y); // the side walls lean 2.4 degrees off square to the street face
  // ---- the north 6.2 m: passage wall and the passage itself (in the photo a brick wall with a gate pier and a timber-lined opening)
  F.brick('brickE', 0, 6.2, 0.03, 0, WT);
  F.rect('dark', 3.95, 6.05, 0.06, 0, 2.95); F.rect('woodDk', 3.95, 6.05, 0.07, 2.95, 3.5);
  F.box('brickEd', 3.7, 0.12, 1.1, 0.28, 0.14, 1.1); F.box('stone', 3.7, 0.12, 2.28, 0.34, 0.18, 0.06); // gate pier
  F.rect('white', 5.0, 5.7, 0.07, 0, 2.3);
  // ---- ground floor cover and the cream tile piers
  F.rect('charcoal', 6.2, L, 0.04, 0, 3.7);
  F.box('creamT', 10.65, 0.1, 1.55, 0.3, 0.06, 1.55); F.box('creamT', 16.45, 0.1, 1.55, 0.4, 0.06, 1.55); F.box('creamT', L - 0.12, 0.1, 1.55, 0.15, 0.06, 1.55);
  F.box('charcoal', 6.55, 0.1, 1.55, 0.35, 0.07, 1.55);
  // ---- KIS Quilting (s 6.2..10.9): timber fascia, window, black security grille
  F.shopWin(7.0, 9.35, 0.45, 2.75, { frame: 'woodDk', pane: 1.2, glass: 'glassShop', back: 'dark', bulk: 'wood' });
  F.shopWin(9.5, 10.4, 0.05, 2.75, { frame: 'black', pane: 0.15, glass: 'dark', back: 'dark', ft: 0.04 });
  F.sign({ bg: '#8a5a3c', edge: 'wood', items: [{ t: 'K.I.S', x: 0.5, y: 0.2, size: 0.2, color: '#f1e6d2', weight: 'normal', font: SANS }, { t: 'Quilting', x: 0.5, y: 0.62, size: 0.46, color: '#f6ede0', italic: true }] }, 6.9, 10.5, 0.24, 2.85, 3.7, 0.2);
  // ---- Cancer Research UK (s 10.9..16.1): blue fascia over a recessed entrance and a blue-framed window
  F.shopWin(11.1, 12.8, 0.05, 2.75, { frame: 'royal', pane: 0.85, glass: 'glassPale', back: 'dark' });
  F.shopWin(13.0, 16.0, 0.4, 2.75, { frame: 'royal', ft: 0.09, pane: 1.5, glass: 'glassShop', back: 'dark' });
  F.rect('royal', 13.0, 16.0, 0.09, 0.02, 0.4);
  F.sign({ bg: '#2a2fa6', edge: 'royal', items: [{ t: 'C', x: 0.55, y: 0.5, size: 0.62, color: '#ffffff', font: SANS }, { t: 'CANCER RESEARCH UK', x: 0.69, y: 0.5, size: 0.3, color: '#ffffff', font: SANS }] }, 10.9, 16.1, 0.24, 2.85, 3.7, 0.2);
  // ---- Sense (s 16.8..20.65): glazed door, window, white fascia with an orange 'charity store' tab
  F.shopWin(16.85, 17.7, 0.05, 2.75, { frame: 'white', pane: 0.85, glass: 'glassPale', back: 'dark' });
  F.shopWin(17.9, 20.4, 0.4, 2.75, { frame: 'white', pane: 1.25, glass: 'glassShop', back: 'dark' });
  F.sign({ bg: '#f4f2ee', edge: 'white', rects: [{ x0: 0.62, y0: 0.18, x1: 0.97, y1: 0.82, c: '#f26f3a' }], items: [{ t: 'sense', x: 0.3, y: 0.46, size: 0.52, color: '#4a2f6b', font: SANS }, { t: 'charity store', x: 0.8, y: 0.5, size: 0.24, color: '#ffffff', weight: 'normal', font: SANS }] }, 16.8, 20.6, 0.24, 2.85, 3.7, 0.2);
  // ---- canopy over the shopfronts and the cream fascia band above it
  F.box('dark', (6.2 + L) / 2, 0.45, 3.78, (L - 6.2) / 2, 0.45, 0.08);
  F.box('cream', (6.2 + L) / 2, 0.2, 4.4, (L - 6.2) / 2, 0.2, 0.55);
  F.box('stone', (6.2 + L) / 2, 0.23, 4.97, (L - 6.2) / 2, 0.22, 0.04);
  // ---- first floor: five arched sashes between brick pilasters (plus one over the passage)
  const pil = (s0, s1) => { F.brick('brickE', s0, s1, 0.13, 4.97, WT - 0.05); F.box('stone', (s0 + s1) / 2, 0.1, WT - 0.1, (s1 - s0) / 2 + 0.05, 0.13, 0.05); F.box('stone', (s0 + s1) / 2, 0.1, 5.05, (s1 - s0) / 2 + 0.03, 0.13, 0.04); };
  for (const [a, b] of [[10.2, 10.8], [12.9, 13.5], [15.7, 16.3], [18.0, 18.55], [19.95, 20.45]]) pil(a, b);
  for (const [s, w] of [[4.4, 1.2], [8.4, 1.7], [11.6, 0.8], [14.5, 1.35], [17.0, 0.7], [19.1, 1.05]]) F.awin(s, 5.1, w, 1.7);
  F.box('stone', L / 2, 0.06, WT - 0.15, L / 2, 0.08, 0.04);
  // ---- roof: clay tiles, gabled to the north, hipped to the south; ridge parallel to the street. Eaves at the parapet top.
  const hw = 5.3, rise = 3.3, sl = rise / hw, oh = 0.3, yE = WT - sl * oh, yR = WT + rise, tg = kit.geo('tile');
  const pt = (s, d, y) => Q(s, d, y);
  const EN = pt(-0.25, oh, yE), ES = pt(L + oh, oh, yE), RS = pt(L - hw, -hw, yR), RN = pt(-0.25, -hw, yR), BN = pt(-0.25, -2 * hw - oh, yE), BS = pt(L + oh, -2 * hw - oh, yE);
  tg.quad(EN, ES, RS, RN, [wuv(EN), wuv(ES), wuv(RS), wuv(RN)]);
  tg.quad(BN, BS, RS, RN, [wuv(BN), wuv(BS), wuv(RS), wuv(RN)]);
  tg.quad(ES, BS, RS, RS, [wuv(ES), wuv(BS), wuv(RS), wuv(RS)]);
  brickTri(kit, 'brickE', pt(0, 0.02, WT - 0.02), pt(0, -2 * hw, WT - 0.02), pt(0, -hw, yR), F.ux, F.uz); // north gable end
  const wb = kit.geo('white'); // bargeboards on the north rakes
  for (const [a, b] of [[EN, RN], [BN, RN]]) wb.quad(a, b, [b[0], b[1] - 0.28, b[2]], [a[0], a[1] - 0.28, a[2]]);
  kit.geo('dark').box(...[0.5 * (EN[0] + ES[0]), 0.5 * (EN[1] + ES[1]) - 0.07, 0.5 * (EN[2] + ES[2])], F.ux, F.uz, (L + 0.6) / 2, 0.06, 0.06); // gutter
  // brick cross gable with timber bargeboards on the wall plane (photo: window in the gable, white bargeboards)
  { const s = 11.45, gw = 1.45, gr = 2.5, ap = WT + gr;
    brickTri(kit, 'brickE', F.P(s - gw, 0.02, WT - 0.02), F.P(s + gw, 0.02, WT - 0.02), F.P(s, 0.02, ap), F.ux, F.uz);
    F.win(s, WT + 1.0, 0.9, 1.15, { frame: 'white', sill: 'stone', v: 1, hbar: [0.5] });
    for (const sd of [-1, 1]) { const a = F.P(s + sd * (gw + 0.12), 0.22, WT - 0.08), b = F.P(s, 0.22, ap + 0.1); wb.quad(a, b, [b[0], b[1] - 0.3, b[2]], [a[0], a[1] - 0.3, a[2]]); }
    const dv = gr / sl;
    for (const sd of [-1, 1]) { const a = F.P(s + sd * gw, 0.08, WT - 0.03), b = F.P(s, 0.08, ap + 0.05), c = F.P(s, -dv, ap + 0.05); tg.quad(a, b, c, c, [wuv(a), wuv(b), wuv(c), wuv(c)]); }
  }
  // two pitched dormers on the front slope (white faces, tile cheeks and roofs)
  for (const [s, w] of [[8.4, 1.3], [14.4, 1.5]]) {
    const i0 = 0.6, yb = WT + i0 * sl - 0.1, yt = yb + 1.35, yr = yt + 0.6, a = s - w / 2, b = s + w / 2, dF = -i0, dS = -(yt - WT) / sl, dE = -(yr - WT) / sl;
    F.rect('white', a, b, dF, yb, yt); F.tri('white', [a, dF, yt], [b, dF, yt], [s, dF, yr]);
    F.rect('glass', a + 0.2, b - 0.2, dF + 0.03, yb + 0.15, yt - 0.12); F.box('white', s, dF + 0.04, (yb + yt) / 2, 0.025, 0.02, (yt - yb) / 2 - 0.12);
    for (const x of [a, b]) tg.quad(F.P(x, dF, yb), F.P(x, dF, yt), F.P(x, dS, yt), F.P(x, dS, yb));
    const q = (s0, d0, y0) => F.P(s0, d0, y0);
    tg.quad(q(a - 0.1, dF + 0.1, yt), q(s, dF + 0.1, yr + 0.05), q(s, dE, yr + 0.05), q(a - 0.1, dS, yt));
    tg.quad(q(s, dF + 0.1, yr + 0.05), q(b + 0.1, dF + 0.1, yt), q(b + 0.1, dS, yt), q(s, dE, yr + 0.05));
  }
  for (const s of [9.0, 11.2]) { const p = Q(s, -4.7, 0); chimney(kit, K, p[0], p[2], F.ux, F.uz, WT + sl * 4.7 - 0.5, WT + 5.2); }
  kit.flush();
}

// ================================================================ The Original Factory Shop (732472254)
function factory(K, it, ctx) {
  const kit = makeKit(K), WT = 6.5 + 0.45;
  const F = mkFrame(K, ctx, kit, [166.3, -747.0], [163.9, -732.3]), L = F.L;
  // ground floor: blue fascia strip, central entrance sign, glazing, white end piers
  F.rect('white', 0, L, 0.04, 0, 3.6);
  F.shopWin(0.7, 4.55, 0.25, 2.8, { frame: 'white', pane: 1.9, glass: 'glassPale', back: 'dark', ft: 0.08 });
  F.shopWin(4.85, 8.95, 0.05, 2.8, { frame: 'white', pane: 1.0, glass: 'glassShop', back: 'dark', ft: 0.08 });
  F.shopWin(9.2, 12.3, 0.25, 2.8, { frame: 'white', pane: 1.55, glass: 'glassPale', back: 'dark', ft: 0.08 });
  F.rect('navy', 0.45, 12.5, 0.13, 2.85, 3.6);
  F.box('navy', 6.475, 0.1, 3.22, 6.03, 0.1, 0.38);
  F.sign({ bg: '#1d3f96', edge: 'navy', rects: [{ x0: 0.77, y0: 0.2, x1: 0.97, y1: 0.55, c: '#f1e24a' }], items: [{ t: 'the original', x: 0.38, y: 0.24, size: 0.2, color: '#ffffff', font: SANS }, { t: 'factory shop', x: 0.38, y: 0.5, size: 0.24, color: '#ffffff', font: SANS }, { t: '70%', x: 0.87, y: 0.38, size: 0.22, color: '#1d3f96', font: SANS }, { t: 'welcome', x: 0.5, y: 0.82, size: 0.18, color: '#ffffff', weight: 'normal', font: SANS }] }, 4.7, 9.1, 0.24, 2.6, 3.65, 0.2);
  F.rect('posterBlue', 13.1, 14.45, 0.07, 0.7, 2.7); F.rect('white', 13.25, 14.3, 0.08, 2.0, 2.45);
  // first floor: glazed band with a white frame, banners over it
  F.rect('glassPale', 0.4, 11.9, 0.06, 3.7, 6.25);
  for (let s = 0.4; s <= 11.95; s += 1.925) F.box('white', s, 0.09, 4.97, 0.04, 0.05, 1.28);
  F.box('white', 6.15, 0.09, 6.2, 5.75, 0.05, 0.05); F.box('white', 6.15, 0.09, 3.72, 5.75, 0.05, 0.05);
  const BAN = [['big brands', 'up to 70% off', '#f1e24a', '#1d3f96'], ['fashion, beauty,', 'home & more', '#6ea8e0', '#ffffff'], ['new ranges in store', 'every week', '#f1e24a', '#1d3f96'], ['open', '7 days a week', '#6ea8e0', '#ffffff'], ['big brands', 'up to 70% off', '#f1e24a', '#1d3f96'], ['fashion, beauty,', 'home & more', '#6ea8e0', '#ffffff']];
  BAN.forEach(([t1, t2, bg, fg], i) => { const s0 = 0.45 + i * 1.92; F.sign({ bg, edge: 'white', items: [{ t: t1, x: 0.5, y: 0.34, size: 0.2, color: fg, font: SANS }, { t: t2, x: 0.5, y: 0.7, size: 0.2, color: fg, font: SANS }] }, s0, s0 + 1.86, 0.14, 3.75, 5.15, 0.05); });
  // white parapet fascia over the glazing, blank white render on the right-hand part
  F.box('white', 6.2, 0.25, 6.75, 6.4, 0.25, 0.3);
  F.box('white', L - 1.7, 0.12, 5.0, 1.6, 0.1, 1.5);
  F.box('white', 0.12, 0.1, 1.8, 0.14, 0.08, 1.8);
  kit.flush();
}

// ================================================================ interwar block: Fairstep, Look Sharp, Saxon Upholstery (732472255)
function fairstep(K, it, ctx) {
  const kit = makeKit(K), WT = 8.6 + 0.45;
  const F = mkFrame(K, ctx, kit, [163.9, -732.3], [160.1, -709.4]), L = F.L;
  F.rect('creamT', 0, L, 0.04, 0, 3.7);
  // ---- Fairstep Solicitors (s 0..6.4): stone pier, light-blue framed window and door under a white fascia
  F.box('stone', 0.4, 0.12, 1.85, 0.4, 0.07, 1.85);
  F.shopWin(0.9, 3.6, 0.35, 2.75, { frame: 'teal', ft: 0.09, pane: 1.35, glass: 'glassShop', back: 'dark' });
  F.shopWin(3.8, 5.5, 0.05, 2.75, { frame: 'teal', ft: 0.09, pane: 0.85, glass: 'glassPale', back: 'dark' });
  F.rect('teal', 0.9, 3.6, 0.09, 0.02, 0.35);
  F.sign({ bg: '#f3f6f8', edge: 'white', items: [{ t: 'F', x: 0.07, y: 0.5, size: 0.62, color: '#1f7fb6', font: SANS }, { t: 'FAIRSTEP SOLICITORS', x: 0.55, y: 0.5, size: 0.3, color: '#1f7fb6', font: SANS }] }, 0.3, 6.2, 0.24, 2.85, 3.7, 0.2);
  // ---- Look Sharp (s 6.4..14.0): black fascia, two black-bulkhead windows round a recessed door, white flat door to the right
  F.box('stone', 6.5, 0.12, 1.85, 0.2, 0.07, 1.85);
  F.shopWin(6.8, 9.0, 0.75, 2.75, { frame: 'black', ft: 0.06, pane: 1.1, glass: 'glassShop', back: 'dark', bulk: 'black' });
  F.shopWin(9.2, 10.4, 0.05, 2.75, { frame: 'black', ft: 0.06, pane: 1.2, glass: 'glassPale', back: 'dark' });
  F.shopWin(10.6, 12.6, 0.75, 2.75, { frame: 'black', ft: 0.06, pane: 1.0, glass: 'glassShop', back: 'dark', bulk: 'black' });
  F.rect('white', 12.9, 13.95, 0.07, 0, 2.35); F.box('stone', 13.42, 0.09, 2.45, 0.62, 0.05, 0.07); F.box('stone', 12.82, 0.09, 1.2, 0.08, 0.05, 1.2); F.box('stone', 14.0, 0.09, 1.2, 0.08, 0.05, 1.2);
  F.sign({ bg: '#121214', edge: 'black', rects: [{ x0: 0.025, y0: 0.18, x1: 0.115, y1: 0.82, c: '#f1efe9' }], items: [{ t: 'LS', x: 0.07, y: 0.5, size: 0.4, color: '#121214', font: SANS }, { t: 'Look Sharp', x: 0.5, y: 0.4, size: 0.5, color: '#ffffff', font: SANS }, { t: 'TRADITIONAL TURKISH BARBER', x: 0.5, y: 0.82, size: 0.14, color: '#d8d6d0', weight: 'normal', font: SANS }] }, 6.5, 12.7, 0.24, 2.85, 3.7, 0.2);
  // ---- Saxon Upholstery & Interiors (s 14.2..22.9): cream fascia, brick pier, big window, door
  F.box('creamT', 14.4, 0.1, 1.85, 0.4, 0.07, 1.85);
  F.brick('brickI', 15.0, 16.3, 0.07, 0, 2.8);
  F.shopWin(16.5, 20.1, 0.55, 2.8, { frame: 'white', ft: 0.07, pane: 3.6, glass: 'glassShop', back: 'dark', bulk: 'creamT' });
  F.shopWin(20.35, 21.7, 0.05, 2.8, { frame: 'woodDk', ft: 0.07, pane: 0.7, glass: 'glass', back: 'dark' });
  F.box('creamT', 22.5, 0.1, 1.85, 0.55, 0.07, 1.85);
  F.sign({ bg: '#e9dfc4', edge: 'creamT', items: [{ t: 'Saxon Upholstery & Interiors', x: 0.45, y: 0.5, size: 0.4, color: '#33261b', weight: 'normal', italic: true, font: 'Georgia, "Times New Roman", serif' }] }, 14.4, 22.3, 0.24, 2.85, 3.7, 0.2);
  // ---- stone string course above the shopfronts
  F.box('stone', L / 2, 0.12, 3.84, L / 2 - 0.03, 0.12, 0.13);
  // ---- brick bands between window groups
  for (const s of [6.9, 14.3, 22.8]) F.brick('brickId', s - 0.2, s + 0.2, 0.06, 3.96, 8.0);
  // ---- two rows of white sashes: stone sills, soldier-course lintels with a cream keystone over the first-floor row
  const W = [[1.5, 1.5], [3.3, 1.0], [5.2, 1.6], [8.0, 1.6], [10.1, 1.1], [12.2, 1.8], [15.4, 1.9], [17.8, 1.4], [20.2, 2.2]];
  for (const [s, w] of W) {
    F.win(s, 4.9, w, 1.5, { frame: 'white', glass: 'glass', v: Math.max(2, Math.round(w / 0.55)), hbar: [0.33, 0.66], sill: 'stone' });
    F.box('brickId', s, 0.04, 5.9, w / 2 + 0.1, 0.04, 0.13); F.box('stone', s, 0.07, 5.92, 0.12, 0.05, 0.2);
    F.win(s, 7.27, w, 1.4, { frame: 'white', glass: 'glass', v: Math.max(2, Math.round(w / 0.55)), hbar: [0.5], sill: 'stone' });
  }
  // ---- stone cornice with dentils, brick parapet above, stone attic panels
  F.box('stone', L / 2, 0.25, 8.35, L / 2 + 0.1, 0.27, 0.22);
  for (let s = 0.2; s < L; s += 0.4) F.box('stone', s, 0.12, 8.08, 0.09, 0.1, 0.07);
  F.box('stone', L / 2, 0.08, WT - 0.02, L / 2, 0.14, 0.04);
  for (const [s, w] of [[3.8, 1.7], [10.0, 1.7], [16.9, 1.8], [21.8, 1.4]]) { F.box('stone', s, 0.1, WT + 0.22, w / 2, 0.1, 0.23); F.box('stone', s, 0.1, WT + 0.47, w / 2 + 0.05, 0.12, 0.04); }
  kit.flush();
}

// ================================================================ Favorite Chicken, Coral: the buff-brick corner block (732472256)
function coral(K, it, ctx) {
  const kit = makeKit(K), WT = 6.0 + 0.45;
  const FH = mkFrame(K, ctx, kit, [160.1, -709.4], [158.2, -696.0]);   // Hamilton Road face, 13.5 m
  const FC = mkFrame(K, ctx, kit, [158.2, -696.0], [160.8, -693.1]);   // angled corner, 3.9 m
  const FS = mkFrame(K, ctx, kit, [160.8, -693.1], [172.9, -693.9]);   // St Andrew's Road face, 12.1 m
  const FE = mkFrame(K, ctx, kit, [172.9, -693.9], [175.0, -706.7]);   // back (east) face
  for (const F of [FH, FC, FS]) F.brick('buff', 0, F.L, 0.03, 0, 3.7);
  const band = (F) => F.box('white', F.L / 2, 0.15, 6.75, F.L / 2 + 0.2, 0.2, 0.4);
  for (const F of [FH, FC, FS, FE]) band(F);
  const win = (F, s) => F.win(s, 5.5, 1.2, 1.4, { frame: 'white', glass: 'glassPale', v: 1, hbar: [0.62], sill: 'stone', ft: 0.07 });
  for (const s of [1.8, 4.0, 6.1, 8.2, 10.2, 12.1]) win(FH, s);
  win(FC, 1.95);
  for (const s of [1.4, 4.4, 7.4, 10.4]) win(FS, s);
  // ---- Hamilton Road face: Favorite (s 0..5.5), then Coral
  FH.box('charcoal', 0.35, 0.1, 1.85, 0.35, 0.06, 1.85);
  FH.shopWin(0.7, 3.7, 0.45, 2.8, { frame: 'black', ft: 0.06, pane: 1.5, glass: 'glass', back: 'dark', bulk: 'charcoal' });
  FH.shopWin(3.9, 5.1, 0.05, 2.8, { frame: 'black', ft: 0.06, pane: 0.6, glass: 'glassShop', back: 'dark' });
  FH.box('charcoal', 5.3, 0.1, 1.85, 0.2, 0.06, 1.85);
  for (const [a, b, c] of [[2.45, 3.0, 'white'], [3.1, 3.65, 'red']]) FH.rect(c, a, b, 0.09, 1.1, 2.3);
  FH.sign({ bg: '#f6f4f0', edge: 'white', rects: [{ x0: 0, y0: 0.62, x1: 1, y1: 1, c: '#c4202b' }, { x0: 0, y0: 0, x1: 0.05, y1: 1, c: '#c4202b' }], items: [{ t: 'FAVORITE', x: 0.58, y: 0.3, size: 0.4, color: '#1d3e9e', italic: true, font: SANS }, { t: "Britain's Tastiest Chicken!", x: 0.55, y: 0.81, size: 0.17, color: '#ffffff', font: SANS }] }, 0.1, 5.3, 0.34, 2.85, 4.0, 0.3);
  FH.rect('tileBlue', 5.6, 10.4, 0.1, 0.02, 0.55);
  FH.shopWin(5.6, 10.4, 0.55, 2.8, { frame: 'white', ft: 0.07, pane: 1.2, glass: 'glassPale', back: 'dark' });
  for (const a of [6.15, 7.5, 8.75]) FH.rect('posterBlue', a, a + 0.75, 0.11, 0.9, 2.4);
  FH.box('tileBlue', 10.9, 0.1, 1.85, 0.4, 0.07, 1.85);
  FH.shopWin(11.4, 13.3, 0.55, 2.8, { frame: 'white', ft: 0.07, pane: 0.95, glass: 'glassPale', back: 'dark' });
  FH.sign({ bg: '#1f3fbf', edge: 'blue', items: [{ t: 'CORAL', x: 0.38, y: 0.5, size: 0.62, color: '#ffffff', font: SANS }] }, 5.4, 13.5, 0.3, 2.85, 3.85, 0.26);
  // ---- the angled corner: glazed double door, blue fascia, blade sign
  FC.shopWin(0.6, 3.3, 0.05, 2.8, { frame: 'blue', ft: 0.08, pane: 1.35, glass: 'glassShop', back: 'dark' });
  FC.sign({ bg: '#1f3fbf', edge: 'blue', items: [{ t: 'CORAL', x: 0.5, y: 0.5, size: 0.62, color: '#ffffff', font: SANS }] }, 0, FC.L, 0.3, 2.85, 3.85, 0.26);
  FC.box('blue', 3.3, 0.45, 4.5, 0.03, 0.4, 0.45); FC.box('white', 3.3, 0.45, 4.5, 0.04, 0.3, 0.3);
  // ---- St Andrew's Road face: long plate-glass shopfront on a blue tile plinth, door, brick return
  FS.rect('tileBlue', 0.3, 9.7, 0.1, 0.02, 0.55);
  FS.shopWin(0.3, 5.3, 0.55, 2.8, { frame: 'white', ft: 0.07, pane: 1.25, glass: 'glassPale', back: 'dark' });
  FS.shopWin(5.5, 7.4, 0.05, 2.8, { frame: 'white', ft: 0.08, pane: 0.95, glass: 'glassShop', back: 'dark' });
  FS.shopWin(7.6, 9.6, 0.55, 2.8, { frame: 'white', ft: 0.07, pane: 1.0, glass: 'glassPale', back: 'dark' });
  FS.box('tileBlue', 9.95, 0.1, 1.85, 0.35, 0.07, 1.85);
  for (const a of [1.2, 2.6]) FS.rect('posterBlue', a, a + 0.8, 0.11, 0.9, 2.4);
  FS.sign({ bg: '#1f3fbf', edge: 'blue', items: [{ t: 'CORAL', x: 0.3, y: 0.5, size: 0.62, color: '#ffffff', font: SANS }, { t: 'CORAL', x: 0.9, y: 0.5, size: 0.55, color: '#ffffff', font: SANS }] }, 0, FS.L - 0.1, 0.3, 2.85, 3.85, 0.26);
  kit.flush();
}

export const FEATURES = { a10Edwardian: edwardian, a10Factory: factory, a10Fairstep: fairstep, a10Coral: coral };
