// Landmarks are matched by OSM name at runtime – nothing is positioned from this file.
// Facts are documented history with sources; anything fictional must be labelled as such.

export const LANDMARKS = [
  {
    id: 'pier', match: /^felixstowe pier$/i, title: 'Felixstowe Pier', area: 'Seafront',
    facts: [
      { text: 'Opened in August 1905 as a landing stage for steamers, the pier was half a mile (about 800 m) long – then the third-longest in England – and had an electric tramway.', source: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
      { text: 'Army engineers cut the pier into sections in the Second World War and the seaward end was later demolished; the tram never ran again.', source: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
      { text: 'The £3 million pier building, with an arcade, bowling and a restaurant, opened to visitors in August 2017 and was officially opened that October.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Pier' },
      { text: 'The remaining deck beyond the building has been closed to the public since about 1999 because of corroded steel and rotten timbers.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Pier' },
    ],
  },
  {
    id: 'spa', match: /spa pavilion/i, title: 'Spa Pavilion', area: 'Seafront',
    style: { facade: 'render', tint: [0.98, 0.98, 0.96], windows: true },
    facts: [
      { text: 'Built in 1938 to replace the 1910 Floral Hall, the Spa Pavilion theatre was bombed in 1941 and rebuilt in 1950.', source: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
      { text: 'It stands below Cliff Gardens and the Town Hall Garden, a Grade II registered park and garden (List entry 1001220).', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1001220' },
    ],
  },
  {
    id: 'landguard_fort', match: /landguard fort/i, title: 'Landguard Fort', area: 'Landguard',
    style: { facade: 'brick_dark', windows: false },
    facts: [
      { text: 'The present pentagonal fort was built in 1744–49 and remodelled in 1871–76; the point has been fortified since the 1540s.', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1018969' },
      { text: 'It is a scheduled monument (1018969) and a Grade I listed building (1030415).', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1030415' },
      { text: 'On 2 July 1667 about 800 Dutch troops landed and attacked the fort; around 200 defenders under Captain Nathaniel Darell drove them off.', source: 'https://www.english-heritage.org.uk/visit/places/landguard-fort' },
    ],
  },
  {
    id: 'station', match: /^felixstowe$/i, requireTag: { railway: 'station' }, alt: [/felixstowe (railway )?station/i], title: 'Felixstowe railway station', area: 'Town centre',
    facts: [
      { text: 'Built in 1898 by the Great Eastern Railway; the main passenger buildings, concourse and station master’s house are Grade II listed (1284364).', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1284364' },
      { text: 'Colonel Tomline’s company opened the Felixstowe branch line in 1877; the Great Eastern Railway worked it from 1879 and bought the company in 1887.', source: 'https://heritage.suffolk.gov.uk/Monument/MSF34997' },
    ],
  },
  {
    id: 'cliff_gardens', match: /cliff gardens|town hall garden/i, title: 'Cliff Gardens', area: 'Seafront',
    facts: [{ text: 'Cliff Gardens and the Town Hall Garden are a Grade II registered park and garden, registered in 2003 (List entry 1001220).', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1001220' }],
  },
  {
    id: 'seafront_gardens', match: /seafront gardens/i, title: 'Seafront Gardens', area: 'Seafront',
    facts: [{ text: 'The restored Seafront Gardens officially reopened on 26 August 2015 after a Heritage Lottery Fund-backed project.', source: 'https://felixstowe.gov.uk/seafront-gardens-officially-open/' }],
  },
  { id: 'hamilton_gardens', match: /hamilton gardens/i, title: 'Hamilton Gardens', area: 'Seafront', facts: [] },
  { id: 'landguard_point', match: /landguard point/i, title: 'Landguard Point', area: 'Landguard', facts: [] },
  {
    id: 'landguard_reserve', match: /landguard (nature reserve|common)/i, title: 'Landguard Nature Reserve', area: 'Landguard',
    facts: [{ text: 'A Site of Special Scientific Interest and Local Nature Reserve of about 33 hectares, with rare vegetated shingle where ringed plovers nest.', source: 'https://landguard.com/ecology/' }],
  },
  {
    id: 'port', match: /port of felixstowe/i, title: 'Port of Felixstowe', area: 'Port',
    facts: [
      { text: 'Colonel George Tomline founded what became the port in 1875; the dock opened in 1886 and the first commercial ship arrived on 7 April that year.', source: 'https://www.portoffelixstowe.co.uk/about/history/' },
      { text: 'The Landguard Container Terminal opened on 1 July 1967, described by the port as the UK’s first purpose-built container terminal.', source: 'https://www.portoffelixstowe.co.uk/about/history/' },
      { text: 'Fully owned by Hutchison since 1994, it is Britain’s largest container port, handling about 4 million TEU a year.', source: 'https://www.portoffelixstowe.co.uk/about/history/' },
    ],
  },
  { id: 'trinity', match: /trinity terminal/i, title: 'Trinity Terminal', area: 'Port', facts: [] },
  {
    id: 'ferry', match: /felixstowe ferry/i, title: 'Felixstowe Ferry', area: 'North coast',
    facts: [{ text: 'A small fishing hamlet where the River Deben meets the sea, with two Napoleonic-era Martello towers and a seasonal foot and bike ferry to Bawdsey.', source: 'https://www.discoversuffolk.org.uk/easygoing-trails/felixstowe-ferry-easy-going-trails/' }],
  },
];

export const STREET_GOALS = [
  { id: 'walk_hamilton', street: /^hamilton road$/i, title: 'Walk along Hamilton Road' },
  { id: 'walk_undercliff', street: /^undercliff road (east|west)$/i, title: 'Walk the seafront on Undercliff Road' },
  { id: 'walk_high_road', street: /^high road (east|west)$/i, title: 'Find High Road' },
];

export function matchLandmark(poi) {
  for (const l of LANDMARKS) {
    const primary = l.match.test(poi.name), alt = (l.alt || []).some((re) => re.test(poi.name));
    if (!primary && !alt) continue;
    const tagsOk = !l.requireTag || Object.entries(l.requireTag).every(([k, v]) => poi.tags?.[k] === v);
    if (primary && !alt && !tagsOk) continue;
    return l;
  }
  return null;
}
