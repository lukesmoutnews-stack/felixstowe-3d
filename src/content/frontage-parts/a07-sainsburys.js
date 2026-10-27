// Area a07-sainsburys: Sainsbury's (with Argos in the window) on the east side of Hamilton Road, and the Little Wine Bar at its south end.
// From the supplied Street View photos (docs/research/hamilton-road-streetview: e-little-wine-bar-sainsburys-roof,
// e-sainsburys-side-wall, e-sainsburys-entrance). OSM draws the whole store as one big flat-roofed polygon (3232 m2), so the
// photographed east wing is dressed by the a07 features: orange-red brick wall about 3.4 m high with a dark brick base, paired dark steel
// columns, a white soffit and gutter, a weathered grey slate roof with small gabled louvre vents, the big navy-tympanum
// entrance gable and the Argos window. The roof only covers the east wing (about 11 m deep); behind it the rest of the
// store stays a flat roof. Heights are estimates scaled from the photos.
const A = [144.5, -720.3];   // south end of the east wall (at the Co-op Funeralcare)
const C = [152.5, -762.4];   // north end of the east wall (toward the station)
export const FRONTAGES = {
  206317977: { addr: "Sainsbury's, Hamilton Road", photo: 'e-sainsburys-entrance.png', height: 3.5, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1.7, 1.3, 0.85], roof: 'flat', windows: false },
    details: [
      { t: 'a07Roof', A, C },
      { t: 'a07Wall', A, C },
      { t: 'a07WineBar', A, C },
      { t: 'a07Entrance', A, C },
    ] },
};
export const SPLITS = {};
export const AREAS = {};
export const FASCIAS = {
  'a07 blank board': { fascia: '#b4573a', text: '#b4573a', case: 'mixed', font: 'sans', weight: 'regular' },
  // navy tympanum with orange lettering (photo), not the usual orange fascia
  "Sainsbury's": { fascia: '#2b3558', text: '#ee7a1c', case: 'mixed', font: 'sans', weight: 'bold' },
  // red board with white lettering in the window
  'Argos': { fascia: '#d5121f', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'bold' },
  // navy board with white script-like lettering (photo: "Little Wine Bar")
  'The Little Wine Bar and Cafe': { fascia: '#1f3a5c', text: '#ffffff', case: 'mixed', font: 'sans', weight: 'regular' },
};
// The shop-sign system lays a generated fascia board along the nearest wall for each business. Sainsbury's and Argos are lettered by the
// a07 entrance feature instead (the photos show bare brick along the side wall), so their generated boards are renamed to a blank
// board painted in the brick colour.
export const OVERRIDES = {
  w206317977: { name: 'a07 blank board', kind: 'supermarket', status: 'osm', note: "Sainsbury's: lettered on the entrance gable by the a07 feature" },
  n13935352875: { name: 'a07 blank board', kind: 'shop', status: 'osm', note: 'Argos: lettered in the entrance window by the a07 feature' },
};
export const ADDITIONS = [];
