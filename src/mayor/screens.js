// Screen templates. Each returns HTML; actions use data-act attributes handled in app.js.

import { STATUS_LABEL, QUIZZES, STOP_QUESTIONS, EVENTS, ACHIEVEMENTS, COSMETICS } from './engine.js';
import { logo, townHallArt, avatar, icon, stamp, escapeHtml as esc } from './art.js';
import { repStrip, repCard, storiesList, guidelines } from './rep-screens.js';
import { homeNewsCard } from './news-screens.js';
import { influenceCard } from './talk-screens.js';
import { VEHICLES } from '../play/vehicles/specs.js';

// Garage: earned by rank, never bought. Paint is cosmetic.
const GARAGE = [['hatchback', 'newcomer'], ['family', 'explorer'], ['van', 'explorer'], ['suv', 'champion'], ['parcel', 'champion'], ['saloon', 'champion'], ['sports', 'advocate'], ['boxtruck', 'advocate'], ['flatbed', 'advocate'], ['bus', 'candidate'], ['doubledecker', 'candidate'], ['artic', 'candidate']];
function garage(app) {
  const g = app.game, ri = g.rankIndex(), cur = g.p.garage?.car || 'hatchback';
  return `<section class="card"><h3 class="sec">Garage <span class="muted">– vehicles you’ve earned for the 3D town</span></h3><div class="garage">${GARAGE.map(([t, rank]) => { const s = VEHICLES[t], ok = g.config.ranks.findIndex((r) => r.id === rank) <= ri; return `<div class="gv ${ok ? '' : 'locked'}"><b>${esc(s.name.replace(/ \(.*\)/, ''))}${cur === t ? ' ✓' : ''}</b><small>${ok ? `${s.len.toFixed(1)} m · ${Math.round(s.vmax * 2.237)} mph top speed` : 'Unlocks at ' + esc(g.config.ranks.find((r) => r.id === rank).name)}</small>${ok ? `<div class="paints">${s.colours.map((c) => `<button class="paint" style="background:#${c.toString(16).padStart(6, '0')}" data-act="garage-bring" data-id="${t}" data-colour="${c}" aria-label="Bring it here in this colour"></button>`).join('')}</div>` : ''}</div>`; }).join('')}</div>
    <p class="fine">Tap a colour to park that vehicle next to you in the 3D town. Every vehicle is earned through play; none can be bought. Driving happens only in the game: in real life, follow the Highway Code.</p></section>`;
}

const COLOURS = ['#0e7c7b', '#ef6a56', '#f2b632', '#4b6cb7', '#7a5c99', '#2e8a57'];
const STATES = ['undiscovered', 'discovered', 'visit_required', 'visited', 'completed'];
const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });
const fmtDT = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const kindTag = (l) => (l.kind === 'business' ? '<span class="tag demo">Fictional demo business</span>' : '<span class="tag real">Real place</span>') + (l.sponsored ? ' <span class="tag spon">Sponsored (demo)</span>' : '');
const pill = (st) => `<span class="pill st-${st}">${esc(STATUS_LABEL[st])}</span>`;
const bar = (f, cls = '') => `<div class="meter ${cls}" role="progressbar" aria-valuenow="${Math.round(f * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0, Math.min(100, f * 100))}%"></span></div>`;

// ---------------- onboarding ----------------
export function onboarding() {
  return `<main class="screen onboarding">
    <div class="ob-hero">${townHallArt(5)}</div>
    <div class="ob-logo">${logo()}</div>
    <p class="lede">Every campaign ends at the Town Hall. Explore the real streets of Felixstowe in 3D, find shops and landmarks, then visit them in person to collect stamps, light up the Town Hall rank by rank, and finish the race on its steps.</p>
    <div class="ob-news"><img src="icons/felixstowe-news.png" alt="" width="40" height="40"><span>Your campaign makes the headlines in <b>Felixstowe News</b> (game edition). Real local news: <a href="https://www.felixstowenews.co.uk" target="_blank" rel="noopener">felixstowenews.co.uk</a></span></div>
    <form id="onboard" class="card form" novalidate>
      <h2>Create your player</h2>
      <label for="ob-name">Display name</label>
      <input id="ob-name" name="name" maxlength="20" autocomplete="nickname" placeholder="e.g. PierWalker" required>
      <fieldset class="swatches"><legend>Colour</legend>${COLOURS.map((c, i) => `<label class="sw" style="--c:${c}"><input type="radio" name="colour" value="${c}" ${i === 0 ? 'checked' : ''}><span></span></label>`).join('')}</fieldset>
      <p class="err" role="alert"></p>
      <button class="btn primary big" type="submit">Start the race</button>
      <button class="btn ghost" type="button" data-act="demo-profile">Use a demo profile</button>
    </form>
    <p class="fine">Race to Be Mayor is an independent game. It is not affiliated with or endorsed by Felixstowe Town Council, and it gives no access to the Town Hall. The mayoral title is a fictional game award, not a real office or election. Your progress is saved in this browser only; no account, email or location tracking is used.</p>
  </main>`;
}

// ---------------- next action ----------------
export function nextAction(app) {
  const g = app.game;
  const active = g.missions().filter((m) => g.missionState(m) === 'active');
  for (const m of active) {
    const step = m.steps.find((s) => !g.stepDone(s)); if (!step) continue;
    const [k, a] = step.split(':');
    if (['discover', 'visit', 'stop'].includes(k) && g.loc(a)) {
      const l = g.loc(a);
      return { type: 'location', id: a, mission: m.id, title: m.hideTarget && k === 'visit' ? m.title : (k === 'discover' ? `Find ${l.name}` : `Visit ${l.name}`), text: k === 'discover' ? `Head for the marker to discover ${l.name}.` : `${l.name}: real-world visit required. Scan its QR code when you're there.` };
    }
    return { type: 'mission', id: m.id, title: m.title, text: g.stepLabel(step, m) };
  }
  const near = g.locations().find((l) => !g.isDiscovered(l.id) && l.area === 'Town centre') || g.locations().find((l) => !g.isDiscovered(l.id));
  if (near) return { type: 'location', id: near.id, title: 'Discover somewhere new', text: `There's something to discover around ${near.street || near.area}.` };
  const avail = g.missions().find((m) => g.missionState(m) === 'available');
  if (avail) return { type: 'mission', id: avail.id, title: avail.title, text: 'Accept a new mission.' };
  return { type: 'explore', title: 'Explore Felixstowe', text: 'Walk the town in 3D.' };
}

// ---------------- home ----------------
function hallHero(app) {
  const g = app.game, ch = g.chapter(), hub = g.hub(), d = hub && app.layer?.distanceTo(hub.id);
  return `<section class="hall-hero"><button class="hall-art" data-act="open-loc" data-id="${hub?.id}" aria-label="Felixstowe Town Hall">${townHallArt(g.rankIndex())}</button>
    <div class="hall-text"><p class="eyebrow">Chapter ${ch.n} of 6 \u00b7 The road to the Town Hall</p><h2>${esc(ch.title)}</h2><p>${esc(ch.text)}</p>
    <p class="lights">${icon('star')}${esc(ch.lights)}</p>${d != null ? `<p class="dist">${icon('guide')}You are ${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km'} from the Town Hall in the 3D town</p>` : ''}</div></section>`;
}
export function home(app) {
  const g = app.game, p = g.p.player, r = g.rank(), nx = g.nextRank(), st = g.stats(), n = nextAction(app);
  const req = nx ? g.requirements(nx) : [];
  const frac = nx ? Math.min(1, (st.xp - r.xp) / Math.max(1, nx.xp - r.xp)) : 1;
  const ranks = g.config.ranks, ri = g.rankIndex();
  const weekly = g.mission('high_street');
  const trails = g.missions().filter((m) => m.type === 'trail');
  const featured = g.locations().filter((l) => l.kind === 'business' && (l.tier === 'featured' || l.tier === 'campaign'));
  const badges = Object.entries(g.p.achievements).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, ts]) => ({ a: ACHIEVEMENTS.find((x) => x.id === id), ts }));
  return `<header class="home-top">${logo({ compact: true })}<button class="avatar-btn" data-act="tab" data-tab="profile" aria-label="Your profile">${avatar(p.name, p.colour, 40)}</button></header>
  <section class="hello"><p class="eyebrow">Your campaign \u00b7 ${esc(g.config.season.name)}</p><h1>Hello, ${esc(p.name)}</h1></section>
  ${hallHero(app)}
  ${repStrip(app)}
  ${homeNewsCard(app)}
  <section class="card rank-card">
    <div class="rank-row"><div><p class="eyebrow">Career rank</p><h2>${esc(r.name)}</h2></div><div class="xp-big"><b>${st.xp.toLocaleString('en-GB')}</b><span>XP</span></div></div>
    ${nx ? `${bar(frac)}<p class="small">Next: <b>${esc(nx.name)}</b></p><ul class="req">${req.map((x) => `<li class="${x.done ? 'done' : ''}">${icon(x.done ? 'check' : 'lock')}${esc(x.label)}${x.need ? ` <span class="muted">(${Math.min(x.have, x.need)}/${x.need})</span>` : ''}</li>`).join('')}</ul>` : '<p class="small">You hold the top rank this season.</p>'}
  </section>
  <section class="cta-card">
    <p class="eyebrow">Next step</p><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p>
    <button class="btn primary big" data-act="continue">${icon('explore')}Continue your campaign</button>
  </section>
  <section class="card"><p class="eyebrow">Road to the Town Hall</p>
    <ol class="mayor-track">${ranks.map((k, i) => `<li class="${i < ri ? 'past' : i === ri ? 'now' : ''}"><span class="dot">${i < ri ? icon('check') : i + 1}</span><span class="lbl">${esc(k.name)}</span></li>`).join('')}</ol>
    <p class="fine">Mayor of Felixstowe is a fictional game title for the season winner of the final challenge. It is not a real office or election.</p></section>
  <section class="stats3">
    <div><b>${st.visits}</b><span>Real-world visits</span></div><div><b>${st.missions}</b><span>Missions done</span></div><div><b>${st.stamps}</b><span>Stamps</span></div>
  </section>
  ${weekly ? `<section class="card feature"><div class="feature-head"><span class="tag week">Weekly challenge</span><span class="xp">+${weekly.xp} XP</span></div>
    <h3>${esc(weekly.title)}</h3><p>${esc(weekly.description)}</p>${missionProgress(g, weekly)}
    <button class="btn" data-act="open-mission" data-id="${weekly.id}">${g.missionState(weekly) === 'available' ? 'View challenge' : 'View progress'}</button></section>` : ''}
  <section><h3 class="sec">Featured places</h3><div class="hscroll">${featured.map((l) => locCard(g, l)).join('')}</div><p class="fine">Featured and sponsored places are fictional demo businesses, labelled so you can tell them apart.</p></section>
  <section class="card"><h3 class="sec">Trail progress</h3>${trails.map((m) => { const pr = g.progress(m); return `<button class="trail-row" data-act="open-mission" data-id="${m.id}"><span class="t">${esc(m.title)}</span><span class="n">${pr.done}/${pr.total}</span>${bar(pr.done / pr.total, 'thin')}</button>`; }).join('')}</section>
  <section class="card"><h3 class="sec">Recent badges</h3>${badges.length ? `<div class="badges mini">${badges.map(({ a, ts }) => badge(a, ts)).join('')}</div>` : '<p class="muted">Discover your first location to earn a badge.</p>'}</section>
  <section class="card"><h3 class="sec">Recent activity</h3><ul class="feed">${g.p.feed.slice(0, 5).map((f) => `<li><span>${esc(f.text)}</span><time>${fmtDT(f.ts)}</time></li>`).join('')}</ul></section>`;
}
function locCard(g, l) {
  const st = g.locationStatus(l.id), known = st !== 'undiscovered';
  return `<button class="loc-card" data-act="open-loc" data-id="${l.id}"><span class="lc-cat">${esc(known ? l.category : 'Undiscovered')}</span><b>${esc(known ? l.name : 'Something on ' + (l.street || l.area))}</b>${l.sponsored ? '<span class="tag spon">Sponsored</span>' : l.tier === 'featured' ? '<span class="tag feat">Featured</span>' : ''}${pill(st)}</button>`;
}
function badge(a, ts) { return `<div class="badge ${ts ? 'got' : ''}" title="${esc(a.text)}"><span class="medal">${icon(ts ? 'star' : 'lock')}</span><b>${esc(a.title)}</b>${ts ? `<time>${fmtDate(ts)}</time>` : `<small>${esc(a.text)}</small>`}</div>`; }
function missionProgress(g, m) { const pr = g.progress(m); return `<div class="mp">${bar(pr.done / pr.total)}<span>${pr.done}/${pr.total} steps</span></div>`; }

// ---------------- explore ----------------
export function explore(app) {
  const f = app.filters;
  const chip = (key, val, label) => `<button class="chip ${f[key] === val ? 'on' : ''}" data-act="filter" data-key="${key}" data-val="${val}">${label}</button>`;
  return `<div class="explore-top">
      <div class="searchbar">${icon('search')}<input id="explore-search" type="search" placeholder="Search places" value="${esc(f.q)}" aria-label="Search places" autocomplete="off"></div>
      <div class="seg"><button class="${app.exploreView === 'map' ? 'on' : ''}" data-act="explore-view" data-view="map">${icon('map')}3D map</button><button class="${app.exploreView === 'list' ? 'on' : ''}" data-act="explore-view" data-view="list">${icon('list')}List</button></div>
    </div>
    <div class="chips">${chip('kind', 'all', 'All')}${chip('kind', 'business', 'Businesses')}${chip('kind', 'landmark', 'Landmarks')}${chip('status', 'all', 'Any status')}${chip('status', 'todo', 'To visit')}${chip('status', 'done', 'Visited')}</div>
    <div id="guide" class="guide" hidden><span class="g-arrow">${icon('guide')}</span><span class="g-text"><b class="g-name"></b><span class="g-dist"></span></span></div>
    <div id="load3d" class="load3d" ${app.layer ? 'hidden' : ''}><p>Building the 3D town from open map data…</p><div class="meter"><span class="bar" style="width:${app.threeProgress}%"></span></div><p class="fine">You can browse the list while it loads.</p></div>
    ${app.exploreView === 'list' ? `<div class="list-panel"><div id="explore-list">${exploreList(app)}</div></div>` : `
    <div class="map-tools"><button class="fab" data-act="view-toggle">${icon('overview')}<span>Overview</span></button><button class="fab" data-act="explore-view" data-view="list">${icon('list')}<span>List</span></button></div>
    <div id="stick" class="stick" aria-label="Move: drag the stick"><span class="knob"></span></div>
    <button id="act-btn" class="act-btn" data-act="world-act" hidden></button>
    <p class="map-hint">Drag the stick to walk · drag the view to look · tap a pin</p>`}`;
}
export function exploreList(app) {
  const g = app.game, f = app.filters, q = f.q.trim().toLowerCase();
  let list = g.locations().map((l) => ({ l, st: g.locationStatus(l.id), d: app.layer?.distanceTo(l.id) }));
  if (f.kind !== 'all') list = list.filter((x) => x.l.kind === f.kind);
  if (f.status === 'todo') list = list.filter((x) => !['visited', 'completed'].includes(x.st));
  if (f.status === 'done') list = list.filter((x) => ['visited', 'completed'].includes(x.st));
  if (q) list = list.filter((x) => x.st !== 'undiscovered' ? (x.l.name + ' ' + x.l.category + ' ' + (x.l.street || '')).toLowerCase().includes(q) : (x.l.street || x.l.area).toLowerCase().includes(q));
  list.sort((a, b) => (b.l.hub ? 1 : 0) - (a.l.hub ? 1 : 0) || (a.d ?? 1e9) - (b.d ?? 1e9));
  if (!list.length) return '<p class="empty">No places match. Clear the search or filters.</p>';
  return `<ul class="loc-list">${list.map(({ l, st, d }) => `<li class="${l.hub ? 'hub' : ''}"><button data-act="open-loc" data-id="${l.id}"><span class="ll-ic st-${st}">${icon(l.hub ? 'hall' : st === 'undiscovered' ? 'search' : l.kind === 'business' ? 'shop' : 'flag')}</span>
    <span class="ll-main"><b>${esc(l.hub ? 'Felixstowe Town Hall \u2013 the goal' : st === 'undiscovered' ? `Undiscovered place \u00b7 ${l.street || l.area}` : l.name)}</b><small>${esc(st === 'undiscovered' ? 'Explore the 3D town nearby to reveal it' : `${l.category} · ${l.area}`)}${l.kind === 'business' && st !== 'undiscovered' ? ' · demo' : ''}</small>${pill(st)}</span>
    <span class="ll-d">${d != null ? (d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km') : ''}</span></button></li>`).join('')}</ul>`;
}

// ---------------- location sheet ----------------
export function locationSheet(app, id) {
  const g = app.game, l = g.loc(id), st = g.locationStatus(id);
  if (st === 'undiscovered' && l.hub) {
    return `<p class="eyebrow">The goal of the race</p><h2>Felixstowe Town Hall</h2><div class="hall-sheet-art">${townHallArt(g.rankIndex())}</div>
      <p>Every campaign ends here. Follow the golden beacon in the 3D town and walk within ${g.config.discoverRadius} m to discover it properly.</p>
      <p class="fine">${esc(l.story)}</p>
      <div class="actions"><button class="btn primary" data-act="guide" data-id="${id}">${icon('guide')}Guide me there in 3D</button><button class="btn" data-act="travel" data-id="${id}">Travel to the area</button></div>`;
  }
  if (st === 'undiscovered') {
    return `<p class="eyebrow">Undiscovered place</p><h2>Something is waiting on ${esc(l.street || l.area)}</h2>
      ${stepper(st)}
      <p>Walk within ${g.config.discoverRadius} m of this pin in the 3D town to discover what it is. Discovery happens in the virtual town; the reward for visiting happens in the real one.</p>
      <div class="actions"><button class="btn primary" data-act="guide" data-id="${id}">${icon('guide')}Guide me there in 3D</button><button class="btn" data-act="travel" data-id="${id}">Travel to the area</button></div>`;
  }
  const missions = g.missions().filter((m) => g.missionLocations(m).includes(id));
  const prim = g.primaryMission(id); const visited = g.visitedIds().has(id);
  const needsVisit = st === 'visit_required';
  const myVisits = g.myCheckins().filter((c) => c.target === id);
  const directions = l.kind === 'landmark'
    ? `<div class="links"><a class="btn small" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}" target="_blank" rel="noopener">${icon('external')}Directions (Google Maps)</a><a class="btn small" href="https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=18/${l.lat}/${l.lon}" target="_blank" rel="noopener">${icon('external')}OpenStreetMap</a></div>`
    : '<p class="fine">This is a fictional business, so there are no real directions. In a pilot, each participating business would have a verified address and a QR poster on its premises.</p>';
  return `<p class="eyebrow">${esc(l.category)} \u00b7 ${esc(l.area)}</p><h2>${esc(l.name)}</h2>
    <div class="tags">${kindTag(l)}${l.hub ? ' <span class="tag hub">The goal of the race</span>' : ''}</div>
    ${l.hub ? `<div class="hall-sheet-art">${townHallArt(g.rankIndex())}</div><p class="fine">${esc(g.chapter().lights)} Chapter ${g.chapter().n} of 6.</p>` : ''}
    ${stepper(st)}
    <p class="status-line">${pill(st)}${visited ? ` <span class="tag got">${icon('check')}Visited ${fmtDate(myVisits[0].ts)}${myVisits.some((c) => c.simulated) ? ' (simulated)' : ''}</span>` : ''}</p>
    <p class="blurb">${esc(l.blurb)}</p>
    ${l.story ? `<p class="story">${esc(l.story)}</p>` : ''}
    ${(l.facts || []).length ? `<div class="facts"><h3>Did you know?</h3>${l.facts.map((f) => `<p>${esc(f.text)} <a href="${esc(f.source)}" target="_blank" rel="noopener">Source</a></p>`).join('')}</div>` : ''}
    <dl class="meta"><dt>Address</dt><dd>${l.kind === 'business' ? `Fictional – marker on ${esc(l.street)} is illustrative only` : `${esc(l.area)}, Felixstowe (position from OpenStreetMap ${esc(l.osm || '')})`}</dd>
      <dt>Opening</dt><dd>${esc(l.opening || 'Demo business – no real opening hours')}</dd>
      <dt>Taking part</dt><dd>${l.kind === 'business' ? 'Demo participant (fictional)' : l.hub ? 'Independent game \u2013 no partnership with Felixstowe Town Council. There is no QR code on the building; a pilot would only add one with the council\u2019s permission, otherwise finale codes come from game organisers at an outdoor event.' : 'Not yet \u2013 no QR plaque exists here. A pilot would need the owner\u2019s permission.'}</dd>
      ${l.offer ? `<dt>Offer</dt><dd>${esc(l.offer)}</dd>` : ''}</dl>
    ${missions.map((m) => missionMini(g, m, id)).join('')}
    ${STOP_QUESTIONS[id] && missions.some((m) => m.id === 'seafront_explorer' && g.missionState(m) === 'active') && !g.stepDone('stop:' + id) ? stopQuestion(id) : ''}
    <div class="checkin-box ${needsVisit ? 'need' : ''}">
      ${needsVisit ? `<p class="need-title">${icon('qr')}<b>Real-world visit required</b></p><p>Go to ${esc(l.name)} and scan the QR code displayed there. Opening this page doesn’t count as a visit.</p>` : visited ? '<p>You’ve checked in here. Business repeat-visit challenges allow one check-in per day.</p>' : '<p>Accept a mission first, or check in when you’re there.</p>'}
      <div class="actions"><button class="btn primary" data-act="checkin" data-loc="${id}">${icon('qr')}Check in with QR code</button>
      <button class="btn demo" data-act="simulate" data-type="location" data-id="${id}">Simulated check-in (demo)</button></div>
      <p class="fine">The simulated check-in exists only to test the game without travelling. It is recorded as simulated and never counts as proof of a real visit.</p>
    </div>
    <div class="actions"><button class="btn" data-act="guide" data-id="${id}">${icon('guide')}Show in 3D</button></div>
    ${directions}`;
}
function stepper(st) {
  const idx = { undiscovered: 0, discovered: 1, accepted: 2, visit_required: 2, visited: 3, completed: 4 }[st];
  const labels = ['Undiscovered', 'Discovered', 'Visit required', 'Visited', 'Mission completed'];
  return `<ol class="stepper">${labels.map((t, i) => `<li class="${i < idx ? 'past' : i === idx ? 'now' : ''}"><span></span>${t}</li>`).join('')}</ol>`;
}
function missionMini(g, m, locId) {
  const ms = g.missionState(m), pr = g.progress(m);
  return `<div class="mission-mini ${ms}"><div class="mm-head"><span class="tag cat-${m.category}">${catLabel(m)}</span><span class="xp">+${m.xp} XP</span></div>
    <h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>
    <ul class="steps">${pr.steps.map((s) => `<li class="${s.done ? 'done' : ''} k-${s.kind}">${icon(s.done ? 'check' : s.kind === 'physical' ? 'pin' : s.kind === 'virtual' ? 'eye' : 'star')}<span>${esc(s.label)}</span></li>`).join('')}</ul>
    ${ms === 'available' ? `<button class="btn primary" data-act="accept" data-id="${m.id}">Accept mission</button>` : ms === 'completed' ? `<p class="done-line">${icon('check')}Mission completed</p>` : ms === 'locked' ? `<p class="muted">${icon('lock')}Locked until Mayoral Candidate</p>` : `<button class="btn ghost" data-act="open-mission" data-id="${m.id}">Mission details</button>`}
  </div>`;
}
function stopQuestion(id) { const q = STOP_QUESTIONS[id]; return `<div class="stopq"><h3>Stop question</h3><p>${esc(q.q)}</p><div class="opts">${q.a.map((a, i) => `<button class="opt" data-act="stop-answer" data-id="${id}" data-i="${i}">${esc(a)}</button>`).join('')}</div><p class="fine">A correct answer completes this trail stop but doesn’t count as a visit.</p></div>`; }
function catLabel(m) { return { business: 'Business', exploration: 'Exploration', community: 'Community', mayoral: 'Final challenge' }[m.category] + (m.type === 'trail' ? ' trail' : '') + (m.sponsored ? ' · sponsored' : ''); }

// ---------------- missions ----------------
export function missions(app) {
  const g = app.game, t = app.missionTab;
  const all = g.missions().map((m) => ({ m, st: g.missionState(m) }));
  const groups = { active: all.filter((x) => x.st === 'active'), available: all.filter((x) => x.st === 'available' || x.st === 'locked'), completed: all.filter((x) => x.st === 'completed'), stories: g.stories().filter((s) => !['hidden', 'done'].includes(g.storyState(s))) };
  const list = t === 'stories' ? [] : groups[t];
  const fin = g.mission('mayoral_challenge'), fst = fin && g.missionState(fin);
  const finCard = fin ? `<button class="final-card ${fst}" data-act="open-mission" data-id="${fin.id}"><div class="fc-art">${townHallArt(g.rankIndex())}</div><div class="fc-text"><p class="eyebrow">The final challenge</p><h3>${esc(fin.title)}</h3><p>${fst === 'locked' ? `Unlocks at Mayoral Candidate. You are a ${esc(g.rank().name)}.` : fst === 'available' && !g.finalEligibility().ok ? `Your reputation isn\u2019t ready yet: ${esc(g.finalEligibility().items.filter((i) => !i.done).map((i) => i.label).join(', '))}.` : fst === 'completed' ? 'Completed \u2013 you finished on the Town Hall steps this season.' : esc(fin.description)}</p></div></button>` : '';
  return `<header class="page-head"><h1>Missions</h1><p class="muted">Every mission moves you closer to the Town Hall. Steps marked with a pin need a real-world visit; quizzes can be done anywhere.</p></header>
    ${finCard}
    <div class="seg wide">${['active', 'available', 'stories', 'completed'].map((k) => `<button class="${t === k ? 'on' : ''}" data-act="mtab" data-val="${k}">${k === 'stories' ? 'Town stories' : k[0].toUpperCase() + k.slice(1)} <span class="count">${groups[k].length}</span></button>`).join('')}</div>
    ${t === 'stories' ? storiesList(app) : list.length ? `<div class="mission-list">${list.map(({ m, st }) => missionCard(g, m, st)).join('')}</div>` : `<p class="empty">${t === 'active' ? 'No active missions. Pick one from Available.' : t === 'completed' ? 'Nothing completed yet.' : 'All missions accepted.'}</p>`}`;
}
function missionCard(g, m, st) {
  const pr = g.progress(m);
  const phys = m.physical === true ? `${icon('pin')}Real-world visit` : m.physical === 'mixed' ? `${icon('pin')}Visit or answer` : `${icon('star')}Anywhere`;
  return `<button class="mission-card ${st}" data-act="open-mission" data-id="${m.id}">
    <div class="mc-top"><span class="tag cat-${m.category}">${catLabel(m)}</span><span class="xp">+${m.xp} XP</span></div>
    <h3>${esc(m.title)}</h3><p>${esc(m.riddle && st !== 'completed' ? m.riddle : m.description)}</p>
    <div class="mc-foot"><span class="diff">${esc(m.difficulty)}</span><span class="phys">${phys}</span>${m.demo ? '<span class="tag demo">Demo</span>' : ''}${st === 'locked' ? `<span class="lock">${icon('lock')}Locked</span>` : ''}</div>
    ${st !== 'available' && st !== 'locked' ? `<div class="mp">${bar(pr.done / pr.total)}<span>${pr.done}/${pr.total}</span></div>` : ''}
  </button>`;
}
export function missionSheet(app, id) {
  const g = app.game, m = g.mission(id), st = g.missionState(m), pr = g.progress(m);
  const stepAction = (s) => {
    if (s.done) return '';
    const [k, a] = s.step.split(':');
    if (['discover', 'visit', 'stop', 'repeat'].includes(k) && g.loc(a) && !(m.hideTarget && k === 'visit')) return `<button class="btn small" data-act="open-loc" data-id="${a}">Open</button>`;
    if (k === 'quiz' && st === 'active') return `<button class="btn small primary" data-act="quiz" data-id="${a}">Take quiz</button>`;
    if (k === 'event' && st === 'active') return `<button class="btn small primary" data-act="checkin" data-event="${a}">Check in</button><button class="btn small demo" data-act="simulate" data-type="event" data-id="${a}">Simulate</button>`;
    return '';
  };
  const ev = m.eventId || m.steps.find((s) => s.startsWith('event:'))?.split(':')[1];
  const event = ev && EVENTS.find((e) => e.id === ev);
  return `<p class="eyebrow">${catLabel(m)} · ${esc(m.difficulty)}</p><h2>${esc(m.title)}</h2>
    <div class="tags">${m.demo ? '<span class="tag demo">Demo content</span>' : ''}${m.sponsored ? '<span class="tag spon">Sponsored (demo)</span>' : ''}<span class="tag xp-tag">+${m.xp} XP${m.badge ? ' + badge' : ''}</span></div>
    ${m.riddle ? `<blockquote class="riddle">${esc(m.riddle)}</blockquote>` : ''}
    <p>${esc(m.description)}</p>
    ${event ? `<p class="fine">${esc(event.blurb)} When: ${esc(event.when)}.</p>` : ''}
    ${m.type === 'final' ? '<p class="fine">Winning the Mayoral Challenge makes you the fictional Mayor of Felixstowe for this season of the game. It has no connection with Felixstowe Town Council or any real election.</p>' : ''}
    <div class="mp">${bar(pr.done / pr.total)}<span>${pr.done}/${pr.total} steps</span></div>
    <ul class="steps big">${pr.steps.map((s) => `<li class="${s.done ? 'done' : ''} k-${s.kind}">${icon(s.done ? 'check' : s.kind === 'physical' ? 'pin' : s.kind === 'virtual' ? 'eye' : 'star')}<span>${esc(s.label)}<small>${{ virtual: 'In the 3D town', physical: 'In person – QR check-in', either: 'In person, or answer the stop question', anywhere: 'Anywhere', progress: 'Career progress' }[s.kind] || ''}</small></span>${stepAction(s)}</li>`).join('')}</ul>
    <div class="actions">${st === 'available' ? `<button class="btn primary big" data-act="accept" data-id="${m.id}">Accept mission</button>` : st === 'locked' ? `<p class="muted">${icon('lock')}Reach the rank of Mayoral Candidate to unlock this challenge.</p>` : st === 'completed' ? `<p class="done-line">${icon('check')}Completed ${fmtDate(g.p.completed[m.id].ts)} – +${m.xp} XP awarded</p>` : `<p class="muted">Mission accepted. Complete each step; rewards are added automatically when the last step is verified.</p><button class="btn small ghost" data-act="abandon" data-id="${m.id}">Pause this mission (no penalty)</button>`}</div>
    ${m.type === 'final' ? `<div class="card elig"><h4>Reputation check before the steps</h4><ul class="endorse">${g.finalEligibility().items.map((i) => `<li class="${i.done ? 'ok' : ''}">${icon(i.done ? 'check' : 'lock')}<span><b>${esc(i.label)}</b>${i.have != null ? `<small>You have ${i.have}</small>` : ''}</span></li>`).join('')}</ul><p class="fine">Before the finale the fictional press digs into every candidate: any hidden whisper comes out at 1.5\u00d7 the penalty.</p></div>` : ''}`;
}

// ---------------- quiz runner ----------------
export function startQuiz(app, id) { app.quiz = { id, i: 0, answers: [], picked: null }; renderQuiz(app); }
function renderQuiz(app) {
  const qz = app.quiz, Q = QUIZZES[qz.id];
  if (qz.i >= Q.questions.length) {
    const r = app.game.answerQuiz(qz.id, qz.answers); app.afterAction(r);
    app.openSheet(`<p class="eyebrow">${esc(Q.title)}</p><h2>${r.score} out of ${r.total}</h2>${bar(r.score / r.total, r.passed ? 'good' : '')}
      <p>${r.passed ? `Passed! You needed ${Q.pass}.` : `You need ${Q.pass} to pass. Have another go.`}</p>${r.xpGained ? `<p class="reward-line">+${r.xpGained} XP</p>` : ''}
      ${r.completed.map((m) => `<p class="done-line">${icon('check')}Mission complete: ${esc(m.title)}</p>`).join('')}
      <div class="actions">${r.passed ? '' : `<button class="btn primary" data-act="quiz" data-id="${qz.id}">Try again</button>`}<button class="btn" data-act="close-sheet">Done</button></div>`, 'quiz');
    return;
  }
  const q = Q.questions[qz.i];
  app.openSheet(`<p class="eyebrow">${esc(Q.title)} · Question ${qz.i + 1} of ${Q.questions.length}</p><h2 class="q">${esc(q.q)}</h2>
    <div class="opts">${q.a.map((a, i) => `<button class="opt ${qz.picked != null ? (i === q.c ? 'right' : i === qz.picked ? 'wrong' : '') : ''}" data-act="quiz-answer" data-i="${i}" ${qz.picked != null ? 'disabled' : ''}>${esc(a)}</button>`).join('')}</div>
    ${qz.picked != null ? `<p class="fine">${qz.picked === q.c ? 'Correct.' : `The answer is “${esc(q.a[q.c])}”.`} <a href="${esc(q.src)}" target="_blank" rel="noopener">Source</a></p><button class="btn primary" data-act="quiz-next">${qz.i + 1 < Q.questions.length ? 'Next question' : 'See result'}</button>` : ''}`, 'quiz');
}
export function quizAnswer(app, i) { if (app.quiz.picked != null) return; app.quiz.picked = i; app.quiz.answers[app.quiz.i] = i; renderQuiz(app); }
export function quizNext(app) { app.quiz.i++; app.quiz.picked = null; renderQuiz(app); }

// ---------------- leaderboard ----------------
export function leaderboard(app) {
  const g = app.game, rows = g.leaderboard(), s = g.config.season, me = rows.find((r) => r.me);
  const top = rows.slice(0, 3);
  return `<header class="page-head"><h1>The race to the Town Hall</h1><p class="muted">${esc(s.name)} · ${fmtDate(Date.parse(s.start))} – ${fmtDate(Date.parse(s.end))}</p></header>
    <section class="podium">${[top[1], top[0], top[2]].filter(Boolean).map((r) => `<div class="pod p${r.place} ${r.me ? 'me' : ''}">${avatar(r.name, r.colour, r.place === 1 ? 64 : 52)}<b>${esc(r.name)}</b><span>${r.points.toLocaleString('en-GB')} pts</span><div class="block">${r.place}</div></div>`).join('')}</section>
    ${me ? `<p class="you-line">You are <b>${ordinal(me.place)}</b> with <b>${me.points.toLocaleString('en-GB')}</b> season points.</p>` : ''}
    <ol class="board">${rows.map((r) => `<li class="${r.me ? 'me' : ''}"><span class="pl">${r.place}</span>${avatar(r.name, r.colour, 36)}<span class="nm"><b>${esc(r.name)}${r.me ? ' (you)' : ''}</b><small>${esc(r.stage)}${r.demo ? ' · demo player' : ''}</small></span><span class="pts">${r.points.toLocaleString('en-GB')}</span></li>`).join('')}</ol>
    <details class="card rules"><summary>How scoring works</summary>
      <p>Season points are the XP you earn this season. Nothing can be bought.</p>
      <ul><li>Finding a place in the 3D town: ${g.config.xp.discover} XP</li><li>First verified visit to a business: ${g.config.xp.businessVisit} XP</li><li>First verified visit to a landmark: ${g.config.xp.landmarkVisit} XP</li><li>Missions, trails, quizzes and community challenges: the XP shown on each mission</li><li>Each reward can only be earned once (repeat-visit challenges count different days)</li></ul>
      <p>The other players on this board are fictional demo players. In the real game, scores would be calculated on the server with anti-cheat checks, and public profiles would show only a display name, avatar, rank and points.</p></details>`;
}
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');

// ---------------- profile ----------------
export function profile(app) {
  const g = app.game, p = g.p.player, st = g.stats(), r = g.rank();
  const unlocked = new Set(g.cosmeticsUnlocked().map((c) => c.id)), eq = g.p.equipped;
  const biz = g.locations().filter((l) => l.kind === 'business');
  const firstVisit = (id) => g.myCheckins().find((c) => c.target === id);
  const visits = g.myCheckins().slice().reverse();
  const title = g.p.seasons.filter((s) => s.title).map((s) => s.season);
  return `<header class="profile-head">${avatar(p.name, p.colour, 76, 'big')}<div><h1>${esc(p.name)}</h1><button class="btn small" data-act="appearance-open">${icon('star')}Change appearance</button><p class="rank-name">${esc(r.name)}${title.includes(g.p.seasonId) ? ' · Mayor of Felixstowe (game title)' : ''}</p></div></header>
    <section class="stats3"><div><b>${st.xp.toLocaleString('en-GB')}</b><span>Lifetime XP</span></div><div><b>${g.seasonPoints().toLocaleString('en-GB')}</b><span>Season points</span></div><div><b>${st.visits}</b><span>Verified visits</span></div></section>
    ${repCard(app)}
    ${influenceCard(app)}
    <form id="rename" class="inline-form"><label for="rename-input">Display name</label><input id="rename-input" value="${esc(p.name)}" maxlength="20"><button class="btn small" type="submit">Save</button></form>
    <section class="card"><h3 class="sec">Wardrobe <span class="muted">– worn by your avatar in the 3D town</span></h3>
      <div class="wardrobe">${COSMETICS.map((c) => { const on = c.type === 'coat' ? eq.coat === c.id : c.type === 'hat' ? eq.hat === c.id : !!eq.chain; const ok = unlocked.has(c.id); return `<button class="ward ${on ? 'on' : ''}" ${ok ? `data-act="equip" data-id="${c.id}"` : 'disabled'}><span class="swatch" style="--c:#${(c.colour ?? 0xe0b23a).toString(16).padStart(6, '0')}"></span><b>${esc(c.name)}</b><small>${ok ? (on ? 'Wearing' : 'Tap to wear') : 'Unlocks at ' + esc(g.config.ranks.find((k) => k.id === c.rank).name)}</small></button>`; }).join('')}</div></section>
    ${garage(app)}
    <section class="card"><h3 class="sec">Stamp book <span class="muted">${st.stamps}/${biz.length}</span></h3><div class="stamps">${biz.map((l) => { const v = firstVisit(l.id); return stamp(l, !!v, v ? fmtDate(v.ts) : ''); }).join('')}</div></section>
    <section class="card"><h3 class="sec">Badges</h3><div class="badges">${ACHIEVEMENTS.map((a) => badge(a, g.p.achievements[a.id])).join('')}</div></section>
    <section class="card"><h3 class="sec">Visit history <span class="muted">– private to you</span></h3>${visits.length ? `<ul class="history">${visits.map((c) => `<li><b>${esc(c.type === 'event' ? EVENTS.find((e) => e.id === c.target)?.name : g.loc(c.target)?.name)}</b><span>${fmtDT(c.ts)} · ${c.simulated ? 'simulated (demo)' : { camera: 'QR scan', photo: 'QR photo', typed: 'typed code' }[c.method] || c.method}</span></li>`).join('')}</ul>` : '<p class="muted">No check-ins yet.</p>'}</section>
    <section class="card"><h3 class="sec">Missions completed</h3>${Object.keys(g.p.completed).length ? `<ul class="history">${Object.entries(g.p.completed).map(([id, c]) => `<li><b>${esc(g.mission(id)?.title || id)}</b><span>${fmtDate(c.ts)}</span></li>`).join('')}</ul>` : '<p class="muted">None yet.</p>'}</section>
    <section class="card"><h3 class="sec">Career history</h3><ol class="career">${g.p.career.map((c) => `<li><b>${esc(g.config.ranks.find((k) => k.id === c.rank)?.name)}</b><time>${fmtDate(c.ts)}</time></li>`).join('')}</ol>
      ${g.p.seasons.length ? `<h4>Seasons</h4><ul class="history">${g.p.seasons.map((s) => `<li><b>${esc(s.title || s.rank)}</b><span>${esc(s.season)}${s.points != null ? ' · ' + s.points + ' pts' : ''}</span></li>`).join('')}</ul>` : ''}</section>
    <section class="card"><h3 class="sec">3D town</h3><div class="seg"><button class="${app.three?.settings.shadows === 'off' ? 'on' : ''}" data-act="quality" data-val="low">Battery saver</button><button class="${app.three && app.three.settings.shadows !== 'off' ? 'on' : ''}" data-act="quality" data-val="high">High quality</button></div>
      <p class="fine">Map data © OpenStreetMap contributors (ODbL). Contains Environment Agency data. Buildings: Overture Maps Foundation.</p></section>
    <section class="card"><h3 class="sec">Privacy and your data</h3>
      <p>This demo stores your name, colour, progress and check-in records in this browser only. It doesn’t use your location, an account or an email address, and nothing is sent to a server. Other players never see your visit history.</p>
      <p>Play safely: stop before you look at your phone, never check in from a road, and only visit places when they’re open. You never need to buy anything to progress.</p>
      ${guidelines()}
      <p><button class="btn" data-act="report-open">${icon('admin')}Report a problem</button></p>
      <div class="danger-zone"><button class="btn danger" data-act="delete-ask">Delete my progress</button>
        <div class="confirm"><p>This deletes your player, stamps and history from this device. It can’t be undone.</p><button class="btn danger" data-act="delete-confirm">Yes, delete everything</button><button class="btn" data-act="delete-cancel">Keep my progress</button></div></div></section>
    <section class="card admin-entry"><h3 class="sec">For businesses and organisers</h3><p>Manage demo businesses, missions, QR codes, ranks, seasons and reports.</p><button class="btn" data-act="admin">${icon('admin')}Open the admin panel (demo)</button></section>`;
}
