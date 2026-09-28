import * as THREE from 'three';
import { makeToonPbr, makeFarLambert } from './materials.js';

function box(g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

function cyl(g, a, b, h, s, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, s), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

function glow(g, r, color, x, y, z, name) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 8, 6),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 2.2, roughness: 0.4, metalness: 0.05
    })
  );
  m.position.set(x, y, z);
  if (name) m.name = name;
  g.add(m);
  return m;
}

/** Extra unique parts on top of each kit — silhouette + cabin + lights. */
export function addCraftDetails(g, spec) {
  const dark = makeFarLambert(0x1a1a22);
  const metal = makeToonPbr({ color: 0xb8c0c8, roughness: 0.35, metalness: 0.65 });
  const chrome = makeToonPbr({ color: 0xdde4ea, roughness: 0.2, metalness: 0.8 });
  const accent = makeFarLambert(spec.accent || 0x1e6ad8);
  const id = spec.id;

  if (id === 'cessna182') {
    box(g, 0.22, 0.16, 0.38, dark, -0.85, -0.62, 0.35); // wheel pant L
    box(g, 0.22, 0.16, 0.38, dark, 0.85, -0.62, 0.35);
    box(g, 0.16, 0.14, 0.3, dark, 0, -0.5, 1.85);
    box(g, 0.04, 0.55, 0.04, metal, 0, 1.55, -0.2); // VHF
    box(g, 0.03, 0.03, 0.35, metal, 1.6, 1.12, 0.7); // pitot
    glow(g, 0.08, 0xffe8a0, 0, 0.28, 2.72, 'landLight');
    box(g, 0.35, 0.08, 0.18, dark, 0, 0.18, 2.2); // exhaust
    box(g, 0.18, 0.12, 0.35, dark, 0.55, 0.12, 1.1); // step
    box(g, 0.08, 0.22, 0.55, accent, 0, 0.95, -1.55); // dorsal
    glow(g, 0.07, 0xff3030, 0, 1.55, -0.1, 'beacon');
  }

  if (id === 'privatejet') {
    box(g, 0.08, 0.55, 0.45, accent, -4.4, 0.42, -0.2); // winglet
    box(g, 0.08, 0.55, 0.45, accent, 4.4, 0.42, -0.2);
    box(g, 0.35, 0.7, 0.08, dark, 0.52, 0.55, 0.2); // airstair
    box(g, 0.12, 0.35, 0.55, dark, 0, 0.15, -2.85); // ventral
    cyl(g, 0.2, 0.26, 0.2, 10, dark, -0.72, 0.72, -3.12, Math.PI / 2);
    cyl(g, 0.2, 0.26, 0.2, 10, dark, 0.72, 0.72, -3.12, Math.PI / 2);
    glow(g, 0.07, 0xffe8a0, 0, 0.35, 3.15, 'taxi');
    box(g, 0.18, 0.04, 1.6, accent, 0, 0.95, -0.4); // cheatline
    box(g, 0.06, 0.16, 0.4, metal, 0.2, 0.82, 2.4); // probe
    glow(g, 0.06, 0xff3030, 0, 2.4, -2.55, 'beacon');
  }

  if (id === 'airliner') {
    for (const x of [-3.6, 3.6]) {
      cyl(g, 0.32, 0.32, 0.08, 12, chrome, x, -0.55, 1.52, Math.PI / 2); // fan
    }
    box(g, 0.35, 0.28, 0.55, metal, 0, 1.55, -5.6); // APU
    glow(g, 0.09, 0xffe8a0, 0, 0.4, 6.2, 'landLight');
    box(g, 0.08, 0.08, 0.7, metal, 0.4, 0.95, 5.6); // pitot
    box(g, 2.2, 0.08, 0.55, dark, -5.5, 0.22, -1.5); // slat hint
    box(g, 2.2, 0.08, 0.55, dark, 5.5, 0.22, -1.5);
    box(g, 0.9, 0.12, 0.9, dark, 0, -0.85, 2.4); // nose truck
    box(g, 1.2, 0.12, 1.4, dark, 0, -0.95, -1.6);
    box(g, 0.25, 0.08, 8.5, accent, 0, 1.05, 0.2);
    glow(g, 0.08, 0xff3030, 0, 3.4, -5.1, 'beacon');
  }

  if (id === 'f15') {
    box(g, 0.12, 1.15, 0.7, dark, -0.55, 0.95, -2.2); // twin tail L already + extra fence
    box(g, 0.35, 0.22, 1.1, dark, -0.55, 0.15, 1.6); // intake lip
    box(g, 0.35, 0.22, 1.1, dark, 0.55, 0.15, 1.6);
    cyl(g, 0.22, 0.28, 0.35, 10, dark, -0.42, 0.12, -2.85, Math.PI / 2); // AB petal
    cyl(g, 0.22, 0.28, 0.35, 10, dark, 0.42, 0.12, -2.85, Math.PI / 2);
    box(g, 0.08, 0.08, 1.4, metal, 0, 0.55, 2.4); // AOA probe
    box(g, 0.18, 0.08, 1.6, dark, -1.6, 0.12, 0.2); // rail
    box(g, 0.18, 0.08, 1.6, dark, 1.6, 0.12, 0.2);
    glow(g, 0.06, 0x66ffaa, 0, 0.72, 2.15, 'formation');
    glow(g, 0.07, 0xffaa33, 0, 0.12, -3.05, 'glow');
  }

  if (id === 'area51') {
    box(g, 2.8, 0.06, 0.08, accent, 0, 0.35, 0.4); // edge light
    cyl(g, 0.18, 0.28, 0.4, 8, metal, -0.5, -0.05, -1.6, Math.PI / 2);
    cyl(g, 0.18, 0.28, 0.4, 8, metal, 0.5, -0.05, -1.6, Math.PI / 2);
    glow(g, 0.12, 0x66ffcc, 0, 0.2, -1.85, 'glow');
    box(g, 0.4, 0.12, 0.4, dark, 0, 0.55, 1.1); // sensor
    box(g, 0.08, 0.25, 0.08, metal, 0.3, 0.7, 0.8);
    box(g, 1.1, 0.04, 1.8, makeFarLambert(0x223344), 0, 0.08, 0);
    glow(g, 0.05, 0x88ffee, -0.8, 0.15, 0.2);
    glow(g, 0.05, 0x88ffee, 0.8, 0.15, 0.2);
    box(g, 0.2, 0.2, 0.2, chrome, 0, 0.45, 1.55);
  }

  if (id === 'amphibian') {
    box(g, 1.15, 0.35, 3.6, dark, 0, -0.15, 0.2); // hull step
    cyl(g, 0.16, 0.16, 0.9, 8, dark, -3.4, 0.2, 0.1, Math.PI / 2);
    cyl(g, 0.16, 0.16, 0.9, 8, dark, 3.4, 0.2, 0.1, Math.PI / 2);
    box(g, 0.12, 0.7, 0.12, metal, -3.4, 0.7, 0.1);
    box(g, 0.12, 0.7, 0.12, metal, 3.4, 0.7, 0.1);
    box(g, 0.55, 0.12, 0.8, dark, 0, 0.15, 2.0); // spray rail
    glow(g, 0.07, 0xffe8a0, 0, 0.25, 2.35, 'landLight');
    box(g, 0.08, 0.35, 0.08, metal, 0, 1.35, -0.4);
    box(g, 0.4, 0.18, 0.5, accent, 0, 0.55, -1.8);
    box(g, 0.2, 0.08, 0.35, dark, 0.55, 0.05, 1.2);
  }

  if (id === 'aerobatic') {
    box(g, 0.08, 0.35, 0.55, accent, 0, 0.85, -1.55); // smoke pipe
    cyl(g, 0.05, 0.05, 0.7, 6, dark, 0, 0.55, -1.7, Math.PI / 2);
    box(g, 3.4, 0.05, 0.18, accent, 0, 0.22, 0.15); // sunburst
    box(g, 0.04, 0.04, 0.5, metal, 0.9, 0.28, 0.7);
    glow(g, 0.05, 0xffffff, 0, 0.55, 1.85);
    box(g, 0.22, 0.12, 0.22, dark, 0, -0.15, 0.9); // spring gear
    box(g, 0.55, 0.08, 0.12, accent, 0, 0.95, 0.15);
    box(g, 0.08, 0.45, 0.35, dark, 0, 0.7, -1.35);
    glow(g, 0.05, 0xff3030, -1.7, 0.22, 0.1);
    glow(g, 0.05, 0x30ff70, 1.7, 0.22, 0.1);
  }

  if (id === 'cargo') {
    box(g, 1.4, 1.1, 0.12, dark, 0, 0.7, -3.4); // ramp
    box(g, 0.18, 0.18, 2.2, dark, -1.1, 1.35, 0.2); // refuel
    box(g, 0.35, 0.55, 0.55, metal, 0, 1.55, 2.4); // hump
    for (const x of [-1.6, -0.55, 0.55, 1.6]) {
      cyl(g, 0.08, 0.08, 0.12, 8, chrome, x, 0.85, 2.05, Math.PI / 2);
    }
    box(g, 0.8, 0.15, 1.1, dark, -1.2, -0.55, 0.4);
    box(g, 0.8, 0.15, 1.1, dark, 1.2, -0.55, 0.4);
    glow(g, 0.08, 0xffe8a0, 0, 0.35, 3.3, 'landLight');
    box(g, 0.12, 0.9, 0.12, metal, 0, 1.7, -0.8);
    box(g, 0.4, 0.08, 4.2, accent, 0, 1.15, 0);
    box(g, 0.25, 0.25, 0.25, dark, 1.3, 0.35, -2.6);
  }

  if (id === 'glider') {
    box(g, 0.06, 0.06, 0.55, metal, 0.15, 0.35, 1.7); // probe
    box(g, 0.35, 0.08, 0.55, dark, 0, -0.12, 0.2); // skid
    box(g, 2.4, 0.04, 0.18, dark, 0, 0.22, -0.35); // spoiler panel
    box(g, 0.55, 0.22, 0.7, makeToonPbr({ color: 0x88ccee, transparent: true, opacity: 0.45, roughness: 0.15 }), 0, 0.55, 0.85);
    box(g, 0.04, 0.35, 0.04, metal, 0, 0.75, -0.2);
    box(g, 0.12, 0.08, 0.35, accent, 0, 0.42, -1.9);
    glow(g, 0.04, 0xffffff, 0, 0.28, 1.55);
    box(g, 0.08, 0.08, 0.08, dark, -4.6, 0.22, 0);
    box(g, 0.08, 0.08, 0.08, dark, 4.6, 0.22, 0);
    box(g, 0.2, 0.06, 0.4, dark, 0, 0.05, 0.9);
  }

  if (id === 'heli') {
    box(g, 0.08, 0.08, 1.6, metal, 0, 0.55, 2.0); // skid brace
    box(g, 1.5, 0.06, 0.08, metal, 0, 0.15, 0.6);
    box(g, 1.5, 0.06, 0.08, metal, 0, 0.15, -0.4);
    box(g, 0.55, 0.22, 0.7, makeToonPbr({ color: 0x88ccee, transparent: true, opacity: 0.4, roughness: 0.2 }), 0, 0.85, 0.7);
    glow(g, 0.07, 0xffe8a0, 0, 0.35, 1.55, 'landLight');
    box(g, 0.2, 0.12, 0.35, dark, 0.45, 0.55, -0.2); // door rail
    box(g, 0.08, 0.35, 0.08, metal, 0, 1.15, -1.6);
    box(g, 0.25, 0.12, 0.25, dark, 0, 1.35, 0.1);
    glow(g, 0.05, 0xff3030, 0, 0.95, -2.4);
    box(g, 0.35, 0.12, 0.2, accent, 0, 0.55, -0.9);
  }
}

/** Handling notes baked as extra numeric knobs — applied in data merge. */
export const HANDLING = {
  cessna182: { rollRate: 1.28, yawRate: 0.72, windSense: 1.45, gePeak: 0.26, inputExpo: 1.18 },
  privatejet: { rollRate: 0.72, controlLag: 0.16, engineSpool: 2.6, landVertMax: 2.6, drag: 0.028 },
  airliner: { rollRate: 0.42, controlLag: 0.42, engineSpool: 3.8, longRoll: true, landVertMax: 2.2 },
  f15: { rollRate: 2.1, pitchRate: 1.35, controlLag: 0.04, tiltGain: 1.2, inputExpo: 1.05 },
  area51: { rollRate: 1.6, pitchRate: 1.5, controlLag: 0.07, tiltGain: 1.15 },
  amphibian: { rollRate: 0.85, waterPitchDamp: 0.72, windSense: 1.2, landVertMax: 3.2 },
  aerobatic: { rollRate: 2.4, pitchRate: 1.55, yawRate: 1.1, inputExpo: 1.02, snappy: true },
  cargo: { rollRate: 0.55, controlLag: 0.28, engineSpool: 1.8, longRoll: true },
  glider: { rollRate: 0.95, pitchRate: 0.7, drag: 0.018, liftCoef: 1.55 },
  heli: { rollRate: 1.4, yawRate: 1.2, controlLag: 0.08, tiltGain: 0.95 }
};
