// Conversations with residents, and the Influence card. Actions handled in app.js.

import { GROUPS, INF, RESIDENTS } from './residents.js';
import { icon, escapeHtml as esc } from './art.js';

const gname = (id) => GROUPS.find((g) => g.id === id);
const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
export function infChips(eff) {
  if (!eff || !Object.keys(eff).length) return '';
  return `<span class="dchips">${Object.entries(eff).map(([g, v]) => `<span class="dchip ${v > 0 ? 'up' : 'down'}" style="--g:${gname(g)?.colour}">${esc(gname(g)?.short || g)} ${sign(v)}</span>`).join('')}</span>`;
}
const MOOD = { happy: '😊', neutral: '🙂', suspicious: '🤨', disappointed: '😞', embarrassed: '😳', confident: '😏' };

export function talkSheet(app, t, history = []) {
  const r = t.res, g = gname(r.group), st = app.game.person(r.id);
  return `<div class="talk">
    <header class="talk-head"><div class="talk-face" aria-hidden="true">${MOOD[t.mood] || '🙂'}</div><div><h2>${esc(r.name)}</h2><p class="who">${esc(r.role)}</p>
      <p class="talk-tags"><span class="tag" style="background:${g.colour}22;color:${g.colour}">${esc(g.name)}</span>${r.rival ? '<span class="tag k-temptation">Rival candidate</span>' : ''}${r.reporter ? '<span class="tag fn">Felixstowe News · Game Edition</span>' : ''}</p></div></header>
    <div class="bubbles">
      ${history.map((h) => `<p class="bubble ${h.me ? 'me' : 'them'}">${esc(h.text)}${h.extra || ''}</p>`).join('')}
      ${t.greet ? `<p class="bubble them">${esc(t.greet)}</p>` : ''}${t.newsLine ? `<p class="bubble them news">${esc(t.newsLine)}</p>` : ''}
      <p class="bubble them">${esc(t.say)}</p>
    </div>
    <div class="choices">${t.choices.map((c) => `<button class="choice" data-act="talk-answer" data-id="${r.id}" data-node="${t.nodeId}" data-i="${c.i}"><b>${esc(c.label)}</b>${c.promise ? '<small>Makes a promise</small>' : c.accept ? '<small>Offers a mission</small>' : ''}</button>`).join('')}</div>
    <p class="fine">${esc(r.name)} is a fictional character. ${st.met ? `You’ve talked ${st.talks} time${st.talks === 1 ? '' : 's'}.` : 'First time you’ve met.'} What you say changes how groups in the town feel about you; promises are remembered.</p>
  </div>`;
}

export function influenceCard(app) {
  const g = app.game, groups = g.groupSupport(), I = g.inf(), people = RESIDENTS.filter((r) => I.people[r.id]?.met), prs = Object.values(I.promises);
  return `<section class="card inf-card"><h3 class="sec">Influence <span class="muted">– support from Felixstowe’s fictional residents</span></h3>
    <div class="inf-bars">${groups.map((x) => `<div class="inf-row ${x.endorsed ? 'ok' : ''}"><span class="nm"><b>${esc(x.name)}</b><small>${esc(x.blurb)}</small></span><span class="bar"><i style="width:${x.value}%;background:${x.colour}"></i><em style="left:${INF.endorse}%"></em></span><span class="v">${x.value}${x.endorsed ? ` ${icon('check')}` : ''}</span></div>`).join('')}</div>
    <p class="fine">At ${INF.endorse}+ a group endorses you. Mayoral Candidate needs three endorsements. Support comes from listening to people, keeping promises, real visits and community missions. Money can’t buy it.</p>
    ${prs.length ? `<h4>Promises</h4><ul class="endorse">${prs.map((p) => `<li class="${p.status === 'kept' ? 'ok' : ''}">${icon(p.status === 'kept' ? 'check' : p.status === 'broken' ? 'close' : 'star')}<span><b>${esc(p.text)}</b><small>To ${esc(g.resident(p.person)?.name)} · ${p.status === 'open' ? `due ${new Date(p.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : p.status}</small></span></li>`).join('')}</ul>` : ''}
    ${people.length ? `<h4>People you know</h4><ul class="people">${people.map((r) => { const s = I.people[r.id]; const feel = s.rel > 6 ? 'Warm' : s.rel > 1 ? 'Friendly' : s.rel < -2 ? 'Cool' : 'Neutral'; return `<li><b>${esc(r.name)}</b><small>${esc(r.role)} · ${feel}</small></li>`; }).join('')}</ul>` : '<p class="muted">Walk up to people in the 3D town and talk to them. Their names float above them.</p>'}
  </section>`;
}
