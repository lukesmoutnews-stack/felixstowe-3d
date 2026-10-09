#!/usr/bin/env node
// Environment Agency LiDAR -> game terrain, building heights, tree positions and an
// OSM/LiDAR alignment check.
//
//   node tools/lidar.mjs --dtm=downloads/TM33*.zip [--dsm=downloads/DSM*.zip] [--cell=2]
//
// Inputs: EA National LiDAR Programme (or LIDAR Composite) DTM tiles, and optionally the
// matching DSM tiles: GeoTIFF (.tif) or ESRI ASCII (.asc), loose or inside the .zip files
// the EA portal provides. Coordinates: OSGB36 / British National Grid (EPSG:27700),
// heights in metres above Ordnance Datum Newlyn.
// Outputs (data/terrain/): terrain.json + terrain.bin (Int16 centimetres), and with a DSM:
// building-heights.json (per OSM building id), trees.json, alignment report.
// Licence: Open Government Licence v3 – "© Environment Agency copyright and/or database right".

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { readGeoTIFF, readAsc } from './lib/geotiff.mjs';
import { zipEntries } from './lib/zip.mjs';
import { CONFIG, tileRect, tileAt } from '../src/config.js';
import { landPolygons } from '../src/geo/coast.js';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { pointInPolygon, bounds, distToSegment, insetRing, orientedBox } from '../src/geo/polygon.js';
import { SpatialGrid } from '../src/geo/spatial.js';

const args = {};
for (const a of process.argv.slice(2)) { const [k, v] = a.replace(/^--/, '').split('='); (args[k] ||= []).push(v ?? true); }
const one = (k, d) => (args[k] ? args[k][args[k].length - 1] : d);
const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(root, one('out', 'data/terrain'));
const cell = Number(one('cell', 2));

// ---------- inputs ----------
async function expand(patterns) {
  const files = [];
  for (const p of (patterns || []).flatMap((x) => String(x).split(','))) {
    if (p.includes('*')) {
      const dir = dirname(p), re = new RegExp('^' + basename(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
      for (const f of await readdir(dir)) if (re.test(f)) files.push(join(dir, f));
    } else files.push(p);
  }
  return files;
}
/** Crop a raster to an OSGB box (keeps memory bounded when 5 km tiles overhang the town). */
function crop(r, box) {
  if (!box) return r;
  const c0 = Math.max(0, Math.floor((box.E0 - r.x0) / r.cellX)), c1 = Math.min(r.width, Math.ceil((box.E1 - r.x0) / r.cellX));
  const r0 = Math.max(0, Math.floor((r.y0 - box.N1) / r.cellY)), r1 = Math.min(r.height, Math.ceil((r.y0 - box.N0) / r.cellY));
  if (c1 <= c0 || r1 <= r0) return null;
  if (c0 === 0 && r0 === 0 && c1 === r.width && r1 === r.height) return r;
  const w = c1 - c0, h = r1 - r0, data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) data.set(r.data.subarray((r0 + y) * r.width + c0, (r0 + y) * r.width + c1), y * w);
  return { ...r, width: w, height: h, data, x0: r.x0 + c0 * r.cellX, y0: r.y0 - r0 * r.cellY };
}
async function loadRasters(paths, box = null) {
  const rasters = [];
  for (const p of paths) {
    const buf = await readFile(p);
    const take = (name, data) => {
      let r = null;
      if (/\.tiff?$/i.test(name)) r = { name, ...readGeoTIFF(data) };
      else if (/\.asc$/i.test(name)) r = { name, ...readAsc(data.toString('utf8')) };
      if (r) { r = crop(r, box); if (r) rasters.push(r); else console.log(`  ${name}: outside the area, skipped`); }
    };
    if (/\.zip$/i.test(p)) { for (const e of zipEntries(buf)) take(e.name, e.read()); } else take(basename(p), buf);
  }
  for (const r of rasters) console.log(`  ${r.name}: ${r.width}x${r.height} @ ${r.cellX} m, E ${r.x0}–${r.x0 + r.width * r.cellX}, N ${r.y0 - r.height * r.cellY}–${r.y0}`);
  return rasters;
}
function sampler(rasters) {
  return (E, N) => {
    for (const r of rasters) {
      const fx = (E - r.x0) / r.cellX - 0.5, fy = (r.y0 - N) / r.cellY - 0.5;
      if (fx < 0 || fy < 0 || fx > r.width - 1 || fy > r.height - 1) continue;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const g = (x, y) => { const v = r.data[Math.min(r.height - 1, y) * r.width + Math.min(r.width - 1, x)]; return v === r.nodata || v < -1000 ? NaN : v; };
      const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
      if ([a, b, c, d].some(Number.isNaN)) { const v = g(Math.round(fx), Math.round(fy)); if (!Number.isNaN(v)) return v; continue; }
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }
    return NaN;
  };
}

// ---------- OSM context ----------
async function loadOsm(frame) {
  const feats = { buildings: [], roads: [], coast: [], yards: [], intertidal: [] };
  const isTidal = (a) => ['beach', 'shingle', 'mud'].includes(a.kind) || (a.kind === 'wetland' && /tidal/.test(a.tags.wetland || ''));
  const isYard = (a) => a.kind === 'port' || (a.kind === 'industrial' && /port|container|logistic/i.test((a.tags.industrial || '') + (a.tags.name || '')));
  if (args.fixture) {
    const j = JSON.parse(await readFile(join(root, 'test/fixtures', one('fixture') + '.json'), 'utf8'));
    const f = buildFeatures(parseOverpass(j, frame)); feats.buildings = f.buildings; feats.roads = f.roads; feats.coast = f.coastLines; feats.yards = f.areas.filter(isYard); feats.intertidal = f.areas.filter(isTidal); feats.tiles = ['fixture'];
    return feats;
  }
  let manifest = { tiles: [] };
  try { manifest = JSON.parse(await readFile(join(root, 'data/manifest.json'), 'utf8')); } catch { /* none */ }
  const seen = new Set();
  for (const key of manifest.tiles || []) {
    const j = JSON.parse(await readFile(join(root, 'data/tiles', key + '.json'), 'utf8'));
    const f = buildFeatures(parseOverpass(j, frame));
    for (const b of f.buildings) if (!seen.has('b' + b.id)) { seen.add('b' + b.id); feats.buildings.push(b); }
    for (const r of f.roads) if (!seen.has('r' + r.id)) { seen.add('r' + r.id); feats.roads.push(r); }
    for (const a of f.areas) { if (isYard(a) && !seen.has('a' + a.id)) { seen.add('a' + a.id); feats.yards.push(a); } if (isTidal(a) && !seen.has('t' + a.id)) { seen.add('t' + a.id); feats.intertidal.push(a); } }
    for (const c of f.coastLines) { const k = 'c' + c[0].join(',') + c.length; if (!seen.has(k)) { seen.add(k); feats.coast.push(c); } }
  }
  feats.tiles = manifest.tiles || [];
  return feats;
}

// ---------- main ----------
const dtmFiles = await expand(args.dtm), dsmFiles = await expand(args.dsm);
if (!dtmFiles.length) { console.error('Usage: node tools/lidar.mjs --dtm=<files or zips> [--dsm=<files>] [--cell=2]'); process.exit(2); }
let origin = CONFIG.origin;
if (args.fixture) origin = JSON.parse(await readFile(join(root, 'test/fixtures', one('fixture') + '.json'), 'utf8')).fixtureMeta.origin;
const frame = new LocalFrame(origin.lat, origin.lon);
// Crop box: the configured town extent (or fixture area) in OSGB, with 200 m margin.
let cropBox = null;
if (!args.fixture && !args['no-crop']) {
  const ex = CONFIG.extent; const cs = [[ex.s, ex.w], [ex.s, ex.e], [ex.n, ex.w], [ex.n, ex.e]].map(([la, lo]) => { const w = frame.toWorld(la, lo); return frame.toOSGB(w.x, w.z); });
  cropBox = { E0: Math.min(...cs.map((c) => c.E)) - 200, E1: Math.max(...cs.map((c) => c.E)) + 200, N0: Math.min(...cs.map((c) => c.N)) - 200, N1: Math.max(...cs.map((c) => c.N)) + 200 };
}
console.log('Reading DTM…'); const dtmR = await loadRasters(dtmFiles, cropBox); const dtm = sampler(dtmR);
let dsm = null; if (dsmFiles.length) { console.log('Reading DSM…'); dsm = sampler(await loadRasters(dsmFiles, cropBox)); }
const osm = await loadOsm(frame);
console.log(`OSM context: ${osm.buildings.length} buildings, ${osm.roads.length} roads from ${osm.tiles.length} tile(s).`);

// Target area: OSM tiles if present, else DTM extent.
let area;
if (osm.buildings.length) {
  const bb = bounds(osm.buildings.flatMap((b) => b.outer).concat(osm.roads.flatMap((r) => r.pts)));
  area = { minX: bb.minX - 100, maxX: bb.maxX + 100, minZ: bb.minZ - 100, maxZ: bb.maxZ + 100 };
} else {
  const r = dtmR[0]; const a = frame.fromOSGB(r.x0, r.y0), b = frame.fromOSGB(r.x0 + r.width * r.cellX, r.y0 - r.height * r.cellY);
  area = { minX: a.x, maxX: b.x, minZ: a.z, maxZ: b.z };
}

// ---------- 1. alignment check (needs DSM + buildings) ----------
let shift = { ...frame.osgbShift }, alignment = null;
if (dsm && osm.buildings.length && !args['no-align']) {
  console.log('Checking OSM ↔ LiDAR alignment (building footprints vs. DSM-DTM)…');
  const sample = osm.buildings.filter((b) => b.area > 40 && b.area < 2000).slice(0, 1500);
  const pts = []; // (x, z, inside?) sample points around/in footprints
  for (const b of sample) {
    const bb = bounds(b.outer);
    for (let x = bb.minX - 3; x <= bb.maxX + 3; x += 1) for (let z = bb.minZ - 3; z <= bb.maxZ + 3; z += 1) pts.push([x, z, pointInPolygon(x, z, b.outer, b.holes) ? 1 : 0]);
  }
  const score = (dx, dz) => {
    let tp = 0, nIn = 0, fp = 0, nOut = 0;
    for (const [x, z, inside] of pts) {
      const o = frame.toOSGB(x, z); const e = o.E + dx, n = o.N + dz;
      const h = dsm(e, n) - dtm(e, n); if (Number.isNaN(h)) continue;
      const high = h > 2.2 ? 1 : 0;
      if (inside) { nIn++; tp += high; } else { nOut++; fp += high; }
    }
    return nIn && nOut ? tp / nIn - fp / nOut : -1;
  };
  const base = score(0, 0); let best = { dx: 0, dz: 0, s: base };
  for (let step of [2, 0.5, 0.25]) {
    const c = { ...best };
    const R = step === 2 ? 10 : step * 3;
    for (let dx = c.dx - R; dx <= c.dx + R; dx += step)
      for (let dz = c.dz - R; dz <= c.dz + R; dz += step) { const s = score(dx, dz); if (s > best.s) best = { dx, dz, s }; }
  }
  alignment = { samplePoints: pts.length, scoreAtHelmert: +base.toFixed(3), bestOffsetE: best.dx, bestOffsetN: best.dz, bestScore: +best.s.toFixed(3) };
  console.log(`  separation score ${base.toFixed(3)} at Helmert estimate; best ${best.s.toFixed(3)} with offset E${best.dx >= 0 ? '+' : ''}${best.dx} m, N${best.dz >= 0 ? '+' : ''}${best.dz} m`);
  if (best.s > base + 0.02) { shift = { se: shift.se + best.dx, sn: shift.sn + best.dz, source: 'lidar-calibrated' }; frame.osgbShift = shift; console.log('  applied calibrated OSGB shift'); }
  else console.log('  Helmert estimate kept (no significant improvement)');
}

// ---------- 2. terrain grid ----------
const c0 = frame.toOSGB(area.minX, area.minZ), c1 = frame.toOSGB(area.maxX, area.maxZ);
const E0 = Math.floor(Math.min(c0.E, c1.E) / cell) * cell, E1 = Math.ceil(Math.max(c0.E, c1.E) / cell) * cell;
const N1 = Math.ceil(Math.max(c0.N, c1.N) / cell) * cell, Nmin = Math.floor(Math.min(c0.N, c1.N) / cell) * cell;
const cols = Math.round((E1 - E0) / cell) + 1, rows = Math.round((N1 - Nmin) / cell) + 1;
console.log(`Terrain grid ${cols} x ${rows} at ${cell} m…`);
const H = new Float32Array(cols * rows); let valid = 0;
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const v = dtm(E0 + x * cell, N1 - y * cell); H[y * cols + x] = v; if (!Number.isNaN(v)) valid++; }
// Gaps: LiDAR has no returns over water. Cells on land (OSM coastline) are filled from their
// neighbours so there are no pits or walls; cells at sea get a sea-bed level below the water.
const seaBed = Number(one('seabed', -2));
// Land/sea mask in world coordinates (2 m): 1 = land behind the OSM coastline (mean high water),
// 2 = mapped intertidal ground (beach, shingle, mud, sand), 0 = sea. LiDAR also records the water
// surface near the shore, which would otherwise appear as flat ground above the sea.
const MR = 2, mx0 = area.minX - 50, mz0 = area.minZ - 50, MW = Math.ceil((area.maxX - mx0 + 50) / MR), MH = Math.ceil((area.maxZ - mz0 + 50) / MR);
const mask = new Uint8Array(MW * MH);
function fill(rings, v) {
  for (let j = 0; j < MH; j++) {
    const z = mz0 + (j + 0.5) * MR, xs = [];
    for (const ring of rings) for (let k = 0; k < ring.length; k++) {
      const a = ring[k], b = ring[(k + 1) % ring.length];
      if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - mx0) / MR - 0.5)), i1 = Math.min(MW - 1, Math.floor((xs[k + 1] - mx0) / MR - 0.5));
      for (let ii = i0; ii <= i1; ii++) if (mask[j * MW + ii] < v) mask[j * MW + ii] = v;
    }
  }
}
const haveCoast = osm.coast.length > 0;
if (haveCoast) {
  const [ti0, tj0] = tileAt(area.minX, area.minZ), [ti1, tj1] = tileAt(area.maxX, area.maxZ);
  for (let tj = tj0; tj <= tj1; tj++) for (let ti = ti0; ti <= ti1; ti++) {
    const r = tileRect(ti, tj), inR = (px, pz) => px >= r.minX && px < r.maxX && pz >= r.minZ && pz < r.maxZ;
    const hint = osm.buildings.some((b) => inR(b.cx, b.cz)) || osm.roads.some((rd) => rd.pts.some((p) => inR(p[0], p[1])));
    for (const l of landPolygons(osm.coast, r, hint).land) fill([l.outer, ...l.holes], 1);
  }
  for (const a of osm.intertidal) fill([a.outer, ...(a.holes || [])], 2);
} else mask.fill(1);
const maskAt = (x, z) => { const i = Math.floor((x - mx0) / MR), j = Math.floor((z - mz0) / MR); return i < 0 || j < 0 || i >= MW || j >= MH ? 0 : mask[j * MW + i]; };
let filledLand = 0, filledSea = 0, waterSurface = 0;
const gaps = [];
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  const idx = y * cols + x, w = frame.fromOSGB(E0 + x * cell, N1 - y * cell), m = maskAt(w.x, w.z);
  if (m === 0) { if (!Number.isNaN(H[idx])) waterSurface++; H[idx] = seaBed; filledSea++; continue; }
  if (Number.isNaN(H[idx])) { if (m === 1) gaps.push(idx); else { H[idx] = seaBed; filledSea++; } }
}
for (let pass = 0; pass < 400 && gaps.length; pass++) { // diffuse inwards from valid neighbours
  const still = [];
  for (const idx of gaps) {
    const x = idx % cols, y = (idx / cols) | 0; let sum = 0, n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue; const v = H[yy * cols + xx]; if (!Number.isNaN(v)) { sum += v; n++; } }
    if (n) { H[idx] = sum / n; filledLand++; } else still.push(idx);
  }
  gaps.length = 0; gaps.push(...still);
}
for (const idx of gaps) { H[idx] = 0; filledLand++; }
let minH = Infinity, maxH = -Infinity; for (const v of H) { if (v < minH) minH = v; if (v > maxH) maxH = v; }
await mkdir(outDir, { recursive: true });
const meta = { source: one('source', 'Environment Agency LiDAR DTM'), files: dtmFiles.map((f) => basename(f)), created: new Date().toISOString(), licence: 'Open Government Licence v3.0', attribution: '© Environment Agency copyright and/or database right. All rights reserved.', validCells: valid, filledLandCells: filledLand, seaCells: filledSea, waterSurfaceCellsRemoved: waterSurface, minHeight: +minH.toFixed(2), maxHeight: +maxH.toFixed(2), alignment };
const header = { cell, scale: 0.01, nodata: -32768, seaLevel: Number(one('sea', 0.3)), osgbShift: shift, meta };
if (args.single) { // one file (small areas and tests)
  const I = Int16Array.from(H, (v) => Math.round(v * 100));
  await writeFile(join(outDir, 'terrain.bin'), Buffer.from(I.buffer));
  await writeFile(join(outDir, 'terrain.json'), JSON.stringify({ ...header, E0, N0: N1, cols, rows }, null, 2));
} else { // 1 km chunks aligned to the National Grid, streamed by the game with the map tiles
  const CH = 1000, n = CH / cell + 1, chunks = [];
  await mkdir(join(outDir, 'chunks'), { recursive: true });
  for (let cN = Math.floor(Nmin / CH) * CH; cN < N1; cN += CH) for (let cE = Math.floor(E0 / CH) * CH; cE < E1; cE += CH) {
    const I = new Int16Array(n * n); let any = false;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gx = Math.round((cE + x * cell - E0) / cell), gy = Math.round((N1 - (cN + CH - y * cell)) / cell);
      if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) { I[y * n + x] = -32768; continue; }
      I[y * n + x] = Math.round(H[gy * cols + gx] * 100); any = true;
    }
    if (!any) continue;
    await writeFile(join(outDir, 'chunks', `${cE}_${cN}.bin`), Buffer.from(I.buffer)); chunks.push(`${cE}_${cN}`);
  }
  await writeFile(join(outDir, 'terrain.json'), JSON.stringify({ ...header, chunk: CH, samples: n, chunks }, null, 2));
  console.log(`  wrote ${chunks.length} terrain chunks of ${CH} m`);
}
console.log(`  heights ${minH.toFixed(1)} – ${maxH.toFixed(1)} m ODN; ${valid} LiDAR cells, ${filledLand} land gaps filled, ${filledSea} sea cells (${waterSurface} LiDAR water-surface returns removed)`);

// ---------- 3. building heights + 4. trees (need DSM) ----------
const outputs = { terrain: 'data/terrain/terrain.json' };
if (dsm) {
  const nd = (x, z) => { const o = frame.toOSGB(x, z); return dsm(o.E, o.N) - dtm(o.E, o.N); };
  const bh = {}; let nb = 0;
  for (const b of osm.buildings) {
    const ring = insetRing(b.outer, 0.75) || b.outer; const bb = bounds(ring); const v = [];
    for (let x = bb.minX; x <= bb.maxX; x += 1) for (let z = bb.minZ; z <= bb.maxZ; z += 1) if (pointInPolygon(x, z, ring)) { const h = nd(x, z); if (!Number.isNaN(h)) v.push(h); }
    if (v.length < 4) continue;
    v.sort((a, c) => a - c); const p = (q) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
    if (p(0.9) < 1.5) continue;
    bh[b.id] = [+p(0.5).toFixed(2), +p(0.9).toFixed(2)]; nb++;
  }
  await writeFile(join(outDir, 'building-heights.json'), JSON.stringify({ note: 'OSM building id -> [median, 90th percentile] height above ground (m) from EA DSM - DTM', heights: bh }));
  console.log(`Building heights measured for ${nb} of ${osm.buildings.length} buildings.`);
  outputs.buildingHeights = 'data/terrain/building-heights.json';
  // trees: local maxima of the canopy height outside buildings and roads
  const trees = []; const taken = new Set();
  const bGrid = new SpatialGrid(25); for (const b of osm.buildings) { const bb = bounds(b.outer); bGrid.insert(bb.minX - 2, bb.minZ - 2, bb.maxX + 2, bb.maxZ + 2, b); }
  const inBuilding = (x, z) => { for (const b of bGrid.query(x, z, x, z)) if ([[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].some(([dx, dz]) => pointInPolygon(x + dx, z + dz, b.outer))) return true; return false; };
  const crown = (x, z, h) => { let k = 0; for (let a = 0; a < 8; a++) if (nd(x + Math.cos(a * 0.785) * 1.5, z + Math.sin(a * 0.785) * 1.5) > Math.max(2, h * 0.5)) k++; return k >= 5; };
  const rGrid = new SpatialGrid(25); for (const r of osm.roads) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], c = r.pts[i], m = r.width / 2 + 1; rGrid.insert(Math.min(a[0], c[0]) - m, Math.min(a[1], c[1]) - m, Math.max(a[0], c[0]) + m, Math.max(a[1], c[1]) + m, { a, c, r }); }
  const onRoad = (x, z) => { for (const sgm of rGrid.query(x, z, x, z)) if (distToSegment(x, z, sgm.a[0], sgm.a[1], sgm.c[0], sgm.c[1]).d < sgm.r.width / 2 + 0.5) return true; return false; };
  for (let x = area.minX; x < area.maxX; x += 2) for (let z = area.minZ; z < area.maxZ; z += 2) {
    const h = nd(x, z); if (!(h > 3 && h < 35)) continue;
    let isMax = true; for (let dx = -3; dx <= 3 && isMax; dx += 1.5) for (let dz = -3; dz <= 3; dz += 1.5) if ((dx || dz) && nd(x + dx, z + dz) > h) { isMax = false; break; }
    if (!isMax) continue;
    const k = Math.round(x / 4) + ',' + Math.round(z / 4); if (taken.has(k)) continue;
    if (!crown(x, z, h) || inBuilding(x, z) || onRoad(x, z) || osm.yards.some((a) => pointInPolygon(x, z, a.outer))) continue;
    taken.add(k); const o = frame.toOSGB(x, z); trees.push([+o.E.toFixed(1), +o.N.toFixed(1), +h.toFixed(1)]);
  }
  await writeFile(join(outDir, 'trees.json'), JSON.stringify({ note: 'Tree tops detected from EA DSM - DTM (OSGB E, N, height m). Detection is approximate.', trees }));
  console.log(`Detected ${trees.length} probable trees.`);
  outputs.trees = 'data/terrain/trees.json';
  // Container stacks: measured above-ground height inside mapped port/container yards (outside
  // buildings and roads), sampled on a grid aligned with each yard, quantised to container tiers
  // (2.59 m), de-noised (isolated returns such as straddle carriers and masts are dropped) and merged
  // into rows. The shape is measured; container colours in the game are illustrative.
  if (osm.yards.length) {
    const ACROSS = 2.5, ALONG = 3.05, TIER = 2.59, runs = []; let cells = 0;
    const nd = (x, z) => { const o = frame.toOSGB(x, z); return dsm(o.E, o.N) - dtm(o.E, o.N); };
    for (const a of osm.yards) {
      const obb = orientedBox(a.outer); if (!obb) continue;
      let best = null;
      for (const [ux, uz] of [[obb.ux, obb.uz], [-obb.uz, obb.ux]]) {
        const vx = -uz, vz = ux, half = Math.max(obb.length, obb.width) / 2 + 5;
        const nU = Math.ceil((2 * half) / ALONG), nV = Math.ceil((2 * half) / ACROSS);
        const T = new Uint8Array(nU * nV);
        for (let iv = 0; iv < nV; iv++) for (let iu = 0; iu < nU; iu++) {
          const su = -half + (iu + 0.5) * ALONG, sv = -half + (iv + 0.5) * ACROSS;
          const x = obb.cx + ux * su + vx * sv, z = obb.cz + uz * su + vz * sv;
          if (!pointInPolygon(x, z, a.outer, a.holes) || inBuilding(x, z) || onRoad(x, z)) continue;
          const h = nd(x, z); if (h > 2.0 && h < 15) T[iv * nU + iu] = Math.min(5, Math.max(1, Math.round(h / TIER)));
        }
        const C = new Uint8Array(T.length); // de-noise: keep cells with at least 4 stacked neighbours in 3x3
        for (let iv = 0; iv < nV; iv++) for (let iu = 0; iu < nU; iu++) {
          if (!T[iv * nU + iu]) continue; let n = 0;
          for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const a2 = iv + dv, b2 = iu + du; if (a2 >= 0 && b2 >= 0 && a2 < nV && b2 < nU && T[a2 * nU + b2]) n++; }
          if (n >= 5) C[iv * nU + iu] = T[iv * nU + iu];
        }
        const rr = []; let n = 0;
        for (let iv = 0; iv < nV; iv++) { let start = -1;
          for (let iu = 0; iu <= nU; iu++) {
            const t = iu < nU ? C[iv * nU + iu] : 0, prev = start >= 0 ? C[iv * nU + start] : 0;
            if (start >= 0 && t !== prev) { const len = (iu - start) * ALONG, su = -half + start * ALONG + len / 2, sv = -half + (iv + 0.5) * ACROSS; rr.push([+(obb.cx + ux * su + vx * sv).toFixed(2), +(obb.cz + uz * su + vz * sv).toFixed(2), +len.toFixed(2), +(prev * TIER).toFixed(2), +Math.atan2(ux, uz).toFixed(4)]); n += iu - start; start = -1; }
            if (t && start < 0) start = iu;
          }
        }
        const score = rr.length ? n / rr.length : 0; // longer rows = better alignment with the stacks
        if (!best || score > best.score) best = { score, rr, n };
      }
      if (best) { runs.push(...best.rr); cells += best.n; }
    }
    await writeFile(join(outDir, 'yard.json'), JSON.stringify({ version: 2, note: 'Container stack rows from EA DSM - DTM inside mapped port/container yards: [world x, world z (centre), length m, height m, heading rad]. Colours in the game are illustrative.', runs }));
    console.log(`Container yards: ${cells} stacked cells in ${runs.length} rows.`);
    outputs.yard = 'data/terrain/yard.json';
  }
}

// ---------- manifest ----------
if (!args.out) {
  const mf = join(root, 'data/manifest.json'); let m = { tiles: [] };
  try { m = JSON.parse(await readFile(mf, 'utf8')); } catch { /* new */ }
  m.terrain = { ...outputs, created: meta.created, licence: meta.licence, attribution: meta.attribution, osgbShift: shift };
  await writeFile(mf, JSON.stringify(m, null, 2));
}
console.log('Done.');
