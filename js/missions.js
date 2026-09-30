/** Job packs — destinations and tasks, not rings. Player picks the ship. */

export const PACKS = [
  { id: 'off-airport', name: 'Off-airport' },
  { id: 'work', name: 'Work tickets' },
  { id: 'recovery', name: 'Get home' }
];

export const MISSIONS = [
  {
    id: 'farm-stop',
    pack: 'off-airport',
    name: 'Farm stop',
    brief: 'Take off home. Land on the north farm dirt. Stay off the barn.',
    why: 'A Cub-class ship stops in a field. A jet eats the fence.',
    best: ['cessna182', 'duster', 'gyro'],
    good: ['amphibian', 'heli'],
    hard: ['airliner', 'f15', 'privatejet'],
    pad: 'farm-north',
    noRings: true,
    wx: { fromDeg: 360, speedKt: 8, storm: 0 }
  },
  {
    id: 'highway-putdown',
    pack: 'off-airport',
    name: 'Highway put-down',
    brief: 'Emergency. Land on the paved road toward the city. Keep it straight.',
    why: 'Two-lane works for a 182. An airliner needs a mile you do not have.',
    best: ['cessna182', 'gyro'],
    good: ['privatejet', 'heli'],
    hard: ['airliner', 'cargo'],
    pad: 'road-city',
    noRings: true,
    wx: { fromDeg: 20, speedKt: 10, storm: 0 }
  },
  {
    id: 'prairie-heavy',
    pack: 'off-airport',
    name: 'Prairie heavy',
    brief: 'Put the widebody on the east prairie. Long, flat, no pavement.',
    why: 'Possible if you float it on. Short fields will write the jet off.',
    best: ['airliner', 'cargo'],
    good: ['duster', 'cessna182'],
    hard: ['f15'],
    pad: 'prairie-east',
    noRings: true,
    wx: { fromDeg: 270, speedKt: 12, storm: 0 }
  },
  {
    id: 'lake-drop',
    pack: 'work',
    name: 'Lake drop',
    brief: 'Splash the amphib on the lake, then taxi to the beach.',
    why: 'Floats. Gear down on water is a wreck.',
    best: ['amphibian'],
    good: ['heli'],
    hard: ['cessna182', 'airliner'],
    pad: 'lake-beach',
    water: true,
    noRings: true,
    wx: { fromDeg: 280, speedKt: 8, storm: 0 }
  },
  {
    id: 'balloon-picnic',
    pack: 'work',
    name: 'Balloon picnic',
    brief: 'Lift off the pad. Drift. Set the basket in the south meadow.',
    why: 'A balloon can sit almost anywhere flat. Buildings will fold it.',
    best: ['blimp'],
    good: ['heli', 'gyro'],
    hard: ['f15'],
    pad: 'meadow-south',
    balloon: true,
    noRings: true,
    wx: { fromDeg: 90, speedKt: 6, storm: 0 }
  },
  {
    id: 'pumpjack-run',
    pack: 'work',
    name: 'Pumpjack run',
    brief: 'Land the west clearing by the oil field. Short and dusty.',
    why: 'Gyro or 182. The airliner will not get out again.',
    best: ['gyro', 'cessna182'],
    good: ['heli', 'duster'],
    hard: ['airliner', 'cargo'],
    pad: 'clearing-west',
    noRings: true,
    wx: { fromDeg: 200, speedKt: 14, storm: 0 }
  },
  {
    id: 'spray-pass',
    pack: 'work',
    name: 'Spray pass',
    brief: 'Work the farm at 20–40 m, then land the prairie.',
    why: 'Air Tractor is the tool.',
    best: ['duster'],
    good: ['cessna182'],
    hard: ['airliner', 'f15'],
    pad: 'prairie-east',
    low: 40,
    noRings: true,
    wx: { fromDeg: 300, speedKt: 7, storm: 0 }
  },
  {
    id: 'storm-home',
    pack: 'work',
    name: 'Storm home',
    brief: 'Storm 2. Get back on the home runway. Fly IAS.',
    why: 'Heavy iron tracks. A gyro weathervanes.',
    best: ['airliner', 'cargo'],
    good: ['cessna182', 'privatejet'],
    hard: ['gyro', 'blimp', 'glider'],
    pad: 'home',
    noRings: true,
    wx: { fromDeg: 220, speedKt: 28, storm: 2 }
  },
  {
    id: 'jump-drive',
    pack: 'recovery',
    name: 'Jump and drive',
    brief: 'Climb, JUMP, deploy, land in a field. Bike or car is waiting. Drive home.',
    why: 'The 182 is the jump ship. Then it is a ground problem.',
    best: ['cessna182', 'cargo'],
    good: ['amphibian', 'duster'],
    hard: ['glider'],
    pad: 'home',
    jump: true,
    noRings: true,
    wx: { fromDeg: 360, speedKt: 8, storm: 0 }
  },
  {
    id: 'ditch-boat',
    pack: 'recovery',
    name: 'Ditch and boat',
    brief: 'Put the amphib on the lake. Boat to shore. Ride back to the hangar.',
    why: 'Only the amphib makes this a story instead of a drowning.',
    best: ['amphibian'],
    good: ['heli'],
    hard: ['cessna182'],
    pad: 'lake-beach',
    water: true,
    noRings: true,
    wx: { fromDeg: 250, speedKt: 10, storm: 0 }
  },
  {
    id: 'city-lot',
    pack: 'off-airport',
    name: 'City lot',
    brief: 'Put a rotor or gyro on the downtown lot. Do not clip a building.',
    why: 'Hover or tiny roll. A 737 does not fit.',
    best: ['heli', 'gyro'],
    good: ['cessna182'],
    hard: ['airliner', 'cargo', 'f15'],
    pad: 'city-lot',
    noRings: true,
    wx: { fromDeg: 80, speedKt: 12, storm: 0 }
  },
  {
    id: 'shelf-land',
    pack: 'off-airport',
    name: 'North shelf',
    brief: 'Energy landing on the mountain shelf. No go-around if you are a glider.',
    why: 'Glider or Extra. Airliner will not make the dirt.',
    best: ['glider', 'aerobatic'],
    good: ['cessna182', 'f15'],
    hard: ['airliner', 'blimp'],
    pad: 'north-shelf',
    noRings: true,
    wx: { fromDeg: 240, speedKt: 16, storm: 0 }
  }
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function fitLabel(mission, aircraftId) {
  if (!mission) return 'OK';
  if (mission.best.includes(aircraftId)) return 'BEST';
  if (mission.good.includes(aircraftId)) return 'GOOD';
  if (mission.hard.includes(aircraftId)) return 'HARD';
  return 'OK';
}

const KEY = 'sky-pilot-missions-v2';

export function loadMissionBook() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveMissionResult(missionId, aircraftId, points) {
  const book = loadMissionBook();
  const prev = book[missionId];
  if (!prev || points > prev.points) {
    book[missionId] = { points, aircraftId, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(book));
  }
  return book;
}
