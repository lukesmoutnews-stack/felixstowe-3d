// Check-in screens: scan with the camera, read a photo of the QR code, type the code, or (demo only)
// simulate the scan. Every route ends in the same validator, so a simulated scan can never skip a rule.

import { deltaChips } from './rep-screens.js';
import { escapeHtml as esc, icon } from './art.js';
import { STATUS_LABEL } from './engine.js';

export class CheckinFlow {
  constructor(app) { this.app = app; this.ctx = null; this.stream = null; }

  open({ locationId = null, eventId = null } = {}) {
    const g = this.app.game; this.ctx = { locationId, eventId };
    const camOk = !!navigator.mediaDevices?.getUserMedia;
    this.app.openSheet(`<p class="eyebrow">QR check-in</p><h2>${locationId ? `Check in at ${esc(g.loc(locationId).name)}` : eventId ? `Check in: ${esc(g.eventName(eventId))}` : 'Check in'}</h2>
      <p>Find the Race to Be Mayor poster at the location and scan its code. Each check-in is checked by the game before any reward is given.</p>
      <div class="scan-options">
        <button class="scan-opt" data-act="checkin-camera" ${camOk ? '' : 'disabled'}>${icon('camera')}<b>Scan with camera</b><small>${camOk ? 'Uses your camera only while this screen is open' : 'No camera access on this device or in this viewer'}</small></button>
        <button class="scan-opt" data-act="checkin-photo">${icon('upload')}<b>Use a photo of the code</b><small>Take or choose a picture of the QR poster</small></button>
      </div>
      <input id="qr-file" type="file" accept="image/*" capture="environment" hidden>
      <div id="cam-box" class="cam-box" hidden><video id="cam" playsinline muted></video><span class="frame"></span><button class="btn small" data-act="cam-stop">Stop camera</button></div>
      <form id="code-form" class="code-form"><label for="code-input">Or type the code printed under the QR</label><div class="row"><input id="code-input" placeholder="FX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn primary" type="submit">Check in</button></div></form>
      <div id="checkin-msg" role="alert"></div>
      ${locationId || eventId ? `<div class="demo-box"><p><b>Testing without travelling?</b> Use the simulated scan. It is labelled as simulated everywhere and is not proof of a real visit.</p><button class="btn demo" data-act="simulate" data-type="${locationId ? 'location' : 'event'}" data-id="${locationId || eventId}">Simulated check-in (demo)</button></div>` : ''}`, 'checkin');
    document.getElementById('qr-file').addEventListener('change', (e) => this.fromPhoto(e.target.files?.[0]));
    document.querySelector('[data-act="cam-stop"]')?.addEventListener('click', (e) => { e.stopPropagation(); this.stopCamera(); });
  }

  // ---------- inputs ----------
  simulate(type, id) {
    const payload = this.app.game.simulatedPayload(type, id);
    if (!payload) { this.showError('This location has no active QR code. An administrator needs to issue one.'); return; }
    this.finish(this.app.game.checkIn(payload, 'simulated'));
  }
  submitTyped(v) { if (!v.trim()) { this.showError('Type the code shown under the QR, for example FX-KITT-7Q2M.'); return; } this.finish(this.app.game.checkIn(v, 'typed')); }
  async fromPhoto(file) {
    if (!file) return;
    const msg = document.getElementById('checkin-msg'); if (msg) msg.innerHTML = '<p class="muted">Reading the code…</p>';
    try {
      const bmp = await createImageBitmap(file); const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
      const data = await decode(c, g);
      if (!data) { this.showError('No QR code found in that photo. Try again closer, in good light, with the whole code in the picture.'); return; }
      this.finish(this.app.game.checkIn(data, 'photo'));
    } catch (e) { this.showError('That picture couldn’t be read. Try another photo or type the code.'); }
  }
  async startCamera() {
    const box = document.getElementById('cam-box'), video = document.getElementById('cam');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = this.stream; await video.play(); box.hidden = false;
      const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
      const loop = async () => {
        if (!this.stream) return;
        if (video.videoWidth) { c.width = video.videoWidth; c.height = video.videoHeight; g.drawImage(video, 0, 0); const data = await decode(c, g); if (data) { this.stopCamera(); this.finish(this.app.game.checkIn(data, 'camera')); return; } }
        setTimeout(loop, 250);
      };
      loop();
    } catch (e) { this.stopCamera(); this.showError('The camera isn’t available here. Use a photo of the code or type it instead.'); }
  }
  stopCamera() { if (this.stream) { for (const t of this.stream.getTracks()) t.stop(); this.stream = null; } const b = document.getElementById('cam-box'); if (b) b.hidden = true; }
  showError(text) { const m = document.getElementById('checkin-msg'); if (m) m.innerHTML = `<p class="error">${esc(text)}</p>`; else this.app.toast(esc(text), 'bad'); }

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
        <div class="stamp-slam ${c.simulated ? 'sim' : ''}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" stroke-width="2"/><path d="M38 62 L54 78 L84 44" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <p class="eyebrow">${c.simulated ? 'Simulated check-in – demo only' : 'Check-in accepted'}</p>
        <h2>${isLoc ? esc(l.name) : 'Event check-in'}</h2>
        ${isLoc ? `<ol class="transition"><li>Visit required</li><li class="on">Visited</li>${status === 'completed' ? '<li class="on">Mission completed</li>' : ''}</ol><p class="status-now">Status now: <b>${esc(STATUS_LABEL[status])}</b></p>` : ''}
        <ul class="reward-list">${rewardLines}${missionLines}${badges}${!rewardLines && !missionLines ? `<li>${icon('check')}<span>${r.first ? 'Visit recorded' : 'Repeat visit recorded (counts towards repeat-visit challenges)'}</span><span class="xp">+0</span></li>` : ''}</ul>
        <p class="total">Total this check-in: <b>+${r.xpGained} XP</b></p>
        ${r.repApplied && (r.repApplied.trust || r.repApplied.business || r.repApplied.community) ? `<p class="total">Reputation: ${deltaChips(r.repApplied)}</p>` : ''}
        ${r.rankUp ? `<p class="rankup">${icon('star')}Promoted to <b>${esc(r.rankUp.name)}</b></p>` : ''}
        ${l?.kind === 'business' && r.first ? '<p class="fine">Stamp added to your stamp book.</p>' : ''}
        <p class="fine">${c.simulated ? 'This was a simulated scan for testing. It is stored as simulated and is not proof of a real visit.' : 'Validated by the demo service on this device. A production game validates every scan on its server.'} A check-in records that a code was scanned, never a purchase.</p>
        <div class="actions"><button class="btn primary" data-act="close-sheet">Carry on exploring</button><button class="btn" data-act="tab" data-tab="profile">See my stamps</button></div></div>`;
    if (app.tab !== 'explore') app.render(); // refresh the screen underneath, then show the result on top
    app.openSheet(html, 'result');
  }
}

async function decode(canvas, g) {
  if ('BarcodeDetector' in window) {
    try { const d = new window.BarcodeDetector({ formats: ['qr_code'] }); const r = await d.detect(canvas); if (r[0]?.rawValue) return r[0].rawValue; } catch { /* fall back to jsQR */ }
  }
  if (typeof window.jsQR === 'function') { const img = g.getImageData(0, 0, canvas.width, canvas.height); const r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' }); if (r?.data) return r.data; }
  return null;
}
