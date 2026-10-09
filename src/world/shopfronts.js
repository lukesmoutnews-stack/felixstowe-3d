// Shop signs: a fascia board with the business name over each shop unit, on the street-facing wall
// of the building that contains (or is next to) the OpenStreetMap shop/amenity point.
// Names and positions: OSM, corrected/added from src/content/shops.js (sourced research).
// Fascia colours: researched brand colours for chains; a generated traditional palette otherwise
// (flagged as generated). Lettering is plain type; no logos are drawn.

import * as THREE from 'three';
import { BRAND_STYLES, OVERRIDES, ADDITIONS } from '../content/shops.js';
import { pointInRing, hash01 } from '../geo/polygon.js';

const SIGN_AMENITIES = new Set(['restaurant', 'cafe', 'pub', 'bar', 'fast_food', 'bank', 'pharmacy', 'post_office', 'cinema', 'ice_cream', 'bureau_de_change', 'dentist', 'doctors', 'veterinary', 'nightclub', 'casino', 'social_facility', 'library']);
const PALETTE = [ // generated styles for businesses without researched shopfronts
  { fascia: '#1f2f4a', text: '#e9d9a6', font: 'serif' }, { fascia: '#151515', text: '#f4f1ea', font: 'sans' },
  { fascia: '#efe9dc', text: '#1f3d2b', font: 'serif' }, { fascia: '#5e1c22', text: '#f1e6cf', font: 'serif' },
  { fascia: '#f6f5f1', text: '#1b1b1b', font: 'sans' }, { fascia: '#0f4d57', text: '#ffffff', font: 'sans' },
  { fascia: '#22402e', text: '#e2cf8f', font: 'serif' }, { fascia: '#55595e', text: '#ffffff', font: 'sans' },
  { fascia: '#2b2140', text: '#f3e9ff', font: 'sans' }, { fascia: '#8a6a3f', text: '#fff8ea', font: 'serif' },
];
const CELL_W = 512, CELL_H = 64, ATLAS = 2048, PER_ATLAS = (ATLAS / CELL_W) * (ATLAS / CELL_H);
const BOARD_H = 0.72;

export function wantsSign(t) {
  if (!t || !(t.name || t.brand)) return false;
  return !!(t.shop || SIGN_AMENITIES.has(t.amenity) || t.office || t.craft || (t.tourism && ['hotel', 'guest_house', 'hostel'].includes(t.tourism)) || (t.leisure && ['amusement_arcade', 'adult_gaming_centre', 'fitness_centre', 'bowling_alley'].includes(t.leisure)));
}

/** Businesses to sign in this tile: OSM POIs (corrected) plus researched additions. */
export function collectBusinesses(pois, frame, inTile) {
  const out = [];
  for (const p of pois) {
    if (!inTile(p.x, p.z) || !wantsSign(p.tags)) continue;
    const o = OVERRIDES[p.id];
    out.push({ id: p.id, x: p.x, z: p.z, name: o?.name || p.tags.name || p.tags.brand, brand: o?.name ? null : p.tags.brand, status: o?.status || 'osm', was: o?.was || null, note: o?.note || null, evidence: o?.evidence || null, tags: p.tags, wide: p.tags.shop === 'supermarket' || p.tags.shop === 'variety_store' || p.tags.shop === 'frozen_food' || p.tags.amenity === 'cinema' || p.tags.tourism === 'hotel' });
  }
  for (const a of ADDITIONS) {
    const w = frame.toWorld(a.lat, a.lon); if (!inTile(w.x, w.z)) continue;
    out.push({ id: a.id, x: w.x, z: w.z, name: a.name, brand: a.brand || null, status: 'added', evidence: a.evidence, note: a.addr, tags: {} });
  }
  return out;
}

function styleOf(biz) {
  if (biz.status === 'vacant') return { fascia: '#d9d6cf', text: '#2b2b2b', font: 'sans', weight: 'bold', case: 'upper', label: 'TO LET', source: 'vacant' };
  if (biz.status === 'closed') return { fascia: '#bdb8ae', text: '#bdb8ae', font: 'sans', label: '', source: 'closed' };
  const s = BRAND_STYLES[biz.brand] || BRAND_STYLES[biz.name];
  if (s) return { ...s, font: s.font === 'script' ? 'serif' : s.font, label: biz.name, source: 'researched:' + s.confidence };
  let h = 0; for (const ch of biz.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const p = PALETTE[h % PALETTE.length];
  return { ...p, weight: p.font === 'sans' ? 'bold' : 'regular', case: hash01(h) > 0.5 ? 'upper' : 'mixed', label: biz.name, source: 'generated' };
}

/** Building edge to sign: the edge of the host building nearest the point that faces a road. */
function hostAndEdge(biz, buildings, nearestRoad) {
  let host = buildings.find((b) => pointInRing(biz.x, biz.z, b.outer));
  if (!host) {
    let best = 12;
    for (const b of buildings) { const d = ringDist(biz.x, biz.z, b.outer); if (d < best) { best = d; host = b; } }
  }
  if (!host || !host.geom) return null;
  const R = ccw(host.outer); let best = null;
  for (let i = 0; i < R.length; i++) {
    const a = R[i], c = R[(i + 1) % R.length], dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 2.5) continue;
    const nx = -dz / L, nz = dx / L;
    let t = ((biz.x - a[0]) * dx + (biz.z - a[1]) * dz) / (L * L); t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(a[0] + dx * t - biz.x, a[1] + dz * t - biz.z);
    const mx = (a[0] + c[0]) / 2 + nx * 7, mz = (a[1] + c[1]) / 2 + nz * 7;
    const road = nearestRoad(mx, mz, 14, (r) => (r.car && r.kind !== 'service') || r.kind === 'pedestrian');
    const score = d + (road ? 0 : 25) - Math.min(L, 12) * 0.3;
    if (!best || score < best.score) best = { score, a, c, L, nx, nz, t, ux: dx / L, uz: dz / L, key: host.id + ':' + i };
  }
  return best && { host, ...best };
}
function ringDist(x, z, r) { let m = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length], dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); m = Math.min(m, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)); } return m; }
function ccw(r) { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; s += a[0] * c[1] - c[0] * a[1]; } return s > 0 ? r.slice().reverse() : r; } // x,z with z south: positive = clockwise on the map

/** Mark host buildings as shops (so their ground floor becomes a shopfront) before buildings are built. */
export function markShopBuildings(businesses, buildings) {
  for (const biz of businesses) {
    let b = buildings.find((q) => pointInRing(biz.x, biz.z, q.outer));
    if (!b) { let best = 12; for (const q of buildings) { const d = ringDist(biz.x, biz.z, q.outer); if (d < best) { best = d; b = q; } } }
    if (b) { b.shop = true; b.shopSource = 'osm:business-point'; }
  }
}

/** Build sign boards into ctx.acc; returns { materials, count, stats } for the tile. */
export function buildSigns(businesses, buildings, ctx, tileKey) {
  const placed = [];
  for (const biz of businesses) { const e = hostAndEdge(biz, buildings, ctx.nearestRoad); if (e) placed.push({ biz, e, style: styleOf(biz) }); }
  // split shared walls between neighbouring units
  const byEdge = new Map();
  for (const p of placed) { if (!byEdge.has(p.e.key)) byEdge.set(p.e.key, []); byEdge.get(p.e.key).push(p); }
  for (const list of byEdge.values()) {
    list.sort((a, b) => a.e.t - b.e.t);
    for (let i = 0; i < list.length; i++) {
      const p = list[i], L = p.e.L, s = p.e.t * L;
      const lo = i > 0 ? (list[i - 1].e.t * L + s) / 2 : 0, hi = i < list.length - 1 ? (list[i + 1].e.t * L + s) / 2 : L;
      const maxW = p.biz.wide ? 16 : 8.5, minW = Math.min(3, L - 0.4);
      let s0 = Math.max(lo + 0.15, s - maxW / 2), s1 = Math.min(hi - 0.15, s + maxW / 2);
      if (s1 - s0 < minW) { const m = Math.max(minW / 2 + 0.2, Math.min(L - minW / 2 - 0.2, s)); s0 = m - minW / 2; s1 = m + minW / 2; }
      p.s0 = s0; p.s1 = s1;
    }
  }
  const materials = new Map(); const stats = { signs: 0, researched: 0, generated: 0, corrected: 0, added: 0 };
  let atlas = null, slot = 0, atlasIdx = -1;
  const newAtlas = () => {
    const c = document.createElement('canvas'); c.width = ATLAS; c.height = ATLAS;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    atlasIdx++; const key = `sign:${tileKey}:${atlasIdx}`;
    materials.set(key, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 }));
    atlas = { ctx: c.getContext('2d'), key, tex }; slot = 0;
  };
  for (const p of placed) {
    if (!atlas || slot >= PER_ATLAS) newAtlas();
    const cx0 = (slot % (ATLAS / CELL_W)) * CELL_W, cy0 = Math.floor(slot / (ATLAS / CELL_W)) * CELL_H; slot++;
    const w = p.s1 - p.s0;
    paintSign(atlas.ctx, cx0, cy0, w, p.style);
    const { a, nx, nz, ux, uz } = p.e, g = p.e.host.geom;
    const top = g.shopTop ? g.shopTop - 0.04 : g.base + Math.min(3.6, Math.max(2.6, g.wallTop - g.base - 0.4));
    const y0 = top - BOARD_H + 0.02, off = 0.03, dep = 0.1;
    const P = (s, o, y) => [a[0] + ux * s + nx * o, y, a[1] + uz * s + nz * o];
    const U0 = cx0 / ATLAS, U1 = (cx0 + CELL_W) / ATLAS, V1 = 1 - cy0 / ATLAS, V0 = 1 - (cy0 + CELL_H) / ATLAS, Us = (cx0 + 2) / ATLAS;
    const acc = ctx.acc.get(a[0], a[1], atlas.key);
    const f = off + dep;
    acc.quad(P(p.s0, f, y0), P(p.s1, f, y0), P(p.s1, f, top), P(p.s0, f, top), [U0, V0], [U1, V0], [U1, V1], [U0, V1]); // face
    const sv = [Us, (V0 + V1) / 2];
    acc.quad(P(p.s0, off, top), P(p.s0, f, top), P(p.s1, f, top), P(p.s1, off, top), sv, sv, sv, sv); // top
    acc.quad(P(p.s0, off, y0), P(p.s1, off, y0), P(p.s1, f, y0), P(p.s0, f, y0), sv, sv, sv, sv); // underside
    acc.quad(P(p.s0, off, y0), P(p.s0, f, y0), P(p.s0, f, top), P(p.s0, off, top), sv, sv, sv, sv); // ends
    acc.quad(P(p.s1, f, y0), P(p.s1, off, y0), P(p.s1, off, top), P(p.s1, f, top), sv, sv, sv, sv);
    stats.signs++;
    if (p.style.source.startsWith('researched')) stats.researched++; else if (p.style.source === 'generated') stats.generated++;
    if (['replaced', 'closed', 'vacant'].includes(p.biz.status)) stats.corrected++;
    if (p.biz.status === 'added') stats.added++;
    p.info = { id: p.biz.id, name: p.biz.name, status: p.biz.status, style: p.style.source, fascia: p.style.fascia, was: p.biz.was, evidence: p.biz.evidence, nx, nz, width: +(p.s1 - p.s0).toFixed(2), x: (P(p.s0, 0, 0)[0] + P(p.s1, 0, 0)[0]) / 2, z: (P(p.s0, 0, 0)[2] + P(p.s1, 0, 0)[2]) / 2, y: top };
  }
  for (const m of materials.values()) m.map.needsUpdate = true;
  return { materials, stats, signs: placed.map((p) => p.info) };
}

function paintSign(c, x0, y0, wMetres, s) {
  c.save();
  c.fillStyle = s.fascia; c.fillRect(x0, y0, CELL_W, CELL_H);
  // thin moulding lines top and bottom
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x0, y0 + 2, CELL_W, 2);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0, y0 + CELL_H - 4, CELL_W, 3);
  let label = s.label || '';
  if (s.case === 'upper') label = label.toUpperCase();
  if (label) {
    const pxPerM_V = CELL_H / BOARD_H, pxPerM_H = CELL_W / wMetres, sx = pxPerM_H / pxPerM_V; // draw undistorted on the board
    const family = s.font === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Helvetica Neue", Arial, sans-serif';
    let size = CELL_H * (s.case === 'upper' ? 0.6 : 0.74);
    c.font = `${s.weight === 'bold' ? '700' : '600'} ${size}px ${family}`;
    const maxW = (CELL_W - 24) / sx;
    const tw = c.measureText(label).width; if (tw > maxW) { size *= maxW / tw; c.font = `${s.weight === 'bold' ? '700' : '600'} ${size}px ${family}`; }
    c.beginPath(); c.rect(x0, y0, CELL_W, CELL_H); c.clip();
    c.translate(x0 + CELL_W / 2, y0 + CELL_H / 2 + 1); c.scale(sx, 1);
    c.fillStyle = s.text; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, 0, 0);
  }
  c.restore();
}
