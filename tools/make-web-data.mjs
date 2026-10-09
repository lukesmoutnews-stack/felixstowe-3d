#!/usr/bin/env node
// Copies a prepared data directory (data/) into a form that static hosts which refuse binary
// files can serve: terrain chunks become row-delta Int16, gzipped, base64 JSON (*.b64.json).
// Usage: node tools/make-web-data.mjs [--in=data] [--out=web-data]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const IN = arg('in', 'data'), OUT = arg('out', 'web-data');

const copy = (rel) => { const s = path.join(IN, rel), d = path.join(OUT, rel); if (!fs.existsSync(s)) return 0; fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); return fs.statSync(d).size; };
fs.rmSync(OUT, { recursive: true, force: true });
let bytes = 0, files = 0;
for (const rel of ['manifest.json', 'report.json', 'lidar-coverage.json']) { const b = copy(rel); if (b) { bytes += b; files++; } }
for (const dir of ['tiles', 'overture']) {
  if (!fs.existsSync(path.join(IN, dir))) continue;
  for (const f of fs.readdirSync(path.join(IN, dir))) { bytes += copy(path.join(dir, f)); files++; }
}
const tdir = path.join(IN, 'terrain');
if (fs.existsSync(tdir)) {
  for (const f of ['building-heights.json', 'trees.json', 'yard.json']) { const b = copy(path.join('terrain', f)); if (b) { bytes += b; files++; } }
  const t = JSON.parse(fs.readFileSync(path.join(tdir, 'terrain.json'), 'utf8'));
  if (t.chunks) {
    fs.mkdirSync(path.join(OUT, 'terrain/chunks'), { recursive: true });
    for (const k of t.chunks) {
      const buf = fs.readFileSync(path.join(tdir, 'chunks', `${k}.bin`));
      const src = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2), d = new Int16Array(src.length);
      let p = 0; for (let i = 0; i < src.length; i++) { d[i] = src[i] - p; p = src[i]; }
      const data = zlib.gzipSync(Buffer.from(d.buffer), { level: 9 }).toString('base64');
      const out = path.join(OUT, 'terrain/chunks', `${k}.b64.json`);
      fs.writeFileSync(out, JSON.stringify({ key: k, encoding: 'delta-gzip', data }));
      bytes += fs.statSync(out).size; files++;
    }
    t.base64Chunks = true; t.chunkEncoding = 'delta-gzip';
  }
  fs.writeFileSync(path.join(OUT, 'terrain/terrain.json'), JSON.stringify(t, null, 1)); files++;
}
console.log(`web data: ${files} files, ${(bytes / 1e6).toFixed(1)} MB in ${OUT}/`);
