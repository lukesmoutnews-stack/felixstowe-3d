// Area a12-east-redcross-bencotto-fennwright: data only.
// Hamilton Road, east side, from the Gainsborough Road corner south to FennWright (Street View photos supplied 26 Oct 2026,
// docs/research/hamilton-road-streetview/f-british-red-cross-corner.png, f-salon26-sage-clinic-fairtrade.png,
// f-cafe-bencotto-fred-olsen.png, f-fred-olsen-recreate-fennwright.png, f-fennwright-spudhut-bakery-kings.png).
// North to south:
//   732472271  British Red Cross: single-storey white-rendered shop with a bevelled corner (Gainsborough Road corner)
//   732472270  three-storey brick block: Salon Twenty6 (single-storey sage-green unit), a florist, the Sage Clinic and the
//              Fair Trade Shop; white oriel bays, black-hooded dormers (one domed), stone piers, K. ANDREWS ghost sign on the north gable
//   732472269  Cafe Bencotto: tall red-brick shaped gable, stone dressings, two big arched ground-floor windows
//   732472268  Fred Olsen Travel Agents: modern brick infill with a slate mansard and three dormers
//   732472267  Re-Create Discovery: white-rendered two-storey (OSM has a Barnardo's point here)
//   732472265  FennWright: brick front with a segmental parapet, oriel bay and an arched fanlight window
// Heights are eave/parapet heights scaled from the photos (a door and the pavement for scale); they are estimates, not surveyed.
// Every base wall is plain brick (windows: false) under a flat deck; the roofs, gables, windows and shopfronts are all drawn by
// world/features/a12-... so they can be skewed to the footprints and sit where the photos show them.
const mk = (addr, photo, height, style, details) => ({ addr, photo, height, force: true, roofShape: 'flat', style: { roof: 'flat', windows: false, ...style }, details });

export const FRONTAGES = {
  732472271: mk('138 Hamilton Road (British Red Cross, Gainsborough Road corner)', 'f-british-red-cross-corner.png', 4.1, { facade: 'brick_red', tint: [1.8, 1.3, 0.92] }, [{ t: 'a12RedCross' }]),
  732472270: mk('130-138 Hamilton Road (Salon Twenty6, florist, The Sage Clinic, The Fair Trade Shop)', 'f-salon26-sage-clinic-fairtrade.png', 7.0, { facade: 'brick_red', tint: [1.9, 1.38, 0.95] }, [{ t: 'a12ThreeStorey' }]),
  732472269: mk('128 Hamilton Road (Cafe Bencotto)', 'f-cafe-bencotto-fred-olsen.png', 6.8, { facade: 'brick_red', tint: [1.9, 1.4, 0.97] }, [{ t: 'a12Bencotto' }]),
  732472268: mk('Fred Olsen Travel Agents, Hamilton Road', 'f-fred-olsen-recreate-fennwright.png', 6.9, { facade: 'brick_red', tint: [1.9, 1.5, 1.0] }, [{ t: 'a12FredOlsen' }]),
  732472267: mk('Re-Create Discovery, Hamilton Road', 'f-fred-olsen-recreate-fennwright.png', 6.4, { facade: 'render', tint: [0.96, 0.94, 0.88] }, [{ t: 'a12Recreate' }]),
  732472265: mk('120 Hamilton Road (FennWright)', 'f-fennwright-spudhut-bakery-kings.png', 8.1, { facade: 'brick_red', tint: [1.9, 1.38, 0.95] }, [{ t: 'a12FennWright' }]),
};

export const SPLITS = {};

export const AREAS = {};

// Fascia colours read from the photos. (The feature code draws its own lettered boards over the generated ones, these are the fallback.)
const F = (fascia, text, o = {}) => ({ fascia, text, case: o.case || 'mixed', font: o.font || 'sans', weight: o.weight || 'bold', confidence: 'photo', note: o.note || 'Fascia colours read from the Street View photos (26 Oct 2026).' });
export const FASCIAS = {
  'British Red Cross': F('#f6f5f1', '#222222'),
  'Salon Twenty6': F('#7fa56b', '#f4f6ef', { case: 'upper', font: 'sans', weight: 'regular' }),
  'Florist (Hamilton Road)': F('#2f4a37', '#f2efe4', { case: 'upper', font: 'serif' }),
  'The Sage Clinic': F('#6aa04a', '#ffffff'),
  'The Fair Trade Shop': F('#f4f2ea', '#2f7a43', { font: 'serif' }),
  'Café Bencotto': F('#8f9b95', '#2a2a2a', { case: 'upper', font: 'serif' }),
  'Fred Olsen Travel Agents': F('#1756c9', '#ffffff'),
  'Re-Create Discovery': F('#f4f1e8', '#3b8ea0', { font: 'serif' }),
  'FennWright': F('#f2f3ec', '#1d6b3b', { font: 'serif' }),
};

const EV = ['User-supplied Google Street View, Oct 2026 (docs/research/hamilton-road-streetview/f-*.png)'];
// OSM still carries the previous occupants of these units (and a Conkers point that belongs further south).
export const OVERRIDES = {
  n1957116265: { name: 'The Fair Trade Shop', kind: 'gift', status: 'replaced', was: 'Conkers Pets & Plants', evidence: EV, note: 'This OSM point lies on the southern unit of the three-storey block, which the photo shows as The Fair Trade Shop. Conkers Pets & Plants (110-112) is photographed further south, beyond Kings.' },
  n6859083219: { name: 'The Sage Clinic', kind: 'clinic', status: 'replaced', was: 'New Barber Shop', evidence: EV, note: 'Photo shows The Sage Clinic (acupuncture, remedial and deep tissue massage) here.' },
  n6859083220: { name: 'Florist (Hamilton Road)', kind: 'florist', status: 'replaced', was: 'P and K Home Interiors', evidence: EV, note: 'Photo shows a florist (bouquets, weddings, funerals, gifts, garden ornaments); the name on its fascia is hidden behind a traffic light, so this one is a placeholder.' },
  n6859083221: { name: 'Salon Twenty6', kind: 'hairdresser', status: 'replaced', was: 'Le Richè', evidence: EV, note: 'Salon Twenty6 (door number 138) is photographed on the unit OSM labels Le Richè at 138 Hamilton Road.' },
  n6859083207: { name: 'Re-Create Discovery', kind: 'charity', status: 'replaced', was: "Barnardo's", evidence: EV, note: "The photo shows Re-Create Discovery on the unit under the OSM Barnardo's point." },
};

export const ADDITIONS = [
  { id: 'x-a12-fennwright', name: 'FennWright', kind: 'estate_agent', addr: '120 Hamilton Road', lat: 51.964997, lon: 1.352409, evidence: EV },
];
