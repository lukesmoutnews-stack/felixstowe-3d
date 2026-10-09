#!/usr/bin/env node
// Add Overture Maps buildings that OpenStreetMap does not already have.
//
//   pip install overturemaps
//   overturemaps download --bbox=1.27,51.93,1.40,52.00 -f geojson --type=building -o overture-buildings.geojson
//   node tools/merge-overture.mjs --in=overture-buildings.geojson
//
// Duplicate rule (docs/data-sources.md): skip any Overture building whose sources include
// OpenStreetMap, and any whose footprint overlaps OSM buildings by more than 20% of its area.
// Output: data/overture/<tile>.json for the game, listed in data/manifest.json.
// Licence: Overture buildings are ODbL ("© OpenStreetMap contributors, Overture Maps Foundation").

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CONFIG, tileAt, tileKey } from '../src/config.js';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { pointInRing, bounds, area, centroid } from '../src/geo/polygon.js';
import { SpatialGrid } from '../src/geo/spatial.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.length ? v.join('=') : true]));
if (!args.in) { console.error('Usage: node tools/merge-overture.mjs --in=<overture buildings .geojson or .geojsonseq> [--data=data]'); process.exit(2); }
const root = resolve(new URL('..', import.meta.url).pathname);
const dataDir = resolve(root, args.data || 'data');
const manifest = JSON.parse(await readFile(join(dataDir, 'manifest.json'), 'utf8'));
const origin = manifest.origin || CONFIG.origin;
const frame = new LocalFrame(origin.lat, origin.lon);

// OSM footprints
const grid = new SpatialGrid(30); const seen = new Set(); let nOsm = 0;
for (const key of manifest.tiles || []) {
  const f = buildFeatures(parseOverpass(JSON.parse(await readFile(join(dataDir, 'tiles', key + '.json'), 'utf8')), frame));
  for (const b of f.buildings) { const k = b.osmType + b.id; if (seen.has(k)) continue; seen.add(k); const bb = bounds(b.outer); grid.insert(bb.minX, bb.minZ, bb.maxX, bb.maxZ, b); nOsm++; }
}
// Overture features (FeatureCollection or newline-delimited)
const text = await readFile(args.in, 'utf8');
let feats;
try { const j = JSON.parse(text); feats = j.features || [j]; } catch { feats = text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)); }
const stats = { input: feats.length, fromOsm: 0, overlapping: 0, kept: 0, invalid: 0 };
const byTile = new Map();
for (const f of feats) {
  const p = f.properties || {};
  const srcs = typeof p.sources === 'string' ? JSON.parse(p.sources) : p.sources || [];
  if (srcs.some((s) => /openstreetmap/i.test(s.dataset || ''))) { stats.fromOsm++; continue; }
  const polys = f.geometry?.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry?.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  for (const poly of polys) {
    const outer = poly[0].map(([lon, lat]) => { const w = frame.toWorld(lat, lon); return [w.x, w.z]; });
    if (outer.length < 4 || area(outer) < 4) { stats.invalid++; continue; }
    // overlap fraction by sampling a 1 m lattice inside the footprint
    const bb = bounds(outer); let inside = 0, covered = 0;
    const near = [...grid.query(bb.minX, bb.minZ, bb.maxX, bb.maxZ)];
    for (let x = bb.minX + 0.5; x < bb.maxX; x += 1) for (let z = bb.minZ + 0.5; z < bb.maxZ; z += 1) {
      if (!pointInRing(x, z, outer)) continue; inside++;
      if (near.some((b) => pointInRing(x, z, b.outer))) covered++;
    }
    if (!inside || covered / inside > 0.2) { stats.overlapping++; continue; }
    const [cx, cz] = centroid(outer); const key = tileKey(...tileAt(cx, cz));
    if (!byTile.has(key)) byTile.set(key, []);
    byTile.get(key).push({ id: p.id, outer: poly[0].map(([lon, lat]) => [+lat.toFixed(7), +lon.toFixed(7)]), height: p.height ?? null, num_floors: p.num_floors ?? null, roof_shape: p.roof_shape ?? null, class: p.class || p.subtype || null, sources: srcs.map((s) => s.dataset).filter(Boolean) });
    stats.kept++;
  }
}
await mkdir(join(dataDir, 'overture'), { recursive: true });
for (const [key, list] of byTile) await writeFile(join(dataDir, 'overture', key + '.json'), JSON.stringify({ licence: 'ODbL – © OpenStreetMap contributors, Overture Maps Foundation', buildings: list }));
manifest.overture = { tiles: [...byTile.keys()].sort(), source: args.in, merged: new Date().toISOString(), rule: 'skip if sources include OpenStreetMap or >20% overlap with OSM buildings', stats };
await writeFile(join(dataDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`OSM buildings: ${nOsm}. Overture input ${stats.input}: ${stats.fromOsm} already from OSM, ${stats.overlapping} overlapping OSM, ${stats.invalid} invalid, ${stats.kept} added in ${byTile.size} tiles.`);
