// Stylised 3D people: one rig for the player's avatar and every resident, so they all share the
// art style, animation and progression outfits. Slightly big heads, rounded limbs, simple readable
// faces with expressions. All parameters are cosmetic.

import * as THREE from 'three';

export const SKIN = [0xf6d7c3, 0xeec1a0, 0xd9a07a, 0xb97b55, 0x8d5a3b, 0x5e3a26, 0x3f271a];
export const HAIR_COLOURS = [0x1b1714, 0x3b2a1e, 0x6b4a2f, 0xa4703d, 0xd9b26f, 0xb9472c, 0x8e8e8e, 0xe6e1d7, 0x0e7c7b, 0xd8577d];
export const HAIR = ['crop', 'short', 'quiff', 'bob', 'long', 'bun', 'ponytail', 'curly', 'afro', 'buzz', 'bald'];
export const CAMPAIGN = { teal: 0x0e7c7b, coral: 0xef6a56, gold: 0xf2b632, navy: 0x24395c, purple: 0x7a5c99, green: 0x2e8a57 };
export const BODIES = { a: { shoulders: 1.08, hips: 0.94, chest: 0 }, b: { shoulders: 0.92, hips: 1.06, chest: 1 }, c: { shoulders: 1.0, hips: 1.0, chest: 0 } };

const cache = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.8, metalness: o.m ?? 0, map: o.map || null })); return cache.get(k); };
function stripes(a, b) { const k = 'stripe' + a + b; if (!cache.has(k)) { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#' + a.toString(16).padStart(6, '0'); g.fillRect(0, 0, 8, 64); g.fillStyle = '#' + b.toString(16).padStart(6, '0'); for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 8, 7); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); t.colorSpace = THREE.SRGBColorSpace; cache.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); } return cache.get(k); }
const cap = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m);
const sph = (r, m, ws = 14, hs = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m);
const boxm = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

/** The default look: Sam Shingle, the game's cover star (see the character brief). */
export const DEFAULT_LOOK = { body: 'c', height: 1, build: 1, skin: 2, hair: 'quiff', hairColour: 2, facial: 'none', eyes: 0x3b2a1e, glasses: false,
  top: 'breton', topColour: 0x24395c, outer: 'raincoat', outerColour: 0xe2a72e, legs: 'jeans', legsColour: 0x3a4f6b, shoes: 0xf4f2ee, bag: true, campaign: 'teal', hat: null };

/** Outfit for each stage of the race (rank index 0–5), keeping the player's own choices of body, face and hair. */
export function stageLook(look, stage) {
  const c = CAMPAIGN[look.campaign] || CAMPAIGN.teal, L = { ...look };
  if (stage <= 0) Object.assign(L, { rosette: 0, badge: 'card' });
  if (stage === 1) Object.assign(L, { rosette: 1, pins: 3, clipboard: true });
  if (stage === 2) Object.assign(L, { rosette: 1, pins: 5, scarf: c, outer: look.outer === 'raincoat' ? 'raincoat' : look.outer });
  if (stage === 3) Object.assign(L, { rosette: 2, pins: 6, scarf: c, outer: 'peacoat', outerColour: 0x24395c, shoesPolish: true });
  if (stage === 4) Object.assign(L, { rosette: 2, outer: 'blazer', outerColour: c, tie: 0xf2b632, sash: { colour: c, text: 'CANDIDATE' } });
  if (stage >= 5) Object.assign(L, { rosette: 3, outer: 'frock', outerColour: 0x1d2c48, tie: 0xf2b632, sash: { colour: c, text: 'MAYOR' }, chain: true });
  return L;
}

export function buildHumanoid(look = DEFAULT_LOOK) {
  const B = BODIES[look.body] || BODIES.c, H = look.height || 1, W = look.build || 1;
  const g = new THREE.Group(), root = new THREE.Group(); root.scale.setScalar(H); g.add(root);
  const skin = mat(SKIN[look.skin ?? 2] ?? look.skin), hairM = mat(HAIR_COLOURS[look.hairColour ?? 2] ?? look.hairColour, { r: 0.65 });
  const topM = look.top === 'breton' ? stripes(0xf4f1ea, look.topColour) : mat(look.topColour);
  const outerM = look.outer ? mat(look.outerColour, { r: look.outer === 'raincoat' ? 0.45 : 0.8 }) : null;
  const legM = mat(look.legsColour, { r: 0.9 }), shoeM = mat(look.shoes, { r: look.shoesPolish ? 0.25 : 0.7 });
  const parts = { legs: [], arms: [], forearms: [], root, spine: null, head: null, face: {} };
  // hips + legs
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.1 * s * B.hips, 0.9, 0);
    const thigh = cap(0.082 * W * (B.hips > 1 ? 1.05 : 1), 0.36, legM); thigh.position.y = -0.22; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    const shin = cap(0.068 * W, 0.34, look.legs === 'shorts' ? skin : legM); shin.position.y = -0.2; knee.add(shin);
    if (look.legs === 'jeans' || look.legs === 'trousers') { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.078 * W, 0.078 * W, 0.05, 10), legM); cuff.position.y = -0.36; knee.add(cuff); }
    const foot = boxm(0.11, 0.08, 0.27, shoeM); foot.position.set(0, -0.43, 0.05); knee.add(foot);
    const sole = boxm(0.115, 0.025, 0.28, mat(0xf4f2ee)); sole.position.set(0, -0.475, 0.05); knee.add(sole);
    root.add(hip); parts.legs.push({ hip, knee });
  }
  if (look.legs === 'skirt') { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * B.hips, 0.27 * B.hips, 0.42, 14, 1, true), mat(look.legsColour, { r: 0.85 })); sk.material.side = THREE.DoubleSide; sk.position.y = 0.76; root.add(sk); }
  // spine: torso, arms, head (bends for posture)
  const spine = new THREE.Group(); spine.position.y = 0.92; root.add(spine); parts.spine = spine;
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17 * B.hips * W, 12, 8), legM); pelvis.scale.set(1.05, 0.6, 0.75); pelvis.position.y = 0.0; spine.add(pelvis);
  const torso = cap(0.17 * W, 0.34, topM); torso.scale.set(B.shoulders * 1.18, 1, 0.78); torso.position.y = 0.3; spine.add(torso);
  if (B.chest) { const ch = sph(0.1 * W, topM); ch.scale.set(1.6, 0.7, 0.6); ch.position.set(0, 0.38, 0.085); spine.add(ch); }
  if (outerM) { // coat or jacket over the top, open at the front
    const len = look.outer === 'frock' ? 0.78 : look.outer === 'raincoat' ? 0.66 : look.outer === 'peacoat' ? 0.62 : 0.5;
    for (const s of [-1, 1]) {
      const panel = boxm(0.17 * B.shoulders * W, len, 0.27 * W, outerM); panel.position.set(s * 0.1 * B.shoulders * W, 0.52 - len / 2, -0.005); spine.add(panel);
      const lapel = boxm(0.05, 0.2, 0.02, outerM); lapel.position.set(s * 0.06, 0.5, 0.14 * W); lapel.rotation.z = s * 0.35; spine.add(lapel);
    }
    const back = boxm(0.36 * B.shoulders * W, len, 0.05, outerM); back.position.set(0, 0.52 - len / 2, -0.12 * W); spine.add(back);
    if (look.outer === 'raincoat') { const hood = sph(0.12, outerM); hood.scale.set(1.3, 0.55, 0.8); hood.position.set(0, 0.6, -0.11); spine.add(hood); for (const s of [-1, 1]) { const tog = boxm(0.025, 0.05, 0.02, mat(0x2b2b30)); tog.position.set(s * 0.04, 0.25, 0.145 * W); spine.add(tog); } }
    if (look.outer === 'peacoat' || look.outer === 'frock') for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const b = sph(0.012, mat(0xd8b44a, { m: 0.8, r: 0.3 }), 6, 4); b.position.set(s * 0.055, 0.42 - k * 0.1, 0.15 * W); spine.add(b); }
  }
  if (look.tie) { const tie = boxm(0.045, 0.24, 0.01, mat(look.tie)); tie.position.set(0, 0.36, 0.142 * W); spine.add(tie); }
  if (look.scarf) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), mat(look.scarf)); sc.rotation.x = Math.PI / 2; sc.position.y = 0.53; spine.add(sc); const tail = boxm(0.06, 0.22, 0.03, mat(look.scarf)); tail.position.set(0.06, 0.4, 0.13); spine.add(tail); }
  if (look.sash) { // diagonal campaign sash with its word
    const c = document.createElement('canvas'); c.width = 256; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#' + look.sash.colour.toString(16).padStart(6, '0'); x.fillRect(0, 0, 256, 40); x.fillStyle = '#f2b632'; x.fillRect(0, 0, 256, 4); x.fillRect(0, 36, 256, 4); x.fillStyle = '#fff'; x.font = '900 24px Arial'; x.textAlign = 'center'; x.fillText(look.sash.text, 128, 29);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sash = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.075), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
    sash.position.set(0, 0.32, 0.152 * W); sash.rotation.z = -0.78; spine.add(sash);
  }
  if (look.rosette != null) { // the campaign badge: a hand-drawn card at first, then ever bigger rosettes
    const col = CAMPAIGN[look.campaign] || CAMPAIGN.teal;
    if (look.rosette === 0) { const card = boxm(0.07, 0.07, 0.01, mat(0xf4ecd8)); card.position.set(0.09, 0.44, 0.15 * W); card.rotation.z = 0.15; spine.add(card); }
    else { const r = 0.03 + look.rosette * 0.015; const ro = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 16), mat(col)); ro.rotation.x = Math.PI / 2; ro.position.set(0.1, 0.44, 0.155 * W); spine.add(ro); const ctr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.016, 12), mat(0xf2b632)); ctr.rotation.x = Math.PI / 2; ctr.position.set(0.1, 0.44, 0.16 * W); spine.add(ctr); for (const s of [-1, 1]) { const rb = boxm(0.018, 0.06 + look.rosette * 0.015, 0.006, mat(col)); rb.position.set(0.1 + s * 0.012, 0.44 - r - 0.02, 0.156 * W); rb.rotation.z = s * 0.25; spine.add(rb); } }
    for (let k = 0; k < (look.pins || 0); k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8), mat([0xef6a56, 0xf2b632, 0x0e7c7b, 0x4b6cb7, 0x2e8a57, 0xffffff][k % 6], { m: 0.4, r: 0.4 })); p.rotation.x = Math.PI / 2; p.position.set(-0.07 - (k % 3) * 0.028, 0.47 - Math.floor(k / 3) * 0.03, 0.152 * W); spine.add(p); }
  }
  if (look.chain) { // "the Shingle Chain": a game-made chain of scallop-shell links with a golden gull medallion (not civic insignia)
    const gold = mat(0xe0b23a, { m: 0.85, r: 0.28 });
    for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.12 + (k / 10) * Math.PI * 0.76; const link = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, k % 2 ? 6 : 10), k % 2 ? mat(0xf4f1ea, { r: 0.4 }) : gold); link.rotation.x = Math.PI / 2; link.position.set(Math.cos(a) * 0.16 * B.shoulders, 0.5 - Math.sin(a) * 0.17, 0.12 + Math.sin(a) * 0.035); spine.add(link); }
    const med = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 18), gold); med.rotation.x = Math.PI / 2; med.position.set(0, 0.3, 0.16); spine.add(med);
    const gull = boxm(0.05, 0.008, 0.004, mat(0x1d2c48)); gull.position.set(0, 0.3, 0.167); spine.add(gull);
  }
  if (look.bag) { // canvas tote worn across the back, strap over the right shoulder, gull badge on the flap
    const canvasM = mat(0xe9dfc8, { r: 0.95 }); const bag = boxm(0.28, 0.3, 0.07, canvasM); bag.position.set(-0.1, 0.1, -0.2 * W); bag.rotation.z = 0.15; spine.add(bag);
    const strap = boxm(0.03, 0.62, 0.015, canvasM); strap.position.set(0.0, 0.32, 0.148 * W); strap.rotation.z = -0.62; spine.add(strap);
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 12), mat(0xffdb00)); badge.rotation.x = Math.PI / 2; badge.position.set(-0.1, 0.12, -0.24 * W); spine.add(badge); }
  // arms
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.24 * s * B.shoulders * W, 0.48, 0);
    const up = cap(0.06 * W, 0.24, outerM || topM); up.position.y = -0.15; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    const fore = cap(0.052 * W, 0.22, outerM || (look.top === 'tee' ? skin : topM)); fore.position.y = -0.13; el.add(fore);
    const hand = sph(0.05, skin, 10, 8); hand.position.y = -0.28; el.add(hand);
    spine.add(sh); parts.arms.push(sh); parts.forearms.push(el);
  }
  if (look.clipboard) { const cb = boxm(0.18, 0.24, 0.015, mat(0x8a6a45)); cb.position.set(0, -0.3, 0.06); cb.rotation.x = -0.6; parts.forearms[0].add(cb); const paper = boxm(0.16, 0.2, 0.004, mat(0xffffff)); paper.position.set(0, -0.3, 0.07); paper.rotation.x = -0.6; parts.forearms[0].add(paper); }
  // head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 10), skin); neck.position.y = 0.58; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.73; spine.add(head); parts.head = head;
  const skull = sph(0.145, skin, 18, 14); skull.scale.set(0.95, 1.05, 1); head.add(skull);
  for (const s of [-1, 1]) { const ear = sph(0.032, skin, 8, 6); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.138, 0, -0.005); head.add(ear); }
  const nose = sph(0.026, skin, 8, 6); nose.scale.set(0.9, 1, 1.2); nose.position.set(0, -0.01, 0.143); head.add(nose);
  const F = parts.face;
  F.eyes = []; F.lids = []; F.brows = [];
  for (const s of [-1, 1]) {
    const white = sph(0.03, mat(0xffffff, { r: 0.3 }), 10, 8); white.scale.set(1, 1.1, 0.5); white.position.set(s * 0.052, 0.025, 0.128); head.add(white);
    const pupil = sph(0.017, mat(look.eyes || 0x3b2a1e, { r: 0.2 }), 8, 6); pupil.position.set(s * 0.052, 0.024, 0.142); head.add(pupil); F.eyes.push(pupil);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.set(s * 0.052, 0.025, 0.128); lid.scale.set(1, 0.2, 0.55); head.add(lid); F.lids.push(lid);
    const brow = boxm(0.05, 0.011, 0.01, hairM); brow.position.set(s * 0.054, 0.068, 0.137); head.add(brow); F.brows.push(brow);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 14, Math.PI), mat(0x7a3b33, { r: 0.5 })); mouth.position.set(0, -0.06, 0.133); head.add(mouth); F.mouth = mouth;
  const blush = []; for (const s of [-1, 1]) { const b = sph(0.022, new THREE.MeshStandardMaterial({ color: 0xe8706a, transparent: true, opacity: 0, roughness: 0.9 }), 8, 6); b.scale.set(1.2, 0.7, 0.3); b.position.set(s * 0.085, -0.03, 0.118); head.add(b); blush.push(b); } F.blush = blush;
  if (look.glasses) { const fr = mat(0x1b1714, { r: 0.4 }); for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16), fr); rim.position.set(s * 0.052, 0.025, 0.15); head.add(rim); } const br = boxm(0.03, 0.006, 0.006, fr); br.position.set(0, 0.03, 0.152); head.add(br); }
  if (look.facial === 'beard' || look.facial === 'stubble') { const bd = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.4), look.facial === 'beard' ? hairM : new THREE.MeshStandardMaterial({ color: HAIR_COLOURS[look.hairColour ?? 1], transparent: true, opacity: 0.35 })); bd.scale.set(0.98, 1.1, 1.05); head.add(bd); }
  if (look.facial === 'moustache') { const m = boxm(0.07, 0.016, 0.02, hairM); m.position.set(0, -0.037, 0.142); head.add(m); }
  buildHair(head, look.hair, hairM);
  if (look.hat === 'bucket') { const hm = mat(0xf2b632, { r: 0.8 }); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 16), hm); c.position.y = 0.13; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.015, 20), hm); b.position.y = 0.09; head.add(c, b); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const api = { group: g, parts, look, expression: 'neutral', posture: 'upright' };
  api.setExpression = (e) => setExpression(parts, e, api);
  api.setPosture = (p) => { api.posture = p; };
  api.setExpression('neutral');
  return api;
}

function buildHair(head, style, m) {
  const add = (mesh, x, y, z, sx = 1, sy = 1, sz = 1) => { mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); head.add(mesh); return mesh; };
  const capTop = (r = 0.152, phi = 0.48) => new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI * phi), m);
  switch (style) {
    case 'bald': return;
    case 'buzz': add(capTop(0.149, 0.45), 0, 0.012, -0.004); return;
    case 'crop': add(capTop(0.153, 0.42), 0, 0.02, -0.01); return;
    case 'short': add(capTop(0.155, 0.5), 0, 0.015, -0.01); add(sph(0.09, m), 0, -0.02, -0.08, 1.4, 1, 0.8); return;
    case 'quiff': add(capTop(0.154, 0.46), 0, 0.02, -0.01); add(sph(0.07, m), 0, 0.13, 0.07, 1.4, 0.7, 1); add(sph(0.08, m), 0, -0.01, -0.085, 1.5, 1.1, 0.8); return;
    case 'bob': add(capTop(0.158, 0.55), 0, 0.012, -0.005); add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.165, 0.16, 18, 1, true, Math.PI * 0.32, Math.PI * 1.36), m), 0, -0.05, -0.005).material.side = THREE.DoubleSide; return;
    case 'long': add(capTop(0.158, 0.55), 0, 0.012, -0.005); add(boxm(0.27, 0.36, 0.08, m), 0, -0.13, -0.09); return;
    case 'bun': add(capTop(0.155, 0.5), 0, 0.012, -0.01); add(sph(0.06, m), 0, 0.12, -0.1); return;
    case 'ponytail': add(capTop(0.155, 0.5), 0, 0.012, -0.01); add(cap(0.04, 0.2, m), 0, -0.05, -0.17); return;
    case 'curly': add(capTop(0.158, 0.52), 0, 0.012, -0.01); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; add(sph(0.045, m, 8, 6), Math.cos(a) * 0.12, 0.08 + (k % 2) * 0.03, Math.sin(a) * 0.12 - 0.02); } return;
    case 'afro': add(sph(0.2, m, 16, 12), 0, 0.07, -0.03, 1.05, 0.95, 1); return;
    default: add(capTop(), 0, 0.015, -0.01);
  }
}

/** Faces: confident, happy, embarrassed, suspicious, disappointed, neutral. */
export const EXPRESSIONS = ['neutral', 'happy', 'confident', 'embarrassed', 'suspicious', 'disappointed'];
function setExpression(P, e, api) {
  const F = P.face; api.expression = e;
  const set = (browY, browTilt, mouthFlip, mouthScale, lid, blush, look = 0) => {
    F.brows.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = 0.068 + browY; b.rotation.z = s * browTilt; });
    F.mouth.rotation.z = mouthFlip ? 0 : Math.PI; F.mouth.scale.set(mouthScale[0], mouthScale[1], 1); F.mouth.position.y = mouthFlip ? -0.07 : -0.05;
    F.lids.forEach((l) => { l.scale.y = lid; }); F.blush.forEach((b) => { b.material.opacity = blush; });
    F.eyes.forEach((p, i) => { p.position.x = (i ? 1 : -1) * 0.052 + look; });
  };
  // mouth torus: rotation 0 = arc on top (frown), PI = arc below (smile)
  if (e === 'happy') set(0.006, 0.1, false, [1.1, 1.2], 0.15, 0);
  else if (e === 'confident') set(-0.004, -0.18, false, [0.9, 0.55], 0.45, 0);
  else if (e === 'embarrassed') set(0.008, 0.28, false, [0.55, 0.45], 0.55, 0.85, 0.01);
  else if (e === 'suspicious') { set(-0.008, -0.12, true, [0.55, 0.25], 0.85, 0, 0.012); F.brows[1].position.y += 0.012; }
  else if (e === 'disappointed') set(0.0, 0.32, true, [0.8, 0.7], 0.6, 0);
  else set(0, 0, false, [0.75, 0.35], 0.25, 0);
}

/** Walk/idle animation shared by everyone. speed in m/s; posture slouch for low reputation. */
export function animateHumanoid(api, phase, speed, dt, opts = {}) {
  const P = api.parts, sw = Math.sin(phase) * Math.min(0.75, speed * 0.22);
  const slouch = api.posture === 'slouch' ? 1 : 0, proud = api.posture === 'proud' ? 1 : 0;
  P.legs[0].hip.rotation.x = sw; P.legs[1].hip.rotation.x = -sw;
  P.legs[0].knee.rotation.x = Math.max(0, -sw) * 0.9; P.legs[1].knee.rotation.x = Math.max(0, sw) * 0.9;
  const t = performance.now() / 1000, idle = speed < 0.15;
  P.arms[0].rotation.x = -sw * 0.8 + (idle ? Math.sin(t * 1.3) * 0.03 : 0); P.arms[1].rotation.x = sw * 0.8;
  P.arms[0].rotation.z = -0.08 - slouch * 0.05; P.arms[1].rotation.z = 0.08 + slouch * 0.05;
  P.forearms.forEach((f, i) => { f.rotation.x = -0.25 - (i === 0 ? Math.abs(sw) * 0.3 : Math.abs(sw) * 0.3); });
  if (opts.wave) { P.arms[1].rotation.z = 2.6; P.arms[1].rotation.x = 0; P.forearms[1].rotation.z = 0.4 * Math.sin(t * 9); }
  if (opts.talk) P.forearms[0].rotation.x = -0.9 + Math.sin(t * 4) * 0.25;
  P.spine.rotation.x = slouch * 0.18 - proud * 0.05 + (idle ? Math.sin(t * 1.6) * 0.012 : 0);
  P.head.rotation.x = slouch * 0.22 - proud * 0.08; P.head.rotation.y = opts.lookYaw || 0;
  P.root.position.y = Math.abs(Math.cos(phase)) * Math.min(0.04, speed * 0.01);
}
