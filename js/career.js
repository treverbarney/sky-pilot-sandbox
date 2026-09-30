/** Pilotwings-style tests, medals, unlocks, hidden stars. */

const KEY = 'sky-pilot-medals-v1';
const STAR_KEY = 'sky-pilot-stars-v1';

export const MEDAL = {
  none: { label: '—', min: 0 },
  bronze: { label: 'BRONZE', min: 70 },
  silver: { label: 'SILVER', min: 80 },
  gold: { label: 'GOLD', min: 90 }
};

/** How many bronze+ medals to unlock each airframe. Cessna is always free. */
export const UNLOCK_NEED = {
  cessna182: 0,
  amphibian: 1,
  glider: 1,
  heli: 1,
  privatejet: 1,
  aerobatic: 1,
  cargo: 2,
  f15: 2,
  airliner: 3,
  area51: 4,
  gyro: 1,
  duster: 1,
  blimp: 0
};

export function medalFor(points) {
  if (points >= 90) return 'gold';
  if (points >= 80) return 'silver';
  if (points >= 70) return 'bronze';
  return 'none';
}

export function loadBook() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function bronzeCount() {
  return Object.values(loadBook()).filter((b) => b && b.points >= 70).length;
}

export function isUnlocked(id) {
  return true;
}

export function licenseLocked(id) {
  const need = UNLOCK_NEED[id];
  if (need == null) return false;
  return bronzeCount() < need;
}

export function saveBest(aircraftId, result) {
  const book = loadBook();
  const prev = book[aircraftId];
  if (!prev || result.points > prev.points) {
    book[aircraftId] = {
      points: result.points,
      medal: result.medal,
      rings: result.rings,
      at: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(book));
    return { best: true, book };
  }
  return { best: false, book };
}

export function scoreTest({ ringsHit, ringsTotal, landScore, crashed, stars = 0 }) {
  if (crashed) {
    return { points: Math.min(40, ringsHit * 8), medal: 'none', rings: ringsHit, grade: 'FAIL', stars };
  }
  const ringPts = ringsTotal ? Math.round((ringsHit / ringsTotal) * 50) : 0;
  const landPts = landScore?.points != null
    ? Math.round((landScore.points / 100) * 50)
    : 28;
  const bonus = Math.min(6, stars * 2);
  const points = Math.max(0, Math.min(100, ringPts + landPts + bonus));
  return {
    points,
    medal: medalFor(points),
    rings: ringsHit,
    ringsTotal,
    grade: medalFor(points) === 'none' ? 'PASS' : MEDAL[medalFor(points)].label,
    ringPts,
    landPts,
    stars
  };
}

export function bestFor(id) {
  return loadBook()[id] || null;
}

export function loadStars() {
  try {
    return JSON.parse(localStorage.getItem(STAR_KEY) || '[]') || [];
  } catch {
    return [];
  }
}

export function saveStar(id) {
  const have = new Set(loadStars());
  if (have.has(id)) return false;
  have.add(id);
  localStorage.setItem(STAR_KEY, JSON.stringify([...have]));
  return true;
}

export function testKindFor(spec) {
  if (!spec) return 'circuit';
  if (spec.id === 'amphibian') return 'lake';
  if (spec.type === 'glider' || spec.id === 'f15' || spec.id === 'area51') return 'peak';
  if (spec.id === 'airliner' || spec.id === 'cargo') return 'city';
  if (spec.isHeli) return 'hover';
  if (spec.id === 'duster') return 'circuit';
  if (spec.id === 'blimp' || spec.id === 'gyro') return 'circuit';
  return 'circuit';
}
