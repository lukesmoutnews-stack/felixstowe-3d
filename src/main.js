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
import { TEX } from './world/textures.js';
import { inZone } from './world/zone.js';
import { Input } from './play/input.js';
import { Collision } from './play/collision.js';
import { Player } from './play/player.js';
import { Vehicle } from './play/vehicles/vehicle.js';
import { Fleet } from './play/vehicles/fleet.js';
import { Crowd } from './play/people/crowd.js';
import { VEHICLES } from './play/vehicles/specs.js';
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
    // ?quality=low (phones / the mayor game): no shadows, shorter view, 1x pixels
    if (params.get('quality') === 'low') Object.assign(this.settings, { shadows: 'off', viewDistance: 900, pixelRatio: 1, proceduralTrees: false }); if (params.get('quality') === 'low') { TEX.low = true; CONFIG.streamRadius = 650; CONFIG.unloadRadius = 1400; } // phones: fewer 1 km tiles in memory (view distance is 900 m)
    this.hooks = window.F3D_HOOKS || {};
    this.fixture = params.get('fixture');
    this.zoneOn = !this.fixture && !params.has('nozone') && /^(data|fx)?\/?$/.test(params.get('data') || ''); // Felixstowe data only (data/ or the published fx/), not test regions
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
    const low = params.get('quality') === 'low'; // phones: no MSAA buffers
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: low ? 'default' : 'high-performance', preserveDrawingBuffer: params.has('test') });
    // if the phone reclaims graphics memory, say so and offer a reload instead of leaving a frozen black screen
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); this.suspended = true; if (document.getElementById('gl-lost')) return;
      const d = document.createElement('div'); d.id = 'gl-lost';
      d.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(10,20,30,.88);color:#fff;font:16px system-ui,sans-serif;text-align:center;padding:24px';
      d.innerHTML = '<p style="margin:0;max-width:22em">The 3D town ran out of graphics memory on this device.</p><button style="font:inherit;padding:10px 20px;border-radius:999px;border:0;background:#2f7de1;color:#fff">Reload</button>';
      d.querySelector('button').onclick = () => location.reload(); document.body.appendChild(d);
    });
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
    this.fleet = new Fleet(this); this.crowd = new Crowd(this); if (params.has('nopeople')) this.crowd.enabled = false; this.npcPositions = () => this.crowd.positions(); this.car = null; this.transit = null; // car = the vehicle being driven (or last driven)
    if (params.has('notraffic') || this.hooks.noTraffic) this.fleet.traffic.enabled = false;
    if (this.settings.viewDistance < 1000) this.fleet.traffic.max = 6;
    this.rig = new CameraRig(this.camera, this.world, this.settings);
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
    window.__f3d = this.debugApi(); window.__THREE = THREE;
    this.renderer.setAnimationLoop(() => this.frameLoop());
    const badge = this.fixture ? 'Synthetic test data – not Felixstowe' : manifest.label ? manifest.label : null;
    if (badge) { const b = document.createElement('div'); b.className = 'fixture-badge'; b.textContent = badge; document.getElementById('ui').append(b); }
    if (params.has('autoenter')) this.enter();
    this.hooks.onReady?.(this);
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
  /** Your own car near where you start, plus a few parked vehicles of other kinds to try. */
  parkCar(x, z) {
    const f = this.fleet;
    let mine = f.vehicles.find((v) => v.owner === 'yours');
    if (!mine || Math.hypot(mine.pos.x - x, mine.pos.z - z) > 200) { if (mine) f.remove(mine); mine = f.parkNear(x, z, this.hooks.ownCar || 'hatchback', { owner: 'yours', along: 6, colour: this.hooks.ownColour }); }
    if (!this._seeded && !this.hooks.noParked) {
      this._seeded = true;
      [['taxi', 22], ['van', -16], ['sports', 34], ['parcel', -30], ['boxtruck', 50], ['bus', -48], ['doubledecker', 70], ['artic', 95], ['suv', 44], ['refuse', -70], ['roadworks', 82], ['flatbed', -88]].forEach(([t, a]) => f.parkNear(x, z, t, { owner: 'parked', along: a }));
    }
    this.carAvailable = f.vehicles.length > 0; if (!this.car) this.car = mine;
  }

  enter() {
    if (this.entered) return;
    this.entered = true; this.ui.hideLoading(); this.audio.start(); this.audio.applyVolumes();
    this.rig.mode = 'third'; this.rig.pitch = -0.28; this.rig.yaw = this.spawnYaw ?? this.rig.yaw; this.rig.transition = 1;
    if (!this.hooks.quietEnter) this.ui.toast('Welcome to Felixstowe. Press M for the map, J for your pocketbook.');
  }
  action(id) {
    if (id === 'map') this.ui.toggle('map'); else if (id === 'journal') this.ui.toggle('journal');
    else if (id === 'menu') this.ui.toggle('menu'); else if (id === 'view') { this.rig.cycle(); this.ui.toast('View: ' + { third: 'third person', first: 'first person', overview: 'overview' }[this.rig.mode]); }
  }
  // ---------- playable zone (world/zone.js) ----------
  // Roads out of the town centre and seafront are physically closed (cones, signs, barriers). Between the closures
  // (back gardens, fields, the beach) this turns the player back: a step from inside the zone to outside is undone.
  // Only crossings are stopped, so a teleport or a test placement outside the zone is not trapped.
  _zoneSnapshot() {
    if (!this.zoneOn) return null;
    const v = this.driving && this.car ? this.car : null, p = v ? v.pos : this.player.pos;
    return { v, x: p.x, z: p.z, h: v ? v.heading : 0, inside: inZone(p.x, p.z) };
  }
  _keepInZone(b) {
    if (!b || !b.inside) return;
    const v = this.driving && this.car ? this.car : null; if (v !== b.v) return; // got in or out this frame
    const p = v ? v.pos : this.player.pos; if (inZone(p.x, p.z)) return;
    p.x = b.x; p.z = b.z; if (v) { v.heading = b.h; v.speed = 0; }
    const now = performance.now(); if (!this._zoneToast || now - this._zoneToast > 6000) { this._zoneToast = now; this.ui.toast('This part of Felixstowe is closed for now. The race is in the town centre and on the seafront.'); this.hooks.onZoneEdge?.(); }
  }
  focusPos() { return this.driving && this.car ? this.car.pos : this.player.pos; }
  focusHeading() { return this.driving && this.car ? this.car.heading : this.player.heading; }

  async travelTo(x, z) {
    this.ui.toast('Travelling…');
    if (this.driving) this.exitCar();
    await this.world.ensureAround(x, z, 500);
    const p = this.findStandingSpot(x, z);
    this.player.place(p.x, p.z); this.rig.yaw = p.yaw ?? this.rig.yaw; this.rig.initialised = false;
    this.parkCar(p.x, p.z);
  }
  /** Get in: walk to the door, door opens, sit down, door closes (about a second). */
  enterCar(v = this.fleet.nearestEnterable(this.player.pos)) {
    if (!v || this.transit) return;
    const [dx, dz] = v.local(v.door.x, v.door.z);
    this.transit = { kind: 'enter', v, t: 0, from: this.player.pos.clone(), door: { x: dx, z: dz } };
    v.doorTarget = 1; this.player.heading = Math.atan2(v.pos.x - dx, v.pos.z - dz);
    if (v.owner === 'parked') { this.hooks.onVehicleTaken?.(v); if (!this.hooks.onVehicleTaken) this.ui.toast('This isn’t your vehicle. In the game you can borrow it; never do this in real life.'); }
  }
  _finishEnter(v) {
    this.car = v; this.fleet.driving = v; this.driving = true; this.player.mesh.visible = false; v.doorTarget = 0;
    if (v.owner === 'parked') v.owner = 'taken';
    this.journal.drives++; this.journal.save(); // the camera eases out to this vehicle's chase distance by itself (camera-rig.js)
    this.ui.toast(`Driving the ${v.s.name}. E to get out, Space handbrake, V for the driver’s-seat view.`);
    this.hooks.onVehicleEnter?.(v);
  }
  /** Get out on the driver's side if it's clear and on the same level, otherwise the other side or behind. */
  exitCar() {
    const v = this.car; if (!v || this.transit) return;
    if (Math.abs(v.speed) > 1.2) { this.ui.toast('Slow down and stop before getting out.'); return; }
    v.speed = 0;
    const cands = [[v.door.x, v.door.z], [-v.door.x, v.door.z], [v.door.x * 1.4, v.door.z - 1], [0, -v.s.len / 2 - 1.2 - (v.trailer ? 14 : 0)]];
    let spot = null;
    for (const [lx, lz] of cands) {
      const [x, z] = v.local(lx, lz); const y = this.world.surfaceAt(x, z, v.pos.y + 0.5);
      if (Math.abs(y - v.pos.y) > 0.8 || !this.world.isWalkable(x, z, v.pos.y)) continue;
      if (this.collision.resolve(x, z, 0.35, y, y + 1.7).hit || this.collision.insideBuilding(x, z, y + 0.5)) continue;
      if (this.fleet.vehicles.some((o) => o !== v && o.circles().some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.4 && Math.abs(c.y0 - y) < 2))) continue;
      spot = { x, z, y }; break;
    }
    if (!spot) { this.ui.toast('There’s no safe space to get out here.'); return; }
    v.doorTarget = 1; const [sx, sz] = v.local(v.seat.x, v.seat.z);
    this.transit = { kind: 'exit', v, t: 0, from: { x: sx, z: sz, y: v.pos.y }, spot };
    this.driving = false; this.fleet.driving = null;
  }
  _updateTransit(dt) {
    const tr = this.transit; if (!tr) return; tr.t += dt; const v = tr.v;
    if (tr.kind === 'enter') {
      const k = Math.min(1, tr.t / 0.45);
      this.player.pos.x = tr.from.x + (tr.door.x - tr.from.x) * k; this.player.pos.z = tr.from.z + (tr.door.z - tr.from.z) * k; this.player.mesh.position.copy(this.player.pos);
      if (tr.t > 0.55) this.player.mesh.visible = false;
      if (tr.t > 0.9) { this.transit = null; this._finishEnter(v); }
    } else {
      if (tr.t > 0.3 && !this.player.mesh.visible) { this.player.place(tr.from.x, tr.from.z, tr.from.y + 0.5); this.player.mesh.visible = true; }
      if (tr.t > 0.3) { const k = Math.min(1, (tr.t - 0.3) / 0.4); this.player.pos.x = tr.from.x + (tr.spot.x - tr.from.x) * k; this.player.pos.z = tr.from.z + (tr.spot.z - tr.from.z) * k; this.player.pos.y = tr.spot.y; this.player.mesh.position.copy(this.player.pos); }
      if (tr.t > 0.8) v.doorTarget = 0;
      if (tr.t > 1.0) { this.player.place(tr.spot.x, tr.spot.z, tr.spot.y + 0.3); this.transit = null; this.hooks.onVehicleExit?.(v); }
    }
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
    if (this.suspended) return; // a full-screen page covers the 3D view (saves battery)
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
      const ctrl = Vehicle.controls(inp, active && this.driving && !this.transit);
      const night = this.settings.timeOfDay < 7.6 || this.settings.timeOfDay > 18.8;
      for (const v of this.fleet.vehicles) v.headOn = night && (v.owner === 'traffic' || v === this.car);
      const peds = [...(this.driving ? [] : [this.player.pos]), ...(this.npcPositions?.() || [])];
      this.fleet.update(dt, ctrl, this.focusPos(), peds);
      this.crowd.update(dt, this.focusPos());
      const before = this._zoneSnapshot();
      if (this.transit) this._updateTransit(dt);
      else if (this.driving && this.car) { const [sx, sz] = this.car.local(this.car.seat.x, this.car.seat.z); this.player.pos.set(sx, this.car.pos.y, sz); }
      else this.player.update(dt, inp, this.rig.moveYaw, active);
      this._keepInZone(before);
      const t = this.driving && this.car ? this.car.pos : this.player.pos;
      if (active) inp.padLook(dt);
      this.rig.update(dt, inp, t, { driving: this.driving && !!this.car, heading: this.car?.heading || 0, speed: this.car?.speed || 0, vehicle: this.driving ? this.car : null });
      if (this.ui.open === 'card' && this._cardPoi && Math.hypot(this._cardPoi.x - t.x, this._cardPoi.z - t.z) > 60 && !this._cardInside) this.ui.close();
    } else if (!this.entered) {
      // slow orbit behind the loading screen
      this.rig.yaw += dt * 0.05; this.rig.mode = 'overview'; this.rig.pitch = -0.6; this.rig.overDist = 380;
      this.rig.update(dt, { mouseDX: 0, mouseDY: 0, wheel: 0, dragging: false }, this.player.pos, {});
    } else if (inp.hit('Escape')) this.ui.close();
    if (this.entered) this.hooks.onUpdate?.(this, dt);
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
    this.ui.setMode(this.driving && this.car ? `${Math.round(Math.abs(this.car.speed) * 2.237)} mph${this.car.offRoad ? ' · off road' : ''}` : '');
    this.ui.drawMinimap(p.x, p.z, this.focusHeading(), this.rig.yaw);
    if (road && road.d < 10 && road.road.name && this.journal.walk(road.road.name)) {
      for (const g of STREET_GOALS) if (g.street.test(road.road.name) && this.journal.complete(g.id)) { this.ui.toast('Objective complete: ' + g.title, 'good'); this.audio.chime(); }
    }
    if (!this.driving) this.journal.distance = (this.journal._d0 ??= this.journal.distance) + this.player.distance;
    // audio: proximity to sea (sampled ring)
    let sea = 0; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; for (const r of [25, 70, 160]) if (!this.world.isLand(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r)) { sea += r === 25 ? 1 : r === 70 ? 0.6 : 0.3; break; } }
    this.audio.update({ seaProximity: Math.min(1, sea / 6), altitude: this.rig.mode === 'overview' ? this.rig.overDist : this.camera.position.y - p.y, engineOn: this.driving, speed: this.car ? this.car.speed * 22 / this.car.s.vmax : 0 });
  }

  /** Find the best interactable near the player (contextual: distance + line of sight). */
  nearbyInteractable() {
    const p = this.focusPos();
    if (!this.driving && !this.transit) { const n = this.crowd.nearestTalkable(this.player.pos); if (n) return { type: 'npc', npc: n }; const v = this.fleet.nearestEnterable(this.player.pos); if (v) return { type: 'car', v }; }
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
    if (this.driving) this.ui.prompt(`<kbd>E</kbd> Get out of the ${escapeHtml(this.car?.s.name.split(' (')[0].toLowerCase() || 'vehicle')}`);
    else if (!it) this.ui.prompt(null);
    else if (it.type === 'npc') this.ui.prompt(`<kbd>E</kbd> Talk to ${escapeHtml(it.npc.name)}`);
    else if (it.type === 'car') this.ui.prompt(`<kbd>E</kbd> ${it.v.owner === 'yours' || it.v.owner === 'taken' ? 'Get in' : 'Take'} the ${escapeHtml(it.v.s.name.split(' (')[0].toLowerCase())}${it.v.owner === 'parked' ? ' (not yours, in the game only)' : ''}`);
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
    if (it.type === 'car') { this.enterCar(it.v); return; }
    if (it.type === 'npc') { if (this.hooks.onTalk) this.hooks.onTalk(it.npc); else this.ui.toast(`${escapeHtml(it.npc.name)}: “Morning! Lovely day for it.”`); return; }
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
        car: app.car && { type: app.car.type, x: +app.car.pos.x.toFixed(2), y: +app.car.pos.y.toFixed(2), z: +app.car.pos.z.toFixed(2), heading: +app.car.heading.toFixed(3), speed: +app.car.speed.toFixed(2), bumps: app.car.bumps, impacts: app.car.impacts, trailerAngle: app.car.trailer ? +Math.atan2(Math.sin(app.car.heading - app.car.trailer.heading), Math.cos(app.car.heading - app.car.trailer.heading)).toFixed(3) : null },
        traffic: app.fleet ? app.fleet.traffic.agents.length : 0, vehicles: app.fleet ? app.fleet.vehicles.length : 0,
        driving: app.driving, mode: app.rig?.mode, tiles: app.world ? [...app.world.tiles.keys()] : [],
        render: app.renderer && { calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles, geometries: app.renderer.info.memory.geometries, textures: app.renderer.info.memory.textures, programs: app.renderer.info.programs?.length },
        memoryMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        materials: allMaterials().length, pois: app.world?.pois.size,
      }),
      quality: () => app.world.qualityReport(),
      teleport: (x, z) => app.travelTo(x, z),
      /** Spawn a vehicle of a type at (x,z,heading) on the surface at height y (or the ground), and get in. */
      driveVehicle: async (type, x, z, heading, y = null) => { await app.world.ensureAround(x, z, 400); if (app.driving) { app.car.speed = 0; app.driving = false; app.fleet.driving = null; } const v = app.fleet.spawn(type, x, z, heading, { owner: 'yours', y }); app._finishEnter(v); return { y: v.pos.y }; },
      /** Hold controls for `seconds` of simulation (throttle -1..1, steer -1..1 left positive). */
      hold: (throttle, steer, seconds, handbrake = false) => { const s = { f: throttle, s: -steer }; app.input.setAnalog(s.f, s.s); if (handbrake) app.input.virtual.add('Space'); const n = Math.round(seconds * 30); for (let i = 0; i < n; i++) app.update(1 / 30); app.input.setAnalog(0, 0); app.input.virtual.delete('Space'); return app.debugApi().state().car; },
      vehicles: () => app.fleet.vehicles.map((v) => ({ id: v.id, type: v.type, owner: v.owner, x: +v.pos.x.toFixed(1), y: +v.pos.y.toFixed(2), z: +v.pos.z.toFixed(1), speed: +v.speed.toFixed(2) })),
      graph: () => ({ nodes: app.fleet.traffic.graph.nodes.size, edges: app.fleet.traffic.graph.edges.length }),
      /** Load the area and stand at (x,z); with y, on whichever surface is at that level (e.g. a bridge deck). */
      placeAt: async (x, z, y = null) => { await app.world.ensureAround(x, z, 400); app.player.place(x, z, y); app.rig.initialised = false; return { y: app.player.pos.y, ground: app.world.ground(x, z), deck: app.world.onDeck(x, z, app.player.pos.y)?.name || null }; },
      bridges: () => [...new Set(app.world.profiles.values())].filter((p) => !p.ramp).map((p) => ({ id: p.id, name: p.name, kind: p.kind, L: Math.round(p.L), mid: p.pts[Math.floor(p.pts.length / 2)], crossings: p.crossings.map((c) => ({ kind: c.kind, name: c.name, under: c.id, clearance: +c.clearance.toFixed(2), x: c.x, z: c.z })) })),
      key: (code, down) => { if (down) { app.input.virtual.add(code); app.input.pressed.add(code); } else app.input.virtual.delete(code); },
      look: (dx, dy) => { app.input.mouseDX += dx; app.input.mouseDY += dy; },
      setView: (mode, yaw, pitch, dist) => { app.rig.mode = mode; if (yaw != null) app.rig.yaw = yaw; if (pitch != null) app.rig.pitch = pitch; if (dist != null) { if (mode === 'overview') app.rig.overDist = dist; else app.rig.dist = dist; } app.rig.initialised = false; },
      setTime: (h) => { app.settings.timeOfDay = h; app.applySettings(); },
      /** Run game logic for `seconds` at 30 Hz without rendering (rendering is paused meanwhile). */
      zone: () => ({ on: !!app.zoneOn, inside: inZone(app.focusPos().x, app.focusPos().z), toastAt: app._zoneToast || null }),
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
