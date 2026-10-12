// Persistence for the demo. Player progress, the demo "server" (QR codes, check-in records,
// analytics, admin content) and config overrides are kept in this browser's localStorage, each
// under its own key, so a production build can swap the server part for real API calls.
// If storage is unavailable (private mode, blocked site data) everything still works for the session.

import { newPlayerState } from './engine.js';

const KEYS = { player: 'fxmayor.player.v1', server: 'fxmayor.server.v1', config: 'fxmayor.config.v1' };
const read = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };

export function createStore() {
  let persistent = true;
  try { localStorage.setItem('fxmayor.probe', '1'); localStorage.removeItem('fxmayor.probe'); } catch { persistent = false; }
  const store = {
    persistent,
    player: { ...newPlayerState(), ...(read(KEYS.player) || {}) },
    server: read(KEYS.server) || { codes: {}, checkins: [], attempts: {}, analytics: [], content: { locations: {}, missions: {} }, clockOffsetDays: 0 },
    config: read(KEYS.config) || {},
    save() {
      if (!persistent) return;
      try { localStorage.setItem(KEYS.player, JSON.stringify(this.player)); localStorage.setItem(KEYS.server, JSON.stringify(this.server)); localStorage.setItem(KEYS.config, JSON.stringify(this.config)); }
      catch { persistent = false; this.persistent = false; }
    },
    resetPlayer() { this.player = newPlayerState(); this.server.checkins = this.server.checkins.filter(() => false); this.server.attempts = {}; this.save(); },
    resetAll() { for (const k of Object.values(KEYS)) try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  store.server.content ||= { locations: {}, missions: {} };
  return store;
}

/** In-memory store for tests. */
export function memoryStore() {
  return { persistent: false, player: newPlayerState(), server: { codes: {}, checkins: [], attempts: {}, analytics: [], content: { locations: {}, missions: {} }, clockOffsetDays: 0 }, config: {}, save() {} };
}
