#!/usr/bin/env node
// End-to-end test of Race to Be Mayor on a phone-sized screen (Chromium, iPhone 13 profile,
// software GL). Follows the 18-step journey in the brief and saves screenshots plus a JSON log.
// Usage: node tools/test-mayor.mjs [--port=8840] [--out=test/results-mayor]

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/npm-tools/node_modules/playwright'); }
const { chromium, devices } = pw;
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const port = arg('port', '8840'), outDir = arg('out', 'test/results-mayor'); mkdirSync(outDir, { recursive: true });
const srv = spawn('node', ['tools/serve.mjs', port], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = { started: new Date().toISOString(), steps: [], errors: [] };
page.on('pageerror', (e) => log.errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g/.test(m.text())) log.errors.push(m.text()); });
let n = 0;
const step = (name, ok, detail = '') => { log.steps.push({ n: ++n, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}. ${name}${detail ? '  – ' + detail : ''}`); };
const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: join(outDir, name + '.png'), timeout: 180000 }); };
const M = (fn, a) => page.evaluate(fn, a);
const xp = () => M(() => window.__mayor.game.xp());
const status = (id) => M((i) => window.__mayor.game.locationStatus(i), id);

async function discoverByExploring(id) {
  // Travel to the area with the UI, walk towards the pin in the 3D town, and if streets block the way,
  // arrive at the nearest street spot (the same as the game's travel feature).
  await M((i) => window.__mayor.openLocation(i), id);
  if (await status(id) !== 'undiscovered') return 'already';
  await page.click('.sheet [data-act=travel]');
  await page.waitForFunction((i) => { const m = window.__mayor; return m.layer && m.layer.distanceTo(i) < 160; }, id, { timeout: 120000 });
  for (let k = 0; k < 8 && await status(id) === 'undiscovered'; k++) {
    await M((i) => { const m = window.__mayor, a = m.three, p = m.layer.pins.get(i); a.rig.yaw = Math.atan2(-(p.x - a.player.pos.x), -(p.z - a.player.pos.z)); window.__f3d.key('ShiftLeft', true); window.__f3d.key('KeyW', true); window.__f3d.advance(1.5); window.__f3d.key('KeyW', false); window.__f3d.key('ShiftLeft', false); window.__f3d.advance(0.4); }, id);
  }
  if (await status(id) === 'undiscovered') { await M((i) => { const p = window.__mayor.layer.pins.get(i); return window.__f3d.teleport(p.x, p.z); }, id); await M(() => window.__f3d.advance(0.6)); return 'walked + arrived'; }
  return 'walked';
}

try {
  // 1. open on a phone screen
  await page.goto(`http://localhost:${port}/mayor.html`);
  await page.waitForSelector('#onboard', { timeout: 60000 });
  step('App opens on a mobile screen (390×844, touch)', await page.isVisible('#onboard'), 'iPhone 13 profile');
  await shot('01-onboarding');
  // 2. create a profile
  await page.fill('#ob-name', 'TestResident'); await page.click('#onboard button[type=submit]');
  await page.waitForSelector('.rank-card');
  step('Create a player profile', (await M(() => window.__mayor.game.p.player?.name)) === 'TestResident');
  await shot('02-home');
  // 3. open the 3D map
  await page.click('[data-tab=explore]');
  await page.waitForFunction(() => window.__mayor?.layer, null, { timeout: 300000 });
  await page.waitForTimeout(2500);
  step('Open the 3D Felixstowe map', await M(() => window.__mayor.layer.pins.size > 0 && !window.__mayor.three.suspended), `${await M(() => window.__mayor.layer.pins.size)} pins`);
  await shot('03-explore-3d');
  // 4. discover a sample business in the 3D town
  const biz = 'kittiwake';
  await M(() => window.__mayor.closeSheet()); const xp0 = await xp();
  const how = await discoverByExploring(biz);
  await page.waitForFunction((i) => window.__mayor.game.isDiscovered(i), biz, { timeout: 30000 });
  step('Discover a sample business in the 3D town', await status(biz) === 'discovered', `${how}; +${(await xp()) - xp0} XP for discovery`);
  await M(() => window.__mayor.closeSheet());
  // 5. view its profile by tapping its pin
  await M((i) => { const m = window.__mayor, a = m.three, p = m.layer.pins.get(i); a.rig.mode = 'third'; a.rig.yaw = Math.atan2(-(p.x - a.player.pos.x), -(p.z - a.player.pos.z)); a.rig.pitch = -0.25; a.rig.initialised = false; window.__f3d.advance(0.3); }, biz);
  await page.waitForTimeout(800);
  const sp = await M((i) => window.__mayor.layer.screenPos(i), biz);
  let tapped = false;
  if (sp?.onScreen) { await page.mouse.click(sp.x, sp.y - 22); await page.waitForTimeout(500); tapped = await page.isVisible('.sheet.loc'); }
  if (!tapped) await M((i) => window.__mayor.openLocation(i), biz);
  await page.waitForSelector('.sheet.loc h2');
  step('View the business profile (virtual discovery)', (await page.textContent('.sheet.loc h2')).includes('Kittiwake'), tapped ? 'opened by tapping its 3D pin' : 'pin off-screen; opened from the list');
  await shot('04-profile-discovered');
  // 6. accept the business mission
  const xpBeforeAccept = await xp();
  await page.click('.sheet [data-act=accept][data-id=visit_kittiwake]');
  await page.waitForTimeout(400);
  step('Accept the business mission', await M(() => window.__mayor.game.missionState(window.__mayor.game.mission('visit_kittiwake'))) === 'active');
  // 7. visit required
  const body = await page.textContent('.sheet');
  step('Game shows "Real-world visit required"', /real-world visit required/i.test(body) && await status(biz) === 'visit_required', await M(() => window.__mayor.game.locationStatus('kittiwake')));
  await shot('05-visit-required');
  // 8. no way to claim the visit from the virtual profile
  const claimButtons = await page.$$eval('.sheet button', (bs) => bs.map((b) => b.textContent.trim()).filter((t) => /claim|complete|mark as visited|collect/i.test(t)));
  step('Visit reward cannot be claimed from the virtual profile', claimButtons.length === 0 && (await xp()) === xpBeforeAccept, `XP unchanged at ${xpBeforeAccept}; only QR or labelled simulated check-in offered`);
  // 9–10. simulated QR check-in, validated by the demo service
  await page.click('.sheet .checkin-box [data-act=simulate]');
  await page.waitForSelector('.sheet .success');
  const res = await page.textContent('.sheet .success');
  step('Use the labelled simulated QR check-in', /simulated check-in/i.test(res));
  step('Check-in validated by the demo service', await M(() => { const c = window.__mayor.game.myCheckins(); return c.length === 1 && c[0].validatedBy === 'demo-client' && c[0].simulated === true; }));
  // 11–12. visited, mission complete
  step('Location status changes to "Visited"', await page.$eval('.sheet .transition', (el) => [...el.querySelectorAll('li.on')].map((l) => l.textContent).join('|')).then((t) => t.includes('Visited')));
  step('Mission marked complete', await M(() => window.__mayor.game.missionState(window.__mayor.game.mission('visit_kittiwake'))) === 'completed' && /Mission completed/.test(res));
  await shot('06-checkin-result');
  // 13. XP granted exactly once
  const gained = (await xp()) - xpBeforeAccept;
  step('Correct XP granted exactly once', gained === 150, `+${gained} XP (100 verified visit + 50 mission)`);
  // 14. stamps, achievements, mayoral progress
  const prog = await M(() => { const g = window.__mayor.game; return { stamps: g.stamps(), badge: !!g.p.achievements.first_stamp, visits: g.stats().visits, req: g.requirements(g.nextRank()).map((r) => r.label + ':' + (r.have ?? '')) }; });
  step('Stamps, achievements and mayoral progress update', prog.stamps.includes('kittiwake') && prog.badge && prog.visits === 1, JSON.stringify(prog));
  await M(() => window.__mayor.closeSheet());
  // 15. multi-location trail: the High Street Challenge
  await page.click('[data-tab=missions]'); await page.click('[data-act=mtab][data-val=available]');
  await page.click('.mission-card[data-id=high_street]'); await page.click('.sheet [data-act=accept][data-id=high_street]');
  for (const id of ['marram', 'lantern', 'oldsignal', 'shingle']) {
    await page.click('[data-tab=explore]'); await page.waitForTimeout(300);
    await discoverByExploring(id);
    await page.waitForFunction((i) => window.__mayor.game.isDiscovered(i), id, { timeout: 30000 });
    await M((i) => window.__mayor.openLocation(i), id);
    await page.click('.sheet .checkin-box [data-act=simulate]'); await page.waitForSelector('.sheet .success');
    await M(() => window.__mayor.closeSheet());
  }
  const trail = await M(() => { const g = window.__mayor.game; return { st: g.missionState(g.mission('high_street')), badge: !!g.p.achievements.high_street_hero, stamps: g.stamps().length }; });
  step('Complete a multi-location trail (High Street Challenge)', trail.st === 'completed' && trail.badge && trail.stamps === 5, JSON.stringify(trail));
  await M(() => window.__mayor.openMission('high_street')); await shot('07-trail-complete'); await M(() => window.__mayor.closeSheet());
  // 16. progress persists after refresh
  const before = await M(() => ({ xp: window.__mayor.game.xp(), stamps: window.__mayor.game.stamps().length, trail: window.__mayor.game.missionState(window.__mayor.game.mission('high_street')) }));
  await page.reload(); await page.waitForSelector('.rank-card', { timeout: 60000 });
  const after = await M(() => ({ xp: window.__mayor.game.xp(), stamps: window.__mayor.game.stamps().length, trail: window.__mayor.game.missionState(window.__mayor.game.mission('high_street')) }));
  step('Progress persists after refreshing', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  await shot('08-home-after-reload');
  // 17. invalid and repeated check-ins give nothing
  const x1 = await xp();
  await M(() => window.__mayor.checkin.open({ locationId: 'kittiwake' }));
  await page.fill('#code-input', 'FX-ABCD-2345'); await page.click('#code-form button[type=submit]');
  await page.waitForSelector('#checkin-msg .error'); const invalidMsg = await page.textContent('#checkin-msg');
  await page.click('.sheet .demo-box [data-act=simulate]'); await page.waitForTimeout(400); const repeatMsg = await page.textContent('#checkin-msg');
  await shot('09-invalid-repeat');
  step('Invalid and repeated check-ins grant nothing', (await xp()) === x1 && /recognise/.test(invalidMsg) && /already checked in/i.test(repeatMsg), `invalid: “${invalidMsg.trim()}” · repeat: “${repeatMsg.trim()}”`);
  await M(() => window.__mayor.closeSheet());
  // 18. leaderboard and profile
  await page.click('[data-tab=leaderboard]'); await page.waitForSelector('.board li.me'); await shot('10-leaderboard');
  const lb = await page.textContent('.board li.me');
  await page.click('[data-tab=profile]'); await page.waitForSelector('.stamps'); await shot('11-profile');
  const stampsShown = await page.$$eval('.stamp.got', (s) => s.length);
  step('View the leaderboard and the player profile', /TestResident/.test(lb) && stampsShown === 5, `leaderboard row: ${lb.replace(/\s+/g, ' ').trim()}; ${stampsShown} stamps shown`);
  // extra: admin QR page renders codes
  await page.click('[data-act=admin]'); await page.click('[data-act=admin][data-section=qr]'); await page.waitForSelector('.qr-card'); await shot('12-admin-qr');
  log.extra = { qrCards: await page.$$eval('.qr-card', (c) => c.length) };
  // extra (reputation and safety, beyond the 18 steps)
  await M(() => window.__mayor.closeSheet());
  await page.click('[data-tab=missions]'); await page.click('[data-act=mtab][data-val=stories]'); await page.waitForSelector('.mission-card.story'); await shot('13-town-stories');
  await page.click('.mission-card.story[data-id=keys]'); await page.waitForSelector('.choice'); await shot('14-story-choice');
  const t0 = await M(() => window.__mayor.game.rep().trust);
  await page.click('.choice[data-choice=warden]'); await page.waitForSelector('.sheet .dchips'); await shot('15-story-result');
  const t1 = await M(() => window.__mayor.game.rep().trust);
  await M(() => window.__mayor.closeSheet()); await page.click('[data-tab=profile]'); await page.waitForSelector('.rep-card'); await page.$eval('.rep-card', (el) => el.scrollIntoView()); await shot('16-reputation');
  await page.click('[data-act=report-open]'); await page.fill('#rp-text', 'Test report: check-in poster blocks a doorway.'); await page.click('#report-form button[type=submit]');
  const reports = await M(() => (window.__mayor.game.store.server.reports || []).length);
  await page.click('[data-act=admin]'); await page.click('[data-act=admin][data-section=safety]'); await page.waitForSelector('.admin-body'); await shot('17-admin-safety');
  log.extra.reputation = { trustBefore: t0, trustAfter: t1, refusedTemptationOk: t1 === t0 + 3, reports, level: await M(() => window.__mayor.game.repLevel().name) };
  console.log('EXTRA reputation', JSON.stringify(log.extra.reputation));
} catch (e) { log.errors.push('test aborted: ' + (e.stack || e)); console.log('ABORT', e.message); await shot('99-abort').catch(() => {}); }
log.finished = new Date().toISOString();
log.passed = log.steps.filter((s) => s.ok).length; log.total = log.steps.length;
writeFileSync(join(outDir, 'log.json'), JSON.stringify(log, null, 2));
console.log(`\n${log.passed}/${log.total} steps passed; ${log.errors.length} page errors${log.errors.length ? ': ' + log.errors.slice(0, 3).join(' | ') : ''}`);
await browser.close(); srv.kill();
process.exit(log.passed === log.total && log.total === 18 && !log.errors.length ? 0 : 1);
