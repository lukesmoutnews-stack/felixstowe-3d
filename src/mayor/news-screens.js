// Felixstowe News – Game Edition: news page, article sheet, breaking banner, home card.

import { BRAND } from './news.js';
import { townHallArt, icon, escapeHtml as esc } from './art.js';

const fmt = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

// Gull silhouette used for the masthead mark and illustrations (drawn to echo the Felixstowe News logo).
export const GULL = 'M1 6.5C5 5 8.8 6.6 11.6 10.6C12.4 10 13.6 10 14.4 10.6C17.2 6.6 21 5 25 6.5C21 7.2 17.6 9.3 15.2 12.8L14.6 14.2C14.2 15.2 11.8 15.2 11.4 14.2L10.8 12.8C8.4 9.3 5 7.2 1 6.5Z';
export function gull(size = 24, fill = BRAND.ink) { return `<svg class="gull" width="${size}" height="${size}" viewBox="0 0 26 22" aria-hidden="true"><path d="${GULL}" fill="${fill}"/></svg>`; }

export function masthead(small = false) {
  return `<div class="fn-mast ${small ? 'small' : ''}"><img src="${BRAND.logo}" alt="Felixstowe News" width="${small ? 34 : 56}" height="${small ? 34 : 56}"><div><b>FELIXSTOWE NEWS</b><span>${BRAND.edition} · stories from your campaign</span></div></div>`;
}

function art(a) {
  if (a.section === 'Campaign' || a.section === 'Front page' || a.type === 'mayor' || a.type === 'final_open') return `<div class="fn-art hall">${townHallArt(a.type === 'mayor' ? 5 : 3)}</div>`;
  const bad = a.tone === 'bad';
  return `<div class="fn-art ${bad ? 'bad' : ''}"><svg viewBox="0 0 320 140" aria-hidden="true"><rect width="320" height="140" fill="${bad ? BRAND.ink : BRAND.yellow}"/>
    <path d="M0 112 Q80 98 160 110 T320 106 V140 H0Z" fill="${bad ? '#2a2a2e' : '#f2c400'}"/>
    <g transform="translate(118 26) scale(3.4)"><path d="${GULL}" fill="${bad ? BRAND.yellow : BRAND.ink}"/></g>
    <text x="16" y="128" font-family="Anton, Impact, sans-serif" font-size="18" letter-spacing="1" fill="${bad ? BRAND.yellow : BRAND.ink}">${esc(a.section.toUpperCase())}</text></svg></div>`;
}

export function newsPage(app) {
  const g = app.game, list = g.news();
  return `<header class="fn-head">${masthead()}</header>
    <p class="fn-note">${icon('eye')}Every story here is fictional and written from what you do in the game. Real Felixstowe news lives on the Felixstowe News website.</p>
    ${list.length ? `<div class="fn-list">${list.map((a, i) => `<button class="fn-item ${a.tone} ${i === 0 ? 'lead' : ''} ${a.read ? 'read' : ''}" data-act="open-news" data-id="${a.id}">
      ${i === 0 ? art(a) : ''}<span class="fn-sec">${a.breaking ? '<i>Breaking</i>' : ''}${a.special ? '<i class="sp">Special report</i>' : ''}${esc(a.section)}</span>
      <b>${esc(a.headline)}</b>${i === 0 ? `<span class="fn-stand">${esc(a.standfirst)}</span>` : ''}<time>${fmt(a.ts)}</time></button>`).join('')}</div>`
      : `<div class="fn-empty">${gull(48)}<p>No headlines yet. Get out into the town: what you do decides what gets written.</p></div>`}
    <a class="fn-visit" href="${BRAND.url}" target="_blank" rel="noopener">${gull(18)}<span>Read real local news at <b>${BRAND.display}</b></span>${icon('guide')}</a>
    <p class="fine">Felixstowe News branding is used with the owner’s permission. Game stories are not published by Felixstowe News.</p>`;
}

export function articleSheet(app, id) {
  const g = app.game, a = g.news().find((x) => x.id === id); if (!a) return '<p>Story not found.</p>';
  a.read = true; g.save();
  const link = a.link?.kind === 'mission' ? `<button class="btn" data-act="open-mission" data-id="${a.link.id}">See the mission</button>`
    : a.link?.kind === 'loc' ? `<button class="btn" data-act="open-loc" data-id="${a.link.id}">See the place</button>`
      : a.link?.kind === 'story' ? `<button class="btn" data-act="open-story" data-id="${a.link.id}">See the story</button>`
        : a.link?.kind === 'profile' ? '<button class="btn" data-act="tab" data-tab="profile">See your reputation</button>' : '';
  return `<article class="fn-article ${a.tone}">${masthead(true)}${art(a)}
    <p class="fn-sec">${a.breaking ? '<i>Breaking</i>' : ''}${a.special ? '<i class="sp">Special report</i>' : ''}${esc(a.section)} · <time>${fmt(a.ts)}</time></p>
    <h2>${esc(a.headline)}</h2><p class="fn-stand">${esc(a.standfirst)}</p>${a.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    <p class="fn-disc">${esc(BRAND.disclaimer)}</p>
    <div class="actions">${link}<a class="btn fn-btn" href="${BRAND.url}" target="_blank" rel="noopener">Visit ${BRAND.display}</a></div></article>`;
}

export function breakingBanner(a) {
  return `<button class="fn-breaking ${a.tone}" data-act="open-news" data-id="${a.id}">${gull(22)}<span><small>${a.special ? 'Special report' : 'Breaking'} · Felixstowe News</small><b>${esc(a.headline)}</b></span></button>`;
}

export function homeNewsCard(app) {
  const a = app.game.latestHeadline();
  return `<button class="fn-card" data-act="tab" data-tab="news">${masthead(true)}${a ? `<b>${esc(a.headline)}</b><time>${fmt(a.ts)}</time>` : '<b>What you do makes the headlines.</b>'}</button>`;
}
