// Trees: mapped OSM trees and tree rows (real positions), LiDAR-detected trees when the
// terrain pipeline supplies them (real positions), and clearly-flagged procedural fill for
// mapped woods/scrub/parks that have no individually mapped trees.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { mulberry32, pointInPolygon, hash01, clipRingToRect, area, bounds, distToSegment } from '../geo/polygon.js';

const variants = new Map();
function colorize(g, c) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = g.attributes.position.getY(i); const ao = 0.75 + Math.min(0.25, y * 0.02); col[i * 3] = c[0] * ao; col[i * 3 + 1] = c[1] * ao; col[i * 3 + 2] = c[2] * ao; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function blob(r, detail, rand, jitter = 0.25) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + (rand() - 0.5) * jitter; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals(); return g;
}
// ---- realistic trees: branching trunks and crowns of alpha-tested leaf cards ----
// Each card carries a hand-drawn cluster of leaves (procedural, on canvas); cards are scattered through the
// crown volume, mostly near its surface, with normals pointing out from the crown centre so the canopy shades
// softly as one mass (light on top and sunward side, dark inside and underneath), as real foliage does.
function leafTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rand = mulberry32(kind === 'needle' ? 7 : 3);
  g.strokeStyle = 'rgba(70,55,40,0.9)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(128, 250); g.quadraticCurveTo(60 + rand() * 136, 160, 20 + rand() * 216, 20 + rand() * 120); g.stroke(); }
  const n = kind === 'needle' ? 900 : 170;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 118, x = 128 + Math.cos(a) * r, y = 120 + Math.sin(a) * r * 0.95;
    const hue = kind === 'needle' ? 130 + rand() * 25 : 78 + rand() * 40, l = 18 + rand() * 26, sat = kind === 'needle' ? 25 + rand() * 15 : 35 + rand() * 25;
    g.save(); g.translate(x, y); g.rotate(rand() * Math.PI * 2);
    g.fillStyle = `hsl(${hue},${sat}%,${l}%)`;
    if (kind === 'needle') { g.fillRect(-0.8, -9, 1.6, 18); }
    else { g.beginPath(); g.ellipse(0, 0, 4 + rand() * 4, 9 + rand() * 6, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = `hsla(${hue},${sat}%,${l + 14}%,0.7)`; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function cards(out, n, pick, size, rand, tint, ctr) {
  const P = [], N = [], UV = [], C = [];
  for (let i = 0; i < n; i++) {
    const [x, y, z, shell] = pick(rand), w = size * (0.75 + rand() * 0.5), h = w;
    // orientation: roughly facing outward with a random twist and tilt
    const ox = x - ctr[0], oy = y - ctr[1], oz = z - ctr[2], ol = Math.hypot(ox, oy, oz) || 1;
    const yaw = Math.atan2(ox, oz) + (rand() - 0.5) * 1.6, tilt = (rand() - 0.5) * 1.4;
    const ax = [Math.cos(yaw), 0, -Math.sin(yaw)], ay = [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)];
    const ao = (0.45 + 0.55 * shell) * (0.75 + 0.25 * Math.max(0, oy / ol));
    for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      P.push(x + ax[0] * u * w + ay[0] * v * h, y + ax[1] * u * w + ay[1] * v * h, z + ax[2] * u * w + ay[2] * v * h);
      N.push(ox / ol, oy / ol, oz / ol); UV.push(u + 0.5, v + 0.5); C.push(tint[0] * ao, tint[1] * ao, tint[2] * ao);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); out.push(g);
}
function limb(out, a, b, r0, r1, bark) { // a tapered branch between two points
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, 6, 1, true); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(...a);
  out.push(colorize(g, bark));
}
const LOW = () => !!globalThis.__treeLow;
function treeGeometry(kind) {
  if (variants.has(kind)) return variants.get(kind);
  const rand = mulberry32(kind.length * 17 + 5), trunk = [], leaves = [], k = LOW() ? 0.55 : 1;
  const bark = [0.3, 0.25, 0.2];
  const ellip = (cx, cy, cz, rx, ry, rz, shellMin = 0.55) => (r) => { const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), s = shellMin + (1 - shellMin) * Math.sqrt(rand()); return [cx + Math.sin(v) * Math.cos(u) * rx * s, cy + Math.cos(v) * ry * s, cz + Math.sin(v) * Math.sin(u) * rz * s, (s - shellMin) / (1 - shellMin)]; };
  if (kind === 'conifer') {
    limb(trunk, [0, 0, 0], [0, 11, 0], 0.32, 0.06, bark);
    const pick = () => { const y = 1.8 + rand() * 9.4, rr = (1 - (y - 1.8) / 9.6) * 2.6 + 0.2, a = rand() * Math.PI * 2, s = 0.6 + 0.4 * Math.sqrt(rand()); return [Math.cos(a) * rr * s, y, Math.sin(a) * rr * s, s]; };
    cards(leaves, Math.round(130 * k), pick, 1.5, rand, [0.62, 0.78, 0.66], [0, 6, 0]);
  } else if (kind === 'pine') { // umbrella-crowned coastal pine
    limb(trunk, [0, 0, 0], [0.4, 8.6, 0.2], 0.3, 0.16, [0.42, 0.3, 0.22]);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; limb(trunk, [0.4, 8.2, 0.2], [Math.cos(a) * 2.4, 9.6 + rand(), Math.sin(a) * 2.4], 0.12, 0.05, [0.42, 0.3, 0.22]); }
    cards(leaves, Math.round(110 * k), ellip(0.2, 10, 0.1, 3.4, 1.1, 3.4), 1.6, rand, [0.62, 0.78, 0.64], [0.2, 9.4, 0.1]);
  } else if (kind === 'shrub') {
    cards(leaves, Math.round(40 * k), ellip(0, 0.9, 0, 1.2, 0.9, 1.2, 0.3), 0.9, rand, [0.85, 0.95, 0.75], [0, 0.6, 0]);
  } else { // broadleaf
    const big = kind === 'broadleaf_large', holm = kind === 'holm_oak', th = big ? 3.6 : 2.8, rx = big ? 4.2 : 3.0, ry = big ? 3.6 : 2.7, cy = th + ry * 0.95;
    limb(trunk, [0, 0, 0], [0, th + 0.8, 0], big ? 0.42 : 0.28, big ? 0.24 : 0.16, bark);
    const nb = big ? 7 : 5;
    for (let i = 0; i < nb; i++) { const a = (i / nb) * Math.PI * 2 + rand() * 0.5, to = [Math.cos(a) * rx * 0.62, cy + (rand() - 0.2) * ry * 0.6, Math.sin(a) * rx * 0.62]; limb(trunk, [0, th + 0.5 * rand(), 0], to, big ? 0.18 : 0.12, 0.04, bark); }
    cards(leaves, Math.round((big ? 210 : 140) * k), ellip(0, cy, 0, rx, ry, rx), big ? 1.9 : 1.5, rand, holm ? [0.6, 0.72, 0.58] : [0.92, 1.0, 0.82], [0, cy - ry * 0.3, 0]);
  }
  const merge = (list) => { const g = mergeGeometries(list.map((p) => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); return p.index ? p.toNonIndexed() : p; })); g.computeBoundingSphere(); return g; };
  const out = { trunk: trunk.length ? merge(trunk) : null, leaves: merge(leaves), needle: kind === 'conifer' || kind === 'pine' };
  variants.set(kind, out); return out;
}
let treeMat, leafMats = {};
function material() {
  if (!treeMat) treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  return treeMat;
}
function leafMaterial(needle) {
  const k = needle ? 'needle' : 'leaf';
  return (leafMats[k] ||= new THREE.MeshStandardMaterial({ map: leafTexture(k), vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 }));
}
const NOMINAL_H = { broadleaf_large: 12, broadleaf: 8.5, holm_oak: 8.5, conifer: 11.5, pine: 11, shrub: 2 };

function variantFromTags(t, id) {
  const lt = t.leaf_type || '', g = (t.genus || t.species || t.taxon || '').toLowerCase();
  if (/needle/.test(lt) || /pinus|pine/.test(g)) return /pinus nigra|pinus pinaster|pine/.test(g) ? 'pine' : 'conifer';
  if (/picea|abies|cupressus|thuja|taxus|cedrus|larix/.test(g)) return 'conifer';
  if (/quercus ilex|holm/.test(g)) return 'holm_oak';
  return hash01(id) < 0.4 ? 'broadleaf_large' : 'broadleaf';
}

/**
 * @returns placements [{x,z,kind,scale,rot,source}]
 */
export function placeTrees(features, tile, ctx) {
  const out = [];
  const r = tile.rect, inRect = (x, z) => x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;
  for (const p of features.points) {
    if (p.kind !== 'tree' || !inRect(p.x, p.z)) continue;
    const kind = variantFromTags(p.tags, p.id);
    const hTag = parseFloat(p.tags.height);
    const scale = hTag > 0 ? Math.min(2.2, Math.max(0.4, hTag / NOMINAL_H[kind])) : 0.75 + hash01(p.id) * 0.5;
    out.push({ x: p.x, z: p.z, kind, scale, rot: hash01(p.id + 1) * 6.28, source: 'osm:tree' });
  }
  for (const l of features.lines) {
    if (l.kind !== 'tree_row') continue;
    let acc = 0;
    for (let i = 1; i < l.pts.length; i++) {
      const [x0, z0] = l.pts[i - 1], [x1, z1] = l.pts[i]; const L = Math.hypot(x1 - x0, z1 - z0);
      for (let s = (9 - acc % 9) % 9; s < L; s += 9) { const x = x0 + (x1 - x0) * s / L, z = z0 + (z1 - z0) * s / L; if (inRect(x, z)) out.push({ x, z, kind: 'broadleaf', scale: 0.8 + hash01(Math.floor(x * 10 + z)) * 0.4, rot: s, source: 'osm:tree_row' }); }
      acc += L;
    }
  }
  // LiDAR crowns over water (pier structure, boats, spray) are not trees: keep land points above high water.
  for (const t of ctx.lidarTrees || []) if (inRect(t.x, t.z) && (!ctx.isLand || ctx.isLand(t.x, t.z)) && (!ctx.hasTerrain || ctx.ground(t.x, t.z) > 2)) out.push({ x: t.x, z: t.z, kind: t.h > 13 ? 'broadleaf_large' : 'broadleaf', scale: Math.max(0.4, Math.min(2.2, t.h / 11)), rot: t.x, source: 'lidar' });

  // Procedural fill (flagged) for mapped vegetation areas lacking mapped trees.
  if (ctx.settings.proceduralTrees) {
    const rand = mulberry32(Math.floor(r.minX * 31 + r.minZ * 17));
    for (const a of features.areas) {
      const density = { wood: 1 / 45, scrub: 1 / 30, park: 1 / 700, cemetery: 1 / 500, residential: ctx.settings.gardenTrees ? 1 / 900 : 0, golf: 1 / 900 }[a.kind];
      if (!density) continue;
      const ring = clipRingToRect(a.outer, r); if (!ring) continue;
      const ar = area(ring);
      const mapped = out.filter((t) => t.source !== 'procedural' && pointInPolygon(t.x, t.z, ring)).length;
      if (a.kind !== 'residential' && mapped >= 3) continue;
      const n = Math.min(4000, Math.floor(ar * density));
      const bb = bounds(ring);
      let placed = 0, tries = 0;
      while (placed < n && tries++ < n * 6) {
        const x = bb.minX + rand() * (bb.maxX - bb.minX), z = bb.minZ + rand() * (bb.maxZ - bb.minZ);
        if (!pointInPolygon(x, z, ring, a.holes || [])) continue;
        if (!ctx.isClear(x, z, a.kind === 'scrub' ? 1 : 2.5)) continue;
        const kind = a.kind === 'scrub' ? 'shrub' : a.kind === 'wood' ? (rand() < 0.25 ? 'pine' : rand() < 0.6 ? 'broadleaf_large' : 'broadleaf') : rand() < 0.15 ? 'conifer' : rand() < 0.5 ? 'broadleaf' : 'broadleaf_large';
        out.push({ x, z, kind, scale: 0.6 + rand() * 0.6, rot: rand() * 6.28, source: 'procedural' });
        placed++;
      }
    }
  }
  return out;
}

export function buildTreeMeshes(placements, ground) {
  const byKind = new Map();
  for (const p of placements) { if (!byKind.has(p.kind)) byKind.set(p.kind, []); byKind.get(p.kind).push(p); }
  const meshes = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3(), col = new THREE.Color();
  for (const [kind, list] of byKind) {
    const geo = treeGeometry(kind);
    const parts = [[geo.leaves, leafMaterial(geo.needle)], ...(geo.trunk ? [[geo.trunk, material()]] : [])];
    for (const [g, mat] of parts) {
      const im = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((p, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
        const sc = p.scale; s.set(sc * (0.9 + (p.rot % 0.2)), sc, sc * (0.9 + (p.rot % 0.17)));
        t.set(p.x, ground(p.x, p.z) - 0.1, p.z);
        m4.compose(t, q, s); im.setMatrixAt(i, m4);
        const v = 0.82 + ((p.rot * 7.3) % 0.3); col.setRGB(v * (0.96 + (p.rot % 0.08)), v, v * (0.9 + (p.rot % 0.1))); im.setColorAt(i, col);
      });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.renderOrder = 10;
      meshes.push(im);
    }
  }
  return meshes;
}
