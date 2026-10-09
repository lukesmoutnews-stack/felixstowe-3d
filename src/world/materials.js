// Shared material registry. Geometry generators reference materials by key so that all
// buildings/roads of a kind across a chunk merge into one draw call.

import * as THREE from 'three';
import { Textures } from './textures.js';

const mats = new Map();
let quality = { anisotropy: 8 };
export function setQuality(q) { quality = { ...quality, ...q }; }

/** Low-frequency world-space tint to break up visible texture repetition on large surfaces. */
function addMacroVariation(material, strength = 0.18, scale = 0.012) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPosMacro;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPosMacro = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWorldPosMacro;
float mhash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mhash(i), mhash(i+vec2(1,0)), f.x), mix(mhash(i+vec2(0,1)), mhash(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 wp = vWorldPosMacro.xz;
  float m = mnoise(wp * ${scale.toFixed(4)}) * 0.6 + mnoise(wp * ${(scale * 4.3).toFixed(4)}) * 0.4;
  diffuseColor.rgb *= 1.0 - ${strength.toFixed(3)} * 0.5 + m * ${strength.toFixed(3)}; }`);
  };
  material.customProgramCacheKey = () => 'macro' + strength + scale;
  return material;
}

function std(key, make) { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); }

const FASCIAS = ['#1f2f4a', '#2f4a36', '#6b1f24', '#1e1e1e', '#e9e6df', '#5b3a5e', '#0f4d57'];
export const FACADE_KINDS = ['brick_red', 'brick_dark', 'brick_yellow', 'render', 'flint', 'stone', 'concrete', 'timber', 'metal', 'glass'];
export const ROOF_KINDS = ['slate', 'clay', 'pantile', 'concrete_tile', 'flat', 'metal'];
export const FASCIA_COUNT = FASCIAS.length;

export function facadeMaterial(kind, windows = true, style = 0) {
  return std(`facade:${kind}:${windows}:${style}`, () => {
    const t = Textures.facadeTexture(kind, windows, kind.length * 7 + (windows ? 1 : 2) + style * 13, style);
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0, vertexColors: true });
    m.normalScale.set(0.9, 0.9);
    if (kind === 'glass') { m.metalness = 0.3; m.roughness = 0.15; m.roughnessMap = null; }
    if (kind === 'metal') { m.metalness = 0.35; }
    return m;
  });
}
export function doorMaterial(i) {
  return std(`door:${i}`, () => { const t = Textures.doorTexture(i); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); });
}
export function rollerMaterial() {
  return std('roller', () => { const t = Textures.rollerDoorTexture(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); });
}
export function shopMaterial(i) {
  return std(`shop:${i}`, () => {
    const t = Textures.shopfrontTexture(FASCIAS[i % FASCIAS.length], 40 + i);
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0.05 });
  });
}
export function roofMaterial(kind) {
  return std(`roof:${kind}`, () => {
    const t = Textures.roofTexture(kind, 5);
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: kind === 'metal' ? 0.4 : 0, vertexColors: true, side: THREE.DoubleSide });
    return m;
  });
}

// Ground overlay layers: drawn after the base ground without writing depth, so coplanar
// surfaces never z-fight; renderOrder alone decides which layer is on top.
export const LAYER = { ground: 0, landuse: 1, landcover: 2, paved: 3, pavement: 4, kerb: 5, path: 6, road: 7, marking: 8, deck: 9 };
const GROUND_TEX = {
  grass: 'grass', park: 'park', pitch: 'park', golf: 'park', cemetery: 'park', farmland: 'soil', wood: 'scrub', scrub: 'scrub', wetland: 'mud', mud: 'mud',
  beach: 'sand', shingle: 'shingle', parking: 'asphalt', paved: 'blockpaving', railway: 'ballast', port: 'concrete', quay: 'concrete',
  industrial: 'concrete', commercial: 'paving', residential: 'grass', institution: 'paving', brownfield: 'gravel', playground: 'blockpaving',
  asphalt: 'asphalt', paving: 'paving', kerb: 'kerb', gravel: 'gravel', compacted: 'gravel', ballast: 'ballast', markings: 'markings', soil: 'soil',
  sand: 'sand', wood_deck: 'wood_deck', concrete: 'concrete', base: 'grass', blockpaving: 'blockpaving', shingle_tex: 'shingle',
};
export const GROUND_TEX_SIZE = { grass: 7, park: 9, soil: 8, scrub: 8, mud: 10, sand: 8, shingle: 3, asphalt: 5, blockpaving: 3, ballast: 3, concrete: 10, paving: 2.4, gravel: 4, kerb: 2, markings: 2, wood_deck: 3 };
const TINT = { residential: 0xb9c2a6, commercial: 0xd0ccc4, institution: 0xd8d4cc, pitch: 0xc7e0a8, golf: 0xd0e6b0, cemetery: 0xb0bf98, farmland: 0xd8c9a8, base: 0xdde4c6, port: 0xdedad2, industrial: 0xcac6be };

export function groundTexName(kind) { return GROUND_TEX[kind] || 'gravel'; }
export function groundMaterial(kind, layer) {
  const tex = groundTexName(kind);
  return std(`ground:${kind}:${layer}`, () => {
    const t = Textures.groundTexture(tex);
    const m = new THREE.MeshStandardMaterial({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0,
      color: TINT[kind] || 0xffffff, transparent: false, envMapIntensity: 0.45,
    });
    if (tex === 'markings') { m.color.set(0xffffff); }
    if (layer > LAYER.ground && layer !== LAYER.deck) {
      m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2 - layer;
    }
    addMacroVariation(m, ['asphalt', 'markings'].includes(tex) ? 0.12 : 0.25);
    return m;
  });
}

export function waterMaterial() {
  return std('water', () => {
    const t = Textures.waterNormals();
    t.normalMap.repeat.set(1, 1);
    const m = new THREE.MeshStandardMaterial({ color: 0x2c4a52, roughness: 0.2, metalness: 0.0, normalMap: t.normalMap, envMapIntensity: 0.75 });
    m.normalScale.set(0.16, 0.16);
    m.userData.time = { value: 0 };
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = m.userData.time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uTime;')
        .replace('#include <normal_fragment_maps>', `
          vec2 uvA = vWP.xz * 0.045 + vec2(uTime * 0.012, uTime * 0.007);
          vec2 uvB = vWP.xz * 0.11 - vec2(uTime * 0.018, -uTime * 0.01);
          vec3 nA = texture2D(normalMap, uvA).xyz * 2.0 - 1.0;
          vec3 nB = texture2D(normalMap, uvB).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(vec3((nA.xy + nB.xy) * normalScale, 1.0));
          normal = normalize(tbn * mapN);`);
    };
    m.customProgramCacheKey = () => 'sea';
    return m;
  });
}

export function plainMaterial(key, color, opts = {}) {
  return std(`plain:${key}`, () => new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0, vertexColors: !!opts.vertexColors, side: opts.side ?? THREE.FrontSide, ...(opts.extra || {}) }));
}
export function texturedMaterial(key, texName, color = 0xffffff) {
  return std(`tex:${key}`, () => { const t = Textures.groundTexture(texName); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, color, roughness: 1 }); });
}

export function updateMaterials(dt) {
  const w = mats.get('water'); if (w) w.userData.time.value += dt;
}
export function allMaterials() { return [...mats.values()]; }
