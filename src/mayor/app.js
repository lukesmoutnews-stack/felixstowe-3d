// Race to Be Mayor – application shell: boots the game, the 3D town and the screens.

import { Game, STATUS_LABEL } from './engine.js';
import { createStore } from './store.js';
import { escapeHtml as esc, icon } from './art.js';
import * as S from './screens.js';
import * as RS from './rep-screens.js';
import * as NS from './news-screens.js';
import * as CS from './character.js';
import * as TS from './talk-screens.js';
import { CheckinFlow } from './checkin-ui.js';
import { Admin } from './admin.js';

const TABS = ['home', 'explore', 'missions', 'news', 'leaderboard', 'profile'];

class MayorApp {
  constructor() {
    this.store = createStore();
    this.game = new Game(this.store);
    this.tab = 'home'; this.layer = null; this.three = null; this.threeProgress = 0;
    this.exploreView = 'map'; this.filters = { q: '', kind: 'all', status: 'all' };
    this.missionTab = 'active'; this.checkin = new CheckinFlow(this); this.admin = new Admin(this);
    this.root = document.getElementById('app');
    window.__mayor = this; // used by the end-to-end test
  }

  async boot() {
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('submit', (e) => this.onSubmit(e));
    this.root.addEventListener('input', (e) => { if (e.target.dataset.actInput === 'height') { CS.applyOpt(this.csState(), 'height', e.target.value); this.refreshPreview(); } if (e.target.id === 'explore-search') { this.filters.q = e.target.value; this.renderExploreList(); } });
    this.registerSW();
    setInterval(() => this.pollNews(), 700);
    this.render();
    this.start3D();
  }

  // ---------- 3D town ----------
  async start3D() {
    const self = this;
    let dataDir = 'fx/';
    try { const r = await fetch('fx/manifest.json', { method: 'GET' }); if (!r.ok) dataDir = 'data/'; } catch { dataDir = 'data/'; }
    window.F3D_DEMO = { ...(window.F3D_DEMO || {}), data: dataDir, quality: 'low' };
    window.F3D_HOOKS = {
      quietEnter: true,
      onReady(app) {
        self.three = app; app.enter(); app.suspended = self.tab !== 'explore';
        import('./world-layer.js').then(({ WorldLayer }) => { self.layer = new WorldLayer(app, self.game, self); self.renderExploreChrome(); });
      },
      onUpdate(app, dt) { self.layer?.update(dt); },
      get ownCar() { return self.game.p.garage?.car || 'hatchback'; },
      get ownColour() { return self.game.p.garage?.colour; },
      onTalk(person) { self.startTalk(person.def.id, person); },
      onVehicleTaken(v) { const r = self.game.vehicleTaken(v.s.name); self.toast(`You drove off in a ${esc(v.s.name.replace(/ \(.*\)/, '').toLowerCase())} that isn’t yours. In the game only. ${r?.found?.length ? 'Someone saw!' : 'A whisper has started…'}`, 'bad'); self.afterAction({ found: r?.found || [] }, true); },
      onVehicleImpact(v, sp, other) { if (v === self.three?.car && self.three.driving && other && sp > 8) { const a = self.game.recklessDriving(); if (a) self.toast('Reckless driving: residents in the game are not impressed. Community −2.', 'bad'); } },
    };
    const tick = setInterval(() => {
      const bar = document.querySelector('#load3d .bar'); const n = document.querySelector('#loading .progress .bar');
      if (n) { this.threeProgress = parseFloat(n.style.width) || 0; if (bar) bar.style.width = this.threeProgress + '%'; }
      if (this.layer) { clearInterval(tick); const l = document.getElementById('load3d'); if (l) l.hidden = true; }
    }, 300);
    try { await import('../main.js'); } catch (e) { console.error(e); this.toast('The 3D town could not start on this device. Use the list view to explore.', 'bad'); }
  }
  onExplore() { return this.tab === 'explore' && !this.sheetOpen; }

  // ---------- rendering ----------
  render() {
    const p = this.game.p;
    document.body.dataset.tab = this.tab;
    if (!p.player) { this.renderSelect(); return; }
    if (this.three) this.three.suspended = this.tab !== 'explore';
    if (this.three) this.three.input.enabled = this.tab === 'explore' && !this.sheetOpen;
    const screen = { home: S.home, explore: S.explore, missions: S.missions, leaderboard: S.leaderboard, profile: S.profile, news: NS.newsPage }[this.tab](this);
    this.root.innerHTML = `${this.store.persistent ? '' : '<div class="banner warn">This browser is blocking storage, so progress lasts only until you close the page.</div>'}
      <main class="screen screen-${this.tab}" id="screen">${screen}</main>
      <nav class="tabbar" aria-label="Main">${TABS.map((t) => `<button class="tab ${t === this.tab ? 'on' : ''}" data-act="tab" data-tab="${t}" aria-current="${t === this.tab ? 'page' : 'false'}">${icon(t)}<span>${{ home: 'Home', explore: 'Explore', missions: 'Missions', leaderboard: 'Ranks', profile: 'Profile', news: 'News' }[t]}</span>${t === 'news' && this.game.news().some((a) => !a.read) ? '<i class="dot-new"></i>' : ''}</button>`).join('')}</nav>
      <div id="sheet-host"></div><div id="toasts" aria-live="polite"></div>`;
    if (this.tab === 'explore') this.renderExploreChrome();
  }
  // ---------- character selection / appearance ----------
  csState() { return (this.cs ||= { preset: 'male', look: structuredClone(CS.PRESETS.male.look), pronouns: 'he', name: '', ctx: 'onboard' }); }
  renderSelect() {
    const st = this.csState(); st.ctx = 'onboard';
    this.root.innerHTML = CS.selectScreen(st);
    this.preview?.dispose(); this.preview = new CS.Preview(document.getElementById('cs-canvas'), 'single'); // just the player's character
    this.refreshPreview();
  }
  refreshPreview() {
    const st = this.cs; if (!this.preview || !st) return;
    if (st.ctx === 'sheet') { this.preview.setLooks([CS.stageLook(st.look, this.game.rankIndex())]); return; }
    this.preview.setLooks([st.look], 0); // one character: the chosen starting look with your edits
  }
  refreshEditor() {
    const st = this.cs, ed = document.querySelector('.cs-edit'); if (!ed) return; const open = ed.open;
    ed.outerHTML = CS.editor(st.look, st, open);
    document.querySelectorAll('.cs-pick').forEach((b) => { const on = b.dataset.id === st.preset; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  }
  finishSelect(name) {
    const st = this.csState(), colour = '#' + ({ teal: 0x0e7c7b, coral: 0xef6a56, gold: 0xf2b632, navy: 0x24395c, purple: 0x7a5c99, green: 0x2e8a57 }[st.look.campaign] || 0x0e7c7b).toString(16).padStart(6, '0');
    this.game.createPlayer(name, colour); const p = this.game.p; p.look = structuredClone(st.look); p.identity = st.preset; p.pronouns = st.pronouns; this.game.save();
    this.preview?.dispose(); this.preview = null; this.layer?.applyOutfit(); this.layer?.refresh(); this.render();
  }
  renderExploreChrome() { if (this.tab !== 'explore') return; const l = document.getElementById('load3d'); if (l) l.hidden = !!this.layer; this.layer?.refresh(); this.layer?.updateGuide(); }
  renderExploreList() { const el = document.getElementById('explore-list'); if (el) el.innerHTML = S.exploreList(this); }
  go(tab) { if (!TABS.includes(tab)) return; this.tab = tab; this.closeSheet(true); this.render(); window.scrollTo(0, 0); }

  // ---------- sheets ----------
  openSheet(html, cls = '') {
    this.sheetOpen = true; if (this.three) this.three.input.enabled = false;
    const host = document.getElementById('sheet-host') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'sheet-host' }));
    host.innerHTML = `<div class="scrim" data-act="close-sheet"></div><section class="sheet ${cls}" role="dialog" aria-modal="true"><button class="sheet-x" data-act="close-sheet" aria-label="Close">${icon('close')}</button><div class="sheet-body">${html}</div></section>`;
    host.querySelector('.sheet-body').scrollTop = 0;
  }
  closeSheet(silent = false) {
    this.sheetOpen = false; this.sheetLoc = null; this.sheetMission = null;
    if (this.talkCtx) { if (this.talkCtx.npc) { this.talkCtx.npc.talking = false; this.talkCtx.npc.model.setExpression('neutral'); } this.talkCtx = null; this.layer?.applyOutfit(); }
    if (this.cs?.ctx === 'sheet' && this.preview) { this.preview.dispose(); this.preview = null; this.cs.ctx = 'done'; }
    const host = document.getElementById('sheet-host'); if (host) host.innerHTML = '';
    if (this.three) this.three.input.enabled = this.tab === 'explore';
    if (!silent) this.layer?.updateGuide();
  }
  openLocation(id) { this.sheetLoc = id; this.openSheet(S.locationSheet(this, id), 'loc'); }
  openMission(id) { this.sheetMission = id; this.openSheet(S.missionSheet(this, id), 'mission'); }
  refreshSheet() { if (this.sheetLoc) this.openLocation(this.sheetLoc); else if (this.sheetMission) this.openMission(this.sheetMission); }

  /** Breaking-news pop-ups for articles the game just published. */
  pollNews() {
    const fresh = this.game.takeNews(); if (!fresh.length) return;
    const big = fresh.find((a) => a.breaking || a.special);
    if (big) {
      document.querySelector('.fn-breaking')?.remove();
      const el = document.createElement('div'); el.innerHTML = NS.breakingBanner(big); const b = el.firstElementChild; this.root.append(b);
      setTimeout(() => b.classList.add('out'), 7000); setTimeout(() => b.remove(), 7600);
    }
    for (const a of fresh) if (a !== big) this.toast(`${NS.gull(16)} <b>Felixstowe News:</b> ${esc(a.headline)}`, 'news');
    const tab = document.querySelector('.tab[data-tab=news]'); if (tab && !tab.querySelector('.dot-new')) tab.insertAdjacentHTML('beforeend', '<i class="dot-new"></i>');
  }

  // ---------- conversations ----------
  startTalk(id, npc) {
    const t = this.game.talk(id); if (!t) return;
    if (npc) { npc.talking = true; npc.model.setExpression(t.mood || 'neutral'); }
    this.talkCtx = { id, npc, history: [], t };
    this.openSheet(TS.talkSheet(this, t, []), 'talk');
  }
  answerTalk(id, node, i) {
    const ctx = this.talkCtx; if (!ctx) return; const g = this.game, r = g.answer(id, node, i), res = g.resident(id);
    const c = res.nodes[node]?.choices[i];
    if (c) ctx.history.push({ me: true, text: c.label });
    if (r.reply) ctx.history.push({ text: r.reply, extra: TS.infChips(r.applied) + (r.promise ? `<small class="promise">${icon('star')}Promise: ${esc(r.promise.text)}</small>` : '') + (r.discovered ? `<small class="promise">${icon('pin')}Marked on your map: ${esc(r.discovered)}</small>` : '') + (r.accepted ? `<small class="promise">${icon('check')}Mission accepted: ${esc(r.accepted)}</small>` : '') });
    if (ctx.npc) ctx.npc.model.setExpression(r.mood || 'neutral');
    const pos = Object.values(r.applied || {}).reduce((s, v) => s + v, 0); this.three?.player.model.setExpression(pos > 0 ? 'happy' : pos < 0 ? 'embarrassed' : 'neutral');
    if (r.next && res.nodes[r.next]) { const n = res.nodes[r.next]; const st = g.person(id); ctx.t = { ...ctx.t, nodeId: r.next, say: n.say, mood: n.mood, greet: null, newsLine: null, choices: n.choices.map((x, k) => ({ ...x, k, i: k })).filter((x) => !x.need || (x.need.flags || []).every((f) => st.flags.includes(f))) }; ctx.history.push(...[]); this.openSheet(TS.talkSheet(this, ctx.t, ctx.history), 'talk'); }
    else { this.openSheet(`<div class="talk"><h2>${esc(res.name)}</h2><div class="bubbles">${ctx.history.map((h) => `<p class="bubble ${h.me ? 'me' : 'them'}">${esc(h.text)}${h.extra || ''}</p>`).join('')}</div><div class="actions"><button class="btn primary" data-act="close-sheet">Goodbye</button></div></div>`, 'talk'); }
    this.afterAction(r);
  }

  // ---------- feedback ----------
  toast(text, kind = '') {
    const host = document.getElementById('toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toasts' }));
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = text; host.append(t);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
  }
  onDiscovered(loc, r) {
    this.toast(`${icon('star')} <b>Discovered:</b> ${esc(loc.name)} <span class="xp">+${r.xpGained} XP</span>`, 'good');
    if (r.rankUp) this.toast(`Promoted to <b>${esc(r.rankUp.name)}</b>!`, 'gold');
    if (this.tab === 'explore' && !this.sheetOpen) this.renderExploreList();
  }
  afterAction(r, quiet = false) {
    if (!quiet) for (const f of r.found || []) this.toast(`Felixstowe News: “${esc(f.title)}” comes out! ${RS.deltaChips(f.applied)}`, 'bad');
    for (const a of r.achievements || []) this.toast(`${icon('star')} Badge earned: <b>${esc(a.title)}</b>`, 'gold');
    if (r.rankUp) this.toast(`Promoted to <b>${esc(r.rankUp.name)}</b>!`, 'gold');
    this.layer?.applyOutfit();
    this.layer?.refresh();
  }

  // ---------- events ----------
  onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'onboard') {
      const name = f.querySelector('#ob-name').value.trim();
      if (name.length < 2) { f.querySelector('.err').textContent = 'Choose a name with at least two characters.'; return; }
      this.finishSelect(name); this.toast('Welcome to the race. Explore the town to find your first location.', 'good');
    } else if (f.id === 'code-form') this.checkin.submitTyped(f.querySelector('#code-input').value);
    else if (f.id === 'report-form') { const t = f.querySelector('#rp-text').value.trim(); if (t.length < 5) { this.toast('Add a few words so we can help.', 'bad'); return; } this.game.report(f.querySelector('#rp-cat').value, t); this.closeSheet(); this.toast('Thanks. Your report has been logged.', 'good'); }
    else if (f.id === 'rename') { const v = f.querySelector('#rename-input').value.trim(); if (v.length >= 2) { this.game.p.player.name = v.slice(0, 20); this.game.save(); this.render(); this.toast('Name updated.'); } }
    else this.admin.onSubmit(f);
  }
  onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    const g = this.game;
    switch (a) {
      case 'tab': this.go(b.dataset.tab); break;
      case 'demo-profile': this.finishSelect('Demo Resident'); break;
      case 'cs-pick': { const st = this.csState(); st.preset = id; st.look = structuredClone(CS.PRESETS[id].look); st.pronouns = CS.PRESETS[id].pronouns; this.refreshPreview(); this.preview?.select(0); this.refreshEditor(); break; }
      case 'cs-opt': { const st = this.csState(); CS.applyOpt(st, b.dataset.key, b.dataset.val); this.refreshPreview(); this.refreshEditor(); break; }
      case 'cs-face': this.preview?.models[0]?.setExpression(id); break;
      case 'appearance-open': { const p = g.p; this.cs = { preset: p.identity || 'other', look: structuredClone({ ...CS.PRESETS.male.look, ...(p.look || {}) }), pronouns: p.pronouns || 'they', ctx: 'sheet' }; this.openSheet(CS.appearanceSheet(this.cs), 'appearance'); this.preview?.dispose(); this.preview = new CS.Preview(document.getElementById('cs-canvas'), 'single'); this.refreshPreview(); break; }
      case 'appearance-save': { const p = g.p; p.look = structuredClone(this.cs.look); p.pronouns = this.cs.pronouns; g.save(); this.preview?.dispose(); this.preview = null; this.closeSheet(); this.layer?.applyOutfit(); this.render(); this.toast('Look saved. Your progress is unchanged.', 'good'); break; }
      case 'close-sheet': this.closeSheet(); if (this.tab !== 'explore') this.render(); break;
      case 'open-loc': this.openLocation(id); break;
      case 'open-mission': this.openMission(id); break;
      case 'continue': this.continueCampaign(); break;
      case 'accept': {
        const r = g.accept(id); if (!r.ok) { this.afterAction({ found: r.found }); this.toast(esc(r.message), 'bad'); this.refreshSheet(); break; }
        this.toast(`Mission accepted: <b>${esc(g.mission(id).title)}</b>`, 'good'); this.afterAction(r); this.refreshSheet(); if (!this.sheetOpen) this.render(); break;
      }
      case 'guide': this.closeSheet(true); this.layer?.setTarget(id); this.go('explore'); this.layer?.setTarget(id); break;
      case 'travel': this.closeSheet(true); this.go('explore'); this.toast('Travelling to the area…'); this.whenLayer(() => this.layer.travelNear(id)); break;
      case 'checkin': this.checkin.open({ locationId: b.dataset.loc || null, eventId: b.dataset.event || null }); break;
      case 'simulate': this.checkin.simulate(b.dataset.type, id); break;
      case 'checkin-photo': document.getElementById('qr-file')?.click(); break;
      case 'checkin-camera': this.checkin.startCamera(); break;
      case 'quiz': S.startQuiz(this, id); break;
      case 'quiz-answer': S.quizAnswer(this, Number(b.dataset.i)); break;
      case 'quiz-next': S.quizNext(this); break;
      case 'stop-answer': { const r = g.answerStop(id, Number(b.dataset.i)); this.toast(r.correct ? `Correct! <span class="xp">+${r.xpGained} XP</span>` : 'Not quite. Read the facts on this page and try again.', r.correct ? 'good' : 'bad'); this.afterAction(r); this.refreshSheet(); break; }
      case 'view-toggle': { const m = this.layer?.toggleView(); b.innerHTML = icon(m === 'overview' ? 'street' : 'overview') + `<span>${m === 'overview' ? 'Street' : 'Overview'}</span>`; break; }
      case 'explore-view': this.exploreView = b.dataset.view; this.render(); break;
      case 'filter': this.filters[b.dataset.key] = b.dataset.val; this.render(); break;
      case 'mtab': this.missionTab = b.dataset.val; this.render(); break;
      case 'equip': { const c = g.cosmeticsUnlocked().find((x) => x.id === id); if (!c) break; const eq = g.p.equipped; if (c.type === 'coat') eq.coat = id; else if (c.type === 'hat') eq.hat = eq.hat === id ? null : id; else eq.chain = !eq.chain; g.save(); this.layer?.applyOutfit(); this.render(); this.toast(`Wearing: ${esc(c.name)}`); break; }
      case 'delete-ask': b.closest('.danger-zone').classList.add('confirming'); break;
      case 'delete-cancel': b.closest('.danger-zone').classList.remove('confirming'); break;
      case 'delete-confirm': { // remove this player's progress and check-ins from this device, keep anonymous counts
        const oldId = g.p.player?.id;
        this.store.server.analytics = this.store.server.analytics.map((ev) => (ev.player === oldId ? { ...ev, player: 'deleted' } : ev));
        this.store.resetPlayer(); this.toast('Your progress has been deleted from this device.'); setTimeout(() => location.reload(), 600); break;
      }
      case 'admin': this.admin.open(b.dataset.section || 'overview'); break;
      case 'quality': this.setQuality(b.dataset.val); break;
      case 'camsens': if (this.three) { this.three.settings.cameraSensitivity = +b.dataset.val; this.three.applySettings(); this.render(); } break;
      case 'world-act': this.three?.interact(); this.layer?.updateAction(true); break;
      case 'garage-bring': { const r = this.layer?.bringVehicle(id, b.dataset.colour ? Number(b.dataset.colour) : null); this.toast(r ? `Your ${esc(r)} is parked nearby. Open Explore to drive it.` : 'Open Explore first so the 3D town is loaded.', r ? 'good' : 'bad'); break; }
      case 'talk-answer': this.answerTalk(id, b.dataset.node, Number(b.dataset.i)); break;
      case 'open-news': this.openSheet(NS.articleSheet(this, id), 'news'); document.querySelector('.fn-breaking')?.remove(); break;
      case 'open-story': this.openSheet(RS.storySheet(this, id), 'story'); break;
      case 'choose': {
        const r = g.choose(id, b.dataset.choice); if (!r.ok) { this.toast(esc(r.message), 'bad'); break; }
        this.openSheet(RS.storyResult(this, r), 'story'); this.afterAction(r, true); break;
      }
      case 'confess': { const r = g.confess(id); if (!r.ok) { this.toast(esc(r.message), 'bad'); break; } this.toast(`You owned up to “${esc(r.rumour.title)}”. ${RS.deltaChips(r.applied)}`, 'good'); this.render(); break; }
      case 'report-open': this.openSheet(RS.reportSheet(), 'report'); break;
      case 'abandon': { const r = g.abandon(id); if (r.ok) { this.toast('Mission paused. You can pick it up again any time.'); this.closeSheet(); this.render(); } break; }
      default: this.admin.onClick(a, b, e);
    }
  }
  whenLayer(fn) { if (this.layer) fn(); else { const t = setInterval(() => { if (this.layer) { clearInterval(t); fn(); } }, 400); } }
  continueCampaign() {
    const n = S.nextAction(this);
    if (n.type === 'location') { this.go('explore'); this.whenLayer(() => this.layer.setTarget(n.id)); this.toast(esc(n.text)); }
    else if (n.type === 'mission') { this.openMission(n.id); }
    else this.go('explore');
  }
  setQuality(v) {
    const a = this.three; if (!a) return;
    Object.assign(a.settings, v === 'high' ? { shadows: 'medium', viewDistance: 1600, pixelRatio: Math.min(2, devicePixelRatio || 1) } : { shadows: 'off', viewDistance: 900, pixelRatio: 1 });
    a.renderer.setPixelRatio(a.settings.pixelRatio); a.applySettings(); this.toast(`3D quality: ${v}`); this.render();
  }
  registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('mayor-sw.js').catch(() => { /* not available here (e.g. inside an embedded viewer) */ });
  }
}

export const STATUS = STATUS_LABEL;
const app = new MayorApp(); app.boot();
