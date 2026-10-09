#!/usr/bin/env node
// Validate downloaded real data for Felixstowe and write a report (docs/data-report.md + data/report.json).
//   node tools/validate-data.mjs [--data=data]
// Checks: extent coverage, feature counts, attribute completeness, expected street and landmark
// names, independent control points (Historic England / Suffolk HER), duplicate footprints,
// buildings straddling roads, coastline presence, and LiDAR terrain/alignment if processed.
// Every check reports what it found; nothing is assumed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CONFIG, tilesInExtent } from '../src/config.js';
import { LocalFrame, gridRef, parseGridRef } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { pointInPolygon, pointInRing, area, bounds, distToSegment, segmentsIntersect } from '../src/geo/polygon.js';
import { SpatialGrid } from '../src/geo/spatial.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.length ? v.join('=') : true]));
const root = resolve(new URL('..', import.meta.url).pathname);
const dataDir = resolve(root, args.data || 'data');
const manifest = JSON.parse(await readFile(join(dataDir, 'manifest.json'), 'utf8'));
const origin = manifest.origin || CONFIG.origin;
const frame = new LocalFrame(origin.lat, origin.lon);
const felixstowe = !manifest.origin;

// ---------- load and de-duplicate features across tiles ----------
const B = new Map(), R = new Map(), A = new Map(), P = new Map(), L = new Map(); let coast = 0; const osmBases = new Set();
for (const key of manifest.tiles || []) {
  const j = JSON.parse(await readFile(join(dataDir, 'tiles', key + '.json'), 'utf8'));
  if (j.osm3s?.timestamp_osm_base) osmBases.add(j.osm3s.timestamp_osm_base);
  const f = buildFeatures(parseOverpass(j, frame));
  for (const b of f.buildings) B.set(b.osmType + b.id + ':' + b.outer.length, b);
  for (const r of f.roads) R.set(r.id, r);
  for (const a of f.areas) A.set(a.id + a.kind, a);
  for (const p of f.pois) P.set(p.id, p);
  for (const l of f.lines) L.set(l.id, l);
  coast += f.coastLines.length;
}
const buildings = [...B.values()], roads = [...R.values()], areas = [...A.values()], pois = [...P.values()], lines = [...L.values()];
const report = { generated: new Date().toISOString(), dataDir: args.data || 'data', osmTimestamps: [...osmBases], checks: [] };
const add = (group, name, status, detail) => report.checks.push({ group, name, status, detail });

// ---------- coverage ----------
const want = tilesInExtent(frame, manifest.extent || CONFIG.extent).map(([i, j]) => `${i}_${j}`);
const have = new Set(manifest.tiles || []);
const missingTiles = want.filter((k) => !have.has(k));
add('Coverage', 'Tiles in the configured extent present', missingTiles.length ? 'WARN' : 'PASS', `${want.length - missingTiles.length} of ${want.length}${missingTiles.length ? `; missing ${missingTiles.slice(0, 20).join(' ')}${missingTiles.length > 20 ? ' …' : ''} (tiles entirely at sea have no data and are expected to be missing)` : ''}`);
const all = buildings.flatMap((b) => b.outer).concat(roads.flatMap((r) => r.pts));
if (all.length) {
  const bb = bounds(all); const sw = frame.toLatLon(bb.minX, bb.maxZ), ne = frame.toLatLon(bb.maxX, bb.minZ);
  report.bounds = { south: +sw.lat.toFixed(5), west: +sw.lon.toFixed(5), north: +ne.lat.toFixed(5), east: +ne.lon.toFixed(5) };
  add('Coverage', 'Geographic bounds of buildings and roads', 'INFO', `${report.bounds.south}, ${report.bounds.west} to ${report.bounds.north}, ${report.bounds.east} (WGS84)`);
}
report.counts = { buildings: buildings.length, roads: roads.length, namedRoads: roads.filter((r) => r.name).length, areas: areas.length, lines: lines.length, pois: pois.length, coastlineWays: coast, trees: 0 };
add('Coverage', 'Feature counts', buildings.length && roads.length ? 'PASS' : 'FAIL', JSON.stringify(report.counts));

// ---------- attribute completeness ----------
const pct = (n) => (buildings.length ? `${((100 * n) / buildings.length).toFixed(1)}%` : '–');
const cnt = (fn) => buildings.filter(fn).length;
report.attributes = {
  height: pct(cnt((b) => b.heightSource === 'osm:height')), levels: pct(cnt((b) => b.heightSource === 'osm:levels')), estimated: pct(cnt((b) => b.heightSource === 'estimated')),
  roofShape: pct(cnt((b) => b.roofShapeSource === 'osm')), material: pct(cnt((b) => b.materialSource === 'osm')), roadWidths: `${roads.filter((r) => r.widthSource !== 'default:class').length} of ${roads.length}`,
  sidewalkTagged: `${roads.filter((r) => r.sidewalkSource === 'osm').length} of ${roads.filter((r) => r.car).length} car roads`,
};
add('Attributes', 'Building height/levels/roof/material tag coverage', 'INFO', JSON.stringify(report.attributes));

// ---------- expected names (Felixstowe only) ----------
if (felixstowe) {
  const names = new Set(roads.map((r) => r.name).filter(Boolean));
  const streets = ['Hamilton Road', 'Undercliff Road West', 'Undercliff Road East', 'Sea Road', 'High Road West', 'High Road East', 'Orwell Road', 'Bath Road', 'Garrison Lane', 'Langer Road', 'View Point Road', 'Ferry Road', 'Walton Avenue', 'Dock Road', 'Beach Station Road', 'Cliff Road'];
  const found = streets.filter((s) => names.has(s)), missing = streets.filter((s) => !names.has(s));
  add('Names', 'Expected street names present', missing.length <= 2 ? 'PASS' : 'WARN', `found ${found.length}/${streets.length}${missing.length ? '; missing: ' + missing.join(', ') : ''}`);
  report.sampleStreets = [...names].sort().slice(0, 60);
  const lm = { 'Felixstowe Pier': /^felixstowe pier$/i, 'Spa Pavilion': /spa pavilion/i, 'Landguard Fort': /landguard fort/i, 'Seafront Gardens': /seafront gardens/i, 'Hamilton Gardens': /hamilton gardens/i, 'Cliff Gardens': /cliff gardens/i, 'Felixstowe station': /^felixstowe$/i };
  for (const [label, re] of Object.entries(lm)) {
    const m = pois.filter((p) => re.test(p.name) && (label !== 'Felixstowe station' || p.tags?.railway === 'station' || p.tags?.public_transport === 'station'));
    add('Names', `Landmark in OSM: ${label}`, m.length ? 'PASS' : 'WARN', m.length ? m.map((p) => `${p.id} (${p.kind})`).slice(0, 3).join(', ') : 'not found by name');
  }
  // ---------- independent control points ----------
  const controls = [
    { name: 'Landguard Fort (NHLE 1030415)', lat: 51.938688, lon: 1.320669, re: /landguard fort/i, tol: 60 },
    { name: 'Felixstowe station (NHLE 1284364)', lat: 51.967069, lon: 1.35227, re: /^felixstowe$|felixstowe station/i, tol: 80 },
    { name: 'Cliff Gardens (NHLE 1001220 centroid)', lat: 51.961163, lon: 1.355859, re: /cliff gardens|town hall garden/i, tol: 120 },
    { name: 'Felixstowe Pier (Suffolk HER MXS19251, TM 30251 33918)', grid: 'TM 30251 33918', re: /^felixstowe pier$/i, tol: 120 },
  ];
  for (const c of controls) {
    let pt;
    if (c.grid) { const g = parseGridRef(c.grid); pt = frame.fromOSGB(g.E, g.N); } else pt = frame.toWorld(c.lat, c.lon);
    const cands = pois.filter((p) => c.re.test(p.name));
    let best = Infinity, id = null;
    for (const p of cands) {
      let d = Math.hypot(p.x - pt.x, p.z - pt.z);
      if (p.ring && pointInRing(pt.x, pt.z, p.ring)) d = 0;
      if (p.line) for (let i = 1; i < p.line.length; i++) d = Math.min(d, distToSegment(pt.x, pt.z, p.line[i - 1][0], p.line[i - 1][1], p.line[i][0], p.line[i][1]).d);
      if (d < best) { best = d; id = p.id; }
    }
    add('Control points', c.name, !cands.length ? 'WARN' : best <= c.tol ? 'PASS' : 'FAIL', cands.length ? `nearest OSM feature ${id} is ${best.toFixed(1)} m away (tolerance ${c.tol} m; HER/NHLE points are approximate centroids)` : 'no OSM feature with a matching name');
  }
}

// ---------- geometry checks ----------
const grid = new SpatialGrid(30);
for (const b of buildings) { const bb = bounds(b.outer); grid.insert(bb.minX, bb.minZ, bb.maxX, bb.maxZ, b); }
let dup = 0; const dupIds = [];
for (const b of buildings) {
  if (b.isPart) continue;
  for (const o of grid.query(b.cx - 1, b.cz - 1, b.cx + 1, b.cz + 1)) {
    if (o === b || o.isPart || o.id < b.id) continue;
    if (Math.hypot(o.cx - b.cx, o.cz - b.cz) < 0.5 && Math.abs(o.area - b.area) < 0.05 * b.area) { dup++; if (dupIds.length < 10) dupIds.push(`${b.id}/${o.id}`); }
  }
}
add('Geometry', 'Duplicate building footprints', dup ? 'WARN' : 'PASS', dup ? `${dup} near-identical pairs, e.g. ${dupIds.join(' ')}` : 'none');
let straddle = 0; const stIds = [];
for (const r of roads) {
  if (!r.car || r.tunnel || r.bridge || r.layer) continue;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], c = r.pts[i];
    for (const b of grid.query(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]))) {
      if (b.isPart || b.minHeight > 2) continue;
      const ring = b.outer; let hit = pointInRing((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, ring);
      for (let k = 0; !hit && k < ring.length; k++) hit = segmentsIntersect(a, c, ring[k], ring[(k + 1) % ring.length]);
      if (hit) { straddle++; if (stIds.length < 10) stIds.push(`road ${r.id}×building ${b.id}`); }
    }
  }
}
add('Geometry', 'Car-road centre lines crossing building footprints', straddle > 20 ? 'WARN' : 'PASS', `${straddle}${stIds.length ? ' e.g. ' + stIds.join(', ') : ''} (often legitimate: arches, canopies, petrol stations)`);
add('Geometry', 'Coastline ways present', coast ? 'PASS' : felixstowe ? 'FAIL' : 'INFO', `${coast} coastline way references across tiles`);

// ---------- LiDAR ----------
if (manifest.terrain) {
  try {
    const t = JSON.parse(await readFile(join(dataDir, 'terrain', 'terrain.json'), 'utf8'));
    add('LiDAR', 'Terrain grid', 'PASS', `${t.cols}×${t.rows} @ ${t.cell} m, ${t.meta.minHeight}–${t.meta.maxHeight} m ODN, ${t.meta.validCells} cells with data, source: ${t.meta.source}`);
    if (t.meta.alignment) add('LiDAR', 'OSM ↔ LiDAR alignment', t.meta.alignment.bestScore > 0.3 ? 'PASS' : 'WARN', JSON.stringify(t.meta.alignment));
    else add('LiDAR', 'OSM ↔ LiDAR alignment', 'WARN', 'not run (needs a DSM)');
    if (felixstowe) {
      const bin = await readFile(join(dataDir, 'terrain', 'terrain.bin')); const h = new Int16Array(bin.buffer, bin.byteOffset, bin.length / 2);
      const at = (lat, lon) => { const w = frame.toWorld(lat, lon); const o = { E: w.x + frame.E0 + t.osgbShift.se, N: -w.z + frame.N0 + t.osgbShift.sn }; const x = Math.round((o.E - t.E0) / t.cell), y = Math.round((t.N0 - o.N) / t.cell); const v = h[y * t.cols + x]; return v === t.nodata || v === undefined ? null : v / 100; };
      const top = at(51.9612, 1.3559), station = at(51.967069, 1.35227);
      add('LiDAR', 'Ground heights at control points (m ODN)', 'INFO', `Cliff Gardens ${top}, station ${station}, Landguard Fort ${at(51.938688, 1.320669)}`);
    }
  } catch (e) { add('LiDAR', 'Terrain files readable', 'FAIL', e.message); }
} else add('LiDAR', 'Terrain processed', 'WARN', 'no terrain in manifest – run node tools/fetch-lidar.mjs');

// ---------- write ----------
await writeFile(join(dataDir, 'report.json'), JSON.stringify(report, null, 2));
const md = [`# Data validation report`, '', `Generated ${report.generated} from \`${report.dataDir}\`. OSM data timestamp(s): ${report.osmTimestamps.join(', ') || 'unknown'}.`, '',
  '| Group | Check | Result | Detail |', '|---|---|---|---|', ...report.checks.map((c) => `| ${c.group} | ${c.name} | ${c.status} | ${String(c.detail).replace(/\|/g, '/')} |`), '',
  report.sampleStreets ? `Street names found (first 60): ${report.sampleStreets.join(', ')}` : ''].join('\n');
if (!args.data || args.data === 'data') { await mkdir(join(root, 'docs'), { recursive: true }); await writeFile(join(root, 'docs', 'data-report.md'), md); }
else await writeFile(join(dataDir, 'report.md'), md);
for (const c of report.checks) console.log(`${c.status.padEnd(5)} ${c.group} – ${c.name}: ${c.detail}`);
const fails = report.checks.filter((c) => c.status === 'FAIL').length;
console.log(`\n${report.checks.length} checks, ${fails} failed. Report written.`);
process.exit(fails ? 1 : 0);
