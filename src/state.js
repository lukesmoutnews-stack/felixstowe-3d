// Persisted settings and journal progress (localStorage, wrapped so private mode still works).

const SKEY = 'felixstowe3d.settings.v1', JKEY = 'felixstowe3d.journal.v1';
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ? { ...d, ...v } : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const DEFAULT_SETTINGS = {
  masterVolume: 0.5, ambienceVolume: 0.7, effectsVolume: 0.8, muted: false,
  shadows: 'medium', viewDistance: 1800, pixelRatio: Math.min(2, window.devicePixelRatio || 1),
  proceduralTrees: true, gardenTrees: false, proceduralLamps: true, timeOfDay: 11.5, showFps: false,
};
export function loadSettings(overrides = {}) { return { ...load(SKEY, DEFAULT_SETTINGS), ...overrides }; }
export function saveSettings(s) { save(SKEY, s); }

export class Journal {
  constructor() {
    const d = load(JKEY, { places: {}, streets: {}, people: {}, objects: {}, facts: {}, done: {}, distance: 0, drives: 0 });
    Object.assign(this, d);
  }
  save() { save(JKEY, { places: this.places, streets: this.streets, people: this.people, objects: this.objects, facts: this.facts, done: this.done, distance: this.distance, drives: this.drives }); }
  reset() { this.places = {}; this.streets = {}; this.people = {}; this.objects = {}; this.facts = {}; this.done = {}; this.distance = 0; this.drives = 0; this.save(); }
  discover(id, info) { if (this.places[id]) return false; this.places[id] = { ...info, at: Date.now() }; this.save(); return true; }
  walk(street) { if (!street || this.streets[street]) return false; this.streets[street] = Date.now(); this.save(); return true; }
  learn(id, fact) { if (this.facts[id]) return false; this.facts[id] = { ...fact, at: Date.now() }; this.save(); return true; }
  complete(id) { if (this.done[id]) return false; this.done[id] = Date.now(); this.save(); return true; }
}
