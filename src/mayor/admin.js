// Demo admin panel. It edits this browser's demo data only and has no real security: anyone with
// the device can open it. Production needs server-side accounts with an administrator role, and
// every change below becomes an authenticated API call (see docs/mayor/PRODUCTION.md).

import { escapeHtml as esc, icon } from './art.js';
import { EVENTS } from './engine.js';
import { STORIES } from './reputation.js';

const SECTIONS = [['overview', 'Reports'], ['safety', 'Safety'], ['businesses', 'Businesses'], ['missions', 'Missions'], ['checkins', 'Visits'], ['ranks', 'XP & ranks'], ['sponsorship', 'Sponsorship'], ['season', 'Season'], ['demo', 'Demo tools']];

export class Admin {
  constructor(app) { this.app = app; this.section = 'overview'; this.editing = null; }
  get g() { return this.app.game; }
  open(section = this.section) {
    this.section = section;
    this.app.openSheet(`<div class="admin"><div class="banner demo">${icon('admin')}<span><b>Demo admin.</b> No login protects this panel and changes stay in this browser. A real pilot needs server-side admin accounts.</span></div>
      <h2>Admin</h2><nav class="admin-nav">${SECTIONS.map(([id, t]) => `<button class="chip ${id === this.section ? 'on' : ''}" data-act="admin" data-section="${id}">${t}</button>`).join('')}</nav>
      <div class="admin-body">${this[this.section]()}</div></div>`, 'admin-sheet');
    if (this.section === 'qr') this.drawQRs();
  }

  // ---------- reports ----------
  overview() {
    const a = this.g.analytics();
    const tile = (n, l, note = '') => `<div class="tile"><b>${n}</b><span>${l}</span>${note ? `<small>${note}</small>` : ''}</div>`;
    return `<p class="fine">All figures come from activity in this browser and are test data. A check-in means a QR code was scanned; it is never counted as a purchase or a sale.</p>
      <div class="tiles">${tile(a.players, 'Registered players')}${tile(a.activePlayers, 'Active in last 7 days')}${tile(a.missionStarts, 'Mission starts')}${tile(a.missionCompletions, 'Mission completions')}${tile(a.checkins, 'Check-ins', `${a.simulatedCheckins} simulated`)}${tile(a.rejected, 'Rejected scans')}${tile(a.offerRedemptions, 'Offer redemptions', 'Needs business confirmation')}</div>
      <h3>Check-ins by location</h3>${a.byLocation.length ? `<div class="tbl"><table><thead><tr><th>Location</th><th>Check-ins</th><th>Simulated</th><th>Unique players</th><th>Repeat</th></tr></thead><tbody>${a.byLocation.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.checkins}</td><td>${r.simulated}</td><td>${r.unique}</td><td>${r.repeat}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No check-ins yet.</p>'}
      <h3>Sponsored missions</h3><div class="tbl"><table><thead><tr><th>Mission</th><th>Starts</th><th>Completions</th></tr></thead><tbody>${a.sponsored.map((r) => `<tr><td>${esc(r.title)}</td><td>${r.starts}</td><td>${r.completions}</td></tr>`).join('')}</tbody></table></div>
      <h3>Trail completion</h3><div class="tbl"><table><thead><tr><th>Trail</th><th>Starts</th><th>Completions</th><th>Rate</th></tr></thead><tbody>${a.trails.map((r) => `<tr><td>${esc(r.title)}</td><td>${r.starts}</td><td>${r.completions}</td><td>${r.starts ? Math.round((100 * r.completions) / r.starts) + '%' : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- safety: reports, suspending stories, reputation appeals ----------
  safety() {
    const srv = this.g.store.server, reps = (srv.reports || []).slice().reverse();
    const off = (id) => srv.content?.stories?.[id]?.active === false;
    const lv = this.g.p.player ? this.g.repLevel() : null;
    return `<p class="fine">Reports from players, venues and residents arrive here. In a pilot, safety reports are acknowledged within 2 hours and anything involving immediate danger goes to 999 first. Suspending a story or mission takes effect for every player at once and costs players nothing.</p>
      <h3>Reports <span class="muted">${reps.length}</span></h3>${reps.length ? `<div class="tbl"><table><thead><tr><th>When</th><th>Type</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>${reps.map((r) => `<tr><td>${new Date(r.ts).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</td><td>${esc(r.category)}</td><td>${esc(r.text)}</td><td>${esc(r.status)}</td><td>${r.status === 'new' ? `<button class="btn small" data-act="adm-report-done" data-id="${r.id}">Mark handled</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No reports.</p>'}
      <h3>Town stories</h3><div class="tbl"><table><thead><tr><th>Story</th><th>Kind</th><th>Status</th><th></th></tr></thead><tbody>${STORIES.map((x) => `<tr><td>${esc(x.title)}</td><td>${x.kind}</td><td>${off(x.id) ? 'Suspended' : 'Live'}</td><td><button class="btn small" data-act="adm-story" data-id="${x.id}">${off(x.id) ? 'Reinstate' : 'Suspend'}</button></td></tr>`).join('')}</tbody></table></div>
      ${lv ? `<h3>This player's reputation</h3><p>${esc(lv.name)} (overall ${lv.overall}) · Trust ${this.g.rep().trust} · Business ${this.g.rep().business} · Community ${this.g.rep().community} · Marks: ${this.g.activeMarks().map((m) => esc(m.name)).join(', ') || 'none'}</p>
      <p class="fine">Appeals: a second reviewer can reverse a confirmed cheating penalty. Story choices are the player's own and aren't appealable, but redemption is always available.</p>` : ''}`;
  }

  // ---------- businesses ----------
  businesses() {
    const list = this.g.locations({ all: true }).filter((l) => l.kind === 'business');
    const e = this.editing && this.editing.type === 'loc' ? this.g.loc(this.editing.id) || { id: '', kind: 'business', name: '', category: '', street: '', area: 'Town centre', blurb: '', lat: 51.9625, lon: 1.3514 } : null;
    const tiers = this.g.config.sponsorshipTiers;
    return `${e ? `<form id="adm-loc" class="adm-form"><h3>${e.id ? 'Edit business' : 'Add a business'}</h3>
        <input type="hidden" name="id" value="${esc(e.id)}">
        <label>Name<input name="name" required value="${esc(e.name)}"></label><label>Category<input name="category" value="${esc(e.category)}"></label>
        <label>Street<input name="street" value="${esc(e.street || '')}"></label><label>Area<input name="area" value="${esc(e.area || '')}"></label>
        <label>Description<textarea name="blurb" rows="3">${esc(e.blurb || '')}</textarea></label><label>Website<input name="website" value="${esc(e.website || '')}" placeholder="https://"></label>
        <div class="two"><label>Latitude<input name="lat" inputmode="decimal" value="${e.lat}"></label><label>Longitude<input name="lon" inputmode="decimal" value="${e.lon}"></label></div>
        <label>Optional offer<input name="offer" value="${esc(e.offer || '')}"></label>
        <label>Sponsorship tier<select name="tier"><option value="">None</option>${tiers.map((t) => `<option value="${t.id}" ${e.tier === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="sponsored" ${e.sponsored ? 'checked' : ''}> Show as sponsored</label>
        <label class="check"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> Active in the game</label>
        <label class="check"><input type="checkbox" name="demo" ${e.demo !== false ? 'checked' : ''}> Fictional demo business</label>
        <div class="actions"><button class="btn primary" type="submit">Save business</button><button class="btn" type="button" data-act="adm-cancel">Cancel</button></div></form>` : `<button class="btn primary" data-act="adm-new-loc">Add a business</button>`}
      <ul class="adm-list">${list.map((l) => `<li><span><b>${esc(l.name)}</b><small>${esc(l.category)} · ${esc(l.street || l.area)}${l.tier ? ' · ' + esc(tiers.find((t) => t.id === l.tier)?.name || l.tier) : ''}${l.active === false ? ' · inactive' : ''}</small></span><button class="btn small" data-act="adm-edit-loc" data-id="${l.id}">Edit</button></li>`).join('')}</ul>`;
  }

  // ---------- missions ----------
  missions() {
    const list = this.g.missions({ all: true });
    const e = this.editing && this.editing.type === 'mission' ? this.g.mission(this.editing.id) || { id: '', title: '', description: '', xp: 50, difficulty: 'Easy', category: 'business' } : null;
    const biz = this.g.locations().filter((l) => l.kind === 'business');
    return `${e ? `<form id="adm-mission" class="adm-form"><h3>${e.id ? 'Edit mission' : 'New visit mission'}</h3><input type="hidden" name="id" value="${esc(e.id)}">
        <label>Title<input name="title" required value="${esc(e.title)}"></label><label>Description<textarea name="description" rows="3">${esc(e.description)}</textarea></label>
        <div class="two"><label>XP reward<input name="xp" type="number" min="0" max="2000" value="${e.xp}"></label><label>Difficulty<select name="difficulty">${['Easy', 'Medium', 'Hard', 'Final'].map((d) => `<option ${e.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
        ${e.id ? '' : `<label>Business to visit<select name="loc">${biz.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>`}
        <label class="check"><input type="checkbox" name="sponsored" ${e.sponsored ? 'checked' : ''}> Sponsored</label><label class="check"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> Active</label>
        <div class="actions"><button class="btn primary" type="submit">Save mission</button><button class="btn" type="button" data-act="adm-cancel">Cancel</button></div></form>` : `<button class="btn primary" data-act="adm-new-mission">New visit mission</button>`}
      <ul class="adm-list">${list.map((m) => `<li><span><b>${esc(m.title)}</b><small>${esc(m.category)}${m.type ? ' · ' + m.type : ''} · ${m.xp} XP${m.sponsored ? ' · sponsored' : ''}${m.active === false ? ' · inactive' : ''}</small></span><button class="btn small" data-act="adm-edit-mission" data-id="${m.id}">Edit</button></li>`).join('')}</ul>`;
  }

  // ---------- QR codes ----------
  qr() {
    const s = this.g.service; const rows = [...this.g.locations({ all: true }).map((l) => ['location', l.id, l.name]), ...EVENTS.map((e) => ['event', e.id, e.name])];
    return `<p class="fine">Each location has one active code. Issuing a new code revokes the old one, so old posters stop working. Codes are signed with a demo key that lives in the app, so they are not secure; production signs and checks codes on the server.</p>
      <div class="qr-grid">${rows.map(([type, id, name]) => { const c = s.activeCode(type, id); const revoked = Object.values(s.s.codes).filter((x) => x.type === type && x.target === id && x.revokedAt).length; return `<div class="qr-card"><canvas class="qr" data-payload="${c ? esc(s.payload(c)) : ''}" width="132" height="132"></canvas><div><b>${esc(name)}</b><code>${c ? esc(c.code) : 'No active code'}</code><small>${revoked} revoked</small>
        <div class="actions"><button class="btn small" data-act="adm-issue" data-type="${type}" data-id="${id}">Issue new code</button>${c ? `<button class="btn small danger" data-act="adm-revoke" data-code="${c.code}">Revoke</button>` : ''}</div></div></div>`; }).join('')}</div>`;
  }
  drawQRs() {
    for (const cv of document.querySelectorAll('canvas.qr')) {
      const data = cv.dataset.payload, g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      if (!data || typeof window.qrcode !== 'function') { g.fillStyle = '#10233f'; g.font = '12px system-ui'; g.fillText(data ? 'QR library missing' : 'No code', 10, 66); continue; }
      const q = window.qrcode(0, 'M'); q.addData(data); q.make(); const n = q.getModuleCount(), m = 2, s = Math.floor(cv.width / (n + 2 * m)), off = Math.floor((cv.width - s * n) / 2);
      g.fillStyle = '#10233f'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * s, off + r * s, s, s);
    }
  }

  // ---------- check-ins ----------
  checkins() {
    const list = this.g.store.server.checkins.slice().reverse().slice(0, 200);
    const name = (c) => (c.type === 'event' ? this.g.eventName(c.target) : this.g.loc(c.target)?.name || c.target);
    return `<p class="fine">Players appear as pseudonymous IDs. Repeat-visit rules: businesses one check-in per day, landmarks and events once.</p>${list.length ? `<div class="tbl"><table><thead><tr><th>When</th><th>Where</th><th>Method</th><th>Player</th></tr></thead><tbody>${list.map((c) => `<tr><td>${new Date(c.ts).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</td><td>${esc(name(c))}</td><td>${c.simulated ? '<span class="tag demo">simulated</span>' : esc(c.method)}</td><td><code>${esc(String(c.playerId).slice(-6))}</code></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No check-ins yet.</p>'}`;
  }

  // ---------- XP & ranks ----------
  ranks() {
    const c = this.g.config;
    return `<form id="adm-ranks" class="adm-form"><h3>XP values</h3><div class="two">${Object.entries(c.xp).map(([k, v]) => `<label>${esc({ discover: 'Finding a place', businessVisit: 'First business visit', landmarkVisit: 'First landmark visit', eventCheckin: 'Event check-in', stopQuestion: 'Trail stop answer' }[k] || k)}<input name="xp.${k}" type="number" min="0" max="2000" value="${v}"></label>`).join('')}</div>
      <h3>Rank thresholds</h3><div class="tbl"><table><thead><tr><th>Rank</th><th>XP</th><th>Visits</th><th>Trails</th><th>Community</th><th>Quiz</th></tr></thead><tbody>${c.ranks.map((r, i) => r.final ? `<tr><td>${esc(r.name)}</td><td colspan="5">Win the Mayoral Challenge</td></tr>` : `<tr><td>${esc(r.name)}</td>${['xp', 'visits', 'trails', 'community'].map((k) => `<td><input name="r.${i}.${k}" type="number" min="0" value="${r[k]}" ${i === 0 ? 'disabled' : ''}></td>`).join('')}<td><input type="checkbox" name="r.${i}.quiz" ${r.quiz ? 'checked' : ''} ${i === 0 ? 'disabled' : ''}></td></tr>`).join('')}</tbody></table></div>
      <label>Discovery radius in the 3D town (m)<input name="discoverRadius" type="number" min="10" max="200" value="${c.discoverRadius}"></label>
      <div class="actions"><button class="btn primary" type="submit">Save values</button></div></form>`;
  }

  // ---------- sponsorship ----------
  sponsorship() {
    const tiers = this.g.config.sponsorshipTiers, biz = this.g.locations({ all: true }).filter((l) => l.kind === 'business');
    return `<p class="fine">Illustrative test prices, not market rates. No payments are taken in this demo, and taking part never guarantees customers or sales.</p>
      <form id="adm-tiers" class="adm-form">${tiers.map((t, i) => `<fieldset><legend>${esc(t.name)}</legend><label>Name<input name="t.${i}.name" value="${esc(t.name)}"></label><label>Test price<input name="t.${i}.price" value="${esc(t.price)}"></label><p class="small">${t.perks.map(esc).join(' · ')}</p><p class="small">Businesses: ${biz.filter((b) => b.tier === t.id).map((b) => esc(b.name)).join(', ') || 'none'}</p></fieldset>`).join('')}
      <div class="actions"><button class="btn primary" type="submit">Save tiers</button></div></form><p class="fine">Assign a tier when you edit a business. Sponsored content is always labelled in the game.</p>`;
  }

  // ---------- season ----------
  season() {
    const s = this.g.config.season;
    return `<p>Current season: <b>${esc(s.name)}</b> (${esc(s.start)} to ${esc(s.end)}).</p>
      <form id="adm-season" class="adm-form"><h3>Start a new season</h3><p class="fine">Season points reset and the Mayor title is archived. Lifetime XP, stamps and badges are kept.</p>
        <label>Season name<input name="name" required value="Season 2 · Winter 2027"></label><div class="two"><label>Start<input name="start" type="date" value="2027-01-01"></label><label>End<input name="end" type="date" value="2027-03-31"></label></div>
        <div class="actions"><button class="btn danger" type="submit">End this season and start the new one</button></div></form>`;
  }

  // ---------- demo tools ----------
  demo() {
    const off = this.g.store.server.clockOffsetDays || 0;
    return `<p>Game clock: ${off ? `<b>${off} day${off > 1 ? 's' : ''} ahead</b> of real time` : 'real time'}. Moving the clock lets you test repeat-visit challenges.</p>
      <div class="actions"><button class="btn" data-act="adm-clock" data-d="1">Move clock forward one day</button><button class="btn" data-act="adm-clock" data-d="0">Back to real time</button></div>
      <h3>Reset</h3><p class="fine">Deletes the player, codes, check-ins, admin changes and reports from this browser.</p><button class="btn danger" data-act="adm-reset">Reset the whole demo</button>`;
  }

  // ---------- events ----------
  onClick(a, b) {
    const s = this.g.service;
    if (a === 'adm-new-loc') { this.editing = { type: 'loc', id: null }; this.open('businesses'); }
    else if (a === 'adm-edit-loc') { this.editing = { type: 'loc', id: b.dataset.id }; this.open('businesses'); }
    else if (a === 'adm-new-mission') { this.editing = { type: 'mission', id: null }; this.open('missions'); }
    else if (a === 'adm-edit-mission') { this.editing = { type: 'mission', id: b.dataset.id }; this.open('missions'); }
    else if (a === 'adm-cancel') { this.editing = null; this.open(); }
    else if (a === 'adm-issue') { s.issue(b.dataset.type, b.dataset.id); this.g.save(); this.app.toast('New code issued. The previous code no longer works.'); this.open('qr'); }
    else if (a === 'adm-revoke') { s.revoke(b.dataset.code); this.g.save(); this.app.toast('Code revoked.'); this.open('qr'); }
    else if (a === 'adm-clock') { const d = Number(b.dataset.d); this.g.store.server.clockOffsetDays = d ? (this.g.store.server.clockOffsetDays || 0) + d : 0; this.g.save(); this.open('demo'); this.app.toast('Game clock updated.'); }
    else if (a === 'adm-story') { const srv = this.g.store.server; srv.content.stories ||= {}; const cur = srv.content.stories[b.dataset.id]?.active !== false; srv.content.stories[b.dataset.id] = { active: !cur }; this.g.save(); this.app.toast(cur ? 'Story suspended for all players.' : 'Story reinstated.'); this.open('safety'); }
    else if (a === 'adm-report-done') { const r = (this.g.store.server.reports || []).find((x) => x.id === b.dataset.id); if (r) r.status = 'handled'; this.g.save(); this.open('safety'); }
    else if (a === 'adm-reset') { this.g.store.resetAll(); location.reload(); }
  }
  onSubmit(f) {
    const fd = new FormData(f), g = this.g, srv = g.store.server;
    if (f.id === 'adm-loc') {
      const id = fd.get('id') || 'biz_' + String(fd.get('name')).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) + '_' + Date.now().toString(36).slice(-3);
      const lat = parseFloat(fd.get('lat')), lon = parseFloat(fd.get('lon'));
      if (!(lat > 51.9 && lat < 52.02 && lon > 1.25 && lon < 1.43)) { this.app.toast('The position must be inside the Felixstowe game area.', 'bad'); return; }
      srv.content.locations[id] = { ...(srv.content.locations[id] || {}), kind: 'business', name: String(fd.get('name')).trim(), category: String(fd.get('category')).trim(), street: String(fd.get('street')).trim(), area: String(fd.get('area')).trim(), blurb: String(fd.get('blurb')).trim(), website: String(fd.get('website')).trim(), lat, lon, offer: String(fd.get('offer')).trim() || null, tier: fd.get('tier') || null, sponsored: fd.get('sponsored') === 'on', active: fd.get('active') === 'on', demo: fd.get('demo') === 'on' };
      if (!g.mission('visit_' + id) && !srv.content.missions['visit_' + id]) srv.content.missions['visit_' + id] = { category: 'business', title: `Visit ${srv.content.locations[id].name}`, description: `Find ${srv.content.locations[id].name} in the 3D town, then visit in person and scan its QR code.`, xp: 50, difficulty: 'Easy', locationId: id, steps: [`discover:${id}`, `visit:${id}`], physical: true, demo: true };
      this.editing = null; g.reloadConfig(); g.save(); this.app.layer?.build(); this.app.toast('Business saved.'); this.open('businesses');
    } else if (f.id === 'adm-mission') {
      const id = fd.get('id'); const base = { title: String(fd.get('title')).trim(), description: String(fd.get('description')).trim(), xp: Math.max(0, Math.min(2000, Number(fd.get('xp')) || 0)), difficulty: fd.get('difficulty'), sponsored: fd.get('sponsored') === 'on', active: fd.get('active') === 'on' };
      if (id) srv.content.missions[id] = { ...(srv.content.missions[id] || {}), ...base };
      else { const loc = fd.get('loc'); srv.content.missions['m_' + Date.now().toString(36)] = { ...base, category: 'business', steps: [`discover:${loc}`, `visit:${loc}`], physical: true, demo: true, locationId: loc }; }
      this.editing = null; g.save(); this.app.toast('Mission saved.'); this.open('missions');
    } else if (f.id === 'adm-ranks') {
      const cfg = structuredClone(g.config); for (const k of Object.keys(cfg.xp)) cfg.xp[k] = Math.max(0, Number(fd.get('xp.' + k)) || 0);
      cfg.ranks.forEach((r, i) => { if (i === 0 || r.final) return; for (const k of ['xp', 'visits', 'trails', 'community']) r[k] = Math.max(0, Number(fd.get(`r.${i}.${k}`)) || 0); r.quiz = fd.get(`r.${i}.quiz`) === 'on'; });
      const fin = cfg.ranks.find((r) => r.final), cand = cfg.ranks[cfg.ranks.length - 2]; Object.assign(fin, { xp: cand.xp, visits: cand.visits, trails: cand.trails, community: cand.community, quiz: cand.quiz });
      g.store.config = { ...(g.store.config || {}), xp: cfg.xp, ranks: cfg.ranks, discoverRadius: Math.max(10, Math.min(200, Number(fd.get('discoverRadius')) || 40)) };
      g.reloadConfig(); g.save(); this.app.toast('Values saved.'); this.open('ranks');
    } else if (f.id === 'adm-tiers') {
      const tiers = structuredClone(g.config.sponsorshipTiers); tiers.forEach((t, i) => { t.name = String(fd.get(`t.${i}.name`)).trim() || t.name; t.price = String(fd.get(`t.${i}.price`)).trim() || t.price; });
      g.store.config = { ...(g.store.config || {}), sponsorshipTiers: tiers }; g.reloadConfig(); g.save(); this.app.toast('Tiers saved.'); this.open('sponsorship');
    } else if (f.id === 'adm-season') {
      const name = String(fd.get('name')).trim(), start = fd.get('start'), end = fd.get('end');
      g.startNewSeason({ id: 's-' + start, name, start, end }); this.app.toast('New season started.'); this.open('season');
    }
  }
}
