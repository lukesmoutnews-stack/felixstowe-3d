// Synthetic LiDAR rasters for the synthetic test grid (NOT real data). The DSM's buildings are
// deliberately displaced by +3 m east / -2 m north so tools/lidar.mjs must find that offset.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { LocalFrame } from '../src/geo/projection.js';
import { parseOverpass, buildFeatures } from '../src/geo/osm.js';
import { pointInPolygon } from '../src/geo/polygon.js';
const fx = JSON.parse(readFileSync(new URL('./fixtures/test-grid.json', import.meta.url)));
const frame = new LocalFrame(fx.fixtureMeta.origin.lat, fx.fixtureMeta.origin.lon);
const f = buildFeatures(parseOverpass(fx, frame));
const c = frame.toOSGB(-600, 800), d = frame.toOSGB(500, -800); // area in OSGB
const E0 = Math.floor(c.E), N0 = Math.ceil(d.N), W = Math.ceil(d.E - c.E), H = Math.ceil(d.N - c.N);
const dtm = new Float32Array(W * H), dsm = new Float32Array(W * H);
const OFF = { E: 3, N: -2 };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const E = E0 + x + 0.5, N = N0 - y - 0.5;
  const w = frame.fromOSGB(E, N);
  const g = w.x > 255 ? -3 : 8 + w.x * -0.02 + Math.sin(w.z / 200) * 2; // land slopes to the shore, sea floor below
  dtm[y * W + x] = g; dsm[y * W + x] = g;
  // container stacks in the yard (2-3 high rows of 12 m), placed in true (unshifted) positions
  if (w.x > 150 && w.x < 182 && w.z > -645 && w.z < -560 && (Math.floor((w.z + 645) / 3) % 4 !== 3)) dsm[y * W + x] = g + (Math.floor((w.x - 150) / 8) % 2 ? 7.77 : 5.18);
  const wb = frame.fromOSGB(E - OFF.E, N - OFF.N);
  for (const b of f.buildings) if (Math.abs(b.cx - wb.x) < 25 && Math.abs(b.cz - wb.z) < 25 && pointInPolygon(wb.x, wb.z, b.outer)) { dsm[y * W + x] = g + (b.kind === 'church' ? 14 : 8.5); break; }
}
mkdirSync('test/lidar', { recursive: true });
writeFileSync('test/lidar/dtm.raw', Buffer.from(dtm.buffer)); writeFileSync('test/lidar/dsm.raw', Buffer.from(dsm.buffer));
writeFileSync('test/lidar/meta.json', JSON.stringify({ E0, N0, W, H, offset: OFF }));
console.log({ E0, N0, W, H });
