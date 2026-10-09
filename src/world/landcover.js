// Ground, land-use/land-cover overlays, beaches, inland water and the sea.

import * as THREE from 'three';
import { LAYER, GROUND_TEX_SIZE, groundTexName, waterMaterial } from './materials.js';
import { triangulate, subdivide } from './accum.js';
import { clipRingToRect, area } from '../geo/polygon.js';

const AREA_LAYER = {
  residential: LAYER.landuse, commercial: LAYER.landuse, industrial: LAYER.landuse, port: LAYER.landuse, railway: LAYER.landuse,
  institution: LAYER.landuse, farmland: LAYER.landuse, brownfield: LAYER.landuse,
  grass: LAYER.landcover, park: LAYER.landcover, wood: LAYER.landcover, scrub: LAYER.landcover, beach: LAYER.landcover, shingle: LAYER.landcover,
  cemetery: LAYER.landcover, golf: LAYER.landcover, pitch: LAYER.landcover, wetland: LAYER.landcover, mud: LAYER.landcover, water: LAYER.landcover,
  paved: LAYER.paved, parking: LAYER.paved, playground: LAYER.paved, quay: LAYER.paved,
};

function polyToAcc(acc, outer, holes, ground, texSize, lift, hasTerrain) {
  let { verts, tris } = triangulate(outer, holes);
  if (!tris.length) return;
  ({ verts, tris } = subdivide(verts, tris, hasTerrain ? 6 : 150)); // also avoids huge triangles
  const V = verts.map(([x, z]) => [x, ground(x, z) + lift, z]);
  for (const [i, j, k] of tris) {
    const a = V[i], b = V[j], c = V[k];
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const uv = (p) => [p[0] / texSize, -p[2] / texSize];
    if (ny >= 0) acc.triFlat(a, b, c, uv(a), uv(b), uv(c)); else acc.triFlat(a, c, b, uv(a), uv(c), uv(b));
  }
}

/** Base ground for a tile. Flat mode: land polygons from the coastline. LiDAR mode: height grid. */
export function buildGround(tile, ctx) {
  const { acc, ground, terrain } = ctx;
  const r = tile.rect;
  const key = `ground:base:${LAYER.ground}`;
  const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
  if (terrain.hasTerrain) {
    // 250 m blocks (aligned to the culling chunks): a 5 m mesh for near views and a 25 m mesh
    // used beyond ~700 m (switched in App.cullChunks).
    const grid = (step, k) => {
      for (let bz = r.minZ; bz < r.maxZ - 0.01; bz += 250) for (let bx = r.minX; bx < r.maxX - 0.01; bx += 250) {
        const a = acc.get(bx + 1, bz + 1, k);
        const n = Math.round(250 / step) + 1, base = a.count;
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = bx + i * step, z = bz + j * step, y = ground(x, z);
          const hx = ground(x + 1, z) - ground(x - 1, z), hz = ground(x, z + 1) - ground(x, z - 1);
          const nn = new THREE.Vector3(-hx / 2, 1, -hz / 2).normalize();
          a.vert(x, y, z, nn.x, nn.y, nn.z, x / GROUND_TEX_SIZE.grass, -z / GROUND_TEX_SIZE.grass);
        }
        for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const p = base + j * n + i; a.tri(p, p + n, p + 1); a.tri(p + 1, p + n, p + n + 1); }
      }
    };
    grid(5, key); grid(25, 'lod:' + key);
  } else {
    for (const land of tile.land) {
      polyToAcc(acc.get(cx, cz, key), land.outer, land.holes, ground, GROUND_TEX_SIZE.grass, 0, false);
      // skirt along coast edges so the land edge does not look paper-thin above the sea
      const skirt = acc.get(cx, cz, `ground:sand:${LAYER.ground}`);
      const onRect = (p) => Math.abs(p[0] - r.minX) < 0.01 || Math.abs(p[0] - r.maxX) < 0.01 || Math.abs(p[1] - r.minZ) < 0.01 || Math.abs(p[1] - r.maxZ) < 0.01;
      const ring = land.outer;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        if (onRect(a) && onRect(b)) continue;
        skirt.quad([b[0], 0, b[1]], [a[0], 0, a[1]], [a[0], -2.5, a[1]], [b[0], -2.5, b[1]], [0, 0], [1, 0], [1, 1], [0, 1]);
      }
    }
  }
}

export function buildAreas(areas, tile, ctx) {
  const { acc, ground } = ctx;
  const stats = { drawn: 0 };
  // Draw large areas first within a layer (renderOrder ties are broken by material, so
  // keep one material per kind and layer).
  for (const a of areas) {
    if (a.kind === 'pier') continue;
    const layer = AREA_LAYER[a.kind]; if (layer == null) continue;
    const outer = clipRingToRect(a.outer, tile.rect); if (!outer || area(outer) < 1) continue;
    const holes = (a.holes || []).map((h) => clipRingToRect(h, tile.rect)).filter(Boolean);
    const [cx, cz] = outer[0];
    if (a.kind === 'water') { polyToAcc(acc.get(cx, cz, 'waterOverlay'), outer, holes, ground, 10, 0.03, ctx.hasTerrain); continue; }
    const tex = groundTexName(a.kind);
    polyToAcc(acc.get(cx, cz, `ground:${a.kind}:${layer}`), outer, holes, ground, GROUND_TEX_SIZE[tex] || 6, 0.03, ctx.hasTerrain);
    stats.drawn++;
  }
  return stats;
}

/** Global sea plane at sea level (one mesh for the whole world). */
export function makeSea(terrain) {
  // Moderately tessellated (no huge triangles: they clip badly on some GL implementations).
  const g = new THREE.PlaneGeometry(9000, 9000, 60, 60);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 90, uv.getY(i) * 90);
  const m = new THREE.Mesh(g, waterMaterial());
  m.position.y = terrain.hasTerrain ? terrain.seaLevel : -0.25;
  m.receiveShadow = true; m.renderOrder = 0; m.name = 'sea';
  return m;
}
