// Area a11-east-wainwrights-gallery: the east side of Hamilton Road from 158 Wainwrights (corner of St Andrews Road) to 142 Gallery (corner of
// Gainsborough Road), from the Street View photos supplied 26 Oct 2026 (docs/research/hamilton-road-streetview: f-wainwrights-corner-158,
// f-wainwrights-nickbarber-beijing, f-beijing-madison-rspca, f-rspca-hospice-142gallery, f-142-gallery-gainsborough-rd).
// OSM draws the whole block as one footprint (506379223, 45.6 m street face). The base building is a plain 6.7 m brick box (windows:false) and the
// feature `a11Block` (world/features/a11-east-wainwrights-gallery.js) adds the hipped slate roof, the gabled red-brick block, the 1960s three-storey
// block, the shopfronts, fascias and windows. Heights and widths are estimates scaled from the photos, not surveyed; the rear is not visible in any photo.
export const FRONTAGES = {
  506379223: {
    addr: '142-158 Hamilton Road (Wainwrights, Nick Barber Auctions, Beijing, Madison Boutique, RSPCA, St Elizabeth Hospice, 142 Gallery)',
    photo: 'f-wainwrights-corner-158.png; f-wainwrights-nickbarber-beijing.png; f-beijing-madison-rspca.png; f-rspca-hospice-142gallery.png; f-142-gallery-gainsborough-rd.png',
    height: 6.7, force: true, roofShape: 'flat',
    style: { facade: 'brick_red', tint: [1, 0.8, 0.68], roof: 'flat', windows: false },
    details: [{ t: 'a11Block' }],
  },
};
export const SPLITS = {};
export const AREAS = {};
export const FASCIAS = {
  // sign colours read from the photos (Sept 2026); Wainwrights, Beijing, Nick Barber, RSPCA Suffolk Central and St Elizabeth Hospice already exist in shops.js
  '142 Gallery': { fascia: '#ece7d6', text: '#1a1a1a', case: 'mixed', font: 'serif', weight: 'regular' },
  'Madison Boutique': { fascia: '#474d54', text: '#e4e6e8', case: 'mixed', font: 'serif', weight: 'regular' },
};
export const OVERRIDES = {
  // OSM still has Pierrot (a former shop) where Wainwrights, the estate agents, trade
  n6859058953: { name: 'Wainwrights', kind: 'estate_agent', status: 'replaced', was: 'Pierrot', evidence: ['User-supplied Street View, Sept 2026 (f-wainwrights-corner-158.png)'], note: 'Purple fascia with cream serif Wainwrights, 156-158 Hamilton Road' },
  n13063380375: { name: '142 Gallery', kind: 'art', status: 'replaced', was: '142', evidence: ['User-supplied Street View, Sept 2026 (f-142-gallery-gainsborough-rd.png)'], note: 'Cream fascia, black "142 GALLERY" lettering, on the Gainsborough Road corner' },
  n6859058960: { name: 'RSPCA Suffolk Central', kind: 'charity', status: 'replaced', was: 'RSPCA', evidence: ['User-supplied Street View, Sept 2026 (f-beijing-madison-rspca.png)'], note: 'Blue fascia reading RSPCA SUFFOLK CENTRAL' },
};
export const ADDITIONS = [
  { id: 'x-madison-boutique', name: 'Madison Boutique', kind: 'clothes', addr: 'Hamilton Road, between Beijing and the RSPCA shop', lat: 51.965766, lon: 1.352635, evidence: ['User-supplied Street View, Sept 2026 (f-beijing-madison-rspca.png)'] },
];
