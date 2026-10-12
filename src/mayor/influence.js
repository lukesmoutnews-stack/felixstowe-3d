// Influence: support from six fictional resident groups, earned by listening, helping, keeping
// promises and supporting local places; lost by breaking promises, rudeness and fictional
// wrongdoing. Separate from the three reputation standings (which measure trust and standing),
// though the two often move together. Endorsements come from groups whose support reaches 60.

import { GROUPS, INF, RESIDENTS, NEWS_REACTIONS } from './residents.js';
import { seeded } from './reputation.js';

const clamp = (v) => Math.max(0, Math.min(INF.max, Math.round(v)));

export const InfluenceMixin = {
  inf() { const p = this.p; if (!p.inf) p.inf = { groups: Object.fromEntries(GROUPS.map((g) => [g.id, INF.start])), people: {}, promises: {}, log: [], paid: {} }; return p.inf; },
  resident(id) { return RESIDENTS.find((r) => r.id === id) || null; },
  /** Change group support. Positive dialogue/mission effects can be keyed so they pay once. */
  addInf(eff, reason, key = null) {
    const I = this.inf(); if (!eff) return null; if (key && I.paid[key]) return null; if (key) I.paid[key] = this.now();
    const applied = {};
    for (const [g, v] of Object.entries(eff)) { if (!(g in I.groups) || !v) continue; const before = I.groups[g]; I.groups[g] = clamp(before + v); if (I.groups[g] !== before) applied[g] = I.groups[g] - before; }
    if (Object.keys(applied).length) { I.log.unshift({ ts: this.now(), reason, ...applied }); I.log.length = Math.min(I.log.length, 60); }
    return applied;
  },
  groupSupport() { const I = this.inf(); return GROUPS.map((g) => ({ ...g, value: I.groups[g.id], endorsed: I.groups[g.id] >= INF.endorse })); },
  person(id) { const I = this.inf(); return (I.people[id] ||= { met: false, flags: [], talks: 0, rel: 0, reacted: null, last: 0 }); },

  /** What a resident says when you walk up: entry node, greeting by reputation, and a reaction to the news. */
  talk(id) {
    const res = this.resident(id); if (!res || !this.p.player) return null;
    this.checkPromises();
    const st = this.person(id), I = this.inf(), lv = this.repLevel().id;
    const mine = Object.values(I.promises).filter((pr) => pr.person === id);
    let nodeId = 'start';
    const kept = mine.find((pr) => pr.status === 'kept' && !pr.ack), broken = mine.find((pr) => pr.status === 'broken' && !pr.ack);
    if (kept && res.nodes.kept) { nodeId = 'kept'; kept.ack = true; } else if (broken && res.nodes.broken) { nodeId = 'broken'; broken.ack = true; } else if (st.met) nodeId = res.nodes.again ? 'again' : 'start';
    // a Mark makes some people refuse favours until you've put things right
    const marks = this.activeMarks();
    const cold = (lv === 'pariah' || (marks.length && res.rival !== true && seeded(this.p.player.id, id, marks.length) < 0.5)) && nodeId === 'start';
    const node = res.nodes[nodeId];
    const choices = node.choices.map((c, i) => ({ ...c, i })).filter((c) => !c.need || (c.need.flags || []).every((f) => st.flags.includes(f)));
    const n = this.latestHeadline?.(); let newsLine = null;
    if (n && st.reacted !== n.id && this.now() - n.ts < 2 * 86400000 && (n.tone === 'good' || n.tone === 'bad')) { newsLine = NEWS_REACTIONS[n.tone][Math.floor(seeded(id, n.id) * 3)] + ` “${n.headline}”`; st.reacted = n.id; }
    st.talks++; st.last = this.now(); this.save();
    return { res, nodeId, say: cold ? 'I don’t think I want to get involved with you just now. Put things right first.' : node.say, mood: cold ? 'suspicious' : node.mood, choices: cold ? [{ label: 'Fair enough.', end: true, i: -1 }] : choices,
      greet: st.met ? res.greet[lv] : null, newsLine, cold };
  },
  /** Pick a reply. Returns what they say back and any effects. */
  answer(id, nodeId, i) {
    const res = this.resident(id), st = this.person(id); if (!res) return { ok: false };
    const c = res.nodes[nodeId]?.choices[i]; if (!c) return { ok: true, end: true, reply: null };
    const out = { ok: true, reply: c.reply || null, mood: c.mood || res.nodes[nodeId].mood, end: !!c.end || !c.next, next: c.next || null, applied: null, repApplied: null, promise: null, discovered: null, accepted: null };
    const key = `talk:${id}:${nodeId}:${i}`;
    out.applied = this.addInf(c.eff, `${res.name}: “${c.label}”`, key);
    if (c.rep) out.repApplied = this.applyRep(c.rep, { key: 'rep:' + key, reason: `Talking with ${res.name}` });
    st.rel += Object.entries(c.eff || {}).reduce((s, [g, v]) => s + (g === res.group ? v : v / 2), 0);
    st.met = true; for (const f of c.set || []) if (!st.flags.includes(f)) st.flags.push(f);
    if (c.promise && !this.inf().promises[c.promise.id]) { const pr = { ...c.promise, person: id, made: this.now(), due: this.now() + c.promise.days * 86400000, status: 'open' }; this.inf().promises[pr.id] = pr; out.promise = pr; this._feed(`Promised ${res.name}: ${pr.text}.`); }
    if (c.discover && this.loc(c.discover)) { const r = this.discover(c.discover); out.discovered = this.loc(c.discover).name; if (r) out.xpGained = r.xpGained; }
    if (c.accept && this.mission(c.accept) && this.missionState(this.mission(c.accept)) === 'available') { const r = this.accept(c.accept); if (r.ok) out.accepted = this.mission(c.accept).title; }
    this._event('talk', { person: id, node: nodeId, choice: i });
    const after = this._after([]); this.save();
    return { ...out, ...after };
  },
  promiseDone(pr) {
    const [k, a] = pr.check.split(':');
    if (k === 'visit') return this.myCheckins().some((c) => c.type === 'location' && c.target === a && c.ts >= pr.made);
    if (k === 'event') return this.myCheckins().some((c) => c.type === 'event' && c.target === a && c.ts >= pr.made);
    if (k === 'mission') return !!this.p.completed[a] && this.p.completed[a].ts >= pr.made;
    return false;
  },
  /** Kept promises raise support (and Trust); broken ones cost it. */
  checkPromises() {
    const I = this.inf(); const changed = [];
    for (const pr of Object.values(I.promises)) {
      if (pr.status !== 'open') continue;
      const res = this.resident(pr.person);
      if (this.promiseDone(pr)) { pr.status = 'kept'; this.addInf(pr.keep, `Kept a promise to ${res?.name}`); this.applyRep({ trust: 2 }, { key: 'promise:' + pr.id, reason: `Kept a promise to ${res?.name}` }); this._feed(`Kept your promise to ${res?.name}.`); changed.push(pr); }
      else if (this.now() > pr.due) { pr.status = 'broken'; this.addInf(pr.broke, `Broke a promise to ${res?.name}`); this.applyRep({ trust: -2 }, { reason: `Broke a promise to ${res?.name}` }); this._feed(`Broke your promise to ${res?.name}.`); changed.push(pr); }
    }
    return changed;
  },
  openPromises() { return Object.values(this.inf().promises).filter((p) => p.status === 'open'); },

  // ---------- how ordinary play moves the groups ----------
  influenceOnCheckin(c, first) {
    if (c.type === 'event') return this.addInf(c.target === 'beach_clean' ? { coastal: 6, volunteers: 6, families: 2 } : { longstanding: 3 }, `Turned up: ${this.eventName(c.target)}`, 'ev:' + c.target);
    const l = this.loc(c.target); if (!l || !first) return null;
    return this.addInf(l.kind === 'business' ? { business: 3 } : { visitors: 2, longstanding: 1 }, `Visited ${l.name}`, 'v:' + l.id);
  },
  influenceOnMission(m) {
    const eff = m.type === 'trail' ? { visitors: 4, business: 2 } : m.category === 'business' ? { business: 2 } : m.category === 'community' ? { volunteers: 5, families: 3 } : m.category === 'exploration' ? { visitors: 2, longstanding: 2 } : null;
    return this.addInf(eff, `Mission: ${m.title}`, 'm:' + m.id);
  },
  influenceOnStory(s, c) {
    if (s.kind === 'deed' && c.effect && (c.effect.community || c.effect.trust || c.effect.business)) return this.addInf({ [s.group || 'longstanding']: 3 }, `${s.title}`, 'st:' + s.id);
    if (s.kind === 'temptation' && !c.rumour) return this.addInf({ longstanding: 2 }, `Said no: ${s.title}`, 'st:' + s.id);
    return null;
  },
  influenceOnExposed(x) { return this.addInf({ business: -3, families: -3, volunteers: -3, coastal: -2, longstanding: -4, visitors: -2 }, `Found out: ${x.title}`); },
};
