// Bridges and elevated roads.
//
// Why bridges used to look flat: every road ribbon was draped on the terrain, and the terrain is the
// Environment Agency LiDAR *DTM* (bare earth). A DTM has bridge decks removed and the gap filled from
// the ground underneath, so a road draped on it dips into the cutting it should cross. OSM tells us
// which ways are bridges (bridge=*, layer=*), and the DTM still holds the real embankments and
// abutments either side. So a bridge deck is profiled from the ground at its two ends (real data),
// checked against the clearance needed over whatever it crosses (OSM roads/rail), and only raised
// with a gentle ramp where the data says it must be. Decks are real surfaces: they carry their own
// collision (parapets, slab underside, abutments, piers), a layered walking/driving surface, and
// the clearance under them, so traffic below stays below and tall vehicles respect the headroom.

import * as THREE from 'three';
import { LAYER, GROUND_TEX_SIZE } from './materials.js';
import { BAY_W } from './textures.js';
import { ribbon } from './roads.js';

import { BRIDGE, bridgeKind, profileBridge, deckHalfWidth, profileNetwork, profileApproach } from './bridge-profile.js';
export { BRIDGE, bridgeKind, profileBridge, deckHalfWidth, profileNetwork, profileApproach };

function offsetLine(pts, o) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] + (dz / l) * o, p[1] - (dx / l) * o];
  });
}

/** Height-limit sign (UK round red-ring sign with metric and imperial headroom). */
const signTex = new Map();
function headroomTexture(m) {
  const key = m.toFixed(1); if (signTex.has(key)) return signTex.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.lineWidth = 26; g.strokeStyle = '#d0021b'; g.beginPath(); g.arc(128, 128, 106, 0, Math.PI * 2); g.stroke();
  const inches = Math.floor((m * 39.3701) - 3); // signs show a margin below the measured headroom
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = '800 54px Arial, sans-serif'; g.fillText(`${Math.floor(inches / 12)}'${inches % 12}"`, 128, 120);
  g.font = '800 46px Arial, sans-serif'; g.fillText(`${(m - 0.1).toFixed(1)}m`, 128, 178);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; signTex.set(key, t); return t;
}

/**
 * Build the deck, structure, colliders and layered surface for one profiled bridge.
 * Returns { surface, colliders, meshes, clearances }.
 */
export function buildBridge(way, prof, ctx) {
  const { acc } = ctx; const kind = prof.kind, pts = prof.pts, H = prof.heightAt, depth = prof.depth;
  const hw = deckHalfWidth(way, kind), parH = BRIDGE.parapet[kind];
  const [mx, mz] = pts[Math.floor(pts.length / 2)];
  const colliders = [], meshes = [], clearances = [];
  const left = offsetLine(pts, hw), right = offsetLine(pts, -hw);
  const Y = (p) => H(p[0], p[1]);
  const victorian = kind === 'road' && !/trunk|motorway/.test(way.kind); // most town over-bridges here date from the railway era (approximation)
  const wallKey = victorian ? 'facade:brick_red:false' : 'facade:concrete:false';
  // --- running surface (depth-writing deck materials so it never sinks behind the terrain) ---
  if (kind === 'road') {
    const cw = way.width / 2, pw = way.sidewalk && way.sidewalk !== 'no' ? 1.9 : 0.6;
    ribbon(acc.get(mx, mz, `ground:asphalt:${LAYER.deck}`), pts, -cw, cw, H, GROUND_TEX_SIZE.asphalt, 0.0);
    for (const sg of [-1, 1]) {
      ribbon(acc.get(mx, mz, `ground:paving:${LAYER.deck}`), offsetLine(pts, sg * (cw + pw / 2)), -pw / 2, pw / 2, (x, z) => H(x, z) + 0.13, GROUND_TEX_SIZE.paving, 0.0);
      ribbon(acc.get(mx, mz, 'plain:kerbface'), offsetLine(pts, sg * cw), -0.06, 0.06, (x, z) => H(x, z) + 0.13, 1, 0.0);
    }
    if (way.markings && !way.oneway && way.width >= 5) { // dashed centre line
      for (let i = 0; i + 2 < pts.length; i += 4) ribbon(acc.get(mx, mz, 'plain:roadpaint'), [pts[i], pts[i + 1], pts[i + 2]], -0.06, 0.06, H, 1, 0.012);
    }
  } else if (kind === 'rail') {
    ribbon(acc.get(mx, mz, `ground:ballast:${LAYER.deck}`), pts, -hw + 0.3, hw - 0.3, H, GROUND_TEX_SIZE.ballast, 0.0);
    for (const off of [-0.7175, 0.7175]) ribbon(acc.get(mx, mz, 'plain:rail'), offsetLine(pts, off), -0.035, 0.035, H, 1, 0.16);
    for (let i = 0; i < pts.length - 1; i++) ribbon(acc.get(mx, mz, 'plain:sleeper'), [pts[i], [pts[i][0] * 0.85 + pts[i + 1][0] * 0.15, pts[i][1] * 0.85 + pts[i + 1][1] * 0.15]], -1.25, 1.25, H, 1, 0.09);
  } else {
    ribbon(acc.get(mx, mz, `ground:${/wood/.test(way.surface || '') ? 'wood_deck' : 'asphalt'}:${LAYER.deck}`), pts, -hw + 0.1, hw - 0.1, H, 3, 0.0);
  }
  // --- slab edges (fascia) and underside ---
  const wall = acc.get(mx, mz, wallKey, true), under = acc.get(mx, mz, 'facade:concrete:false', true);
  const tint = [0.92, 0.9, 0.86];
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (const [side, ln] of [[1, left], [-1, right]]) {
      const a = ln[i - 1], b = ln[i], ya = Y(pts[i - 1]), yb = Y(pts[i]);
      const [p, q] = side > 0 ? [b, a] : [a, b]; const [yp, yq] = side > 0 ? [yb, ya] : [ya, yb];
      wall.quad([p[0], yp + (kind === 'foot' ? 0.05 : 0.15), p[1]], [q[0], yq + (kind === 'foot' ? 0.05 : 0.15), q[1]], [q[0], yq - depth, q[1]], [p[0], yp - depth, p[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, depth / 2.9], [0, depth / 2.9], tint);
      // parapet: solid brick/concrete wall for road decks, steel girders for rail, open railings for footbridges
      if (kind === 'foot') continue;
      const pin = side > 0 ? offsetLine([pts[i - 1], pts[i]], hw - 0.32) : offsetLine([pts[i - 1], pts[i]], -hw + 0.32);
      const top = kind === 'rail' ? parH : parH;
      const key = kind === 'rail' ? 'plain:girder' : wallKey;
      const pa = acc.get(mx, mz, key, key.startsWith('facade'));
      const [o0, o1] = side > 0 ? [pin[1], pin[0]] : [pin[0], pin[1]], [yo0, yo1] = side > 0 ? [yb, ya] : [ya, yb];
      const [e0, e1] = side > 0 ? [b, a] : [a, b];
      pa.quad([e0[0], yo0 + top, e0[1]], [e1[0], yo1 + top, e1[1]], [e1[0], yo1 + 0.1, e1[1]], [e0[0], yo0 + 0.1, e0[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, top / 2.9], [0, top / 2.9], tint); // outer face
      pa.quad([o1[0], yo1 + top, o1[1]], [o0[0], yo0 + top, o0[1]], [o0[0], yo0 + 0.1, o0[1]], [o1[0], yo1 + 0.1, o1[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, top / 2.9], [0, top / 2.9], tint); // inner face
      pa.quad([o0[0], yo0 + top, o0[1]], [o1[0], yo1 + top, o1[1]], [e1[0], yo1 + top, e1[1]], [e0[0], yo0 + top, e0[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, 0.1], [0, 0.1], tint); // coping
    }
    // underside (faces down)
    const l0 = left[i - 1], l1 = left[i], r0 = right[i - 1], r1 = right[i], y0 = Y(pts[i - 1]) - depth, y1 = Y(pts[i]) - depth;
    under.quad([l0[0], y0, l0[1]], [l1[0], y1, l1[1]], [r1[0], y1, r1[1]], [r0[0], y0, r0[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, 1], [0, 1], [0.7, 0.7, 0.7]);
    // colliders: parapet (blocks things on the deck) and slab (blocks anything too tall underneath)
    for (const ln of [left, right]) {
      const a = ln[i - 1], b = ln[i], ya = Y(pts[i - 1]), yb = Y(pts[i]);
      colliders.push({ type: 'segment', a, b, r: 0.2, y0: Math.min(ya, yb) - 0.3, top: Math.max(ya, yb) + parH, kind: 'parapet', bridge: prof.id });
      colliders.push({ type: 'segment', a, b, r: 0.05, y0: Math.min(ya, yb) - depth, top: Math.min(ya, yb) - 0.05, kind: 'bridge-slab', bridge: prof.id });
    }
  }
  // footbridge railings
  if (kind === 'foot') for (const ln of [left, right]) {
    const rail = acc.get(mx, mz, 'plain:railing');
    for (let i = 1; i < ln.length; i++) { const a = ln[i - 1], b = ln[i], ya = Y(pts[i - 1]) + 1.1, yb = Y(pts[i]) + 1.1; rail.quad([a[0], ya, a[1]], [b[0], yb, b[1]], [b[0], yb + 0.06, b[1]], [a[0], ya + 0.06, a[1]], [0, 0], [1, 0], [1, 1], [0, 1]); rail.quad([b[0], yb, b[1]], [a[0], ya, a[1]], [a[0], ya + 0.06, a[1]], [b[0], yb + 0.06, b[1]], [0, 0], [1, 0], [1, 1], [0, 1]); }
  }
  // --- abutments where the ground falls away beneath the deck, and piers for long spans ---
  const gap = (si) => { const i = Math.min(pts.length - 1, Math.round(si / 2)); const p = pts[Math.max(0, Math.min(pts.length - 1, i))]; return prof.yAtS(si) - depth - ctx.ground(p[0], p[1]); };
  let sA = null, sB = null; for (let si = 0; si <= prof.L; si += 1) if (gap(si) > 1.2) { if (sA == null) sA = si; sB = si; }
  const posts = [];
  if (sA != null) {
    for (const [sf, dir] of [[Math.max(0, sA - 1), -1], [Math.min(prof.L, sB + 1), 1]]) {
      const c = prof.pts[Math.min(pts.length - 1, Math.round(sf / 2))]; const p = prof.project(c[0], c[1]);
      const n = pts[Math.min(pts.length - 1, p.i)], m = pts[Math.max(0, p.i - 1)]; const dx = n[0] - m[0], dz = n[1] - m[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      const a = [c[0] + uz * hw, c[1] - ux * hw], b = [c[0] - uz * hw, c[1] + ux * hw];
      const yt = prof.yAtS(sf) - depth, yg = Math.min(ctx.ground(a[0], a[1]), ctx.ground(b[0], b[1]), ctx.ground(c[0], c[1])) - 0.6;
      if (yt - yg < 0.4) continue;
      const [p0, p1] = dir < 0 ? [a, b] : [b, a]; const w = 2 * hw;
      wall.quad([p0[0], yt, p0[1]], [p1[0], yt, p1[1]], [p1[0], yg, p1[1]], [p0[0], yg, p0[1]], [0, 0], [w / BAY_W, 0], [w / BAY_W, (yt - yg) / 2.9], [0, (yt - yg) / 2.9], tint);
      colliders.push({ type: 'segment', a, b, r: 0.5, y0: yg, top: yt, kind: 'abutment', bridge: prof.id });
    }
    const span = sB - sA;
    if (span > 26 && kind !== 'foot') {
      const n = Math.ceil(span / 22);
      for (let k = 1; k < n; k++) {
        let best = null;
        for (let d = -5; d <= 5; d += 0.5) { // nudge piers off the roads and railway underneath
          const si = sA + (span * k) / n + d, p = prof.pts[Math.min(pts.length - 1, Math.round(si / 2))];
          const clear = prof.crossings.every((c) => Math.abs(c.s - si) > c.width / 2 + 1.6);
          if (clear && (!best || Math.abs(d) < Math.abs(best.d))) best = { si, p, d };
        }
        if (!best) continue;
        const pp = prof.project(best.p[0], best.p[1]), n2 = pts[Math.min(pts.length - 1, pp.i)], m2 = pts[Math.max(0, pp.i - 1)];
        const dx = n2[0] - m2[0], dz = n2[1] - m2[1], l = Math.hypot(dx, dz) || 1;
        for (const off of [-(hw - 1.4), hw - 1.4]) {
          const x = best.p[0] + (dz / l) * off, z = best.p[1] - (dx / l) * off, top = prof.yAtS(best.si) - depth, gy = ctx.ground(x, z) - 0.5;
          posts.push({ x, y: gy, z, h: top - gy });
          colliders.push({ type: 'circle', x, z, r: 0.55, y0: gy, top, kind: 'pier', bridge: prof.id });
        }
      }
    }
  }
  if (posts.length) {
    const geo = new THREE.CylinderGeometry(0.5, 0.55, 1, 12).translate(0, 0.5, 0);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.9 }), posts.length);
    const M = new THREE.Matrix4(); posts.forEach((p, i) => { M.makeScale(1, p.h, 1).setPosition(p.x, p.y, p.z); m.setMatrixAt(i, M); });
    m.castShadow = m.receiveShadow = true; meshes.push(m);
  }
  // --- headroom signs and clearance records for traffic underneath ---
  for (const c of prof.crossings) {
    clearances.push({ x: c.x, z: c.z, clearance: c.clearance, under: c.id, bridge: prof.id, name: prof.name });
    if (c.clearance < BRIDGE.signBelow && c.kind === 'road') {
      const p = prof.project(c.x, c.z), yb = prof.yAtS(p.s) - depth;
      const n2 = pts[Math.min(pts.length - 1, p.i)], m2 = pts[Math.max(0, p.i - 1)], ang = Math.atan2(n2[0] - m2[0], n2[1] - m2[1]);
      for (const sg of [1, -1]) {
        const sign = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: headroomTexture(c.clearance) }));
        sign.position.set(c.x + Math.cos(ang) * 0 + Math.sin(ang + Math.PI / 2) * 0, yb + depth * 0.45, c.z);
        sign.rotation.y = ang + (sg > 0 ? Math.PI / 2 : -Math.PI / 2);
        sign.translateZ(hw + 0.03); meshes.push(sign);
      }
    }
  }
  const ring = left.concat(right.slice().reverse());
  const surface = { id: 'bridge:' + prof.id, ring, heightAt: H, name: way.name ? `${way.name} bridge` : kind === 'rail' ? 'Railway bridge' : 'Bridge', layered: true, bridge: true, kind, walk: kind !== 'rail', depth, profile: prof, meshes };
  return { surface, colliders, meshes, clearances };
}

/**
 * Approach ramp: the road surface itself is drawn by roads.js on the raised profile; this adds the
 * retaining walls and low parapets either side, their colliders, and a layered surface to stand on.
 */
export function buildRamp(way, ap, ctx) {
  if (ap.pts.length < 2) return null;
  const { acc } = ctx, kind = ap.kind, pts = ap.pts;
  const hw = kind === 'rail' ? 2.6 : kind === 'foot' ? Math.max(1.0, (way.width || 2) / 2 + 0.2) : way.width / 2 + (way.sidewalk && way.sidewalk !== 'no' ? 1.9 : 0.4) + 0.3;
  const [mx, mz] = pts[0], colliders = [], tint = [0.92, 0.9, 0.86];
  const left = offsetLine(pts, hw), right = offsetLine(pts, -hw), H = ap.heightAt;
  const wallKey = kind === 'road' && !/trunk|motorway/.test(way.kind) ? 'facade:brick_red:false' : 'facade:concrete:false';
  const wall = acc.get(mx, mz, wallKey, true), parH = kind === 'rail' ? 0 : kind === 'foot' ? 1.05 : 0.9;
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (const [side, ln] of [[1, left], [-1, right]]) {
      const a = ln[i - 1], b = ln[i], ya = ap.y[i - 1], yb = ap.y[i];
      const ga = ctx.ground(a[0], a[1]) - 0.3, gb = ctx.ground(b[0], b[1]) - 0.3;
      if (Math.max(ya - ga, yb - gb) < 0.45) continue;
      const [p, q, yp, yq, gp, gq] = side > 0 ? [b, a, yb, ya, gb, ga] : [a, b, ya, yb, ga, gb];
      wall.quad([p[0], yp + parH, p[1]], [q[0], yq + parH, q[1]], [q[0], gq, q[1]], [p[0], gp, p[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, (yp - gp) / 2.9], [0, (yp - gp) / 2.9], tint);
      if (parH) { const [r0, r1] = side > 0 ? offsetLine([pts[i], pts[i - 1]], -(hw - 0.25)) : offsetLine([pts[i - 1], pts[i]], -hw + 0.25); wall.quad([r1[0], yq + parH, r1[1]], [r0[0], yp + parH, r0[1]], [r0[0], yp, r0[1]], [r1[0], yq, r1[1]], [0, 0], [segLen / BAY_W, 0], [segLen / BAY_W, parH / 2.9], [0, parH / 2.9], tint); }
      colliders.push({ type: 'segment', a, b, r: 0.2, y0: Math.min(ga, gb), top: Math.max(ya, yb) + Math.max(parH, 0.6), kind: 'ramp-wall', ramp: ap.id });
    }
  }
  const ring = left.concat(right.slice().reverse());
  const surface = { id: 'ramp:' + ap.id, ring, heightAt: H, name: null, layered: true, ramp: true, kind, walk: kind !== 'rail', depth: 0, profile: ap, meshes: [] };
  return { surface, colliders, meshes: [], clearances: [] };
}
