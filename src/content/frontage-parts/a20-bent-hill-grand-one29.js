// Area a20-bent-hill-grand-one29: Bent Hill, the sloping shared-surface street at the south end of Hamilton Road: Ruby's, Architects,
// Smmash Burger Shack, Felixstowe Grill, The Grand and One29, Hamilton MAS and the yellow-brick house, the cream villa and the
// Undercliff Kiosk, from the Street View photos supplied 26 Oct 2026 (docs/research/hamilton-road-streetview, the l-*.png files).
// Heights are estimates scaled from the photos (a door, a car, a window), not surveyed.
//
// The row shops (Ruby's, Architects, Smmash/Felixstowe Grill) stand on a slope of about 1 in 7, which the base building's one-height box
// cannot follow, so their entries are only 0.3 m high and the feature (world/features/a20-...) draws the whole mass. Every feature
// builds its own frame from footprint coordinates because the shared frame K does not see Bent Hill (a shared-surface street).
const mk = (addr, photo, height, style, details, extra = {}) => ({ addr, photo, height, force: true, style: { windows: false, ...style }, details, ...extra });

export const FRONTAGES = {
  // The Grand (former nightclub) and One29 bar: one 664 m2 footprint. The base box stands for the main hall (white-painted brick, slate); the
  // feature adds the Dutch parapet wall, blue-and-white wings, the tall gable with its canopy sign and the One29 balcony.
  506378806: mk('The Grand and One29, Bent Hill', 'l-grand-one29-side.png', 8.8, { facade: 'render', tint: [0.97, 0.96, 0.93], roof: 'slate', roofTint: [0.3, 0.31, 0.35] }, [{ t: 'a20Grand' }, { t: 'a20One29' }], { roofShape: 'hipped-inset' }),
  // Felixstowe Grill with Smmash Burger Shack at its east end (OSM has them as one footprint)
  733112160: mk('Smmash Burger Shack and Felixstowe Grill, Bent Hill', 'l-felixstowe-grill-smmash.png', 0.3, { facade: 'render', tint: [0.36, 0.39, 0.43], roof: 'flat' }, [{ t: 'a20Row' }], { roofShape: 'flat' }),
  // The Leather Shop in OSM; the photo shows Architects here
  733112161: mk('Architects, 1a Bent Hill', 'l-rubys-architects-smmash.png', 0.3, { facade: 'brick_red', roof: 'flat' }, [{ t: 'a20Architects' }], { roofShape: 'flat' }),
  506378810: mk("Ruby's Cafe Bar Take Away, 1 Bent Hill", 'l-rubys-architects-smmash.png', 0.3, { facade: 'render', tint: [0.3, 0.17, 0.28], roof: 'flat' }, [{ t: 'a20Rubys' }], { roofShape: 'flat' }),
  // The little corner pair at the foot of the hill: Hamilton MAS (south end) and the yellow-stock-brick house (north end), east wall on Bent Hill
  506378805: mk('Hamilton MAS and the yellow-brick house, Bent Hill', 'l-hamilton-mas-yellow-brick-house.png', 6.3, { facade: 'brick_yellow', tint: [1, 0.97, 0.84], roof: 'clay', roofTint: [0.85, 0.62, 0.52] }, [{ t: 'a20Mas' }], { roofShape: 'hipped' }),
  // The cream villa (replaces the earlier plain entry): the feature draws the pitched tiled roof, bargeboards, finials, balcony and oriel
  1017209831: mk('Cream gabled villa (Hamilton House), Bent Hill', 'l-bent-hill-cream-gabled-villa.png', 5.4, { facade: 'render', tint: [1, 0.97, 0.86], roof: 'concrete_tile', roofTint: [0.45, 0.4, 0.36], windows: true, winStyle: 0 }, [{ t: 'a20Villa' }], { roofShape: 'flat' }),
  // Undercliff Kiosk on the seafront lawn (OSM: The Undercliffe Cafe, an 8 m2 hut)
  1149167402: mk('The Undercliff Kiosk', 'l-undercliff-kiosk-seafront.png', 2.65, { facade: 'render', tint: [1, 1, 1], roof: 'flat' }, [{ t: 'a20Kiosk' }], { roofShape: 'flat' }),
};

export const SPLITS = {};
export const AREAS = {};

// Fascia colours read from the photos. Names are the ones the sign code looks up (OSM name or the additions below).
const F = (fascia, text, o = {}) => ({ fascia, text, case: o.case || 'mixed', font: o.font || 'sans', weight: o.weight || 'bold', confidence: 'medium', note: o.note || 'Fascia colours read from the user\'s Street View photos (Sept 2026).' });
export const FASCIAS = {
  "Ruby's": F('#5c3358', '#d9b45a', { font: 'serif' }),
  'Felixstowe Grill': F('#16171a', '#e2b24a', { font: 'serif', case: 'upper' }),
  'Architects': F('#183a2e', '#f0f0ea', { case: 'upper' }),
  'Smmash Burger Shack': F('#ee8a5e', '#1d2a3f', { case: 'upper' }),
  'Hamilton MAS': F('#f1efe8', '#2a2a2a'),
  'The Grand': F('#1f46a0', '#ffffff'),
  'One 29': F('#1b1c1e', '#b3c12d', { case: 'upper' }),
  'The Cork Bar': F('#2a2d30', '#e8dcc0', { font: 'serif' }),
  'Steak & Lobster Co': F('#1d2a3a', '#e8dcc0', { font: 'serif' }),
  'The Undercliff Kiosk': F('#17181a', '#f1efe8'),
};

const EV = (f) => ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/' + f + ')'];
// OSM still has The Leather Shop where the photo shows Architects, and calls the seafront hut a cafe
export const OVERRIDES = {
  n3910851753: { name: 'Architects', kind: 'office', status: 'replaced', was: 'The Leather Shop', evidence: EV('l-rubys-architects-smmash.png'), note: 'Bottle-green Architects shopfront (1a Bent Hill) in the photo' },
  w1149167402: { name: 'The Undercliff Kiosk', kind: 'cafe', status: 'replaced', was: 'The Undercliffe Cafe', evidence: EV('l-undercliff-kiosk-seafront.png'), note: 'Black name board reads The Undercliff Kiosk' },
};

// Businesses the photos show that OSM lacks; points sit about 1.4 m inside the street wall
export const ADDITIONS = [
  { id: 'x-a20-smmash', name: 'Smmash Burger Shack', kind: 'fast_food', addr: 'Bent Hill', lat: 51.960318, lon: 1.351152, evidence: EV('l-smmash-burger-shack.png') },
  { id: 'x-a20-mas', name: 'Hamilton MAS', kind: 'arts', addr: 'Bent Hill', lat: 51.960036, lon: 1.350691, evidence: EV('l-hamilton-mas-yellow-brick-house.png') },
];
