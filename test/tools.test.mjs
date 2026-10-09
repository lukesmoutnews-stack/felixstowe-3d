// Offline tests for the data tools against local mock services (no internet needed):
//   node test/tools.test.mjs
// Checks fetch-osm.mjs (Overpass retry/backoff, tile files, manifest) and fetch-lidar.mjs
// (EA search, product/year choice, downloads, coverage report). Also runs osm-from-pbf.mjs
// if a real .osm.pbf is supplied with --pbf=<file>.
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { crc32 } from 'node:zlib';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const tmp = mkdtempSync(join(tmpdir(), 'f3d-tools-'));
let overpassCalls = 0;

function storedZip(name, data) { // minimal single-entry ZIP (method 0)
  const n = Buffer.from(name), c = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt32LE(c, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28);
  const off = 30 + n.length + data.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + n.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([lh, n, data, cd, n, end]);
}
const fakeTif = Buffer.from('II*\0 fake tiff payload for download test');
const tilesNeeded = ['TM2030', 'TM2530', 'TM3030', 'TM2035', 'TM2535', 'TM3035'];

const server = createServer((req, res) => {
  let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => {
    const port = server.address().port;
    if (req.url.startsWith('/api/interpreter')) {
      overpassCalls++;
      if (overpassCalls === 1) { res.writeHead(429).end('rate limited'); return; }
      const q = decodeURIComponent(body.replace(/^data=/, '').replace(/\+/g, ' '));
      const m = q.match(/\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)/);
      const [s, w, n, e] = m.slice(1).map(Number);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: 0.6, osm3s: { timestamp_osm_base: '2026-10-09T00:00:00Z' }, elements: [{ type: 'node', id: overpassCalls, lat: (s + n) / 2, lon: (w + e) / 2, tags: { name: 'Mock' } }] }));
    } else if (req.url === '/tiles/collections/survey/search') {
      assert.equal(JSON.parse(body).type, 'Polygon');
      const r = (pid, year, tile) => ({ product: { id: pid, label: pid }, year: { id: String(year) }, resolution: { id: '1' }, tile: { id: tile }, label: `${pid}-${year}-1m-${tile}`, uri: `http://localhost:${port}/tiles/collections/survey/${pid}/${year}/1/${tile}` });
      const results = [];
      for (const t of tilesNeeded) results.push(r('lidar_composite_dtm', 2022, t));
      results.push(r('national_lidar_programme_dtm', 2019, 'TM3030'), r('national_lidar_programme_dtm', 2021, 'TM3030'));
      for (const t of ['TM2530', 'TM3030', 'TM2535', 'TM3035']) results.push(r('national_lidar_programme_dsm', 2020, t));
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ count: results.length, results }));
    } else if (req.url.startsWith('/tiles/collections/survey/')) {
      res.writeHead(200, { 'Content-Type': 'application/zip' }).end(storedZip('tile.tif', fakeTif));
    } else res.writeHead(404).end();
  });
}).listen(0);
await new Promise((r) => server.on('listening', r));
const port = server.address().port;
let passed = 0; const ok = (name, cond, detail = '') => { assert.ok(cond, name + ' ' + detail); passed++; console.log('ok  ', name); };

// tools run as child processes; the mock server keeps serving meanwhile
const runAsync = (script, ...a) => new Promise((done) => { const p = spawn(process.execPath, [join(root, script), ...a], { cwd: root }); let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('close', (code) => done({ code, out })); });

// 1. fetch-osm: retries after 429, writes tiles and manifest
const osmOut = join(tmp, 'data');
const r1 = await runAsync('tools/fetch-osm.mjs', `--endpoint=http://localhost:${port}/api/interpreter`, '--tiles=0_0,1_0', `--out=${osmOut}`, '--backoff-ms=20', '--delay=10');
ok('fetch-osm exits cleanly', r1.code === 0, r1.out);
ok('fetch-osm retried after HTTP 429', /server busy \(429\)/.test(r1.out) && overpassCalls === 3, r1.out);
const man = JSON.parse(readFileSync(join(osmOut, 'manifest.json'), 'utf8'));
ok('manifest lists both tiles', JSON.stringify(man.tiles) === JSON.stringify(['0_0', '1_0']));
const t0 = JSON.parse(readFileSync(join(osmOut, 'tiles', '0_0.json'), 'utf8'));
ok('tile records licence and query box', /ODbL/.test(t0.fetched.licence) && t0.fetched.bbox.s < 51.96 && t0.fetched.bbox.n > 51.96);
const r1b = await runAsync('tools/fetch-osm.mjs', `--endpoint=http://localhost:${port}/api/interpreter`, '--tiles=0_0', `--out=${osmOut}`, '--delay=10');
ok('fetch-osm skips tiles already downloaded', /already downloaded/.test(r1b.out) && overpassCalls === 3);

// 2. fetch-lidar: coverage, product preference, downloads
const raw = join(tmp, 'lidar');
const r2 = await runAsync('tools/fetch-lidar.mjs', `--api=http://localhost:${port}`, `--raw=${raw}`, '--no-process', '--backoff-ms=20');
ok('fetch-lidar exits cleanly', r2.code === 0, r2.out);
ok('fetch-lidar finds the six OS 5 km tiles', tilesNeeded.every((t) => r2.out.includes(t)), r2.out.split('\n')[0]);
const cov = JSON.parse(readFileSync(join(raw, 'coverage.json'), 'utf8'));
ok('prefers newest National LiDAR Programme DTM over composite', cov.dtm.TM3030 === 'national_lidar_programme_dtm 2021', cov.dtm.TM3030);
ok('falls back to composite DTM where NLP is missing', cov.dtm.TM2030 === 'lidar_composite_dtm 2022');
ok('reports tiles without a DSM', JSON.stringify(cov.missing.dsm) === JSON.stringify(['TM2030', 'TM2035']), JSON.stringify(cov.missing));
ok('downloads one zip per chosen product', readdirSync(raw).filter((f) => f.endsWith('.zip')).length === 10, readdirSync(raw).join(','));

// 3. osm-from-pbf on a real extract, if provided
if (args.pbf && existsSync(args.pbf)) {
  const out = join(tmp, 'pbf');
  const r3 = await runAsync('tools/osm-from-pbf.mjs', `--pbf=${args.pbf}`, `--out=${out}`, ...(args.origin ? [`--origin=${args.origin}`, `--extent=${args.extent}`] : []));
  ok('osm-from-pbf writes tiles', r3.code === 0 && readdirSync(join(out, 'tiles')).length > 0, r3.out);
}
server.close();
console.log(`\n${passed} tool tests passed`);
