// Race to Be Mayor – reputation. Three standings (Public Trust, Business Support, Community Standing),
// fictional temptations that start rumours, Marks that only redemption clears, and the gates on the
// road to the Town Hall steps. Pure logic, installed onto Game (see engine.js).
//
// Every misdeed here happens only in the story: taps and text choices in the 3D town with invented
// characters. Real-world steps are only ordinary check-ins at participating places or organised events.

import { ukDay } from './checkin.js';

export const STANDINGS = [
  { id: 'trust', name: 'Public Trust', short: 'Trust', blurb: 'Honesty and fair play. Can the town believe you?' },
  { id: 'business', name: 'Business Support', short: 'Business', blurb: 'Whether local traders want you in their corner.' },
  { id: 'community', name: 'Community Standing', short: 'Community', blurb: 'How residents feel about you.' },
];
export const WEIGHTS = { trust: 0.4, business: 0.3, community: 0.3 };

export const LEVELS = [ // lowest first
  { id: 'pariah', name: 'Persona Non Grata', min: 0, line: 'Felixstowe News (game edition) has your photo on page one, and not in a good way.' },
  { id: 'cloud', name: 'Under a Cloud', min: 20, line: 'Curtains twitch. Some traders find they’re “just closing”.' },
  { id: 'known', name: 'Known Face', min: 40, line: 'Everyone starts here. Polite nods, no favours yet.' },
  { id: 'trusted', name: 'Trusted Local', min: 60, line: 'Most people are on your side, and endorsements start coming.' },
  { id: 'pillar', name: 'Pillar of the Town', min: 80, line: 'People wave across the Triangle. Doors open.' },
];

export const REP_RULES = {
  start: 50, dailyCap: 8, diminishing: [1, 0.5, 0.25, 0], markCeiling: 59, refuseBonus: { trust: 3 },
  confessBonus: { trust: 2 }, confessMult: 0.5, finaleMult: 1.5, heatPerRumour: 0.1,
  rankGates: { newcomer: 0, explorer: 0, champion: 40, advocate: 50, candidate: 55 },
  final: { overall: 60, trust: 55 }, endorse: 60, endorsementsNeeded: 3,
};

export const MARKS = {
  joyrider: { name: 'Joyrider', standing: 'community', story: 'keys', fix: 'polish' },
  envelope: { name: 'Took the Envelope', standing: 'business', story: 'envelope', fix: 'return_sender' },
  crib: { name: 'Crib Sheet', standing: 'trust', story: 'crib', fix: 'resit' },
};

// The fictional cast. None of them is a real person; all appear only inside the game.
export const CAST = {
  quill: 'Marjorie Quill, Seafront First candidate (fictional)',
  rex: 'Rex Harbourne, developer-backed candidate (fictional)',
  dot: 'Dot Pennywhistle, tea-hut candidate (fictional)',
  del: 'Dodgy Del (fictional)',
};

const T = (trust = 0, business = 0, community = 0) => ({ trust, business, community });

// kind: deed | temptation | risky | redemption. `where` is the location the story is pinned to in the 3D town.
export const STORIES = [
  // ---------- good deeds ----------
  { id: 'bun_run', kind: 'deed', group: 'business', title: 'Bun Run', where: 'kittiwake', who: 'The Kittiwake’s baker (fictional)',
    text: 'The Bakehouse delivery bike has a puncture and forty morning buns are due at the Spa Pavilion. “Any chance you could run them down?”',
    choices: [{ id: 'help', label: 'Carry the buns to the Spa', effect: T(0, 2, 3), xp: 30, outcome: 'The buns arrive warm. The baker promises to remember your name.' },
      { id: 'pass', label: 'Sorry, busy', effect: T(), outcome: 'The baker sighs and phones a cousin.' }] },
  { id: 'biscuit', kind: 'deed', group: 'families', title: 'Where’s Biscuit?', where: 'spa', who: 'A dog walker on the prom (fictional)',
    text: 'A spaniel called Biscuit has slipped his lead somewhere in the cliff gardens. His owner is beside herself.',
    choices: [{ id: 'help', label: 'Follow the paw prints', effect: T(0, 0, 3), xp: 30, outcome: 'Biscuit was asleep under a bench. Tail-wagging all round.' },
      { id: 'pass', label: 'Leave it to someone else', effect: T(), outcome: 'Someone else finds him. You hear about it later.' }] },
  { id: 'change', kind: 'deed', group: 'business', title: 'Too Much Change', where: 'shingle', who: 'The Shingle Pantry’s shopkeeper (fictional)',
    text: 'In the story, you pay for a picnic tin and get change from a £20 note instead of a fiver.',
    choices: [{ id: 'return', label: 'Hand the extra back', effect: T(3, 2, 0), xp: 20, outcome: '“Honest as the tide,” says the shopkeeper. Word gets round.' },
      { id: 'keep', label: 'Say nothing and pocket it', effect: T(), xp: 15, rumour: { chance: 0.5, penalty: T(-6, -2, 0) }, outcome: 'Fifteen pounds richer in the story. For now.' }] },
  { id: 'wallet', kind: 'deed', group: 'longstanding', title: 'Bench Wallet', where: 'triangle', who: 'Nobody, yet',
    text: 'A wallet sits on a bench at the Triangle in the 3D town. There’s a library card inside.',
    choices: [{ id: 'return', label: 'Take it to the station lost-property desk', effect: T(4, 0, 0), xp: 25, outcome: 'Its owner leaves a thank-you note on the noticeboard.' },
      { id: 'ignore', label: 'Leave it where it is', effect: T(), outcome: 'It’s gone when you look back.' }] },
  { id: 'pier_lights', kind: 'deed', group: 'visitors', title: 'Pier Lights Committee', where: 'pier', who: 'The Pier Lights Committee (fictional)', minOverall: 60,
    text: 'Only Trusted Locals get asked: will you help string the autumn lights along the pier building?',
    choices: [{ id: 'help', label: 'Grab a ladder (in the game)', effect: T(2, 2, 4), xp: 40, outcome: 'The lights go on and the prom cheers.' },
      { id: 'pass', label: 'Not this time', effect: T(), outcome: 'They ask again next week.' }] },

  // ---------- temptations ----------
  { id: 'keys', kind: 'temptation', title: 'Keys in the Ignition', where: 'spa', who: 'The fictional Mayor’s vintage roadster',
    text: 'A gleaming vintage roadster is parked by the Spa Pavilion with the keys in. A spin would get you to Landguard in seconds.',
    choices: [{ id: 'take', label: 'Take it for a spin', effect: T(), xp: 40, rumour: { chance: 0.75, penalty: T(-15, 0, -8), mark: 'joyrider' }, outcome: 'Wind in your hair, seagulls scattering. Nobody saw. Probably.' },
      { id: 'warden', label: 'Hand the keys to the warden', effect: T(3, 0, 2), outcome: 'The owner is mortified and very grateful.' }] },
  { id: 'envelope', kind: 'temptation', title: 'The Envelope', where: 'town_hall', who: CAST.rex,
    text: 'Rex Harbourne’s fixer sidles up outside the Town Hall with a fat envelope of “campaign funds”. All you need to do is back his flats on the Seafront Lawn.',
    choices: [{ id: 'take', label: 'Take the envelope', effect: T(), xp: 60, rumour: { chance: 0.75, penalty: T(-12, -6, 0), mark: 'envelope' }, outcome: 'It’s heavy. Your campaign suddenly looks very glossy.' },
      { id: 'refuse', label: 'Tell him where to put it', effect: T(3, 0, 0), outcome: 'He shrugs. “Your loss.”' }] },
  { id: 'crib', kind: 'temptation', title: 'Crib Sheet', where: 'museum', who: CAST.quill,
    text: 'Marjorie Quill’s intern has dropped a sheet of quiz answers on a bench.',
    choices: [{ id: 'take', label: 'Pocket the answers', effect: T(), xp: 0, crib: true, rumour: { chance: 0.5, penalty: T(-10, 0, 0), mark: 'crib' }, outcome: 'Your next quiz will pass itself. Feels a bit hollow.' },
      { id: 'return', label: 'Return the sheet', effect: T(3, 0, 0), outcome: 'Marjorie raises an eyebrow. “I owe you one.”' }] },
  { id: 'stars', kind: 'temptation', title: 'Stars for Stars', where: 'marram', who: 'A market trader (fictional)',
    text: 'A trader at the story’s Sunday market offers a deal: five stars for his stall from you, five stars for your campaign from him.',
    choices: [{ id: 'take', label: 'Shake on it', effect: T(), xp: 30, rumour: { chance: 0.5, penalty: T(-3, -8, 0) }, outcome: 'Your in-game rating looks great. Hmm.' },
      { id: 'refuse', label: 'Reviews should be honest', effect: T(3, 0, 0), outcome: 'He grumbles, then admits you’re right.' }] },
  { id: 'tape', kind: 'temptation', title: 'Under the Tape', where: 'pier', who: 'A fictional roadworks crew',
    text: 'A cordon blocks the promenade in the 3D town. Ducking under it would save the long way round. (In real life, always respect cordons.)',
    choices: [{ id: 'take', label: 'Duck under', effect: T(), xp: 15, rumour: { chance: 0.25, penalty: T(-4, 0, 0) }, outcome: 'Shortcut taken. A hi-vis jacket turns your way…' },
      { id: 'refuse', label: 'Walk round', effect: T(3, 0, 0), outcome: 'The foreman nods. “Ta.”' }] },
  { id: 'gulls', kind: 'temptation', title: 'Vote for Gulls', where: 'triangle', who: CAST.dot,
    text: 'Dot Pennywhistle’s campaign board stands unattended. Rearrange the letters to read VOTE FOR GULLS?',
    choices: [{ id: 'take', label: 'Rearrange the letters', effect: T(), xp: 20, rumour: { chance: 0.5, penalty: T(0, 0, -4) }, outcome: 'It is, admittedly, very funny.' },
      { id: 'refuse', label: 'Leave it alone', effect: T(3, 0, 0), outcome: 'A gull eyes you with respect.' }] },
  { id: 'scones', kind: 'temptation', title: 'Scone-gate', where: 'triangle', who: CAST.dot,
    text: 'Tell the town Dot’s scones are shop-bought? They aren’t, but it would dent her poll numbers.',
    choices: [{ id: 'take', label: 'Start the whisper', effect: T(), xp: 25, rumour: { chance: 0.5, penalty: T(-8, 0, -4) }, outcome: 'Dot’s in-game poll dips. You feel slightly grubby.' },
      { id: 'refuse', label: 'Keep it clean', effect: T(3, 0, 0), outcome: 'Dot never knows. You do.' }] },
  { id: 'rosettes', kind: 'temptation', title: 'Del’s Rosettes', where: 'station', who: CAST.del, maxOverall: 59,
    text: 'Dodgy Del has a car boot of “official” campaign rosettes at a quarter of the price. They’re fakes.',
    choices: [{ id: 'take', label: 'Buy a box (in-game coins)', effect: T(), xp: 20, rumour: { chance: 0.5, penalty: T(-4, -6, 0) }, outcome: 'They look almost real.' },
      { id: 'refuse', label: 'No thanks, Del', effect: T(3, 0, 0), outcome: 'Del sulks off to the car park.' }] },

  // ---------- risky choices ----------
  { id: 'parking', kind: 'risky', title: 'Parking Row', where: 'lantern', who: 'Traders and residents (fictional)',
    text: 'Traders want more parking on Hamilton Road; residents want fewer cars. Everyone wants your view.',
    choices: [{ id: 'traders', label: 'Back the traders', effect: T(0, 4, -2), outcome: 'Shop windows sprout your posters. Some residents grumble.' },
      { id: 'residents', label: 'Back the residents', effect: T(0, -2, 4), outcome: 'The residents’ association cheers. A few traders sulk.' },
      { id: 'broker', label: 'Try to broker a deal', gamble: { chance: 0.6, win: T(0, 2, 2), lose: T(0, -1, -1) }, outcome: 'You get everyone round a table…' }] },
  { id: 'debate', kind: 'risky', title: 'Spa Stage Debate', where: 'spa', who: CAST.rex,
    text: 'Challenge Rex Harbourne to a public debate at the Spa Pavilion. The more the town trusts you, the better your odds.',
    choices: [{ id: 'debate', label: 'Throw down the gauntlet', gamble: { chance: 'trust', win: T(4, 0, 3), lose: T(-2, 0, 0) }, outcome: 'The lights come up…' },
      { id: 'decline', label: 'Not yet', effect: T(), outcome: 'Rex calls you “shy”. You’ll live.' }] },

  // ---------- redemption (one real-world or accessible step: any check-in after you start) ----------
  { id: 'polish', kind: 'redemption', title: 'Polish and Apologise', where: 'spa', clears: 'joyrider', who: 'The roadster’s owner (fictional)', checkins: 1, bonus: T(3, 0, 5),
    text: 'Apologise to the roadster’s owner and help polish it for the story’s Seafront Classic Car Parade. Then make one check-in anywhere: a venue, a landmark or an event.' },
  { id: 'return_sender', kind: 'redemption', title: 'Return to Sender', where: 'town_hall', clears: 'envelope', who: 'The fictional Standards Panel', checkins: 3, bonus: T(3, 5, 0),
    text: 'Return the envelope at the Town Hall noticeboard in the game and give evidence to the fictional Standards Panel. Then show traders you mean it: three check-ins at any participating places.' },
  { id: 'resit', kind: 'redemption', title: 'The Resit', where: 'museum', clears: 'crib', who: CAST.quill, checkins: 1, quiz: true, bonus: T(8, 0, 0),
    text: 'Own up to Marjorie, then pass any quiz honestly (no crib sheet) and make one check-in anywhere.' },
  { id: 'correction', kind: 'redemption', title: 'The Correction', where: 'triangle', clears: 'rumour', who: CAST.dot, checkins: 0, bonus: T(4, 0, 2),
    text: 'Ask Felixstowe News (game edition) to print a correction and help Dot at her tea-hut stall in the game. Available once a season after a rumour about you comes out.' },
];

function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
export function seeded(...parts) { return fnv(parts.join('|')) / 0x100000000; }
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const scale = (t, k) => ({ trust: Math.round((t.trust || 0) * k), business: Math.round((t.business || 0) * k), community: Math.round((t.community || 0) * k) });

export function newRep() {
  return { trust: REP_RULES.start, business: REP_RULES.start, community: REP_RULES.start, keys: {}, daily: {}, log: [], rumours: {}, marks: {}, stories: {}, crib: false, quizLog: [], correctionSeason: null };
}

/** Methods installed on Game.prototype. `this` is the Game. */
export const ReputationMixin = {
  rep() { const p = this.p; if (!p.rep) p.rep = newRep(); return p.rep; },
  overall(r = this.rep()) { return Math.round(r.trust * WEIGHTS.trust + r.business * WEIGHTS.business + r.community * WEIGHTS.community); },
  activeMarks() { return Object.entries(this.rep().marks).filter(([, m]) => !m.cleared).map(([id, m]) => ({ id, ...MARKS[id], ...m })); },
  repLevel() {
    const o = this.overall(); let i = 0; LEVELS.forEach((l, k) => { if (o >= l.min) i = k; });
    const capped = this.activeMarks().length && i > 2; if (capped) i = 2; // a Mark holds you at Known Face
    return { ...LEVELS[i], index: i, overall: o, capped };
  },
  storyActive(s) { return (this.store.server.content?.stories?.[s.id]?.active) !== false; },

  /** Apply a change. Gains are capped and diminished when repeatable; losses never are. */
  applyRep(delta, { key = null, repeatable = false, kind = 'misc', reason = '' } = {}) {
    const r = this.rep(); if (key && r.keys[key]) return null;
    const day = ukDay(this.now()); const d = (r.daily[day] ||= { gain: { trust: 0, business: 0, community: 0 }, kinds: {} });
    for (const k of Object.keys(r.daily)) if (k !== day) delete r.daily[k];
    const factor = repeatable ? REP_RULES.diminishing[Math.min(d.kinds[kind] || 0, 3)] : 1;
    const ceilings = { trust: 100, business: 100, community: 100 };
    for (const m of this.activeMarks()) ceilings[m.standing] = REP_RULES.markCeiling;
    const applied = { trust: 0, business: 0, community: 0 };
    for (const s of ['trust', 'business', 'community']) {
      let v = delta[s] || 0; if (!v) continue;
      if (v > 0) {
        if (repeatable) { v = Math.floor(v * factor); v = Math.min(v, REP_RULES.dailyCap - d.gain[s]); d.gain[s] += Math.max(0, v); }
        v = Math.max(0, Math.min(v, ceilings[s] - r[s]));
      }
      const before = r[s]; r[s] = clamp(r[s] + v); applied[s] = r[s] - before;
    }
    if (repeatable) d.kinds[kind] = (d.kinds[kind] || 0) + 1;
    if (key) r.keys[key] = this.now();
    if (applied.trust || applied.business || applied.community || reason) { r.log.unshift({ ts: this.now(), reason, ...applied }); r.log.length = Math.min(r.log.length, 80); }
    return applied;
  },

  // ---------- hooks from real play ----------
  repOnCheckin(c, first) {
    if (c.type === 'event') return this.applyRep(T(2, 0, 8), { key: 'event:' + c.target, reason: `Verified event: ${this.eventName(c.target)}` });
    const l = this.loc(c.target); if (!l) return null;
    if (l.kind === 'business') {
      if (first) return this.applyRep(T(0, 3, 0), { key: 'visit:' + l.id, reason: `First check-in: ${l.name}` });
      const wk = Math.floor(this.now() / (7 * 86400000));
      return this.applyRep(T(0, 1, 0), { key: `revisit:${l.id}:${wk}`, repeatable: true, kind: 'revisit', reason: `Regular at ${l.name}` });
    }
    return this.applyRep(T(0, 0, 2), { key: 'visit:' + l.id, reason: `First check-in: ${l.name}` });
  },
  repOnMission(m) { if (m.type === 'trail') return this.applyRep(T(0, 3, 3), { key: 'trail:' + m.id, reason: `Trail completed: ${m.title}` }); return null; },
  repOnQuiz(id, passed, attempts, crib) {
    this.rep().quizLog.push({ id, ts: this.now(), passed, crib: !!crib });
    if (passed && attempts === 1 && !crib) return this.applyRep(T(2, 0, 0), { key: 'quiz:' + id, reason: 'Passed a quiz first time' });
    return null;
  },

  // ---------- stories ----------
  stories() { return STORIES.filter((s) => this.storyActive(s)); },
  story(id) { return STORIES.find((s) => s.id === id) || null; },
  storyState(s) {
    const r = this.rep(), st = r.stories[s.id];
    if (s.kind === 'redemption') {
      if (st?.done) return 'done';
      const open = s.clears === 'rumour' ? this.correctionOpen() : !!r.marks[s.clears] && !r.marks[s.clears].cleared;
      if (!open) return 'hidden';
      if (!st?.started) return 'available';
      return this.redemptionReady(s) ? 'ready' : 'started';
    }
    if (st) return 'done';
    const o = this.overall();
    if (s.minOverall && o < s.minOverall) return 'locked';
    if (s.maxOverall && o > s.maxOverall) return 'hidden';
    return 'available';
  },
  correctionOpen() { const r = this.rep(); return r.correctionSeason !== this.p.seasonId && Object.values(r.rumours).some((x) => x.state === 'found' && !x.mark); },
  redemptionProgress(s) {
    const st = this.rep().stories[s.id]; const since = st?.started || Infinity;
    const n = this.myCheckins().filter((c) => c.ts >= since).length;
    const quiz = !s.quiz || this.rep().quizLog.some((q) => q.ts >= since && q.passed && !q.crib);
    return { checkins: Math.min(n, s.checkins), need: s.checkins, quiz };
  },
  redemptionReady(s) { const p = this.redemptionProgress(s); return p.checkins >= p.need && p.quiz; },

  choose(storyId, choiceId) {
    const s = this.story(storyId); if (!s || !this.p.player) return { ok: false, message: 'Story not found.' };
    const state = this.storyState(s); const r = this.rep();
    if (s.kind === 'redemption') return this._redeem(s, state);
    if (state !== 'available') return { ok: false, message: state === 'locked' ? `Needs overall reputation ${s.minOverall}+.` : 'Already decided.' };
    const c = s.choices.find((x) => x.id === choiceId); if (!c) return { ok: false, message: 'Choice not found.' };
    const out = { ok: true, story: s, choice: c, outcome: c.outcome, applied: null, rumour: null, found: [], gamble: null };
    if (c.gamble) {
      const chance = c.gamble.chance === 'trust' ? Math.max(0.15, Math.min(0.9, 0.4 + (r.trust - 50) / 100)) : c.gamble.chance;
      const win = seeded(this.p.player.id, s.id, 'gamble') < chance;
      out.gamble = { win, chance }; out.applied = this.applyRep(win ? c.gamble.win : c.gamble.lose, { key: 'story:' + s.id, reason: `${s.title}: ${win ? 'it worked' : 'it backfired'}` });
      out.outcome += win ? ' It worked.' : ' It backfired.';
    } else if (c.rumour) {
      r.rumours[s.id] = { story: s.id, title: s.title, chance: c.rumour.chance, penalty: c.rumour.penalty, mark: c.rumour.mark || null, state: 'hidden', ts: this.now() };
      out.rumour = r.rumours[s.id]; if (c.crib) r.crib = true;
      r.log.unshift({ ts: this.now(), reason: `${s.title}: you took the chance`, trust: 0, business: 0, community: 0 });
      out.found = this.rollRumours('spot', [s.id]);
    } else {
      const refused = s.kind === 'temptation';
      out.applied = this.applyRep(c.effect, { key: 'story:' + s.id, reason: refused ? `${s.title}: said no` : `${s.title}` });
      if (refused) this.publish('refused', { id: s.id, title: s.title, outcome: c.outcome, link: { kind: 'story', id: s.id } });
      else if (s.kind === 'deed' && c.effect && (c.effect.trust || c.effect.business || c.effect.community)) this.publish('good_deed', { id: s.id, title: s.title, outcome: c.outcome, link: { kind: 'story', id: s.id } });
    }
    r.stories[s.id] = { choice: c.id, ts: this.now() }; this.influenceOnStory?.(s, c);
    const rewards = []; if (c.xp) { const g = this._grant('story:' + s.id, c.xp, `Story: ${s.title}`); if (g) rewards.push(g); }
    this._event('story_choice', { story: s.id, choice: c.id, kind: s.kind });
    this._feed(`${s.title}: ${c.label.toLowerCase()}.`);
    const after = this._after(rewards); this.save();
    return { ...out, ...after, found: [...out.found, ...(after.found || [])] };
  },
  _redeem(s, state) {
    const r = this.rep();
    if (state === 'available') { r.stories[s.id] = { started: this.now() }; this._feed(`Started redemption: ${s.title}.`); this.save(); return { ok: true, story: s, started: true }; }
    if (state !== 'ready') return { ok: false, message: state === 'started' ? 'Finish the remaining steps first.' : 'Nothing to put right here.' };
    if (s.clears === 'rumour') r.correctionSeason = this.p.seasonId; else r.marks[s.clears].cleared = this.now();
    r.stories[s.id] = { ...r.stories[s.id], done: this.now() };
    const applied = this.applyRep(s.bonus, { key: `redeem:${s.id}:${this.p.seasonId}`, reason: `Put right: ${s.title}` });
    this._event('redemption', { story: s.id }); this._feed(`Redemption complete: ${s.title}.`); this.publish('redemption', { id: s.id, title: s.title, link: { kind: 'story', id: s.id } });
    const after = this._after([]); this.save();
    return { ok: true, story: s, redeemed: true, applied, ...after };
  },

  /** Roll hidden rumours. stage: 'spot' | 'rank:<id>' | 'finale' (finale reveals all). */
  rollRumours(stage, only = null) {
    const r = this.rep(); const hidden = Object.values(r.rumours).filter((x) => x.state === 'hidden' && (!only || only.includes(x.story)));
    const found = [];
    for (const x of hidden) {
      const heat = REP_RULES.heatPerRumour * (Object.values(r.rumours).filter((y) => y.state === 'hidden' && y !== x).length);
      const hit = stage === 'finale' || seeded(this.p.player.id, x.story, stage) < x.chance + heat;
      if (hit) found.push(this._expose(x, stage === 'finale' ? REP_RULES.finaleMult : 1, stage));
    }
    return found;
  },
  _expose(x, mult, stage) {
    x.state = 'found'; x.foundAt = this.now(); x.stage = stage;
    const applied = this.applyRep(scale(x.penalty, mult), { reason: `Found out: ${x.title}${mult > 1 ? ' (the press dug it up)' : ''}` });
    if (x.mark) this.rep().marks[x.mark] = { ts: this.now(), story: x.story };
    this.influenceOnExposed?.(x);
    this._feed(`Felixstowe News (game edition): “${x.title}” comes out.`); this._event('rumour_found', { story: x.story, stage });
    this.publish('exposed', { key: 'exposed:' + x.story, story: x.story.startsWith('vehicle') ? 'vehicle' : x.story, title: x.title, stage, mark: x.mark, link: { kind: 'profile' } });
    return { ...x, applied, mult };
  },
  confess(storyId) {
    const r = this.rep(); const x = r.rumours[storyId];
    if (!x || x.state !== 'hidden') return { ok: false, message: 'Nothing to confess.' };
    x.state = 'confessed'; x.foundAt = this.now();
    const applied = this.applyRep(scale(x.penalty, REP_RULES.confessMult), { reason: `Owned up: ${x.title}` });
    const back = this.applyRep(REP_RULES.confessBonus, { reason: 'Credit for owning up' });
    if (x.mark) r.marks[x.mark] = { ts: this.now(), story: x.story };
    if (x.story === 'crib') r.crib = false;
    this._feed(`Owned up to “${x.title}” at the Town Hall noticeboard.`); this._event('confess', { story: storyId });
    this.publish('confessed', { story: storyId, title: x.title, link: { kind: 'profile' } }); this._newsChecks();
    this.save(); return { ok: true, rumour: x, applied, back };
  },
  /** Taking a vehicle that isn't yours in the 3D town (fictional): a rumour like any temptation. */
  vehicleTaken(name) {
    if (!this.p.player) return null; const r = this.rep(); r.thefts = (r.thefts || 0) + 1;
    const id = `vehicle:${r.thefts}`;
    r.rumours[id] = { story: id, title: `Borrowed a ${name.replace(/ \(.*\)/, '').toLowerCase()} without asking`, chance: 0.6, penalty: T(-8, 0, -4), mark: r.thefts >= 2 ? 'joyrider' : null, state: 'hidden', ts: this.now() };
    r.log.unshift({ ts: this.now(), reason: 'Took a vehicle that wasn’t yours (in the game)', trust: 0, business: 0, community: 0 });
    this._feed('Drove off in a vehicle that wasn’t yours (fictional).'); this._event('vehicle_taken', {});
    const found = this.rollRumours('spot', [id]); this._newsChecks?.(); this.save();
    return { rumour: r.rumours[id], found };
  },
  /** Ramming traffic at speed in the game: a small Community loss, at most once a day, and a news item. */
  recklessDriving() {
    if (!this.p.player) return null; const r = this.rep(), day = ukDay(this.now());
    if (r.recklessDay === day) return null; r.recklessDay = day;
    const applied = this.applyRep(T(0, 0, -2), { reason: 'Reckless driving (in the game)' });
    this.publish('reckless', { key: 'reckless:' + day }); this._newsChecks?.(); this.save(); return applied;
  },
  hiddenRumours() { return Object.values(this.rep().rumours).filter((x) => x.state === 'hidden').map((x) => ({ ...x, band: x.chance >= 0.75 ? 'high' : x.chance >= 0.5 ? 'medium' : 'low' })); },

  // ---------- gates ----------
  /** Endorsements come from the six resident groups (support 60+); Mayoral Candidate needs three. */
  endorsements() {
    return (this.groupSupport?.() || []).map((g) => ({ id: g.id, name: g.name, from: g.blurb, need: `${g.short} support 60+ (now ${g.value})`, ok: g.endorsed }));
  },
  repGate(rankId) {
    const need = REP_RULES.rankGates[rankId] || 0; const o = this.overall();
    const endorse = rankId === 'candidate' ? this.endorsements() : null;
    return { need, ok: o >= need && (!endorse || endorse.filter((x) => x.ok).length >= REP_RULES.endorsementsNeeded), overall: o, endorse };
  },
  finalEligibility() {
    const r = this.rep(), f = REP_RULES.final, o = this.overall(), marks = this.activeMarks();
    const items = [
      { label: `Overall reputation ${f.overall}+`, done: o >= f.overall, have: o },
      { label: `Public Trust ${f.trust}+`, done: r.trust >= f.trust, have: r.trust },
      { label: 'No active Marks', done: !marks.length },
    ];
    return { ok: items.every((i) => i.done), items, hidden: this.hiddenRumours().length };
  },
};
