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
function treeGeometry(kind) {
  if (variants.has(kind)) return variants.get(kind);
  const rand = mulberry32(kind.length * 17);
  const parts = [];
  const bark = [0.32, 0.25, 0.19];
  if (kind === 'conifer') {
    parts.push(colorize(new THREE.CylinderGeometry(0.18, 0.32, 9, 6).translate(0, 4.5, 0), bark));
    for (const [y, r, h] of [[5.5, 2.4, 4.5], [7.8, 1.9, 4], [9.8, 1.3, 3.2]]) parts.push(colorize(new THREE.ConeGeometry(r, h, 8).translate(0, y, 0), [0.17, 0.3, 0.18]));
  } else if (kind === 'pine') { // umbrella-crowned coastal pine
    parts.push(colorize(new THREE.CylinderGeometry(0.16, 0.3, 9, 6).translate(0, 4.5, 0), [0.38, 0.27, 0.2]));
    for (let i = 0; i < 5; i++) parts.push(colorize(blob(1.6 + rand(), 1, rand, 0.4).scale(1.3, 0.55, 1.3).translate((rand() - 0.5) * 2.4, 9 + rand() * 1.2, (rand() - 0.5) * 2.4), [0.2, 0.32, 0.19]));
  } else if (kind === 'shrub') {
    for (let i = 0; i < 4; i++) parts.push(colorize(blob(0.8 + rand() * 0.4, 1, rand, 0.4).translate((rand() - 0.5) * 1.2, 0.7 + rand() * 0.4, (rand() - 0.5) * 1.2), [0.3, 0.4, 0.2]));
  } else { // broadleaf
    const big = kind === 'broadleaf_large';
    const th = big ? 4 : 3;
    parts.push(colorize(new THREE.CylinderGeometry(big ? 0.25 : 0.16, big ? 0.42 : 0.26, th + 1.5, 7).translate(0, (th + 1.5) / 2, 0), bark));
    const n = big ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const r = (big ? 2.4 : 1.7) + rand() * 0.8, a = (i / n) * Math.PI * 2;
      const d = i === 0 ? 0 : (big ? 1.9 : 1.2);
      parts.push(colorize(blob(r, 1, rand).translate(Math.cos(a) * d, th + (big ? 3 : 2.2) + (rand() - 0.3) * 1.5, Math.sin(a) * d), kind === 'holm_oak' ? [0.17, 0.27, 0.15] : [0.26, 0.4, 0.17]));
    }
  }
  const g = mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p.index ? p.toNonIndexed() : p; }));
  g.computeBoundingSphere();
  variants.set(kind, g); return g;
}
let treeMat;
function material() {
  if (!treeMat) treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: false });
  return treeMat;
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
  for (const t of ctx.lidarTrees || []) if (inRect(t.x, t.z)) out.push({ x: t.x, z: t.z, kind: t.h > 13 ? 'broadleaf_large' : 'broadleaf', scale: Math.max(0.4, Math.min(2.2, t.h / 11)), rot: t.x, source: 'lidar' });

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
    const im = new THREE.InstancedMesh(treeGeometry(kind), material(), list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      const sc = p.scale; s.set(sc * (0.9 + (p.rot % 0.2)), sc, sc * (0.9 + (p.rot % 0.17)));
      t.set(p.x, ground(p.x, p.z) - 0.1, p.z);
      m4.compose(t, q, s); im.setMatrixAt(i, m4);
      const v = 0.85 + ((p.rot * 7.3) % 0.3); col.setRGB(v, v * (0.97 + (p.rot % 0.06)), v * 0.95); im.setColorAt(i, col);
    });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.renderOrder = 10;
    meshes.push(im);
  }
  return meshes;
}
