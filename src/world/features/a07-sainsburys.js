// Area a07-sainsburys: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
// Sainsbury's east wing on Hamilton Road and the Little Wine Bar at its south end, from the Street View photos in
// docs/research/hamilton-road-streetview (e-little-wine-bar-sainsburys-roof, e-sainsburys-side-wall, e-sainsburys-entrance).
// Frame: s runs from the south end of the wall (the Co-op Funeralcare side) to the north end (the station side), d out to the east
// (the street), y up. Every dimension is an estimate scaled from the photos; the roof only covers the east wing.
import * as THREE from 'three';

const MATS = {};
function mat(k, o) { return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, ...o })); }
const OWN = {
  slate: () => mat('slate', { color: 0x5c5a56, roughness: 0.92 }),          // weathered grey-brown slate with lichen
  soffit: () => mat('soffit', { color: 0xe9e6dd, roughness: 0.7 }),
  plinth: () => mat('plinth', { color: 0x26272d, roughness: 0.8 }),         // dark engineering-brick base
  column: () => mat('column', { color: 0x2c3036, roughness: 0.4, metalness: 0.5 }),
  navy: () => mat('navy', { color: 0x252d4c, roughness: 0.6 }),
  orange: () => mat('orange', { color: 0xe9701a, roughness: 0.55 }),
  argosRed: () => mat('argosRed', { color: 0xd5121f, roughness: 0.5 }),
  shopGlass: () => mat('shopGlass', { color: 0x38464f, roughness: 0.12, metalness: 0.35 }),
  doorGlass: () => mat('doorGlass', { color: 0x7d929d, roughness: 0.1, metalness: 0.3 }),
  louvreGreen: () => mat('louvreGreen', { color: 0x2f6a4a, roughness: 0.6 }),
  louvreGrey: () => mat('louvreGrey', { color: 0x363b41, roughness: 0.6 }),
  lead: () => mat('lead', { color: 0x6f7377, roughness: 0.5, metalness: 0.3 }),
  white: () => mat('white', { color: 0xf0eee8, roughness: 0.6 }),
  black: () => mat('black', { color: 0x1b1c1f, roughness: 0.5, metalness: 0.4 }),
  timber: () => mat('timber', { color: 0x8a6a4a, roughness: 0.9 }),
  sage: () => mat('sage', { color: 0x8eb3be, roughness: 0.8 }),
  blueSign: () => mat('blueSign', { color: 0x2f7fd0, roughness: 0.6 }),
  yellow: () => mat('yellow', { color: 0xf3cf1b, roughness: 0.5 }),
  poster: () => mat('poster', { color: 0xd9a06a, roughness: 0.7 }),
  paper: () => mat('paper', { color: 0xf4f2ec, roughness: 0.7 }),
  cabinet: () => mat('cabinet', { color: 0x2f5f9a, roughness: 0.5 }),
};

/** Frame along the wall from A (south end) to C (north end): s northward, d out east, y up. */
function frame(K, it) {
  const A = it.A, C = it.C, L = Math.hypot(C[0] - A[0], C[1] - A[1]);
  const ux = (C[0] - A[0]) / L, uz = (C[1] - A[1]) / L, nx = -uz, nz = ux;
  return { A, C, L, ux, uz, nx, nz, P: (s, d, y) => [A[0] + ux * s + nx * d, K.g + y, A[1] + uz * s + nz * d] };
}

function kit(K, F) {
  const Geo = K.G.gw.constructor, own = {};
  const g = (k) => own[k] || (own[k] = new Geo());
  const box = (k, s, d, y, hs, hd, hy) => { const p = F.P(s, d, y); g(k).box(p[0], p[1], p[2], F.ux, F.uz, hs, hy, hd); };
  const quad = (k, a, b, c, d) => g(k).quad(a, b, c, d);
  const tri = (k, a, b, c) => g(k).tri(a, b, c);
  const flush = () => { for (const [k, geo] of Object.entries(own)) { const m = geo.mesh(OWN[k]()); if (m) { m.name = 'a07:' + k; K.extra.push(m); } } };
  return { g, box, quad, tri, flush, P: F.P };
}

/** Lettering on a plane at d: text on a transparent or filled canvas, shown the right way round from the street. */
const texCache = new Map();
function sign(K, F, text, s0, s1, d, y0, y1, o = {}) {
  if (typeof document === 'undefined') return;
  const key = [text, o.fg, o.bg, o.font].join('|');
  let tex = texCache.get(key);
  if (!tex) {
    const cw = 1024, ch = Math.max(64, Math.round(1024 * (y1 - y0) / (s1 - s0)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d');
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, cw, ch); }
    x.fillStyle = o.fg || '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const face = o.font || 'bold {S}px "Trebuchet MS", Arial, Helvetica, sans-serif';
    let fs = Math.round(ch * 0.78); x.font = face.replace('{S}', fs);
    const w = x.measureText(text).width; if (w > cw * 0.92) { fs = Math.floor(fs * cw * 0.92 / w); x.font = face.replace('{S}', fs); }
    x.fillText(text, cw / 2, ch / 2 + fs * 0.04);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; texCache.set(key, tex);
  }
  const flip = (F.ux * F.nz - F.uz * F.nx) > 0 ? 0 : 1; const [u0, u1] = flip ? [1, 0] : [0, 1];
  const a = F.P(s0, d, y0), b = F.P(s1, d, y0), c = F.P(s1, d, y1), e = F.P(s0, d, y1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...e], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: !o.bg, roughness: 0.5, side: THREE.DoubleSide, depthWrite: !!o.bg, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.name = 'a07:sign'; K.extra.push(mesh);
}

// roof geometry shared by the roof and entrance features (metres): eaves overhang E past the wall, ridge R behind it, slope 0.5
const E = 1.3, R = 4.2, SL = 0.5, HIP = E + R;
const ENT = { sc: 34.3, hw: 6.0, dg: 2.5, gb: 3.75, yp: 8.0 };   // entrance gable: centre s, half width, front plane d, base y, peak y

/** Slate roof over the east wing: hipped at both ends, white soffit, black gutter, ridge, small gabled louvre vents. */
function roof(K, it) {
  const F = frame(K, it), Q = kit(K, F), L = F.L, H = K.H, ey = H + 0.1, yr = ey + (E + R) * SL, back = -2 * R - E;
  const yAt = (d) => ey + (E - d) * SL;
  Q.quad('slate', Q.P(0, E, ey), Q.P(L, E, ey), Q.P(L - HIP, -R, yr), Q.P(HIP, -R, yr));
  Q.quad('slate', Q.P(L, back, ey), Q.P(0, back, ey), Q.P(HIP, -R, yr), Q.P(L - HIP, -R, yr));
  Q.tri('slate', Q.P(0, E, ey), Q.P(0, back, ey), Q.P(HIP, -R, yr));
  Q.tri('slate', Q.P(L, back, ey), Q.P(L, E, ey), Q.P(L - HIP, -R, yr));
  Q.box('lead', (HIP + L - HIP) / 2, -R, yr + 0.03, (L - 2 * HIP) / 2, 0.1, 0.05);          // ridge capping
  // white soffit under the eaves, white fascia and black gutter (not under the entrance gable, which projects further)
  const segs = [[0, ENT.sc - ENT.hw - 0.2], [ENT.sc + ENT.hw + 0.2, L]];
  for (const [a, b] of segs) {
    Q.quad('soffit', Q.P(a, 0, H - 0.04), Q.P(b, 0, H - 0.04), Q.P(b, E, ey - 0.16), Q.P(a, E, ey - 0.16));
    Q.box('white', (a + b) / 2, E, ey - 0.1, (b - a) / 2, 0.03, 0.15);
    Q.box('black', (a + b) / 2, E + 0.06, ey + 0.1, (b - a) / 2, 0.05, 0.06);
    for (let s = a + 0.4; s < b - 0.2; s += 0.32) Q.box('lead', s, E / 2, H + 0.02, 0.012, E / 2, 0.012);   // soffit slats
  }
  // louvred gablet vents set on the front slope: the first, over the Little Wine Bar, is larger with green louvres
  const vents = [[3.2, 2.5, 1.6, 'louvreGreen'], [9.5, 1.5, 0.95, 'louvreGrey'], [13.5, 1.5, 0.95, 'louvreGrey'], [17.5, 1.5, 0.95, 'louvreGrey'], [21.5, 1.5, 0.95, 'louvreGrey'], [25.0, 1.5, 0.95, 'louvreGrey']];
  for (const [s, w, h, lv] of vents) {
    const gd = s < HIP ? -0.2 : -0.7, by = yAt(gd), py = by + h, dB = gd - h / SL;
    Q.tri(lv, Q.P(s - w / 2, gd, by), Q.P(s + w / 2, gd, by), Q.P(s, gd, py));
    for (let k = 1; k < 6; k++) { const f = k / 6.4, yy = by + h * f, hw = (w / 2) * (1 - f); Q.box('black', s, gd + 0.01, yy, hw, 0.012, 0.012); }
    for (const sg of [-1, 1]) {
      Q.quad('slate', Q.P(s + sg * w / 2, gd, by), Q.P(s, gd, py), Q.P(s, dB, py), Q.P(s + sg * w / 2, dB, by));
      Q.quad('lead', Q.P(s + sg * (w / 2 + 0.02), gd + 0.02, by), Q.P(s + sg * 0.02, gd + 0.02, py + 0.03), Q.P(s + sg * 0.02, gd + 0.02, py - 0.1), Q.P(s + sg * (w / 2 + 0.02), gd + 0.02, by + 0.1));   // pale rake trim
    }
  }
  Q.flush();
}

/** The long wall: dark brick base, paired dark steel columns carrying the eaves, black downpipes, a poster board, a defibrillator box. */
function wall(K, it) {
  const F = frame(K, it), Q = kit(K, F), H = K.H, ey = H + 0.1;
  Q.box('plinth', 17.5, 0.04, 0.3, 11.2, 0.04, 0.3);                                   // dark base (s 6.3 .. 28.7)
  Q.box('plinth', 17.5, 0.045, 0.62, 11.2, 0.045, 0.02);                               // pale-ish capping line is the shared brick; this is a thin dark course
  for (let i = 0; i < 6; i++) {
    const s = 7.6 + i * 4.15;
    for (const o of [-0.26, 0.26]) {
      Q.box('column', s + o, 0.62, (H + 0.1) / 2, 0.075, 0.075, (H + 0.1) / 2);
      const p = F.P(s + o, 0.62, 0); K.colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.14, y0: K.g - 0.5, top: K.g + H, kind: 'post' });
    }
    Q.box('black', s + 0.62, 0.1, H / 2 + 0.1, 0.04, 0.04, H / 2 - 0.1);               // downpipe
    Q.box('black', s + 0.62, 0.7, H + 0.08, 0.04, 0.6, 0.04);                          // its bracket out to the gutter
  }
  Q.box('cabinet', 13.4, 1.2, 0.65, 0.3, 0.2, 0.65);                                   // blue street cabinet on the pavement
  Q.box('poster', 19.4, 0.06, 1.85, 0.62, 0.03, 0.55);                                 // orange poster board with a pale frame
  Q.box('paper', 19.4, 0.09, 1.85, 0.55, 0.01, 0.48);
  Q.box('poster', 19.4, 0.1, 1.85, 0.5, 0.01, 0.4);
  Q.box('yellow', 21.1, 0.07, 1.35, 0.27, 0.04, 0.3);                                  // yellow defibrillator cabinet
  Q.box('white', 15.0, 0.06, 2.6, 0.32, 0.03, 0.12);                                   // small white alarm/sensor box
  Q.flush();
}

/** The Little Wine Bar (south end): navy board lettered Little Wine Bar, glazed front with a door, timber planters, a blue board on the wall. */
function wineBar(K, it) {
  const F = frame(K, it), Q = kit(K, F), H = K.H;
  Q.quad('shopGlass', Q.P(0.4, 0.07, 0.45), Q.P(6.2, 0.07, 0.45), Q.P(6.2, 0.07, 2.65), Q.P(0.4, 0.07, 2.65));
  Q.box('plinth', 3.3, 0.06, 0.22, 3.0, 0.06, 0.24);
  for (const s of [0.4, 2.2, 3.9, 6.2]) Q.box('column', s, 0.1, 1.55, 0.04, 0.05, 1.1);   // dark window frames
  Q.quad('doorGlass', Q.P(4.2, 0.09, 0.45), Q.P(5.3, 0.09, 0.45), Q.P(5.3, 0.09, 2.5), Q.P(4.2, 0.09, 2.5));   // glazed door
  Q.box('column', 4.15, 0.11, 1.5, 0.04, 0.05, 1.05); Q.box('column', 5.35, 0.11, 1.5, 0.04, 0.05, 1.05);
  Q.box('navy', 4.35, 0.14, 2.85, 4.35, 0.12, 0.5);                                   // navy fascia board over the shopfront (also hides the generated shop sign behind it)
  sign(K, F, 'Little Wine Bar', 0.9, 5.7, 0.27, 2.62, 3.18, { fg: '#ffffff', bg: '#1f3a5c', font: 'italic 600 {S}px Georgia, "Times New Roman", serif' });
  // outside tables: timber planter boxes with sage-blue screens between them
  for (const s of [0.9, 5.7]) Q.box('timber', s, 2.1, 0.5, 0.5, 0.35, 0.5);
  Q.box('sage', 3.3, 2.1, 0.65, 2.15, 0.03, 0.55);
  Q.box('timber', 3.3, 2.1, 1.12, 2.2, 0.05, 0.03);
  // blue board on the brick beside it
  Q.box('blueSign', 9.5, 0.07, 2.05, 0.7, 0.03, 0.95);
  Q.box('white', 9.5, 0.1, 2.35, 0.4, 0.01, 0.4);
  sign(K, F, 'The Little Wine Bar', 8.9, 10.1, 0.12, 1.2, 1.6, { fg: '#ffffff', font: 'bold {S}px Arial, sans-serif' });
  Q.flush();
}

/** The entrance: navy tympanum gable with orange lettering, white soffit, columns, orange panels, glazed door and the Argos window. */
function entrance(K, it) {
  const F = frame(K, it), Q = kit(K, F), L = F.L, H = K.H;
  const { sc, hw, dg, gb, yp } = ENT, s0 = sc - hw, s1 = sc + hw, back = -R;
  // gable roof prism: two slate planes up to a level ridge, a navy tympanum on the front, a lead rake trim
  Q.quad('slate', Q.P(s0 - 0.35, dg + 0.25, gb - 0.18), Q.P(sc, dg + 0.25, yp + 0.12), Q.P(sc, back, yp + 0.12), Q.P(s0 - 0.35, back, gb - 0.18));
  Q.quad('slate', Q.P(s1 + 0.35, dg + 0.25, gb - 0.18), Q.P(sc, dg + 0.25, yp + 0.12), Q.P(sc, back, yp + 0.12), Q.P(s1 + 0.35, back, gb - 0.18));
  Q.tri('navy', Q.P(s0, dg, gb), Q.P(s1, dg, gb), Q.P(sc, dg, yp));
  Q.tri('navy', Q.P(s1, back, gb), Q.P(s0, back, gb), Q.P(sc, back, yp));
  for (const sg of [-1, 1]) {   // lead rake trim: a strip along each slope, over the tympanum edge
    const a = Q.P(sc + sg * (hw + 0.3), dg + 0.27, gb - 0.2), b = Q.P(sc, dg + 0.27, yp + 0.14), t = 0.5;
    Q.quad('lead', a, b, [b[0], b[1] - t, b[2]], [a[0], a[1] - t, a[2]]);
  }
  Q.box('lead', sc, back / 2 + dg / 2, yp + 0.14, 0.12, (dg - back) / 2 + 0.2, 0.06);   // ridge
  // white band at the foot of the tympanum and the white slatted soffit under the projecting gable
  Q.box('white', sc, dg + 0.04, gb - 0.12, hw + 0.4, 0.08, 0.14);
  Q.box('black', sc, dg + 0.1, gb - 0.3, hw + 0.4, 0.05, 0.05);
  Q.quad('soffit', Q.P(s0 - 0.3, 0, H - 0.04), Q.P(s1 + 0.3, 0, H - 0.04), Q.P(s1 + 0.3, dg, gb - 0.24), Q.P(s0 - 0.3, dg, gb - 0.24));
  for (let s = s0; s < s1 + 0.3; s += 0.32) Q.box('lead', s, dg / 2, (H + gb - 0.3) / 2, 0.012, dg / 2, 0.012);
  // the lettering: orange Sainsbury's wordmark on the navy tympanum
  sign(K, F, "Sainsbury's", sc - 3.7, sc + 3.7, dg + 0.03, 4.15, 5.55, { fg: '#ee7a1c', font: 'italic bold {S}px "Trebuchet MS", Arial, sans-serif' });
  // front columns carrying the gable
  for (const o of [-5.6, -1.25, -0.65, 3.4, 5.6]) {
    const s = sc + o; Q.box('column', s, dg - 0.2, (gb - 0.25) / 2, 0.11, 0.11, (gb - 0.25) / 2);
    const p = F.P(s, dg - 0.2, 0); K.colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.17, y0: K.g - 0.5, top: K.g + gb, kind: 'post' });
  }
  Q.box('column', sc, dg - 0.2, gb - 0.2, hw - 0.1, 0.08, 0.06);                       // beam between the columns
  // glazed front behind the columns: dark glass, door, Argos window, orange panels
  Q.quad('shopGlass', Q.P(s0 + 2.1, 0.07, 0.15), Q.P(s1 - 1.9, 0.07, 0.15), Q.P(s1 - 1.9, 0.07, 3.3), Q.P(s0 + 2.1, 0.07, 3.3));
  Q.quad('doorGlass', Q.P(sc - 2.9, 0.1, 0.15), Q.P(sc - 0.3, 0.1, 0.15), Q.P(sc - 0.3, 0.1, 2.5), Q.P(sc - 2.9, 0.1, 2.5));
  for (const s of [-2.95, -1.6, -0.3]) Q.box('column', sc + s, 0.12, 1.4, 0.04, 0.04, 1.3);
  Q.box('column', sc - 1.6, 0.12, 2.55, 1.35, 0.04, 0.04);
  Q.box('orange', s0 + 1.0, 0.1, 1.65, 1.0, 0.1, 1.65);                                  // orange panel left of the door
  Q.box('paper', s0 + 1.0, 0.21, 1.55, 0.52, 0.02, 0.95);                                // a poster on it
  Q.box('orange', s1 - 1.6, 0.1, 1.65, 0.22, 0.1, 1.65);                                 // orange frame at the right end of the Argos window
  Q.box('orange', s1 + 1.15, 0.1, 1.5, 0.9, 0.1, 1.5);                                  // orange rendered wall beyond
  Q.box('column', sc + 2.6, 0.12, 1.75, 0.04, 0.04, 1.55);                               // window mullions
  Q.box('column', sc + 4.4, 0.12, 1.75, 0.04, 0.04, 1.55);
  sign(K, F, 'Argos', sc + 0.9, sc + 3.9, 0.17, 1.95, 2.95, { fg: '#ffffff', bg: '#d5121f', font: 'bold {S}px "Trebuchet MS", Arial, sans-serif' });
  // black steel railings guarding the entrance front, with a gap in front of the door
  const rail = (a, b, d) => {
    Q.box('black', (a + b) / 2, d, 1.02, (b - a) / 2, 0.03, 0.025); Q.box('black', (a + b) / 2, d, 0.12, (b - a) / 2, 0.03, 0.025);
    for (let s = a; s <= b + 0.01; s += 0.15) Q.box('black', s, d, 0.55, 0.012, 0.012, 0.5);
  };
  rail(22.5, sc - 3.2, 3.4); rail(sc + 0.6, L - 1.0, 3.4);
  Q.flush();
}

export const FEATURES = { a07Roof: roof, a07Wall: wall, a07WineBar: wineBar, a07Entrance: entrance };
