// Felixstowe Leisure Centre, Undercliff Road West (OSM way 91786059), next to the pier.
// Form from a street-level photo supplied by the user (Google Street View, 2019): red-brick walls set
// back behind a colonnade of dark posts under deep brown-tiled hipped roofs; a raised clerestory with a
// band of red-framed windows under a second hipped roof; a glazed, red-framed entrance front with a
// blue fascia lettered FELIXSTOWE LEISURE CENTRE. Footprint from OSM; overall height from EA LiDAR
// (90th percentile 11.6 m above ground). Proportions are estimates; no imagery is reproduced.

import * as THREE from 'three';
import { ensureCCW, insetRing } from '../geo/polygon.js';
import { makeKit } from './geo-kit.js';

export const isLeisureCentre = (b) => b.id === 91786059 || /^felixstowe leisure centre$/i.test(b.name || '');

const Y = { eave: 3.5, fascia: 0.5, lowerInset: 5.2, pitch: 24, clerestoryTop: 8.1, colonnade: 1.9 };

let M = null;
function mats() {
  if (M) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const cnv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const clere = cnv(256, 128, (g, w, h) => { // one 4 m bay: white upper panel over dark glazing, red frames
    g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, w, h); g.fillStyle = '#26303d'; g.fillRect(8, h * 0.42, w - 16, h * 0.5);
    g.fillStyle = 'rgba(160,180,200,0.25)'; g.fillRect(8, h * 0.42, w - 16, 8);
    g.strokeStyle = '#a2262b'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.beginPath(); g.moveTo(5, h * 0.42); g.lineTo(w - 5, h * 0.42); g.moveTo(w / 2, h * 0.42); g.lineTo(w / 2, h - 5); g.stroke();
  });
  const entrance = cnv(512, 160, (g, w, h) => { // red-framed glazed front with posters
    g.fillStyle = '#3a4652'; g.fillRect(0, 0, w, h); let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6; i++) { const x = i * (w / 6); g.fillStyle = i % 2 ? '#dfe3e6' : `hsl(${r() * 360},45%,${55 + r() * 20}%)`; g.fillRect(x + 10, h * 0.25, w / 6 - 20, h * 0.68); }
    g.fillStyle = 'rgba(200,215,230,0.18)'; g.fillRect(0, 0, w, h * 0.22);
    g.strokeStyle = '#a2262b'; g.lineWidth = 8; for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(i * w / 6, 0); g.lineTo(i * w / 6, h); g.stroke(); }
    g.beginPath(); g.moveTo(0, h * 0.22); g.lineTo(w, h * 0.22); g.stroke(); g.strokeRect(4, 4, w - 8, h - 8);
  });
  const sign = cnv(1024, 64, (g, w, h) => {
    g.fillStyle = '#1d3f8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = `700 ${h * 0.5}px "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FELIXSTOWE LEISURE CENTRE', w * 0.25, h / 2 + 1); g.fillText('FELIXSTOWE LEISURE CENTRE', w * 0.75, h / 2 + 1);
  });

  let rs = 11; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const brickTex = (hue, sat, lig, vary) => cnv(256, 128, (g, w, h) => { g.fillStyle = '#6e5a4e'; g.fillRect(0, 0, w, h); const ch = h / 8, bw = w / 5.5;
    for (let row = 0; row < 8; row++) for (let k = -1; k < 6; k++) { const x = k * bw + (row % 2) * bw / 2, l = lig + (rnd() - 0.5) * vary; g.fillStyle = `hsl(${hue + (rnd() - 0.5) * 8},${sat}%,${l}%)`; g.fillRect(x + 1.5, row * ch + 1.5, bw - 3, ch - 3); } });
  // bowls-club glazing, one 4.6 m bay of the first floor: dark top fascia, two tinted panes in red frames
  const bowls = cnv(256, 128, (g, w, h) => {
    g.fillStyle = '#26282b'; g.fillRect(0, 0, w, h);
    const pane = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#46566a'); gr.addColorStop(0.5, '#222b36'); gr.addColorStop(1, '#161b22'); g.fillStyle = gr; g.fillRect(8, y0, w - 16, y1 - y0); g.strokeStyle = '#a3262a'; g.lineWidth = 5; g.strokeRect(8, y0, w - 16, y1 - y0); };
    pane(h * 0.06, h * 0.5); pane(h * 0.52, h * 0.95);
    g.fillStyle = 'rgba(190,205,220,.16)'; g.beginPath(); g.moveTo(8, h * 0.06); g.lineTo(w * 0.55, h * 0.06); g.lineTo(8, h * 0.48); g.fill();
  });
  const louvreTex = cnv(64, 64, (g, w, h) => { g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 6) { g.fillStyle = '#1b1c1f'; g.fillRect(0, y, w, 3); g.fillStyle = '#4b4e53'; g.fillRect(0, y + 3, w, 2); } });
  const board = (t1, bg, fg, serif) => { const t = cnv(1024, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${serif ? 'italic 700' : '600'} ${h * 0.5}px ${serif ? 'Georgia, serif' : '"Helvetica Neue", Arial, sans-serif'}`; g.fillText(t1, w / 2, h / 2 + 2, w * 0.94); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  const stripeTex = cnv(64, 32, (g, w, h) => { g.fillStyle = '#e9e4dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4452f'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, h); });
  const frontTex = cnv(1024, 256, (g, w, h) => {    // the red-framed glazed front: five tall bays over a transom, posters and blinds
    g.fillStyle = '#34414f'; g.fillRect(0, 0, w, h); const bw = w / 5;
    for (let i = 0; i < 5; i++) { const x = i * bw; g.fillStyle = '#c9ced2'; g.fillRect(x + 8, 8, bw - 16, h * 0.22); g.fillStyle = '#2b3138'; g.fillRect(x + 8, h * 0.06, bw - 16, h * 0.14);
      g.fillStyle = ['#6a3f8e', '#eceff1', '#3a9a56', '#eceff1', '#2d8c9a'][i]; g.fillRect(x + 10, h * 0.3, bw - 20, h * 0.66);
      if (i === 0) { g.fillStyle = '#c24a8e'; g.fillRect(x + 20, h * 0.38, bw - 40, h * 0.25); }
      if (i === 2) { g.fillStyle = '#ffffff'; g.font = `700 ${h * 0.1}px Arial`; g.textAlign = 'center'; g.fillText('BIRTHDAY', x + bw / 2, h * 0.42); g.fillText('PARTIES!', x + bw / 2, h * 0.53); g.fillStyle = '#e8b24a'; g.beginPath(); g.arc(x + bw / 2, h * 0.75, bw * 0.17, 0, 7); g.fill(); }
      if (i === 4) { g.fillStyle = '#eaf7f8'; g.fillRect(x + 30, h * 0.5, bw - 60, h * 0.07); } }
    g.strokeStyle = '#8f1f26'; g.lineWidth = 9; for (let i = 0; i <= 5; i++) { g.beginPath(); g.moveTo(i * bw, 0); g.lineTo(i * bw, h); g.stroke(); } g.beginPath(); g.moveTo(0, h * 0.28); g.lineTo(w, h * 0.28); g.stroke(); g.strokeRect(4, 4, w - 8, h - 8);
  });
  const doorsTex = cnv(256, 160, (g, w, h) => { g.fillStyle = '#1f2124'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3d4045'; g.lineWidth = 3; g.strokeRect(6, 6, w / 2 - 9, h - 12); g.strokeRect(w / 2 + 3, 6, w / 2 - 9, h - 12); });
  const glazedTex = cnv(256, 160, (g, w, h) => { g.fillStyle = '#2a323c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(200,215,230,.22)'; g.fillRect(0, 0, w, h * 0.3); g.strokeStyle = '#8f1f26'; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w, h * 0.3); g.stroke(); g.strokeRect(3, 3, w - 6, h - 6); });
  sign.wrapS = THREE.ClampToEdgeWrapping;
  M = {
    clere: std({ map: clere, roughness: 0.4, metalness: 0.1 }),
    entrance: std({ map: entrance, roughness: 0.25, metalness: 0.2 }),
    sign: std({ map: sign, roughness: 0.5 }),
    post: std({ color: 0x3b3d40, roughness: 0.6 }),
    fasciaBrown: std({ color: 0x4a3b30, roughness: 0.7 }),
    door: std({ color: 0x2a2b2e, roughness: 0.5 }),
    bowls: std({ map: bowls, roughness: 0.3, metalness: 0.15 }),
    pier: std({ map: brickTex(14, 26, 38, 8), roughness: 0.95 }), brickLight: std({ map: brickTex(14, 55, 50, 12), roughness: 0.95 }),
    louvre: std({ map: louvreTex, roughness: 0.6 }), front: std({ map: frontTex, roughness: 0.25, metalness: 0.15 }), doors: std({ map: doorsTex, roughness: 0.5 }), glazed: std({ map: glazedTex, roughness: 0.25, metalness: 0.2 }),
    stripe: std({ map: stripeTex, roughness: 0.6, side: THREE.DoubleSide }), red: std({ color: 0x8f1f26, roughness: 0.6, side: THREE.DoubleSide }),
    leisureSign: std({ map: board('FELIXSTOWE LEISURE CENTRE', '#1f4f94', '#ffffff', false), roughness: 0.5 }),
    bowlsSign1: std({ map: board('FELIXSTOWE INDOOR', '#1b2f63', '#d9b250', true), roughness: 0.5 }), bowlsSign2: std({ map: board('BOWLS CLUB', '#1b2f63', '#d9b250', true), roughness: 0.5 }),
    fascia: std({ color: 0x1f4f94, roughness: 0.5 }), dark: std({ color: 0x25272a, roughness: 0.7 }), soffit: std({ color: 0x6e5f4d, roughness: 0.9 }),
    yellow: std({ color: 0xe7c829, roughness: 0.6 }),
  };
  return M;
}

export function leisureMaterial(key) { const m = mats(); return key === 'pb:clere' ? m.clere : key === 'pb:bowls' ? m.bowls : null; }

/** Build into ctx.acc (walls, roofs) plus a few meshes. Returns { meshes, collider }. */
export function buildLeisureCentre(b, ctx) {
  const m = mats(), acc = ctx.acc, outer = ensureCCW(b.outer);
  const cx = b.cx, cz = b.cz;
  let g0 = Infinity, gs = 0; for (const [x, z] of outer) { const g = ctx.ground(x, z); g0 = Math.min(g0, g); gs += g; }
  const base = gs / outer.length;
  // edge roles from where each edge faces: the bowls club (north/road face and east gable), the entrance front (towards the plaza)
  const nOut = outer.length;
  const E = outer.map((a, i) => { const c = outer[(i + 1) % nOut], L = Math.hypot(c[0] - a[0], c[1] - a[1]), ex = (c[0] - a[0]) / L, ez = (c[1] - a[1]) / L;
    return { i, a, c, L, ex, ez, nx: -ez, nz: ex, mx: (a[0] + c[0]) / 2, mz: (a[1] + c[1]) / 2, th: Math.atan2(-ez, ex) }; });
  const cardinal = (e) => { const nx = e.nx, nz = e.nz; return { north: nx * -0.43 + nz * -0.9 > 0.9, ene: nx * 0.89 + nz * -0.45 > 0.9 }; };
  for (const e of E) { const q = cardinal(e); e.bowls = (q.north || q.ene) && e.L > 4 && (q.north || e.mz < 213); }
  const frontE = E.filter((e) => e.nx * 0.41 + e.nz * 0.91 > 0.95 && e.L > 12).sort((p2, q2) => q2.mx - p2.mx)[0] || null;
  const eastE = E.filter((e) => e !== frontE && e.nx * 0.89 + e.nz * -0.45 > 0.7 && e.L > 6 && e.mz > 222 && e.mz < 245 && e.mx > -292);
  const walls = insetRing(outer, Y.colonnade) || insetRing(outer, 1) || outer;
  const eaveRing = insetRing(outer, -0.4) || outer;
  const brick = acc.get(cx, cz, 'facade:brick_red:false:0', true), roof = acc.get(cx, cz, 'roof:concrete_tile', true);
  const BAY = 3.2, ST = 2.9, tint = [0.95, 0.88, 0.86], rtint = [0.62, 0.5, 0.42];
  const wallQ = (ring, y0, y1, a2 = brick) => { for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.05) continue; a2.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], y1, c[1]], [a[0], y1, a[1]], [0, 0], [L / BAY, 0], [L / BAY, (y1 - y0) / ST], [0, (y1 - y0) / ST], tint); } };
  wallQ(walls, g0 - 0.3, base + Y.eave);
  // hip ring between two rings (same vertex count), roof tiles UV in metres/2
  const ringRoof = (o, inn, y0, y1) => { for (let i = 0; i < o.length; i++) {
    const a = o[i], c = o[(i + 1) % o.length], ia = inn[i], ic = inn[(i + 1) % o.length], ex = c[0] - a[0], ez = c[1] - a[1], el = Math.hypot(ex, ez) || 1;
    const uv = (p) => [((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / el / 2, Math.abs((p[0] - a[0]) * -ez + (p[1] - a[1]) * ex) / el * 1.1 / 2];
    roof.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [ic[0], y1, ic[1]], [ia[0], y1, ia[1]], uv(a), uv(c), uv(ic), uv(ia), rtint);
  } };
  const tan = Math.tan(Y.pitch * Math.PI / 180);
  // lower roof: from the eaves over the colonnade up to the clerestory
  const lowInner = insetRing(outer, Y.lowerInset) || insetRing(outer, 3.5);
  const yE = base + Y.eave, yL = yE + (Y.lowerInset + 0.4) * tan;
  if (lowInner) ringRoof(eaveRing, lowInner, yE, yL);
  // soffit under the eaves (seen from the colonnade) and a brown fascia board
  wallQ(eaveRing, yE - Y.fascia, yE, acc.get(cx, cz, 'facade:timber:false:0', true));
  // clerestory band and upper hipped roof
  const clere = lowInner && insetRing(outer, Y.lowerInset + 0.5);
  if (clere) {
    for (let i = 0; i < clere.length; i++) { const a = clere[i], c = clere[(i + 1) % clere.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.5) continue;
      const ca = acc.get(cx, cz, E[i]?.bowls ? 'pb:bowls' : 'pb:clere');
      ca.quad([a[0], yL - 0.4, a[1]], [c[0], yL - 0.4, c[1]], [c[0], base + Y.clerestoryTop, c[1]], [a[0], base + Y.clerestoryTop, a[1]], [0, 0], [L / 4, 0], [L / 4, 1], [0, 1]); }
    let prev = insetRing(outer, Y.lowerInset - 0.4) || clere, y = base + Y.clerestoryTop;
    for (const step of [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]) { // stepped inward until the ring collapses (a hip roof)
      const d = (prev === clere ? 0 : 0) + step; const inn = insetRing(prev, d); if (!inn || inn.length !== prev.length) break;
      ringRoof(prev, inn, y, y + d * tan); y += d * tan; prev = inn;
    }
    // close the top
    if (prev.length >= 3) { const r = acc.get(cx, cz, 'roof:concrete_tile', true); const c0 = prev.reduce((s, p) => [s[0] + p[0] / prev.length, s[1] + p[1] / prev.length], [0, 0]); for (let i = 0; i < prev.length; i++) { const a = prev[i], c = prev[(i + 1) % prev.length]; r.triFlat([a[0], y, a[1]], [c[0], y, c[1]], [c0[0], y + 0.5, c0[1]], [0, 0], [1, 0], [0.5, 0.5], rtint); } }
  }
  // ---------- posts, piers, signs and windows (hand-placed details on the real edges)
  const meshes = [], K = makeKit(), kg = new THREE.Group(); kg.name = 'leisure-details';
  const colliders = [], Wd = Y.colonnade, gAt = (x, z) => ctx.ground(x, z);
  const Fe = (e) => K.face(e.a[0], e.a[1], e.th), at = (e, u, w) => [e.a[0] + e.ex * u + e.nx * w, e.a[1] + e.ez * u + e.nz * w];
  // posts along the eaves: big brick piers round the bowls club, dark tapered steel posts elsewhere
  for (const e of E) {
    if (e.L < 4) continue; const n = Math.max(1, Math.round(e.L / 6));
    for (let k = 0; k <= n; k++) { if (k === n && E[(e.i + 1) % nOut].L >= 4) continue; const u = e.L * k / n, p = at(e, u, -0.35), g = gAt(p[0], p[1]);
      if (e.bowls) { K.fbox(Fe(e), m.pier, u - 0.45, u + 0.45, g - 0.3, yE + 0.15, -0.8, 0.1); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.55, y0: g - 0.3, top: yE, kind: 'pier' }); }
      else { K.fbox(Fe(e), m.post, u - 0.22, u + 0.22, g - 0.3, yE, -0.58, -0.12); colliders.push({ type: 'circle', x: p[0], z: p[1], r: 0.3, y0: g - 0.3, top: yE, kind: 'post' }); } }
    // ground floor of the bowls club: louvred panels in the brick between the piers, red-framed glazed doors under the gable
    if (e.bowls) { const n2 = Math.max(1, Math.round(e.L / 6)), bw = e.L / n2;
      for (let k = 0; k < n2; k++) { const u = k * bw + bw / 2; if (k % 2 === 0) K.fbox(Fe(e), m.louvre, u - 1.0, u + 1.0, yE - 1.5, yE - 0.15, -Wd + 0.02, -Wd + 0.08); }
      if (e.mz < 213 && e.nx * 0.89 + e.nz * -0.45 > 0.9) K.fbox(Fe(e), m.glazed, e.L / 2 - 1.6, e.L / 2 + 1.6, gAt(e.mx, e.mz), yE - 0.9, -Wd + 0.02, -Wd + 0.08); }
  }
  // gold-on-blue club boards on the east gable, on the eave fascia above the piers
  for (const e of E.filter((q) => q.bowls && q.nx * 0.89 + q.nz * -0.45 > 0.9 && q.mz < 213)) {
    K.fbox(Fe(e), e.L > 10 ? m.bowlsSign1 : m.bowlsSign2, 0.4, e.L - 0.4, yE - 0.56, yE - 0.02, 0.4, 0.46);
  }
  if (frontE) {
    const e = frontE, L = e.L, Fr = Fe(e);
    // red-framed glazed front with posters, a porch, double doors in the brick to the west
    K.fbox(Fr, m.front, 5.2, 12.2, gAt(...at(e, 8, -Wd)) + 0.05, yE - 0.5, -Wd + 0.02, -Wd + 0.08);
    K.fbox(Fr, m.dark, 12.2, L - 1.4, gAt(...at(e, 14, -Wd)) + 0.05, yE - 0.4, -Wd + 0.02, -Wd + 0.08);
    K.fbox(Fr, m.glazed, 13.0, 15.4, gAt(...at(e, 14, -Wd)) + 0.05, yE - 0.8, -Wd + 0.08, -Wd + 0.12); K.fbox(Fr, m.glazed, 16.4, 18.8, gAt(...at(e, 17, -Wd)) + 0.05, yE - 0.8, -Wd + 0.08, -Wd + 0.12);
    K.fbox(Fr, m.doors, 1.3, 3.5, gAt(...at(e, 2, -Wd)) + 0.05, yE - 1.2, -Wd + 0.02, -Wd + 0.08);
    K.fbox(Fr, m.louvre, 3.9, 4.9, yE - 2.5, yE - 1.3, -Wd + 0.02, -Wd + 0.08);
    // long blue fascia in front of the eave, lettered twice
    K.fbox(Fr, m.leisureSign, 5.0, L - 0.4, yE - 0.62, yE - 0.02, 0.43, 0.49);
    for (const u of [5.0, 12.7]) { const p = at(e, u, 1.0), yb = gAt(p[0], p[1]); K.cyl(m.dark, p[0], yb, yb + 0.95, p[1], 0.055, 0.055, 6); K.cyl(m.yellow, p[0], yb + 0.8, yb + 0.95, p[1], 0.06, 0.06, 6); }
    // small red-and-white striped roof light on the lower roof above the porch
    { const u0 = 12.4, u1 = 18.4, d0 = 2.2, d1 = 3.7, tn = Math.tan(Y.pitch * Math.PI / 180), hh = 0.55, yR = (d) => yE + tn * (d + 0.4) + 0.08;
      const A = [at(e, u0, -d0), at(e, u1, -d0), at(e, u1, -d1), at(e, u0, -d1)], R = [at(e, u0 + 0.9, -(d0 + d1) / 2), at(e, u1 - 0.9, -(d0 + d1) / 2)];
      const pt = (q, y) => [q[0], y, q[1]], tri = (mat, a, b2, c2, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b2, ...c2], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); K.put(mat, g); };
      tri(m.stripe, pt(A[0], yR(d0)), pt(A[1], yR(d0)), pt(R[1], yR((d0 + d1) / 2) + hh), [0, 0, 6, 0, 6, 1]); tri(m.stripe, pt(A[0], yR(d0)), pt(R[1], yR((d0 + d1) / 2) + hh), pt(R[0], yR((d0 + d1) / 2) + hh), [0, 0, 6, 1, 0, 1]);
      tri(m.stripe, pt(A[3], yR(d1)), pt(A[2], yR(d1)), pt(R[1], yR((d0 + d1) / 2) + hh), [0, 0, 6, 0, 6, 1]); tri(m.stripe, pt(A[3], yR(d1)), pt(R[1], yR((d0 + d1) / 2) + hh), pt(R[0], yR((d0 + d1) / 2) + hh), [0, 0, 6, 1, 0, 1]);
      tri(m.red, pt(A[0], yR(d0)), pt(A[3], yR(d1)), pt(R[0], yR((d0 + d1) / 2) + hh), [0, 0, 1, 0, 0.5, 1]); tri(m.red, pt(A[1], yR(d0)), pt(A[2], yR(d1)), pt(R[1], yR((d0 + d1) / 2) + hh), [0, 0, 1, 0, 0.5, 1]); }
  }
  // the blue fascia carries on round the plaza-side corner, with glazing behind
  for (const e of eastE) { const Fq = Fe(e); K.fbox(Fq, m.leisureSign, 0.4, e.L - 0.2, yE - 0.62, yE - 0.02, 0.43, 0.49); K.fbox(Fq, m.glazed, 0.6, e.L - 0.6, gAt(e.mx, e.mz) + 0.05, yE - 0.8, -Wd + 0.02, -Wd + 0.08); }
  K.flush(kg, 'leisure-details'); meshes.push(kg);
  const front = frontE ? { a: frontE.a, c: frontE.c, nx: frontE.nx, nz: frontE.nz, ex: frontE.ex, ez: frontE.ez, L: frontE.L } : null;
  return { meshes, colliders, front, collider: { outer: walls, holes: [], base: g0 - 0.3, top: base + 11.6 } };
}
