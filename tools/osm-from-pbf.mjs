#!/usr/bin/env node
// Build the game's OSM tiles from a local .osm.pbf extract instead of the Overpass API.
// Recommended when Overpass is busy, or for the whole town at once:
//
//   curl -LO https://download.geofabrik.de/europe/united-kingdom/england/suffolk-latest.osm.pbf
//   node tools/osm-from-pbf.mjs --pbf=suffolk-latest.osm.pbf
//
// Output: data/tiles/<i>_<j>.json in the same Overpass "out geom" JSON format the game reads,
// plus data/manifest.json. Feature selection mirrors overpassQuery() (src/config.js).
// Options: --out=<dir> --origin=lat,lon --extent=s,w,n,e --spawn="Name,lat,lon" (for other regions/tests)
// Data © OpenStreetMap contributors, ODbL 1.0.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readPbf, readHeader } from './lib/pbf.mjs';
import { CONFIG, tileRect, tileBBox, tilesInExtent, wantedByQuery, tileKey } from '../src/config.js';
import { LocalFrame } from '../src/geo/projection.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.length ? v.join('=') : true]));
if (!args.pbf) { console.error('Usage: node tools/osm-from-pbf.mjs --pbf=<file.osm.pbf> [--out=data] [--origin=lat,lon] [--extent=s,w,n,e]'); process.exit(2); }
const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(root, args.out || 'data');
const origin = args.origin ? (([lat, lon]) => ({ lat: +lat, lon: +lon }))(String(args.origin).split(',')) : CONFIG.origin;
const extent = args.extent ? (([s, w, n, e]) => ({ s: +s, w: +w, n: +n, e: +e }))(String(args.extent).split(',')) : CONFIG.extent;
const frame = new LocalFrame(origin.lat, origin.lon);
const t0 = Date.now();
const buf = await readFile(args.pbf);
console.log(`Reading ${args.pbf} (${(buf.length / 1e6).toFixed(1)} MB)…`);

const header = readHeader(buf); const osmBase = header.replicationTimestamp || null;

const pad = 0.003;
const inBox = (lat, lon) => lat >= extent.s - pad && lat <= extent.n + pad && lon >= extent.w - pad * 1.6 && lon <= extent.e + pad * 1.6;
const coords = new Map(); const tagged = [];
readPbf(buf, { node(id, lat, lon, tags) { if (!inBox(lat, lon)) return; coords.set(id, [lat, lon]); if (tags && wantedByQuery('node', tags)) tagged.push({ id, lat, lon, tags }); } });
console.log(`  pass 1: ${coords.size} nodes in the extent`);
const ways = new Map(), rels = [], neededWays = new Set();
readPbf(buf, {
  way(id, refs, tags) { if (wantedByQuery('way', tags) && refs.some((r) => coords.has(r))) ways.set(id, { id, refs, tags }); },
  relation(id, members, tags) { if (wantedByQuery('relation', tags)) { rels.push({ id, members, tags }); for (const m of members) if (m.type === 'way') neededWays.add(m.ref); } },
});
const missingWays = [...neededWays].filter((id) => !ways.has(id));
const memberOnly = new Map();
if (missingWays.length) {
  const want = new Set(missingWays);
  readPbf(buf, { way(id, refs, tags) { if (want.has(id)) memberOnly.set(id, { id, refs, tags }); } });
}
const missingNodes = new Set();
for (const w of [...ways.values(), ...memberOnly.values()]) for (const r of w.refs) if (!coords.has(r)) missingNodes.add(r);
if (missingNodes.size) readPbf(buf, { node(id, lat, lon) { if (missingNodes.has(id)) coords.set(id, [lat, lon]); } });
console.log(`  pass 2–4: ${ways.size} ways, ${rels.length} candidate relations, ${memberOnly.size} member-only ways, ${missingNodes.size} outside nodes`);

const wayBox = (w) => { let s = 90, n = -90, we = 180, e = -180; for (const r of w.refs) { const c = coords.get(r); if (!c) continue; s = Math.min(s, c[0]); n = Math.max(n, c[0]); we = Math.min(we, c[1]); e = Math.max(e, c[1]); } return { s, n, w: we, e }; };
const geom = (w) => w.refs.map((r) => coords.get(r)).filter(Boolean).map(([lat, lon]) => ({ lat: +lat.toFixed(7), lon: +lon.toFixed(7) }));
for (const w of ways.values()) w.box = wayBox(w);
for (const w of memberOnly.values()) w.box = wayBox(w);
const getWay = (id) => ways.get(id) || memberOnly.get(id);
const overlaps = (a, b) => a.s <= b.n && a.n >= b.s && a.w <= b.e && a.e >= b.w;

await mkdir(join(outDir, 'tiles'), { recursive: true });
const tiles = tilesInExtent(frame, extent); const written = [];
for (const [i, j] of tiles) {
  const bb = tileBBox(i, j, frame);
  const els = [];
  for (const n of tagged) if (n.lat >= bb.s && n.lat <= bb.n && n.lon >= bb.w && n.lon <= bb.e) els.push({ type: 'node', id: n.id, lat: n.lat, lon: n.lon, tags: n.tags });
  for (const w of ways.values()) if (overlaps(w.box, bb)) els.push({ type: 'way', id: w.id, nodes: w.refs, geometry: geom(w), tags: w.tags });
  for (const r of rels) {
    const mw = r.members.filter((m) => m.type === 'way').map((m) => ({ m, w: getWay(m.ref) })).filter((x) => x.w);
    if (!mw.some((x) => overlaps(x.w.box, bb))) continue;
    els.push({ type: 'relation', id: r.id, tags: r.tags, members: mw.map(({ m, w }) => ({ type: 'way', ref: m.ref, role: m.role, geometry: geom(w) })) });
  }
  if (!els.length) continue;
  const key = tileKey(i, j);
  await writeFile(join(outDir, 'tiles', key + '.json'), JSON.stringify({ version: 0.6, generator: 'felixstowe-3d osm-from-pbf', osm3s: { timestamp_osm_base: osmBase, copyright: 'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.' }, elements: els, fetched: { at: new Date().toISOString(), source: args.pbf, bbox: bb, licence: 'ODbL 1.0 – © OpenStreetMap contributors' } }));
  written.push(key);
}
const mf = join(outDir, 'manifest.json'); let m = {};
try { m = JSON.parse(await readFile(mf, 'utf8')); } catch { /* new */ }
m.tiles = [...new Set([...(m.tiles || []), ...written])].sort();
m.osm = { updated: new Date().toISOString(), source: args.pbf, osmBase, licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors' };
if (args.origin) m.origin = origin;
if (args.extent) m.extent = extent;
if (args.spawn) { const [name, lat, lon] = String(args.spawn).split(','); m.spawn = { name, lat: +lat, lon: +lon }; }
if (!('terrain' in m)) m.terrain = null;
await writeFile(mf, JSON.stringify(m, null, 2));
console.log(`Wrote ${written.length} tiles to ${join(outDir, 'tiles')} in ${((Date.now() - t0) / 1000).toFixed(1)} s (OSM data as of ${osmBase || 'unknown'}).`);
