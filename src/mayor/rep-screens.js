// Reputation, town stories, safety reporting. HTML templates; actions handled in app.js.

import { STANDINGS, LEVELS, MARKS, REP_RULES } from './reputation.js';
import { icon, escapeHtml as esc } from './art.js';

const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
const KIND = { deed: 'Good deed', temptation: 'Temptation', risky: 'Risky choice', redemption: 'Redemption' };
export const FICTION_NOTE = 'Story only: this happens in the game, with invented characters. Nothing here is ever asked of you in real life.';

export function deltaChips(d) {
  if (!d) return '';
  const parts = STANDINGS.filter((s) => d[s.id]).map((s) => `<span class="dchip ${d[s.id] > 0 ? 'up' : 'down'}">${esc(s.short)} ${sign(d[s.id])}</span>`);
  return parts.length ? `<span class="dchips">${parts.join('')}</span>` : '';
}

function meter(label, v, cls, blurb) {
  return `<div class="rmeter ${cls}"><div class="rm-top"><b>${esc(label)}</b><span>${v}</span></div><div class="rm-bar"><span style="width:${v}%"></span><i style="left:${REP_RULES.endorse}%" title="Endorsement threshold"></i></div>${blurb ? `<small>${esc(blurb)}</small>` : ''}</div>`;
}

/** Compact strip for Home. */
export function repStrip(app) {
  const g = app.game, lv = g.repLevel(), r = g.rep(), hidden = g.hiddenRumours().length, marks = g.activeMarks();
  return `<button class="rep-strip lvl-${lv.id}" data-act="tab" data-tab="profile" aria-label="Reputation: ${esc(lv.name)}">
    <span class="rs-level"><small>Reputation</small><b>${esc(lv.name)}</b></span>
    <span class="rs-bars">${STANDINGS.map((s) => `<span class="rs-b ${s.id}" title="${esc(s.name)} ${r[s.id]}"><i style="height:${r[s.id]}%"></i></span>`).join('')}</span>
    ${marks.length ? `<span class="rs-flag mark">${icon('lock')}${marks.length} Mark${marks.length > 1 ? 's' : ''}</span>` : hidden ? `<span class="rs-flag rumour">${hidden} whisper${hidden > 1 ? 's' : ''}</span>` : ''}
  </button>`;
}

/** Full card for Profile. */
export function repCard(app) {
  const g = app.game, r = g.rep(), lv = g.repLevel(), marks = g.activeMarks(), hidden = g.hiddenRumours(), end = g.endorsements(), el = g.finalEligibility();
  const levelIdx = LEVELS.findIndex((l) => l.id === lv.id);
  return `<section class="card rep-card" id="reputation"><h3 class="sec">Reputation <span class="muted">– overall ${lv.overall}/100</span></h3>
    <div class="rep-level lvl-${lv.id}"><b>${esc(lv.name)}</b><span>${esc(lv.line)}</span>${lv.capped ? '<em>Held at Known Face by an active Mark.</em>' : ''}</div>
    <ol class="rep-ladder">${LEVELS.map((l, i) => `<li class="${i === levelIdx ? 'on' : i < levelIdx ? 'past' : ''}"><span>${esc(l.name)}</span><small>${l.min}+</small></li>`).join('')}</ol>
    ${STANDINGS.map((s) => meter(s.name, r[s.id], s.id, s.blurb)).join('')}
    <p class="fine">Overall = 40% Trust + 30% Business + 30% Community. Repeatable good deeds add at most +${REP_RULES.dailyCap} a day to each standing, and the same deed pays less each time. Losses are never capped. Only your level is ever shown to other players.</p>
    ${marks.length ? `<h4>Marks</h4><ul class="marks">${marks.map((m) => `<li>${icon('lock')}<span><b>${esc(m.name)}</b><small>Caps ${esc(STANDINGS.find((s) => s.id === m.standing).name)} at ${REP_RULES.markCeiling} and bars the finale. Clear it with “${esc(g.story(m.fix).title)}”.</small></span><button class="btn small" data-act="open-story" data-id="${m.fix}">Put it right</button></li>`).join('')}</ul>` : ''}
    ${hidden.length ? `<h4>Whispers about you</h4><ul class="rumours">${hidden.map((x) => `<li><span><b>${esc(x.title)}</b><small>Risk of coming out: ${x.band}. It will come out before the finale anyway, at 1.5× the penalty.</small></span><button class="btn small" data-act="confess" data-id="${x.story}">Own up</button></li>`).join('')}</ul><p class="fine">Owning up at the Town Hall noticeboard halves the penalty and earns +2 Trust back.</p>` : ''}
    <h4>Endorsements <span class="muted">– Mayoral Candidate needs three of the six resident groups</span></h4>
    <ul class="endorse">${end.map((e) => `<li class="${e.ok ? 'ok' : ''}">${icon(e.ok ? 'check' : 'lock')}<span><b>${esc(e.name)}</b><small>${esc(e.need)} · ${esc(e.from)}</small></span></li>`).join('')}</ul>
    <h4>Town Hall steps</h4><ul class="endorse">${el.items.map((i) => `<li class="${i.done ? 'ok' : ''}">${icon(i.done ? 'check' : 'lock')}<span><b>${esc(i.label)}</b>${i.have != null ? `<small>You have ${i.have}</small>` : ''}</span></li>`).join('')}</ul>
    ${r.log.length ? `<details><summary>Recent changes</summary><ul class="rep-log">${r.log.slice(0, 12).map((l) => `<li><span>${esc(l.reason)}</span>${deltaChips(l)}</li>`).join('')}</ul></details>` : ''}
  </section>`;
}

/** Missions tab: Town stories list. */
export function storiesList(app) {
  const g = app.game;
  const rows = g.stories().map((s) => ({ s, st: g.storyState(s) })).filter((x) => x.st !== 'hidden');
  const order = { ready: 0, started: 1, available: 2, locked: 3, done: 4 };
  rows.sort((a, b) => (order[a.st] - order[b.st]) || (a.s.kind === 'redemption' ? -1 : 0));
  return `<p class="fiction-note">${icon('eye')}${esc(FICTION_NOTE)}</p>
    <div class="mission-list">${rows.map(({ s, st }) => `<button class="mission-card story ${s.kind} ${st}" data-act="open-story" data-id="${s.id}">
      <div class="mc-top"><span class="tag k-${s.kind}">${KIND[s.kind]}</span>${st === 'done' ? `<span class="xp">${icon('check')}Decided</span>` : st === 'locked' ? `<span class="lock">${icon('lock')}${s.minOverall}+ reputation</span>` : ''}</div>
      <h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
      <div class="mc-foot"><span class="phys">${icon('pin')}${esc(g.loc(s.where)?.name || '')} · in the 3D town</span></div></button>`).join('')}</div>`;
}

export function storySheet(app, id) {
  const g = app.game, s = g.story(id), st = g.storyState(s), r = g.rep(), dec = r.stories[s.id];
  const head = `<p class="eyebrow">${KIND[s.kind]} · ${esc(g.loc(s.where)?.name || '')}</p><h2>${esc(s.title)}</h2><p class="who">${esc(s.who)}</p><p>${esc(s.text)}</p><p class="fiction-note">${icon('eye')}${esc(FICTION_NOTE)}</p>`;
  if (s.kind === 'redemption') {
    const pr = g.redemptionProgress(s);
    const steps = [
      { label: 'Start putting it right (in the story)', done: !!dec?.started },
      s.checkins && { label: `Check in anywhere after starting: a participating venue, a landmark or an event (${pr.checkins}/${pr.need}). Any step-free venue counts.`, done: pr.checkins >= pr.need },
      s.quiz && { label: 'Pass any quiz honestly after starting', done: pr.quiz },
    ].filter(Boolean);
    return `${head}<ul class="steps big">${steps.map((x) => `<li class="${x.done ? 'done' : ''}">${icon(x.done ? 'check' : 'star')}<span>${esc(x.label)}</span></li>`).join('')}</ul>
      <p class="reward-line">When finished: ${deltaChips(s.bonus)}${s.clears !== 'rumour' ? ` and the “${esc(MARKS[s.clears].name)}” Mark is cleared` : ''}</p>
      <div class="actions">${st === 'available' ? `<button class="btn primary big" data-act="choose" data-id="${s.id}">Start</button>` : st === 'ready' ? `<button class="btn primary big" data-act="choose" data-id="${s.id}">Put it right</button>` : st === 'started' ? '<p class="muted">Started. Finish the steps above, then come back here.</p>' : st === 'done' ? `<p class="done-line">${icon('check')}Put right.</p>` : ''}</div>`;
  }
  if (st === 'done') {
    const c = s.choices.find((x) => x.id === dec.choice); const rum = r.rumours[s.id];
    return `${head}<p class="done-line">${icon('check')}You chose: ${esc(c.label)}</p><p>${esc(c.outcome)}</p>${rum ? `<p class="fine">${rum.state === 'hidden' ? 'People are whispering… (see Reputation in Profile)' : rum.state === 'confessed' ? 'You owned up.' : 'It came out.'}</p>` : ''}`;
  }
  if (st === 'locked') return `${head}<p class="muted">${icon('lock')}Only Trusted Locals get asked. You need overall reputation ${s.minOverall}+ (you have ${g.overall()}).</p>`;
  return `${head}<div class="choices">${s.choices.map((c) => `<button class="choice ${c.rumour ? 'risky' : ''}" data-act="choose" data-id="${s.id}" data-choice="${c.id}"><b>${esc(c.label)}</b><small>${c.rumour ? `Pays ${c.xp ? '+' + c.xp + ' XP ' : ''}now · ${c.rumour.chance >= 0.75 ? 'likely' : c.rumour.chance >= 0.5 ? 'might' : 'unlikely to'} come out` : c.gamble ? 'A gamble: it could go either way' : (c.effect && (c.effect.trust || c.effect.business || c.effect.community)) ? 'The decent thing' : 'No change'}${c.xp && !c.rumour ? ` · +${c.xp} XP` : ''}</small></button>`).join('')}</div>
    <p class="fine">Your choice is final. Temptations pay off straight away; if they come out later you lose reputation, and serious ones leave a Mark.</p>`;
}

export function storyResult(app, r) {
  const s = r.story;
  if (r.started) return `<p class="eyebrow">Redemption</p><h2>${esc(s.title)}</h2><p>Started. ${s.checkins ? 'Your next check-in anywhere counts.' : ''}</p><div class="actions"><button class="btn" data-act="close-sheet">OK</button></div>`;
  if (r.redeemed) return `<p class="eyebrow">Redemption</p><h2>Put right</h2><p>${esc(s.title)} is done.</p><p class="reward-line">${deltaChips(r.applied)}</p><div class="actions"><button class="btn primary" data-act="close-sheet">Back to the town</button></div>`;
  const found = r.found || [];
  return `<p class="eyebrow">${KIND[s.kind]}</p><h2>${esc(s.title)}</h2><p>${esc(r.outcome)}</p>
    ${r.applied ? `<p class="reward-line">${deltaChips(r.applied) || 'No change to your reputation.'}</p>` : ''}
    ${r.xpGained ? `<p class="reward-line">+${r.xpGained} XP</p>` : ''}
    ${r.rumour && !found.some((f) => f.story === s.id) ? '<p class="whisper">Nobody saw… you think. A whisper has started. You can own up any time in Profile.</p>' : ''}
    ${found.map((f) => `<div class="exposed"><b>Felixstowe News: “${esc(f.title)}” comes out!</b>${deltaChips(f.applied)}${f.mark ? `<small>New Mark: ${esc(MARKS[f.mark].name)}. Put it right with “${esc(app.game.story(MARKS[f.mark].fix).title)}”.</small>` : ''}</div>`).join('')}
    <div class="actions"><button class="btn primary" data-act="close-sheet">Carry on</button></div>`;
}

export function reportSheet() {
  return `<p class="eyebrow">Safety</p><h2>Report a problem</h2>
    <p>Tell us about anything unsafe, upsetting or wrong: a check-in point in a bad spot, a mission that worries you, a business problem or a mistake with your reputation.</p>
    <p class="fine">If someone is in danger now, call 999.</p>
    <form id="report-form"><label for="rp-cat">What’s it about?</label>
      <select id="rp-cat"><option value="unsafe_location">Unsafe or unsuitable location</option><option value="mission">A mission or story</option><option value="person">Someone’s behaviour</option><option value="business">A business or venue</option><option value="reputation">A reputation decision (appeal)</option><option value="privacy">Privacy</option><option value="other">Something else</option></select>
      <label for="rp-text">Details <span class="muted">(please don’t include anyone’s address or phone number)</span></label>
      <textarea id="rp-text" rows="4" maxlength="500"></textarea>
      <button class="btn primary" type="submit">Send report</button></form>
    <p class="fine">Demo: reports are stored on this device and shown in the admin panel’s Safety section. In a real launch they go to a trust and safety team who reply within the published times.</p>`;
}

export function guidelines() {
  return `<details class="card guidelines"><summary>Play the town, respect the town</summary><ul>
    <li><b>Mischief stays on screen.</b> The roadsters, envelopes and pranks are part of the story. Never try any of it for real.</li>
    <li><b>Be a good visitor.</b> Scan the code and carry on. Don’t block doorways or ask staff for freebies. You never need to buy anything.</li>
    <li><b>Stay safe.</b> Stick to pavements and public places. Keep away from cliff edges, sea defences, the railway and the port. Real-world check-ins run 08:00–20:00.</li>
    <li><b>Keep it to yourself.</b> Don’t share codes, post your location or try to find other players.</li>
    <li><b>Be kind.</b> The rivals are fictional. Real people deserve respect.</li></ul>
    <p class="fine">The game is independent and isn’t endorsed by Felixstowe Town Council. Being Mayor in the game has no real authority.</p></details>`;
}
