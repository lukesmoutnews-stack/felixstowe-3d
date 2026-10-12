// Keyboard + mouse input. Gameplay keys are ignored while a UI panel has focus.

export class Input {
  constructor(dom) {
    this.dom = dom; this.keys = new Set(); this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; this.dragging = false; this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousedown', (e) => { if (e.button === 0 || e.button === 2) { this.dragging = true; } });
    addEventListener('mouseup', () => { this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (this.dragging || document.pointerLockElement === dom) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    dom.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    // touch: one-finger drag rotates the camera (basic support; desktop is the priority)
    let lt = null;
    dom.addEventListener('touchstart', (e) => { lt = e.touches[0]; }, { passive: true });
    dom.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (lt) { this.mouseDX += t.clientX - lt.clientX; this.mouseDY += t.clientY - lt.clientY; } lt = t; }, { passive: true });
    // virtual keys for on-screen buttons / tests
    this.virtual = new Set();
  }
  /** Analog stick (-1..1) from an on-screen joystick; null when idle. */
  setAnalog(f, s) { this.analog = f || s ? { f, s } : null; }
  down(code) { return this.enabled && (this.keys.has(code) || this.virtual.has(code)); }
  hit(code) { return this.enabled && this.pressed.has(code); }
  axis() {
    if (this.enabled && this.analog && (this.analog.f || this.analog.s)) return { f: this.analog.f, s: this.analog.s }; // on-screen joystick
    const f = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    const s = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    return { f, s };
  }
  /** First connected gamepad (standard mapping): left stick, triggers, A button. Null when none. */
  pad() {
    const g = this.enabled && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (!g) return null;
    const dz = (v) => (Math.abs(v) < 0.12 ? 0 : v);
    return { lx: dz(g.axes[0] || 0), ly: dz(g.axes[1] || 0), lt: g.buttons[6]?.value || 0, rt: g.buttons[7]?.value || 0, a: !!g.buttons[0]?.pressed };
  }
  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; }
}
