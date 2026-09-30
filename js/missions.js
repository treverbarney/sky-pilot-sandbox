/** Mission board — player picks the airframe; we recommend, we don't lock. */

export const MISSIONS = [
  {
    id: 'first-solo',
    name: 'First solo',
    brief: 'Three rings off the home runway and a greaser back on the numbers.',
    why: 'Forgiving stall, flaps, and time to think.',
    best: ['cessna182'],
    good: ['gyro', 'amphibian'],
    hard: ['airliner', 'f15'],
    kind: 'circuit',
    pad: 'home',
    wx: { fromDeg: 360, speedKt: 6, storm: 0 }
  },
  {
    id: 'lake-mail',
    name: 'Lake mail',
    brief: 'Ring the shoreline and put it on the beach — or the water if you brought floats.',
    why: 'Only the amphib is honest on the lake. Everything else is a bet.',
    best: ['amphibian'],
    good: ['heli', 'gyro'],
    hard: ['airliner', 'cargo'],
    kind: 'lake',
    pad: 'lake-beach',
    wx: { fromDeg: 270, speedKt: 10, storm: 0 }
  },
  {
    id: 'ridge-run',
    name: 'Ridge run',
    brief: 'Thread the north peak rings and land the shelf. Energy, not thrust.',
    why: 'Glider lives here. Extra can muscle it. Airliner will not.',
    best: ['glider'],
    good: ['aerobatic', 'f15', 'area51'],
    hard: ['airliner', 'blimp'],
    kind: 'peak',
    pad: 'north-shelf',
    wx: { fromDeg: 240, speedKt: 18, storm: 0 }
  },
  {
    id: 'city-express',
    name: 'City express',
    brief: 'Downtown rings, then the city lot. Tight, hot, no long runway.',
    why: 'A light jet or the gyro fits the lot. The widebody does not.',
    best: ['privatejet', 'gyro'],
    good: ['heli', 'gyro'],
    hard: ['airliner', 'cargo'],
    kind: 'city',
    pad: 'city-lot',
    wx: { fromDeg: 90, speedKt: 12, storm: 0 }
  },
  {
    id: 'heavy-haul',
    name: 'Heavy haul',
    brief: 'Four rings over the farm and a dirt landing at North farm.',
    why: 'The Herc is built for unpaved. The Mustang’s gear is not.',
    best: ['cargo', 'duster'],
    good: ['cessna182', 'amphibian'],
    hard: ['privatejet', 'f15'],
    kind: 'city',
    pad: 'farm-north',
    wx: { fromDeg: 180, speedKt: 8, storm: 0 }
  },
  {
    id: 'pad-rescue',
    name: 'Pad rescue',
    brief: 'Hover gates around the hangar, settle on the city lot like a rooftop.',
    why: 'Collective and VTOL. A Cessna can only crash the lot.',
    best: ['heli'],
    good: ['gyro'],
    hard: ['cessna182', 'airliner'],
    kind: 'hover',
    pad: 'city-lot',
    wx: { fromDeg: 40, speedKt: 14, storm: 0 }
  },
  {
    id: 'jump-run',
    name: 'Jump run',
    brief: 'Climb past 600 m AGL, JUMP, fly the body, DEPLOY, swoop the home field.',
    why: 'Stable jump ship. Fast jets spit you out at the wrong energy.',
    best: ['cessna182', 'cargo'],
    good: ['amphibian', 'duster'],
    hard: ['f15', 'glider'],
    kind: 'circuit',
    pad: 'home',
    jump: true,
    wx: { fromDeg: 360, speedKt: 8, storm: 0 }
  },
  {
    id: 'spray-dawn',
    name: 'Spray dawn',
    brief: 'Stay under 40 m over the farm rings, then land the prairie.',
    why: 'The duster is the tool. An airliner at 40 m is a headline.',
    best: ['duster'],
    good: ['cessna182', 'gyro'],
    hard: ['airliner', 'f15'],
    kind: 'circuit',
    pad: 'prairie-east',
    low: 40,
    wx: { fromDeg: 300, speedKt: 7, storm: 0 }
  },
  {
    id: 'storm-freight',
    name: 'Storm freight',
    brief: 'Storm 2, live wind. Rings then home runway. IAS, not groundspeed.',
    why: 'Heavy iron tracks better. A gyro will weathervane itself to death.',
    best: ['airliner', 'cargo'],
    good: ['privatejet', 'cessna182'],
    hard: ['gyro', 'glider', 'blimp'],
    kind: 'circuit',
    pad: 'home',
    wx: { fromDeg: 220, speedKt: 28, storm: 2 }
  },
  {
    id: 'patrol',
    name: 'Harbor patrol',
    brief: 'Drift the lake and city low and slow. Land anywhere later-field.',
    why: 'The blimp is the point. Anything faster is cheating the brief.',
    best: ['blimp'],
    good: ['heli', 'gyro'],
    hard: ['f15', 'aerobatic'],
    kind: 'lake',
    pad: 'lake-beach',
    wx: { fromDeg: 80, speedKt: 12, storm: 0 }
  }
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function fitLabel(mission, aircraftId) {
  if (mission.best.includes(aircraftId)) return 'BEST';
  if (mission.good.includes(aircraftId)) return 'GOOD';
  if (mission.hard.includes(aircraftId)) return 'HARD';
  return 'OK';
}

const KEY = 'sky-pilot-missions-v1';

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
