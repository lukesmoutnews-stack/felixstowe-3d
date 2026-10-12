// Character selection and the appearance editor, with a live 3D preview.
// Male, Female and Other/Customise are starting points only: every option is open to every
// character, and the choice never changes abilities, reputation, missions or the chance of winning.

import * as THREE from 'three';
import { buildHumanoid, animateHumanoid, stageLook, DEFAULT_LOOK, SKIN, HAIR, HAIR_COLOURS, CAMPAIGN, EXPRESSIONS } from '../play/people/humanoid.js';
import { escapeHtml as esc, icon } from './art.js';

export const PRESETS = {
  male: { label: 'Male', pronouns: 'he', look: { ...DEFAULT_LOOK, body: 'a', hair: 'quiff', hairColour: 2, skin: 2, facial: 'none' } },
  female: { label: 'Female', pronouns: 'she', look: { ...DEFAULT_LOOK, body: 'b', hair: 'bob', hairColour: 1, skin: 3, height: 0.97 } },
  other: { label: 'Other / Customise', pronouns: 'they', look: { ...DEFAULT_LOOK, body: 'c', hair: 'curly', hairColour: 0, skin: 4, height: 0.99 } },
};
const OPTS = {
  body: [['a', 'Broader shoulders'], ['c', 'Straight'], ['b', 'Curvier']],
  hair: HAIR.map((h) => [h, h[0].toUpperCase() + h.slice(1)]),
  facial: [['none', 'None'], ['stubble', 'Stubble'], ['beard', 'Beard'], ['moustache', 'Moustache']],
  legs: [['jeans', 'Jeans'], ['trousers', 'Trousers'], ['skirt', 'Skirt'], ['shorts', 'Shorts']],
  outer: [['raincoat', 'Rain jacket'], ['peacoat', 'Pea coat'], [null, 'No jacket']],
  pronouns: [['they', 'They'], ['she', 'She'], ['he', 'He']],
};
const COLOURWAYS = { outerColour: [0xe2a72e, 0xef6a56, 0x0e7c7b, 0x24395c, 0x2e8a57, 0x7a5c99], topColour: [0x24395c, 0xb3262b, 0x0e7c7b, 0x2b2d31], legsColour: [0x3a4f6b, 0x2b2b30, 0x6b5b45, 0xc8bfa8] };

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

/** One renderer: the three starting characters side by side, or a single character in the editor. */
export class Preview {
  constructor(canvas, mode = 'select') {
    this.canvas = canvas; this.mode = mode; this.models = []; this.sel = 0; this.t = 0; this.drag = null; this.yaw = 0; this.alive = true;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true;
    const s = this.scene = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xfff6e6, 0x8ab0b8, 1.6)); const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); s.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    canvas.addEventListener('pointerdown', (e) => { this.drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (this.drag != null) { this.yaw += (e.clientX - this.drag) * 0.012; this.drag = e.clientX; } });
    canvas.addEventListener('pointerup', () => { this.drag = null; });
    const loop = () => { if (!this.alive) return; this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  setLooks(looks, sel = 0) { for (const m of this.models) this.scene.remove(m.group); this.models = looks.map((l) => buildHumanoid(l)); this.models.forEach((m) => this.scene.add(m.group)); this.sel = sel; this.pop = 0; }
  select(i) { this.sel = i; this.pop = 0; this.waveT = 1.6; }
  frame() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * this.renderer.getPixelRatio())) { this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    const dt = 1 / 60; this.t += dt; this.pop = Math.min(1, (this.pop || 0) + dt * 2.5); this.waveT = Math.max(0, (this.waveT || 0) - dt);
    const n = this.models.length;
    this.models.forEach((m, i) => {
      const sel = i === this.sel, x = this.mode === 'select' ? (i - (n - 1) / 2) * 0.95 : 0;
      const target = { x, z: sel && this.mode === 'select' ? 0.45 : 0, s: sel ? 1 : 0.9 };
      m.group.position.x += (target.x - m.group.position.x) * 0.15; m.group.position.z += (target.z - m.group.position.z) * 0.15;
      const sc = m.group.scale.x + (target.s - m.group.scale.x) * 0.15; m.group.scale.setScalar(sc);
      m.group.rotation.y = (this.mode === 'select' ? (sel ? Math.sin(this.t * 0.5) * 0.35 : -x * 0.25) : 0) + this.yaw;
      animateHumanoid(m, this.t * 1.2, 0, dt, { wave: sel && this.waveT > 0 });
    });
    const single = this.mode !== 'select';
    this.cam.position.set(0, single ? 1.25 : 1.35, single ? 3.6 : 5.0); this.cam.lookAt(0, single ? 1.0 : 0.95, 0);
    this.renderer.render(this.scene, this.cam);
  }
  dispose() { this.alive = false; this.renderer.dispose(); }
}

/** Onboarding: choose a starting character, customise, name, confirm. */
export function selectScreen(st) {
  const p = PRESETS[st.preset], L = st.look;
  return `<main class="screen onboarding cs">
    <header class="cs-head"><p class="eyebrow">Race to Be Mayor · Felixstowe</p><h1>Who’s running for the Town Hall?</h1><p class="muted">Pick a starting look, then make it yours. Every character has the same abilities, reputation and chances of winning.</p></header>
    <div class="cs-stage"><canvas id="cs-canvas" aria-label="3D preview of your character. Drag to turn."></canvas><p class="cs-hint">Drag to turn</p></div>
    <div class="cs-picks" role="radiogroup" aria-label="Starting character">${Object.entries(PRESETS).map(([k, v]) => `<button role="radio" aria-checked="${k === st.preset}" class="cs-pick ${k === st.preset ? 'on' : ''}" data-act="cs-pick" data-id="${k}">${esc(v.label)}</button>`).join('')}</div>
    ${editor(L, st, true)}
    <form id="onboard" class="card form" novalidate>
      <label for="ob-name">Your name in the game</label>
      <input id="ob-name" name="name" maxlength="20" autocomplete="nickname" placeholder="e.g. Sam Shingle" value="${esc(st.name || '')}" required>
      <p class="err" role="alert"></p>
      <button class="btn primary big" type="submit">${icon('check')}Confirm and start the race</button>
      <button class="btn ghost" type="button" data-act="demo-profile">Skip: use the demo character</button>
    </form>
    <div class="ob-news"><img src="icons/felixstowe-news.png" alt="" width="40" height="40"><span>Your campaign makes the headlines in <b>Felixstowe News</b> (game edition). Real local news: <a href="https://www.felixstowenews.co.uk" target="_blank" rel="noopener">felixstowenews.co.uk</a></span></div>
    <p class="fine">Race to Be Mayor is an independent game. It is not affiliated with or endorsed by Felixstowe Town Council, and it gives no access to the Town Hall. The mayoral title is a fictional game award. You can change your appearance any time from Profile without losing progress.</p>
  </main>`;
}

/** The option panel (used in onboarding and in Profile → Appearance). */
export function editor(L, st, open = false) {
  const chips = (key, list) => `<div class="cs-row"><span>${{ body: 'Body shape', hair: 'Hair', facial: 'Facial hair', legs: 'Legs', outer: 'Jacket', pronouns: 'Pronouns' }[key]}</span><div class="cs-chips">${list.map(([v, l]) => `<button class="chip ${(key === 'pronouns' ? st.pronouns : L[key]) === v ? 'on' : ''}" data-act="cs-opt" data-key="${key}" data-val="${v}">${esc(l)}</button>`).join('')}</div></div>`;
  const swatches = (key, list, label) => `<div class="cs-row"><span>${label}</span><div class="cs-sw">${list.map((c, i) => `<button class="sw ${(key === 'skin' || key === 'hairColour' ? L[key] === i : L[key] === c) ? 'on' : ''}" style="--c:${hex(c)}" data-act="cs-opt" data-key="${key}" data-val="${key === 'skin' || key === 'hairColour' ? i : c}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  return `<details class="card cs-edit" ${open ? 'open' : ''}><summary>${icon('star')}Customise</summary>
    ${chips('body', OPTS.body)}
    <div class="cs-row"><span>Height</span><input type="range" min="0.92" max="1.08" step="0.01" value="${L.height || 1}" data-act-input="height" aria-label="Height"></div>
    ${swatches('skin', SKIN, 'Skin tone')}
    ${chips('hair', OPTS.hair)}${swatches('hairColour', HAIR_COLOURS, 'Hair colour')}
    ${chips('facial', OPTS.facial)}
    <div class="cs-row"><span>Glasses</span><div class="cs-chips"><button class="chip ${L.glasses ? '' : 'on'}" data-act="cs-opt" data-key="glasses" data-val="false">No</button><button class="chip ${L.glasses ? 'on' : ''}" data-act="cs-opt" data-key="glasses" data-val="true">Yes</button></div></div>
    ${chips('outer', OPTS.outer)}${swatches('outerColour', COLOURWAYS.outerColour, 'Jacket colour')}${swatches('topColour', COLOURWAYS.topColour, 'Stripe colour')}
    ${chips('legs', OPTS.legs)}${swatches('legsColour', COLOURWAYS.legsColour, 'Legs colour')}
    <div class="cs-row"><span>Campaign colour</span><div class="cs-sw">${Object.entries(CAMPAIGN).map(([k, c]) => `<button class="sw ${L.campaign === k ? 'on' : ''}" style="--c:${hex(c)}" data-act="cs-opt" data-key="campaign" data-val="${k}" aria-label="${k}"></button>`).join('')}</div></div>
    ${chips('pronouns', OPTS.pronouns)}
    <p class="fine">Everything here is cosmetic and free. Nothing can be bought, and nothing changes how the game treats you.</p></details>`;
}

export function applyOpt(st, key, val) {
  const L = st.look;
  if (key === 'pronouns') { st.pronouns = val; return; }
  if (key === 'skin' || key === 'hairColour') L[key] = Number(val);
  else if (['outerColour', 'topColour', 'legsColour'].includes(key)) L[key] = Number(val);
  else if (key === 'glasses') L.glasses = val === 'true';
  else if (key === 'outer') L.outer = val === 'null' ? null : val;
  else if (key === 'height') L.height = Number(val);
  else L[key] = val;
}

export function appearanceSheet(st, stage) {
  return `<p class="eyebrow">Appearance</p><h2>Change how you look</h2><p class="muted">Your progress, reputation and rank stay exactly as they are. Outfits for your stage of the race are added automatically.</p>
    <div class="cs-stage single"><canvas id="cs-canvas" aria-label="3D preview. Drag to turn."></canvas><div class="cs-faces">${EXPRESSIONS.map((e) => `<button class="chip" data-act="cs-face" data-id="${e}">${e[0].toUpperCase() + e.slice(1)}</button>`).join('')}</div></div>
    ${editor(st.look, st, true)}
    <div class="actions"><button class="btn primary big" data-act="appearance-save">Save my look</button><button class="btn" data-act="close-sheet">Cancel</button></div>`;
}
export { stageLook };
