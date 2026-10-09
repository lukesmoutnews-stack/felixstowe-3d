// DOM user interface: loading screen, HUD, minimap, full map, journal, pause/settings menu,
// landmark info cards and toasts. Kept deliberately light so the 3D scene stays primary.

import { MapRenderer } from './map.js';
import { LANDMARKS, STREET_GOALS } from '../content/landmarks.js';
import { gridRef } from '../geo/projection.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null) e.setAttribute(k, v); }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const osmLink = (id) => { const t = { w: 'way', n: 'node', r: 'relation' }[String(id)[0]]; return t ? `https://www.openstreetmap.org/${t}/${String(id).slice(1)}` : null; };

export class UI {
  constructor(app) {
    this.app = app; this.mapR = new MapRenderer(app.world); this.open = null;
    this.mapView = { cx: 0, cz: 0, scale: 0.6, w: 0, h: 0 }; this.mapTarget = null;
    this._build();
  }

  _build() {
    const root = $('#ui');
    // ---------- loading ----------
    this.loading = h('section', { id: 'loading', class: 'screen' },
      h('div', { class: 'load-card' },
        h('div', { class: 'kicker' }, 'Suffolk · 51.96°N 1.35°E'),
        h('h1', {}, 'Felixstowe'),
        h('p', { class: 'lede' }, 'The real town, rebuilt in 3D from open map data – streets, buildings, coastline and port where the data allows.'),
        h('div', { class: 'progress' }, h('div', { class: 'bar' })),
        h('ul', { class: 'log' }),
        h('button', { class: 'enter', disabled: '', onclick: () => this.app.enter() }, 'Preparing the town…'),
        h('div', { class: 'keys' },
          ...[['W A S D', 'walk · drive'], ['Shift', 'run'], ['Mouse drag', 'look'], ['E', 'interact · car'], ['V', 'view'], ['M', 'map'], ['J', 'journal'], ['Esc', 'menu']].map(([k, v]) => h('span', {}, h('kbd', {}, k), v))),
        h('p', { class: 'fine' }, 'Map data © ', h('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener' }, 'OpenStreetMap contributors'), ' (ODbL). Heights, roofs and materials are estimated where the data is silent – see Menu › Data.')));
    // ---------- HUD ----------
    this.hud = h('section', { id: 'hud', hidden: '' },
      h('div', { class: 'place' }, h('div', { class: 'street' }, '—'), h('div', { class: 'sub' }, h('span', { class: 'area' }), h('span', { class: 'grid' }))),
      h('div', { class: 'buttons' },
        ...[['map', 'M', 'Map'], ['journal', 'J', 'Journal'], ['view', 'V', 'View'], ['menu', 'Esc', 'Menu']].map(([id, k, label]) => h('button', { class: 'hbtn', 'data-act': id, title: `${label} (${k})`, onclick: () => this.app.action(id) }, h('span', {}, label), h('kbd', {}, k)))),
      h('div', { class: 'minimap' }, h('canvas', { width: 380, height: 380 }), h('div', { class: 'north' }, 'N')),
      h('div', { class: 'prompt', hidden: '' }),
      h('div', { class: 'toasts' }),
      h('div', { class: 'mode' }),
      h('div', { class: 'fps', hidden: '' }),
      h('div', { class: 'attrib' }, '© ', h('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener' }, 'OpenStreetMap'), ' contributors', h('span', { class: 'extra' })));
    // ---------- overlays ----------
    this.mapEl = h('section', { id: 'mapview', class: 'overlay', hidden: '' },
      h('canvas', { class: 'mapcanvas' }),
      h('aside', { class: 'panel side' },
        h('header', {}, h('h2', {}, 'Map'), h('button', { class: 'x', onclick: () => this.close() }, '×')),
        h('p', { class: 'hint' }, 'Drag to pan, scroll to zoom. Click the map to choose a destination. North is grid north (about 2.6° from true north).'),
        h('div', { class: 'dest', hidden: '' }, h('div', { class: 'dname' }), h('button', { class: 'go', onclick: () => this._travel() }, 'Travel here')),
        h('h3', {}, 'Landmarks in the loaded area'), h('ul', { class: 'lm' }),
        h('button', { class: 'ghost', onclick: () => this._centreOnPlayer() }, 'Centre on me')));
    this.journalEl = h('section', { id: 'journal', class: 'overlay', hidden: '' },
      h('div', { class: 'panel book' },
        h('header', {}, h('h2', {}, 'Pocketbook'), h('button', { class: 'x', onclick: () => this.close() }, '×')),
        h('nav', { class: 'tabs' }, ...['Objectives', 'Places', 'History', 'People', 'Objects', 'Progress'].map((t, i) => h('button', { class: i ? '' : 'on', 'data-tab': t, onclick: (e) => this._journalTab(t) }, t))),
        h('div', { class: 'page' })));
    this.menuEl = h('section', { id: 'menu', class: 'overlay', hidden: '' },
      h('div', { class: 'panel menu' },
        h('header', {}, h('h2', {}, 'Paused'), h('button', { class: 'x', onclick: () => this.close() }, '×')),
        h('nav', { class: 'tabs' }, ...['Settings', 'Controls', 'Data', 'About'].map((t, i) => h('button', { class: i ? '' : 'on', 'data-tab': t, onclick: () => this._menuTab(t) }, t))),
        h('div', { class: 'page' }),
        h('footer', {}, h('button', { class: 'primary', onclick: () => this.close() }, 'Resume'))));
    this.cardEl = h('section', { id: 'card', class: 'overlay soft', hidden: '' }, h('div', { class: 'panel card' }));
    root.append(this.loading, this.hud, this.mapEl, this.journalEl, this.menuEl, this.cardEl);
    $('.minimap', this.hud).addEventListener('click', () => this.app.action('map'));
    this.mini = $('.minimap canvas', this.hud); this.miniCtx = this.mini.getContext('2d');
    this._mapEvents();
  }

  // ---------- loading ----------
  log(msg, cls = '') { const ul = $('.log', this.loading); ul.append(h('li', { class: cls }, msg)); while (ul.children.length > 6) ul.firstChild.remove(); }
  progress(f) { $('.bar', this.loading).style.width = Math.round(f * 100) + '%'; }
  ready(label = 'Enter Felixstowe') { const b = $('.enter', this.loading); b.disabled = false; b.textContent = label; b.focus(); }
  showError(html) { const b = $('.enter', this.loading); b.textContent = 'Could not load map data'; const d = h('div', { class: 'error' }); d.innerHTML = html; $('.load-card', this.loading).append(d); }
  hideLoading() { this.loading.hidden = true; this.hud.hidden = false; }

  // ---------- HUD ----------
  setPlace(street, area, x, z) {
    $('.street', this.hud).textContent = street || 'Off the mapped streets';
    $('.area', this.hud).textContent = area || '';
    const o = this.app.frame.toOSGB(x, z); $('.grid', this.hud).textContent = o.E > 0 && o.N > 0 && o.E < 700000 && o.N < 1300000 ? gridRef(o.E, o.N, 8) : '';
  }
  setMode(text) { $('.mode', this.hud).textContent = text; }
  prompt(text) { const p = $('.prompt', this.hud); if (text) { p.hidden = false; p.innerHTML = text; } else p.hidden = true; }
  toast(text, kind = '') {
    const t = h('div', { class: 'toast ' + kind }, text); $('.toasts', this.hud).append(t);
    setTimeout(() => t.classList.add('out'), 3800); setTimeout(() => t.remove(), 4500);
  }
  fps(text) { const f = $('.fps', this.hud); f.hidden = !this.app.settings.showFps; f.textContent = text; }
  attribution(extra) { (this._attr ||= new Set()).add(extra); $('.extra', this.hud).textContent = [...this._attr].map((a) => ' · ' + a).join(''); }

  drawMinimap(x, z, heading, yaw) {
    const c = this.mini, g = this.miniCtx, W = c.width, H = c.height;
    g.save(); g.clearRect(0, 0, W, H); g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
    const view = { cx: x, cz: z, scale: 1.6, w: W, h: H };
    this.mapR.draw(g, view, { pois: true, discovered: this._discoveredSet() });
    g.translate(W / 2, H / 2); g.rotate(heading == null ? 0 : -heading + Math.PI);
    g.fillStyle = '#b5532c'; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -16); g.lineTo(10, 12); g.lineTo(0, 6); g.lineTo(-10, 12); g.closePath(); g.stroke(); g.fill();
    g.restore();
    // view cone
    g.save(); g.translate(W / 2, H / 2); g.rotate(-yaw); g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 120, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.closePath(); g.fill(); g.restore();
  }
  _discoveredSet() { return new Set(Object.keys(this.app.journal.places)); }

  // ---------- overlays ----------
  toggle(name) { if (this.open === name) this.close(); else this.show(name); }
  show(name) {
    this.close(true);
    this.open = name; this.app.paused = name === 'menu';
    const el = { map: this.mapEl, journal: this.journalEl, menu: this.menuEl, card: this.cardEl }[name];
    el.hidden = false;
    if (name === 'map') { const p = this.app.focusPos(); this.mapView.cx = p.x; this.mapView.cz = p.z; this._landmarkList(); this._resizeMap(); this.drawMap(); }
    if (name === 'journal') this._journalTab(this._jt || 'Objectives');
    if (name === 'menu') this._menuTab(this._mt || 'Settings');
    this.app.input.enabled = name === 'card';
    this.app.audio.click();
  }
  close(silent = false) {
    for (const el of [this.mapEl, this.journalEl, this.menuEl, this.cardEl]) el.hidden = true;
    this.open = null; this.app.paused = false; this.app.input.enabled = true;
    if (!silent) this.app.audio.click();
  }

  // ---------- map ----------
  _resizeMap() { const c = $('.mapcanvas', this.mapEl); const r = c.getBoundingClientRect(); c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio; this.mapView.w = c.width; this.mapView.h = c.height; }
  drawMap() {
    if (this.open !== 'map') return;
    const c = $('.mapcanvas', this.mapEl), g = c.getContext('2d'), v = this.mapView;
    this.mapR.draw(g, v, { labels: true, pois: true, allPois: true, discovered: this._discoveredSet() });
    const p = this.app.focusPos(); const [sx, sy] = this.mapR.toScreen(v, p.x, p.z);
    g.save(); g.translate(sx, sy); g.rotate(-(this.app.focusHeading()) + Math.PI);
    g.fillStyle = '#b5532c'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.stroke(); g.fill(); g.restore();
    if (this.mapTarget) { const [tx, ty] = this.mapR.toScreen(v, this.mapTarget.x, this.mapTarget.z); g.strokeStyle = '#1f2a33'; g.lineWidth = 3; g.beginPath(); g.arc(tx, ty, 10, 0, Math.PI * 2); g.moveTo(tx - 16, ty); g.lineTo(tx + 16, ty); g.moveTo(tx, ty - 16); g.lineTo(tx, ty + 16); g.stroke(); }
    // scale bar
    const m = 100 * Math.pow(10, Math.floor(Math.log10(Math.max(1, 160 / v.scale / 100)))); const px = m * v.scale;
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(16, v.h - 40, px + 16, 26); g.fillStyle = '#222'; g.fillRect(24, v.h - 22, px, 3);
    g.font = `${12 * devicePixelRatio}px system-ui`; g.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', 24, v.h - 26);
  }
  _mapEvents() {
    const c = $('.mapcanvas', this.mapEl); let drag = null, moved = false;
    c.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: this.mapView.cx, cz: this.mapView.cz }; moved = false; });
    addEventListener('mousemove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 4) moved = true; this.mapView.cx = drag.cx - dx * devicePixelRatio / this.mapView.scale; this.mapView.cz = drag.cz - dy * devicePixelRatio / this.mapView.scale; this.drawMap(); });
    addEventListener('mouseup', (e) => {
      if (drag && !moved && this.open === 'map') {
        const r = c.getBoundingClientRect(); const [x, z] = this.mapR.toWorld(this.mapView, (e.clientX - r.left) * devicePixelRatio, (e.clientY - r.top) * devicePixelRatio);
        const road = this.app.world.nearestRoad(x, z, 80);
        this.mapTarget = { x, z, label: road?.road.name || 'Selected point' }; this._showDest(); this.drawMap();
      }
      drag = null;
    });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.mapView.scale = Math.min(8, Math.max(0.08, this.mapView.scale * (e.deltaY > 0 ? 0.85 : 1.18))); this.drawMap(); }, { passive: false });
    addEventListener('resize', () => { if (this.open === 'map') { this._resizeMap(); this.drawMap(); } });
  }
  _showDest() { const d = $('.dest', this.mapEl); d.hidden = !this.mapTarget; if (this.mapTarget) $('.dname', d).textContent = this.mapTarget.label; }
  _travel() { if (!this.mapTarget) return; const t = this.mapTarget; this.close(); this.app.travelTo(t.x, t.z); this.mapTarget = null; this._showDest(); }
  _centreOnPlayer() { const p = this.app.focusPos(); this.mapView.cx = p.x; this.mapView.cz = p.z; this.drawMap(); }
  _landmarkList() {
    const ul = $('.lm', this.mapEl); ul.innerHTML = '';
    const seen = new Set();
    const items = [...this.app.world.pois.values()].filter((p) => p.landmark && !seen.has(p.landmark) && seen.add(p.landmark));
    if (!items.length) ul.append(h('li', { class: 'muted' }, 'No named landmarks in the loaded tiles yet.'));
    for (const p of items) {
      const lm = LANDMARKS.find((l) => l.id === p.landmark);
      ul.append(h('li', {}, h('span', {}, lm.title), h('button', { onclick: () => { this.mapTarget = { x: p.x, z: p.z, label: lm.title }; this.mapView.cx = p.x; this.mapView.cz = p.z; this.mapView.scale = Math.max(this.mapView.scale, 1.5); this._showDest(); this.drawMap(); } }, 'Show')));
    }
  }

  // ---------- landmark card ----------
  showCard(poi, landmark) {
    const el = $('.card', this.cardEl); el.innerHTML = '';
    const link = osmLink(poi.id);
    const pos = this.app.frame.toLatLon(poi.x, poi.z); const o = this.app.frame.toOSGB(poi.x, poi.z);
    const inGB = o.E > 0 && o.N > 0 && o.E < 700000 && o.N < 1300000;
    el.append(...[
      h('header', {}, h('div', {}, h('div', { class: 'kicker' }, landmark?.area || poi.kind), h('h2', {}, landmark?.title || poi.name)), h('button', { class: 'x', onclick: () => this.close() }, '×')),
      ...(landmark?.facts || []).map((f) => h('p', { class: 'fact' }, f.text, ' ', h('a', { href: f.source, target: '_blank', rel: 'noopener', class: 'src' }, 'source'))),
      landmark && !landmark.facts.length ? h('p', { class: 'muted' }, 'No verified history has been added for this place yet.') : null,
      !landmark ? h('p', { class: 'muted' }, `Mapped as “${poi.kind}” in OpenStreetMap.`) : null,
      h('dl', { class: 'meta' },
        h('dt', {}, 'Position'), h('dd', {}, `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}${inGB ? ' · ' + gridRef(o.E, o.N, 10) : ''}`),
        h('dt', {}, 'Geometry'), h('dd', {}, link ? h('a', { href: link, target: '_blank', rel: 'noopener' }, 'OpenStreetMap ' + link.split('/').slice(-2).join(' ')) : 'OpenStreetMap')),
    ].filter(Boolean));
    this.show('card');
  }

  // ---------- journal ----------
  _journalTab(tab) {
    this._jt = tab; const J = this.app.journal; const page = $('.page', this.journalEl);
    for (const b of this.journalEl.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    page.innerHTML = '';
    if (tab === 'Objectives') {
      const goals = this.app.objectives();
      page.append(h('p', { class: 'muted' }, 'Game objectives, not history. They are generated from places that exist in the map data you have loaded.'));
      page.append(h('ul', { class: 'goals' }, ...goals.map((g) => h('li', { class: g.done ? 'done' : '' }, h('span', { class: 'tick' }, g.done ? '✓' : '○'), g.title))));
      if (!goals.length) page.append(h('p', {}, 'Explore to reveal objectives.'));
    } else if (tab === 'Places') {
      const ps = Object.entries(J.places).sort((a, b) => b[1].at - a[1].at);
      page.append(h('p', { class: 'muted' }, `${ps.length} places discovered.`), h('ul', { class: 'places' }, ...ps.map(([id, p]) => h('li', {}, h('strong', {}, p.name), h('span', { class: 'muted' }, ' · ' + (p.kind || ''))))));
      const st = Object.keys(J.streets); page.append(h('h3', {}, `Streets walked (${st.length})`), h('p', { class: 'streets' }, st.sort().join(' · ') || '—'));
    } else if (tab === 'History') {
      const fs = Object.values(J.facts);
      page.append(h('p', { class: 'muted' }, 'Documented history, unlocked by visiting landmarks. Every entry links to its source.'));
      for (const f of fs) page.append(h('div', { class: 'fact' }, h('strong', {}, f.title), h('p', {}, f.text, ' ', h('a', { href: f.source, target: '_blank', rel: 'noopener' }, 'source'))));
      if (!fs.length) page.append(h('p', {}, 'Nothing yet – visit a landmark and press E.'));
    } else if (tab === 'People') {
      page.append(h('p', {}, 'No characters yet. This prototype contains no invented people; any future dialogue will be clearly labelled as fiction.'));
    } else if (tab === 'Objects') {
      page.append(h('p', {}, 'No collectable objects in this prototype.'));
    } else {
      const total = new Set([...this.app.world.pois.values()].filter((p) => p.landmark).map((p) => p.landmark)).size;
      const found = Object.keys(J.places).filter((k) => LANDMARKS.some((l) => l.id === k)).length;
      page.append(h('dl', { class: 'meta' },
        h('dt', {}, 'Landmarks visited'), h('dd', {}, `${found} of ${total} in loaded area`),
        h('dt', {}, 'Distance on foot'), h('dd', {}, `${(J.distance / 1000).toFixed(2)} km`),
        h('dt', {}, 'Car journeys'), h('dd', {}, String(J.drives)),
        h('dt', {}, 'Streets walked'), h('dd', {}, String(Object.keys(J.streets).length))),
        h('button', { class: 'ghost', onclick: () => { if (confirm('Clear all journal progress?')) { J.reset(); this._journalTab('Progress'); } } }, 'Reset progress'));
    }
  }

  // ---------- menu ----------
  _menuTab(tab) {
    this._mt = tab; const page = $('.page', this.menuEl); page.innerHTML = '';
    for (const b of this.menuEl.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    const s = this.app.settings;
    const slider = (key, label, min, max, step, fmt = (v) => Math.round(v * 100) + '%', onchange) => {
      const out = h('output', {}, fmt(s[key]));
      const inp = h('input', { type: 'range', min, max, step, value: s[key], oninput: (e) => { s[key] = +e.target.value; out.textContent = fmt(s[key]); (onchange || (() => this.app.applySettings()))(); } });
      return h('label', { class: 'row' }, h('span', {}, label), inp, out);
    };
    const check = (key, label, note) => h('label', { class: 'row check' }, h('input', { type: 'checkbox', ...(s[key] ? { checked: '' } : {}), onchange: (e) => { s[key] = e.target.checked; this.app.applySettings(true); } }), h('span', {}, label, note ? h('small', {}, note) : null));
    if (tab === 'Settings') {
      const sel = h('select', { onchange: (e) => { s.shadows = e.target.value; this.app.applySettings(); } }, ...['off', 'low', 'medium', 'high'].map((q) => h('option', { value: q, ...(s.shadows === q ? { selected: '' } : {}) }, q)));
      page.append(h('h3', {}, 'Sound'),
        slider('masterVolume', 'Master', 0, 1, 0.05), slider('ambienceVolume', 'Sea & wind', 0, 1, 0.05), slider('effectsVolume', 'Effects', 0, 1, 0.05),
        h('h3', {}, 'Graphics'), h('label', { class: 'row' }, h('span', {}, 'Shadows'), sel),
        slider('viewDistance', 'View distance', 400, 3000, 100, (v) => `${(v / 1000).toFixed(1)} km`),
        slider('timeOfDay', 'Time of day', 5, 21, 0.25, (v) => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`),
        check('showFps', 'Show frame rate'),
        h('h3', {}, 'Procedural detail (not from map data)'),
        check('proceduralTrees', 'Fill mapped woods & parks with trees', 'Only where OSM has no individually mapped trees.'),
        check('gardenTrees', 'Garden trees in residential areas', 'Invented positions – off by default.'),
        check('proceduralLamps', 'Street lamps where none are mapped', 'Regular spacing, not real positions.'));
    } else if (tab === 'Controls') {
      page.append(h('div', { class: 'keys big' }, ...[['W A S D / arrows', 'Walk, or drive when in a car'], ['Shift', 'Run'], ['Space', 'Jump / handbrake'], ['Mouse drag', 'Look around (left or right button)'], ['Scroll', 'Zoom camera'], ['E', 'Inspect landmark · get in or out of the car'], ['V', 'Cycle view: third person → first person → overview'], ['M', 'Map (click to travel)'], ['J', 'Pocketbook / journal'], ['Esc', 'Pause menu']].map(([k, v]) => h('div', {}, h('kbd', {}, k), h('span', {}, v)))));
    } else if (tab === 'Data') {
      const q = this.app.world.qualityReport(); const T = q.totals;
      const pct = (a) => (T.buildings ? Math.round((100 * (a || 0)) / T.buildings) + '%' : '–');
      page.append(
        h('p', {}, 'Everything you can walk into was built from these sources. Where the data says nothing, the game estimates – the numbers below show how much.'),
        h('dl', { class: 'meta' },
          h('dt', {}, 'Tiles loaded'), h('dd', {}, `${q.tiles.length} (${[...new Set(q.tiles.map((t) => t.source).filter(Boolean))].join(', ') || '—'})`),
          h('dt', {}, 'OSM data timestamp'), h('dd', {}, [...new Set(q.tiles.map((t) => t.osmBase).filter(Boolean))].join(', ') || 'not reported'),
          h('dt', {}, 'Roads / named'), h('dd', {}, `${T.roads || 0} / ${T.namedRoads || 0}`),
          h('dt', {}, 'Road widths from OSM tags'), h('dd', {}, `${T.roadWidthFromOsm || 0} of ${T.roads || 0} (others use UK class defaults)`),
          h('dt', {}, 'Building footprints'), h('dd', {}, `${T.buildings || 0} (${this.app.fixture ? 'SYNTHETIC test fixture – not real geography' : 'positions and shapes from OSM'})`),
          h('dt', {}, 'Height from OSM height tag'), h('dd', {}, pct(T.heightFromOsmHeight)),
          h('dt', {}, 'Height from OSM levels'), h('dd', {}, pct(T.heightFromOsmLevels)),
          h('dt', {}, 'Height from LiDAR'), h('dd', {}, pct(T.heightFromLidar)),
          h('dt', {}, 'Height estimated'), h('dd', {}, pct(T.heightEstimated)),
          h('dt', {}, 'Roof shape from OSM'), h('dd', {}, pct(T.roofShapeFromOsm)),
          h('dt', {}, 'Facade material from OSM'), h('dd', {}, pct(T.materialFromOsm)),
          h('dt', {}, 'Shop signs'), h('dd', {}, `${T.shopSigns || 0}: names from OSM${T.shopSignsCorrectedOrAdded ? `, ${T.shopSignsCorrectedOrAdded} corrected or added from 2024–26 records` : ''}; fascia colours researched for ${T.shopSignsResearchedStyle || 0} chains, generated for ${T.shopSignsGeneratedStyle || 0} others. No logos.`),
          h('dt', {}, 'Terrain'), h('dd', {}, this.app.terrain.hasTerrain ? `Environment Agency LiDAR DTM (${this.app.terrain.meta?.source || 'local file'})` : 'Flat – no LiDAR terrain file found (see docs/setup.md)'),
          h('dt', {}, 'Coordinate frame'), h('dd', {}, `ETRS89 → National Grid TM, origin ${this.app.frame.originLat}, ${this.app.frame.originLon}; OSGB shift ${this.app.frame.osgbShift.source}`)),
        h('h3', {}, 'Licences'),
        h('p', { class: 'fine' }, 'Map data © OpenStreetMap contributors, ODbL 1.0. ', this.app.terrain.hasTerrain ? '© Environment Agency copyright and/or database right. All rights reserved. Open Government Licence v3.0. ' : '', 'All textures, models and sounds are generated in code for this project.'));
    } else {
      page.append(h('p', {}, 'This is a geographic prototype, not a survey-grade model. Street layout, building footprints and positions come from OpenStreetMap. Building heights, roof forms, facade materials, pavements and some trees are estimated where the data is incomplete, and the Data tab shows how much of each.'),
        h('p', {}, 'Inspired by the ambition of “Echoes of Sherborne” by Bradley Gunn; no code, writing or assets from it are used.'));
    }
  }
}
