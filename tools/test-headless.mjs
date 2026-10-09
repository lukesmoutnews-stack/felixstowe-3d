#!/usr/bin/env node
// Automated browser test: loads the app (synthetic fixture by default), checks the console,
// exercises walking / collision / driving / map / journal and saves screenshots + a JSON log.
// Usage: node tools/test-headless.mjs [--fixture=test-grid] [--live] [--out=test/results]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = resolve(root, args.out || 'test/results');
const fixture = args.live || args.data ? null : (args.fixture || 'test-grid');
await mkdir(outDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream' };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = normalize(join(root, p)); if (!f.startsWith(root)) throw 0; const body = await readFile(f); res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const port = server.address().port;

const log = { started: new Date().toISOString(), fixture, data: args.data || (args.live ? 'live' : null), console: [], errors: [], checks: [], perf: {} };
const check = (name, ok, detail = '') => { log.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  – ' + detail : ''}`); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { log.console.push(`[${m.type()}] ${m.text()}`); if (m.type() === 'error') log.errors.push(m.text()); });
page.on('pageerror', (e) => log.errors.push('pageerror: ' + e.message));
const url = `http://localhost:${port}/?test${fixture ? '&fixture=' + fixture : ''}${args.data ? '&data=' + args.data : ''}${args.terrain ? '&terrain=' + args.terrain : ''}`;
const tStart = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__f3d && (window.__f3d.error || window.__f3d.state?.().loadFailed || document.querySelector('.enter:not([disabled])')), null, { timeout: 240000 });
const err = await page.evaluate(() => window.__f3d.error || null);
if (err) { check('app starts', false, err); await page.screenshot({ path: join(outDir, '00-error.png'), timeout: 180000 }); await finish(); }
const st0 = await page.evaluate(() => window.__f3d.state());
check('app loads data and becomes enterable', !st0.loadFailed, `loadMs=${st0.loadMs}, tiles=${st0.tiles.join(' ')}`);
log.perf.loadMs = st0.loadMs; log.perf.wallLoadMs = Date.now() - tStart;
await page.screenshot({ path: join(outDir, '01-loading-screen.png'), timeout: 180000 });
await page.click('.enter');
await page.waitForTimeout(1500);
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: join(outDir, name), timeout: 180000 }); };
await shot('02-start-third-person.png');
const s1 = await page.evaluate(() => window.__f3d.state());
check('world entered', s1.entered);

// walk forward 3 s
const p0 = s1.player;
await page.evaluate(() => { const f = window.__f3d; f.key('KeyW', true); f.advance(3); f.key('KeyW', false); f.advance(0.5); });
const s2 = await page.evaluate(() => window.__f3d.state());
const moved = Math.hypot(s2.player.x - p0.x, s2.player.z - p0.z);
check('player walks', moved > 2, `moved ${moved.toFixed(1)} m in 3 s`);
await shot('03-after-walk.png');

// collision: face the nearest building wall and walk into it for 4 s
const coll = await page.evaluate(async () => {
  const { app } = window.__f3d; const p = app.player.pos;
  let best = null;
  for (const it of app.world.edgeGrid.query(p.x - 80, p.z - 80, p.x + 80, p.z + 80)) {
    if (it.kind !== 'building' || !it.outer) continue;
    const mx = (it.a[0] + it.b[0]) / 2, mz = (it.a[1] + it.b[1]) / 2, d = Math.hypot(mx - p.x, mz - p.z);
    const L = Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]); if (L < 3) continue;
    const ox = mx - (it.b[1] - it.a[1]) / L * 4, oz = mz + (it.b[0] - it.a[0]) / L * 4; // outward for CCW rings
    if (app.collision.insideBuilding(ox, oz) || !app.world.isWalkable(ox, oz) || app.collision.resolve(ox, oz, 0.4, 0, 1.7).hit) continue;
    if (!best || d < best.d) best = { d, mx, mz, it };
  }
  if (!best) return null;
  // place 4 m in front of the wall on the outside, facing it
  const { it } = best; const sx = it.b[0] - it.a[0], sz = it.b[1] - it.a[1], L = Math.hypot(sx, sz); const nx = -sz / L, nz = sx / L;
  const bx = best.mx + nx * 4, bz = best.mz + nz * 4;
  app.player.place(bx, bz); app.rig.yaw = Math.atan2(nx, nz);
  return { wall: [best.mx, best.mz], start: [bx, bz], normal: [nx, nz], id: it.id };
});
if (coll) {
  await page.evaluate(() => { const f = window.__f3d; f.key('KeyW', true); f.advance(4); f.key('KeyW', false); });
  const res = await page.evaluate((c) => { const { app } = window.__f3d; const p = app.player.pos; const inside = !!app.collision.insideBuilding(p.x, p.z); const dWall = (p.x - c.wall[0]) * c.normal[0] + (p.z - c.wall[1]) * c.normal[1]; return { inside, dWall }; }, coll);
  check('collision stops player at building wall', !res.inside && res.dWall > 0.2, `distance to wall plane ${res.dWall.toFixed(2)} m, inside=${res.inside}`);
  await shot('04-collision-wall.png');
} else check('collision test found a building', false);

// camera modes
for (const [mode, file] of [['first', '05-first-person.png'], ['overview', '06-overview.png']]) {
  await page.evaluate((m) => window.__f3d.setView(m, null, m === 'overview' ? -0.9 : -0.05, m === 'overview' ? 420 : null), mode);
  await shot(file);
}
await page.evaluate(() => window.__f3d.setView('third', null, -0.3, 7));

// teleport to pier & check deck height. Works for piers at any bearing: sample points inside the
// deck ring that lie over the sea, use the one nearest the deck's centre.
const pierPick = () => {
  const { app } = window.__f3d; const s = app.world.surfaces.find((q) => !q.kind); if (!s) return null;
  const R = s.ring, xs = R.map((p) => p[0]), zs = R.map((p) => p[1]);
  const inside = (x, z) => { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const [xi, zi] = R[i], [xj, zj] = R[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const cx = xs.reduce((a, b) => a + b) / xs.length, cz = zs.reduce((a, b) => a + b) / zs.length;
  const pts = [];
  for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
    const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / 60, z = Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * j / 60;
    if (inside(x, z) && !app.world.isLand(x, z)) pts.push([x, z]);
  }
  pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
  // nearest edge from the chosen point (for the walk-off test)
  const [x, z] = pts[0] || [cx, cz]; let best = null;
  for (let i = 0; i < R.length; i++) {
    const [ax, az] = R[i], [bx, bz] = R[(i + 1) % R.length], L2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L2)), px = ax + t * (bx - ax), pz = az + t * (bz - az), d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { d, dx: (px - x) / (d || 1), dz: (pz - z) / (d || 1) };
  }
  return { x, z, edge: best };
};
const pier = await page.evaluate(`(${pierPick})()`).then((q) => q && page.evaluate(({ x, z }) => {
  const { app } = window.__f3d; app.player.place(x, z); app.rig.yaw = -Math.PI / 2; app.rig.initialised = false;
  return { x, z, y: app.player.pos.y, ground: app.world.ground(x, z), walkable: app.world.isWalkable(x, z), land: app.world.isLand(x, z) };
}, q));
if (pier === null) log.checks.push({ name: 'pier deck (no pier in this data set)', ok: true, skipped: true }), console.log('SKIP  pier checks – no pier surface in this data set');
else if (pier) { check('pier deck is walkable above the sea', pier.walkable && !pier.land && pier.y > pier.ground + 0.4, JSON.stringify(pier)); await shot('07-on-pier.png'); }


// sea blocks walking: from the deck, walk towards the nearest deck edge (the railing should stop the player)
const sea = pier && await page.evaluate(`(${pierPick})()`).then((q) => page.evaluate(({ x, z, edge }) => {
  const { app } = window.__f3d; app.player.place(x, z); app.rig.yaw = Math.atan2(-edge.dx, -edge.dz);
  return { x, z };
}, q));
if (pier) await page.evaluate(() => { const f = window.__f3d; f.key('KeyW', true); f.advance(4); f.key('KeyW', false); });
const seaRes = await page.evaluate(() => { const { app } = window.__f3d; const p = app.player.pos; return { walkable: app.world.isWalkable(p.x, p.z), y: p.y }; });
if (pier) check('player cannot walk off the pier into the sea', seaRes.walkable, JSON.stringify(seaRes));

// drive: go back to start, enter car, accelerate 4 s, steer
await page.evaluate(() => { const { app } = window.__f3d; app.player.place(app.car.pos.x - 2.5, app.car.pos.z); app.input.pressed.add('KeyE'); window.__f3d.advance(0.1); });
const d0 = await page.evaluate(() => window.__f3d.state());
check('can enter the car', d0.driving);
await page.evaluate(() => { window.__f3d.key('KeyW', true); window.__f3d.advance(4); });
const d1 = await page.evaluate(() => window.__f3d.state());
await shot('08-driving.png');
await page.evaluate(() => { const f = window.__f3d; f.key('KeyA', true); f.advance(1.5); f.key('KeyA', false); f.key('KeyW', false); f.key('Space', true); f.advance(2.5); f.key('Space', false); });
const d2 = await page.evaluate(() => window.__f3d.state());
const drove = Math.hypot(d1.car.x - d0.car.x, d1.car.z - d0.car.z);
check('car accelerates and moves', drove > 8 && d1.car.speed > 4, `moved ${drove.toFixed(1)} m, speed ${d1.car.speed} m/s`);
check('car brakes to a stop with handbrake', Math.abs(d2.car.speed) < 1, `speed ${d2.car.speed}`);
const carInside = await page.evaluate(() => { const { app } = window.__f3d; return !!app.collision.insideBuilding(app.car.pos.x, app.car.pos.z); });
check('car is not inside a building', !carInside);
await page.evaluate(() => { window.__f3d.app.input.pressed.add('KeyE'); window.__f3d.advance(0.1); });
check('can leave the car', !(await page.evaluate(() => window.__f3d.state().driving)));

// map + journal + menu
await page.evaluate(() => window.__f3d.app.action('map')); await shot('09-map.png');
const mapAlign = await page.evaluate(() => {
  const { app } = window.__f3d; const ui = app.ui; const v = ui.mapView; const p = app.focusPos();
  const [sx, sy] = ui.mapR.toScreen(v, p.x, p.z); return { sx, sy, w: v.w, h: v.h };
});
check('map centres on the player (same world frame)', Math.abs(mapAlign.sx - mapAlign.w / 2) < 2 && Math.abs(mapAlign.sy - mapAlign.h / 2) < 2, JSON.stringify(mapAlign));
await page.evaluate(() => window.__f3d.app.ui.close());
await page.evaluate(() => window.__f3d.app.action('journal')); await shot('10-journal.png'); await page.evaluate(() => window.__f3d.app.ui.close());
await page.evaluate(() => { window.__f3d.app.action('menu'); window.__f3d.app.ui._menuTab('Data'); }); await shot('11-menu-data.png'); await page.evaluate(() => window.__f3d.app.ui.close());

// landmark card
const card = await page.evaluate(() => { const { app } = window.__f3d; const poi = [...app.world.pois.values()].find((p) => p.name === 'Test Pavilion'); if (!poi) return false; app.player.place(poi.x - 13, poi.z); return true; });
if (card) { await page.evaluate(() => { window.__f3d.advance(0.5); window.__f3d.app.input.pressed.add('KeyE'); window.__f3d.advance(0.1); }); await shot('12-interaction.png'); await page.evaluate(() => window.__f3d.app.ui.close()); }

// perf sample: hold still for 3 s in third person at street level and from overview
await page.evaluate(() => { const { app } = window.__f3d; app.ui.close(); app.settings.showFps = true; });
for (const [mode, dist] of [['third', 7], ['overview', 600]]) {
  await page.evaluate(([m, d]) => window.__f3d.setView(m, 0.6, m === 'overview' ? -0.8 : -0.25, d), [mode, dist]);
  await page.evaluate(() => window.__f3d.advance(1));
  log.perf[mode] = await page.evaluate(() => ({ renderMs: window.__f3d.renderTime(3), ...window.__f3d.state() }));
  console.log(`perf ${mode}: ${log.perf[mode].renderMs.toFixed(0)} ms/frame (software GL), ${log.perf[mode].render.calls} draws, ${log.perf[mode].render.triangles} tris`);
}
await shot('13-street-view-fps.png');
log.quality = await page.evaluate(() => window.__f3d.quality());
const crit = log.errors.filter((e) => !/favicon|DevTools|GPU stall|WebGL: INVALID_ENUM/i.test(e));
check('no unresolved console errors', crit.length === 0, crit.slice(0, 5).join(' | '));
await finish();

async function finish() {
  log.finished = new Date().toISOString();
  await writeFile(join(outDir, 'test-log.json'), JSON.stringify(log, null, 2));
  await browser.close(); server.close();
  const failed = log.checks.filter((c) => !c.ok).length;
  console.log(`\n${log.checks.length - failed}/${log.checks.length} checks passed. Screenshots + log in ${outDir}`);
  process.exit(failed ? 1 : 0);
}
