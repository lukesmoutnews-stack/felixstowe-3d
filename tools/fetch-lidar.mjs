#!/usr/bin/env node
// Download Environment Agency LiDAR tiles for the project extent, then process them.
//
//   node tools/fetch-lidar.mjs              # DTM + DSM for the whole extent, then run tools/lidar.mjs
//   node tools/fetch-lidar.mjs --dry-run    # list the 5 km tiles and products without downloading
//   node tools/fetch-lidar.mjs --dtm-only   # terrain only (smaller download)
//
// Uses the Defra survey portal API (https://environment.data.gov.uk/survey):
//   POST {api}/tiles/collections/survey/search  (GeoJSON polygon, WGS84)  -> list of tile products
//   GET  {uri}                                                             -> zip of GeoTIFFs (~70 MB per 5 km tile)
// Endpoint details come from the open-source LIDAR Downloader UK QGIS plugin; they are not
// formally documented by Defra and may change. If they fail, download by hand from the portal
// and run tools/lidar.mjs directly (docs/setup.md).
// Licence: Open Government Licence v3 – © Environment Agency copyright and/or database right.

import { mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONFIG } from '../src/config.js';
import { LocalFrame, gridRef } from '../src/geo/projection.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.length ? v.join('=') : true]));
const root = resolve(new URL('..', import.meta.url).pathname);
const API = String(args.api || 'https://environment.data.gov.uk').replace(/\/$/, '');
const rawDir = resolve(root, args.raw || 'data/lidar-raw');
const extent = args.extent ? (([s, w, n, e]) => ({ s: +s, w: +w, n: +n, e: +e }))(String(args.extent).split(',')) : CONFIG.extent;
const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon);

// Product preference: newest National LiDAR Programme first, then the composite.
const DTM = ['national_lidar_programme_dtm', 'lidar_composite_dtm'];
const DSM = ['national_lidar_programme_dsm', 'national_lidar_programme_first_return_dsm', 'lidar_composite_first_return_dsm', 'lidar_composite_last_return_dsm'];

// --- which 5 km OS tiles cover the extent ---
const corners = [[extent.s, extent.w], [extent.s, extent.e], [extent.n, extent.w], [extent.n, extent.e]].map(([la, lo]) => { const w = frame.toWorld(la, lo); return frame.toOSGB(w.x, w.z); });
const E0 = Math.floor(Math.min(...corners.map((c) => c.E)) / 5000) * 5000, E1 = Math.floor(Math.max(...corners.map((c) => c.E)) / 5000) * 5000;
const N0 = Math.floor(Math.min(...corners.map((c) => c.N)) / 5000) * 5000, N1 = Math.floor(Math.max(...corners.map((c) => c.N)) / 5000) * 5000;
const needed = [];
for (let N = N0; N <= N1; N += 5000) for (let E = E0; E <= E1; E += 5000) needed.push(gridRef(E + 1, N + 1, 4).replace(/\s/g, ''));
console.log(`Extent ${extent.s},${extent.w} – ${extent.n},${extent.e} needs ${needed.length} OS 5 km tiles: ${needed.join(' ')}`);

const polygon = { type: 'Polygon', coordinates: [[[extent.w, extent.s], [extent.e, extent.s], [extent.e, extent.n], [extent.w, extent.n], [extent.w, extent.s]]] };
async function retry(fn, label, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; console.log(`  ${label}: ${e.message} (attempt ${i + 1}/${tries})`); await new Promise((r) => setTimeout(r, Number(args['backoff-ms'] ?? 4000) * (i + 1))); } }
  throw last;
}
let res;
try { res = await retry(async () => {
  const r = await fetch(`${API}/tiles/collections/survey/search`, { method: 'POST', headers: { 'Content-Type': 'application/geo+json' }, body: JSON.stringify(polygon) });
  if (!r.ok) throw new Error(`search HTTP ${r.status}`);
  return r.json();
}, 'search'); } catch (e) {
  console.error(`The EA search API could not be reached (${e.message}). Tiles needed: ${needed.join(', ')}.\nDownload them by hand from https://environment.data.gov.uk/survey and run: node tools/lidar.mjs --dtm="<zips>" --dsm="<zips>"`);
  process.exit(1);
}
const results = res.results || [];
console.log(`Search returned ${results.length} products.`);

const choose = (products) => {
  const picks = new Map(); // tile -> result
  for (const pid of products) for (const r of results) {
    if (r.product?.id !== pid || String(r.resolution?.id) !== '1' || !needed.includes(r.tile?.id)) continue;
    const cur = picks.get(r.tile.id);
    if (!cur) { picks.set(r.tile.id, r); continue; }
    if (cur.product.id === pid && Number(r.year?.id) > Number(cur.year?.id)) picks.set(r.tile.id, r);
  }
  return picks;
};
const dtm = choose(DTM), dsm = args['dtm-only'] ? new Map() : choose(DSM);
const report = { checked: new Date().toISOString(), api: API, needed, dtm: {}, dsm: {}, missing: { dtm: [], dsm: [] } };
for (const t of needed) {
  const a = dtm.get(t), b = dsm.get(t);
  report.dtm[t] = a ? `${a.product.id} ${a.year?.id}` : null; report.dsm[t] = b ? `${b.product.id} ${b.year?.id}` : null;
  if (!a) report.missing.dtm.push(t); if (!b && !args['dtm-only']) report.missing.dsm.push(t);
}
console.table(needed.map((t) => ({ tile: t, dtm: report.dtm[t] || '(none – probably sea)', dsm: args['dtm-only'] ? '-' : report.dsm[t] || '(none)' })));
await mkdir(rawDir, { recursive: true });
await writeFile(join(rawDir, 'coverage.json'), JSON.stringify(report, null, 2));
if (args['dry-run']) process.exit(0);

async function download(r) {
  const file = join(rawDir, `${r.label || `${r.product.id}-${r.year?.id}-${r.tile.id}`}.zip`);
  try { const s = await stat(file); if (s.size > 1000) { console.log(`  have ${file}`); return file; } } catch { /* fetch */ }
  await retry(async () => {
    const resp = await fetch(r.uri);
    if (resp.status === 500) throw Object.assign(new Error('no data for this tile (HTTP 500)'), { noData: true });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const out = createWriteStream(file + '.part'); let n = 0;
    for await (const chunk of resp.body) { out.write(chunk); n += chunk.length; }
    await new Promise((ok) => out.end(ok));
    const { rename } = await import('node:fs/promises'); await rename(file + '.part', file);
    console.log(`  downloaded ${file} (${(n / 1e6).toFixed(1)} MB)`);
  }, r.tile.id);
  return file;
}
const dtmFiles = [], dsmFiles = [];
for (const r of dtm.values()) dtmFiles.push(await download(r));
for (const r of dsm.values()) dsmFiles.push(await download(r));
if (!dtmFiles.length) { console.error('No DTM tiles downloaded; nothing to process.'); process.exit(1); }
if (args['no-process']) { console.log(`Downloaded ${dtmFiles.length} DTM and ${dsmFiles.length} DSM files (processing skipped).`); process.exit(0); }
console.log('Processing with tools/lidar.mjs…');
const p = spawnSync(process.execPath, [join(root, 'tools/lidar.mjs'), `--dtm=${dtmFiles.join(',')}`, ...(dsmFiles.length ? [`--dsm=${dsmFiles.join(',')}`] : []), `--source=${[...new Set([...dtm.values()].map((r) => `${r.product.label || r.product.id} ${r.year?.id}`))].join('; ')}`], { stdio: 'inherit' });
process.exit(p.status ?? 1);
