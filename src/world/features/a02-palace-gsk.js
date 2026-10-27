// Area a02-palace-gsk: the Palace Cinema (former Ritz) built as its real massing instead of one 15 m box.
// Source photos (docs/research/hamilton-road-streetview): palace-cinema, palace-cinema-side-gsk, palace-cinema-side-led-screen,
// i-palace-rear-led-tower, i-palace-rear-fire-escape-canopy, i-palace-rear-auditorium-wall.
// The OSM footprint is extruded only to the low annexe height (4.4 m, flat, cream render, brick-capped). On top of it this file
// builds, from the photos and with estimated dimensions (scaled from a door and a car, not surveyed):
//   - the tall brick front block (15 m, 12 m deep) with the LED advert screen on its car-park side and a roof rail,
//   - the cream stair tower, the lower auditorium with a corrugated roof, and the tall rear stage-house (13.6 m) with pilasters,
//     a brick course under the roof, a rounded vent duct and a satellite dish,
//   - the steel fire escape with blue doors, the white tensile canopy, the blue steel doors, bins and the low white wall on the
//     GSK side with posters and a blue door.
// The footprint is described in a local frame: a runs from the front (Hamilton Road) back along the car-park wall, b runs from
// that wall across to the GSK side. Every mesh uses this file's own materials and goes into K.extra.

import * as THREE from 'three';
import { Geo } from '../seafront.js';
import { Textures } from '../textures.js';
import { cinemaFront } from '../frontage-features.js';

const BASE = 4.4;        // annexe / low wall height (the footprint extrusion)
const TOP_BLOCK = 15.0;  // front brick block
const TOP_TOWER = 13.6;  // rear stage-house
const TOP_MID = 9.4;     // auditorium (corrugated roof)
const TOP_STAIR = 10.4;  // cream stair tower between block and fire escape
const BLOCK_D = 12.0;    // depth of the front block along the car-park wall
const WANT = [[77.8, -466.9], [57.7, -442.9], [32.7, -461.3], [34, -469.9], [38.6, -477.6], [44.2, -477.6], [48.6, -474.2], [54.6, -482.6]];

let MT = null;
function weatheredRender() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#f6f1e2'; x.fillRect(0, 0, 256, 256);
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${100 + r() * 30},${90 + r() * 25},70,${0.015 + r() * 0.03})`; x.fillRect(r() * 256, 0, 2 + r() * 14, 256); }          // vertical rain streaks
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,252,240' : '130,120,100'},${0.03 + r() * 0.05})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, 7); x.fill(); } // patchy paint
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function ledTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 272; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 272); g.addColorStop(0, '#1a2540'); g.addColorStop(0.5, '#c2603c'); g.addColorStop(1, '#f2b968'); x.fillStyle = g; x.fillRect(0, 0, 512, 272);
  x.fillStyle = 'rgba(255,238,200,0.55)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(50 + i * 58, 140 + (i % 3) * 14, 22, 66, 0.15, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.font = 'bold 54px Arial, Helvetica, sans-serif'; x.fillText('SUMMER', 60, 70);
  x.fillStyle = 'rgba(15,10,25,0.5)'; x.fillRect(0, 214, 512, 58);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mats(K) {
  if (MT) return MT;
  const D = THREE.DoubleSide, S = (o) => new THREE.MeshStandardMaterial({ side: D, ...o });
  const wr = weatheredRender();
  const brick = K.m.brick.clone(); brick.side = D; brick.color = new THREE.Color(0.92, 0.66, 0.55);
  const rf = Textures.roofTexture('metal', 3);
  MT = {
    brick,
    render: S({ map: wr, color: wr ? 0xfffaf0 : 0xece6d2, roughness: 1, emissive: 0x3a362d }),
    roofMetal: S({ map: rf.map, normalMap: rf.normalMap, color: 0xc9d0d0, roughness: 0.6, metalness: 0.3 }),
    roofFelt: S({ color: 0x4a4b4c, roughness: 0.95 }),
    steel: S({ color: 0x4c5258, roughness: 0.5, metalness: 0.6 }),
    canopy: S({ color: 0xf1eee4, roughness: 0.85 }),
    blueBin: S({ color: 0x1e5fa8, roughness: 0.6 }), greenBin: S({ color: 0x1e5a34, roughness: 0.6 }),
    white: S({ color: 0xeeebe2, roughness: 0.8 }),
    capBrick: S({ color: 0x8a4a3a, roughness: 1 }),
  };
  return MT;
}

/** The footprint in the local frame: returns converters or null if the OSM footprint is not the one expected. */
function frame(ring) {
  const V = WANT.map((w) => { let best = null; for (const p of ring) { const d = Math.hypot(p[0] - w[0], p[1] - w[1]); if (!best || d < best.d) best = { p, d }; } return best && best.d < 2.5 ? best.p : null; });
  if (V.some((v) => !v)) return null;
  const v1 = V[1], v2 = V[2], L = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
  const u = [(v2[0] - v1[0]) / L, (v2[1] - v1[1]) / L]; let lat = [-u[1], u[0]];
  if (lat[0] * (V[0][0] - v1[0]) + lat[1] * (V[0][1] - v1[1]) < 0) lat = [-lat[0], -lat[1]];
  const loc = (p) => [(p[0] - v1[0]) * u[0] + (p[1] - v1[1]) * u[1], (p[0] - v1[0]) * lat[0] + (p[1] - v1[1]) * lat[1]];
  const wor = (a, b) => [v1[0] + a * u[0] + b * lat[0], v1[1] + a * u[1] + b * lat[1]];
  return { V, u, lat, loc, wor, Vl: V.map(loc) };
}

export const FEATURES = {
  /** The Art Deco front: the existing cinemaFront at the real block height (15 m). */
  a02Front(K) { cinemaFront({ ...K, H: TOP_BLOCK }); },

  a02Mass(K, it, ctx) {
    const F = frame(ctx.ring); if (!F) { console.warn('a02Mass: Palace footprint not as expected'); return; }
    const { u, lat, wor, Vl } = F, g = K.g, M = mats(K), G = K.G;
    const [v0, v1, v2, v3, v4, v5, v6, v7] = Vl;
    const Pw = (a, b, y) => { const p = wor(a, b); return [p[0], g + y, p[1]]; };
    const ax = (da, db) => [u[0] * da + lat[0] * db, u[1] * da + lat[1] * db];
    const geos = new Map(); const geo = (mat) => { if (!geos.has(mat)) geos.set(mat, new Geo()); return geos.get(mat); };
    /** box in local coords on one of the shared K.G materials (name) or an own material object */
    const bx = (mat, a, b, y, ha, hb, hy) => { const w = Pw(a, b, y); (typeof mat === 'string' ? G[mat] : geo(mat)).box(w[0], w[1], w[2], u[0], u[1], ha, hy, hb); };
    const bxr = (mat, a, b, y, ha, hb, hy, da, db) => { const w = Pw(a, b, y), d = ax(da, db), l = Math.hypot(d[0], d[1]); (typeof mat === 'string' ? G[mat] : geo(mat)).box(w[0], w[1], w[2], d[0] / l, d[1] / l, ha, hy, hb); };
    const signedArea = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
    const outN = (poly, i) => { const p = poly[i], q = poly[(i + 1) % poly.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, n = [(q[1] - p[1]) / l, -(q[0] - p[0]) / l]; return signedArea(poly) > 0 ? n : [-n[0], -n[1]]; };
    /** vertical walls round a local polygon; uv in metres (repeat sx, sy metres per texture tile) */
    const walls = (mat, poly, y0, y1, o = {}) => {
      const G2 = geo(mat), sx = o.sx || 3.2, sy = o.sy || 2.9, off = o.off || 0;
      for (let i = 0; i < poly.length; i++) {
        if (o.skip && o.skip.includes(i)) continue;
        const p = poly[i], q = poly[(i + 1) % poly.length], n = outN(poly, i), l = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const pa = [p[0] + n[0] * off, p[1] + n[1] * off], qa = [q[0] + n[0] * off, q[1] + n[1] * off];
        G2.quad(Pw(...pa, y0), Pw(...qa, y0), Pw(...qa, y1), Pw(...pa, y1), [[0, y0 / sy], [l / sx, y0 / sy], [l / sx, y1 / sy], [0, y1 / sy]]);
      }
    };
    const top = (mat, poly, y, sc = 3) => {
      const G2 = geo(mat), tris = THREE.ShapeUtils.triangulateShape(poly.map((p) => new THREE.Vector2(p[0], p[1])), []), n0 = G2.p.length / 3;
      for (const p of poly) { G2.p.push(...Pw(p[0], p[1], y)); G2.uv.push(p[0] / sc, p[1] / sc); }
      for (const t of tris) G2.idx.push(n0 + t[0], n0 + t[1], n0 + t[2]);
    };
    /** a coping / ledge band along every edge of a polygon (skipping some) */
    const ledge = (mat, poly, y, hh, hd, inset = 0, skip = []) => {
      for (let i = 0; i < poly.length; i++) {
        if (skip.includes(i)) continue;
        const p = poly[i], q = poly[(i + 1) % poly.length], n = outN(poly, i), l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 0.2) continue;
        const m = [(p[0] + q[0]) / 2 + n[0] * (hd - inset), (p[1] + q[1]) / 2 + n[1] * (hd - inset)];
        bxr(mat, m[0], m[1], y, l / 2, hd, hh, q[0] - p[0], q[1] - p[1]);
      }
    };
    /** a railing round a polygon edge set: posts every ~1.5 m and a top rail */
    const rail = (poly, y, skip = [], inset = 0.12) => {
      for (let i = 0; i < poly.length; i++) {
        if (skip.includes(i)) continue;
        const p = poly[i], q = poly[(i + 1) % poly.length], n = outN(poly, i), l = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.max(1, Math.round(l / 1.5));
        for (let j = 0; j <= k; j++) { const t = j / k; bx('steel', p[0] + (q[0] - p[0]) * t - n[0] * inset, p[1] + (q[1] - p[1]) * t - n[1] * inset, y + 0.5, 0.025, 0.025, 0.5); }
        bxr('steel', (p[0] + q[0]) / 2 - n[0] * inset, (p[1] + q[1]) / 2 - n[1] * inset, y + 1.0, l / 2, 0.025, 0.025, q[0] - p[0], q[1] - p[1]);
        bxr('steel', (p[0] + q[0]) / 2 - n[0] * inset, (p[1] + q[1]) / 2 - n[1] * inset, y + 0.55, l / 2, 0.015, 0.015, q[0] - p[0], q[1] - p[1]);
      }
    };
    const bAt = (a) => v0[1] + (v7[1] - v0[1]) * (a - v0[0]) / (v7[0] - v0[0]);   // b of the GSK-side wall at depth a

    // ---- brick course / cap round the low annexe roof (every edge but the front)
    const ring = Vl;
    for (let i = 0; i < ring.length; i++) {
      if (i === 0) continue; // v0 -> v1 is the front
      const p = ring[i], q = ring[(i + 1) % ring.length], n = outN(ring, i), l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const o = 0.1, pa = [p[0] + n[0] * o, p[1] + n[1] * o], qa = [q[0] + n[0] * o, q[1] + n[1] * o];
      const gb = geo(M.capBrick);
      gb.quad(Pw(...pa, BASE - 0.5), Pw(...qa, BASE - 0.5), Pw(...qa, BASE + 0.12), Pw(...pa, BASE + 0.12), [[0, 0], [l / 3.2, 0], [l / 3.2, 0.2], [0, 0.2]]);
      gb.quad(Pw(...pa, BASE + 0.12), Pw(...qa, BASE + 0.12), Pw(...q, BASE + 0.12), Pw(...p, BASE + 0.12));
    }

    // ---- A. tall front block (brick), 12 m deep, with the LED screen on its car-park side
    const bNE = bAt(BLOCK_D);
    const B = [v1, [BLOCK_D, 0], [BLOCK_D, bNE], v0];   // v1 -> (12,0) -> (12,bNE) -> v0
    walls(M.brick, B, BASE, TOP_BLOCK);
    top(M.roofFelt, B, TOP_BLOCK);
    ledge('gw', B, TOP_BLOCK + 0.1, 0.1, 0.12, 0.0, [3]);          // white coping on the three non-front edges
    ledge('gw', B, TOP_BLOCK - 0.55, 0.06, 0.08, 0.0, [3]);        // string course below it
    rail(B, TOP_BLOCK + 0.2, [3], 0.35);
    // LED screen (photo: about 9.4 m x 5 m, 3 m below the parapet, centred on the block)
    {
      const sx = BLOCK_D / 2, sw = 4.7, y0 = TOP_BLOCK - 8.0, y1 = TOP_BLOCK - 3.1;
      bx('black', sx, -0.12, (y0 + y1) / 2, sw + 0.15, 0.1, (y1 - y0) / 2 + 0.15);
      const t = ledTexture();
      if (t) {
        const g2 = new THREE.BufferGeometry();
        const pts = [Pw(sx + sw, -0.24, y0), Pw(sx - sw, -0.24, y0), Pw(sx - sw, -0.24, y1), Pw(sx + sw, -0.24, y1)];
        g2.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g2.setIndex([0, 1, 2, 0, 2, 3]); g2.computeVertexNormals();
        const m = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        m.name = 'frontage:led'; K.extra.push(m);
      }
      // small mounting cabinet and cables under the screen
      bx('black', sx - 2.5, -0.15, y0 - 1.3, 0.55, 0.12, 0.3); bx('black', sx + 3.7, -0.06, (y0 + 4.4) / 2, 0.04, 0.03, (y0 - 4.4) / 2);
    }
    // tall pilaster on the GSK-side return (photo palace-cinema-side-gsk)
    { const a = 6.0, b = bAt(a) + 0.1; bx('gw', a, b, (BASE + 0.4 + TOP_BLOCK - 1.7) / 2, 0.45, 0.1, (TOP_BLOCK - 2.1 - BASE) / 2); bx('gw', a, b + 0.02, TOP_BLOCK - 1.6, 0.62, 0.14, 0.16); bx('gw', a, b + 0.02, BASE + 0.45, 0.6, 0.14, 0.12); }
    // stepped white blocks run round the corner onto the car-park side too
    for (let y = BASE + 1.2; y < TOP_BLOCK - 1.2; y += 0.8) bx('gw', 1.0, -0.05, y, 0.22, 0.06, 0.2);

    // ---- B. stair tower (cream), 4.6 m wide, between the block and the fire escape
    const S = [[BLOCK_D, 0], [16.6, 0], [16.6, 7.5], [BLOCK_D, 7.5]];
    walls(M.render, S, TOP_MID, TOP_STAIR, { skip: [3], sx: 5, sy: 5 }); top(M.roofFelt, S, TOP_STAIR);   // only the part above the auditorium roof is new
    ledge(M.capBrick, S, TOP_STAIR - 0.3, 0.15, 0.08, 0, [3]);
    ledge('gw', S, TOP_STAIR + 0.08, 0.08, 0.1, 0, [3]);
    // steel stair-head cage on its roof
    for (const [a, b] of [[12.6, 0.5], [15.9, 0.5], [12.6, 3.2], [15.9, 3.2]]) bx('steel', a, b, TOP_STAIR + 1.1, 0.04, 0.04, 1.1);
    for (const y of [TOP_STAIR + 2.2, TOP_STAIR + 1.1]) { bx('steel', 14.25, 0.5, y, 1.7, 0.03, 0.03); bx('steel', 14.25, 3.2, y, 1.7, 0.03, 0.03); bx('steel', 12.6, 1.85, y, 0.03, 1.4, 0.03); bx('steel', 15.9, 1.85, y, 0.03, 1.4, 0.03); }

    // ---- C. auditorium (lower, corrugated roof)
    const MID = [[BLOCK_D, 0], [21, 0], [21, v6[1]], [BLOCK_D, v6[1]]];
    walls(M.render, MID, BASE, TOP_MID, { skip: [1, 3], sx: 5, sy: 5 }); top(M.roofMetal, MID, TOP_MID, 2.5);
    ledge(M.capBrick, MID, TOP_MID - 0.3, 0.15, 0.08, 0, [1, 3]);
    for (let a = BLOCK_D + 1.2; a < 21; a += 2.4) bx('steel', a, 0.2, TOP_MID + 0.05, 0.02, 0.2, 0.06); // roof gutter brackets
    rail(MID, TOP_MID + 0.05, [1, 2, 3], 0.2);

    // ---- D. stage-house (tall rear) polygon: steps in 2.4 m behind the annexe along the car-park side
    const sw0 = 23.5, inS = 2.4;
    const eB = [v2[0] + (v3[0] - v2[0]) * inS / (v3[1] - v2[1]), inS];   // where b = inS meets the footprint edge v2 -> v3
    const T = [[21, 0], [sw0, 0], [sw0, inS], eB, v3, v4, v5, v6, [21, v6[1]]];
    walls(M.render, T, BASE, TOP_TOWER - 0.6, { skip: [8], sx: 5, sy: 5 });
    walls(M.brick, T, TOP_TOWER - 0.6, TOP_TOWER, { skip: [8], off: 0.06 });   // brick course under the roofline
    top(M.roofFelt, T, TOP_TOWER);
    { const wq = geo(M.render), bq = geo(M.brick), l = T[8][1]; // its front wall above the auditorium roof (a = 21)
      wq.quad(Pw(21, l, TOP_MID), Pw(21, 0, TOP_MID), Pw(21, 0, TOP_TOWER - 0.6), Pw(21, l, TOP_TOWER - 0.6), [[0, 0], [l / 5, 0], [l / 5, 0.9], [0, 0.9]]);
      bq.quad(Pw(21.06, l, TOP_TOWER - 0.6), Pw(21.06, 0, TOP_TOWER - 0.6), Pw(21.06, 0, TOP_TOWER), Pw(21.06, l, TOP_TOWER), [[0, 0], [l / 3.2, 0], [l / 3.2, 0.2], [0, 0.2]]); }
    ledge('gw', T, TOP_TOWER + 0.1, 0.1, 0.1, 0.0, [8]);
    rail(T, TOP_TOWER + 0.2, [8], 0.35);
    // shallow pilasters on the car-park face, vent duct, dish, down pipe
    for (const a of [25.6, 29.4]) { bx('gw', a, inS - 0.14, (BASE + TOP_TOWER - 0.7) / 2, 0.42, 0.15, (TOP_TOWER - 0.7 - BASE) / 2); bx(M.capBrick, a, inS - 0.16, 8.9, 0.46, 0.18, 0.12); }
    { const a = 22.2; bx('gw', a, -0.34, 9.7, 0.58, 0.36, 3.3); bx('gw', a, -0.5, 6.35, 0.58, 0.5, 0.5); bx('gw', a, -0.4, 13.1, 0.62, 0.4, 0.14); }   // rounded vent duct (as a box with a bend at the foot)
    { const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.1, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.7, side: THREE.DoubleSide }));
      const w = Pw(27.6, inS - 0.35, 7.1), n = ax(0, -1); dish.position.set(w[0], w[1], w[2]); dish.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0.25, n[1]).normalize()); dish.name = 'frontage:dish'; K.extra.push(dish); }
    bx('black', 24.2, inS - 0.04, (BASE + TOP_TOWER) / 2, 0.05, 0.04, (TOP_TOWER - BASE) / 2); // down pipe
    bx('black', 30.85, -0.05, (BASE + 0.0) / 2, 0.05, 0.05, BASE / 2);   // down pipe at the corner

    // ---- E. ground-floor details on the car-park side and the rear (blue steel doors, vents, freezer, bins)
    const doorBlue = (a, b, hw, hh, rot) => { bx('blue', a, b, hh, hw, 0.05, hh); bx('black', a, b - 0.05, hh, 0.02, 0.03, hh); if (!rot) bx('black', a, b - 0.01, hh * 2 + 0.05, hw + 0.05, 0.05, 0.05); };
    doorBlue(27.3, -0.06, 0.95, 1.15);                      // annexe doors (pair)
    bx('black', 24.5, -0.04, 1.2, 0.75, 0.05, 1.2);          // dark recess by the canopy
    for (const a of [29.0, 30.6]) bx('black', a, -0.06, 2.4, 0.12, 0.03, 0.08); // vents
    bx('white', 29.8, -0.7, 0.5, 0.65, 0.4, 0.5); bx('black', 29.3, -0.7, 1.02, 0.03, 0.42, 0.03); bx('black', 30.3, -0.7, 1.02, 0.03, 0.42, 0.03); // chest freezer
    for (const a of [31.3, 32.4]) bx('coping', a, -0.45, 0.4, 0.14, 0.14, 0.4);   // bollards
    { // rear (W) face door: blue pair near the corner, down pipe
      const ex = v3[0] - v2[0], eb = v3[1] - v2[1], l = Math.hypot(ex, eb), n = [eb / l, -ex / l], d = 1.9;
      bxr('blue', v2[0] + ex / l * d + n[0] * 0.05, v2[1] + eb / l * d + n[1] * 0.05, 1.2, 0.95, 0.05, 1.2, ex, eb);
      bxr('black', v2[0] + ex / l * (d + 1.2) + n[0] * 0.06, v2[1] + eb / l * (d + 1.2) + n[1] * 0.06, 2.6, 0.12, 0.03, 0.08, ex, eb); }
    for (const [a, b, mat] of [[22.4, -5.6, M.greenBin], [24.1, -6.2, M.blueBin], [28.6, -3.4, M.blueBin]]) { bx(mat, a, b, 0.55, 0.4, 0.38, 0.55); bx('black', a, b, 1.12, 0.42, 0.4, 0.04); }

    // ---- F. steel fire escape against the cream wall (bay a 16.8 - 21.2), blue doors on the first landing
    {
      const A0 = 16.9, A1 = 21.2, OUT = -2.9, PY = 6.0, MY = 3.0;
      for (const a of [A0, (A0 + A1) / 2, A1]) { bx(M.steel, a, OUT, 4.3, 0.06, 0.06, 4.6); bx(M.steel, a, -0.08, 4.3, 0.05, 0.05, 4.6); bx(M.steel, a, OUT / 2, 8.85, 0.05, -OUT / 2, 0.05); }
      for (const y of [PY, 8.9, MY]) { bx(M.steel, (A0 + A1) / 2, OUT, y, (A1 - A0) / 2, 0.05, 0.05); }
      bx(M.steel, A0, OUT / 2, PY, 0.05, -OUT / 2, 0.05); bx(M.steel, A1, OUT / 2, PY, 0.05, -OUT / 2, 0.05);
      bx(M.steel, (A0 + A1) / 2, OUT / 2, PY - 0.06, (A1 - A0) / 2, -OUT / 2, 0.05);                    // landing deck
      bx(M.steel, (19.6 + A1) / 2, OUT / 2, MY - 0.06, (A1 - 19.6) / 2, -OUT / 2 - 0.1, 0.05);          // mid landing
      for (const [fa0, fa1, fb, y0, y1] of [[A0 + 0.1, 19.6, -2.35, 0.1, MY], [19.6, A0 + 0.1, -1.35, MY, PY]]) { // two flights
        const n = 10;
        for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; bx(M.steel, fa0 + (fa1 - fa0) * t, fb, y0 + (y1 - y0) * t, 0.13, 0.46, 0.03); }
        const gs = geo(M.steel); for (const bb of [fb - 0.5, fb + 0.5]) gs.quad(Pw(fa0, bb, y0), Pw(fa1, bb, y1), Pw(fa1, bb, y1 + 0.28), Pw(fa0, bb, y0 + 0.28)); // stringers
        for (const bb of [fb - 0.5, fb + 0.5]) { const gp = geo(M.steel); gp.quad(Pw(fa0, bb, y0 + 0.95), Pw(fa1, bb, y1 + 0.95), Pw(fa1, bb, y1 + 1.0), Pw(fa0, bb, y0 + 1.0)); }
      }
      for (let a = A0; a <= A1 + 0.01; a += 0.6) bx(M.steel, a, OUT, PY + 0.5, 0.02, 0.02, 0.5);
      bx(M.steel, (A0 + A1) / 2, OUT, PY + 1.0, (A1 - A0) / 2, 0.03, 0.03);
      for (const a of [17.9, 20.2]) { bx('blue', a, -0.04, PY + 1.1, 0.5, 0.04, 1.1); bx('black', a, -0.07, PY + 1.1, 0.02, 0.03, 1.1); }   // blue doors at the first landing
      for (const [a, b] of [[A0, OUT], [A1, OUT]]) K.colliders.push({ type: 'circle', x: Pw(a, b, 0)[0], z: Pw(a, b, 0)[2], r: 0.2, y0: g - 0.5, top: g + 8, kind: 'post' });
    }

    // ---- G. white tensile canopy in front of the annexe
    {
      const c = [[22.8, -5.0, 2.9], [28.0, -5.0, 4.5], [28.0, -0.4, 2.9], [22.8, -0.4, 4.5]], mid = [25.4, -2.7, 3.7], gc = geo(M.canopy);
      for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; gc.p.push(...Pw(...mid.slice(0, 2), mid[2]), ...Pw(p[0], p[1], p[2]), ...Pw(q[0], q[1], q[2])); const n = gc.p.length / 3 - 3; gc.uv.push(0.5, 0.5, 0, 0, 1, 0); gc.idx.push(n, n + 1, n + 2); }
      for (const p of c) { bx(M.steel, p[0], p[1], p[2] / 2 - 0.1, 0.05, 0.05, p[2] / 2 + 0.1); }
      for (const p of [c[0], c[1]]) K.colliders.push({ type: 'circle', x: Pw(p[0], p[1], 0)[0], z: Pw(p[0], p[1], 0)[2], r: 0.18, y0: g - 0.5, top: g + 3.5, kind: 'post' });
    }

    // ---- H. the GSK-side low white wall: poster frames, bench, blue door (photo palace-cinema-side-gsk). Outward is +b.
    {
      const frame2 = (a, w, h, col) => { const b = bAt(a) + 0.04; bx(col, a, b, 1.85, w / 2 + 0.04, 0.03, h / 2 + 0.04); bx('black', a, b + 0.03, 1.85, w / 2, 0.02, h / 2); };
      frame2(3.6, 1.05, 1.45, 'red'); frame2(5.0, 1.05, 1.45, 'red');
      frame2(13.5, 1.2, 1.5, 'red'); frame2(15.4, 1.2, 1.5, 'red'); frame2(17.4, 1.2, 1.5, 'cream'); frame2(19.3, 1.2, 1.5, 'cream');
      { const a = 8.6, b = bAt(a) + 0.04; bx('blue', a, b, 1.2, 1.0, 0.05, 1.2); bx('black', a, b + 0.04, 1.2, 0.02, 0.02, 1.2); bx('black', a, b + 0.03, 2.45, 1.05, 0.04, 0.04); }
      { const a = 6.3, b = bAt(a) + 0.7; bx('timber', a, b, 0.5, 0.8, 0.22, 0.04); bx('timber', a, b + 0.2, 0.85, 0.8, 0.04, 0.3); for (const dx of [-0.65, 0.65]) bx('black', a + dx, b, 0.25, 0.03, 0.2, 0.25); } // bench
      { const a = 4.3, b = bAt(a) + 0.6; bx('black', a, b, 0.5, 0.3, 0.3, 0.5); }                                                                               // bin
    }

    for (const [mat, gg] of geos) { const m = gg.mesh(mat); if (m) { m.name = 'frontage:a02mass'; K.extra.push(m); } }
  },
};
