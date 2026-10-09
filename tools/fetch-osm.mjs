#!/usr/bin/env node
// Pre-download OpenStreetMap tiles for Felixstowe via the Overpass API.
//   node tools/fetch-osm.mjs                 # tiles within 1.5 km of the seafront start point
//   node tools/fetch-osm.mjs --all           # every tile in CONFIG.extent (whole town + port)
//   node tools/fetch-osm.mjs --tiles=0_0,1_0 # specific tiles
//   node tools/fetch-osm.mjs --radius=2500 --force --endpoint=https://overpass-api.de/api/interpreter
// Writes data/tiles/<i>_<j>.json and updates data/manifest.json. Requests are sequential with
// a pause between them, identify the project, and back off on 429/504 (Overpass usage policy).
// Data © OpenStreetMap contributors, ODbL 1.0 – keep the attribution visible in the app.

import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CONFIG, tileBBox, tileRect, tilesInExtent, overpassQuery, tileKey } from '../src/config.js';
import { LocalFrame } from '../src/geo/projection.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const root = new URL('..', import.meta.url);
const dataRoot = new URL((args.out || 'data').replace(/\/?$/, '/'), root);
const tilesDir = new URL('tiles/', dataRoot), manifestUrl = new URL('manifest.json', dataRoot);
const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon);
const endpoints = args.endpoint ? [args.endpoint] : CONFIG.overpass.endpoints;
const UA = 'felixstowe-3d/0.1 (open-data 3D town prototype; one-off tile download)';

let tiles;
if (args.tiles) tiles = String(args.tiles).split(',').map((k) => k.split('_').map(Number));
else if (args.all) tiles = tilesInExtent(frame);
else {
  const sp = frame.toWorld(CONFIG.spawn.lat, CONFIG.spawn.lon), R = Number(args.radius || 1500);
  tiles = tilesInExtent(frame).filter(([i, j]) => {
    const r = tileRect(i, j); const dx = Math.max(r.minX - sp.x, 0, sp.x - r.maxX), dz = Math.max(r.minZ - sp.z, 0, sp.z - r.maxZ);
    return Math.hypot(dx, dz) <= R;
  });
}
await mkdir(tilesDir, { recursive: true });
let manifest = { tiles: [], terrain: null };
try { manifest = JSON.parse(await readFile(manifestUrl, 'utf8')); } catch { /* new */ }
const have = new Set(manifest.tiles || []);
console.log(`Fetching ${tiles.length} tile(s) from ${endpoints[0]} …`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, failed = 0;
for (const [i, j] of tiles) {
  const key = tileKey(i, j), file = new URL(`${key}.json`, tilesDir);
  if (!args.force) { try { await stat(file); console.log(`  ${key}: already downloaded (use --force to refresh)`); have.add(key); continue; } catch { /* fetch */ } }
  const q = overpassQuery(tileBBox(i, j, frame), 180);
  let json = null, lastErr = null;
  outer: for (const ep of endpoints) for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const t0 = Date.now();
      const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' } });
      if (res.status === 429 || res.status === 504) { lastErr = new Error(`HTTP ${res.status}`); const wait = Number(args['backoff-ms'] ?? 30000) * (attempt + 1); console.log(`  ${key}: server busy (${res.status}), waiting ${wait / 1000}s`); await sleep(wait); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      json = await res.json();
      if (json.remark && /error|timed out/i.test(json.remark)) throw new Error(json.remark);
      console.log(`  ${key}: ${json.elements.length} elements, OSM data as of ${json.osm3s?.timestamp_osm_base} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
      break outer;
    } catch (e) { lastErr = e; await sleep(Number(args['backoff-ms'] ?? 5000)); }
  }
  if (!json) { failed++; console.error(`  ${key}: FAILED – ${lastErr?.message}`); continue; }
  json.fetched = { at: new Date().toISOString(), endpoint: endpoints[0], bbox: tileBBox(i, j, frame), licence: 'ODbL 1.0 – © OpenStreetMap contributors' };
  await writeFile(file, JSON.stringify(json));
  have.add(key); ok++;
  manifest.tiles = [...have].sort(); await writeFile(manifestUrl, JSON.stringify(manifest, null, 2));
  await sleep(Number(args.delay || 3000));
}
manifest.tiles = [...have].sort();
manifest.osm = { updated: new Date().toISOString(), licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors' };
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2));
console.log(`Done: ${ok} downloaded, ${failed} failed, ${manifest.tiles.length} tiles available. Start the app with: node tools/serve.mjs`);
process.exit(failed ? 1 : 0);
