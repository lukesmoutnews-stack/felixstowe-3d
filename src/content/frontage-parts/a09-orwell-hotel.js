// Area a09-orwell-hotel: The Orwell Hotel and the Elephant & Barrel bar wing, on the roundabout at the top of Hamilton Road.
// From the user's Street View photos (docs/research/hamilton-road-streetview: e-orwell-hotel-front / -corner / -roundabout,
// f-orwell-hotel-road-view / f-orwell-elephant-barrel-curve / f-orwell-brick-wall-busstop). Heights and plan are scaled from the
// photos, not surveyed; the rear and east wings are not photographed and are guesses.
//   358416921  The Orwell Hotel (one OSM footprint, 2194 m2): Victorian red brick with cream stone dressings, three Dutch gables
//              on the roundabout (west) front, tall clustered chimneys, two-storey stone bays with balustrades, white plinth,
//              plus the single-storey Elephant & Barrel bar wing with a curved west end. The body is drawn at bar height (3.6 m)
//              and the orwellHotel feature (src/world/features/a09-orwell-hotel.js) raises the three-storey hotel over it,
//              because one OSM footprint cannot carry two heights.

export const FRONTAGES = {
  358416921: {
    addr: 'The Orwell Hotel and Elephant & Barrel', photo: 'e-orwell-hotel-front.png', height: 3.6, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.1, 0.88, 0.74], roof: 'flat', windows: false },
    details: [{ t: 'orwellHotel' }],
  },
};
export const SPLITS = {};
export const AREAS = {};
export const FASCIAS = {};
export const OVERRIDES = {};
export const ADDITIONS = [];
