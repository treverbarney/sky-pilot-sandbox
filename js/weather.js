import { WIND } from './world.js';

/** Six flyable weather desks. Wind FROM heading. SI in helpers. */

const KT = 0.514444;

export const PRESETS = {
  calm: {
    id: 'calm',
    label: 'Calm',
    blurb: 'Glass air. 3 kt drift. Takeoff and landing are honest.',
    fromDeg: 360,
    speedKt: 3,
    gust: 1,
    rain: 0,
    turb: 0,
    fog: 0.00016,
    shear: 0,
    wet: 0,
    dens: 1,
    shift: 0
  },
  haze: {
    id: 'haze',
    label: 'Hot haze',
    blurb: 'Thin air, lazy thermals. Long roll. Light ships float on landing.',
    fromDeg: 220,
    speedKt: 8,
    gust: 4,
    rain: 0,
    turb: 0.22,
    fog: 0.00022,
    shear: 0.15,
    wet: 0,
    dens: 0.86,
    shift: 0.25
  },
  headwind: {
    id: 'headwind',
    label: 'Headwind',
    blurb: '18 kt down the runway. Short takeoff. Steep, slow groundspeed on final.',
    fromDeg: 360,
    speedKt: 18,
    gust: 3,
    rain: 0,
    turb: 0.08,
    fog: 0.00018,
    shear: 0.2,
    wet: 0,
    dens: 1,
    shift: 0
  },
  crosswind: {
    id: 'crosswind',
    label: 'Crosswind',
    blurb: '20 kt from the right. Crab or wing-low. Light gear wants to weathervane.',
    fromDeg: 90,
    speedKt: 20,
    gust: 5,
    rain: 0,
    turb: 0.28,
    fog: 0.00018,
    shear: 0.12,
    wet: 0,
    dens: 1,
    shift: 0
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    blurb: 'Scud and a wet runway. Brakes fade. Chute gets heavy. See less.',
    fromDeg: 240,
    speedKt: 14,
    gust: 7,
    rain: 0.7,
    turb: 0.32,
    fog: 0.00042,
    shear: 0.25,
    wet: 0.7,
    dens: 0.97,
    shift: 0.15
  },
  storm: {
    id: 'storm',
    label: 'Severe storm',
    blurb: '40–55 kt, swinging. Shear, rain, gusts. Gyro and blimp will get owned.',
    fromDeg: 200,
    speedKt: 42,
    gust: 18,
    rain: 1,
    turb: 1.15,
    fog: 0.00055,
    shear: 0.7,
    wet: 1,
    dens: 0.94,
    shift: 1
  }
};

export const PRESET_ORDER = ['calm', 'haze', 'headwind', 'crosswind', 'rain', 'storm'];

export const weather = {
  preset: 'calm',
  fromDeg: 360,
  speedKt: 3,
  gustKt: 0,
  rain: 0,
  turb: 0,
  fog: 0.00016,
  shear: 0,
  wet: 0,
  dens: 1,
  x: 0,
  z: 0,
  _gustT: 0,
  _shiftT: 16
};

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

export function setWeather(id) {
  const p = PRESETS[id] || PRESETS.calm;
  weather.preset = p.id;
  weather.rain = p.rain;
  weather.turb = p.turb;
  weather.fog = p.fog;
  weather.shear = p.shear;
  weather.wet = p.wet;
  weather.dens = p.dens;
  weather._shiftT = p.shift > 0.5 ? 4 : 14;
  applyWind(p.fromDeg, p.speedKt);
  return p;
}

/** Wind at AGL. Shear: stronger aloft, weaker in the weeds. Storm inverts near surface in gusts. */
export function windAt(agl = 0) {
  const t = Math.min(1, Math.max(0, agl / 90));
  const shear = weather.shear || 0;
  const surface = 1 - shear * 0.42;
  const aloft = 1 + shear * 0.38;
  let scale = surface + (aloft - surface) * t;
  if (weather.preset === 'storm' && agl < 25) {
    scale *= 0.75 + 0.55 * Math.abs(Math.sin(weather._gustT * 1.3));
  }
  return { x: weather.x * scale, z: weather.z * scale };
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
  const p = PRESETS[weather.preset] || PRESETS.calm;
  weather._gustT += dt;
  const pulse = 0.35 + 0.65 * Math.abs(Math.sin(weather._gustT * (0.55 + p.gust * 0.04)));
  weather.gustKt = p.gust * pulse;

  if (p.shift > 0) {
    weather._shiftT -= dt;
    if (weather._shiftT <= 0) {
      weather._shiftT = p.shift > 0.6 ? 3 + Math.random() * 5 : 8 + Math.random() * 8;
      const swing = p.shift > 0.6 ? 55 : 22;
      const dir = p.fromDeg + (Math.random() * 2 - 1) * swing;
      const kt = Math.max(4, p.speedKt + (Math.random() * 2 - 1) * (p.gust * 0.6));
      applyWind(dir, kt);
    }
  }
  syncVec();
}

export function weatherLabel() {
  const p = PRESETS[weather.preset] || PRESETS.calm;
  const from = Math.round(weather.fromDeg) % 360 || 360;
  const kt = Math.round(weather.speedKt + weather.gustKt);
  return `${p.label} · ${kt} kt from ${from}`;
}

export function currentPreset() {
  return PRESETS[weather.preset] || PRESETS.calm;
}

// Back-compat for older call sites
export const STORM = {
  0: PRESETS.calm,
  1: PRESETS.haze,
  2: PRESETS.crosswind,
  3: PRESETS.storm
};
export function setStorm(level) {
  const map = ['calm', 'haze', 'crosswind', 'storm'];
  setWeather(map[Math.max(0, Math.min(3, level | 0))] || 'calm');
}
export function setStormAuto(on) {
  if (on) setWeather('storm');
  else setWeather('calm');
}

syncVec();
