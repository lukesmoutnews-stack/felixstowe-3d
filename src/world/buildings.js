// Building geometry from real OSM footprints.
// Footprint position/shape: source data. Height, roof shape and facade material: OSM tags
// where present, otherwise documented estimates (see feature.heightSource etc.).

import * as THREE from 'three';
import { ensureCCW, ensureCW, orientedBox, insetRing, hash01, area, pointInRing } from '../geo/polygon.js';
import { triangulate } from './accum.js';
import { BAY_W, STOREY_H, SHOP_H } from './textures.js';
import { FASCIA_COUNT } from './materials.js';
import { DOOR_COUNT } from './textures.js';

const RENDER_TINTS = [[1, 1, 1], [1, 0.97, 0.9], [0.99, 0.94, 0.8], [0.88, 0.93, 0.98], [0.99, 0.9, 0.88], [0.9, 0.9, 0.9], [0.86, 0.92, 0.86], [1, 0.98, 0.95]];
const ROOF_MAT = { slate: 'slate', roof_tiles: 'clay', tile: 'clay', tiles: 'clay', clay: 'clay', metal: 'metal', tin: 'metal', concrete: 'concrete_tile', glass: 'flat', asphalt: 'flat', tar_paper: 'flat', eternit: 'concrete_tile', stone: 'slate', grass: 'flat', gravel: 'flat' };

function parseColour(c) {
  if (!c) return null;
  try { const col = new THREE.Color(c.replace(/^#?([0-9a-f]{6})$/i, '#$1')); return [col.r, col.g, col.b]; } catch { return null; }
}

/** Decide appearance. Returns provenance so docs/UI can tell estimated from sourced. */
export function styleFor(b, override = null) {
  const h = hash01(b.id * 7 + 3), h2 = hash01(b.id * 13 + 5), h3 = hash01(b.id * 31 + 11);
  let facade = b.material === 'brick' ? null : b.material; // brick colour decided below
  const small = ['garage', 'garages', 'shed', 'carport', 'hut', 'kiosk'].includes(b.kind) || b.area < 22;
  if (b.material === 'brick') facade = h < 0.6 ? 'brick_red' : h < 0.75 ? 'brick_dark' : 'brick_yellow';
  if (!facade) {
    if (b.industrial) facade = h < 0.7 ? 'metal' : 'concrete';
    else if (['church', 'chapel', 'cathedral'].includes(b.kind)) facade = h < 0.6 ? 'flint' : 'stone';
    else if (['commercial', 'retail', 'office', 'hotel', 'apartments', 'school', 'college', 'hospital', 'public', 'civic'].includes(b.kind) || b.shop) {
      facade = b.area > 1500 && h < 0.5 ? 'concrete' : h < 0.42 ? 'render' : h < 0.72 ? 'brick_red' : h < 0.88 ? 'brick_yellow' : 'brick_dark';
    } else facade = h < 0.37 ? 'brick_red' : h < 0.47 ? 'brick_dark' : h < 0.64 ? 'brick_yellow' : 'render';
  }
  let tint = facade === 'render' ? RENDER_TINTS[Math.floor(h2 * RENDER_TINTS.length)] : [0.9 + h2 * 0.1, 0.9 + h2 * 0.1, 0.9 + h2 * 0.1];
  const osmColour = parseColour(b.colour);
  if (osmColour) tint = osmColour.map((v) => 0.35 + v * 0.75);
  let roof = ROOF_MAT[(b.roofMaterial || '').toLowerCase()] || null;
  const roofFromOsm = !!roof;
  const flat = b.roofShape === 'flat';
  if (!roof) roof = flat ? 'flat' : b.roofShape === 'gabled-low' || b.industrial ? 'metal' : h3 < 0.36 ? 'slate' : h3 < 0.6 ? 'clay' : h3 < 0.82 ? 'concrete_tile' : 'pantile';
  let roofTint = [0.9 + h3 * 0.1, 0.9 + h3 * 0.1, 0.9 + h3 * 0.1];
  const rc = parseColour(b.roofColour); if (rc) roofTint = rc.map((v) => 0.3 + v * 0.8);
  // Beach huts: Felixstowe's seafront huts are brightly painted timber.
  if (b.kind === 'beach_hut' || (b.kind === 'hut' && b.nearBeach)) {
    const HUT = [[0.95, 0.55, 0.6], [0.45, 0.7, 0.95], [0.98, 0.86, 0.4], [0.55, 0.85, 0.7], [0.98, 0.98, 0.96], [0.8, 0.6, 0.95], [0.95, 0.4, 0.35]];
    facade = 'timber'; tint = HUT[Math.floor(h * HUT.length)]; if (!roofFromOsm) roof = 'metal'; roofTint = [0.55, 0.55, 0.58];
  }
  const winStyle = facade === 'render' ? (h3 < 0.5 ? 0 : 2) : (b.levels >= 4 || b.area > 400 ? 1 : h3 < 0.58 ? 0 : 1);
  const s = {
    facade, windows: !small && !['metal'].includes(facade) && b.kind !== 'roof' && b.kind !== 'beach_hut', tint, roof, roofTint, fascia: Math.floor(h2 * FASCIA_COUNT),
    winStyle, door: Math.floor(hash01(b.id * 41 + 7) * DOOR_COUNT),
    facadeSource: b.material ? 'osm' : 'estimated', roofMaterialSource: roofFromOsm ? 'osm' : 'estimated',
  };
  return override ? { ...s, ...override } : s;
}

// ---- roof plane model: roof(p) = top + min_i (A_i x + B_i z + C_i) ----
function planesFor(shape, obb, roofH) {
  const { cx, cz, ux, uz, length: L, width: W } = obb;
  const dvp = { A: uz, B: -ux, C: W / 2 - cx * uz + cz * ux };
  const dvm = { A: -uz, B: ux, C: W / 2 + cx * uz - cz * ux };
  const dup = { A: -ux, B: -uz, C: L / 2 + cx * ux + cz * uz };
  const dum = { A: ux, B: uz, C: L / 2 - cx * ux - cz * uz };
  const scale = (p, k) => ({ A: p.A * k, B: p.B * k, C: p.C * k, k });
  const kW = roofH / (W / 2);
  switch (shape) {
    case 'gabled': case 'gabled-low': case 'round': case 'saltbox': case 'gambrel': case 'mansard':
      return [scale(dvp, kW), scale(dvm, kW)];
    case 'hipped': case 'half-hipped': case 'side_hipped':
      return [scale(dvp, kW), scale(dvm, kW), scale(dup, kW), scale(dum, kW)];
    case 'pyramidal': case 'dome': case 'onion': case 'cone':
      return [scale(dvp, kW), scale(dvm, kW), scale(dup, roofH / (L / 2)), scale(dum, roofH / (L / 2))];
    case 'skillion':
      return [scale(dvm, roofH / W)];
    default: return [];
  }
}
const evalP = (p, x, z) => p.A * x + p.B * z + p.C;
function roofAt(planes, x, z) { let m = Infinity; for (const p of planes) m = Math.min(m, evalP(p, x, z)); return planes.length ? Math.max(0, m) : 0; }

function clipHalf(poly, g) { // keep g(x,z) <= 0
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ga = g(a[0], a[1]), gb = g(b[0], b[1]);
    if (ga <= 0) out.push(a);
    if ((ga <= 0) !== (gb <= 0)) { const t = ga / (ga - gb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

/** Insert vertices where the active roof plane changes along each footprint edge. */
function refineRing(ring, planes) {
  if (planes.length < 2) return ring;
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    out.push(a);
    const ts = [];
    for (let p = 0; p < planes.length; p++) for (let q = p + 1; q < planes.length; q++) {
      const P = planes[p], Q = planes[q];
      const ga = evalP(P, a[0], a[1]) - evalP(Q, a[0], a[1]), gb = evalP(P, b[0], b[1]) - evalP(Q, b[0], b[1]);
      if ((ga < 0) === (gb < 0) || ga === gb) continue;
      const t = ga / (ga - gb); if (t <= 1e-3 || t >= 1 - 1e-3) continue;
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const hv = evalP(P, x, z); if (hv <= roofAt(planes, x, z) + 1e-3) ts.push(t);
    }
    ts.sort((x, y) => x - y).forEach((t) => out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
  }
  return out;
}

/**
 * Add one building to the chunked accumulators.
 * @param ctx { acc: ChunkedAccum, ground(x,z)->y, matKeys, landmarkStyle(b) }
 * @returns collider {outer, holes, base, top}
 */
export function addBuilding(b, ctx) {
  const outer = ensureCCW(b.outer);
  if (outer.length < 3 || area(outer) < 2) return null;
  const holes = (b.holes || []).map(ensureCW);
  let gMin = Infinity, gSum = 0;
  for (const [x, z] of outer) { const g = ctx.ground(x, z); gMin = Math.min(gMin, g); gSum += g; }
  const gAvg = gSum / outer.length;
  const style = styleFor(b, ctx.landmarkStyle ? ctx.landmarkStyle(b) : null);
  const obb = orientedBox(outer);
  const rectness = obb ? area(outer) / obb.area : 0;

  // Roof shape & height
  let shape = b.roofShape;
  if (holes.length && shape !== 'flat') shape = 'flat';
  const pitchedRect = ['gabled', 'gabled-low', 'hipped', 'half-hipped', 'pyramidal', 'skillion', 'round', 'dome', 'onion', 'cone', 'gambrel', 'mansard', 'saltbox', 'side_hipped'];
  if (pitchedRect.includes(shape) && rectness < 0.82) shape = shape === 'skillion' ? 'flat' : 'hipped-inset';
  let roofH = b.roofHeight;
  if (roofH == null && obb) {
    if (shape === 'gabled-low') roofH = Math.min(3.5, obb.width * 0.08);
    else if (shape === 'skillion') roofH = Math.min(2.5, obb.width * 0.25);
    else if (shape !== 'flat' && shape !== 'hipped-inset') {
      const pitch = (style.roof === 'slate' ? 33 : 38) * Math.PI / 180;
      roofH = Math.min(6, (Math.min(obb.width, 14) / 2) * Math.tan(pitch));
    } else roofH = 0;
  }
  roofH = roofH || 0;
  let wallTop = b.height;
  if (b.heightSource === 'osm:height' || b.heightSource === 'lidar') wallTop = Math.max(b.minHeight + 2, b.height - roofH);
  const base = gAvg + (b.minHeight || 0);
  const baseBottom = b.minHeight > 0 ? base : gMin - 0.4;
  const top = gAvg + wallTop;
  const cx = b.cx, cz = b.cz;

  const facadeKey = `facade:${style.facade}:${style.windows}:${style.windows ? style.winStyle : 0}`;
  const plainKey = `facade:${style.facade}:false:0`;
  const shopKey = `shop:${style.fascia}`;
  const roofKey = `roof:${style.roof}`;
  const wallAcc = ctx.acc.get(cx, cz, facadeKey, true);
  const plainAcc = ctx.acc.get(cx, cz, plainKey, true);
  const shopAcc = style.windows && b.shop && !b.minHeight && wallTop > (b.shopSource === 'osm:business-point' ? 3.0 : SHOP_H + 1.5) ? ctx.acc.get(cx, cz, shopKey) : null;
  const roofAcc = ctx.acc.get(cx, cz, roofKey, true);
  const shopH = Math.min(SHOP_H, wallTop - 0.3);
  const tint = style.tint;

  let planes = [];
  if (obb && roofH > 0.2 && shape !== 'hipped-inset' && shape !== 'flat') planes = planesFor(shape, obb, roofH);

  // ---- walls ----
  const wallRing = (ring) => {
    const rr = refineRing(ring, planes);
    for (let i = 0; i < rr.length; i++) {
      const a = rr[i], c = rr[(i + 1) % rr.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 0.05) continue;
      let u0, u1;
      if (len < 1.6) { u0 = -len / 2 / BAY_W; u1 = len / 2 / BAY_W; }
      else { const nb = Math.max(1, Math.round(len / BAY_W)); u0 = 0; u1 = nb; }
      const ra = top + roofAt(planes, a[0], a[1]), rc = top + roofAt(planes, c[0], c[1]);
      let y0 = baseBottom;
      const vOf = (y, ref, h) => (y - ref) / h;
      if (shopAcc && ring === outer) {
        const ys = base + shopH;
        shopAcc.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], ys, c[1]], [a[0], ys, a[1]],
          [u0, vOf(y0, base, SHOP_H)], [u1, vOf(y0, base, SHOP_H)], [u1, shopH / SHOP_H], [u0, shopH / SHOP_H]);
        y0 = ys;
        const v0 = 0.0;
        wallAcc.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], top, c[1]], [a[0], top, a[1]],
          [u0, v0], [u1, v0], [u1, (top - y0) / STOREY_H], [u0, (top - y0) / STOREY_H], tint);
      } else {
        wallAcc.quad([a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], top, c[1]], [a[0], top, a[1]],
          [u0, vOf(y0, base, STOREY_H)], [u1, vOf(y0, base, STOREY_H)], [u1, vOf(top, base, STOREY_H)], [u0, vOf(top, base, STOREY_H)], tint);
      }
      // gable infill above the eaves
      if (ra > top + 0.02 || rc > top + 0.02) {
        const vt = vOf(top, base, STOREY_H);
        if (ra > top + 0.02 && rc > top + 0.02)
          plainAcc.quad([a[0], top, a[1]], [c[0], top, c[1]], [c[0], rc, c[1]], [a[0], ra, a[1]], [u0, vt], [u1, vt], [u1, vOf(rc, base, STOREY_H)], [u0, vOf(ra, base, STOREY_H)], tint);
        else if (ra > top + 0.02) plainAcc.triFlat([a[0], top, a[1]], [c[0], top, c[1]], [a[0], ra, a[1]], [u0, vt], [u1, vt], [u0, vOf(ra, base, STOREY_H)], tint);
        else plainAcc.triFlat([a[0], top, a[1]], [c[0], top, c[1]], [c[0], rc, c[1]], [u0, vt], [u1, vt], [u1, vOf(rc, base, STOREY_H)], tint);
      }
    }
  };
  wallRing(outer);
  for (const h of holes) wallRing(h);
  const extraRings = frontDetails(b, ctx, outer, style, { base, top, wallTop, shop: !!shopAcc, cx, cz });

  // ---- roof ----
  const rt = style.roofTint;
  const pushTris = (verts, tris, yOf, uvOf, acc) => {
    for (const [i, j, k] of tris) {
      const P = [verts[i], verts[j], verts[k]].map(([x, z]) => [x, yOf(x, z), z]);
      // ensure upward facing
      const ux = P[1][0] - P[0][0], uz = P[1][2] - P[0][2], vx = P[2][0] - P[0][0], vz = P[2][2] - P[0][2];
      const ny = uz * vx - ux * vz;
      const order = ny >= 0 ? [0, 1, 2] : [0, 2, 1];
      acc.triFlat(P[order[0]], P[order[1]], P[order[2]], uvOf(...verts[[i, j, k][order[0]]]), uvOf(...verts[[i, j, k][order[1]]]), uvOf(...verts[[i, j, k][order[2]]]), rt);
    }
  };
  if (planes.length) {
    // eaves: the roof planes continue 0.3 m past the walls (outset footprint), dipping slightly
    const eaves = b.kind === 'beach_hut' ? outer : insetRing(outer, -0.3) || outer;
    for (let pi = 0; pi < planes.length; pi++) {
      let region = eaves;
      for (let pj = 0; pj < planes.length; pj++) {
        if (pj === pi) continue;
        const P = planes[pi], Q = planes[pj];
        region = clipHalf(region, (x, z) => evalP(P, x, z) - evalP(Q, x, z) - 1e-6);
        if (region.length < 3) break;
      }
      if (region.length < 3) continue;
      const P = planes[pi]; const gl = Math.hypot(P.A, P.B) || 1; const ax = -P.B / gl, az = P.A / gl;
      const slopeLen = Math.sqrt(1 + (P.k || 0) ** 2) / (P.k || 1);
      const { verts, tris } = triangulate(region);
      pushTris(verts, tris, (x, z) => top + evalP(P, x, z),
        (x, z) => [(x * ax + z * az) / 2, (evalP(P, x, z) * slopeLen) / 2], roofAcc);
    }
    // chimney on ridge for houses
    if (!b.industrial && obb && b.area < 220 && hash01(b.id + 99) < 0.7 && ['gabled', 'hipped'].includes(shape)) {
      const along = shape === 'gabled' ? obb.length / 2 - 0.7 : Math.max(0, obb.length / 2 - obb.width / 2 - 0.3);
      const sgn = hash01(b.id + 7) < 0.5 ? 1 : -1;
      const px = obb.cx + obb.ux * along * sgn, pz = obb.cz + obb.uz * along * sgn;
      if (pointInRing(px, pz, outer)) addBox(ctx.acc.get(cx, cz, 'facade:brick_red:false', true), px, pz, obb.ux, obb.uz, 0.5, 0.35, top + roofAt(planes, px, pz) - 0.6, top + roofH + 0.9, [0.85, 0.85, 0.85]);
    }
  } else if (shape === 'hipped-inset' && !holes.length) {
    let inner = null, d = 0;
    const maxD = obb ? Math.min(6, obb.width * 0.48) : 3;
    for (const t of [6, 4.5, 3.5, 2.6, 1.9, 1.3, 0.9]) { if (t > maxD) continue; inner = insetRing(outer, t); if (inner) { d = t; break; } }
    if (inner) {
      const rh = (b.roofHeight ?? d * Math.tan(35 * Math.PI / 180));
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i], c = outer[(i + 1) % outer.length], ia = inner[i], ic = inner[(i + 1) % outer.length];
        const ex = c[0] - a[0], ez = c[1] - a[1], el = Math.hypot(ex, ez) || 1;
        const uv = (p) => [((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / el / 2, Math.abs((p[0] - a[0]) * -ez + (p[1] - a[1]) * ex) / el * 1.22 / 2];
        roofAcc.quad([a[0], top, a[1]], [c[0], top, c[1]], [ic[0], top + rh, ic[1]], [ia[0], top + rh, ia[1]], uv(a), uv(c), uv(ic), uv(ia), rt);
      }
      const { verts, tris } = triangulate(inner);
      pushTris(verts, tris, () => top + rh, (x, z) => [x / 2, z / 2], roofAcc);
    } else flatRoof();
  } else flatRoof();

  function flatRoof() {
    const flatAcc = ctx.acc.get(cx, cz, 'roof:flat', true);
    const { verts, tris } = triangulate(outer, holes);
    pushTris(verts, tris, () => top, (x, z) => [x / 2, z / 2], style.roof === 'flat' ? flatAcc : roofAcc);
    // low parapet/coping on larger flat-roofed buildings
    if (!b.industrial && b.area > 60 && wallTop > 4) {
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i], c = outer[(i + 1) % outer.length];
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        wallAcc.quad([a[0], top, a[1]], [c[0], top, c[1]], [c[0], top + 0.45, c[1]], [a[0], top + 0.45, a[1]], [0, 0.0], [len / BAY_W, 0], [len / BAY_W, 0.15], [0, 0.15], tint);
      }
    }
  }
  b.geom = { base, wallTop: top, shopTop: shopAcc ? base + shopH : null }; // used by shop signs
  return { id: b.id, outer, holes, base: baseBottom, top: top + roofH, name: b.name, extraRings };
}

/**
 * Street-facing details (estimated, not from data): a front door, a bay window on houses and
 * a roller door on industrial buildings, placed on the wall that faces the nearest road.
 */
const HOUSE_KINDS = new Set(['house', 'terrace', 'semidetached_house', 'detached', 'residential', 'yes']);
function frontDetails(b, ctx, outer, style, g) {
  if (!ctx.nearestRoad || b.isPart || b.minHeight > 0 || b.area < 25 || b.kind === 'beach_hut') return [];
  let best = null;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], c = outer[(i + 1) % outer.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 2.6) continue;
    const ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, nx = -uz, nz = ux; // outward (right of CCW edge in x/z)
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const r = ctx.nearestRoad(mx + nx * 2, mz + nz * 2, 25, (rd) => !rd.footOnly || rd.kind === 'pedestrian');
    if (!r) continue;
    const facing = ((r.cx - mx) * nx + (r.cz - mz) * nz) / (Math.hypot(r.cx - mx, r.cz - mz) || 1);
    if (facing < 0.5) continue;
    const score = r.d - len * 0.15;
    if (!best || score < best.score) best = { score, a, c, len, ux, uz, nx, nz };
  }
  if (!best) return [];
  const { a, len, ux, uz, nx, nz } = best, extra = [];
  const at = (s, out = 0.03) => [a[0] + ux * s + nx * out, a[1] + uz * s + nz * out];
  const quad = (acc, s0, s1, y0, y1, uv, out = 0.03, col) => { const p = at(s0, out), q = at(s1, out); acc.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], uv[0], uv[1], uv[2], uv[3], col); };
  const nb = Math.max(1, Math.round(len / BAY_W)), bw = len / nb;
  if (b.industrial) {
    if (len >= 7 && g.wallTop > 5) { const w = Math.min(5, len * 0.4), s0 = len / 2 - w / 2; quad(ctx.acc.get(g.cx, g.cz, 'roller'), s0, s0 + w, g.base - 0.05, g.base + Math.min(4.6, g.wallTop - 1), [[0, 0], [w / 3, 0], [w / 3, 1.5], [0, 1.5]]); }
    return extra;
  }
  if (g.shop) return extra; // shopfronts already form the ground floor
  // front door at a pier between windows (or near one end on narrow fronts)
  const ds = nb >= 2 ? Math.round(nb / 2) * bw : Math.min(0.65, len * 0.2) + 0.55;
  quad(ctx.acc.get(g.cx, g.cz, `door:${style.door}`), ds - 0.55, ds + 0.55, g.base - 0.02, g.base + 2.4, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // bay window on houses with at least two window bays
  if (HOUSE_KINDS.has(b.kind) && nb >= 2 && b.area < 220 && hash01(b.id * 3 + 1) < 0.55 && style.windows) {
    const c0 = bw * 0.5 - 1.0, c1 = c0 + 2.0, d = 0.65, storeys = b.levels >= 2 && hash01(b.id + 5) < 0.5 ? 2 : 1;
    const y0 = g.base - 0.3, y1 = Math.min(g.top, g.base + storeys * STOREY_H);
    const acc = ctx.acc.get(g.cx, g.cz, `facade:${style.facade}:true:${style.winStyle === 1 ? 0 : style.winStyle}`, true);
    // canted bay: two angled sides and a front, glazed on all three faces, with a small hipped roof
    const p0 = at(c0, 0), p1 = at(c1, 0), f0 = at(c0 + 0.45, d), f1 = at(c1 - 0.45, d), t = style.tint.map((v) => Math.min(1, v * 1.04));
    const vv = (y) => (y - g.base) / STOREY_H;
    const face = (e0, e1) => {
      const w = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]), uw = w / BAY_W / 2;
      acc.quad([e0[0], y0, e0[1]], [e1[0], y0, e1[1]], [e1[0], y1, e1[1]], [e0[0], y1, e0[1]], [0.5 - uw, vv(y0)], [0.5 + uw, vv(y0)], [0.5 + uw, vv(y1)], [0.5 - uw, vv(y1)], t);
    };
    face(p0, f0); face(f0, f1); face(f1, p1);
    const roofAcc = ctx.acc.get(g.cx, g.cz, `roof:${style.roof === 'flat' || style.roof === 'metal' ? 'slate' : style.roof}`, true);
    const lift = (pt, o) => [pt[0] + nx * o, pt[1] + nz * o];
    const E = [lift(p0, 0.0), lift(f0, 0.1), lift(f1, 0.1), lift(p1, 0.0)], W0 = at(c0 + 0.45, 0), W1 = at(c1 - 0.45, 0);
    const ridge = y1 + 0.55;
    roofAcc.triFlat([E[0][0], y1, E[0][1]], [E[1][0], y1, E[1][1]], [W0[0], ridge, W0[1]], [0, 0], [0.4, 0], [0.4, 0.3], style.roofTint);
    roofAcc.quad([E[1][0], y1, E[1][1]], [E[2][0], y1, E[2][1]], [W1[0], ridge, W1[1]], [W0[0], ridge, W0[1]], [0, 0], [0.6, 0], [0.6, 0.3], [0, 0.3], style.roofTint);
    roofAcc.triFlat([E[2][0], y1, E[2][1]], [E[3][0], y1, E[3][1]], [W1[0], ridge, W1[1]], [0, 0], [0.4, 0], [0.4, 0.3], style.roofTint);
    const q0 = f0, q1 = f1;
    extra.push([p0, q0, q1, p1]);
  }
  return extra;
}

/** Axis-aligned-in-local-frame box (for chimneys, piers, etc.). */
export function addBox(acc, cx, cz, ux, uz, hl, hw, y0, y1, col) {
  const vx = -uz, vz = ux;
  const c = (su, sv) => [cx + ux * hl * su + vx * hw * sv, cz + uz * hl * su + vz * hw * sv];
  const p = [c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)];
  const ring = ensureCCW(p);
  for (let i = 0; i < 4; i++) {
    const a = ring[i], b = ring[(i + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) / BAY_W;
    acc.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [0, y0 / STOREY_H], [len, y0 / STOREY_H], [len, y1 / STOREY_H], [0, y1 / STOREY_H], col);
  }
  acc.quad([ring[0][0], y1, ring[0][1]], [ring[1][0], y1, ring[1][1]], [ring[2][0], y1, ring[2][1]], [ring[3][0], y1, ring[3][1]], [0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], col);
}
