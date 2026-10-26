// Street-front features built from the user's Street View photos (docs/research/hamilton-road-streetview):
// the Palace Cinema's Art Deco front, and pitched-roof dormers and chimneys for the red-brick corner buildings.
// Dimensions are estimates scaled from the photos (a pedestrian and a door for scale), not surveyed.
// K is the local frame from frontage-details.js: P(s, d, y) -> world point (s along the facade, d out, y up).

import * as THREE from 'three';

const cache = new Map();
/** Lettering as a transparent plane on the facade. `p` are the four corners (bottom-left .. top-left as seen from outside). */
export function label(K, text, s0, s1, d, y0, y1, o = {}) {
  if (typeof document === 'undefined') return;
  const key = [text, o.fg, o.vertical, o.font].join('|');
  let tex = cache.get(key);
  if (!tex) {
    const cw = o.vertical ? 192 : 1024, ch = o.vertical ? 192 * Math.max(1, text.length) : 192;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d'); x.fillStyle = o.fg || '#b3162a'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.vertical) { x.font = `bold ${Math.round(cw * 0.82)}px Georgia, "Times New Roman", serif`; [...text].forEach((chr, i) => x.fillText(chr, cw / 2, (i + 0.52) * (ch / text.length))); }
    else { let fs = 150; x.font = `bold ${fs}px Georgia, "Times New Roman", serif`; const w = x.measureText(text).width; if (w > cw * 0.94) { fs = Math.floor(fs * cw * 0.94 / w); x.font = `bold ${fs}px Georgia, "Times New Roman", serif`; } x.fillText(text, cw / 2, ch / 2 + 6); }
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; cache.set(key, tex);
  }
  // mirror the lettering when the facade's s axis runs to the viewer's left
  const flip = (K.e.ux * K.e.nz - K.e.uz * K.e.nx) > 0 ? 0 : 1; // u . right, right = (nz, -nx) -> ux*nz - uz*nx
  const [u0, u1] = flip ? [1, 0] : [0, 1];
  const a = K.P(s0, d, y0), b = K.P(s1, d, y0), c = K.P(s1, d, y1), dd = K.P(s0, d, y1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...dd], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.name = 'frontage:label'; K.extra.push(mesh);
}

/**
 * The Palace Cinema (the former Ritz, 1937, Art Deco), from the supplied Street View photo: white ground floor with a
 * glazed entrance and posters, a white pedimented canopy lettered THE PALACE, dark red-brown brick above with two
 * columns of stepped white blocks, two white pilaster pairs and a white central panel lettered BINGO / CINEMA.
 */
export function cinemaFront(K) {
  const { P, box, G, L, s0, sm, H, D, colliders, g } = K, at = (f) => s0 + L * f;
  const gh = 4.9, wd = 0.12;
  box('gw', sm, wd, gh / 2, L / 2, wd, gh / 2);                                    // white ground floor
  const dg = wd * 2 + 0.03; // in front of the white wall (its face is at 2 x wd)
  G.pane.quad(P(at(0.35), dg, 0.22), P(at(0.65), dg, 0.22), P(at(0.65), dg, 3.45), P(at(0.35), dg, 3.45)); // entrance glazing
  for (let k = 0; k <= 8; k++) box('black', at(0.35) + (at(0.65) - at(0.35)) * k / 8, dg + 0.02, 1.84, 0.03, 0.02, 1.62);
  box('black', sm, dg + 0.02, 3.45, (at(0.65) - at(0.35)) / 2, 0.025, 0.04);
  for (const f of [0.085, 0.865]) { // framed posters either side
    const w = L * 0.075; box('red', at(f), dg, 1.75, w / 2 + 0.05, 0.03, 0.95); box('black', at(f), dg + 0.03, 1.75, w / 2, 0.02, 0.88);
  }
  box('gw', sm, 0.06, gh + 0.1, L / 2, 0.14, 0.1);                                  // string course above the ground floor
  // canopy with a shallow pediment
  const dd = D(1.9), cl = at(0.31), cr = at(0.69), ct = 4.3;
  box('gw', (cl + cr) / 2, dd / 2, 4.0, (cr - cl) / 2 + 0.1, dd / 2, 0.3);
  G.gw.tri(P(cl - 0.1, dd, ct), P(cr + 0.1, dd, ct), P((cl + cr) / 2, dd, ct + 1.1));
  G.gw.quad(P(cl - 0.1, 0, ct), P(cl - 0.1, dd, ct), P((cl + cr) / 2, dd, ct + 1.1), P((cl + cr) / 2, 0, ct + 1.1));
  G.gw.quad(P((cl + cr) / 2, 0, ct + 1.1), P((cl + cr) / 2, dd, ct + 1.1), P(cr + 0.1, dd, ct), P(cr + 0.1, 0, ct));
  for (const f of [0.31, 0.405, 0.595, 0.69]) { const s = at(f); box('gw', s, dd - 0.22, 1.85, 0.2, 0.2, 1.85); const p = P(s, dd - 0.22, 0); colliders.push({ type: 'circle', x: p[0], z: p[2], r: 0.28, y0: g - 0.5, top: g + 4.2, kind: 'wall' }); }
  label(K, 'THE PALACE', sm - 1.25, sm + 1.25, dd + 0.03, ct + 0.12, ct + 0.62, { fg: '#b3162a' });
  // brick storeys: cornice, coping
  box('gw', sm, 0.07, H - 0.5, L / 2, 0.08, 0.07); box('gw', sm, 0.1, H + 0.1, L / 2 + 0.1, 0.13, 0.12);
  // two columns of stepped white blocks
  for (const f of [0.255, 0.79]) for (let y = gh + 0.7; y < H - 1.1; y += 0.78) box('gw', at(f), 0.05, y, 0.3, 0.06, 0.2);
  // pilaster pairs with capitals
  for (const f of [0.115, 0.905]) {
    for (const o of [-0.22, 0.22]) box('gw', at(f) + o, 0.09, (gh + 0.3 + H - 1.4) / 2, 0.11, 0.09, (H - 1.7 - gh) / 2);
    box('gw', at(f), 0.1, H - 1.3, 0.5, 0.13, 0.16); box('gw', at(f), 0.1, gh + 0.4, 0.5, 0.13, 0.12);
  }
  // central white panel lettered BINGO | CINEMA
  const pl = at(0.4), pr = at(0.7), py0 = 7.3, py1 = H - 1.0;
  box('gw', (pl + pr) / 2, 0.08, (py0 + py1) / 2, (pr - pl) / 2, 0.08, (py1 - py0) / 2);
  label(K, 'BINGO', pl + 0.25, pl + 1.25, 0.2, py1 - 4.9, py1 - 0.25, { fg: '#b3162a', vertical: true });
  label(K, 'CINEMA', pr - 1.25, pr - 0.25, 0.2, py1 - 5.9, py1 - 0.25, { fg: '#b3162a', vertical: true });
}

/** Gabled roof dormers on the street slope: white-framed sash window, lead cheeks, slate roof. at: fractions along the facade. */
export function dormers(K, it) {
  const { P, G, L, s0, H } = K, pitch = it.pitch || 0.72, w = it.width || 1.7, i0 = it.inset || 0.7;
  for (const f of it.at) {
    const sc = s0 + L * f, yb = H + i0 * pitch - 0.12, yt = yb + (it.height || 1.35), yr = yt + 0.62;
    const iSide = (yt - H) / pitch, iEnd = (yr - H) / pitch, dF = -i0, dS = -iSide, dE = -iEnd, a = sc - w / 2, b = sc + w / 2;
    // front: gable above a white-framed sash window
    G.white.quad(P(a, dF, yb), P(b, dF, yb), P(b, dF, yt), P(a, dF, yt));
    G.white.tri(P(a, dF, yt), P(b, dF, yt), P(sc, dF, yr));
    const wa = a + 0.22, wb = b - 0.22, wy0 = yb + 0.18, wy1 = yt - 0.14, df = dF + 0.03;
    G.pane.quad(P(wa, df, wy0), P(wb, df, wy0), P(wb, df, wy1), P(wa, df, wy1));
    for (const [s, hs] of [[(wa + wb) / 2, 0.025]]) G.white.quad(P(s - hs, df + 0.01, wy0), P(s + hs, df + 0.01, wy0), P(s + hs, df + 0.01, wy1), P(s - hs, df + 0.01, wy1));
    G.white.quad(P(wa, df + 0.01, (wy0 + wy1) / 2 - 0.02), P(wb, df + 0.01, (wy0 + wy1) / 2 - 0.02), P(wb, df + 0.01, (wy0 + wy1) / 2 + 0.02), P(wa, df + 0.01, (wy0 + wy1) / 2 + 0.02));
    // cheeks and roof
    for (const s of [a, b]) G.slate.tri(P(s, dF, yb), P(s, dF, yt), P(s, dS, yt));
    G.slate.quad(P(a - 0.08, dF + 0.1, yt), P(sc, dF + 0.1, yr + 0.06), P(sc, dE, yr + 0.06), P(a - 0.08, dS, yt));
    G.slate.quad(P(sc, dF + 0.1, yr + 0.06), P(b + 0.08, dF + 0.1, yt), P(b + 0.08, dS, yt), P(sc, dE, yr + 0.06));
    G.white.quad(P(a - 0.08, dF + 0.1, yt - 0.02), P(b + 0.08, dF + 0.1, yt - 0.02), P(b + 0.08, dF + 0.1, yt + 0.06), P(a - 0.08, dF + 0.1, yt + 0.06)); // bargeboard line
  }
}

/** Brick chimney stacks with pots on the roof slope. at: fractions along the facade; inset: metres up the slope. */
export function chimneys(K, it) {
  const { P, box, G, L, s0, H } = K, pitch = it.pitch || 0.72;
  for (const f of it.at) {
    const sc = s0 + L * f, i = it.inset || 2.6, y = H + i * pitch, top = y + (it.rise || 1.7);
    box('brick', sc, -i, (y - 0.5 + top) / 2, 0.36, 0.26, (top - y + 0.5) / 2);
    box('coping', sc, -i, top + 0.04, 0.42, 0.32, 0.05);
    for (const o of [-0.17, 0.17]) box('tile', sc + o, -i, top + 0.3, 0.07, 0.07, 0.24);
  }
  void G;
}

/**
 * A second frontage frame on another wall of the same building: the footprint edge whose middle is nearest it.at, with s
 * running from the end nearest it.from (so "the front end" is the same whichever way the footprint is wound).
 */
export function sideFrame(b, it, K, ring, inRing) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], d = Math.hypot((a[0] + c[0]) / 2 - it.at[0], (a[1] + c[1]) / 2 - it.at[1]);
    if (!best || d < best.d) best = { a, c, d };
  }
  let { a, c } = best;
  if (it.from && Math.hypot(a[0] - it.from[0], a[1] - it.from[1]) > Math.hypot(c[0] - it.from[0], c[1] - it.from[1])) [a, c] = [c, a];
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
  let nx = uz, nz = -ux; if (inRing(mx + nx * 0.3, mz + nz * 0.3, ring)) { nx = -nx; nz = -nz; }
  const P = (s, d, y) => [a[0] + ux * s + nx * d, K.g + y, a[1] + uz * s + nz * d];
  const box = (k, s, d, y, hs, hd, hy) => { const p = P(s, d, y); K.G[k].box(p[0], p[1], p[2], ux, uz, hs, hy, hd); };
  return { ...K, P, box, L, s0: 0.25, s1: L - 0.25, sm: L / 2, e: { ux, uz, nx, nz } };
}

let ledTex = null;
function ledScreen() { // an abstract bright advert (not a copy of any real one): dusk colours with soft light shapes
  if (ledTex || typeof document === 'undefined') return ledTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 288; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 288); g.addColorStop(0, '#2b1a3a'); g.addColorStop(0.45, '#c2543a'); g.addColorStop(1, '#f1b25c'); x.fillStyle = g; x.fillRect(0, 0, 512, 288);
  x.fillStyle = 'rgba(255,240,200,0.55)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(60 + i * 52, 150 + (i % 3) * 14, 26, 70, 0.2, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(20,10,30,0.55)'; x.fillRect(0, 214, 512, 74);
  ledTex = new THREE.CanvasTexture(c); ledTex.colorSpace = THREE.SRGBColorSpace; return ledTex;
}

/**
 * The Palace Cinema's side and back (supplied Street View, car-park side): a cream-rendered base along the whole wall, the tall
 * brick block at the front end with a large black-framed LED advert screen and a railing along its parapet, cream render over
 * the lower rear tower, and a steel fire-escape frame. `from` is the front end of the wall.
 */
export function cinemaSide(K) {
  const { P, box, G, L, H } = K, block = Math.min(0.46 * L, 15);
  // single-storey white annexe along the whole pavement edge, brick parapet on top, red-framed poster boxes
  const AH = 4.3;
  box('gw', L / 2, 0.06, AH / 2, L / 2, 0.08, AH / 2);
  box('brick', L / 2, 0.1, AH + 0.35, L / 2, 0.14, 0.35);
  for (let s = block + 1.4; s < L - 2.2; s += 3.0) {
    box('red', s, 0.15, 2.0, 0.78, 0.02, 0.62); box('white', s, 0.17, 2.0, 0.7, 0.02, 0.54);
  }
  // rear: bare brick for the first stretch behind the block, cream render above; cream all the way up beyond that
  const nb = Math.min(block + 5.5, L);
  box('gw', nb + (L - nb) / 2, 0.07, AH + 0.7 + (H - AH - 0.7) / 2, (L - nb) / 2, 0.08, (H - AH - 0.7) / 2);
  box('gw', block + (nb - block) / 2, 0.07, 0.62 * H + (H - 0.62 * H) / 2, (nb - block) / 2, 0.08, (H - 0.62 * H) / 2);
  box('gw', block, 0.1, H / 2, 0.14, 0.12, H / 2);                                           // pilaster where block meets tower
  const sw = block * 0.8, sx = block / 2, y0 = H - 9.2, y1 = H - 3.2;                          // LED screen
  box('black', sx, 0.1, (y0 + y1) / 2, sw / 2 + 0.12, 0.1, (y1 - y0) / 2 + 0.12);
  const t = ledScreen();
  if (t) {
    const g = new THREE.BufferGeometry(); const a = P(sx - sw / 2, 0.21, y0), b = P(sx + sw / 2, 0.21, y0), c = P(sx + sw / 2, 0.21, y1), d = P(sx - sw / 2, 0.21, y1);
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    const flip = (K.e.ux * K.e.nz - K.e.uz * K.e.nx) > 0 ? 0 : 1, [u0, u1] = flip ? [1, 0] : [0, 1];
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.name = 'frontage:led'; K.extra.push(m);
  }
  box('white', block / 2, 0.15, H + 0.12, block / 2, 0.14, 0.1);                               // coping
  for (let s = 0.3; s < block; s += 1.4) box('steel', s, 0.1, H + 0.55, 0.025, 0.025, 0.45);   // railing posts
  box('steel', block / 2, 0.1, H + 0.95, block / 2, 0.025, 0.025);
  // steel fire-escape frame against the rear tower
  const f0 = block + 2.2, f1 = Math.min(L - 1.5, f0 + 8);
  for (const s of [f0, (f0 + f1) / 2, f1]) box('black', s, 1.4, 3.1, 0.07, 0.07, 3.1);
  for (const s of [f0, f1]) box('black', s, 0.05, 3.1, 0.07, 0.07, 3.1);
  box('black', (f0 + f1) / 2, 1.4, 6.2, (f1 - f0) / 2, 0.07, 0.07); box('black', (f0 + f1) / 2, 0.7, 6.2, (f1 - f0) / 2, 0.7, 0.04);
  for (let k = 0; k < 8; k++) box('black', f0 + 0.6 + k * 0.4, 1.4, 0.4 + k * 0.7, 0.2, 0.5, 0.03); // stair treads
}
