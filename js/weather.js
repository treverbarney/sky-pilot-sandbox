import { WIND } from './world.js';

/** Shared weather — wind FROM heading, storm levels, live gusts. SI in helpers. */

const KT = 0.514444;

export const STORM = {
  0: { label: 'Clear', minKt: 0, maxKt: 8, gust: 2, rain: 0, turb: 0, fog: 0.00018 },
  1: { label: 'Storm 1', minKt: 16, maxKt: 26, gust: 8, rain: 0.35, turb: 0.35, fog: 0.00028 },
  2: { label: 'Storm 2', minKt: 26, maxKt: 38, gust: 14, rain: 0.65, turb: 0.7, fog: 0.00038 },
  3: { label: 'Storm 3', minKt: 36, maxKt: 52, gust: 22, rain: 1, turb: 1.1, fog: 0.0005 }
};

export const weather = {
  fromDeg: 360,
  speedKt: 6,
  gustKt: 0,
  storm: 0,
  stormAuto: false,
  rain: 0,
  turb: 0,
  x: 0,
  z: 0,
  _gustT: 0,
  _shiftT: 12
};

/** Wind FROM deg 0 = from +Z (game north) toward −Z. */
export function windComponents(fromDeg, speedMs) {
  const rad = (fromDeg * Math.PI) / 180;
  return {
    x: -Math.sin(rad) * speedMs,
    z: -Math.cos(rad) * speedMs
  };
}

export function applyWind(fromDeg, speedKt) {
  weather.fromDeg = ((fromDeg % 360) + 360) % 360 || 360;
  weather.speedKt = Math.max(0, Math.min(70, speedKt));
  syncVec();
}

export function setStorm(level) {
  const lv = Math.max(0, Math.min(3, level | 0));
  weather.storm = lv;
  const s = STORM[lv];
  weather.rain = s.rain;
  weather.turb = s.turb;
  if (lv === 0) {
    weather.stormAuto = false;
    applyWind(weather.fromDeg, Math.min(weather.speedKt, 8));
  } else {
    const mid = (s.minKt + s.maxKt) * 0.5;
    applyWind(weather.fromDeg, mid);
  }
}

export function setStormAuto(on) {
  weather.stormAuto = !!on;
  if (on && weather.storm === 0) setStorm(1);
}

function syncVec() {
  const gust = weather.gustKt * KT;
  const base = weather.speedKt * KT;
  const w = windComponents(weather.fromDeg, base + gust);
  weather.x = w.x;
  weather.z = w.z;
  WIND.x = w.x;
  WIND.z = w.z;
}

export function updateWeather(dt) {
  const s = STORM[weather.storm] || STORM[0];
  weather._gustT += dt;
  const gAmp = s.gust * (0.35 + 0.65 * Math.abs(Math.sin(weather._gustT * (0.7 + weather.storm * 0.35))));
  weather.gustKt = weather.stormAuto || weather.storm > 0 ? gAmp : Math.min(gAmp * 0.25, 2);

  if (weather.stormAuto) {
    weather._shiftT -= dt;
    if (weather._shiftT <= 0) {
      weather._shiftT = 8 + Math.random() * 10;
      const band = STORM[weather.storm] || STORM[1];
      const kt = band.minKt + Math.random() * (band.maxKt - band.minKt);
      const dir = weather.fromDeg + (Math.random() * 70 - 35);
      applyWind(dir, kt);
    }
  }
  syncVec();
}

export function weatherLabel() {
  const from = Math.round(weather.fromDeg) % 360 || 360;
  const kt = Math.round(weather.speedKt + weather.gustKt);
  const storm = weather.storm ? ` · ${STORM[weather.storm].label}` : '';
  return `${kt} kt from ${from}${storm}`;
}

syncVec();
