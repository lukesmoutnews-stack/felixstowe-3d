// Node tests for the Race to Be Mayor rules (no browser).
import assert from 'node:assert/strict';
import { Game, QUIZZES, STOP_QUESTIONS } from '../../src/mayor/engine.js';
import { memoryStore } from '../../src/mayor/store.js';

let t = Date.parse('2026-10-12T09:00:00Z');
const results = [];
const test = (name, fn) => { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };
const fresh = () => { const st = memoryStore(); const g = new Game(st, () => t); g.createPlayer('Tester', '#0f7c7a'); return g; };

test('codes exist for every location and event', () => {
  const g = fresh(); for (const l of g.locations()) assert.ok(g.service.activeCode('location', l.id), l.id);
});
test('discovering gives the small discovery reward only', () => {
  const g = fresh(); const r = g.discover('kittiwake'); assert.equal(r.xpGained, g.config.xp.discover); assert.equal(g.locationStatus('kittiwake'), 'discovered');
  assert.equal(g.discover('kittiwake'), null, 'second discovery pays nothing');
});
test('accepting a mission does not complete it: visit required', () => {
  const g = fresh(); g.discover('kittiwake'); const xp0 = g.xp(); g.accept('visit_kittiwake');
  assert.equal(g.locationStatus('kittiwake'), 'visit_required'); assert.equal(g.xp(), xp0); assert.equal(g.missionState(g.mission('visit_kittiwake')), 'active');
});
test('simulated check-in validates, visits, completes and pays once', () => {
  const g = fresh(); g.discover('kittiwake'); g.accept('visit_kittiwake'); const xp0 = g.xp();
  const r = g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated');
  assert.ok(r.ok); assert.equal(r.checkin.simulated, true);
  assert.equal(g.xp() - xp0, g.config.xp.businessVisit + 50);
  assert.equal(g.locationStatus('kittiwake'), 'completed'); assert.equal(g.missionState(g.mission('visit_kittiwake')), 'completed');
  assert.deepEqual(g.stamps(), ['kittiwake']); assert.ok(g.p.achievements.first_stamp);
  const again = g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated');
  assert.equal(again.ok, false); assert.equal(again.error, 'duplicate_today'); assert.equal(g.xp() - xp0, g.config.xp.businessVisit + 50);
});
test('invalid, tampered, revoked and unreadable codes are rejected without reward', () => {
  const g = fresh(); const xp0 = g.xp();
  assert.equal(g.checkIn('FX-KITT-ZZZZ', 'typed').error, 'invalid');
  assert.equal(g.checkIn('hello', 'typed').error, 'unreadable');
  const pl = g.simulatedPayload('location', 'marram'); assert.equal(g.checkIn(pl.slice(0, -1) + (pl.endsWith('A') ? 'B' : 'A'), 'camera').error, 'tampered');
  const old = g.service.activeCode('location', 'marram').code; g.service.issue('location', 'marram');
  assert.equal(g.checkIn(old, 'typed').error, 'revoked'); assert.equal(g.xp(), xp0);
});
test('typed code works like a scan', () => {
  const g = fresh(); const code = g.service.activeCode('location', 'lantern').code; const r = g.checkIn(code.toLowerCase().replace(/-/g, ' '), 'typed'); assert.ok(r.ok, r.message);
});
test('rate limit', () => {
  const g = fresh(); let last; for (let i = 0; i < 12; i++) last = g.checkIn('FX-NOPE-2222', 'typed'); assert.equal(last.error, 'rate_limited');
});
test('High Street Challenge completes after five verified visits, with badge', () => {
  const g = fresh(); g.accept('high_street');
  for (const id of ['kittiwake', 'marram', 'lantern', 'oldsignal', 'shingle']) { g.discover(id); t += 1000; const r = g.checkIn(g.simulatedPayload('location', id), 'simulated'); assert.ok(r.ok, r.message); }
  assert.equal(g.missionState(g.mission('high_street')), 'completed'); assert.ok(g.p.achievements.high_street_hero); assert.ok(g.p.achievements.five_stamps);
});
test('repeat-visit challenge needs two different days', () => {
  const g = fresh(); g.accept('regular_kittiwake'); g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated');
  assert.equal(g.missionState(g.mission('regular_kittiwake')), 'active');
  g.store.server.clockOffsetDays = 1; const r = g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated'); assert.ok(r.ok, r.message);
  assert.equal(g.missionState(g.mission('regular_kittiwake')), 'completed'); assert.equal(g.p.ledger['visit:kittiwake'].xp, 100); assert.ok(g.p.achievements.regular);
});
test('quiz is remote-friendly and pays only through its mission', () => {
  const g = fresh(); g.accept('history_quiz'); const xp0 = g.xp();
  const r = g.answerQuiz('history', QUIZZES.history.questions.map((q) => q.c)); assert.ok(r.passed); assert.equal(g.xp() - xp0, 60); assert.ok(g.p.achievements.know_it_all);
});
test('seafront stop question counts as a stop but not as a visit', () => {
  const g = fresh(); const r = g.answerStop('pier', STOP_QUESTIONS.pier.c); assert.ok(r.correct); assert.equal(g.visitedIds().has('pier'), false); assert.ok(g.stepDone('stop:pier'));
});
test('final challenge is locked until Mayoral Candidate, then makes you Mayor for the season', () => {
  const g = fresh(); assert.equal(g.accept('mayoral_challenge').ok, false);
  // play everything
  for (const m of g.missions()) if (m.type !== 'final') g.accept(m.id);
  for (const l of g.locations()) { g.discover(l.id); t += 20000; g.checkIn(g.simulatedPayload('location', l.id), 'simulated'); }
  g.answerQuiz('history', QUIZZES.history.questions.map((q) => q.c)); g.answerQuiz('landguard', QUIZZES.landguard.questions.map((q) => q.c));
  t += 20000; g.checkIn(g.simulatedPayload('event', 'beach_clean'), 'simulated'); t += 20000;
  assert.equal(g.rank().id, 'advocate', 'an honest record alone is not enough: the landmark guardian wants Trust 60+');
  g.choose('keys', 'warden'); g.choose('wallet', 'return');
  assert.equal(g.rank().id, 'advocate', 'points alone are not enough: residents must back you (3 group endorsements)');
  // genuine support: listen to residents (and keep a promise)
  g.talk('elsie'); g.answer('elsie', 'start', 0); g.talk('tom'); g.answer('tom', 'start', 0); g.talk('jade'); g.answer('jade', 'start', 0); g.talk('kai'); g.answer('kai', 'start', 0);
  g.talk('bill'); g.answer('bill', 'start', 0); g.answer('bill', 'ask', 0); t += 20000; g.checkIn(g.simulatedPayload('location', 'town_hall_garden'), 'simulated');
  g.talk('nadia'); g.answer('nadia', 'start', 0); g.talk('dot'); g.answer('dot', 'start', 0);
  assert.equal(g.rank().id, 'candidate', `rank ${g.rank().id} ${JSON.stringify(g.stats())}`);
  assert.ok(g.accept('mayoral_challenge').ok);
  g.answerQuiz('mayoral', QUIZZES.mayoral.questions.map((q) => q.c)); const r = g.checkIn(g.simulatedPayload('event', 'town_meeting'), 'simulated');
  assert.ok(r.ok); assert.equal(g.rank().id, 'mayor'); assert.ok(g.p.achievements.mayor);
  const lb = g.leaderboard(); assert.ok(lb.find((x) => x.me));
  g.startNewSeason({ id: 's2', name: 'Season 2', start: '2027-01-01', end: '2027-03-31' });
  assert.equal(g.seasonPoints(), 0); assert.ok(g.xp() > 2000); assert.notEqual(g.rank().id, 'mayor'); assert.ok(g.p.achievements.mayor, 'lifetime badge kept');
});
test('analytics separate simulated check-ins and never count purchases', () => {
  const g = fresh(); g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated'); const a = g.analytics();
  assert.equal(a.checkins, 1); assert.equal(a.simulatedCheckins, 1); assert.equal(a.offerRedemptions, 0);
});
for (const r of results) console.log(r[0].padEnd(4), r[1], r[2] ? '— ' + r[2] : '');

test('reputation: starts at 50 everywhere, real visits raise Business, trails and events raise Community', () => {
  const g = fresh(); assert.equal(g.overall(), 50); assert.equal(g.repLevel().name, 'Known Face');
  g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated'); assert.equal(g.rep().business, 53);
  t += 20000; g.checkIn(g.simulatedPayload('location', 'pier'), 'simulated'); assert.equal(g.rep().community, 52);
  t += 20000; g.checkIn(g.simulatedPayload('event', 'beach_clean'), 'simulated'); assert.equal(g.rep().community, 60); assert.equal(g.rep().trust, 52);
});
test('reputation: refusing a temptation raises Trust; good deeds pay once', () => {
  const g = fresh(); const r = g.choose('keys', 'warden'); assert.ok(r.ok); assert.equal(g.rep().trust, 53); assert.equal(g.rep().community, 52);
  assert.equal(g.choose('keys', 'take').ok, false, 'a decision is final');
});
test('reputation: a taken temptation pays XP, starts a rumour, and is found on a seeded roll', () => {
  const g = fresh(); const xp0 = g.xp(); const r = g.choose('keys', 'take');
  assert.ok(r.ok); assert.equal(g.xp() - xp0, 40); assert.ok(g.rep().rumours.keys);
  const again = new Game(g.store, () => t); assert.equal(again.rep().rumours.keys.state, g.rep().rumours.keys.state, 'reloading cannot re-roll');
  if (g.rep().rumours.keys.state === 'found') { assert.equal(g.rep().trust, 35); assert.equal(g.activeMarks()[0].id, 'joyrider'); }
  else { assert.equal(g.hiddenRumours().length, 1); assert.equal(g.rep().trust, 50); }
});
test('reputation: confessing halves the penalty, gives +2 Trust back, and still leaves a Mark for serious offences', () => {
  const g = fresh(); g.choose('envelope', 'take');
  const x = g.rep().rumours.envelope;
  if (x.state === 'hidden') { const r = g.confess('envelope'); assert.ok(r.ok); assert.equal(g.rep().trust, 50 - 6 + 2); assert.equal(g.rep().business, 47); }
  assert.equal(g.activeMarks()[0].id, 'envelope'); assert.equal(g.repLevel().index <= 2, true);
});
test('reputation: a Mark caps its standing at 59 and blocks the finale until redemption clears it', () => {
  const g = fresh(); g.rep().marks.joyrider = { ts: t, story: 'keys' }; g.rep().community = 58;
  g.applyRep({ community: 8 }, { key: 'x', reason: 'test' }); assert.equal(g.rep().community, 59, 'ceiling');
  assert.equal(g.finalEligibility().items.find((i) => i.label === 'No active Marks').done, false);
  const s = g.story('polish'); assert.equal(g.storyState(s), 'available'); g.choose('polish');
  assert.equal(g.storyState(s), 'started'); t += 20000; g.checkIn(g.simulatedPayload('location', 'marram'), 'simulated');
  assert.equal(g.storyState(s), 'ready'); const r = g.choose('polish'); assert.ok(r.redeemed); assert.equal(g.activeMarks().length, 0);
});
test('reputation: repeatable gains are diminished and capped per day; losses are not capped', () => {
  const g = fresh(); for (let i = 0; i < 12; i++) g.applyRep({ trust: 3 }, { repeatable: true, kind: 'same', reason: 'r' });
  assert.equal(g.rep().trust, 50 + 3 + 1 + 0, 'diminishing returns 100%, 50%, 25%, 0');
  g.applyRep({ trust: -30 }, { reason: 'big loss' }); assert.equal(g.rep().trust, 24);
});
test('reputation: the press reveals every hidden rumour at 1.5x before the finale', () => {
  const g = fresh(); g.rep().rumours.tape = { story: 'tape', title: 'Under the Tape', chance: 0.25, penalty: { trust: -4, business: 0, community: 0 }, mark: null, state: 'hidden', ts: t };
  const f = g.rollRumours('finale'); assert.equal(f.length, 1); assert.equal(g.rep().trust, 44);
});
test('real-world check-ins only run 08:00-20:00; simulated demo check-ins are exempt; abandoning is free', () => {
  const g = fresh(); const night = Date.parse('2026-10-12T22:30:00Z'); const g2 = new Game(g.store, () => night);
  assert.equal(g2.checkIn(g2.service.activeCode('location', 'kittiwake').code, 'typed').error, 'outside_hours');
  assert.ok(g2.checkIn(g2.simulatedPayload('location', 'kittiwake'), 'simulated').ok);
  g.accept('history_quiz'); const before = JSON.stringify(g.rep()); assert.ok(g.abandon('history_quiz').ok); assert.equal(JSON.stringify(g.rep()), before);
});

test('news: completing a mission publishes a headline; news never changes reputation', () => {
  const g = fresh(); g.discover('kittiwake'); g.accept('visit_kittiwake'); g.takeNews();
  const before = JSON.stringify([g.rep().trust, g.rep().business, g.rep().community]);
  g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated');
  const types = g.news().map((a) => a.type); assert.ok(types.includes('mission_business'), types.join()); assert.ok(types.includes('first_checkin'));
  assert.equal(g.takeNews().length, 2); assert.equal(g.rep().business, 53, 'only the check-in itself moved reputation');
});
test('news: a negative fictional action that comes out gets a different, critical headline', () => {
  const g = fresh(); g.choose('keys', 'take'); if (g.rep().rumours.keys.state === 'hidden') g.rollRumours('finale');
  const a = g.news().find((x) => x.type === 'exposed'); assert.ok(a); assert.equal(a.tone, 'bad'); assert.match(a.headline, /Simulated Vehicle Theft/);
});
test('news: reaching a reputation milestone unlocks a special article', () => {
  const g = fresh(); g.applyRep({ trust: 15, business: 10, community: 10 }, { reason: 'test' }); g._after([]);
  const a = g.news().find((x) => x.type === 'level_up'); assert.ok(a && a.special); assert.match(a.headline, /Trusted Local/);
});

test('fictional vehicle theft in the 3D town starts a rumour; a second one risks the Joyrider mark; news reports it if found', () => {
  const g = fresh(); const r1 = g.vehicleTaken('Saloon'); assert.ok(r1.rumour); const r2 = g.vehicleTaken('Box truck'); assert.equal(r2.rumour.mark, 'joyrider');
  g.rollRumours('finale'); assert.ok(g.activeMarks().some((m) => m.id === 'joyrider')); assert.ok(g.news().some((a) => /Borrowed Vehicle|Vehicle Theft/.test(a.headline)));
  assert.ok(g.recklessDriving()); assert.equal(g.recklessDriving(), null, 'once a day');
});

test('influence: listening and keeping promises builds group support; rudeness and broken promises cost it', () => {
  const g = fresh(); const s0 = g.inf().groups.business;
  let r = g.talk('maggie'); assert.equal(r.nodeId, 'start'); g.answer('maggie', 'start', 0); g.answer('maggie', 'ask', 0);
  assert.ok(g.inf().groups.business > s0); assert.equal(g.openPromises().length, 1);
  g.checkIn(g.simulatedPayload('location', 'kittiwake'), 'simulated'); assert.equal(g.inf().promises.maggie_visit.status, 'kept');
  r = g.talk('maggie'); assert.equal(r.nodeId, 'kept', 'she remembers');
  const b0 = g.inf().groups.families; g.talk('kai'); g.answer('kai', 'start', 1); assert.ok(g.inf().groups.families < b0, 'being dismissive costs support');
  const g2 = fresh(); g2.talk('bill'); g2.answer('bill', 'start', 0); g2.answer('bill', 'ask', 0); const l0 = g2.inf().groups.longstanding;
  t += 11 * 86400000; g2.checkPromises(); assert.equal(g2.inf().promises.bill_shelter.status, 'broken'); assert.ok(g2.inf().groups.longstanding < l0);
});
test('influence: the same choice pleases one group and annoys another; effects pay once', () => {
  const g = fresh(); const before = { ...g.inf().groups }; g.talk('gus'); g.answer('gus', 'start', 1);
  assert.ok(g.inf().groups.visitors < before.visitors && g.inf().groups.longstanding > before.longstanding);
  const v = g.inf().groups.visitors; g.answer('gus', 'start', 1); assert.equal(g.inf().groups.visitors, v, 'no grinding the same line');
});
test('influence: residents react to reputation and the news; a Mark makes some refuse favours', () => {
  const g = fresh(); g.talk('pam'); g.answer('pam', 'start', 0);
  g.choose('envelope', 'take'); g.rollRumours('finale');
  const r = g.talk('pam'); assert.ok(r.greet && r.newsLine, 'greeting by reputation level and a reaction to the latest headline');
  let cold = 0; for (const id of ['maggie', 'jade', 'elsie', 'amara', 'gus', 'lucy', 'tom']) if (g.talk(id).cold) cold++; assert.ok(cold >= 1, 'some people won’t help until you put it right');
});
const failed = results.filter((r) => r[0] === 'FAIL').length; console.log(`\n${results.length - failed}/${results.length} mayor engine tests passed`); process.exit(failed ? 1 : 0);
