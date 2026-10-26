// Visit screens. Everything happens in the 3D town: walk up to a place and tap Visit to collect its stamp.

import { deltaChips } from './rep-screens.js';
import { escapeHtml as esc, icon } from './art.js';
import { STATUS_LABEL } from './engine.js';
import { inClosedArea } from './closed-areas.js';

export class CheckinFlow {
  constructor(app) { this.app = app; this.ctx = null; }

  /** Visiting is all in the 3D town: be near the place (or pick up the event) and tap Visit. No scanning, no real-world trip. */
  open({ locationId = null, eventId = null } = {}) {
    const app = this.app, g = app.game; this.ctx = { locationId, eventId };
    if (eventId) { this.visit('event', eventId); return; }
    const l = g.loc(locationId); if (!l) return;
    const d = app.layer?.distanceTo(locationId), reach = (g.config.discoverRadius || 40) + 10;
    if (d == null || d <= reach || inClosedArea(l)) { this.visit('location', locationId); return; }
    app.openSheet(`<p class="eyebrow">Visit in the 3D town</p><h2>Walk over to ${esc(l.name)}</h2>
      <p>You are about ${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km'} away in the 3D town. Walk up to it, then tap <b>Visit</b> to collect your stamp.</p>
      <div class="actions"><button class="btn primary" data-act="guide" data-id="${locationId}">${icon('guide')}Guide me there</button><button class="btn" data-act="travel" data-id="${locationId}">Travel to the area</button></div>`, 'checkin');
  }
  visit(type, id) {
    const payload = this.app.game.simulatedPayload(type, id);
    if (!payload) { this.app.toast('This place can’t be visited yet.', 'bad'); return; }
    this.finish(this.app.game.checkIn(payload, 'simulated'));
  }
  simulate(type, id) { this.visit(type, id); }
  submitTyped() {}
  stopCamera() {}
  showError(text) { this.app.toast(esc(text), 'bad'); }

  // ---------- result ----------
  finish(r) {
    const app = this.app, g = app.game;
    if (!r.ok) { this.showError(r.message); app.toast(esc(r.message), 'bad'); return; }
    this.stopCamera();
    const c = r.checkin, isLoc = c.type === 'location', l = isLoc ? g.loc(c.target) : null;
    const status = isLoc ? g.locationStatus(c.target) : null;
    app.afterAction(r);
    const missionLines = r.completed.map((m) => `<li class="done">${icon('check')}<span>Mission completed: <b>${esc(m.title)}</b></span><span class="xp">+${m.xp}</span></li>`).join('');
    const rewardLines = r.rewards.filter((x) => !x.key.startsWith('mission:') && !x.achievement).map((x) => `<li>${icon('star')}<span>${esc(x.label)}</span><span class="xp">+${x.xp}</span></li>`).join('');
    const badges = (r.achievements || []).map((a) => `<li class="badge-line">${icon('star')}<span>Badge: <b>${esc(a.title)}</b></span></li>`).join('');
    const html = `<div class="success">
        <div class="stamp-slam ${''}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" stroke-width="2"/><path d="M38 62 L54 78 L84 44" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <p class="eyebrow">Stamp collected</p>
        <h2>${isLoc ? esc(l.name) : 'Event check-in'}</h2>
        ${isLoc ? `<ol class="transition"><li>Discovered</li><li class="on">Visited</li>${status === 'completed' ? '<li class="on">Mission completed</li>' : ''}</ol><p class="status-now">Status now: <b>${esc(STATUS_LABEL[status])}</b></p>` : ''}
        <ul class="reward-list">${rewardLines}${missionLines}${badges}${!rewardLines && !missionLines ? `<li>${icon('check')}<span>${r.first ? 'Visit recorded' : 'Repeat visit recorded (counts towards repeat-visit challenges)'}</span><span class="xp">+0</span></li>` : ''}</ul>
        <p class="total">Total for this visit: <b>+${r.xpGained} XP</b></p>
        ${r.repApplied && (r.repApplied.trust || r.repApplied.business || r.repApplied.community) ? `<p class="total">Reputation: ${deltaChips(r.repApplied)}</p>` : ''}
        ${r.rankUp ? `<p class="rankup">${icon('star')}Promoted to <b>${esc(r.rankUp.name)}</b></p>` : ''}
        ${l?.kind === 'business' && r.first ? '<p class="fine">Stamp added to your stamp book.</p>' : ''}
        
        <div class="actions"><button class="btn primary" data-act="close-sheet">Carry on exploring</button><button class="btn" data-act="tab" data-tab="profile">See my stamps</button></div></div>`;
    if (app.tab !== 'explore') app.render(); // refresh the screen underneath, then show the result on top
    app.openSheet(html, 'result');
  }
}

