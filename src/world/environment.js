// Sky, sun, image-based lighting, shadows, fog and clouds.
// The sun position is computed for the town's latitude/longitude and the chosen UK clock time.
// The sky is a custom gradient dome (art-directable, and its horizon colour drives the fog so
// distant geometry blends into the sky without a visible seam).

import * as THREE from 'three';
import { Textures } from './textures.js';

/** Approximate solar azimuth/elevation (degrees). Azimuth: 0 = north, 90 = east. */
export function sunPosition(date, lat, lon) {
  const rad = Math.PI / 180;
  const d = (date.getTime() / 86400000) - 10957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  const lst = (gmst * 15 + lon) * rad;
  const ha = lst - ra;
  const phi = lat * rad;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  return { elevation: el / rad, azimuth: ((az / rad) + 360) % 360 };
}

const SKY_VS = `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // always on the far plane
}`;
const SKY_FS = `
uniform vec3 zenith, horizon, ground, sunColor, sunDir;
uniform sampler2D clouds; uniform float cloudAmount, time;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0 ? mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizon, ground, clamp(-h * 6.0, 0.0, 1.0));
  float sd = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(sd, 900.0) * 30.0 + pow(sd, 12.0) * 0.25 + pow(sd, 3.0) * 0.06);
  if (h > 0.01) {
    vec2 uv = d.xz / (h + 0.12) * 0.22 + vec2(time * 0.0025, time * 0.001);
    float c = texture2D(clouds, uv).a * cloudAmount;
    c *= smoothstep(0.01, 0.2, h);
    vec3 cloudCol = mix(horizon * 1.05, vec3(1.0) * (0.7 + 0.5 * max(sunDir.y, 0.0)), 0.6) + sunColor * pow(sd, 6.0) * 0.4;
    col = mix(col, cloudCol, c);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class Environment {
  constructor(scene, renderer, frame) {
    this.scene = scene; this.renderer = renderer; this.frame = frame;
    const ct = Textures.cloudTexture();
    this.uniforms = {
      zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, clouds: { value: ct }, cloudAmount: { value: 0.75 }, time: { value: 0 },
    };
    const mk = () => new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mk()); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.sky.name = 'sky';
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xfff3e0, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera; c.left = -110; c.right = 110; c.top = 110; c.bottom = -110; c.near = 1; c.far = 900;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xdfe7ef, 0x6b6150, 0.4); scene.add(this.hemi);
    this.fog = new THREE.FogExp2(0xc9d6e2, 0.0006); scene.fog = this.fog;

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mk()));
  }

  setTime(date) {
    this.time = date;
    const { elevation, azimuth } = sunPosition(date, this.frame.originLat, this.frame.originLon);
    this.elevation = elevation; this.azimuth = azimuth;
    const el = Math.max(-6, elevation) * Math.PI / 180, az = azimuth * Math.PI / 180;
    // World: x east, z south. Grid convergence (~2.6°) is ignored for lighting.
    this.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    const day = THREE.MathUtils.clamp((elevation + 3) / 18, 0, 1);                // 0 night .. 1 full day
    const golden = THREE.MathUtils.clamp(1 - Math.abs(elevation - 4) / 10, 0, 1);  // warm light near the horizon
    const U = this.uniforms;
    U.sunDir.value.copy(this.sunDir);
    U.zenith.value.set(0x0b1422).lerp(new THREE.Color(0x3f6fa8), day);
    U.horizon.value.set(0x1a2433).lerp(new THREE.Color(0xc4d3df), day).lerp(new THREE.Color(0xf0b88a), golden * 0.55);
    U.ground.value.set(0x0c1016).lerp(new THREE.Color(0x7d8790), day);
    U.sunColor.value.set(0xffe9c7).lerp(new THREE.Color(0xff9a50), golden * 0.7).multiplyScalar(day);
    this.sun.intensity = 2.8 * THREE.MathUtils.clamp((elevation + 1) / 12, 0, 1);
    this.sun.color.set(0xfff1dc).lerp(new THREE.Color(0xffb070), golden * 0.6);
    this.hemi.intensity = THREE.MathUtils.lerp(0.05, 0.55, day);
    this.hemi.color.copy(U.zenith.value).lerp(new THREE.Color(0xffffff), 0.5);
    this.fog.color.copy(U.horizon.value);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(0.5, 0.95, day);
    if (this.scene.environment) this.scene.environment.dispose();
    this.scene.environment = this.pmrem.fromScene(this.envScene, 0.04).texture;
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.1, 0.5, day);
  }

  /** Keep the shadow frustum and sky dome around the focus point. */
  update(target, dt, camera) {
    const snap = 4; // reduce shadow shimmering
    const tx = Math.round(target.x / snap) * snap, tz = Math.round(target.z / snap) * snap;
    this.sun.target.position.set(tx, target.y, tz);
    this.sun.position.set(tx + this.sunDir.x * 400, target.y + Math.max(0.15, this.sunDir.y) * 400, tz + this.sunDir.z * 400);
    this.sun.target.updateMatrixWorld();
    this.uniforms.time.value += dt;
    if (camera) this.sky.position.copy(camera.position);
  }
  setShadowQuality(q) {
    const size = q === 'high' ? 4096 : q === 'low' ? 1024 : 2048;
    this.sun.castShadow = q !== 'off';
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.shadow.mapSize.set(size, size);
  }
}
