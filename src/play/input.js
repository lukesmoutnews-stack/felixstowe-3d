// Keyboard, mouse, touch and gamepad input. Gameplay keys are ignored while a UI panel has focus.
//
// Camera: drag with either mouse button or one finger to look around; scroll wheel, trackpad,
// two-finger pinch or the +/- keys to zoom. Pointer events cover mouse, pen and touch alike, and
// the on-screen joystick and buttons are separate elements, so they never rotate the camera.

export class Input {
  constructor(dom) {
    this.dom = dom; this.keys = new Set(); this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; this.pinch = 1; this.dragging = false; this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); this.dragging = false; });
    dom.style.touchAction = 'none';
    this.pointers = new Map(); let pinchD = 0;
    const spread = () => { const p = [...this.pointers.values()]; return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0; };
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && !(e.button === 0 || e.button === 2)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      try { dom.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
      this.dragging = true; pinchD = spread();
    });
    dom.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { if (document.pointerLockElement === dom) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size >= 2) { const d = spread(); if (pinchD > 0 && d > 0) this.pinch *= d / pinchD; pinchD = d; return; } // pinch: zoom only
      const touch = p.type !== 'mouse', k = touch ? 1.35 : 1; // fingers move less than a mouse for the same intent
      this.mouseDX += dx * k; this.mouseDY += dy * k;
    });
    const up = (e) => { this.pointers.delete(e.pointerId); pinchD = spread(); if (!this.pointers.size) this.dragging = false; };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up); dom.addEventListener('lostpointercapture', up);
    dom.addEventListener('wheel', (e) => {
      // lines/pages/pixels -> notches; trackpads give small, frequent deltas, which this keeps proportional
      const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      this.wheel += Math.max(-3, Math.min(3, px / 100)); e.preventDefault();
    }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    // virtual keys for on-screen buttons / tests
    this.virtual = new Set();
  }
  /** Analog stick (-1..1) from an on-screen joystick; null when idle. */
  setAnalog(f, s) { this.analog = f || s ? { f, s } : null; }
  down(code) { return this.enabled && (this.keys.has(code) || this.virtual.has(code)); }
  hit(code) { return this.enabled && this.pressed.has(code); }
  /** Held zoom keys: + zooms in (negative), - zooms out. */
  get zoomKeys() { return (this.down('Minus') || this.down('NumpadSubtract') ? 1 : 0) - (this.down('Equal') || this.down('NumpadAdd') ? 1 : 0); }
  axis() {
    if (this.enabled && this.analog && (this.analog.f || this.analog.s)) return { f: this.analog.f, s: this.analog.s }; // on-screen joystick
    const f = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    const s = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    return { f, s };
  }
  /** First connected gamepad (standard mapping): left stick, triggers, A button, right stick. Null when none. */
  pad() {
    const g = this.enabled && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (!g) return null;
    const dz = (v) => (Math.abs(v) < 0.12 ? 0 : v);
    return { lx: dz(g.axes[0] || 0), ly: dz(g.axes[1] || 0), rx: dz(g.axes[2] || 0), ry: dz(g.axes[3] || 0), lt: g.buttons[6]?.value || 0, rt: g.buttons[7]?.value || 0, a: !!g.buttons[0]?.pressed };
  }
  /** Gamepad right stick looks around (called once per frame before the camera update). */
  padLook(dt) { const p = this.pad(); if (p && (p.rx || p.ry)) { this.mouseDX += p.rx * 900 * dt; this.mouseDY += p.ry * 600 * dt; } }
  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; this.pinch = 1; }
}
