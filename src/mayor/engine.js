// Race to Be Mayor – game rules. Pure logic (no DOM), so it runs in tests and could move server-side.
//
// Rewards go through a ledger keyed by what earned them ("visit:kittiwake", "mission:high_street").
// A key can only be written once, so no action can pay out twice. In production the ledger lives on
// the server and is written only by the check-in, quiz and mission services.

import { LOCATIONS, EVENTS, MISSIONS, QUIZZES, STOP_QUESTIONS, RIVALS, ACHIEVEMENTS, COSMETICS, CHAPTERS } from './content.js';
import { mergeConfig } from './config.js';
import { DemoCheckinService, ukDay } from './checkin.js';
import { ReputationMixin, newRep, REP_RULES, LEVELS } from './reputation.js';
import { NewsMixin } from './news.js';
import { InfluenceMixin } from './influence.js';

export function ukHour(ts) { return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date(ts))); }

export const STATUS_LABEL = {
  undiscovered: 'Undiscovered', discovered: 'Discovered', accepted: 'Mission accepted',
  visit_required: 'Discovered — visit it in the 3D town', visited: 'Visited', completed: 'Mission completed',
};

export function newPlayerState() {
  return { v: 1, player: null, discovered: {}, accepted: {}, completed: {}, quizzes: {}, stops: {}, ledger: {}, achievements: {},
    rep: newRep(), news: [], look: null, career: [], equipped: { coat: 'coat_navy', hat: null, chain: false }, seasons: [], seasonId: null, feed: [] };
}

export class Game {
  /** store: { player, server, config } persisted objects (see store.js); clock: () => ms */
  constructor(store, clock = () => Date.now()) {
    this.store = store; this.clock = clock;
    this.reloadConfig();
  }
  reloadConfig() {
    this.config = mergeConfig(this.store.config);
    const s = this.store.server;
    this.service = new DemoCheckinService(s, { config: this.config, now: () => this.now(), targetInfo: (type, id) => this.targetInfo(type, id) });
    this.service.ensureCodes([...this.locations().map((l) => ['location', l.id]), ...EVENTS.map((e) => ['event', e.id])]);
    const p = this.p; if (p && !p.seasonId) p.seasonId = this.config.season.id;
  }
  get p() { return this.store.player; }
  now() { return this.clock() + (this.store.server.clockOffsetDays || 0) * 86400000; }
  save() { this.store.save?.(); }

  // ---------- content (seed + admin overrides) ----------
  locations({ all = false } = {}) {
    const over = this.store.server.content?.locations || {};
    const list = LOCATIONS.map((l) => ({ ...l, ...(over[l.id] || {}) }));
    for (const [id, l] of Object.entries(over)) if (!LOCATIONS.some((x) => x.id === id)) list.push({ id, kind: 'business', demo: true, trails: [], ...l });
    return all ? list : list.filter((l) => l.active !== false);
  }
  loc(id) { return this.locations({ all: true }).find((l) => l.id === id) || null; }
  missions({ all = false } = {}) {
    const over = this.store.server.content?.missions || {};
    const list = MISSIONS.map((m) => ({ ...m, ...(over[m.id] || {}) }));
    for (const [id, m] of Object.entries(over)) if (!MISSIONS.some((x) => x.id === id)) list.push({ id, category: 'business', steps: [], xp: 50, ...m });
    return all ? list : list.filter((m) => m.active !== false);
  }
  mission(id) { return this.missions({ all: true }).find((m) => m.id === id) || null; }
  eventName(id) { return EVENTS.find((e) => e.id === id)?.name || id; }
  targetInfo(type, id) {
    if (type === 'event') { const e = EVENTS.find((x) => x.id === id); return e ? { kind: 'event', active: true } : null; }
    const l = this.loc(id); return l ? { kind: l.kind, active: l.active !== false } : null;
  }

  // ---------- player ----------
  createPlayer(name, colour) {
    const p = this.p; p.player = { id: 'p_' + Math.random().toString(36).slice(2, 10), name: String(name).trim().slice(0, 20) || 'Resident', colour, createdAt: this.now() };
    p.seasonId = this.config.season.id; p.career.push({ rank: 'newcomer', ts: this.now() });
    this._feed('Joined the race as a Newcomer.'); this._event('player_created'); this.save();
  }
  myCheckins() { const id = this.p.player?.id; return this.store.server.checkins.filter((c) => c.playerId === id); }
  visitedIds(kind = null) { const set = new Set(); for (const c of this.myCheckins()) if (c.type === 'location' && (!kind || this.loc(c.target)?.kind === kind)) set.add(c.target); return set; }
  stamps() { return [...this.visitedIds('business')]; }

  // ---------- XP ledger ----------
  _grant(key, xp, label) {
    if (this.p.ledger[key]) return null;
    this.p.ledger[key] = { xp, label, ts: this.now(), season: this.p.seasonId }; return { key, xp, label };
  }
  xp() { return Object.values(this.p.ledger).reduce((s, e) => s + e.xp, 0); }
  seasonPoints() { return Object.values(this.p.ledger).filter((e) => e.season === this.p.seasonId).reduce((s, e) => s + e.xp, 0); }

  // ---------- discovery ----------
  isDiscovered(id) { return !!this.p.discovered[id]; }
  discover(id) {
    if (this.p.discovered[id] || !this.loc(id)) return null;
    this.p.discovered[id] = this.now();
    const g = this._grant('discover:' + id, this.config.xp.discover, `Discovered ${this.loc(id).name}`);
    this._event('discover', { target: id });
    const out = this._after([g].filter(Boolean)); this.save(); return out;
  }

  // ---------- missions ----------
  missionLocations(m) { const ids = new Set(); for (const s of m.steps) { const [k, a] = s.split(':'); if (['discover', 'visit', 'stop', 'repeat'].includes(k)) ids.add(a); } if (m.eventId) ids.add(EVENTS.find((e) => e.id === m.eventId)?.locationId); return [...ids].filter(Boolean); }
  stepDone(step) {
    const [k, a, b] = step.split(':');
    if (k === 'discover') return this.isDiscovered(a);
    if (k === 'visit') return this.visitedIds().has(a);
    if (k === 'stop') return this.visitedIds().has(a) || !!this.p.stops[a];
    if (k === 'visitAny') return this.visitedIds(b).size >= Number(a);
    if (k === 'quiz') return !!this.p.quizzes[a]?.passed;
    if (k === 'event') return this.myCheckins().some((c) => c.type === 'event' && c.target === a);
    if (k === 'repeat') return new Set(this.myCheckins().filter((c) => c.target === a).map((c) => c.day)).size >= Number(b);
    if (k === 'stamps') return this.stamps().length >= Number(a);
    if (k === 'rank') return this.rankIndex() >= this.config.ranks.findIndex((r) => r.id === a);
    return false;
  }
  stepLabel(step, m) {
    const [k, a, b] = step.split(':'); const n = (id) => this.loc(id)?.name || id;
    const hidden = m?.hideTarget && !this.stepDone(step);
    if (k === 'discover') return `Find ${n(a)} in the 3D town`;
    if (k === 'visit') return hidden ? 'Visit the place the riddle describes' : `Visit ${n(a)} in the 3D town`;
    if (k === 'stop') return `${n(a)}: check in, or answer the stop question`;
    if (k === 'visitAny') return `Check in at ${a} different ${b}s (${this.visitedIds(b).size}/${a})`;
    if (k === 'quiz') return `Pass the ${QUIZZES[a]?.title || a}`;
    if (k === 'event') return `Check in at ${EVENTS.find((e) => e.id === a)?.name || a}`;
    if (k === 'repeat') { const d = new Set(this.myCheckins().filter((c) => c.target === a).map((c) => c.day)).size; return `Check in at ${n(a)} on ${b} different days (${Math.min(d, b)}/${b})`; }
    if (k === 'stamps') return `Collect ${a} business stamps (${Math.min(this.stamps().length, a)}/${a})`;
    if (k === 'rank') return `Reach the rank of ${this.config.ranks.find((r) => r.id === a)?.name}`;
    return step;
  }
  stepKind(step) { const k = step.split(':')[0]; return { discover: 'virtual', visit: 'physical', stop: 'either', visitAny: 'physical', quiz: 'anywhere', event: 'physical', repeat: 'physical', stamps: 'physical', rank: 'progress' }[k] || 'other'; }
  progress(m) { const steps = m.steps.map((s) => ({ step: s, label: this.stepLabel(s, m), done: this.stepDone(s), kind: this.stepKind(s) })); return { steps, done: steps.filter((s) => s.done).length, total: steps.length }; }
  missionState(m) {
    if (this.p.completed[m.id] && (m.type !== 'final' || this.p.completed[m.id].season === this.p.seasonId)) return 'completed';
    if (this.p.accepted[m.id]) return 'active';
    if (m.type === 'final' && !this.stepDone('rank:candidate')) return 'locked';
    return 'available';
  }
  accept(id) {
    const m = this.mission(id); if (!m) return { ok: false, message: 'Mission not found.' };
    const st = this.missionState(m);
    if (st === 'locked') return { ok: false, message: 'Reach the rank of Mayoral Candidate to unlock the final challenge.' };
    if (st !== 'available') return { ok: false, message: 'Already accepted.' };
    if (m.type === 'final') { // the press digs into every candidate first: hidden rumours come out at 1.5x
      const found = this.rollRumours('finale'); const el = this.finalEligibility();
      if (!el.ok) { this.save(); return { ok: false, found, eligibility: el, message: 'The Town Hall steps aren’t open to you yet: ' + el.items.filter((i) => !i.done).map((i) => i.label).join(', ') + '.' }; }
      this.p.accepted[id] = this.now(); this._event('mission_start', { mission: id }); this.publish('final_open', { key: 'final_open:' + this.p.seasonId }); const out = this._after([]); this.save(); return { ok: true, found, ...out };
    }
    this.p.accepted[id] = this.now(); this._event('mission_start', { mission: id, sponsored: !!m.sponsored });
    const out = this._after([]); this.save(); return { ok: true, ...out };
  }

  abandon(id) { // leaving a mission never costs anything
    if (!this.p.accepted[id] || this.p.completed[id]) return { ok: false, message: 'Not an active mission.' };
    delete this.p.accepted[id]; this._event('mission_abandon', { mission: id }); this._feed(`Paused “${this.mission(id)?.title}”. No penalty.`); this.save(); return { ok: true };
  }
  report(category, text) { // demo: stored locally for the admin "Safety" view; production sends it to the trust & safety queue
    const r = { id: 'rp_' + this.now().toString(36), category, text: String(text || '').slice(0, 500), ts: this.now(), player: this.p.player?.id || null, status: 'new' };
    (this.store.server.reports ||= []).push(r); this._event('report', { category }); this.save(); return { ok: true, report: r };
  }

  // ---------- location status ----------
  locationStatus(id) {
    if (!this.isDiscovered(id)) return 'undiscovered';
    const visited = this.visitedIds().has(id);
    const here = this.missions().filter((m) => this.missionLocations(m).includes(id));
    const open = here.filter((m) => this.missionState(m) === 'active');
    const done = here.some((m) => this.missionState(m) === 'completed');
    if (open.length && !visited) return open.some((m) => m.steps.some((s) => s === `visit:${id}` || s === `stop:${id}` || s.startsWith(`repeat:${id}`) || s.startsWith('visitAny'))) ? 'visit_required' : 'accepted';
    if (visited && done && !open.length) return 'completed';
    if (visited) return 'visited';
    if (open.length) return 'accepted';
    return 'discovered';
  }
  primaryMission(id) { const l = this.loc(id); if (l?.kind === 'business') return this.mission('visit_' + id); return this.missions().find((m) => m.steps.includes(`visit:${id}`) || m.steps.includes(`stop:${id}`)) || null; }

  // ---------- check-in ----------
  checkIn(input, method) {
    if (!this.p.player) return { ok: false, message: 'Create a player profile first.' };
    const [h0, h1] = this.config.realWorldHours || [8, 20]; const hr = ukHour(this.now());
    if (method !== 'simulated' && (hr < h0 || hr >= h1)) { this._event('checkin_rejected', { error: 'outside_hours' }); return { ok: false, error: 'outside_hours', message: `Real-world check-ins run ${h0}:00–${h1}:00 so nobody is sent out after dark. Try again in daylight hours.` }; }
    const r = this.service.checkIn({ playerId: this.p.player.id, input, method });
    if (!r.ok) { this.save(); return r; }
    const c = r.checkin, rewards = [];
    if (c.type === 'location') {
      const l = this.loc(c.target);
      if (!this.p.discovered[c.target]) { this.p.discovered[c.target] = this.now(); } // a visit also discovers it (no discovery XP)
      const xp = l.kind === 'business' ? this.config.xp.businessVisit : this.config.xp.landmarkVisit;
      const g = this._grant('visit:' + c.target, xp, `Visited ${l.name}`); if (g) rewards.push(g);
      this._feed(`Visited ${l.name}.`);
    } else { const e = EVENTS.find((x) => x.id === c.target); this._feed(`Joined in at ${e.name}.`); }
    const repApplied = this.repOnCheckin(c, r.first); this.influenceOnCheckin(c, r.first);
    if (this.myCheckins().length === 1) this.publish('first_checkin', { place: c.type === 'event' ? this.eventName(c.target) : this.loc(c.target)?.name, link: { kind: 'loc', id: c.target } });
    const out = this._after(rewards); this.save();
    return { ok: true, checkin: c, first: r.first, repApplied, ...out };
  }
  simulatedPayload(type, id) { const c = this.service.activeCode(type, id); return c ? this.service.payload(c) : null; }

  // ---------- quizzes ----------
  answerQuiz(id, answers) {
    const q = QUIZZES[id]; const score = q.questions.reduce((s, x, i) => s + (answers[i] === x.c ? 1 : 0), 0);
    const prev = this.p.quizzes[id] || {}; let passed = score >= q.pass; const rp = this.rep(); let crib = false;
    if (!passed && rp.crib) { passed = true; crib = true; rp.crib = false; } // the fictional crib sheet
    this.p.quizzes[id] = { best: Math.max(prev.best || 0, score), passed: prev.passed || passed, passedAt: prev.passedAt || (passed ? this.now() : null), attempts: (prev.attempts || 0) + 1 };
    this._event('quiz', { quiz: id, score, passed, crib });
    const repApplied = this.repOnQuiz(id, passed, this.p.quizzes[id].attempts, crib);
    const rewards = []; if (score === q.questions.length && id === 'history') this._achieve('know_it_all', rewards);
    const out = this._after(rewards); this.save(); return { score, total: q.questions.length, passed, crib, repApplied, ...out };
  }
  answerStop(id, choice) {
    const q = STOP_QUESTIONS[id]; const correct = choice === q.c; const rewards = [];
    if (correct && !this.p.stops[id]) { this.p.stops[id] = this.now(); const g = this._grant('stop:' + id, this.config.xp.stopQuestion, `Stop question: ${this.loc(id).name}`); if (g) rewards.push(g); }
    const out = this._after(rewards); this.save(); return { correct, ...out };
  }

  // ---------- ranks ----------
  stats() {
    const ms = this.missions();
    return {
      xp: this.xp(), visits: this.visitedIds().size, stamps: this.stamps().length,
      trails: ms.filter((m) => m.type === 'trail' && this.missionState(m) === 'completed').length,
      community: ms.filter((m) => m.category === 'community' && this.missionState(m) === 'completed').length,
      quiz: !!this.p.quizzes.history?.passed,
      missions: ms.filter((m) => m.type !== 'final' && this.missionState(m) === 'completed').length + (this.p.completed.mayoral_challenge?.season === this.p.seasonId ? 1 : 0),
      mayor: this.p.completed.mayoral_challenge?.season === this.p.seasonId, // read directly: missionState(final) depends on rank
    };
  }
  meets(rank, st = this.stats()) {
    if (rank.final) return st.mayor;
    return st.xp >= rank.xp && st.visits >= rank.visits && st.trails >= rank.trails && st.community >= rank.community && (!rank.quiz || st.quiz) && this.repGate(rank.id).ok;
  }
  rankIndex() { // a rank once earned is kept, even if reputation later dips
    const st = this.stats(), ranks = this.config.ranks; let i = 0; ranks.forEach((r, k) => { if (this.meets(r, st)) i = k; });
    for (const c of this.p.career) { const k = ranks.findIndex((r) => r.id === c.rank); if (k > i && !ranks[k].final) i = k; }
    return i;
  }
  rank() { return this.config.ranks[this.rankIndex()]; }
  chapter() { const r = this.rank(); return { ...CHAPTERS[r.id], rank: r }; }
  hub() { return this.locations().find((l) => l.hub) || null; }
  nextRank() { return this.config.ranks[this.rankIndex() + 1] || null; }
  requirements(rank) {
    const st = this.stats(); if (!rank) return [];
    if (rank.final) return [{ label: 'Complete the Mayoral Challenge', done: st.mayor }];
    return [
      { label: `${rank.xp} XP`, done: st.xp >= rank.xp, have: st.xp, need: rank.xp },
      rank.visits && { label: `${rank.visits} verified visits`, done: st.visits >= rank.visits, have: st.visits, need: rank.visits },
      rank.trails && { label: `${rank.trails} trail${rank.trails > 1 ? 's' : ''} completed`, done: st.trails >= rank.trails, have: st.trails, need: rank.trails },
      rank.community && { label: `${rank.community} community mission`, done: st.community >= rank.community, have: st.community, need: rank.community },
      rank.quiz && { label: 'Pass the history quiz', done: st.quiz },
      REP_RULES.rankGates[rank.id] && { label: `Overall reputation ${REP_RULES.rankGates[rank.id]}+`, done: this.overall() >= REP_RULES.rankGates[rank.id], have: this.overall(), need: REP_RULES.rankGates[rank.id], rep: true },
      ...(rank.id === 'candidate' ? [{ label: `3 group endorsements (${this.endorsements().filter((e) => e.ok).length}/3)`, done: this.endorsements().filter((e) => e.ok).length >= 3, rep: true }] : []),
    ].filter(Boolean);
  }
  cosmeticsUnlocked() { const ri = this.rankIndex(); return COSMETICS.filter((c) => this.config.ranks.findIndex((r) => r.id === c.rank) <= ri); }

  // ---------- after every action: missions, achievements, rank ----------
  _after(rewards) {
    const completed = [], before = this.rankIndex();
    let changed = true;
    while (changed) { // completing one mission can satisfy another (e.g. rank steps)
      changed = false;
      for (const m of this.missions()) {
        if (this.missionState(m) !== 'active') continue;
        if (!m.steps.every((s) => this.stepDone(s))) continue;
        if (m.type === 'final' && !this.finalEligibility().ok) continue;
        this.p.completed[m.id] = { ts: this.now(), season: this.p.seasonId };
        const g = this._grant(m.type === 'final' ? `mission:${m.id}:${this.p.seasonId}` : `mission:${m.id}`, m.xp, `Mission complete: ${m.title}`); if (g) rewards.push(g);
        if (m.badge) this._achieve(m.badge, rewards);
        if (m.category === 'community') this._achieve('good_neighbour', rewards);
        this.repOnMission(m); this.influenceOnMission(m);
        if (m.type === 'final') this.publish('mayor', { key: 'mayor:' + this.p.seasonId });
        else this.publish(m.type === 'trail' ? 'mission_trail' : 'mission_' + m.category, { id: m.id, title: m.title, place: this.loc(m.locationId)?.name, link: { kind: 'mission', id: m.id } });
        if (m.type === 'final') { this.p.seasons.push({ season: this.p.seasonId, title: 'Mayor of Felixstowe', ts: this.now() }); }
        this._event('mission_complete', { mission: m.id, sponsored: !!m.sponsored, trail: m.type === 'trail' });
        this._feed(`Completed “${m.title}”.`); completed.push(m); changed = true;
      }
    }
    const st = this.stats();
    if (Object.keys(this.p.discovered).length) this._achieve('first_steps', rewards);
    if (st.stamps >= 1) this._achieve('first_stamp', rewards);
    if (st.stamps >= 5) this._achieve('five_stamps', rewards);
    if (st.stamps >= this.locations().filter((l) => l.kind === 'business').length) this._achieve('all_stamps', rewards);
    if (this.visitedIds('landmark').size >= 5) this._achieve('landmark_hunter', rewards);
    if (this.locations().some((l) => new Set(this.myCheckins().filter((c) => c.target === l.id).map((c) => c.day)).size >= 2)) this._achieve('regular', rewards);
    const after = this.rankIndex(); let rankUp = null, found = [];
    if (after > before) { rankUp = this.config.ranks[after]; this.p.career.push({ rank: rankUp.id, ts: this.now() }); this._feed(`Promoted to ${rankUp.name}.`); if (rankUp.id === 'candidate') this._achieve('candidate', rewards); found = this.rollRumours('rank:' + rankUp.id); this.publish('rank', { rank: rankUp.id, name: rankUp.name }); }
    this.checkPromises(); this._newsChecks();
    return { found, rewards, xpGained: rewards.reduce((s, r) => s + (r.xp || 0), 0), completed, rankUp, achievements: rewards.filter((r) => r.achievement).map((r) => r.achievement) };
  }
  _achieve(id, rewards) { if (this.p.achievements[id]) return; this.p.achievements[id] = this.now(); const a = ACHIEVEMENTS.find((x) => x.id === id); rewards.push({ key: 'ach:' + id, xp: 0, label: `Badge: ${a?.title || id}`, achievement: a }); this._feed(`Earned the “${a?.title}” badge.`); }
  _feed(text) { this.p.feed.unshift({ text, ts: this.now() }); this.p.feed.length = Math.min(this.p.feed.length, 60); }
  _event(type, data = {}) { this.store.server.analytics.push({ t: this.now(), type, player: this.p.player?.id, ...data }); }

  // ---------- season & leaderboard ----------
  leaderboard() {
    const s = this.config.season, days = Math.max(0, Math.floor((this.now() - Date.parse(s.start)) / 86400000));
    const stageFor = (pts) => { let r = this.config.ranks[0]; for (const k of this.config.ranks) if (!k.final && pts >= k.xp) r = k; return r.name; };
    const rows = RIVALS.map((r) => ({ id: r.id, name: r.name, colour: r.colour, points: r.base + r.rate * days, stage: '', demo: true }));
    rows.forEach((r) => { r.stage = stageFor(r.points); });
    if (this.p.player) rows.push({ id: 'me', name: this.p.player.name, colour: this.p.player.colour, points: this.seasonPoints(), stage: this.rank().name, me: true });
    rows.sort((a, b) => b.points - a.points); rows.forEach((r, i) => { r.place = i + 1; });
    return rows;
  }
  startNewSeason(next) { // admin: archive this season; lifetime XP, stamps and badges are kept
    const p = this.p; p.seasons.push({ season: p.seasonId, points: this.seasonPoints(), rank: this.rank().name, ts: this.now(), ended: true });
    this.store.config = { ...(this.store.config || {}), season: next }; this.reloadConfig(); p.seasonId = next.id;
    delete p.accepted.mayoral_challenge; this.save();
  }

  // ---------- analytics (aggregated; a check-in is never treated as a purchase) ----------
  analytics() {
    const a = this.store.server.analytics, ci = this.store.server.checkins.filter((c) => c.type === 'location');
    const byLoc = {};
    for (const c of ci) { const r = (byLoc[c.target] ||= { checkins: 0, simulated: 0, players: new Set(), repeat: 0 }); r.checkins++; if (c.simulated) r.simulated++; if (r.players.has(c.playerId)) r.repeat++; r.players.add(c.playerId); }
    const players = new Set(a.filter((e) => e.type === 'player_created').map((e) => e.player));
    const weekAgo = this.now() - 7 * 86400000;
    const ms = this.missions(); const trailIds = ms.filter((m) => m.type === 'trail').map((m) => m.id);
    const starts = a.filter((e) => e.type === 'mission_start'), comps = a.filter((e) => e.type === 'mission_complete');
    return {
      players: players.size, activePlayers: new Set(a.filter((e) => e.t > weekAgo && e.player).map((e) => e.player)).size,
      missionStarts: starts.length, missionCompletions: comps.length,
      checkins: ci.length, simulatedCheckins: ci.filter((c) => c.simulated).length, rejected: a.filter((e) => e.type === 'checkin_rejected').length,
      byLocation: Object.entries(byLoc).map(([id, r]) => ({ id, name: this.loc(id)?.name || id, checkins: r.checkins, simulated: r.simulated, unique: r.players.size, repeat: r.repeat })),
      offerRedemptions: 0, // not implemented: a redemption must be confirmed by the business, not inferred from a check-in
      sponsored: ms.filter((m) => m.sponsored).map((m) => ({ id: m.id, title: m.title, starts: starts.filter((e) => e.mission === m.id).length, completions: comps.filter((e) => e.mission === m.id).length })),
      trails: trailIds.map((id) => ({ id, title: this.mission(id).title, starts: starts.filter((e) => e.mission === id).length, completions: comps.filter((e) => e.mission === id).length })),
    };
  }
}

Object.assign(Game.prototype, ReputationMixin, NewsMixin, InfluenceMixin, {
  /** Reputation milestones and endorsements make the news (the news itself never changes reputation). */
  _newsChecks() {
    if (!this.p.player) return;
    const r = this.rep(), lv = this.repLevel(); const prev = r.lastLevel ?? 2; r.peak = Math.max(r.peak ?? 2, lv.index);
    if (lv.index > prev && lv.index >= 3) this.publish('level_up', { key: 'level_up:' + lv.id, level: lv.id, name: lv.name, link: { kind: 'profile' } });
    if (lv.index < prev && lv.index <= 1) this.publish('level_down', { key: `level_down:${lv.id}:${this.now()}`, level: lv.id, name: lv.name, link: { kind: 'profile' } });
    r.lastLevel = lv.index;
    r.endorsed ||= {};
    for (const e of this.endorsements()) if (e.ok && !r.endorsed[e.id]) { r.endorsed[e.id] = this.now(); this.publish('endorsement', { id: e.id, name: e.name.replace(/ \(fictional\)/, ''), link: { kind: 'profile' } }); }
  },
});

export { LOCATIONS, EVENTS, MISSIONS, QUIZZES, STOP_QUESTIONS, RIVALS, ACHIEVEMENTS, COSMETICS, CHAPTERS, ukDay };
