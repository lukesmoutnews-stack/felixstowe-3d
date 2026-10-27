// Area a09-orwell-hotel: custom building features. Export functions keyed by the `t` name used in your FRONTAGES details.
// Signature: (K, it, ctx) where K is the frame object from frontage-details.js and ctx = { b, ring, pointInRing, sideFrame }.
//
// The Orwell Hotel (Hamilton Road roundabout), from the user's Street View photos (docs/research/hamilton-road-streetview:
// e-orwell-hotel-front/-corner/-roundabout, f-orwell-hotel-road-view, f-orwell-elephant-barrel-curve, f-orwell-brick-wall-busstop).
// All dimensions are estimates scaled from the photos (door and window heights for scale), not surveyed.
//
// OSM draws the hotel and the single-storey Elephant & Barrel bar wing as one footprint, so the frontage is set to bar height
// and this feature builds everything else as its own meshes (world coordinates, own brick material):
//   - the three-storey hotel block over the north part of the footprint, red brick with cream stone dressings,
//     three Dutch (shaped) gables with stone copings and finials, balustraded recessed bays, two-storey canted stone bays,
//     the arched entrance porch with its sign, tall clustered chimneys on the roofs, and a white plinth;
//   - a lower brick wing to the east and north (not photographed, a guess), flat roofed;
//   - the bar wing: white plinth and fascia, leaded windows, the navy Elephant and Barrel banners.
import * as THREE from 'three';
import { Textures } from '../textures.js';
import { triangulate } from '../accum.js';
import { label } from '../frontage-features.js';

// ---- footprint points (OSM 358416921, world metres) ----
const A = [183.9, -851.7], B = [180.1, -820.0];            // west (roundabout) wall, north to south
const BAR = [[180.1, -820.0], [183.4, -816.7], [188.1, -815.7], [192.4, -818.2], [224.4, -812.2]]; // curved west end and south wall
const H_ = [205.3, -834.1], I_ = [205.6, -839.1];
const NE = [[205.6, -839.1], [233.5, -840.5], [242.5, -841.0], [246.2, -859.6], [238.0, -861.5], [235.4, -850.3], [233.4, -850.3], [231.1, -850.3], [232.1, -861.2], [219.6, -859.7], [218.5, -866.8]];
const T_ = [194.1, -861.6], MN = [206.5, -864.2];

const Y_BAR = 3.6;          // bar eaves (body height)
const Y_EAVES = 10.4;       // hotel eaves / parapet line over the recessed bays
const Y_WING = 9.0;         // east and north brick wings (guess)
const ZCUT = -822.6;        // where the tall hotel block ends and the bar wing begins

// ---- materials ----
const MD = {
  white: { color: 0xf3f1ea, roughness: 0.6 }, stone: { color: 0xe6d8b6, roughness: 0.85 }, stoneDk: { color: 0xcfc09a, roughness: 0.9 },
  glass: { color: 0x3f525e, roughness: 0.12, metalness: 0.35 }, glassLt: { color: 0x7d93a0, roughness: 0.12, metalness: 0.3 },
  lead: { color: 0x56595c, roughness: 0.7 }, slate: { color: 0x4a4e55, roughness: 0.8 }, black: { color: 0x1c1d20, roughness: 0.45, metalness: 0.4 },
  dark: { color: 0x2d3033, roughness: 0.6 }, navy: { color: 0x1b2656, roughness: 0.5 }, tan: { color: 0xb5a068, roughness: 0.6 },
  sign: { color: 0x36393c, roughness: 0.55 }, pipe: { color: 0x25272a, roughness: 0.5, metalness: 0.4 }, door: { color: 0x6a4b36, roughness: 0.7 },
  pot: { color: 0xa0522d, roughness: 0.9 }, red: { color: 0xb0161f, roughness: 0.45 }, blue: { color: 0x1c3f7a, roughness: 0.5, metalness: 0.3 }, grill: { color: 0x2a2c2e, roughness: 0.6 },
};
const MC = {};
function material(k, tint) {
  const key = k + (tint ?? '');
  if (MC[key]) return MC[key];
  let m;
  if (k === 'brick') {
    const o = { roughness: 1, side: THREE.DoubleSide };
    if (typeof document !== 'undefined') { const t = Textures.facadeTexture('brick_red', false, 61, 0); o.map = t.map; o.normalMap = t.normalMap; }
    m = new THREE.MeshStandardMaterial(o); m.color.setRGB(1.4, 1.06, 0.88);   // warm orange-red facing brick (the photos)
  } else m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...MD[k] });
  MC[key] = m; return m;
}

// ---- a wall plane: u along it (a -> c), off out from the wall, y up from the ground ----
function makePlane(K, Geo, acc, a, c, hint) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
  let nx = uz, nz = -ux; if (hint && nx * hint[0] + nz * hint[1] < 0) { nx = -nx; nz = -nz; }
  const g = K.g;
  const pl = { L, ux, uz, nx, nz, a, c };
  pl.at = (u, off, y) => [a[0] + ux * u + nx * off, g + y, a[1] + uz * u + nz * off];
  pl.quad = (k, u0, u1, y0, y1, off = 0.0, uv) => acc(k).quad(pl.at(u0, off, y0), pl.at(u1, off, y0), pl.at(u1, off, y1), pl.at(u0, off, y1), uv);
  pl.tri = (k, p, q, r) => acc(k).tri(pl.at(...p), pl.at(...q), pl.at(...r));
  /** box from u0..u1, off0..off1, y0..y1 */
  pl.slab = (k, u0, u1, o0, o1, y0, y1) => { const p = pl.at((u0 + u1) / 2, (o0 + o1) / 2, (y0 + y1) / 2); acc(k).box(p[0], p[1], p[2], ux, uz, Math.abs(u1 - u0) / 2, Math.abs(y1 - y0) / 2, Math.abs(o1 - o0) / 2); };
  /** brick quad: texture 3.2 x 2.9 m, keyed to world metres along the wall and up */
  pl.brick = (u0, u1, y0, y1, off = 0) => pl.quad('brick', u0, u1, y0, y1, off, [[u0 / 3.2, y0 / 2.9], [u1 / 3.2, y0 / 2.9], [u1 / 3.2, y1 / 2.9], [u0 / 3.2, y1 / 2.9]]);
  return pl;
}

/** Sash window with a stone surround on a plane. o: cols, rows, arch, stone (false = none), frame ('white'). */
function sash(pl, u, y0, y1, w, o = {}) {
  const cols = o.cols ?? 2, rows = o.rows ?? 3, t = 0.05, fk = 'white', d = o.d ?? 0.03;
  pl.quad(o.glass || 'glass', u - w / 2, u + w / 2, y0, y1, d);
  for (const e of [-1, 1]) pl.slab(fk, u + e * w / 2 - t / 2, u + e * w / 2 + t / 2, d, d + 0.07, y0, y1);
  pl.slab(fk, u - w / 2, u + w / 2, d, d + 0.07, y0, y0 + t); pl.slab(fk, u - w / 2, u + w / 2, d, d + 0.07, y1 - t, y1);
  for (let i = 1; i < cols; i++) pl.slab(fk, u - w / 2 + w * i / cols - 0.02, u - w / 2 + w * i / cols + 0.02, d, d + 0.06, y0, y1);
  for (let j = 1; j < rows; j++) { const y = y0 + (y1 - y0) * j / rows; pl.slab(fk, u - w / 2, u + w / 2, d, d + 0.06, y - 0.02, y + 0.02); }
  if (o.stone !== false) {
    const sw = o.sw ?? 0.2;
    for (const e of [-1, 1]) pl.slab('stone', u + e * (w / 2), u + e * (w / 2 + sw), 0, 0.09, y0 - 0.12, y1 + 0.3);
    pl.slab('stone', u - w / 2 - sw, u + w / 2 + sw, 0, 0.11, y1, y1 + 0.3);              // lintel
    pl.slab('stone', u - w / 2 - sw - 0.05, u + w / 2 + sw + 0.05, 0, 0.17, y0 - 0.14, y0 - 0.02); // sill
  }
}

/** The Dutch gable outline: half-width at height y above the eaves (ogee steps), for a bay of half-width h. */
function gableProfile(h, rise) {
  const smooth = (t) => t * t * (3 - 2 * t);
  const seg = [ // [yFrac0, yFrac1, hFrac0, hFrac1]
    [0.00, 0.30, 1.00, 1.00], [0.30, 0.46, 1.00, 0.58], [0.46, 0.62, 0.58, 0.58], [0.62, 0.78, 0.58, 0.22], [0.78, 0.84, 0.22, 0.22], [0.84, 1.00, 0.22, 0.0],
  ];
  const pts = []; // [halfWidth, y]
  for (const [y0, y1, h0, h1] of seg) {
    const n = h0 === h1 ? 1 : 7;
    for (let i = 0; i <= n; i++) { const t = i / n, hw = h * (h0 + (h1 - h0) * smooth(t)); pts.push([hw, rise * (y0 + (y1 - y0) * t)]); }
  }
  return pts;
}

/** A minimal frame for the shared label() helper on one of our planes. */
const lk = (pl, K) => ({ P: pl.at, e: { ux: pl.ux, uz: pl.uz, nx: pl.nx, nz: pl.nz }, extra: K.extra });

export const FEATURES = {
  orwellHotel(K, it, ctx) {
    const Geo = K.G.gw.constructor, accs = {};
    const acc = (k) => accs[k] || (accs[k] = new Geo());
    const ring = ctx.ring, inRing = ctx.pointInRing;
    const g0 = K.g;
    const hintOut = (p, c) => { // outward normal hint for the footprint ring: from the nearest ring point
      const mx = (p[0] + c[0]) / 2, mz = (p[1] + c[1]) / 2, ux = c[0] - p[0], uz = c[1] - p[1], L = Math.hypot(ux, uz) || 1;
      const nx = uz / L, nz = -ux / L; return inRing(mx + nx * 0.3, mz + nz * 0.3, ring) ? [-nx, -nz] : [nx, nz];
    };

    // ===== polygons of the raised volumes =====
    const Bp = [A[0] + (B[0] - A[0]) * ((ZCUT - A[1]) / (B[1] - A[1])), ZCUT];    // west wall at the cut line
    const Hs = [H_[0], ZCUT];
    const M = [A, Bp, Hs, H_, I_, MN, T_];                                         // the hotel block
    const W = [I_, ...NE.slice(1), MN];                                            // the east and north wings
    void W;

    // ===== the west (roundabout) facade =====
    const F = makePlane(K, Geo, acc, A, Bp, hintOut(A, B));  // u: north -> south, off: west
    const LF = F.L;
    // bay layout along the facade (metres from the north end): end bay, gable, recess, gable (entrance), recess, gable
    const bays = [
      { k: 'end', u0: 0.0, u1: 3.4 },
      { k: 'g1', u0: 3.4, u1: 9.4, rise: 4.4 },
      { k: 'r1', u0: 9.4, u1: 13.0 },
      { k: 'g2', u0: 13.0, u1: 19.6, rise: 5.2 },
      { k: 'r2', u0: 19.6, u1: 22.8 },
      { k: 'g3', u0: 22.8, u1: Math.min(LF, 29.0), rise: 5.6 },
    ];
    const FL = [{ y0: 0.95, y1: 3.45 }, { y0: 4.7, y1: 6.95 }, { y0: 8.0, y1: 9.9 }];  // window sill and head by floor

    // walls: brick from the top of the bar wall to the eaves; the recesses carry on to a pierced balustrade
    const uEnd = bays[bays.length - 1].u1;
    F.brick(0, uEnd, 3.0, Y_EAVES + 0.1, 0.02);
    // white plinth
    F.slab('white', 0, uEnd, 0, 0.14, -0.25, 0.9);
    F.slab('stone', 0, uEnd, 0, 0.1, 0.9, 1.0);
    // storey string courses and the eaves cornice
    for (const y of [4.25, 7.45]) F.slab('stone', 0, uEnd, 0, 0.13, y - 0.1, y + 0.1);
    F.slab('stone', 0, uEnd, 0, 0.22, Y_EAVES - 0.2, Y_EAVES + 0.05);

    // brick pilasters / stone quoins up both sides of each gable bay
    const quoins = (u, y0, y1, side) => { for (let y = y0, i = 0; y < y1; y += 0.42, i++) { const long = i % 2 === 0, w = long ? 0.55 : 0.28; F.slab('stone', side > 0 ? u - w : u, side > 0 ? u : u + w, 0, 0.1, y, y + 0.34); } };
    for (const b of bays) if (b.rise) { quoins(b.u0 + 0.12, 1.0, Y_EAVES, 1); quoins(b.u1 - 0.12, 1.0, Y_EAVES, -1); }

    // windows by bay
    // end bay (Harry's Bar door on the ground floor, narrow sashes above)
    sash(F, 1.7, FL[1].y0, FL[1].y1, 1.0, { cols: 1, rows: 3 });
    sash(F, 1.7, FL[2].y0, FL[2].y1, 1.0, { cols: 1, rows: 2 });
    sash(F, 1.7, FL[0].y0 + 1.0, FL[0].y1, 1.0, { cols: 1, rows: 3 });
    F.slab('door', 2.6, 3.2, 0.02, 0.1, 0.1, 2.3); F.slab('black', 2.4, 3.4, 0.02, 0.2, 2.35, 2.55);
    // recesses: paired windows on the upper floors, a window below, pierced balustrade at the top
    for (const b of bays) if (b.k === 'r1' || b.k === 'r2') {
      const c = (b.u0 + b.u1) / 2;
      sash(F, c, FL[0].y0, FL[0].y1, 1.2, { cols: 2, rows: 3 }); sash(F, c, FL[1].y0, FL[1].y1, 1.1, { cols: 2, rows: 3 }); sash(F, c, FL[2].y0, FL[2].y1, 1.0, { cols: 2, rows: 2 });
      F.slab('brick', b.u0, b.u1, 0.02, 0.22, Y_EAVES, Y_EAVES + 0.85);
      F.slab('stone', b.u0 - 0.05, b.u1 + 0.05, 0, 0.3, Y_EAVES + 0.85, Y_EAVES + 1.0);
      for (let u = b.u0 + 0.3; u < b.u1 - 0.2; u += 0.6) F.slab('dark', u - 0.12, u + 0.12, 0.2, 0.24, Y_EAVES + 0.25, Y_EAVES + 0.6);
    }

    // ---- the three Dutch gables ----
    for (const b of bays) if (b.rise) {
      const c = (b.u0 + b.u1) / 2, h = (b.u1 - b.u0) / 2 + 0.05, prof = gableProfile(h, b.rise);
      // brick face by horizontal slices (width never grows with height)
      for (let i = 0; i < prof.length - 1; i++) {
        const [w0, y0] = prof[i], [w1, y1] = prof[i + 1]; if (y1 - y0 < 1e-4) continue;
        const yb0 = Y_EAVES + y0, yb1 = Y_EAVES + y1;
        acc('brick').quad(F.at(c - w0, 0.02, yb0), F.at(c + w0, 0.02, yb0), F.at(c + w1, 0.02, yb1), F.at(c - w1, 0.02, yb1), [[(c - w0) / 3.2, yb0 / 2.9], [(c + w0) / 3.2, yb0 / 2.9], [(c + w1) / 3.2, yb1 / 2.9], [(c - w1) / 3.2, yb1 / 2.9]]);
        // stone coping along both sloping edges (a band, slightly proud), and the rake
        for (const e of [-1, 1]) {
          const x0 = c + e * w0, x1 = c + e * w1, o = 0.26 * e;
          acc('stone').quad(F.at(x0, 0.05, yb0), F.at(x0 + o, 0.05, yb0), F.at(x1 + o, 0.05, yb1), F.at(x1, 0.05, yb1));
        }
      }
      // windows in the gable: a sash on the first stage and a round window on the second
      const yStage1 = Y_EAVES + 0.15;
      sash(F, c, yStage1, yStage1 + b.rise * 0.27, Math.min(1.5, h * 0.9), { cols: 2, rows: 2 });
      const yr = Y_EAVES + b.rise * 0.54, rr = 0.34;
      for (let i = 0; i < 12; i++) { const a0 = i * Math.PI / 6, a1 = (i + 1) * Math.PI / 6; acc('dark').tri(F.at(c, 0.04, yr), F.at(c + Math.cos(a0) * rr, 0.04, yr + Math.sin(a0) * rr), F.at(c + Math.cos(a1) * rr, 0.04, yr + Math.sin(a1) * rr)); }
      for (let i = 0; i < 12; i++) { const a0 = i * Math.PI / 6, a1 = (i + 1) * Math.PI / 6, r0 = rr, r1 = rr + 0.14; acc('stone').quad(F.at(c + Math.cos(a0) * r0, 0.05, yr + Math.sin(a0) * r0), F.at(c + Math.cos(a0) * r1, 0.05, yr + Math.sin(a0) * r1), F.at(c + Math.cos(a1) * r1, 0.05, yr + Math.sin(a1) * r1), F.at(c + Math.cos(a1) * r0, 0.05, yr + Math.sin(a1) * r0)); }
      // finial on the apex
      const ya = Y_EAVES + b.rise;
      F.slab('stone', c - 0.22, c + 0.22, 0.0, 0.34, ya - 0.1, ya + 0.3); F.slab('stone', c - 0.14, c + 0.14, 0.05, 0.27, ya + 0.3, ya + 0.75);
      acc('stone').tri(F.at(c - 0.14, 0.05, ya + 0.75), F.at(c + 0.14, 0.05, ya + 0.75), F.at(c, 0.05, ya + 1.15));
      F.slab('stone', c - 0.09, c + 0.09, 0.09, 0.23, ya + 0.75, ya + 1.0);
      // small stone ball finials on the shoulders where the ogee steps
      for (const [fr, e] of [[0.30, 1], [0.30, -1]]) F.slab('stone', c + e * h - 0.14, c + e * h + 0.14, -0.05, 0.25, Y_EAVES + b.rise * fr, Y_EAVES + b.rise * fr + 0.5);
    }
    // end bay: a small shaped gable and finial
    { const c = 1.7, h = 1.75, rise = 2.2, prof = gableProfile(h, rise);
      for (let i = 0; i < prof.length - 1; i++) {
        const [w0, y0] = prof[i], [w1, y1] = prof[i + 1]; if (y1 - y0 < 1e-4) continue;
        const yb0 = Y_EAVES + y0, yb1 = Y_EAVES + y1;
        acc('brick').quad(F.at(c - w0, 0.02, yb0), F.at(c + w0, 0.02, yb0), F.at(c + w1, 0.02, yb1), F.at(c - w1, 0.02, yb1), [[(c - w0) / 3.2, yb0 / 2.9], [(c + w0) / 3.2, yb0 / 2.9], [(c + w1) / 3.2, yb1 / 2.9], [(c - w1) / 3.2, yb1 / 2.9]]);
        for (const e of [-1, 1]) { const x0 = c + e * w0, x1 = c + e * w1, o = 0.22 * e; acc('stone').quad(F.at(x0, 0.05, yb0), F.at(x0 + o, 0.05, yb0), F.at(x1 + o, 0.05, yb1), F.at(x1, 0.05, yb1)); }
      }
      F.slab('stone', c - 0.12, c + 0.12, 0.0, 0.24, Y_EAVES + rise - 0.1, Y_EAVES + rise + 0.6);
    }

    // ---- entrance porch under the middle gable: arched door, projecting balustraded roof, the hotel sign ----
    { const c = (bays[3].u0 + bays[3].u1) / 2, pw = 4.4, pd = 0.95, ph = 4.1;
      F.slab('brick', c - pw / 2, c + pw / 2, 0.0, pd, 0.9, ph);
      F.slab('white', c - pw / 2 - 0.12, c + pw / 2 + 0.12, 0, pd + 0.1, -0.25, 1.0);
      F.slab('stone', c - pw / 2 - 0.1, c + pw / 2 + 0.1, 0, pd + 0.1, ph, ph + 0.15);
      F.slab('stone', c - pw / 2 - 0.05, c + pw / 2 + 0.05, pd - 0.1, pd + 0.1, ph + 0.15, ph + 0.2);
      for (let u = c - pw / 2 + 0.2; u < c + pw / 2 - 0.1; u += 0.5) F.slab('stone', u - 0.08, u + 0.08, pd - 0.06, pd + 0.06, ph + 0.2, ph + 0.95); // balusters
      F.slab('stone', c - pw / 2 - 0.05, c + pw / 2 + 0.05, pd - 0.1, pd + 0.12, ph + 0.95, ph + 1.1);
      // arched entrance
      const ar = 0.95, ay = 2.1, ou = c, dd = pd + 0.03;
      F.quad('glass', ou - ar, ou + ar, 0.95, ay, dd);
      for (let i = 0; i < 10; i++) { const a0 = Math.PI * i / 10, a1 = Math.PI * (i + 1) / 10; acc('glass').tri(F.at(ou, dd, ay), F.at(ou + Math.cos(a0) * ar, dd, ay + Math.sin(a0) * ar), F.at(ou + Math.cos(a1) * ar, dd, ay + Math.sin(a1) * ar)); }
      for (let i = 0; i < 10; i++) { const a0 = Math.PI * i / 10, a1 = Math.PI * (i + 1) / 10, r1 = ar + 0.22; acc('stone').quad(F.at(ou + Math.cos(a0) * ar, dd + 0.02, ay + Math.sin(a0) * ar), F.at(ou + Math.cos(a0) * r1, dd + 0.02, ay + Math.sin(a0) * r1), F.at(ou + Math.cos(a1) * r1, dd + 0.02, ay + Math.sin(a1) * r1), F.at(ou + Math.cos(a1) * ar, dd + 0.02, ay + Math.sin(a1) * ar)); }
      F.slab('stone', ou - ar - 0.22, ou - ar, pd, pd + 0.06, 0.95, ay); F.slab('stone', ou + ar, ou + ar + 0.22, pd, pd + 0.06, 0.95, ay);
      F.slab('white', ou - ar, ou + ar, pd, pd + 0.07, 1.6, 1.65); F.slab('white', ou - 0.02, ou + 0.02, pd, pd + 0.07, 0.95, 2.1 + ar);
      for (const e of [-1, 1]) { F.quad('glassLt', c + e * 1.55 - 0.18, c + e * 1.55 + 0.18, 1.1, 2.7, dd); F.slab('stone', c + e * 1.55 - 0.3, c + e * 1.55 + 0.3, pd, pd + 0.06, 0.95, 2.85); F.quad('glassLt', c + e * 1.55 - 0.18, c + e * 1.55 + 0.18, 1.1, 2.7, dd + 0.02); }
      // "The Orwell Hotel" board over the porch (grey, white serif lettering)
      F.slab('sign', c - 2.3, c + 2.3, pd - 0.05, pd + 0.2, 2.95, 3.75);
      label(lk(F, K), 'The Orwell Hotel', c - 2.1, c + 2.1, pd + 0.22, 3.05, 3.65, { fg: '#f2f0ea' });
    }

    // ---- two-storey canted stone bays under gables 1 and 3, and the middle upper balconette ----
    const bayWin = (pl, uc, ww, y0, y1, cols) => { sash(pl, uc, y0, y1, ww, { cols, rows: 3, stone: false, d: 0.02 }); };
    const canted = (uc, front, depth, y0, y1) => {
      // plan points (u, off): wall, front corner, front corner, wall
      const hw = front / 2, P = [[uc - hw - depth, 0], [uc - hw, depth], [uc + hw, depth], [uc + hw + depth, 0]];
      const faces = [[P[0], P[1]], [P[1], P[2]], [P[2], P[3]]];
      for (const [pa, pc] of faces) {
        const wa = F.at(pa[0], pa[1], 0), wc = F.at(pc[0], pc[1], 0);
        const pl = makePlane(K, Geo, acc, [wa[0], wa[2]], [wc[0], wc[2]], [F.nx, F.nz]);
        const len = pl.L;
        for (let f = 0; f < 2; f++) {
          const fy0 = f === 0 ? 0.9 : 4.35, fy1 = f === 0 ? 4.2 : 7.4;
          pl.brick(0, len, fy0, fy1, 0.01);                                                 // brick backing between the stone dressings
          pl.quad('stone', 0, len, fy0, fy0 + (f === 0 ? 0.6 : 0.55), 0.02);             // stone apron under the windows
          pl.quad('stone', 0, len, fy1 - 0.45, fy1, 0.02);                                // stone head band
          bayWin(pl, len / 2, Math.max(0.5, len - 0.4), fy0 + 0.55, fy1 - 0.45, len > 2 ? 3 : 2);
          for (const e of [0, len]) pl.slab('stone', e - 0.11, e + 0.11, 0, 0.1, fy0, fy1);
        }
        pl.slab('stone', 0, len, 0, 0.1, 4.2, 4.5); pl.slab('stone', 0, len, 0, 0.14, 7.4, 7.62);
      }
      // roof deck of the bay with a stone balustrade (the balustrades seen on the first-floor bays)
      const top = 7.62;
      const q = P.map((p) => F.at(p[0], p[1] + 0.1, top)); acc('lead').quad(q[0], q[1], q[2], q[3]);
      for (let i = 0; i < 3; i++) {
        const pa = P[i], pc = P[i + 1], len = Math.hypot(pc[0] - pa[0], pc[1] - pa[1]), n = Math.max(2, Math.round(len / 0.3));
        const ex = pa[1] + 0.12; void ex;
        for (let k = 0; k <= n; k++) { const t = k / n, p = [pa[0] + (pc[0] - pa[0]) * t, pa[1] + (pc[1] - pa[1]) * t + 0.06]; const w = F.at(p[0], p[1], top + 0.4); acc('stone').box(w[0], w[1], w[2], F.ux, F.uz, 0.045, 0.28, 0.045); }
        const w0 = F.at(pa[0], pa[1] + 0.06, top + 0.84), w1 = F.at(pc[0], pc[1] + 0.06, top + 0.84), cx = (w0[0] + w1[0]) / 2, cz = (w0[2] + w1[2]) / 2, dl = Math.hypot(w1[0] - w0[0], w1[2] - w0[2]);
        acc('stone').box(cx, w0[1], cz, (w1[0] - w0[0]) / dl, (w1[2] - w0[2]) / dl, dl / 2, 0.05, 0.1);
        const b0 = F.at(pa[0], pa[1] + 0.06, top + 0.15), b1 = F.at(pc[0], pc[1] + 0.06, top + 0.15); acc('stone').box((b0[0] + b1[0]) / 2, b0[1], (b0[2] + b1[2]) / 2, (b1[0] - b0[0]) / dl, (b1[2] - b0[2]) / dl, dl / 2, 0.08, 0.1);
      }
    };
    canted((bays[1].u0 + bays[1].u1) / 2, 2.6, 1.0, 0.9, 7.4);                    // gable 1
    canted((bays[5].u0 + bays[5].u1) / 2, 3.4, 1.1, 0.9, 7.4);                    // gable 3: the big stone bay
    // windows above the bays (second floor) in gable 1 and 3, a pair above the porch in gable 2
    sash(F, (bays[1].u0 + bays[1].u1) / 2, FL[2].y0, FL[2].y1, 1.3, { cols: 2, rows: 2 });
    sash(F, (bays[5].u0 + bays[5].u1) / 2, FL[2].y0, FL[2].y1, 1.5, { cols: 2, rows: 2 });
    { const c = (bays[3].u0 + bays[3].u1) / 2; sash(F, c - 0.1, FL[1].y0, FL[1].y1, 1.5, { cols: 2, rows: 3 }); sash(F, c - 0.1, FL[2].y0, FL[2].y1, 1.5, { cols: 2, rows: 2 }); }
    // windows to the sides of gable 2 and gable 1 in the ground and first floors beside the bays are covered by the recesses; the end bay has its own
    // balustraded balcony on the first floor of gable 2
    { const c = (bays[3].u0 + bays[3].u1) / 2; void c; }

    // downpipes, cast iron (black), at the bay joins
    for (const u of [3.4, 9.4, 13.0, 19.6, 22.8]) F.slab('pipe', u - 0.05, u + 0.05, 0.02, 0.14, 0.1, Y_EAVES);

    // ===== roofs of the hotel block (slate gables behind the Dutch gable fronts, lead flats between) =====
    const roofD = 21.0; // run of the roofs back from the facade
    for (const b of bays) if (b.rise) {
      const h = (b.u1 - b.u0) / 2, c = (b.u0 + b.u1) / 2, rr = Math.min(3.6, h * 1.1), yr = Y_EAVES + rr;
      const o = 0.0;
      const q = (u, d, y) => F.at(u, d, y);
      acc('slate').quad(q(b.u0, -o, Y_EAVES), q(b.u0, -roofD, Y_EAVES), q(c, -roofD, yr), q(c, -o, yr));
      acc('slate').quad(q(c, -o, yr), q(c, -roofD, yr), q(b.u1, -roofD, Y_EAVES), q(b.u1, -o, Y_EAVES));
      acc('brick').tri(q(b.u0, -roofD, Y_EAVES), q(b.u1, -roofD, Y_EAVES), q(c, -roofD, yr));
    }
    { const bEnd = bays[0]; acc('slate').quad(F.at(bEnd.u0, -0.2, Y_EAVES), F.at(bEnd.u0, -roofD, Y_EAVES), F.at(bEnd.u1, -roofD, Y_EAVES), F.at(bEnd.u1, -0.2, Y_EAVES)); }
    for (const b of bays) if (b.k === 'r1' || b.k === 'r2') acc('lead').quad(F.at(b.u0, -0.2, Y_EAVES - 0.02), F.at(b.u0, -roofD, Y_EAVES - 0.02), F.at(b.u1, -roofD, Y_EAVES - 0.02), F.at(b.u1, -0.2, Y_EAVES - 0.02));

    // ===== chimneys: tall clustered brick stacks with corbelled tops and pots =====
    const stack = (u, d, hgt, groups = 2) => {
      const base = Y_EAVES - 0.3;
      F.slab('brick', u - 1.05, u + 1.05, d - 0.6, d + 0.6, base, base + hgt);
      for (let k = 0; k < groups; k++) {
        const uu = u + (groups === 1 ? 0 : (k - (groups - 1) / 2) * 1.2), top = base + hgt;
        F.slab('stone', uu - 0.5, uu + 0.5, d - 0.5, d + 0.5, top - 0.05, top + 0.14);
        F.slab('brick', uu - 0.56, uu + 0.56, d - 0.56, d + 0.56, top - 0.75, top - 0.05);
        F.slab('brick', uu - 0.5, uu + 0.5, d - 0.5, d + 0.5, top - 1.4, top - 0.75);
        F.slab('pot', uu - 0.2, uu + 0.2, d - 0.2, d + 0.2, top + 0.14, top + 0.8);
        F.slab('stone', uu - 0.26, uu + 0.26, d - 0.26, d + 0.26, top + 0.8, top + 0.9);
      }
    };
    stack(2.2, -4.5, 5.6, 2); stack(11.2, -5.5, 6.2, 2); stack(21.2, -4.0, 6.4, 2); stack(17.0, -12.0, 5.4, 2);

    // ===== the other walls of the hotel block and the east/north wings: plain brick with sash windows =====
    const outward = (poly) => (a, c) => { const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, ux = c[0] - a[0], uz = c[1] - a[1], L = Math.hypot(ux, uz) || 1; const nx = uz / L, nz = -ux / L; return inRing2(poly, mx + nx * 0.3, mz + nz * 0.3) ? [-nx, -nz] : [nx, nz]; };
    const inRing2 = (poly, x, z) => inRing(x, z, poly);
    const wallRun = (a, c, hint, yTop, spacing = 2.6, style = 'sash') => {
      const pl = makePlane(K, Geo, acc, a, c, hint); if (pl.L < 0.3) return;
      pl.brick(0, pl.L, 3.0, yTop, 0.02);
      if (pl.L > 2.4) {
        pl.slab('stone', 0, pl.L, 0, 0.1, 4.2 - 0.1, 4.2 + 0.1); pl.slab('stone', 0, pl.L, 0, 0.1, 7.4 - 0.1, 7.4 + 0.1);
        const n = Math.max(1, Math.floor((pl.L - 0.8) / spacing));
        for (let i = 0; i < n; i++) {
          const u = 0.4 + (pl.L - 0.8) * (i + 0.5) / n;
          if (style === 'sash') for (let f = 0; f < 3 && FL[f].y1 + 0.8 < yTop + 0.5; f++) sash(pl, u, FL[f].y0, FL[f].y1, 1.1, { cols: 2, rows: f === 2 ? 2 : 3, stone: false });
          else for (let f = 0; f < 3 && 3.2 + f * 2.9 + 1.6 < yTop; f++) sash(pl, u, 3.2 + f * 2.9, 3.2 + f * 2.9 + 1.5, 1.4, { cols: 3, rows: 1, stone: false });
        }
      }
      pl.slab('stone', 0, pl.L, 0, 0.16, yTop - 0.2, yTop + 0.02);
      return pl;
    };
    const ringM = M;
    const hM = outward(ringM);
    wallRun(A, T_, hM(A, T_), Y_EAVES);                       // the NW canted end wall
    wallRun(T_, MN, hM(T_, MN), Y_EAVES);                     // north wall of the hotel block
    wallRun(Hs, H_, hM(Hs, H_), Y_EAVES);                     // east return of the bar side (rarely seen)
    wallRun(H_, I_, hM(H_, I_), Y_EAVES); wallRun(I_, MN, hM(I_, MN), Y_EAVES);
    wallRun(Bp, Hs, hM(Bp, Hs), Y_EAVES);                     // the south wall of the hotel block, above the bar roof
    // east / north wings
    const ringW = [I_, ...NE.slice(1), MN]; const hW = outward(ringW);
    for (let i = 0; i < ringW.length; i++) { const a = ringW[i], c = ringW[(i + 1) % ringW.length]; if (a === MN && c === I_) continue; if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1.0) continue; wallRun(a, c, hW(a, c), Y_WING, 3.0, 'band'); }
    // wing roofs and the hotel flat deck
    const flatRoof = (poly, y, k) => { const tr = triangulate(poly); const G = acc(k); for (const t of tr.tris) { const a = tr.verts[t[0]], b = tr.verts[t[1]], c = tr.verts[t[2]]; G.tri([a[0], g0 + y, a[1]], [b[0], g0 + y, b[1]], [c[0], g0 + y, c[1]]); } };
    flatRoof(ringM, Y_EAVES - 0.05, 'lead'); flatRoof(ringW, Y_WING + 0.02, 'lead');

    // ===== the Elephant & Barrel bar wing: white plinth and fascia, leaded windows, navy banners =====
    const barWalls = [[Bp, B]];
    for (let i = 0; i + 1 < BAR.length; i++) barWalls.push([BAR[i], BAR[i + 1]]);
    const barHint = (a, c) => hintOut(a, c);
    for (const [a, c] of barWalls) {
      const pl = makePlane(K, Geo, acc, a, c, barHint(a, c));
      if (pl.L < 0.5) continue;
      pl.slab('white', 0, pl.L, 0, 0.12, -0.25, 0.65);                              // white plinth
      pl.slab('white', 0, pl.L, 0, 0.45, Y_BAR - 0.1, Y_BAR + 0.55);                 // white flat-roof fascia
    }
    // windows and banners on the long south wall (BAR[3] -> BAR[4])
    { const [a, c] = [BAR[3], BAR[4]], pl = makePlane(K, Geo, acc, a, c, barHint(a, c)), L = pl.L;
      // wide leaded windows in white frames with a dark grille: 4 panes, a doorway, 2 more
      const bays2 = [[2.0, 4.6], [5.0, 8.6], [9.4, 14.0], [14.6, 19.2], [20.2, 24.6], [26.2, 30.4]].filter((w) => w[1] < L - 0.5);
      for (const [u0, u1] of bays2) {
        const w = u1 - u0, uc = (u0 + u1) / 2;
        pl.quad('glass', u0, u1, 0.85, 2.7, 0.03);
        for (let x = u0; x <= u1 + 0.01; x += w / Math.max(1, Math.round(w / 1.3))) pl.slab('white', x - 0.03, x + 0.03, 0.03, 0.1, 0.85, 2.7);
        pl.slab('white', u0, u1, 0.03, 0.1, 0.8, 0.9); pl.slab('white', u0, u1, 0.03, 0.1, 2.65, 2.75); pl.slab('white', u0, u1, 0.03, 0.1, 1.8, 1.84);
        void uc;
      }
      // banners above the windows: tan "Dine & Drink Traditionally", navy "Elephant and Barrel"
      const by0 = 2.85, by1 = 3.4;
      pl.slab('tan', 5.0, 14.4, 0.02, 0.16, by0, by1); pl.slab('navy', 14.6, 24.4, 0.02, 0.16, by0, by1); pl.slab('tan', 24.6, Math.min(L - 0.3, 31.5), 0.02, 0.16, by0, by1);
      label(lk(pl, K), 'DINE & DRINK TRADITIONALLY', 5.4, 14.0, 0.18, by0 + 0.06, by1 - 0.06, { fg: '#f4ead0' });
      label(lk(pl, K), 'ELEPHANT AND BARREL', 15.0, 24.0, 0.18, by0 + 0.06, by1 - 0.06, { fg: '#f4f0e6' });
    }
    // the curved west end of the bar: door (white, leaded glass) and a leaded window, as in the photos
    { const [a, c] = [BAR[0], BAR[1]], pl = makePlane(K, Geo, acc, a, c, barHint(a, c));
      pl.slab('door', 0.7, 1.7, 0.02, 0.1, 0.1, 2.3);
      const [a2, c2] = [BAR[1], BAR[2]], p2 = makePlane(K, Geo, acc, a2, c2, barHint(a2, c2));
      sash(p2, p2.L / 2, 0.9, 2.5, 1.2, { cols: 2, rows: 4, stone: false });
    }
    // bar roof: flat, light grey with white edge
    { const roofPoly = [Bp, BAR[0], BAR[1], BAR[2], BAR[3], BAR[4], [228.3, -830.3], H_, Hs]; flatRoof(roofPoly, Y_BAR + 0.12, 'white'); }


    // ===== the long red-brick boundary wall beside the road, south of the drive, with the postbox, bus shelter and hotel sign =====
    { const road = [[166.9, -800.3], [158.3, -747.3]], dx = road[1][0] - road[0][0], dz = road[1][1] - road[0][1], rl = Math.hypot(dx, dz), rx = dx / rl, rz = dz / rl;
      const on = (z) => (z - road[0][1]) / dz;                  // parameter along the road for a given z
      const pt = (z, off) => { const t = on(z); return [road[0][0] + dx * t + rz * off, road[0][1] + dz * t - rx * off]; }; // off to the east (rz>0 -> +x)
      const off = 7.2, zA = -808.0, zB = -774.0, a = pt(zA, off), c = pt(zB, off);
      const W = makePlane(K, Geo, acc, a, c, [-1, 0]), wl = W.L, WT = 2.25;
      W.brick(0, wl, 0, WT, 0.0); W.brick(0, wl, 0, WT, -0.34);
      W.slab('stone', 0, wl, -0.38, 0.04, WT, WT + 0.12);
      W.slab('brick', wl - 0.3, wl, -0.38, 0.04, 0, WT);
      for (let u = 3.0; u < wl; u += 4.5) { W.slab('brick', u - 0.25, u + 0.25, -0.05, 0.12, 0, WT + 0.05); W.slab('stone', u - 0.3, u + 0.3, -0.08, 0.15, WT + 0.05, WT + 0.12); } // buttress piers
      // postbox (Victorian pillar-style wall box in red) set in the wall
      const pb = 10.5; W.slab('red', pb - 0.26, pb + 0.26, 0.0, 0.14, 1.0, 1.65); W.slab('black', pb - 0.2, pb + 0.2, 0.14, 0.17, 1.35, 1.42);
      // bus shelter in front of the wall: blue steel frame, glazed back, solid roof
      const bs = 20.0, bw = 3.0;
      for (const e of [0, 1]) for (const f of [0, 1]) W.slab('blue', bs + e * bw - 0.04, bs + e * bw + 0.04, 0.55 + f * 1.1 - 0.04, 0.55 + f * 1.1 + 0.04, 0, 2.3);
      W.slab('blue', bs - 0.1, bs + bw + 0.1, 0.45, 1.75, 2.3, 2.42); W.quad('glassLt', bs, bs + bw, 0.3, 2.2, 0.6);
      W.slab('blue', bs, bs + bw, 0.58, 0.62, 0.2, 0.3); W.slab('blue', bs, bs + bw, 0.58, 0.62, 1.1, 1.14);
      // the hotel's roadside sign: charcoal board on two black posts at the drive mouth, facing the road
      const sa = [175.9, -805.8], sc = [175.9, -808.8], S = makePlane(K, Geo, acc, sa, sc, [-1, 0]);
      for (const u of [0.25, S.L - 0.25]) S.slab('black', u - 0.04, u + 0.04, 0, 0.1, 0, 2.3);
      S.slab('sign', 0, S.L, 0.0, 0.12, 1.2, 2.3);
      label(lk(S, K), 'The Orwell Hotel', 0.1, S.L - 0.1, 0.14, 1.55, 2.2, { fg: '#f2f0ea' });
    }

    // ===== flush meshes =====
    for (const [k, G] of Object.entries(accs)) {
      const m = G.mesh(material(k)); if (m) { m.name = 'a09:' + k; K.extra.push(m); }
    }
  },
};
