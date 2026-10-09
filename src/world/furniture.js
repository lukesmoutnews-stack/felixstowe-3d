// Street furniture, boundary walls/fences/hedges, groynes, the pier and port cranes.
// Positions come from OSM. The only invented positions are optional street lamps
// (flagged as procedural) for streets where OSM has no street_lamp nodes.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { orientedBox, pointInRing, distToSegment, hash01, clipRingToRect, ensureCCW } from '../geo/polygon.js';
import { BAY_W, STOREY_H } from './textures.js';
import { LAYER, GROUND_TEX_SIZE } from './materials.js';
import { ribbon } from './roads.js';
import { triangulate } from './accum.js';

// ---------- small prop geometries (built once) ----------
const geo = new Map();
function col(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
function merged(key, parts) { if (!geo.has(key)) { const g = mergeGeometries(parts); g.computeBoundingSphere(); geo.set(key, g); } return geo.get(key); }
const BLACK = [0.08, 0.08, 0.09], GREY = [0.45, 0.46, 0.47], RED = [0.72, 0.06, 0.05], WOOD = [0.45, 0.33, 0.22], GREEN = [0.13, 0.25, 0.17], WHITE = [0.92, 0.92, 0.9], ORANGE = [1.0, 0.55, 0.1];
export function propGeometry(kind) {
  switch (kind) {
    case 'lamp': return merged(kind, [
      col(new THREE.CylinderGeometry(0.07, 0.1, 6, 6).translate(0, 3, 0), GREY),
      col(new THREE.BoxGeometry(0.9, 0.08, 0.1).translate(0.4, 6, 0), GREY),
      col(new THREE.BoxGeometry(0.5, 0.12, 0.25).translate(0.8, 5.95, 0), [0.95, 0.92, 0.8])]);
    case 'bench': return merged(kind, [
      col(new THREE.BoxGeometry(1.8, 0.06, 0.45).translate(0, 0.45, 0), WOOD),
      col(new THREE.BoxGeometry(1.8, 0.4, 0.06).translate(0, 0.72, -0.2), WOOD),
      col(new THREE.BoxGeometry(0.06, 0.45, 0.45).translate(-0.8, 0.22, 0), BLACK),
      col(new THREE.BoxGeometry(0.06, 0.45, 0.45).translate(0.8, 0.22, 0), BLACK)]);
    case 'bus_stop': return merged(kind, [
      col(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6).translate(0, 1.4, 0), GREY),
      col(new THREE.BoxGeometry(0.5, 0.5, 0.04).translate(0, 2.6, 0), WHITE)]);
    case 'shelter': return merged(kind, [
      col(new THREE.BoxGeometry(3.2, 0.08, 1.5).translate(0, 2.4, 0), GREY),
      col(new THREE.BoxGeometry(3.2, 2.3, 0.04).translate(0, 1.2, -0.7), [0.6, 0.7, 0.75]),
      col(new THREE.BoxGeometry(0.04, 2.3, 1.4).translate(-1.58, 1.2, 0), [0.6, 0.7, 0.75]),
      col(new THREE.BoxGeometry(0.04, 2.3, 1.4).translate(1.58, 1.2, 0), [0.6, 0.7, 0.75])]);
    case 'post_box': return merged(kind, [col(new THREE.CylinderGeometry(0.27, 0.27, 1.3, 12).translate(0, 0.65, 0), RED), col(new THREE.CylinderGeometry(0.31, 0.29, 0.15, 12).translate(0, 1.35, 0), RED)]);
    case 'phone_box': return merged(kind, [col(new THREE.BoxGeometry(0.92, 2.5, 0.92).translate(0, 1.25, 0), RED), col(new THREE.BoxGeometry(1.0, 0.18, 1.0).translate(0, 2.55, 0), RED)]);
    case 'bollard': return merged(kind, [col(new THREE.CylinderGeometry(0.1, 0.11, 0.95, 8).translate(0, 0.47, 0), BLACK)]);
    case 'bin': return merged(kind, [col(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 10).translate(0, 0.45, 0), BLACK)]);
    case 'belisha': return merged(kind, [
      col(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).translate(0, 0.3, 0), BLACK), col(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).translate(0, 0.9, 0), WHITE),
      col(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).translate(0, 1.5, 0), BLACK), col(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).translate(0, 2.1, 0), WHITE),
      col(new THREE.SphereGeometry(0.2, 12, 8).translate(0, 2.6, 0), ORANGE)]);
    case 'signals': return merged(kind, [col(new THREE.CylinderGeometry(0.06, 0.06, 3, 6).translate(0, 1.5, 0), BLACK), col(new THREE.BoxGeometry(0.3, 0.9, 0.25).translate(0, 2.6, 0), BLACK)]);
    case 'mast': return merged(kind, [col(new THREE.CylinderGeometry(0.08, 0.15, 10, 6).translate(0, 5, 0), WHITE)]);
    case 'pile': return merged(kind, [col(new THREE.CylinderGeometry(0.22, 0.22, 1, 8).translate(0, -0.5, 0), [0.25, 0.22, 0.2])]);
    case 'post': return merged(kind, [col(new THREE.BoxGeometry(0.08, 1.1, 0.08).translate(0, 0.55, 0), WHITE)]);
    case 'crane': { // ship-to-shore container crane, schematic proportions (~50 m boom height)
      const C = [0.82, 0.3, 0.18], D = [0.25, 0.27, 0.3];
      const parts = [];
      for (const sx of [-14, 14]) for (const sz of [-9, 9]) parts.push(col(new THREE.BoxGeometry(1.4, 46, 1.4).translate(sx, 23, sz), C));
      for (const sz of [-9, 9]) parts.push(col(new THREE.BoxGeometry(30, 1.6, 1.6).translate(0, 30, sz), C), col(new THREE.BoxGeometry(30, 1.2, 1.2).translate(0, 12, sz), C));
      for (const sx of [-14, 14]) parts.push(col(new THREE.BoxGeometry(1.4, 1.4, 19).translate(sx, 46, 0), C));
      parts.push(col(new THREE.BoxGeometry(110, 2.4, 3).translate(25, 47, 0), C)); // boom over the water (+x) with back-reach
      parts.push(col(new THREE.BoxGeometry(8, 4, 6).translate(-8, 50, 0), D)); // machinery house
      parts.push(col(new THREE.BoxGeometry(1, 16, 1).translate(-14, 56, 0), C), col(new THREE.BoxGeometry(1, 16, 1).translate(14, 56, 0), C));
      parts.push(col(new THREE.BoxGeometry(4, 3, 4).translate(30, 43, 0), D)); // trolley/cab
      return merged(kind, parts);
    }
  }
  return null;
}
let propMat;
export function propMaterial() { if (!propMat) propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }); return propMat; }

export function instances(kind, list) {
  const g = propGeometry(kind); if (!g || !list.length) return null;
  const im = new THREE.InstancedMesh(g, propMaterial(), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((p, i) => { q.setFromAxisAngle(up, p.rot || 0); m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx || 1, p.sy || 1, p.sz || 1)); im.setMatrixAt(i, m); });
  im.castShadow = kind !== 'pile'; im.receiveShadow = true; im.computeBoundingSphere(); im.renderOrder = 10; im.name = 'props:' + kind;
  return im;
}

/** Heading (rotation about y) facing away from the nearest road, plus that road. */
function nearestRoad(x, z, roadGrid, maxD = 25) {
  let best = null;
  for (const s of roadGrid.query(x - maxD, z - maxD, x + maxD, z + maxD)) {
    const d = distToSegment(x, z, s.a[0], s.a[1], s.b[0], s.b[1]);
    if (d.d < maxD && (!best || d.d < best.d)) best = { ...d, s };
  }
  return best;
}
const faceRoad = (x, z, nr) => (nr ? Math.atan2(nr.cx - x, nr.cz - z) : 0);

/**
 * Build props for one tile. Returns {meshes, colliders: [{type:'circle'|'segment', ...}]}
 */
export function buildProps(features, tile, ctx) {
  const r = tile.rect, inRect = (x, z) => x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;
  const lists = {}; const add = (k, p) => (lists[k] ||= []).push(p);
  const colliders = [];
  const surf = ctx.surfaceAt;
  let mappedLamps = 0;
  for (const p of features.points) {
    if (!inRect(p.x, p.z)) continue;
    const y = surf(p.x, p.z);
    const nr = nearestRoad(p.x, p.z, ctx.roadGrid);
    const rot = faceRoad(p.x, p.z, nr);
    switch (p.kind) {
      case 'lamp': mappedLamps++; add('lamp', { x: p.x, y, z: p.z, rot: rot - Math.PI / 2 }); colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.15 }); break;
      case 'bench': add('bench', { x: p.x, y, z: p.z, rot: rot + Math.PI }); break;
      case 'bus_stop': add('bus_stop', { x: p.x, y, z: p.z, rot }); if (p.tags.shelter === 'yes') add('shelter', { x: p.x, y, z: p.z, rot: rot + Math.PI }); break;
      case 'post_box': add('post_box', { x: p.x, y, z: p.z }); colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.3 }); break;
      case 'phone_box': add('phone_box', { x: p.x, y, z: p.z, rot }); colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.6 }); break;
      case 'bollard': add('bollard', { x: p.x, y, z: p.z }); colliders.push({ type: 'circle', x: p.x, z: p.z, r: 0.12 }); break;
      case 'bin': add('bin', { x: p.x, y, z: p.z }); break;
      case 'signals': add('signals', { x: p.x, y, z: p.z, rot }); break;
      case 'mast': add('mast', { x: p.x, y, z: p.z, sy: Math.max(0.5, (parseFloat(p.tags.height) || 10) / 10) }); break;
      case 'crane': {
        // Orientation: boom perpendicular to the nearest coastline, pointing seaward (approximation).
        let rotC = hash01(p.id) * Math.PI * 2, oriented = false;
        let best = null;
        for (const cl of features.coastLines) for (let i = 1; i < cl.length; i++) {
          const d = distToSegment(p.x, p.z, cl[i - 1][0], cl[i - 1][1], cl[i][0], cl[i][1]);
          if (d.d < 250 && (!best || d.d < best.d)) best = { ...d, a: cl[i - 1], b: cl[i] };
        }
        if (best) { const dx = best.b[0] - best.a[0], dz = best.b[1] - best.a[1]; const sx = -dz, sz = dx; /* right of direction in EN = sea */ rotC = Math.atan2(-sz, sx); oriented = true; }
        add('crane', { x: p.x, y, z: p.z, rot: rotC });
        p.orientation = oriented ? 'coastline' : 'unknown';
        for (const sx of [-14, 14]) for (const sz of [-9, 9]) {
          const c = Math.cos(rotC), s = Math.sin(rotC);
          colliders.push({ type: 'circle', x: p.x + sx * c + sz * s, z: p.z - sx * s + sz * c, r: 1 });
        }
        break;
      }
    }
    if (p.zebra) for (const sgn of [-1, 1]) add('belisha', { x: p.x + p.zebra.uz * p.zebra.hw * sgn, y, z: p.z - p.zebra.ux * p.zebra.hw * sgn });
  }
  // Procedural lamps: only when the tile has no mapped lamps at all (flagged in data panel).
  let procLamps = 0;
  if (ctx.settings.proceduralLamps && mappedLamps === 0) {
    for (const rd of features.roads) {
      if (rd.footOnly || rd.sidewalk === 'no' || rd.tunnel) continue;
      let acc = hash01(rd.id) * 30;
      for (let i = 1; i < rd.pts.length; i++) {
        const [x0, z0] = rd.pts[i - 1], [x1, z1] = rd.pts[i]; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.1) continue;
        const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
        for (let s = 32 - (acc % 32); s < L; s += 32) {
          const side = (Math.floor((acc + s) / 32) % 2) ? 1 : -1;
          const off = rd.width / 2 + 0.5;
          const x = x0 + ux * s + uz * off * side, z = z0 + uz * s - ux * off * side;
          if (!inRect(x, z) || !ctx.isClear(x, z, 0.6, true)) continue;
          add('lamp', { x, y: surf(x, z), z, rot: Math.atan2(-side * ux, -side * uz) });
          colliders.push({ type: 'circle', x, z, r: 0.15 }); procLamps++;
        }
        acc += L;
      }
    }
  }
  const meshes = [];
  for (const [k, list] of Object.entries(lists)) { const m = instances(k, list); if (m) meshes.push(m); }
  return { meshes, colliders, stats: { mappedLamps, procLamps } };
}

/** Vertical strip (wall/fence/hedge/groyne) along a polyline. */
function strip(acc, pts, t, y0f, h, uvScale = 1, tint = [1, 1, 1]) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const nx = (b[1] - a[1]) / L * t / 2, nz = -(b[0] - a[0]) / L * t / 2;
    const ya = y0f(a[0], a[1]), yb = y0f(b[0], b[1]);
    const u1 = L / BAY_W * uvScale, vb = (y) => y / STOREY_H;
    // left side, right side, top
    acc.quad([a[0] + nx, ya - 0.3, a[1] + nz], [a[0] + nx, ya + h, a[1] + nz], [b[0] + nx, yb + h, b[1] + nz], [b[0] + nx, yb - 0.3, b[1] + nz], [0, 0], [0, vb(h)], [u1, vb(h)], [u1, 0], tint);
    acc.quad([a[0] - nx, ya - 0.3, a[1] - nz], [b[0] - nx, yb - 0.3, b[1] - nz], [b[0] - nx, yb + h, b[1] - nz], [a[0] - nx, ya + h, a[1] - nz], [0, 0], [u1, 0], [u1, vb(h)], [0, vb(h)], tint);
    acc.quad([a[0] + nx, ya + h, a[1] + nz], [a[0] - nx, ya + h, a[1] - nz], [b[0] - nx, yb + h, b[1] - nz], [b[0] + nx, yb + h, b[1] + nz], [0, 0], [0, 0.05], [u1, 0.05], [u1, 0], tint.map((v) => v * 0.9));
  }
}
function clipLine(pts, r) {
  const out = []; let cur = [];
  const inside = (p) => p[0] >= r.minX && p[0] < r.maxX && p[1] >= r.minZ && p[1] < r.maxZ;
  for (const p of pts) { if (inside(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }
  if (cur.length > 1) out.push(cur);
  return out;
}

export function buildBarriers(lines, tile, ctx) {
  const colliders = [];
  for (const l of lines) {
    const spec = {
      wall: { key: l.tags.material === 'flint' ? 'facade:flint:false' : 'facade:brick_red:false', t: 0.3, h: 1.6 },
      fence: { key: 'facade:timber:false', t: 0.08, h: 1.2 },
      hedge: { key: 'plain:hedge', t: 0.9, h: 1.5 },
      groyne: { key: 'facade:timber:false', t: 0.3, h: 1.1, tint: [0.42, 0.34, 0.26] },
      breakwater: { key: 'facade:concrete:false', t: 3, h: 1.5 },
    }[l.kind];
    if (!spec) continue;
    const h = parseFloat(l.tags.height) || spec.h;
    for (const seg of clipLine(l.pts, tile.rect)) {
      const [mx, mz] = seg[0];
      strip(ctx.acc.get(mx, mz, spec.key, true), seg, spec.t, ctx.ground, h, 1, spec.tint);
      for (let i = 1; i < seg.length; i++) colliders.push({ type: 'segment', a: seg[i - 1], b: seg[i], r: spec.t / 2 + 0.05, top: ctx.ground(seg[i][0], seg[i][1]) + h, kind: l.kind });
    }
  }
  return colliders;
}

/**
 * Pier: deck from the OSM pier polygon (or line + width). Deck height profile is an
 * approximation (documented): it rises from the promenade over the first 25 m.
 * Returns walkable surfaces [{ring, heightAt(x,z)}] and colliders (railings).
 */
export function buildPiers(features, tile, ctx) {
  const surfaces = [], colliders = [];
  const piers = [];
  for (const a of features.areas) if (a.kind === 'pier') piers.push({ id: a.id, ring: ensureCCW(a.outer), name: a.tags.name });
  for (const l of features.lines) if (l.kind === 'pier') {
    const w = l.width || 5;
    // buffer the centreline into a polygon (simple: rectangle per segment chain)
    const left = [], right = [];
    for (let i = 0; i < l.pts.length; i++) {
      const a = l.pts[Math.max(0, i - 1)], b = l.pts[Math.min(l.pts.length - 1, i + 1)];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
      left.push([l.pts[i][0] + nx * w / 2, l.pts[i][1] + nz * w / 2]); right.push([l.pts[i][0] - nx * w / 2, l.pts[i][1] - nz * w / 2]);
    }
    piers.push({ id: l.id, ring: ensureCCW(left.concat(right.reverse())), name: l.tags.name });
  }
  for (const p of piers) {
    const [cx, cz] = p.ring[0];
    // only build in the tile that owns its first vertex (piers cross tile edges)
    if (!(cx >= tile.rect.minX && cx < tile.rect.maxX && cz >= tile.rect.minZ && cz < tile.rect.maxZ)) continue;
    const obb = orientedBox(p.ring); if (!obb) continue;
    const e1 = [obb.cx + obb.ux * obb.length / 2, obb.cz + obb.uz * obb.length / 2], e2 = [obb.cx - obb.ux * obb.length / 2, obb.cz - obb.uz * obb.length / 2];
    const onLand = (q) => ctx.isLand(q[0], q[1]);
    let land = e2, dirSign = 1; // axis from land end towards sea
    if (onLand(e1) && !onLand(e2)) { land = e1; dirSign = -1; }
    else if (!onLand(e1) && !onLand(e2)) { // both ends over the beach/sea: the land end has higher ground beyond it
      const beyond = (q, sg) => { let h = -99; for (let s = 2; s <= 40; s += 2) h = Math.max(h, ctx.ground(q[0] - obb.ux * s * sg, q[1] - obb.uz * s * sg)); return h; };
      if (beyond(e1, -1) > beyond(e2, 1)) { land = e1; dirSign = -1; }
    }
    let baseY = ctx.ground(land[0], land[1]), ramp = 2.4;
    // Felixstowe's pier starts behind the pier building on the beach: the deck is level with the
    // promenade terrace, so take the highest ground up to 50 m landward and keep the deck flat.
    if (baseY < 1) {
      let hi = baseY;
      for (let s = 2; s <= 50; s += 2) hi = Math.max(hi, ctx.ground(land[0] - obb.ux * s * dirSign, land[1] - obb.uz * s * dirSign));
      if (hi > baseY + 1) { baseY = hi; ramp = 0; }
    }
    const deckY = (x, z) => {
      const s = ((x - land[0]) * obb.ux + (z - land[1]) * obb.uz) * dirSign;
      return baseY + 0.08 + Math.min(1, Math.max(0, s / 30)) * ramp;
    };
    const acc = ctx.acc.get(cx, cz, `ground:wood_deck:${LAYER.deck}`);
    const { verts, tris } = triangulate(p.ring);
    // subdivide along the axis so the ramp is smooth
    for (const [i, j, k] of tris) {
      const P = [verts[i], verts[j], verts[k]];
      const sub = (a, b, c, depth) => {
        const l = Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1]));
        if (l > 8 && depth < 8) { const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2]; sub(a, ab, ca, depth + 1); sub(ab, b, bc, depth + 1); sub(ca, bc, c, depth + 1); sub(ab, bc, ca, depth + 1); return; }
        const V = [a, b, c].map((q) => [q[0], deckY(q[0], q[1]), q[1]]);
        const ny = (V[1][2] - V[0][2]) * (V[2][0] - V[0][0]) - (V[1][0] - V[0][0]) * (V[2][2] - V[0][2]);
        const uv = (q) => [q[0] / GROUND_TEX_SIZE.wood_deck, -q[2] / GROUND_TEX_SIZE.wood_deck];
        if (ny >= 0) acc.triFlat(V[0], V[1], V[2], uv(V[0]), uv(V[1]), uv(V[2])); else acc.triFlat(V[0], V[2], V[1], uv(V[0]), uv(V[2]), uv(V[1]));
      };
      sub(...P, 0);
    }
    // deck edge fascia + railings + piles
    const fascia = ctx.acc.get(cx, cz, 'facade:concrete:false', true);
    const piles = [], posts = [];
    for (let i = 0; i < p.ring.length; i++) {
      const a = p.ring[i], b = p.ring[(i + 1) % p.ring.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.1) continue;
      const ya = deckY(...a), yb = deckY(...b);
      fascia.quad([b[0], yb, b[1]], [a[0], ya, a[1]], [a[0], ya - 0.6, a[1]], [b[0], yb - 0.6, b[1]], [0, 0], [L / BAY_W, 0], [L / BAY_W, 0.2], [0, 0.2], [0.85, 0.85, 0.82]);
      const landEdge = ctx.isLand((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) && ctx.isLand(a[0], a[1]);
      if (L > 3 && !landEdge) {
        colliders.push({ type: 'segment', a, b, r: 0.1, top: 99, kind: 'railing', y0: Math.min(ya, yb) });
        for (let s = 0; s < L; s += 2) { const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L; posts.push({ x, y: deckY(x, z), z }); }
        ribbonRail(ctx.acc.get(cx, cz, 'plain:railing'), a, b, deckY);
      }
    }
    for (let s = 8; s < obb.length; s += 6) for (const off of [-obb.width / 2 + 0.6, obb.width / 2 - 0.6]) {
      const x = obb.cx + obb.ux * (s - obb.length / 2) + -obb.uz * off, z = obb.cz + obb.uz * (s - obb.length / 2) + obb.ux * off;
      if (!pointInRing(x, z, p.ring) || ctx.isLand(x, z)) continue;
      const top = deckY(x, z) - 0.6; piles.push({ x, y: top, z, sy: top + 8 });
    }
    const pm = instances('pile', piles); const po = instances('post', posts);
    surfaces.push({ id: p.id, ring: p.ring, heightAt: deckY, name: p.name, meshes: [pm, po].filter(Boolean) });
  }
  return { surfaces, colliders };
}
function ribbonRail(acc, a, b, deckY) {
  const ya = deckY(...a) + 1.1, yb = deckY(...b) + 1.1;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  acc.quad([a[0], ya, a[1]], [b[0], yb, b[1]], [b[0], yb + 0.06, b[1]], [a[0], ya + 0.06, a[1]], [0, 0], [L, 0], [L, 1], [0, 1]);
  acc.quad([b[0], yb, b[1]], [a[0], ya, a[1]], [a[0], ya + 0.06, a[1]], [b[0], yb + 0.06, b[1]], [0, 0], [L, 0], [L, 1], [0, 1]);
}
