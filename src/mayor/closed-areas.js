// Places outside the playable 3D zone (world/zone.js): the roads there are closed for now, so the app shows these
// places as closed in the 3D town instead of guiding or travelling the player into the closed area. They stay in
// the game: they can be revealed from the app, and their real-world visits and missions still count.
import { LocalFrame } from '../geo/projection.js';
import { CONFIG } from '../config.js';
import { inZone } from '../world/zone.js';

const frame = new LocalFrame(CONFIG.origin.lat, CONFIG.origin.lon);
const cache = new Map();
export function inClosedArea(l) {
  if (!l || l.lat == null) return false;
  if (!cache.has(l.id)) { const w = frame.toWorld(l.lat, l.lon); cache.set(l.id, !inZone(w.x, w.z)); }
  return cache.get(l.id);
}
export const CLOSED_TITLE = 'Closed in the 3D town for now';
export const CLOSED_NOTE = 'The roads to this part of Felixstowe are closed in the 3D town while the town centre and seafront are being finished. You can still reveal it here, and visit it from here.';
