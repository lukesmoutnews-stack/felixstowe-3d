// Felixstowe 3D – application entry point.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { LocalFrame } from './geo/projection.js';
import { pointInRing, distToSegment } from './geo/polygon.js';
import { TileSource } from './data/tile-source.js';
import { Terrain } from './world/terrain.js';
import { World } from './world/world.js';
import { Environment } from './world/environment.js';
import { makeSea } from './world/landcover.js';
import { updateMaterials, allMaterials } from './world/materials.js';
import { Input } from './play/input.js';
import { Collision } from './play/collision.js';
import { Player } from './play/player.js';
import { Vehicle } from './play/vehicle.js';
import { CameraRig } from './play/camera-rig.js';
import { AudioEngine } from './audio/audio.js';
import { UI } from './ui/ui.js';
import { loadSettings, saveSettings, Journal } from './state.js';
import { LANDMARKS, STREET_GOALS } from './content/landmarks.js';

const params = new URLSearchParams(location.search);
// A hosting page can pre-set options (used by the published demo, where query strings are unavailable).
for (const [k, v] of Object.entries(window.F3D_DEMO || {})) params.set(k, v);

class App {
  async init() {
    this.t0 = performance.now();
    this.settings = loadSettings(params.has('fixture') ? { proceduralTrees: true } : {});
    this.fixture = params.get('fixture');
    let origin = CONFIG.origin, spawn = CONFIG.spawn;
    // Data directory: 'data/' (Felixstowe) or another prepared region via ?data=<dir>/ (tests).
    this.dataDir = (params.get('data') || 'data/').replace(/\/?$/, '/');
    let manifest = { tiles: [], terrain: null };
    if (!this.fixture) try { const r = await fetch(this.dataDir + 'manifest.json', { cache: 'no-cache' }); if (r.ok) manifest = await r.json(); } catch { /* none */ }
    this.manifest = manifest;
    if (manifest.origin) origin = manifest.origin;
    if (manifest.spawn) spawn = manifest.spawn;
    if (this.fixture) {
      const fj = await (await fetch(`test/fixtures/${this.fixture}.json`)).json();
      origin = fj.fixtureMeta.origin; spawn = fj.fixtureMeta.spawn;
    }
    this.spawnSpec = spawn;
    this.frame = new LocalFrame(origin.lat, origin.lon);

    // renderer
    const canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('test') });
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 4000);
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });

    this.terrain = new Terrain();
    // Live Overpass is only used for the default Felixstowe data directory.
    this.source = new TileSource(this.frame, { fixture: this.fixture, onStatus: (m) => this.ui?.log(m), staticPath: this.dataDir + 'tiles/', allowLive: !params.get('data') });
    this.world = new World(this.scene, this.frame, this.terrain, this.source, this.settings);
    this.input = new Input(canvas);
    this.collision = new Collision(this.world);
    this.audio = new AudioEngine(this.settings);
    this.journal = params.has('test') ? Object.assign(new Journal(), { save() {} }) : new Journal();
    if (params.has('test')) this.journal.reset();
    this.ui = new UI(this);
    this.ui.log('Coordinate frame: ETRS89 → National Grid TM, origin ' + origin.lat + ', ' + origin.lon);

    this.source.staticTiles = new Set(manifest.tiles || []);
    this.source.overtureTiles = new Set(manifest.overture?.tiles || []);
    if (manifest.overture?.tiles?.length) this.ui.attribution('Overture Maps Foundation');
    const terrainPath = params.get('terrain') || (manifest.terrain ? this.dataDir + 'terrain/terrain.json' : null);
    const hasTerrain = !!terrainPath && await this.terrain.load(terrainPath, this.frame);
    if (hasTerrain) {
      const dir = terrainPath.replace(/[^/]*$/, '');
      try { const r = await fetch(dir + 'building-heights.json'); if (r.ok) { this.world.lidarHeights = new Map(Object.entries((await r.json()).heights).map(([k, v]) => [Number(k), v])); this.ui.log(`LiDAR building heights: ${this.world.lidarHeights.size} buildings.`); } } catch { /* optional */ }
      try { const r = await fetch(dir + 'yard.json'); if (r.ok) { const y = await r.json(); this.world.yardRuns = y.runs; this.world.yardVersion = y.version || 1; this.ui.log(`LiDAR container stacks: ${this.world.yardRuns.length} blocks.`); } } catch { /* optional */ }
      try { const r = await fetch(dir + 'trees.json'); if (r.ok) this.world.lidarTrees = (await r.json()).trees.map(([E, N, h]) => ({ ...this.frame.fromOSGB(E, N), h })); } catch { /* optional */ }
    }
    this.ui.log(hasTerrain ? 'LiDAR terrain loaded (Environment Agency DTM).' : 'No LiDAR terrain file – using flat ground at sea level (documented limitation).');
    if (hasTerrain) this.ui.attribution('Contains Environment Agency data');

    this.env = new Environment(this.scene, this.renderer, this.frame);
    this.sea = makeSea(this.terrain); this.scene.add(this.sea);
    this.player = new Player(this.scene, this.world, this.collision);
    this.player.onStep = (v) => this.audio.step(this.surfaceKind(), v / 2);
    this.car = new Vehicle(this.scene, this.world, this.collision); this.car.mesh.visible = false;
    this.rig = new CameraRig(this.camera, this.world);
    this.driving = false; this.paused = false; this.entered = false;

    this.world.addEventListener('tileloaded', (e) => { const t = e.detail; this.ui.log(`Tile ${t.key}: ${t.features.buildings.length} buildings, ${t.features.roads.length} roads (${t.source}, ${t.timing.fetchMs + t.timing.buildMs} ms)`); this.ui.mapR.drop(t.key); });
    this.world.addEventListener('tileerror', (e) => this.ui.log(`Tile ${e.detail.key} failed: ${e.detail.error.message || e.detail.error}`, 'err'));
    this.world.addEventListener('tileunloaded', (e) => this.ui.mapR.drop(e.detail));

    // initial area: spawn search point
    const sp = this.frame.toWorld(spawn.lat, spawn.lon);
    this.ui.log(this.fixture ? `TEST FIXTURE “${this.fixture}” – synthetic geometry, not Felixstowe.` : 'Loading OpenStreetMap data around the seafront…');
    this.ui.progress(0.05);
    let n = 0; const total = 4;
    const onTile = () => { n++; this.ui.progress(Math.min(0.95, 0.05 + (n / total) * 0.9)); };
    this.world.addEventListener('tileloaded', onTile);
    try { await this.world.ensureAround(sp.x, sp.z, 600); } catch (e) { console.error(e); }
    this.world.removeEventListener('tileloaded', onTile);
    const loaded = [...this.world.tiles.values()].filter((t) => t.features);
    if (!loaded.length) {
      this.ui.showError(`<p>No map tiles could be loaded. The live OpenStreetMap (Overpass) service may be unreachable from this network.</p>
        <p>Fix: run <code>node tools/setup-data.mjs</code> (or <code>--no-lidar</code> for a quick start) on a machine with internet access, then reload. See <code>docs/setup.md</code>. No substitute data is shown.</p>`);
      this.loadFailed = true; window.__f3d = this.debugApi(); return;
    }
    this.resolveSpawn(sp);
    this.applySettings();
    this.ui.progress(1);
    this.ui.ready();
    this.loadMs = Math.round(performance.now() - this.t0);
    this.clock = new THREE.Timer(); this.clock.connect?.(document);
    this.fpsAcc = { frames: 0, t: 0, fps: 0 };
    this.streamTimer = 0; this.hudTimer = 0; this.interactTimer = 0; this.streaming = false;
    window.__f3d = this.debugApi();
    this.renderer.setAnimationLoop(() => this.frameLoop());
    const badge = this.fixture ? 'Synthetic test data – not Felixstowe' : manifest.label ? manifest.label : null;
    if (badge) { const b = document.createElement('div'); b.className = 'fixture-badge'; b.textContent = badge; document.getElementById('ui').append(b); }
    if (params.has('autoenter')) this.enter();
  }

  /** Spawn on a pavement next to the nearest real road to the named landmark (or search point). */
  resolveSpawn(sp) {
    let target = { x: sp.x, z: sp.z };
    const want = this.spawnSpec.name;
    const lmPoi = [...this.world.pois.values()].find((p) => p.name && want && p.name.toLowerCase() === want.toLowerCase());
    if (lmPoi) { target = { x: lmPoi.x, z: lmPoi.z }; if (lmPoi.line) target = { x: lmPoi.line[0][0], z: lmPoi.line[0][1] }; }
    const pos = this.findStandingSpot(target.x, target.z);
    this.player.place(pos.x, pos.z);
    this.rig.yaw = pos.yaw ?? 0; this.spawnYaw = this.rig.yaw;
    this.parkCar(pos.x, pos.z);
    this.ui.log(lmPoi ? `Start: next to ${lmPoi.name} (found in OSM).` : `Start: nearest street to the search point (“${want}” not in loaded data).`);
  }
  findStandingSpot(x, z) {
    const road = this.world.nearestRoad(x, z, 600, (r) => !r.footOnly) || this.world.nearestRoad(x, z, 600);
    if (!road) return { x, z };
    const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1], L = Math.hypot(dx, dz) || 1;
    for (const off of [road.road.width / 2 + 1.0, -(road.road.width / 2 + 1.0), 0]) {
      const px = road.cx + (dz / L) * off, pz = road.cz - (dx / L) * off;
      if (this.world.isWalkable(px, pz) && !this.collision.insideBuilding(px, pz) && !this.collision.resolve(px, pz, 0.35, 0, 1.7).hit) return { x: px, z: pz, yaw: Math.atan2(-dx, -dz) };
    }
    return { x: road.cx, z: road.cz, yaw: Math.atan2(-dx, -dz) };
  }
  parkCar(x, z) {
    const road = this.world.nearestRoad(x, z, 300, (r) => r.car && !r.footOnly && r.width >= 4.5);
    if (!road) { this.car.mesh.visible = false; this.carAvailable = false; return; }
    const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1], L = Math.hypot(dx, dz) || 1;
    const off = road.road.width / 2 - 1.1, ux = dx / L, uz = dz / L;
    const px = road.cx + uz * off + ux * 6, pz = road.cz - ux * off + uz * 6;
    this.car.place(px, pz, Math.atan2(ux, uz)); this.car.mesh.visible = true; this.carAvailable = true;
  }

  enter() {
    if (this.entered) return;
    this.entered = true; this.ui.hideLoading(); this.audio.start(); this.audio.applyVolumes();
    this.rig.mode = 'third'; this.rig.pitch = -0.28; this.rig.yaw = this.spawnYaw ?? this.rig.yaw; this.rig.transition = 1;
    this.ui.toast('Welcome to Felixstowe. Press M for the map, J for your pocketbook.');
  }
  action(id) {
    if (id === 'map') this.ui.toggle('map'); else if (id === 'journal') this.ui.toggle('journal');
    else if (id === 'menu') this.ui.toggle('menu'); else if (id === 'view') { this.rig.cycle(); this.ui.toast('View: ' + { third: 'third person', first: 'first person', overview: 'overview' }[this.rig.mode]); }
  }
  focusPos() { return this.driving ? this.car.pos : this.player.pos; }
  focusHeading() { return this.driving ? this.car.heading : this.player.heading; }

  async travelTo(x, z) {
    this.ui.toast('Travelling…');
    if (this.driving) this.exitCar();
    await this.world.ensureAround(x, z, 500);
    const p = this.findStandingSpot(x, z);
    this.player.place(p.x, p.z); this.rig.yaw = p.yaw ?? this.rig.yaw; this.rig.initialised = false;
    this.parkCar(p.x, p.z);
  }
  enterCar() { this.driving = true; this.player.mesh.visible = false; this.journal.drives++; this.journal.save(); this.rig.dist = 8; this.ui.toast('Driving. E to get out, Space for handbrake.'); }
  exitCar() {
    const [fx, fz] = this.car.forward();
    for (const s of [-2.0, 2.0, -3, 3]) {
      const x = this.car.pos.x - fz * s, z = this.car.pos.z + fx * s;
      if (this.world.isWalkable(x, z) && !this.collision.resolve(x, z, 0.35, this.car.pos.y, this.car.pos.y + 1.7).hit) { this.player.place(x, z); break; }
    }
    this.driving = false; this.player.mesh.visible = true; this.car.speed = 0;
  }

  applySettings(reloadTiles = false) {
    const s = this.settings; saveSettings(s);
    this.audio.applyVolumes();
    this.env?.setShadowQuality(s.shadows);
    this.renderer.shadowMap.enabled = s.shadows !== 'off';
    const d = ukTime(s.timeOfDay);
    if (!this._lastTod || Math.abs(this._lastTod - s.timeOfDay) > 0.01) { this.env?.setTime(d); this._lastTod = s.timeOfDay; }
    this.camera.far = s.viewDistance * 1.25 + 600; this.camera.updateProjectionMatrix();
    this.scene.fog.density = 1.5 / s.viewDistance;
    if (reloadTiles) { for (const k of [...this.world.tiles.keys()]) this.world.unloadTile(k); this.streamTimer = 99; }
  }
  surfaceKind() {
    const { x, z } = this.player.pos;
    for (const a of this.world.areaGrid.query(x, z, x, z)) if (pointInRing(x, z, a.outer)) return a.kind === 'shingle' || a.kind === 'beach' ? 'shingle' : 'soft';
    return this.world.nearestRoad(x, z, 6) ? 'hard' : 'soft';
  }

  objectives() {
    const out = []; const seen = new Set();
    for (const p of this.world.pois.values()) if (p.landmark && !seen.has(p.landmark)) {
      seen.add(p.landmark); const lm = LANDMARKS.find((l) => l.id === p.landmark);
      out.push({ id: 'visit_' + lm.id, title: `Visit ${lm.title}`, done: !!this.journal.places[lm.id] });
    }
    const names = new Set(); for (const t of this.world.tiles.values()) for (const r of t.features?.roads || []) if (r.name) names.add(r.name);
    for (const g of STREET_GOALS) {
      const walked = Object.keys(this.journal.streets).some((s) => g.street.test(s));
      if (walked || [...names].some((n) => g.street.test(n))) out.push({ id: g.id, title: g.title, done: walked });
    }
    if (this.carAvailable) out.push({ id: 'drive', title: 'Take the car for a drive (E next to it)', done: this.journal.drives > 0 });
    return out;
  }

  // ---------- per-frame ----------
  frameLoop() {
    this.clock.update(); const dt = Math.min(0.05, this.clock.getDelta());
    if (this.holdSim) { this.renderer.render(this.scene, this.camera); return; }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    const f = this.fpsAcc; f.frames++; f.t += dt; if (f.t > 1) { f.fps = f.frames / f.t; f.frames = 0; f.t = 0; const i = this.renderer.info.render; this.ui.fps(`${f.fps.toFixed(0)} fps · ${i.calls} draws · ${(i.triangles / 1000).toFixed(0)}k tris`); }
  }

  /** Game logic for one step (separate from rendering so tests can run it deterministically). */
  update(dt) {
    const inp = this.input;
    if (this.entered && !this.paused) {
      if (inp.hit('Escape')) this.ui.open ? this.ui.close() : this.action('menu');
      else if (inp.hit('KeyM')) this.action('map');
      else if (inp.hit('KeyJ')) this.action('journal');
      else if (inp.hit('KeyV')) this.action('view');
      else if (inp.hit('F1') || inp.hit('Slash')) { this.ui.show('menu'); this.ui._menuTab('Controls'); }
      const active = !this.ui.open || this.ui.open === 'card';
      if (inp.hit('KeyE') && active) this.interact();
      if (this.driving) { this.car.update(dt, inp, active); this.player.pos.copy(this.car.pos); }
      else { this.player.update(dt, inp, this.rig.moveYaw, active); if (this.carAvailable) this.car.update(dt, inp, false); }
      const t = this.driving ? this.car.pos : this.player.pos;
      this.rig.update(dt, inp, t, { driving: this.driving, heading: this.car.heading, speed: this.car.speed });
      if (this.ui.open === 'card' && this._cardPoi && Math.hypot(this._cardPoi.x - t.x, this._cardPoi.z - t.z) > 60 && !this._cardInside) this.ui.close();
    } else if (!this.entered) {
      // slow orbit behind the loading screen
      this.rig.yaw += dt * 0.05; this.rig.mode = 'overview'; this.rig.pitch = -0.6; this.rig.overDist = 380;
      this.rig.update(dt, { mouseDX: 0, mouseDY: 0, wheel: 0, dragging: false }, this.player.pos, {});
    } else if (inp.hit('Escape')) this.ui.close();
    inp.endFrame();

    const focus = this.focusPos();
    this.env.update(focus, dt, this.camera);
    this.sea.position.x = focus.x; this.sea.position.z = focus.z;
    updateMaterials(dt);
    this.cullChunks(this.camera.position);

    // throttled work
    this.hudTimer += dt; this.interactTimer += dt; this.streamTimer += dt;
    if (this.hudTimer > 0.15) { this.hudTimer = 0; this.updateHud(); }
    if (this.interactTimer > 0.25) { this.interactTimer = 0; this.updateInteractions(); }
    if (this.streamTimer > 1.5 && !this.streaming) {
      this.streamTimer = 0; this.streaming = true;
      this.world.ensureAround(focus.x, focus.z).catch((e) => console.warn(e)).finally(() => { this.streaming = false; });
    }
  }

  cullChunks(cam) {
    const vd = this.settings.viewDistance;
    for (const t of this.world.tiles.values()) {
      if (!t.group) continue;
      for (const c of t.group.children) {
        if (c.name.startsWith('chunk:')) {
          const [i, j] = c.name.slice(6).split(',').map(Number);
          const cx = (i + 0.5) * 250, cz = (j + 0.5) * 250;
          const d = Math.hypot(cx - cam.x, cz - cam.z);
          c.visible = d < vd + 180;
          if (c.visible) for (const m of c.children) {
            const u = m.userData;
            if (u.detailRange) m.visible = d < u.detailRange + 180;
            else if (u.lodNear) m.visible = d < u.lodNear;
            else if (u.lodFar) m.visible = d >= u.lodFar;
          }
        } else {
          const r = t.rect; const dx = Math.max(r.minX - cam.x, 0, cam.x - r.maxX), dz = Math.max(r.minZ - cam.z, 0, cam.z - r.maxZ);
          const dd = Math.hypot(dx, dz);
          c.visible = c.name.startsWith('props:') && c.name !== 'props:crane' ? dd < Math.min(vd, 450) : dd < Math.min(vd, 1000);
        }
      }
    }
  }

  updateHud() {
    if (!this.entered) return;
    const p = this.focusPos();
    const road = this.world.nearestRoad(p.x, p.z, 30, (r) => !!r.name);
    let area = null;
    for (const poi of this.world.pois.values()) if (poi.ring && poi.kind !== 'building' && pointInRing(p.x, p.z, poi.ring)) { area = poi.name; break; }
    const deck = this.world.onDeck(p.x, p.z);
    this.ui.setPlace(deck?.name || road?.road.name || null, area || (this.world.isLand(p.x, p.z) ? '' : 'Beach / foreshore'), p.x, p.z);
    this.ui.setMode(this.driving ? `${Math.round(Math.abs(this.car.speed) * 2.237)} mph${this.car.offRoad ? ' · off road' : ''}` : '');
    this.ui.drawMinimap(p.x, p.z, this.focusHeading(), this.rig.yaw);
    if (road && road.d < 10 && road.road.name && this.journal.walk(road.road.name)) {
      for (const g of STREET_GOALS) if (g.street.test(road.road.name) && this.journal.complete(g.id)) { this.ui.toast('Objective complete: ' + g.title, 'good'); this.audio.chime(); }
    }
    if (!this.driving) this.journal.distance = (this.journal._d0 ??= this.journal.distance) + this.player.distance;
    // audio: proximity to sea (sampled ring)
    let sea = 0; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; for (const r of [25, 70, 160]) if (!this.world.isLand(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r)) { sea += r === 25 ? 1 : r === 70 ? 0.6 : 0.3; break; } }
    this.audio.update({ seaProximity: Math.min(1, sea / 6), altitude: this.rig.mode === 'overview' ? this.rig.overDist : this.camera.position.y - p.y, engineOn: this.driving, speed: this.car.speed });
  }

  /** Find the best interactable near the player (contextual: distance + line of sight). */
  nearbyInteractable() {
    const p = this.focusPos();
    if (!this.driving && this.carAvailable && Math.hypot(this.car.pos.x - p.x, this.car.pos.z - p.z) < 3.4) return { type: 'car' };
    let best = null;
    for (const poi of this.world.pois.values()) {
      let d = Math.hypot(poi.x - p.x, poi.z - p.z), inside = false;
      if (poi.ring && pointInRing(p.x, p.z, poi.ring)) { d = 0; inside = true; }
      if (poi.line) for (let i = 1; i < poi.line.length; i++) d = Math.min(d, distToSegment(p.x, p.z, poi.line[i - 1][0], poi.line[i - 1][1], poi.line[i][0], poi.line[i][1]).d);
      const reach = poi.landmark ? 30 : 12;
      if (d > reach) continue;
      if (!inside && !this.collision.lineOfSight(p.x, p.z, poi.x, poi.z, p.y + 1.6, Number(String(poi.id).slice(1)))) continue;
      const score = d - (poi.landmark ? 20 : 0);
      if (!best || score < best.score) best = { type: 'poi', poi, score, inside };
    }
    return best;
  }
  updateInteractions() {
    if (!this.entered || this.ui.open) { if (!this.ui.open) this.ui.prompt(null); return; }
    const it = this.nearbyInteractable(); this._near = it;
    if (this.driving) this.ui.prompt('<kbd>E</kbd> Get out of the car');
    else if (!it) this.ui.prompt(null);
    else if (it.type === 'car') this.ui.prompt('<kbd>E</kbd> Get in the car');
    else this.ui.prompt(`<kbd>E</kbd> ${it.poi.landmark ? 'Read about' : 'Inspect'} ${escapeHtml(it.poi.name)}`);
    // discovery (no key press needed)
    if (it?.type === 'poi') {
      const id = it.poi.landmark || it.poi.id;
      if (this.journal.discover(id, { name: LANDMARKS.find((l) => l.id === it.poi.landmark)?.title || it.poi.name, kind: it.poi.kind })) {
        if (it.poi.landmark) { this.ui.toast('Discovered: ' + it.poi.name, 'good'); this.audio.chime(); }
      }
    }
  }
  interact() {
    if (this.driving) { this.exitCar(); return; }
    const it = this.nearbyInteractable(); if (!it) return;
    if (it.type === 'car') { this.enterCar(); return; }
    const lm = LANDMARKS.find((l) => l.id === it.poi.landmark) || null;
    this._cardPoi = it.poi; this._cardInside = it.inside;
    this.ui.showCard(it.poi, lm);
    if (lm) for (const [i, f] of lm.facts.entries()) this.journal.learn(lm.id + ':' + i, { title: lm.title, ...f });
  }

  debugApi() {
    const app = this;
    return {
      app,
      state: () => ({
        loadFailed: !!app.loadFailed, entered: app.entered, loadMs: app.loadMs, fps: app.fpsAcc?.fps,
        player: app.player && { x: +app.player.pos.x.toFixed(2), y: +app.player.pos.y.toFixed(2), z: +app.player.pos.z.toFixed(2) },
        car: app.car && { x: +app.car.pos.x.toFixed(2), z: +app.car.pos.z.toFixed(2), speed: +app.car.speed.toFixed(2), bumps: app.car.bumps },
        driving: app.driving, mode: app.rig?.mode, tiles: app.world ? [...app.world.tiles.keys()] : [],
        render: app.renderer && { calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles, geometries: app.renderer.info.memory.geometries, textures: app.renderer.info.memory.textures, programs: app.renderer.info.programs?.length },
        memoryMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        materials: allMaterials().length, pois: app.world?.pois.size,
      }),
      quality: () => app.world.qualityReport(),
      teleport: (x, z) => app.travelTo(x, z),
      key: (code, down) => { if (down) { app.input.virtual.add(code); app.input.pressed.add(code); } else app.input.virtual.delete(code); },
      look: (dx, dy) => { app.input.mouseDX += dx; app.input.mouseDY += dy; },
      setView: (mode, yaw, pitch, dist) => { app.rig.mode = mode; if (yaw != null) app.rig.yaw = yaw; if (pitch != null) app.rig.pitch = pitch; if (dist != null) { if (mode === 'overview') app.rig.overDist = dist; else app.rig.dist = dist; } app.rig.initialised = false; },
      setTime: (h) => { app.settings.timeOfDay = h; app.applySettings(); },
      /** Run game logic for `seconds` at 30 Hz without rendering (rendering is paused meanwhile). */
      advance: (seconds) => { app.holdSim = true; const n = Math.round(seconds * 30); for (let i = 0; i < n; i++) app.update(1 / 30); app.holdSim = false; },
      /** Render one frame and time it (ms). */
      renderTime: (n = 5) => { const t = performance.now(); for (let i = 0; i < n; i++) app.renderer.render(app.scene, app.camera); app.renderer.getContext().finish(); return (performance.now() - t) / n; },
    };
  }
}
/** Today's date at the given UK clock time (GMT/BST), as an absolute Date. */
function ukTime(hours) {
  const now = new Date(), y = now.getUTCFullYear();
  const lastSunday = (m) => { const d = new Date(Date.UTC(y, m + 1, 0, 1)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d; };
  const bst = now >= lastSunday(2) && now < lastSunday(9);
  return new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate(), 0, 0) + (hours - (bst ? 1 : 0)) * 3600000);
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

const app = new App();
app.init().catch((e) => {
  console.error(e);
  const el = document.querySelector('#loading .log'); if (el) { const li = document.createElement('li'); li.className = 'err'; li.textContent = 'Startup error: ' + e.message; el.append(li); }
  window.__f3d = { error: String(e.stack || e) };
});
