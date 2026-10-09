#!/usr/bin/env node
// One command to download and prepare all real data for Felixstowe:
//
//   node tools/setup-data.mjs                # OSM (Geofabrik extract, Overpass fallback) + LiDAR + validation
//   node tools/setup-data.mjs --no-lidar     # OSM only
//   node tools/setup-data.mjs --overture     # also add Overture buildings (needs: pip install overturemaps)
//   node tools/setup-data.mjs --overpass     # use the Overpass API instead of the Geofabrik extract
//
// Steps are idempotent: re-running skips files that already exist (use --force to refresh OSM).
// Needs Node 18+ and internet access. Downloads: ~35 MB OSM extract, ~0.5–1 GB LiDAR zips.

import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CONFIG } from '../src/config.js';

const args = new Set(process.argv.slice(2).map((a) => a.replace(/^--/, '')));
const root = resolve(new URL('..', import.meta.url).pathname);
const node = (script, ...a) => { console.log(`\n▶ node ${script} ${a.join(' ')}`); const r = spawnSync(process.execPath, [join(root, script), ...a], { stdio: 'inherit', cwd: root }); return r.status === 0; };
const results = [];
const step = (name, ok) => { results.push([name, ok ? 'done' : 'FAILED']); return ok; };

const [maj] = process.versions.node.split('.').map(Number);
if (maj < 18) { console.error('Node 18 or newer is required (built-in fetch).'); process.exit(1); }

// 1. OpenStreetMap
let osmOk = false;
if (!args.has('overpass')) {
  const url = 'https://download.geofabrik.de/europe/united-kingdom/england/suffolk-latest.osm.pbf';
  const file = join(root, 'data', 'suffolk-latest.osm.pbf');
  await mkdir(join(root, 'data'), { recursive: true });
  let have = false; try { have = (await stat(file)).size > 1e6 && !args.has('force'); } catch { /* download */ }
  try {
    if (!have) {
      console.log(`Downloading ${url} …`);
      const res = await fetch(url, { headers: { 'User-Agent': 'felixstowe-3d/0.2 (open-data 3D town prototype)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = createWriteStream(file + '.part'); let n = 0;
      for await (const c of res.body) { out.write(c); n += c.length; }
      await new Promise((r) => out.end(r)); await rename(file + '.part', file);
      console.log(`  ${(n / 1e6).toFixed(1)} MB`);
    }
    osmOk = node('tools/osm-from-pbf.mjs', `--pbf=${file}`);
  } catch (e) { console.log(`Geofabrik download failed (${e.message}); falling back to the Overpass API.`); }
}
if (!osmOk) osmOk = node('tools/fetch-osm.mjs', '--all', ...(args.has('force') ? ['--force'] : []));
step('OpenStreetMap tiles', osmOk);

// 2. Overture (optional)
if (args.has('overture')) {
  const out = join(root, 'data', 'overture-buildings.geojson');
  const e = CONFIG.extent;
  console.log('\n▶ overturemaps download …');
  const r = spawnSync('overturemaps', ['download', `--bbox=${e.w},${e.s},${e.e},${e.n}`, '-f', 'geojson', '--type=building', '-o', out], { stdio: 'inherit' });
  step('Overture buildings', r.status === 0 && node('tools/merge-overture.mjs', `--in=${out}`));
}

// 3. LiDAR
if (!args.has('no-lidar')) step('Environment Agency LiDAR', node('tools/fetch-lidar.mjs'));

// 4. Validate
step('Validation report (docs/data-report.md)', node('tools/validate-data.mjs'));

console.log('\nSummary:'); for (const [n, s] of results) console.log(`  ${s.padEnd(7)} ${n}`);
console.log('\nStart the game: node tools/serve.mjs  →  http://localhost:8080');
console.log('Optional real-data browser test: node tools/test-headless.mjs --live');
process.exit(results.some(([, s]) => s === 'FAILED') ? 1 : 0);
