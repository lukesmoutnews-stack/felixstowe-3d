// The 3D town as the game's Explore map: location pins, tap-to-open, discovery by walking close,
// an on-screen joystick, pinch zoom, a street/overview camera toggle and a "guide me" arrow.

import * as THREE from 'three';
import { BRAND } from './news.js';
import { DEFAULT_LOOK, stageLook } from '../play/people/humanoid.js';
import { RESIDENTS } from './residents.js';
import { GULL } from './news-screens.js';

// In-world Felixstowe News screens (fictional game headlines), placed on pavements near busy spots.
const NEWS_SPOTS = ['triangle', 'town_hall', 'pier', 'station'];

const STATUS_COLOUR = { undiscovered: '#7d8a96', discovered: '#0e7c7b', accepted: '#4b6cb7', visit_required: '#ef6a56', visited: '#d9a22b', completed: '#2e8a57' };

export class WorldLayer {
  constructor(app, game, ui) {
    this.app = app; this.game = game; this.ui = ui;
    this.group = new THREE.Group(); this.group.name = 'mayor-markers'; app.scene.add(this.group);
    this.pins = new Map(); this.texCache = new Map(); this.timer = 0; this.target = null;
    this.ray = new THREE.Raycaster(); this.ray.camera = app.camera;
    this.build(); this.bindInput(); this.applyOutfit(); this.buildNewsBoards(); this.addResidents();
  }

  // ---------- pins ----------
  pinTexture(loc, status) {
    const key = `${loc.kind}:${status}:${!!loc.sponsored}`; if (this.texCache.has(key)) return this.texCache.get(key);
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
    const col = STATUS_COLOUR[status];
    g.shadowColor = 'rgba(16,35,63,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.fillStyle = col; g.beginPath(); g.arc(64, 60, 48, Math.PI, 0); g.quadraticCurveTo(112, 104, 64, 150); g.quadraticCurveTo(16, 104, 16, 60); g.fill();
    g.shadowColor = 'transparent'; g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(64, 60, 34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    if (status === 'undiscovered') { g.font = '800 52px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 63); }
    else if (status === 'completed') { g.beginPath(); g.moveTo(46, 61); g.lineTo(58, 74); g.lineTo(82, 46); g.stroke(); }
    else if (loc.kind === 'business') { g.beginPath(); g.moveTo(42, 50); g.lineTo(86, 50); g.lineTo(80, 38); g.lineTo(48, 38); g.closePath(); g.fill(); g.strokeRect(46, 50, 36, 28); g.fillRect(58, 62, 12, 16); }
    else { g.beginPath(); g.moveTo(52, 82); g.lineTo(52, 36); g.stroke(); g.beginPath(); g.moveTo(52, 38); g.lineTo(82, 44); g.lineTo(52, 58); g.closePath(); g.fill(); }
    if (loc.sponsored && status !== 'undiscovered') { g.fillStyle = '#f2b632'; g.beginPath(); g.arc(100, 22, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#10233f'; g.font = '800 20px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('S', 100, 23); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this.texCache.set(key, t); return t;
  }
  labelTexture(text) {
    const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = '700 30px system-ui, sans-serif';
    const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 52; g.font = '700 30px system-ui, sans-serif';
    g.fillStyle = 'rgba(16,35,63,.88)'; g.beginPath(); g.roundRect(0, 0, w, 52, 26); g.fill(); g.fillStyle = '#fffaf0'; g.textBaseline = 'middle'; g.fillText(text, 18, 27);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { t, aspect: w / 52 };
  }
  build() {
    for (const p of this.pins.values()) { this.group.remove(p.sprite, p.label); }
    this.pins.clear();
    for (const loc of this.game.locations()) {
      const w = this.app.frame.toWorld(loc.lat, loc.lon);
      const mat = new THREE.SpriteMaterial({ map: this.pinTexture(loc, 'undiscovered'), depthTest: false, transparent: true, sizeAttenuation: false });
      const sprite = new THREE.Sprite(mat); sprite.center.set(0.5, 0); sprite.renderOrder = 1000; sprite.userData.locId = loc.id;
      const lab = this.labelTexture(loc.name); const lm = new THREE.SpriteMaterial({ map: lab.t, depthTest: false, transparent: true, sizeAttenuation: false });
      const label = new THREE.Sprite(lm); label.center.set(0.5, 1.15); label.renderOrder = 1001; label.visible = false; label.userData.aspect = lab.aspect;
      this.group.add(sprite, label);
      this.pins.set(loc.id, { loc, x: w.x, z: w.z, sprite, label, status: null, yBase: null });
    }
    this.refresh();
  }
  // ---------- residents: named characters near their usual spots, with name tags ----------
  addResidents() {
    this.tags = new Map();
    for (const r of RESIDENTS) {
      const loc = this.game.loc(r.at); if (!loc || !this.app.crowd) continue;
      const w = this.app.frame.toWorld(loc.lat, loc.lon), off = (r.id.charCodeAt(0) % 5) * 1.7;
      const p = this.app.crowd.addNamed({ id: r.id, name: r.name, look: r.look, roam: r.rival ? 5 : 9 }, w.x + 5 + off, w.z + 4 - off);
      const lab = this.labelTexture(r.name); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab.t, depthTest: true, transparent: true, sizeAttenuation: false }));
      sp.center.set(0.5, 0); sp.userData.aspect = lab.aspect; sp.renderOrder = 999; this.group.add(sp); this.tags.set(r.id, { sp, p });
    }
  }
  updateTags() {
    if (!this.tags) return; const cam = this.app.camera.position, k = Math.min(54, Math.max(38, innerHeight * 0.06)) / innerHeight * 0.5;
    for (const { sp, p } of this.tags.values()) { const d = Math.hypot(p.pos.x - cam.x, p.pos.z - cam.z); sp.visible = p.mesh.visible && d < 45; if (!sp.visible) continue; sp.position.set(p.pos.x, p.pos.y + 2.05 * (p.model.look.height || 1), p.pos.z); sp.scale.set(k * sp.userData.aspect, k, 1); }
  }

  // ---------- Felixstowe News screens ----------
  newsTexture() {
    const a = this.game.latestHeadline();
    const c = this.newsCanvas ||= Object.assign(document.createElement('canvas'), { width: 512, height: 640 }); const g = c.getContext('2d');
    g.fillStyle = BRAND.yellow; g.fillRect(0, 0, 512, 640);
    g.fillStyle = BRAND.ink; g.save(); g.translate(206, 34); g.scale(4, 4); g.fill(new Path2D(GULL)); g.restore();
    g.textAlign = 'center'; g.font = '900 62px Anton, Impact, "Arial Narrow", sans-serif'; g.fillText('FELIXSTOWE', 256, 182); g.fillText('NEWS', 256, 246);
    g.fillRect(24, 272, 464, 6); g.font = '800 22px system-ui, sans-serif'; g.fillText(a ? (a.breaking ? 'BREAKING · GAME EDITION' : 'GAME EDITION') : 'GAME EDITION', 256, 314);
    g.font = '900 40px Anton, Impact, "Arial Narrow", sans-serif'; g.textAlign = 'left';
    const words = (a ? a.headline : 'What you do makes the headlines.').toUpperCase().split(' '); let line = '', y = 372;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 456 && line) { g.fillText(line, 28, y); y += 48; line = w; if (y > 560) break; } else line = t; }
    if (y <= 560) g.fillText(line, 28, y);
    g.font = '700 19px system-ui, sans-serif'; g.fillText('Fictional game story · ' + BRAND.display, 28, 616);
    if (!this.newsTex) { this.newsTex = new THREE.CanvasTexture(c); this.newsTex.colorSpace = THREE.SRGBColorSpace; } else this.newsTex.needsUpdate = true;
    return this.newsTex;
  }
  /** A pavement spot for a news board near a location, at least 7 m from where players arrive (the start
   *  point and the travel spot for that location both come from findStandingSpot, which a board used to share). */
  boardSpot(w) {
    const a = this.app, base = a.findStandingSpot(w.x + 6, w.z + 6); if (!base) return null;
    const avoid = [a.player.pos, a.findStandingSpot(w.x, w.z), a.car?.pos].filter(Boolean);
    const yaw = base.yaw ?? 0, fx = -Math.sin(yaw), fz = -Math.cos(yaw); // along the road
    const ok = [];
    for (const d of [0, 9, -9, 14, -14, 20, -20]) {
      const x = base.x + fx * d, z = base.z + fz * d;
      if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < 7)) continue;
      if (d && (!a.world.isWalkable(x, z) || a.collision.insideBuilding(x, z) || a.collision.resolve(x, z, 0.7, 0, 1.7).hit)) continue;
      ok.push({ x, z, yaw });
    }
    // prefer a spot that is not in front of the player's starting view, so the first steps don't walk into it
    const p = a.player.pos, py = a.spawnYaw ?? a.rig.yaw, ahead = (c) => (c.x - p.x) * -Math.sin(py) + (c.z - p.z) * -Math.cos(py) > 0 && Math.hypot(c.x - p.x, c.z - p.z) < 40;
    return ok.find((c) => !ahead(c)) || ok[0] || null;
  }
  buildNewsBoards() {
    this.newsBoards = []; const tex = this.newsTexture(); this.newsShown = this.game.latestHeadline()?.id || null;
    const screen = new THREE.MeshBasicMaterial({ map: tex }), frame = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.5, metalness: 0.4 });
    for (const id of NEWS_SPOTS) {
      const loc = this.game.loc(id); if (!loc) continue; const w = this.app.frame.toWorld(loc.lat, loc.lon);
      const spot = this.boardSpot(w); if (!spot) continue;
      const g = new THREE.Group(); const y = this.app.world.surfaceAt(spot.x, spot.z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.3, 0.22), frame); body.position.y = 1.35; g.add(body);
      for (const side of [1, -1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.375), screen); s.position.set(0, 1.55, side * 0.115); if (side < 0) s.rotation.y = Math.PI; g.add(s); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.5), frame); base.position.y = 0.1; g.add(base);
      g.position.set(spot.x, y, spot.z); g.rotation.y = (spot.yaw ?? 0) + Math.PI / 2; g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.news = true; } });
      this.app.scene.add(g); this.newsBoards.push(g);
      this.app.collision && this.app.world.circleGrid.insert?.(spot.x - 0.7, spot.z - 0.7, spot.x + 0.7, spot.z + 0.7, { x: spot.x, z: spot.z, r: 0.65 });
    }
  }
  refresh() {
    const latest = this.game.latestHeadline()?.id || null; if (this.newsBoards && latest !== this.newsShown) { this.newsShown = latest; this.newsTexture(); }
    for (const p of this.pins.values()) {
      const st = this.game.locationStatus(p.loc.id);
      if (st !== p.status) { p.sprite.material.map = this.pinTexture(p.loc, st); p.sprite.material.needsUpdate = true; p.status = st; }
      p.label.visible = false;
    }
  }

  // ---------- per frame ----------
  /** The contextual action button (get in / get out / talk) for touch screens. */
  updateAction(force = false) {
    const btn = document.getElementById('act-btn'); if (!btn) return;
    this._actT = (this._actT || 0) + 1; if (!force && this._actT % 8) return;
    const a = this.app; let label = null;
    if (a.driving && a.car) label = `Get out (${Math.round(Math.abs(a.car.speed) * 2.237)} mph)`;
    else { const it = a.nearbyInteractable?.(); if (it?.type === 'car') label = `${it.v.owner === 'parked' ? 'Take' : 'Get in'}: ${it.v.s.name.replace(/ \(.*\)/, '')}`; else if (it?.type === 'npc') label = `Talk to ${it.npc.name}`; }
    btn.hidden = !label; if (label && btn.textContent !== label) btn.textContent = label;
    btn.classList.toggle('warn', !!label && /^Take/.test(label));
  }
  /** Garage: park one of your unlocked vehicles beside you. */
  bringVehicle(type, colour) {
    const f = this.app.fleet; if (!f) return null;
    for (const v of f.vehicles.filter((v) => v.owner === 'yours')) if (v !== this.app.car || !this.app.driving) f.remove(v);
    const p = this.app.player.pos; const v = f.parkNear(p.x, p.z, type, { owner: 'yours', colour: colour ?? undefined, along: 4 });
    this.game.p.garage = { car: type, colour }; this.game.save();
    return v ? v.s.name.replace(/ \(.*\)/, '').toLowerCase() : null;
  }
  update(dt) {
    this.updateAction(); this.updateTags();
    const cam = this.app.camera, pp = this.app.player.pos, over = this.app.rig.mode === 'overview';
    const H = innerHeight, pinPx = Math.min(54, Math.max(38, H * 0.06)), k = pinPx / H;
    for (const p of this.pins.values()) {
      if (p.yBase == null || this.timer === 0) { const g = this.app.world.ground(p.x, p.z); p.yBase = g; }
      const d = Math.hypot(p.x - cam.position.x, p.z - cam.position.z);
      const lift = over ? 6 : 3.2 + Math.min(14, d * 0.02);
      p.sprite.position.set(p.x, p.yBase + lift, p.z);
      const s = (p.status === 'visit_required' ? 1 + 0.08 * Math.sin(performance.now() / 220) : 1) * k * 1.25;
      p.sprite.scale.set(s * 0.8, s, 1);
      p.sprite.visible = d < (over ? 4000 : 2500);
      const near = Math.hypot(p.x - pp.x, p.z - pp.z) < 140 || this.target === p.loc.id;
      p.label.visible = near && p.status !== 'undiscovered' && p.sprite.visible;
      if (p.label.visible) { p.label.position.copy(p.sprite.position); const ls = k * 0.55; p.label.scale.set(ls * p.label.userData.aspect, ls, 1); }
    }
    this.timer += dt;
    if (this.timer > 0.3) { this.timer = 0.0001; this.checkProximity(); this.updateGuide(); }
  }
  checkProximity() {
    const pp = this.app.player.pos, R = this.game.config.discoverRadius;
    for (const p of this.pins.values()) {
      if (this.game.isDiscovered(p.loc.id)) continue;
      if (Math.hypot(p.x - pp.x, p.z - pp.z) <= R) { const r = this.game.discover(p.loc.id); if (r) { this.ui.onDiscovered(p.loc, r); this.refresh(); } }
    }
  }
  distanceTo(id) { const p = this.pins.get(id); if (!p) return null; const pp = this.app.player.pos; return Math.hypot(p.x - pp.x, p.z - pp.z); }

  // ---------- guide arrow ----------
  setTarget(id) { this.target = id; this.updateGuide(); }
  updateGuide() {
    const el = document.getElementById('guide'); if (!el) return;
    const p = this.target && this.pins.get(this.target);
    if (!p || !this.ui.onExplore()) { el.hidden = true; return; }
    const pp = this.app.player.pos, dx = p.x - pp.x, dz = p.z - pp.z, d = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, -dz), camYaw = -this.app.rig.yaw; // yaw 0 looks north (-z)
    const rel = bearing - camYaw;
    el.hidden = false;
    el.querySelector('.g-arrow').style.transform = `rotate(${rel}rad)`;
    el.querySelector('.g-name').textContent = p.status === 'undiscovered' ? 'Something to discover' : p.loc.name;
    el.querySelector('.g-dist').textContent = d < 1000 ? `${Math.round(d / 5) * 5} m` : `${(d / 1000).toFixed(1)} km`;
  }

  // ---------- camera helpers ----------
  toggleView() { const r = this.app.rig; if (r.mode === 'overview') { r.mode = 'third'; r.pitch = -0.3; } else { r.mode = 'overview'; r.pitch = -1.15; r.overDist = 320; } r.transition = 1; return r.mode; }
  async travelNear(id, metres = 110) {
    const p = this.pins.get(id); if (!p) return;
    const pp = this.app.player.pos; let dx = pp.x - p.x, dz = pp.z - p.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    await this.app.travelTo(p.x + dx * metres, p.z + dz * metres);
    this.app.rig.yaw = Math.atan2(-(p.x - this.app.player.pos.x), -(p.z - this.app.player.pos.z)); this.app.rig.initialised = false;
    this.setTarget(id);
  }
  /** Your avatar: your chosen look, dressed for your stage of the race, with your equipped cosmetics and a mood that follows your reputation. */
  applyOutfit() {
    const g = this.game, eq = g.p.equipped || {}, C = (id) => g.cosmeticsUnlocked().find((c) => c.id === id);
    const look = stageLook({ ...DEFAULT_LOOK, ...(g.p.look || {}) }, g.rankIndex());
    const coat = eq.coat && eq.coat !== 'coat_navy' ? C(eq.coat) : null, hat = C(eq.hat);
    if (coat) look.outerColour = coat.colour;
    if (hat?.hat === 'bucket') look.hat = 'bucket';
    if (eq.chain && C('chain')) look.chain = true;
    const pl = this.app.player; pl.setLook(look);
    if (hat && hat.hat !== 'bucket') pl.setOutfit({ hat: hat.hat, hatColor: hat.colour, chain: look.chain });
    const lv = g.p.player ? g.repLevel().id : 'known';
    pl.setMood(...({ pillar: ['happy', 'proud'], trusted: ['confident', 'upright'], known: ['neutral', 'upright'], cloud: ['disappointed', 'slouch'], pariah: ['embarrassed', 'slouch'] }[lv] || ['neutral', 'upright']));
  }

  // ---------- input: tap pins, joystick, pinch ----------
  bindInput() {
    const canvas = this.app.renderer.domElement; let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
      if (moved < 10 && dt < 500) this.pick(e.clientX, e.clientY);
    });
    // pinch zoom is handled by play/input.js, which only counts fingers on the 3D view (not the joystick finger)
    // The joystick is re-created whenever the explore screen re-renders, so listen at the document level
    // and look the current #stick up on each touch (listeners bound to one element were lost after a re-render).
    let id = null, cx = 0, cy = 0, stick = null; const R = 46;
    const knob = () => stick?.querySelector('.knob');
    const move = (x, y) => { let dx = x - cx, dy = y - cy; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } const k = knob(); if (k) k.style.transform = `translate(${dx}px, ${dy}px)`; const f = -dy / R, s = dx / R; const m = Math.hypot(f, s); this.app.input.setAnalog(m > 0.15 ? f : 0, m > 0.15 ? s : 0); if (m > 0.85) this.app.input.virtual.add('ShiftLeft'); else this.app.input.virtual.delete('ShiftLeft'); };
    const end = (e) => { if (e && e.pointerId !== id) return; id = null; const k = knob(); if (k) k.style.transform = ''; stick = null; this.app.input.setAnalog(0, 0); this.app.input.virtual.delete('ShiftLeft'); };
    document.addEventListener('pointerdown', (e) => {
      const el = e.target?.closest?.('#stick'); if (!el || id !== null) return;
      stick = el; id = e.pointerId; const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e.clientX, e.clientY); e.preventDefault();
    });
    document.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e.clientX, e.clientY); });
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  }
  pick(x, y) {
    const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(v, this.app.camera);
    const hits = this.ray.intersectObjects([...this.pins.values()].filter((p) => p.sprite.visible).map((p) => p.sprite), false);
    if (hits.length) { this.ui.openLocation(hits[0].object.userData.locId); return true; }
    const nb = this.newsBoards?.length ? this.ray.intersectObjects(this.newsBoards, true) : [];
    if (nb.length && nb[0].distance < 60) { this.ui.go('news'); return true; }
    return false;
  }
  /** Screen position of a pin (tests and the tutorial use it). */
  screenPos(id) { const p = this.pins.get(id); if (!p) return null; const v = p.sprite.position.clone(); v.y += 1; v.project(this.app.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; }
}
