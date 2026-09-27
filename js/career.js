/** Pilotwings-style flight tests + local medal book. */

const KEY = 'sky-pilot-medals-v1';

export const MEDAL = {
  none: { label: '—', min: 0 },
  bronze: { label: 'BRONZE', min: 70 },
  silver: { label: 'SILVER', min: 80 },
  gold: { label: 'GOLD', min: 90 }
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

/** Score like Pilotwings 64: rings + landing quality, 100 max. */
export function scoreTest({ ringsHit, ringsTotal, landScore, crashed }) {
  if (crashed) {
    return { points: Math.min(40, ringsHit * 8), medal: 'none', rings: ringsHit, grade: 'FAIL' };
  }
  const ringPts = ringsTotal ? Math.round((ringsHit / ringsTotal) * 50) : 0;
  const landPts = landScore?.points != null
    ? Math.round((landScore.points / 100) * 50)
    : 28;
  const points = Math.max(0, Math.min(100, ringPts + landPts));
  return {
    points,
    medal: medalFor(points),
    rings: ringsHit,
    ringsTotal,
    grade: medalFor(points) === 'none' ? 'PASS' : MEDAL[medalFor(points)].label,
    ringPts,
    landPts
  };
}

export function bestFor(id) {
  return loadBook()[id] || null;
}
