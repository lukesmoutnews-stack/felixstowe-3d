// Race to Be Mayor – seed content.
//
// LANDMARKS are real places. Their positions come from OpenStreetMap (data of 8 Oct 2026) and every
// fact carries a source. No QR codes exist at any real landmark: in a pilot, plaques would only be
// installed with the owner's permission. Until then, landmark check-ins are demonstration check-ins.
//
// BUSINESSES are fictional demonstration businesses. Their names were checked against web search
// (Oct 2026) and match no Felixstowe business. Their markers stand on real streets, but each position
// is illustrative only and does not mark a real shop.

export const LOCATIONS = [
  // ---------------- fictional demonstration businesses ----------------
  { id: 'kittiwake', kind: 'business', demo: true, name: 'The Kittiwake Bakehouse', category: 'Bakery', area: 'Town centre', street: 'Hamilton Road', lat: 51.96160, lon: 1.35135,
    blurb: 'A small-batch bakery known (in this demo) for its sea-salt sourdough and morning buns.', story: 'The owners named it after the kittiwakes that nest along the East Anglian coast.', offer: 'Demo offer: 10% off a morning bun with your check-in.', trails: ['high_street'], tier: 'founding' },
  { id: 'marram', kind: 'business', demo: true, name: 'Marram & Twine', category: 'Gifts & homeware', area: 'Town centre', street: 'Hamilton Road', lat: 51.96260, lon: 1.35138,
    blurb: 'Hand-made seaside homeware, rope work and prints by Suffolk makers.', story: 'Marram is the tough grass that holds dunes together.', offer: null, trails: ['high_street'], tier: null },
  { id: 'lantern', kind: 'business', demo: true, name: 'Lantern Lane Books', category: 'Bookshop', area: 'Town centre', street: 'Victoria Street', lat: 51.96240, lon: 1.35209,
    blurb: 'New and second-hand books, with a corner for local history and maritime titles.', story: 'Story time every Saturday morning (fictional).', offer: null, trails: ['high_street'], tier: 'featured' },
  { id: 'oldsignal', kind: 'business', demo: true, name: 'Old Signal Records', category: 'Music & vinyl', area: 'Town centre', street: 'Hamilton Road', lat: 51.96340, lon: 1.35141,
    blurb: 'Vinyl, cassettes and a listening booth playing East Anglian bands.', story: 'Named after the old coastguard signal lamps.', offer: null, trails: ['high_street'], tier: null },
  { id: 'shingle', kind: 'business', demo: true, name: 'The Shingle Pantry', category: 'Delicatessen', area: 'Town centre', street: 'Hamilton Road', lat: 51.96440, lon: 1.35185,
    blurb: 'Suffolk cheeses, smoked fish and picnic boxes for the beach.', story: 'Their picnic boxes come in reusable tins (fictional).', offer: 'Demo offer: free taster with your check-in.', trails: ['high_street'], tier: null },
  { id: 'bellbuoy', kind: 'business', demo: true, name: 'Bellbuoy Vintage', category: 'Vintage clothing', area: 'Town centre', street: 'Orwell Road', lat: 51.96075, lon: 1.34650,
    blurb: 'Pre-loved coats, jumpers and seaside souvenirs from the last century.', story: 'Everything is sorted by decade (fictional).', offer: null, trails: [], tier: null },
  { id: 'seaholly', kind: 'business', demo: true, name: 'Seaholly Plants', category: 'Plant shop', area: 'Town centre', street: 'Cobbold Road', lat: 51.96328, lon: 1.35419,
    blurb: 'Coastal and drought-tolerant plants for windy seaside gardens.', story: 'Sea holly is a spiky blue plant of sand and shingle.', offer: null, trails: [], tier: null },
  { id: 'breakwater', kind: 'business', demo: true, name: 'Breakwater Bikes', category: 'Bike hire & repair', area: 'Seafront', street: 'Sea Road', lat: 51.95449, lon: 1.34100,
    blurb: 'Bike hire for the seafront and repairs while you wait.', story: 'The seafront ride runs along the promenade (in the game).', offer: 'Demo offer: free tyre check with your check-in.', trails: [], tier: 'campaign', sponsored: true },
  { id: 'driftlight', kind: 'business', demo: true, name: 'Driftlight Studio', category: 'Art gallery', area: 'Seafront', street: 'Undercliff Road West', lat: 51.95868, lon: 1.34672,
    blurb: 'Paintings and photographs of the Suffolk coast by local artists.', story: 'Exhibitions change with the seasons (fictional).', offer: null, trails: [], tier: null },
  { id: 'tidewrack', kind: 'business', demo: true, name: 'Tidewrack Coffee', category: 'Café', area: 'Felixstowe Ferry', street: 'Ferry Road', lat: 51.98800, lon: 1.38930,
    blurb: 'A harbour-side coffee hatch serving walkers and sailors.', story: 'Tidewrack is the line of seaweed and shells left by the tide.', offer: 'Demo offer: 50p off a coffee with your check-in.', trails: ['ferry_morning'], tier: 'campaign', sponsored: true },

  // ---------------- real landmarks (positions from OpenStreetMap) ----------------
  { id: 'pier', kind: 'landmark', name: 'Felixstowe Pier', category: 'Seafront landmark', area: 'Seafront', lat: 51.95790, lon: 1.34640, osm: 'way 91786049 / 28724732', opening: 'The pier building is a private business; check its own opening times. The deck beyond it has been closed for years.',
    blurb: 'The pier building on the promenade, with the remaining deck reaching out to sea.', trails: ['seafront_explorer'],
    facts: [
      { text: 'Opened in August 1905 as a landing stage for steamers, the pier was about 800 m long and had an electric tramway.', source: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
      { text: 'The £3 million pier building opened to visitors in August 2017.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Pier' },
    ] },
  { id: 'spa', kind: 'landmark', name: 'Spa Pavilion', category: 'Theatre', area: 'Seafront', lat: 51.96090, lon: 1.35460, osm: 'way 240664453', opening: 'A working theatre run by its owners; check their website for shows and opening times.',
    blurb: 'The seafront theatre below Cliff Gardens.', trails: ['seafront_explorer'],
    facts: [
      { text: 'Built in 1938 to replace the 1910 Floral Hall, it was bombed in 1941 and rebuilt in 1950.', source: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
      { text: 'It has a raked auditorium, a proscenium stage and 919 seats.', source: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
    ] },
  { id: 'town_hall', kind: 'landmark', hub: true, name: 'Felixstowe Town Hall', category: 'The goal of the race', area: 'Seafront', lat: 51.95932, lon: 1.34828, osm: 'way 500565020',
    opening: 'A working civic building and the home of Felixstowe Town Council. All game activity happens outside, on the public pavement. The game gives no access to the building.',
    blurb: 'The red-brick Town Hall on Undercliff Road West is where every campaign in this game is heading. Climb the ranks, and the Mayor\u2019s Walk finishes right beside it, in the Town Hall Garden at Mr. Felixstowe\u2019s Shelter.',
    story: 'Race to Be Mayor is an independent game. It is not affiliated with, endorsed by or run with Felixstowe Town Council, and the in-game mayor is a fictional title.',
    trails: ['seafront_explorer', 'mayors_walk'],
    facts: [
      { text: 'Built in 1892 as offices for the new Felixstowe and Walton local board; Felix Cobbold MP laid the foundation stone that January.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
      { text: 'Designed by George Horton and built by Harcourt Runnacles & Co. for \u00a31,800, in red brick with terracotta dressings and carved festoon panels.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
      { text: 'The doorway has Corinthian pilasters and three finials; the right-hand bay has canted bay windows under a pediment with a blind oculus.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
      { text: 'In 1927 the council chairman stood on its steps to congratulate the Schneider Trophy winners from the Marine Aircraft Experimental Establishment.', source: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
      { text: 'Today it is the civic and administrative base of Felixstowe Town Council, which bought the building in 2007.', source: 'https://felixstowe.gov.uk/?p=115' },
    ] },
  { id: 'town_hall_garden', kind: 'landmark', name: 'Town Hall Garden & Mr. Felixstowe’s Shelter', category: 'Seafront garden', area: 'Seafront', lat: 51.95940, lon: 1.34893, osm: 'way 402525404',
    opening: 'A public garden on the cliff beside the Town Hall, open to everyone. The open oak shelter at the top, Mr. Felixstowe’s Shelter, is where the game’s finale gathers: outdoors, in a public space.',
    blurb: 'Terraced paths climb the cliff in a semicircle from a three-tier fountain on Undercliff Road West up to Mr. Felixstowe’s Shelter, with red-hot pokers, lavender and palms on the banks.',
    story: 'In the game, the last steps of the race to the Town Hall finish here, beside it. Please treat the real garden with care: stay on the paths, and don’t climb on the fountain or walls.',
    trails: ['mayors_walk'],
    facts: [
      { text: 'Laid out in 1902 as a small public garden on the cliff beside the Town Hall, at the same time as the granite sea wall and promenade.', source: 'https://parksandgardens.org/places/felixstowe-sea-front-gardens' },
      { text: 'Steps and terraced paths form a symmetrical semicircle up the cliff, with a three-tier fountain at the base flanked by two small lawns.', source: 'https://parksandgardens.org/places/felixstowe-sea-front-gardens' },
      { text: 'The Seafront Gardens are on the Register of Parks and Gardens of Special Historic Interest at Grade II.', source: 'https://parksandgardens.org/places/felixstowe-sea-front-gardens' },
      { text: 'When the restored Seafront Gardens reopened in August 2015, a new wooden-framed shelter was the last piece of work in the Town Hall Garden.', source: 'https://felixstowe.gov.uk/seafront-gardens-officially-open/' },
    ] },
  { id: 'martello_park', kind: 'landmark', name: 'Martello Park', category: 'Park & Martello tower', area: 'South seafront', lat: 51.94873, lon: 1.33527, osm: 'way 552665515', opening: 'A public park. The tower lookout is run by volunteers.',
    blurb: 'A seafront park around the restored Martello Tower P.', trails: ['seafront_explorer'],
    facts: [
      { text: 'Between 1805 and 1812 eight Martello towers were built on the Felixstowe peninsula, named with letters of the alphabet.', source: 'https://www.visitfelixstowe.org.uk/things-to-do/martello-towers' },
      { text: 'The restored Tower P contains about 750,000 bricks, and its lookout is a National Coastwatch Institution station.', source: 'https://www.visitfelixstowe.org.uk/things-to-do/martello-towers' },
    ] },
  { id: 'triangle', kind: 'landmark', name: 'The Triangle', category: 'Town-centre garden', area: 'Town centre', lat: 51.96402, lon: 1.35164, osm: 'way 618245250', opening: 'A public space.',
    blurb: 'The small public garden where the town-centre shopping streets meet.', trails: ['mayors_walk'], facts: [] },
  { id: 'station', kind: 'landmark', name: 'Felixstowe railway station', category: 'Railway station', area: 'Town centre', lat: 51.96702, lon: 1.34981, osm: 'node 25685821', opening: 'Open for train services. Follow station safety rules.',
    blurb: 'The terminus of the branch line from Ipswich.', trails: ['mayors_walk'],
    facts: [
      { text: 'Built in 1898 by the Great Eastern Railway; the main buildings are Grade II listed (1284364).', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1284364' },
      { text: 'Colonel Tomline’s company opened the Felixstowe branch line in 1877.', source: 'https://heritage.suffolk.gov.uk/Monument/MSF34997' },
    ] },
  { id: 'landguard_fort', kind: 'landmark', name: 'Landguard Fort', category: 'Historic fort', area: 'Landguard', lat: 51.93846, lon: 1.32099, osm: 'way 32007009', opening: 'Opening is seasonal; check English Heritage or the fort’s own website before you go.',
    blurb: 'The fort guarding the mouth of the Orwell and Stour.', trails: ['landguard_trail'],
    facts: [
      { text: 'The present pentagonal fort was built in 1744–49 and remodelled in 1871–76; the point has been fortified since the 1540s.', source: 'https://historicengland.org.uk/listing/the-list/list-entry/1018969' },
      { text: 'On 2 July 1667 about 800 Dutch troops attacked the fort and were driven off.', source: 'https://www.english-heritage.org.uk/visit/places/landguard-fort' },
    ] },
  { id: 'museum', kind: 'landmark', name: 'Felixstowe Museum', category: 'Museum', area: 'Landguard', lat: 51.93943, lon: 1.32057, osm: 'way 90494546', opening: 'Opening is seasonal; check the museum’s own website.',
    blurb: 'The town museum beside Landguard Fort.', trails: ['landguard_trail'], facts: [] },
  { id: 'landguard_reserve', kind: 'landmark', name: 'Landguard Nature Reserve', category: 'Nature reserve', area: 'Landguard', lat: 51.93736, lon: 1.32141, osm: 'way 685200051', opening: 'Keep to the paths. Parts may be fenced off while birds are nesting.',
    blurb: 'Shingle, grassland and views of the port.', trails: ['landguard_trail'],
    facts: [{ text: 'A Site of Special Scientific Interest and Local Nature Reserve of about 33 hectares, with rare vegetated shingle where ringed plovers nest.', source: 'https://landguard.com/ecology/' }] },
  { id: 'ferry', kind: 'landmark', name: 'Felixstowe Ferry', category: 'Harbour hamlet', area: 'Felixstowe Ferry', lat: 51.98844, lon: 1.38972, osm: 'node 96534235', opening: 'A public harbour area. The foot ferry to Bawdsey is seasonal.',
    blurb: 'A fishing hamlet where the River Deben meets the sea.', trails: ['ferry_morning'],
    facts: [{ text: 'A small fishing hamlet where the River Deben meets the sea, with two Napoleonic-era Martello towers and a seasonal foot and bike ferry to Bawdsey.', source: 'https://www.discoversuffolk.org.uk/easygoing-trails/felixstowe-ferry-easy-going-trails/' }] },
];

// A fictional community event used to demonstrate event check-ins.
export const EVENTS = [
  { id: 'beach_clean', name: 'Seafront litter pick (demo event)', locationId: 'martello_park', demo: true, when: 'Saturdays, 10:00–12:00 (fictional)', blurb: 'A fictional community litter pick used to demonstrate event check-ins. In a pilot, organisers would display the event’s code on the day.' },
  { id: 'town_meeting', name: 'Finale at Mr. Felixstowe’s Shelter (demo event)', locationId: 'town_hall_garden', demo: true, when: 'Any day (fictional)', blurb: 'A fictional gathering point for the final mayoral challenge.' },
];

// Quiz questions are built only from the sourced facts above.
export const QUIZZES = {
  history: { title: 'Felixstowe history quiz', pass: 5, questions: [
    { q: 'When did Felixstowe Pier first open?', a: ['August 1905', 'July 1875', 'May 1938', 'October 2017'], c: 0, src: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
    { q: 'About how long was the original pier?', a: ['About 200 m', 'About 800 m', 'About 2 km', 'About 50 m'], c: 1, src: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
    { q: 'In which year was the Spa Pavilion bombed?', a: ['1916', '1941', '1953', '1967'], c: 1, src: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
    { q: 'When was the present Landguard Fort built?', a: ['1540s', '1667', '1744–49', '1871–76'], c: 2, src: 'https://historicengland.org.uk/listing/the-list/list-entry/1018969' },
    { q: 'Who attacked Landguard Fort in July 1667?', a: ['French privateers', 'Dutch troops', 'Spanish sailors', 'Viking raiders'], c: 1, src: 'https://www.english-heritage.org.uk/visit/places/landguard-fort' },
    { q: 'Which railway company built Felixstowe station in 1898?', a: ['Great Western Railway', 'London & North Eastern Railway', 'Great Eastern Railway', 'Midland Railway'], c: 2, src: 'https://historicengland.org.uk/listing/the-list/list-entry/1284364' },
  ] },
  landguard: { title: 'Landguard heritage quiz', pass: 3, questions: [
    { q: 'What shape is the present Landguard Fort?', a: ['Square', 'Pentagonal', 'Circular', 'Star-shaped with eight points'], c: 1, src: 'https://historicengland.org.uk/listing/the-list/list-entry/1018969' },
    { q: 'Since when has Landguard Point been fortified?', a: ['The 1540s', 'The 1940s', 'The 1800s', 'Roman times'], c: 0, src: 'https://historicengland.org.uk/listing/the-list/list-entry/1018969' },
    { q: 'Which bird nests on the vegetated shingle at Landguard Nature Reserve?', a: ['Puffin', 'Ringed plover', 'Gannet', 'Golden eagle'], c: 1, src: 'https://landguard.com/ecology/' },
    { q: 'Landguard Fort is listed at which grade?', a: ['Grade I', 'Grade II', 'Grade II*', 'It is not listed'], c: 0, src: 'https://historicengland.org.uk/listing/the-list/list-entry/1030415' },
  ] },
  mayoral: { title: 'Mayoral knowledge quiz', pass: 7, questions: [
    { q: 'Who founded what became the Port of Felixstowe, in 1875?', a: ['Colonel George Tomline', 'Isambard Kingdom Brunel', 'Captain Nathaniel Darell', 'Harry Clegg'], c: 0, src: 'https://www.portoffelixstowe.co.uk/about/history/' },
    { q: 'When did the Landguard Container Terminal open?', a: ['1 July 1967', '7 April 1886', '1 January 1999', '26 August 2015'], c: 0, src: 'https://www.portoffelixstowe.co.uk/about/history/' },
    { q: 'How many Martello towers were built on the Felixstowe peninsula between 1805 and 1812?', a: ['Two', 'Five', 'Eight', 'Twenty'], c: 2, src: 'https://www.visitfelixstowe.org.uk/things-to-do/martello-towers' },
    { q: 'About how many bricks are in the restored Martello Tower P?', a: ['7,500', '75,000', '750,000', '7.5 million'], c: 2, src: 'https://www.visitfelixstowe.org.uk/things-to-do/martello-towers' },
    { q: 'How many seats does the Spa Pavilion theatre have?', a: ['250', '919', '1,500', '3,000'], c: 1, src: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
    { q: 'When did the restored Seafront Gardens officially reopen?', a: ['26 August 2015', '1 July 1967', '2 July 1667', 'August 1905'], c: 0, src: 'https://felixstowe.gov.uk/seafront-gardens-officially-open/' },
    { q: 'In which year did the Felixstowe branch line open?', a: ['1838', '1877', '1898', '1950'], c: 1, src: 'https://heritage.suffolk.gov.uk/Monument/MSF34997' },
    { q: 'In which year was Felixstowe Town Hall built?', a: ['1838', '1892', '1927', '1974'], c: 1, src: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
    { q: 'Who designed Felixstowe Town Hall?', a: ['George Horton', 'Colonel George Tomline', 'Felix Cobbold', 'Harry Clegg'], c: 0, src: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
  ] },
};

// Mission steps: discover:<loc>, visit:<loc> (verified check-in), visitAny:<n>:<kind>, quiz:<id>,
// event:<id> (event code check-in), repeat:<loc>:<days>, stamps:<n>, rank:<rankId>, mission:<id>, riddle:<id>
export const MISSIONS = [
  // A. Business missions (one per demonstration business)
  ...LOCATIONS.filter((l) => l.kind === 'business').map((l) => ({
    id: 'visit_' + l.id, category: 'business', title: `Visit ${l.name}`, difficulty: 'Easy', xp: 50, demo: true,
    description: `Find ${l.name} in the 3D town, then visit it in the 3D town.`, locationId: l.id,
    steps: [`discover:${l.id}`, `visit:${l.id}`], physical: true, sponsored: !!l.sponsored,
  })),
  { id: 'high_street', category: 'business', type: 'trail', title: 'The High Street Challenge', difficulty: 'Medium', xp: 250, badge: 'high_street_hero', demo: true,
    description: 'Discover five businesses in the town centre, visit each one and collect five stamps.',
    steps: ['kittiwake', 'marram', 'lantern', 'oldsignal', 'shingle'].flatMap((id) => [`discover:${id}`, `visit:${id}`]), physical: true },
  { id: 'stamp_collector', category: 'business', title: 'Stamp collector', difficulty: 'Medium', xp: 100, demo: true,
    description: 'Collect stamps from any five businesses by visiting each one.', steps: ['stamps:5'], physical: true },
  { id: 'regular_kittiwake', category: 'business', title: 'A regular at the Kittiwake', difficulty: 'Medium', xp: 75, demo: true, locationId: 'kittiwake',
    description: 'Visit The Kittiwake Bakehouse on two different days.', steps: ['repeat:kittiwake:2'], physical: true },
  { id: 'ferry_morning', category: 'business', type: 'trail', title: 'A morning at the Ferry', difficulty: 'Medium', xp: 120, sponsored: true, sponsor: 'tidewrack', demo: true,
    description: 'Sponsored by Tidewrack Coffee (demo). Visit the café, then the harbour at Felixstowe Ferry.', steps: ['discover:tidewrack', 'visit:tidewrack', 'discover:ferry', 'visit:ferry'], physical: true },
  // B. Exploration missions
  { id: 'three_landmarks', category: 'exploration', title: 'Landmark hunter', difficulty: 'Easy', xp: 80,
    description: 'Discover three real landmarks in the 3D town and visit them in the 3D town.', steps: ['visitAny:3:landmark'], physical: true },
  { id: 'history_quiz', category: 'exploration', title: 'Felixstowe history quiz', difficulty: 'Easy', xp: 60,
    description: 'Six questions on the pier, the Spa Pavilion, Landguard Fort and the railway. You can do this anywhere.', steps: ['quiz:history'], physical: false },
  { id: 'seafront_explorer', category: 'exploration', type: 'trail', title: 'The Seafront Explorer', difficulty: 'Medium', xp: 250, badge: 'seafront_explorer',
    description: 'Walk the seafront from the pier to Martello Park. At each stop, check in or answer the stop question.',
    steps: ['pier', 'town_hall', 'spa', 'martello_park'].flatMap((id) => [`discover:${id}`, `stop:${id}`]), physical: 'mixed' },
  { id: 'riddle_pier', category: 'exploration', title: 'Riddle: the half-mile landing stage', difficulty: 'Easy', xp: 80, riddle: 'I once stretched half a mile into the sea and carried an electric tram. Find what remains of me, and check in there.',
    description: 'Solve the riddle, then go to the place it describes.', steps: ['visit:pier'], hideTarget: true, physical: true },
  { id: 'landguard_trail', category: 'exploration', type: 'trail', title: 'Landguard heritage trail', difficulty: 'Hard', xp: 250, badge: 'heritage_keeper',
    description: 'Visit the fort, the museum and the nature reserve, then pass the Landguard quiz.',
    steps: ['discover:landguard_fort', 'visit:landguard_fort', 'discover:museum', 'visit:museum', 'discover:landguard_reserve', 'visit:landguard_reserve', 'quiz:landguard'], physical: true },
  // C. Community missions
  { id: 'beach_clean', category: 'community', title: 'Seafront litter pick', difficulty: 'Medium', xp: 150, demo: true, eventId: 'beach_clean',
    description: 'Join the (fictional) Saturday litter pick at Martello Park and join in.', steps: ['event:beach_clean'], physical: true },
  { id: 'community_space', category: 'community', title: 'Discover a community space', difficulty: 'Easy', xp: 60,
    description: 'Find The Triangle, the town-centre garden, and visit it in the 3D town.', steps: ['discover:triangle', 'visit:triangle'], physical: true },
  { id: 'heritage_challenge', category: 'community', title: 'Heritage challenge', difficulty: 'Medium', xp: 120,
    description: 'Visit Landguard Fort and pass the Landguard heritage quiz.', steps: ['visit:landguard_fort', 'quiz:landguard'], physical: true },
  // Final challenge
  { id: 'mayoral_challenge', category: 'mayoral', type: 'final', title: 'The Mayoral Challenge', difficulty: 'Final', xp: 500, badge: 'mayor',
    description: 'Walk the Mayor’s Walk (station, The Triangle, the Town Hall), pass the mayoral knowledge quiz, then join the finale beside the Town Hall at Mr. Felixstowe’s Shelter in the Town Hall Garden. Everything happens outdoors in public places.',
    steps: ['rank:candidate', 'visit:station', 'visit:triangle', 'visit:town_hall', 'quiz:mayoral', 'event:town_meeting'], physical: true },
];

export const RIVALS = [ // fictional players for the demo leaderboard
  { id: 'r1', name: 'GullWatcher', colour: '#0f7c7a', base: 1480, rate: 41 },
  { id: 'r2', name: 'PromenadePip', colour: '#ef6f5e', base: 1210, rate: 37 },
  { id: 'r3', name: 'FerryFan', colour: '#f2b632', base: 990, rate: 33 },
  { id: 'r4', name: 'HuttieHannah', colour: '#4b6cb7', base: 760, rate: 28 },
  { id: 'r5', name: 'MartelloMo', colour: '#7a5c99', base: 610, rate: 24 },
  { id: 'r6', name: 'TideTimes', colour: '#2f7d4f', base: 420, rate: 19 },
  { id: 'r7', name: 'SaltySue', colour: '#c4572f', base: 260, rate: 15 },
  { id: 'r8', name: 'ShingleSam', colour: '#10233f', base: 110, rate: 9 },
];

export const ACHIEVEMENTS = [
  { id: 'first_steps', title: 'First steps', text: 'Discover your first location.' },
  { id: 'first_stamp', title: 'First stamp', text: 'Check in at a business for the first time.' },
  { id: 'five_stamps', title: 'Stamp book', text: 'Collect five business stamps.' },
  { id: 'all_stamps', title: 'Full stamp book', text: 'Collect every business stamp.' },
  { id: 'landmark_hunter', title: 'Landmark hunter', text: 'Visit five real landmarks.' },
  { id: 'high_street_hero', title: 'High Street hero', text: 'Complete the High Street Challenge.' },
  { id: 'seafront_explorer', title: 'Seafront explorer', text: 'Complete the Seafront Explorer trail.' },
  { id: 'heritage_keeper', title: 'Heritage keeper', text: 'Complete the Landguard heritage trail.' },
  { id: 'know_it_all', title: 'Know-it-all', text: 'Score full marks in the history quiz.' },
  { id: 'good_neighbour', title: 'Good neighbour', text: 'Complete a community mission.' },
  { id: 'regular', title: 'Regular', text: 'Check in at the same business on two different days.' },
  { id: 'candidate', title: 'On the ballot', text: 'Reach the rank of Mayoral Candidate.' },
  { id: 'mayor', title: 'On the Town Hall steps', text: 'Win the Mayoral Challenge this season and take the fictional title of Mayor of Felixstowe.' },
];

export const COSMETICS = [ // unlocked by rank; worn by your avatar in the 3D town
  { id: 'coat_navy', type: 'coat', name: 'Harbour navy coat', colour: 0x24395c, rank: 'newcomer' },
  { id: 'coat_teal', type: 'coat', name: 'Teal walking jacket', colour: 0x0f7c7a, rank: 'explorer' },
  { id: 'hat_bucket', type: 'hat', name: 'Bucket hat', hat: 'bucket', colour: 0xf2b632, rank: 'explorer' },
  { id: 'coat_coral', type: 'coat', name: 'Coral rain jacket', colour: 0xe0604f, rank: 'champion' },
  { id: 'hat_sailor', type: 'hat', name: 'Sailor’s cap', hat: 'sailor', colour: 0xf4f1ea, rank: 'advocate' },
  { id: 'coat_gold', type: 'coat', name: 'Campaign gold blazer', colour: 0xd9a52b, rank: 'candidate' },
  { id: 'hat_top', type: 'hat', name: 'Mayoral top hat', hat: 'top', colour: 0x14202b, rank: 'mayor' },
  { id: 'chain', type: 'chain', name: 'Chain of office (game prop)', rank: 'mayor' },
];

// One question per Seafront Explorer stop: answering counts as a knowledge stop, never as a visit.
export const STOP_QUESTIONS = {
  pier: { q: 'What carried visitors along the original pier?', a: ['A steam railway', 'An electric tramway', 'A horse-drawn bus', 'A cable car'], c: 1, src: 'https://heritage.suffolk.gov.uk/Monument/MXS19251' },
  town_hall: { q: 'What material are the Town Hall\u2019s decorative dressings and festoon panels made of?', a: ['Flint', 'Terracotta', 'Marble', 'Cast iron'], c: 1, src: 'https://en.wikipedia.org/wiki/Felixstowe_Town_Hall' },
  spa: { q: 'What stood on the Spa Pavilion’s site before 1938?', a: ['A lighthouse', 'The Floral Hall', 'A railway station', 'A Martello tower'], c: 1, src: 'https://database.theatrestrust.org.uk/resources/theatres/show/140-spa-pavilion' },
  martello_park: { q: 'How were Felixstowe’s Martello towers named?', a: ['After admirals', 'With numbers', 'With letters of the alphabet', 'After saints'], c: 2, src: 'https://www.visitfelixstowe.org.uk/things-to-do/martello-towers' },
};

// The campaign story: each rank is a chapter on the road to the Town Hall, and lights up part of it.
export const CHAPTERS = {
  newcomer: { n: 1, title: 'Off the train', text: 'You\u2019ve arrived in Felixstowe with one ambition: to win the race to the Town Hall. First, get to know the town.', lights: 'The Town Hall is dark. Every rank you earn lights up part of it.' },
  explorer: { n: 2, title: 'Finding your feet', text: 'Shopkeepers are starting to know your face. Keep collecting stamps from local businesses.', lights: 'The ground-floor windows are lit.' },
  champion: { n: 3, title: 'A friend of the town', text: 'You\u2019ve given something back to the community. People are talking about your campaign.', lights: 'The first-floor windows are lit.' },
  advocate: { n: 4, title: 'The talk of the town', text: 'Trails walked, landmarks learned. You know Felixstowe better than most.', lights: 'The front doors are lit.' },
  candidate: { n: 5, title: 'On the ballot', text: 'You\u2019re a Mayoral Candidate. The final challenge is open: walk to the Town Hall.', lights: 'The gable is lit. Only the beacon remains.' },
  mayor: { n: 6, title: 'The Town Hall steps', text: 'You finished the Mayor\u2019s Walk on the Town Hall steps. You are this season\u2019s Mayor of Felixstowe \u2013 a fictional game title.', lights: 'The whole Town Hall is lit, and the beacon shines.' },
};
