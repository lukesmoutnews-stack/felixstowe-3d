// Editable game configuration (the admin panel writes overrides; production keeps these server-side).

export const DEFAULT_CONFIG = {
  xp: {
    discover: 5,             // finding a location in the 3D town (deliberately small)
    businessVisit: 100,      // first verified check-in at a business
    landmarkVisit: 60,       // first verified check-in at a landmark
    eventCheckin: 0,         // event check-ins are rewarded through their mission
    stopQuestion: 15,        // correct Seafront Explorer stop answer (knowledge, not a visit)
  },
  ranks: [
    { id: 'newcomer', name: 'Newcomer', xp: 0, visits: 0, trails: 0, community: 0, quiz: false },
    { id: 'explorer', name: 'Local Explorer', xp: 250, visits: 2, trails: 0, community: 0, quiz: false },
    { id: 'champion', name: 'Community Champion', xp: 700, visits: 5, trails: 0, community: 1, quiz: false },
    { id: 'advocate', name: 'Town Advocate', xp: 1400, visits: 8, trails: 1, community: 1, quiz: false },
    { id: 'candidate', name: 'Mayoral Candidate', xp: 2200, visits: 12, trails: 2, community: 1, quiz: true },
    { id: 'mayor', name: 'Mayor', xp: 2200, visits: 12, trails: 2, community: 1, quiz: true, final: true },
  ],
  repeatRules: { business: 'daily', landmark: 'once', event: 'once' }, // daily = one check-in per day; once = ever
  rateLimit: { attempts: 10, perSeconds: 60 },
  discoverRadius: 40,        // metres in the 3D town
  season: { id: 's1-2026', name: 'Season 1 · Autumn 2026', start: '2026-10-01', end: '2026-12-31' },
  sponsorshipTiers: [ // illustrative test prices only, not market rates; nothing is charged in this demo
    { id: 'founding', name: 'Founding partner', price: '£100–£200', perks: ['Business profile', 'QR check-in point', 'Stamp in the collection'] },
    { id: 'featured', name: 'Featured partner', price: '£300–£500', perks: ['Featured marker', 'Home-screen spot', 'Optional offer'] },
    { id: 'campaign', name: 'Campaign sponsor', price: '£750–£1,500', perks: ['Sponsored mission or trail', 'Campaign report', 'Seasonal mention'] },
  ],
  demoSecret: 'demo-only-not-secret', // signs demo QR payloads; a real backend keeps its key server-side
};

export function mergeConfig(over = {}) {
  const c = structuredClone(DEFAULT_CONFIG);
  for (const [k, v] of Object.entries(over || {})) c[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...c[k], ...v } : v;
  return c;
}
