// Felixstowe Leisure Centre, Undercliff Road West (OSM way 91786059), next to the pier.
// Form from a street-level photo supplied by the user (Google Street View, 2019): red-brick walls set
// back behind a colonnade of dark posts under deep brown-tiled hipped roofs; a raised clerestory with a
// band of red-framed windows under a second hipped roof; a glazed, red-framed entrance front with a
// blue fascia lettered FELIXSTOWE LEISURE CENTRE. Footprint from OSM; overall height from EA LiDAR
// (90th percentile 11.6 m above ground). Proportions are estimates; no imagery is reproduced.

import * as THREE from 'three';
import { ensureCCW, insetRing } from '../geo/polygon.js';

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
  sign.wrapS = THREE.ClampToEdgeWrapping;
  M = {
    clere: std({ map: clere, roughness: 0.4, metalness: 0.1 }),
    entrance: std({ map: entrance, roughness: 0.25, metalness: 0.2 }),
    sign: std({ map: sign, roughness: 0.5 }),
    post: std({ color: 0x3b3d40, roughness: 0.6 }),
    fasciaBrown: std({ color: 0x4a3b30, roughness: 0.7 }),
    door: std({ color: 0x2a2b2e, roughness: 0.5 }),
  };
  return M;
}

export function leisureMaterial(key) { const m = mats(); return key === 'pb:clere' ? m.clere : null; }

/** Build into ctx.acc (walls, roofs) plus a few meshes. Returns { meshes, collider }. */
export function buildLeisureCentre(b, ctx) {
  const m = mats(), acc = ctx.acc, outer = ensureCCW(b.outer);
  const cx = b.cx, cz = b.cz;
  let g0 = Infinity, gs = 0; for (const [x, z] of outer) { const g = ctx.ground(x, z); g0 = Math.min(g0, g); gs += g; }
  const base = gs / outer.length;
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
    const ca = acc.get(cx, cz, 'pb:clere');
    for (let i = 0; i < clere.length; i++) { const a = clere[i], c = clere[(i + 1) % clere.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.5) continue;
      ca.quad([a[0], yL - 0.4, a[1]], [c[0], yL - 0.4, c[1]], [c[0], base + Y.clerestoryTop, c[1]], [a[0], base + Y.clerestoryTop, a[1]], [0, 0], [L / 4, 0], [L / 4, 1], [0, 1]); }
    let prev = insetRing(outer, Y.lowerInset - 0.4) || clere, y = base + Y.clerestoryTop;
    for (const step of [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]) { // stepped inward until the ring collapses (a hip roof)
      const d = (prev === clere ? 0 : 0) + step; const inn = insetRing(prev, d); if (!inn || inn.length !== prev.length) break;
      ringRoof(prev, inn, y, y + d * tan); y += d * tan; prev = inn;
    }
    // close the top
    if (prev.length >= 3) { const r = acc.get(cx, cz, 'roof:concrete_tile', true); const c0 = prev.reduce((s, p) => [s[0] + p[0] / prev.length, s[1] + p[1] / prev.length], [0, 0]); for (let i = 0; i < prev.length; i++) { const a = prev[i], c = prev[(i + 1) % prev.length]; r.triFlat([a[0], y, a[1]], [c[0], y, c[1]], [c0[0], y + 0.5, c0[1]], [0, 0], [1, 0], [0.5, 0.5], rtint); } }
  }
  // posts along the eaves, front entrance glazing and the blue fascia sign on the street side
  const meshes = [];
  const postRing = insetRing(outer, 0.35) || outer;
  const postG = new THREE.BoxGeometry(0.45, 1, 0.45); const posts = [];
  let front = null;
  for (let i = 0; i < postRing.length; i++) {
    const a = postRing[i], c = postRing[(i + 1) % postRing.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 4) continue;
    const n = Math.max(1, Math.round(L / 6)); for (let k = 0; k <= n; k++) posts.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]);
    const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L, mx = (a[0] + c[0]) / 2 + nx * 8, mz = (a[1] + c[1]) / 2 + nz * 8;
    const road = ctx.nearestRoad(mx, mz, 25, (r) => r.car && r.kind !== 'service');
    const score = (road ? 30 - road.d : 0) + Math.min(L, 40) * 0.5;
    if (!front || score > front.score) front = { score, i, a, c, L, nx, nz };
  }
  const pm = new THREE.InstancedMesh(postG, m.post, posts.length); const mt = new THREE.Matrix4();
  posts.forEach(([x, z], k) => { const h = yE - ctx.ground(x, z) + 0.3; mt.makeScale(1, h, 1).setPosition(x, ctx.ground(x, z) - 0.3 + h / 2, z); pm.setMatrixAt(k, mt); });
  pm.castShadow = true; meshes.push(pm);
  if (front) {
    const { a, c, L, nx, nz } = front, ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
    const place = (mat, s0, s1, y0, y1, off) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(s1 - s0, y1 - y0), mat); const s = (s0 + s1) / 2; me.position.set(a[0] + ux * s + nx * off, (y0 + y1) / 2, a[1] + uz * s + nz * off); me.rotation.y = Math.atan2(nx, nz); meshes.push(me); return me; };
    // blue fascia on the outer eave over the right half of the front, two lettered panels
    place(m.sign, L * 0.5 - 2, Math.min(L - 0.5, L * 0.5 + 24), yE - Y.fascia + 0.04, yE - 0.02, 0.8);
    // glazed entrance on the wall line, behind the colonnade
    const wallOff = -(Y.colonnade - 0.35) + 0.03;
    place(m.entrance, L * 0.5, L * 0.5 + Math.min(12, L * 0.3), base, base + 2.9, wallOff);
    place(m.door, L * 0.3, L * 0.3 + 1.9, base, base + 2.2, wallOff);
  }
  return { meshes, collider: { outer: walls, holes: [], base: g0 - 0.3, top: base + 11.6 } };
}
