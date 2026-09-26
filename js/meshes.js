import * as THREE from 'three';
import { aircraftKit, makeToonPbr, makeFarLambert, getQualityKey } from './materials.js';

function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function addCyl(parent, rTop, rBot, h, segs, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/** Landing gear with oleo + rubber tire */
function gearSet(g, positions, matOleo, matWheel) {
  for (const [x, y, z, legH = 0.55] of positions) {
    const leg = addBox(g, 0.08, legH, 0.08, matOleo, x, y, z);
    leg.name = 'gear';
    // Scissor hint
    const link = addBox(g, 0.05, legH * 0.45, 0.05, matOleo, x + 0.06, y - legH * 0.15, z);
    link.name = 'gear';
    const wheel = addCyl(g, 0.18, 0.18, 0.14, 10, matWheel, x, y - legH * 0.55, z, 0, 0, Math.PI / 2);
    wheel.name = 'gear';
    const hub = addCyl(g, 0.07, 0.07, 0.16, 6, matOleo, x, y - legH * 0.55, z, 0, 0, Math.PI / 2);
    hub.name = 'gear';
  }
}

/** Control-surface hint flaps (visual only) */
function addFlapHint(g, span, chord, material, y, z) {
  const flap = addBox(g, span, 0.06, chord, material, 0, y, z);
  flap.name = 'flap';
  return flap;
}

/** Medium-poly readable silhouettes — MeshStandardMaterial + atlases */
export function createAircraftMesh(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const scale = spec.size || 1;
  const kit = aircraftKit(spec, getQualityKey());
  const { body, accent, dark, glass, metal, tire, oleo, emissive } = kit;
  const gearMetal = oleo || metal;
  const gearTire = tire || dark;

  if (spec.isHeli) {
    addBox(g, 1.35, 1.05, 2.6, body, 0, 0.7, 0.15);
    addBox(g, 1.15, 0.75, 1.35, glass, 0, 1.15, 0.45);
    // Skid fairing accent
    addBox(g, 1.4, 0.12, 2.5, accent, 0, 0.25, 0.1);
    addCyl(g, 0.18, 0.22, 2.8, 8, body, 0, 0.85, -2.0, Math.PI / 2, 0, 0);
    addBox(g, 0.12, 0.9, 0.55, accent, 0.55, 1.05, -3.35);
    addBox(g, 0.7, 0.1, 0.35, accent, 0.2, 1.0, -3.35);
    const rotor = new THREE.Group();
    rotor.name = 'rotor';
    addCyl(rotor, 0.14, 0.14, 0.35, 8, accent, 0, 1.45, 0);
    const b1 = addBox(rotor, 0.22, 0.04, 5.8, dark, 0, 1.55, 0);
    const b2 = b1.clone();
    b2.rotation.y = Math.PI / 2;
    rotor.add(b2);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 24),
      makeToonPbr({
        color: 0x222222,
        transparent: true,
        opacity: 0.14,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 1.56;
    rotor.add(disc);
    g.add(rotor);
    const tr = new THREE.Group();
    tr.name = 'tailrotor';
    addBox(tr, 0.08, 1.1, 0.08, dark, 0.65, 1.05, -3.4);
    g.add(tr);
    for (const x of [-0.58, 0.58]) {
      addBox(g, 0.07, 0.07, 2.9, dark, x, 0.08, 0.1);
      addBox(g, 0.06, 0.45, 0.06, dark, x, 0.3, 0.7);
      addBox(g, 0.06, 0.45, 0.06, dark, x, 0.3, -0.5);
    }
  } else if (spec.type === 'experimental') {
    const hull = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.55, 6), body);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1.15, 2.0, 1);
    g.add(hull);
    addBox(g, 4.5, 0.12, 1.6, body, 0, 0.05, -0.3);
    // Panel line emissive strips
    addBox(g, 3.8, 0.04, 0.06, emissive || accent, 0, 0.18, 0.2);
    addBox(g, 3.8, 0.04, 0.06, emissive || accent, 0, 0.18, -0.6);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 8),
      makeToonPbr({
        color: 0x44ff88,
        emissive: 0x22aa44,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.55,
        roughness: 0.2,
        metalness: 0.2,
        envMapIntensity: 0.7
      })
    );
    canopy.position.set(0, 0.4, 0.55);
    g.add(canopy);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 16),
      makeToonPbr({
        color: 0x44ff88,
        emissive: 0x44ff88,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.25;
    glow.name = 'glow';
    g.add(glow);
    for (const x of [-0.45, 0.45]) {
      addCyl(g, 0.22, 0.28, 0.7, 8, dark, x, -0.15, -1.6, Math.PI / 2, 0, 0);
      // Nozzle glow
      addCyl(g, 0.18, 0.2, 0.12, 8, emissive || accent, x, -0.15, -1.95, Math.PI / 2, 0, 0);
    }
    gearSet(g, [[-0.7, -0.35, 0.4], [0.7, -0.35, 0.4], [0, -0.3, 1.1]], gearMetal, gearTire);
  } else if (spec.type === 'glider') {
    addCyl(g, 0.22, 0.28, 5.2, 8, body, 0, 0.15, 0, Math.PI / 2, 0, 0);
    addBox(g, 14.5, 0.1, 0.85, body, 0, 0.25, 0.15);
    addFlapHint(g, 10, 0.28, accent, 0.22, -0.35);
    addBox(g, 0.08, 0.45, 0.35, accent, -7.2, 0.4, 0.15);
    addBox(g, 0.08, 0.45, 0.35, accent, 7.2, 0.4, 0.15);
    addBox(g, 2.8, 0.07, 0.45, body, 0, 0.35, -2.35);
    addBox(g, 0.08, 1.15, 0.7, accent, 0, 0.75, -2.4);
    addBox(g, 0.42, 0.38, 1.1, glass, 0, 0.42, 0.9);
    gearSet(g, [[0, -0.25, 0.3, 0.4]], gearMetal, gearTire);
  } else if (spec.type === 'fighter') {
    const len = 6.2;
    addCyl(g, 0.35, 0.55, len * 0.85, 8, body, 0, 0.1, 0, Math.PI / 2, 0, 0);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8), body);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = len / 2 - 0.2;
    g.add(nose);
    addBox(g, 8.2, 0.12, 2.0, body, 0, 0.0, -0.4);
    addFlapHint(g, 5.5, 0.35, dark, -0.02, -1.1);
    addBox(g, 3.2, 0.08, 1.2, body, -2.8, 0.02, 0.3, 0, 0.35, 0);
    addBox(g, 3.2, 0.08, 1.2, body, 2.8, 0.02, 0.3, 0, -0.35, 0);
    addBox(g, 0.1, 1.5, 1.0, accent, -0.55, 0.95, -2.4);
    addBox(g, 0.1, 1.5, 1.0, accent, 0.55, 0.95, -2.4);
    addBox(g, 3.2, 0.1, 0.7, body, 0, 0.15, -2.5);
    // Dark intake interiors
    addCyl(g, 0.32, 0.38, 1.6, 8, dark, -0.5, -0.15, -2.8, Math.PI / 2, 0, 0);
    addCyl(g, 0.32, 0.38, 1.6, 8, dark, 0.5, -0.15, -2.8, Math.PI / 2, 0, 0);
    addBox(g, 0.7, 0.45, 1.2, glass, 0, 0.45, 1.2);
    // Nav lights
    addBox(g, 0.12, 0.08, 0.12, makeToonPbr({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.9 }), -4.0, 0.08, -0.3);
    addBox(g, 0.12, 0.08, 0.12, makeToonPbr({ color: 0x22ff44, emissive: 0x00ff22, emissiveIntensity: 0.9 }), 4.0, 0.08, -0.3);
    gearSet(g, [[-1.1, -0.5, 0.2], [1.1, -0.5, 0.2], [0, -0.45, 2.0, 0.5]], gearMetal, gearTire);
  } else if (spec.id === 'airliner') {
    const len = 10;
    addCyl(g, 0.75, 0.85, len, 10, body, 0, 0.4, 0, Math.PI / 2, 0, 0);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 10), body);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.4, len / 2 + 0.4);
    g.add(nose);
    addBox(g, 16, 0.14, 2.4, body, 0, 0.15, -0.5);
    addFlapHint(g, 12, 0.4, dark, 0.12, -1.4);
    addBox(g, 0.1, 1.1, 0.7, accent, -8, 0.7, -0.8);
    addBox(g, 0.1, 1.1, 0.7, accent, 8, 0.7, -0.8);
    addBox(g, 5.5, 0.12, 1.2, body, 0, 0.9, -4.6);
    addBox(g, 0.14, 2.4, 1.5, accent, 0, 1.7, -4.7);
    for (const x of [-3.2, 3.2]) {
      addCyl(g, 0.45, 0.5, 2.2, 10, metal, x, -0.55, 0.2, Math.PI / 2, 0, 0);
      addCyl(g, 0.35, 0.35, 0.15, 10, dark, x, -0.55, 1.25, Math.PI / 2, 0, 0);
    }
    // Window stripe — emissive night hint
    const winStripe = makeToonPbr({
      color: 0x224466,
      emissive: 0x88aacc,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.1
    });
    addBox(g, 0.05, 0.18, len * 0.7, winStripe, 0.86, 0.55, 0.3);
    addBox(g, 0.05, 0.18, len * 0.7, winStripe, -0.86, 0.55, 0.3);
    gearSet(
      g,
      [
        [-1.4, -0.7, -1.5, 0.9],
        [1.4, -0.7, -1.5, 0.9],
        [0, -0.6, 3.5, 0.8],
        [-1.4, -0.7, 0.5, 0.9],
        [1.4, -0.7, 0.5, 0.9]
      ],
      gearMetal,
      gearTire
    );
  } else if (spec.id === 'cargo') {
    const len = 7.5;
    addBox(g, 1.6, 1.7, len, body, 0, 0.9, 0);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), body);
    nose.position.set(0, 0.85, len / 2 - 0.2);
    g.add(nose);
    addBox(g, 13, 0.16, 2.2, body, 0, 1.7, 0.2);
    addFlapHint(g, 9, 0.35, dark, 1.65, -0.7);
    addBox(g, 4.5, 0.12, 1.1, body, 0, 1.5, -3.4);
    addBox(g, 0.14, 2.0, 1.3, accent, 0, 2.2, -3.5);
    for (const x of [-4.5, -2.2, 2.2, 4.5]) {
      addCyl(g, 0.28, 0.32, 1.4, 8, dark, x, 1.35, 0.8, Math.PI / 2, 0, 0);
      const prop = new THREE.Group();
      const blade = addBox(prop, 0.1, 1.6, 0.06, dark, 0, 0, 0);
      const blade2 = blade.clone();
      blade2.rotation.z = Math.PI / 2;
      prop.add(blade2);
      prop.position.set(x, 1.35, 1.55);
      prop.name = 'prop';
      g.add(prop);
    }
    addBox(g, 1.2, 0.7, 1.0, glass, 0, 1.5, 3.2);
    gearSet(g, [[-1.2, -0.2, 1.0, 1.0], [1.2, -0.2, 1.0, 1.0], [0, -0.15, 3.0, 0.9]], gearMetal, gearTire);
  } else if (spec.id === 'privatejet') {
    const len = 5.8;
    addCyl(g, 0.45, 0.55, len, 8, body, 0, 0.35, 0, Math.PI / 2, 0, 0);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 8), body);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.35, len / 2 + 0.2);
    g.add(nose);
    addBox(g, 8.5, 0.12, 1.6, body, 0, 0.2, -0.2);
    addFlapHint(g, 6, 0.3, dark, 0.16, -0.8);
    addBox(g, 3.2, 0.1, 0.8, body, 0, 0.7, -2.5);
    addBox(g, 0.12, 1.6, 1.0, accent, 0, 1.25, -2.55);
    for (const x of [-0.7, 0.7]) {
      addCyl(g, 0.28, 0.32, 1.5, 8, metal, x, 0.55, -2.3, Math.PI / 2, 0, 0);
    }
    addBox(g, 0.7, 0.4, 1.1, glass, 0, 0.7, 1.4);
    // Cabin windows
    const wmat = makeToonPbr({
      color: 0x224455,
      emissive: 0x6688aa,
      emissiveIntensity: 0.3,
      roughness: 0.25,
      metalness: 0.1
    });
    for (let i = 0; i < 4; i++) {
      addBox(g, 0.04, 0.14, 0.22, wmat, 0.56, 0.45, 0.6 - i * 0.55);
      addBox(g, 0.04, 0.14, 0.22, wmat, -0.56, 0.45, 0.6 - i * 0.55);
    }
    gearSet(g, [[-0.9, -0.35, 0.3], [0.9, -0.35, 0.3], [0, -0.3, 2.0, 0.45]], gearMetal, gearTire);
  } else if (spec.id === 'aerobatic') {
    const len = 4.0;
    addCyl(g, 0.32, 0.42, len, 8, body, 0, 0.25, 0, Math.PI / 2, 0, 0);
    addBox(g, 7.2, 0.12, 1.35, accent, 0, 0.25, 0.1);
    addFlapHint(g, 5, 0.28, dark, 0.22, -0.45);
    addBox(g, 2.4, 0.08, 0.55, body, 0, 0.35, -1.7);
    addBox(g, 0.1, 1.2, 0.7, accent, 0, 0.85, -1.75);
    const prop = new THREE.Group();
    prop.name = 'prop';
    addBox(prop, 0.1, 1.9, 0.07, dark);
    const b2 = addBox(prop, 0.1, 1.9, 0.07, dark);
    b2.rotation.z = Math.PI / 2;
    prop.position.z = len / 2 + 0.55;
    prop.position.y = 0.25;
    g.add(prop);
    addBox(g, 0.55, 0.4, 0.9, glass, 0, 0.55, 0.5);
    for (const x of [-0.7, 0.7]) {
      addBox(g, 0.2, 0.35, 0.7, dark, x, -0.15, 0.3);
    }
  } else {
    const len = spec.canWater ? 5.0 : 4.4;
    const fusW = spec.canWater ? 1.0 : 0.85;
    addCyl(g, fusW * 0.42, fusW * 0.5, len, 8, body, 0, 0.35, 0, Math.PI / 2, 0, 0);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(fusW * 0.42, 1.1, 8), body);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.35, len / 2 + 0.25);
    g.add(nose);
    const span = spec.canWater ? 9.5 : 7.2;
    addBox(g, span, 0.12, 1.35, body, 0, 0.95, 0.15);
    addFlapHint(g, span * 0.7, 0.3, dark, 0.92, -0.4);
    addBox(g, 0.08, 0.7, 0.08, dark, -1.2, 0.6, 0.15);
    addBox(g, 0.08, 0.7, 0.08, dark, 1.2, 0.6, 0.15);
    addBox(g, span * 0.32, 0.1, 0.55, body, 0, 0.55, -len / 2 + 0.4);
    addBox(g, 0.1, 1.25, 0.7, accent, 0, 1.05, -len / 2 + 0.35);
    const prop = new THREE.Group();
    prop.name = 'prop';
    addBox(prop, 0.1, 1.7, 0.07, dark);
    const pb = addBox(prop, 0.1, 1.7, 0.07, dark);
    pb.rotation.z = Math.PI / 2;
    prop.position.set(0, 0.35, len / 2 + 0.85);
    g.add(prop);
    addBox(g, fusW * 0.7, 0.45, 1.0, glass, 0, 0.7, 0.7);

    if (spec.canWater) {
      const floatMat = makeToonPbr({
        color: 0xd09050,
        roughness: 0.4,
        metalness: 0.45,
        envMapIntensity: 0.5
      });
      for (const x of [-0.85, 0.85]) {
        addBox(g, 0.45, 0.4, 3.6, floatMat, x, -0.55, 0.15);
        addBox(g, 0.08, 0.7, 0.08, dark, x * 0.5, 0.0, 0.5);
        addBox(g, 0.08, 0.7, 0.08, dark, x * 0.5, 0.0, -0.8);
      }
    } else if (spec.hasGear) {
      gearSet(g, [[-0.7, -0.25, 0.4], [0.7, -0.25, 0.4], [0, -0.2, len / 2 - 0.6, 0.45]], gearMetal, gearTire);
    }
  }

  g.scale.setScalar(scale);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return g;
}

export function createParachuteMesh() {
  const g = new THREE.Group();
  const canopy = new THREE.Group();
  canopy.name = 'canopy';
  const cellW = 0.85;
  const colors = [0xff4422, 0xffffff, 0xff4422, 0x2266cc, 0xffffff, 0xff4422, 0x2266cc];
  for (let i = 0; i < 7; i++) {
    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(cellW * 0.95, 0.4, 2.9),
      makeToonPbr({
        color: colors[i % colors.length],
        roughness: 0.85,
        metalness: 0.02,
        envMapIntensity: 0.2
      })
    );
    cell.position.set((i - 3) * cellW, 4.2, 0);
    cell.position.y += Math.cos((i - 3) * 0.35) * 0.28;
    cell.rotation.z = (i - 3) * -0.06;
    canopy.add(cell);
  }
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.1, 3.0),
    makeToonPbr({
      color: 0xff5533,
      transparent: true,
      opacity: 0.88,
      roughness: 0.8,
      metalness: 0
    })
  );
  top.position.set(0, 4.5, 0);
  canopy.add(top);
  g.add(canopy);

  const lineMat = new THREE.LineBasicMaterial({ color: 0xeeeeee });
  for (let i = 0; i < 8; i++) {
    const t = (i / 7) * 2 - 1;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(t * 2.9, 4.1, 1.2),
          new THREE.Vector3(t * 0.15, 0.7, 0)
        ]),
        lineMat
      )
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(t * 2.9, 4.1, -1.2),
          new THREE.Vector3(t * 0.15, 0.7, 0)
        ]),
        lineMat
      )
    );
  }

  const jumper = new THREE.Group();
  addBox(jumper, 0.45, 0.7, 0.3, makeFarLambert(0x2a4a6a), 0, 0.55, 0);
  addBox(jumper, 0.35, 0.28, 0.28, makeFarLambert(0xddbb99), 0, 1.05, 0);
  addBox(jumper, 0.55, 0.35, 0.2, makeFarLambert(0x333333), 0, 0.7, -0.2);
  g.add(jumper);
  return g;
}

export function createMotorcycleMesh() {
  const g = new THREE.Group();
  addBox(g, 0.45, 0.55, 1.7, makeToonPbr({ color: 0xff2200, roughness: 0.4, metalness: 0.35 }), 0, 0.6, 0);
  addBox(g, 0.35, 0.25, 0.5, makeFarLambert(0x111111), 0, 0.95, -0.35);
  for (const z of [-0.75, 0.75]) {
    addCyl(g, 0.38, 0.38, 0.16, 12, makeToonPbr({ color: 0x111111, roughness: 0.95 }), 0, 0.38, z, 0, 0, Math.PI / 2);
    addCyl(g, 0.22, 0.22, 0.08, 8, makeToonPbr({ color: 0x888888, metalness: 0.7, roughness: 0.3 }), 0, 0.38, z, 0, 0, Math.PI / 2);
  }
  addBox(g, 0.08, 0.5, 0.08, makeFarLambert(0x444444), 0, 0.7, 0.55);
  addBox(g, 0.7, 0.06, 0.06, makeToonPbr({ color: 0xcccccc, metalness: 0.8, roughness: 0.25 }), 0, 0.95, 0.55);
  addBox(g, 0.4, 0.65, 0.4, makeFarLambert(0x1a1a22), 0, 1.15, -0.15);
  return g;
}

export function createSupercarMesh() {
  const g = new THREE.Group();
  const body = makeToonPbr({ color: 0x00c8ff, roughness: 0.35, metalness: 0.45, envMapIntensity: 0.55 });
  addBox(g, 1.9, 0.45, 4.4, body, 0, 0.5, 0);
  addBox(g, 1.7, 0.25, 1.2, body, 0, 0.78, -0.6);
  addBox(g, 1.55, 0.35, 1.5, makeFarLambert(0x0a2030), 0, 0.95, -0.15);
  addBox(
    g,
    1.5,
    0.08,
    1.0,
    makeToonPbr({ color: 0x88ddee, transparent: true, opacity: 0.5, roughness: 0.15, metalness: 0.1 }),
    0,
    1.12,
    0.35,
    -0.25,
    0,
    0
  );
  for (const [x, z] of [
    [-0.85, 1.4],
    [0.85, 1.4],
    [-0.85, -1.4],
    [0.85, -1.4]
  ]) {
    addCyl(g, 0.36, 0.36, 0.28, 12, makeToonPbr({ color: 0x111111, roughness: 0.95 }), x, 0.36, z, 0, 0, Math.PI / 2);
  }
  addBox(g, 1.6, 0.08, 0.15, makeToonPbr({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.6 }), 0, 0.45, 2.15);
  addBox(g, 1.4, 0.06, 0.08, makeToonPbr({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.5 }), 0, 0.45, -2.15);
  return g;
}

export function createBalloonMesh() {
  const g = new THREE.Group();
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 16, 12),
    makeToonPbr({ color: 0xff5533, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.3 })
  );
  envelope.position.y = 8.2;
  envelope.scale.y = 1.15;
  g.add(envelope);
  const band = new THREE.Mesh(
    new THREE.SphereGeometry(3.65, 16, 12),
    makeToonPbr({ color: 0xffe066, roughness: 0.7, metalness: 0.05 })
  );
  band.scale.set(1, 0.22, 1);
  band.position.y = 8.2;
  g.add(band);
  const band2 = band.clone();
  band2.material = makeToonPbr({ color: 0xffffff, roughness: 0.7 });
  band2.position.y = 6.5;
  band2.scale.set(0.85, 0.12, 0.85);
  g.add(band2);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xcc8844 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(a) * 2.2, 5.2, Math.sin(a) * 2.2),
          new THREE.Vector3(Math.cos(a) * 0.6, 2.2, Math.sin(a) * 0.6)
        ]),
        lineMat
      )
    );
  }
  addBox(g, 1.5, 1.25, 1.5, makeFarLambert(0x8a5a28), 0, 1.5, 0);
  addBox(g, 1.55, 0.12, 1.55, makeFarLambert(0x6a4020), 0, 2.15, 0);
  return g;
}

export function createRocketMesh() {
  const g = new THREE.Group();
  addCyl(g, 1.15, 1.35, 12, 12, makeToonPbr({ color: 0xf2f2f5, roughness: 0.35, metalness: 0.45 }), 0, 7, 0);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 3.2, 12),
    makeToonPbr({ color: 0xff3333, roughness: 0.4, metalness: 0.2 })
  );
  nose.position.y = 14.6;
  g.add(nose);
  addCyl(g, 1.18, 1.18, 0.6, 12, makeToonPbr({ color: 0x2244aa, roughness: 0.5, metalness: 0.2 }), 0, 10, 0);
  for (let i = 0; i < 4; i++) {
    const fin = addBox(g, 0.12, 2.6, 1.9, makeToonPbr({ color: 0xff3333, roughness: 0.45, metalness: 0.15 }));
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 1.25, 2.1, Math.sin(a) * 1.25);
    fin.rotation.y = a;
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 3.5, 8),
    makeToonPbr({
      color: 0xffaa22,
      emissive: 0xff8800,
      emissiveIntensity: 1.2,
      roughness: 0.6,
      metalness: 0
    })
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -0.6;
  flame.name = 'flame';
  flame.visible = false;
  g.add(flame);
  const flame2 = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.2, 6),
    makeToonPbr({
      color: 0xffeebb,
      emissive: 0xffffaa,
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0
    })
  );
  flame2.rotation.x = Math.PI;
  flame2.position.y = -0.3;
  flame2.name = 'flameCore';
  flame2.visible = false;
  g.add(flame2);
  return g;
}

export function createExplosion(scene, pos) {
  const parts = [];
  const geo = new THREE.SphereGeometry(0.4, 6, 5);
  const colors = [0xff4400, 0xffcc00, 0xff2200, 0xffaa44, 0x333333, 0xff6622, 0xffee88];
  for (let i = 0; i < 36; i++) {
    const mat = makeToonPbr({
      color: colors[i % colors.length],
      emissive: i < 12 ? colors[i % colors.length] : 0x000000,
      emissiveIntensity: i < 12 ? 0.8 : 0,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.position.y += 0.5;
    const speed = 20 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.75;
    m.userData.vel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed * 0.9 + 10,
      Math.sin(phi) * Math.sin(theta) * speed
    );
    m.userData.life = 1.0 + Math.random() * 1.2;
    m.userData.spin = (Math.random() - 0.5) * 10;
    m.userData.fade = true;
    m.scale.setScalar(0.7 + Math.random() * 1.6);
    scene.add(m);
    parts.push(m);
  }
  // Core flash
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 10, 8),
    makeToonPbr({
      color: 0xffeecc,
      emissive: 0xffaa44,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.85,
      roughness: 0.5,
      metalness: 0
    })
  );
  flash.position.copy(pos);
  flash.userData.vel = new THREE.Vector3(0, 3, 0);
  flash.userData.life = 0.28;
  flash.userData.isFlash = true;
  scene.add(flash);
  parts.push(flash);

  // Smoke puffs
  for (let i = 0; i < 10; i++) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.8 + Math.random(), 5, 4),
      makeFarLambert(0x44444a, null, { transparent: true, opacity: 0.45 })
    );
    smoke.position.copy(pos);
    smoke.position.y += 1;
    smoke.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      4 + Math.random() * 8,
      (Math.random() - 0.5) * 8
    );
    smoke.userData.life = 1.4 + Math.random();
    smoke.userData.fade = true;
    smoke.userData.isSmoke = true;
    scene.add(smoke);
    parts.push(smoke);
  }
  return parts;
}
