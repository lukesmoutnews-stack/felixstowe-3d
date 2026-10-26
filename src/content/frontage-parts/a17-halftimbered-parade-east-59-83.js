// Area a17-halftimbered-parade-east-59-83: Hamilton Road east side, nos 37-86 (Boots, VPZ, Subway, BHF, Costa, Nationwide, the banded
// Edwardian block with Vodafone and the Post Office, Shoe Zone, Iceland, The Works to Coes, Felixstowe Emporium, H&T, Stillwater
// Books, Nailpro, Taba Naba, T27 Barbers, Smith & Co and the 24 Hamilton Road corner), from the Street View photos supplied 26 Oct 2026
// (docs/research/hamilton-road-streetview). Heights are eave heights scaled from the photos (storeys against a pedestrian and a door),
// not surveyed. Every building is built with windows: false because the features (world/features/a17-...) draw the windows, bays, gables
// and shopfronts on the west wall themselves.
const BRICK = [1, 0.92, 0.82];
const mk = (addr, photo, height, style, details) => ({ addr, photo, height, force: true, roofShape: 'flat', style: { roof: 'flat', windows: false, ...style }, details });

export const FRONTAGES = {
  506379155: mk('86 Hamilton Road (Boots)', 'boots-vpz-row.png', 8.6, { facade: 'brick_red', tint: [1, 0.9, 0.8] }, [{ t: 'a17Boots' }]),
  733112175: mk('80-84 (VPZ, shop to let, Subway)', 'vpz-subway-bhf-row.png', 7.6, { facade: 'render', tint: [0.97, 0.96, 0.93] }, [{ t: 'a17SubwayBlock' }]),
  733112176: mk('78 (British Heart Foundation)', 'bhf-costa-78.png', 10.4, { facade: 'brick_red', tint: [1, 0.82, 0.7] }, [{ t: 'a17Bhf' }]),
  733112174: mk('74-76 (Costa Coffee)', 'bhf-costa-78.png', 8.0, { facade: 'brick_red', tint: [1, 0.88, 0.78] }, [{ t: 'a17Costa' }]),
  688756411: mk('Nationwide, 72 Hamilton Road', 'costa-nationwide-83.png', 9.0, { facade: 'render', tint: [0.93, 0.9, 0.8] }, [{ t: 'a17Nationwide' }]),
  733112172: mk('70 (Vodafone)', 'vodafone-70-nationwide.png', 11.0, { facade: 'brick_red', tint: [1, 0.8, 0.68] }, [{ t: 'a17Vodafone' }]),
  688756412: mk('66-68 (shops to let)', 'to-let-shops-post-office-row.png', 11.0, { facade: 'brick_red', tint: [1, 0.8, 0.68] }, [{ t: 'a17ToLet' }]),
  733112173: mk('64 (Post Office / TG Jones)', 'post-office-tgjones.png', 10.0, { facade: 'brick_red', tint: [1, 0.86, 0.74] }, [{ t: 'a17PostOffice' }]),
  733112169: mk('71 (Shoe Zone)', 'shoezone-71-iceland.png', 8.8, { facade: 'brick_red', tint: [1, 0.8, 0.68] }, [{ t: 'a17ShoeZone' }]),
  206146131: mk('59-61 (Iceland)', 'iceland-61.png', 7.9, { facade: 'render', tint: [0.9, 0.9, 0.92] }, [{ t: 'a17Iceland' }]),
  // The Works block (OSM: one 34 m footprint). Units run north to south, metres along the wall: the Bus Shelter shop, candy shop,
  // The Works, Cookie Barista, Ruby & Scarlet, Coes. Four half-timbered gables over canted bays.
  733112171: mk('46-57 (Mahdi candy shop, The Works, Cookie Barista, Ruby & Scarlet, Coes)', 'the-works-cookie-barista.png', 9.4, { facade: 'brick_red', tint: [1, 0.84, 0.72] }, [
    { t: 'a17Parade', len: 34.3, units: [
      { s0: 0, s1: 4.0, shop: { frame: 'blk', riser: 'gran', glass: 'glassD', step: 2.0 }, bay: 0, flatBay: 2.8, gable: false, stud: 0.55, pil: false },
      { s0: 4.0, s1: 8.6, shop: { frame: 'gran', riser: 'gran', glass: 'glass', step: 2.2 }, bay: 0, win1: 1.2, gable: false, stud: 0.6 },
      { s0: 8.6, s1: 14.6, bay: 3.2, gw: 5.4, shop: { frame: 'wht', step: 1.4, bow: true } },
      { s0: 14.6, s1: 19.4, bay: 2.6, gw: 4.3, shop: { frame: 'wht', step: 1.2, bow: true } },
      { s0: 19.4, s1: 25.4, bay: 3.0, gw: 5.2, shop: { frame: 'wht', step: 1.2, bow: true } },
      { s0: 25.4, s1: 34.3, bay: 3.4, gw: 7.0, rise: 3.6, shop: { frame: 'wht', step: 1.9, door: [-0.5, 0.5], riser: 'wht' } },
    ] },
  ]),
  // Felixstowe Emporium (44): brown timber shopfront, one bay and a half-timbered gable
  733112168: mk('44 (Felixstowe Emporium)', 'felixstowe-emporium-44.png', 9.2, { facade: 'brick_red', tint: [1, 0.84, 0.72] }, [
    { t: 'a17Parade', len: 9.8, units: [{ s0: 0, s1: 9.8, bay: 3.4, gw: 6.4, shop: { frame: 'bwn', riser: 'bwn', glass: 'glass', step: 2.2, riserH: 0.9 } }] },
  ]),
  // 43 to 45: dark antiques shop, H&T Pawnbrokers (blue shutters), Stillwater Books, Nailpro; gables over each
  688756413: mk('43-45 (H&T, Stillwater Books, Nailpro)', 'h-and-t-pawnbrokers-45.png', 9.2, { facade: 'brick_red', tint: [1, 0.84, 0.72] }, [
    { t: 'a17Brick', units: [
      { s0: 0, s1: 7.5, shop: { frame: 'gry', riser: 'gry', glass: 'glassD', step: 2.4, pil: 'gry' } },
      { s0: 7.5, s1: 13.4, shop: { frame: 'blue', riser: 'blue', glass: 'glassD', shutter: 'blue', pil: 'blk' } },
      { s0: 13.4, s1: 19.8, shop: { frame: 'slate', riser: 'rnd', glass: 'glass', step: 1.1, pil: 'blk' } },
      { s0: 19.8, s1: 25.8, shop: { frame: 'gry', riser: 'gran', glass: 'glassD', step: 2.4, pil: 'blk' } },
    ] },
    { t: 'a17Parade', len: 25.8, units: [
      { s0: 0, s1: 7.5, shop: false, pil: false, bay: 3.6, gw: 5.8 },
      { s0: 7.5, s1: 13.4, shop: false, pil: false, bay: 2.8, gw: 5.0, timber: 'tmbBrn' },
      { s0: 13.4, s1: 19.8, shop: false, pil: false, bay: 3.2, gw: 5.4 },
      { s0: 19.8, s1: 25.8, shop: false, pil: false, bay: 2.8, gw: 4.6 },
    ] },
  ]),
  // 37-41 and the corner: Taba Naba (teal and lilac), T27 Barbers, Smith & Co, the flats door; four brick gables, arched first-floor windows.
  // The shop signs for this footprint are placed on the corner bevel by the shared sign code, so the west wall carries its own lettering.
  688756414: mk('37-41 and 24 Hamilton Road (Taba Naba, T27 Barbers, Smith & Co, Anglia House)', 't27-barbers-smith-co-37.png', 9.0, { facade: 'brick_red', tint: [1, 0.84, 0.72] }, [
    { t: 'a17Brick', cornice: true, wide: [2.7, 10.4, 16.6, 21.6], narrow: [5.4, 13.3, 19.4], upper: [1.7, 3.7, 9.4, 11.4, 15.6, 17.6, 20.6, 22.0], chimneys: [6.4, 19.2],
      gables: [{ s: 2.7, w: 5.0 }, { s: 10.4, w: 5.0 }, { s: 16.6, w: 5.0 }, { s: 21.6, w: 3.8, rise: 3.0 }],
      units: [
        { s0: 0, s1: 3.7, shop: { frame: 'teal', riser: 'teal', glass: 'glass', step: 1.6, pil: 'teal' }, sign: { text: 'TABA NABA', bg: '#19a79d', fg: '#e8f7f4', serif: true } },
        { s0: 3.7, s1: 7.3, shop: { frame: 'lilac', riser: 'lilac', glass: 'glass', step: 1.6, pil: 'lilac' } },
        { s0: 7.3, s1: 13.4, shop: { frame: 'blk', riser: 'gran', glass: 'glassD', step: 2.4, pil: 'blk' }, sign: { text: 'T27 BARBERS', bg: '#111214', fg: '#f1f1f1' } },
        { s0: 13.4, s1: 19.6, shop: { frame: 'blk', riser: 'gran', glass: 'glass', step: 2.0, pil: 'blk' }, sign: { text: 'smith&co', bg: '#17181b', fg: '#e5e0d2' } },
        { s0: 19.6, s1: 22.9, shop: { frame: 'gran', riser: 'gran', glass: 'glassD', step: 1.5, pil: 'gran', door: [-0.6, 0.6] } },
      ] },
    { t: 'a17Corner' },
  ]),
};

export const SPLITS = {};

export const AREAS = {};

// Shop sign colours read from the photos (Sept 2026). Names are the ones the sign code looks up (OSM name or the additions below).
const F = (fascia, text, o = {}) => ({ fascia, text, case: o.case || 'mixed', font: o.font || 'sans', weight: o.weight || 'bold', confidence: 'medium', note: o.note || 'Fascia colours read from the user\'s Street View photos (Sept 2026).' });
export const FASCIAS = {
  'VPZ': F('#2c9a48', '#ffffff', { case: 'upper' }),
  'Nationwide': F('#d8d2bf', '#1a2a7a', { note: 'The real sign is a navy band on the frieze (drawn on the model as a plaque); this stone-coloured board stands in for the sign code\'s ground-floor strip.' }),
  'The Bus Shelter': F('#17181b', '#f4f1ea', { case: 'upper' }),
  'Mahdi Shop': F('#16a39a', '#ffd1e8', { font: 'serif' }),
  'Cookie Barista': F('#d8c4dc', '#3a2a3a', { font: 'serif', weight: 'regular' }),
  'Felixstowe Emporium': F('#1d2f8a', '#ffffff', { font: 'serif' }),
  'H & T Pawnbrokers': F('#1b3fd0', '#ffffff'),
  'Shoe Zone': F('#1b3fd0', '#ffffff'),
  'Coes': F('#17181b', '#eeeadf', { case: 'upper', font: 'serif' }),
  'Ruby & Scarlet': F('#f3f1ec', '#1e1e1e', { font: 'serif' }),
  'Stillwater Books': F('#3a444c', '#e7e5de', { font: 'serif', weight: 'regular' }),
  'Nailpro': F('#d9d6d0', '#2a2a2a', { case: 'upper' }),
  'The Kiosk': F('#2e3136', '#f1efe8'),
  'T27 Barbers': F('#111214', '#f1f1f1', { case: 'upper' }),
};

// OSM has the jeweller Boreham Christopher where the photo shows H&T Pawnbrokers; the 80-82 unit (once Coffee Link) is advertised to let.
export const OVERRIDES = {
  n6865115002: { name: 'H & T Pawnbrokers', kind: 'pawnbroker', status: 'replaced', was: 'Boreham Christopher', evidence: ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/h-and-t-pawnbrokers-45.png)'], note: 'Blue H&T Pawnbrokers fascia and roller shutter at 45 Hamilton Road in the photo' },
  n6865115034: { name: 'Coffee Link', kind: 'cafe', status: 'vacant', was: 'Coffee Link', evidence: ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/vpz-subway-bhf-row.png)'], note: 'The unit between VPZ and Subway shows a "commercial space to let" board in the photo' },
};

// Businesses the photos show that OSM lacks. Points sit about 1.3 m inside the west wall at the position along it where the shop is,
// so the shared sign code puts the board on the Hamilton Road side.
const EV = (f) => ['User-supplied Google Street View, Sept 2026 (docs/research/hamilton-road-streetview/' + f + ')'];
export const ADDITIONS = [
  { id: 'x-a17-vpz', name: 'VPZ', kind: 'vape', addr: '84 Hamilton Road', lat: 51.963435, lon: 1.351797, evidence: EV('boots-vpz-row.png') },
  { id: 'x-a17-boots-west', name: 'Boots', brand: 'Boots', kind: 'pharmacy', addr: '86 Hamilton Road (pedestrian frontage; the OSM point puts the sign on Cobbold Road)', lat: 51.963518, lon: 1.351829, evidence: EV('boots-vpz-row.png') },
  { id: 'x-a17-shoezone', name: 'Shoe Zone', kind: 'shoes', addr: '71 Hamilton Road', lat: 51.962835, lon: 1.351566, evidence: EV('shoezone-71-iceland.png') },
  { id: 'x-a17-busshelter', name: 'The Bus Shelter', kind: 'charity', addr: '57-59 Hamilton Road', lat: 51.962563, lon: 1.351484, evidence: EV('iceland-59-candy-shop.png') },
  { id: 'x-a17-mahdi', name: 'Mahdi Shop', kind: 'confectionery', addr: '55 Hamilton Road', lat: 51.962525, lon: 1.351473, evidence: EV('the-works-cookie-barista.png') },
  { id: 'x-a17-cookie', name: 'Cookie Barista', kind: 'cafe', addr: 'Hamilton Road, beside The Works', lat: 51.96243, lon: 1.351445, evidence: EV('cookie-barista-ruby-scarlet-53.png') },
  { id: 'x-a17-emporium', name: 'Felixstowe Emporium', kind: 'antiques', addr: '44 Hamilton Road', lat: 51.962234, lon: 1.351389, evidence: EV('felixstowe-emporium-44.png') },
];
