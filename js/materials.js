import * as THREE from 'three';

/** Quality: low | medium | high — persisted in localStorage */
export const QUALITY = {
  low: { dpr: 1.0, useEnv: false, useStandardWorld: false, clouds: false, anisotropy: 2, label: 'Low' },
  medium: { dpr: 1.6, useEnv: true, useStandardWorld: true, clouds: true, anisotropy: 4, label: 'Medium' },
  high: { dpr: 2.0, useEnv: true, useStandardWorld: true, clouds: true, anisotropy: 8, label: 'High' }
};

export function getQualityKey() {
  try {
    const k = localStorage.getItem('skyPilotQuality');
    if (k && QUALITY[k]) return k;
  } catch (_) { /* ignore */ }
  return 'high';
}

export function setQualityKey(k) {
  if (!QUALITY[k]) return getQualityKey();
  try { localStorage.setItem('skyPilotQuality', k); } catch (_) { /* ignore */ }
  return k;
}

const TEX_BASE = 'assets/textures/';

const TEX_FILES = {
  runway: 'runway.png',
  grass: 'grass.png',
  water: 'water.png',
  rock: 'rock.png',
  facade: 'facade.png',
  sky: 'sky.png',
  clouds: 'clouds.png',
  aircraftMetal: 'aircraft-metal.png',
  aircraftPaint: 'aircraft-paint.png',
  aircraftComposite: 'aircraft-composite.png'
};

/** @type {Record<string, THREE.Texture>|null} */
let _textures = null;
let _envMap = null;

export function getTextures() {
  return _textures;
}

export function getEnvMap() {
  return _envMap;
}

function prepColorMap(tex, renderer, repeatX = 1, repeatY = 1) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const aniso = renderer
    ? Math.min(4, renderer.capabilities.getMaxAnisotropy())
    : 4;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Load all atlases. Call once after renderer exists.
 * @returns {Promise<{textures: object, envMap: THREE.Texture|null}>}
 */
export async function loadGraphicsAssets(renderer, qualityKey = getQualityKey()) {
  const q = QUALITY[qualityKey] || QUALITY.medium;
  const loader = new THREE.TextureLoader();
  const textures = {};

  await Promise.all(
    Object.entries(TEX_FILES).map(
      ([key, file]) =>
        new Promise((resolve) => {
          loader.load(
            TEX_BASE + file,
            (tex) => {
              prepColorMap(tex, renderer);
              textures[key] = tex;
              resolve();
            },
            undefined,
            () => {
              console.warn('[Sky Pilot] texture miss', file);
              resolve();
            }
          );
        })
    )
  );

  // Sky equirect-ish for PMREM — treat as env source
  let envMap = null;
  if (q.useEnv && textures.sky && renderer) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      // Sky is a gradient sheet; still gives soft stylized reflections
      const rt = pmrem.fromEquirectangular(textures.sky);
      envMap = rt.texture;
      pmrem.dispose();
    } catch (err) {
      console.warn('[Sky Pilot] PMREM failed', err);
    }
  }

  _textures = textures;
  _envMap = envMap;
  return { textures, envMap };
}

export function makeToonPbr({
  color = 0xffffff,
  map = null,
  roughness = 0.52,
  metalness = 0.08,
  emissive = 0x000000,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  envMapIntensity = 0.62,
  flatShading = false,
  side = THREE.FrontSide
} = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    map,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    transparent,
    opacity,
    envMapIntensity,
    flatShading,
    fog: true,
    side
  });
  if (_envMap) m.envMap = _envMap;
  return m;
}

export function makeFarLambert(color, map = null, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    map,
    flatShading: true,
    fog: true,
    ...opts
  });
}

export function makeGlass() {
  const m = makeToonPbr({
    color: 0x9ad8ff,
    roughness: 0.12,
    metalness: 0.12,
    transparent: true,
    opacity: 0.48,
    envMapIntensity: 0.95
  });
  return m;
}

/** Shared aircraft material kit from atlases + tint */
export function aircraftKit(spec, qualityKey = getQualityKey()) {
  const q = QUALITY[qualityKey] || QUALITY.medium;
  const tex = _textures || {};
  const useStd = q.useStandardWorld !== false;

  const paintMap = tex.aircraftPaint || null;
  const metalMap = tex.aircraftMetal || null;
  const compMap = tex.aircraftComposite || null;

  let bodyMap = paintMap;
  let metalness = 0.1;
  let roughness = 0.52;
  let envI = 0.58;

  if (spec.type === 'fighter' || spec.type === 'experimental') {
    bodyMap = compMap || paintMap;
    metalness = spec.type === 'experimental' ? 0.5 : 0.25;
    roughness = spec.type === 'experimental' ? 0.3 : 0.4;
    envI = 0.55;
  } else if (spec.id === 'airliner' || spec.id === 'privatejet') {
    metalness = 0.12;
    roughness = 0.45;
    envI = 0.5;
  } else if (spec.id === 'cargo') {
    metalness = 0.1;
    roughness = 0.75;
    envI = 0.3;
  } else if (spec.type === 'glider') {
    metalness = 0.08;
    roughness = 0.35;
    envI = 0.5;
  }

  if (!useStd) {
    return {
      body: makeFarLambert(spec.color, bodyMap),
      accent: makeFarLambert(spec.accent, paintMap),
      dark: makeFarLambert(0x2a2a32),
      glass: new THREE.MeshLambertMaterial({
        color: 0x88ccee,
        transparent: true,
        opacity: 0.55,
        flatShading: true
      }),
      metal: makeFarLambert(0xb8c0c8, metalMap),
      tire: makeFarLambert(0x1a1a1a),
      emissive: makeFarLambert(0x00e5ff, null, { emissive: 0x00e5ff })
    };
  }

  const body = makeToonPbr({
    color: spec.color,
    map: bodyMap,
    roughness,
    metalness,
    envMapIntensity: envI,
    emissive: spec.type === 'experimental' ? 0x00e5ff : 0x000000,
    emissiveIntensity: spec.type === 'experimental' ? 0.15 : 0
  });

  return {
    body,
    accent: makeToonPbr({
      color: spec.accent,
      map: paintMap,
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 0.35
    }),
    dark: makeToonPbr({
      color: 0x2a2a32,
      map: compMap,
      roughness: 0.7,
      metalness: 0.35,
      envMapIntensity: 0.3
    }),
    glass: makeGlass(),
    metal: makeToonPbr({
      color: 0xb8c0c8,
      map: metalMap,
      roughness: 0.4,
      metalness: 0.55,
      envMapIntensity: 0.55
    }),
    tire: makeToonPbr({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.05,
      envMapIntensity: 0.15
    }),
    oleo: makeToonPbr({
      color: 0x888898,
      map: metalMap,
      roughness: 0.35,
      metalness: 0.65,
      envMapIntensity: 0.5
    }),
    emissive: makeToonPbr({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.2
    })
  };
}

export function applyRendererQuality(renderer, qualityKey = getQualityKey()) {
  const q = QUALITY[qualityKey] || QUALITY.medium;
  const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
  renderer.setPixelRatio(dpr);
  return q;
}
