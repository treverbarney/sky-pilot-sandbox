import * as THREE from 'three';
import { aircraftKit, makeToonPbr, makeFarLambert, getQualityKey } from './materials.js';
import { addCraftDetails } from './craft-details.js';

function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function addCyl(parent, rTop, rBot, h, segs, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, Math.max(12, segs || 16)), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function addSphere(parent, r, segs, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, Math.max(10, segs), Math.max(8, segs - 2)), material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

/** Smooth cartoon fuselage: tapered tube + round nose/tail. */
function addFuselage(parent, radius, length, material, y = 0.4) {
  addCyl(parent, radius * 0.86, radius, length * 0.72, 16, material, 0, y, 0, Math.PI / 2, 0, 0);
  addSphere(parent, radius * 0.92, 14, material, 0, y, length * 0.38, 0.92, 0.86, 1.15);
  addSphere(parent, radius * 0.78, 12, material, 0, y, -length * 0.38, 0.85, 0.78, 1.05);
}

function addWing(parent, span, thick, chord, material, y, z, dihedral = 0) {
  const w = addBox(parent, span, thick, chord, material, 0, y, z, 0, 0, 0);
  addSphere(parent, Math.max(thick * 1.6, 0.12), 10, material, span * 0.48, y, z, 1.1, 0.7, chord * 0.35);
  addSphere(parent, Math.max(thick * 1.6, 0.12), 10, material, -span * 0.48, y, z, 1.1, 0.7, chord * 0.35);
  if (dihedral) {
    w.rotation.z = 0;
  }
  return w;
}

function gearSet(g, positions, matOleo, matWheel) {
  for (const [x, y, z, legH = 0.55] of positions) {
    const leg = addBox(g, 0.08, legH, 0.08, matOleo, x, y, z);
    leg.name = 'gear';
    const link = addBox(g, 0.05, legH * 0.45, 0.05, matOleo, x + 0.06, y - legH * 0.15, z);
    link.name = 'gear';
    const wheel = addCyl(g, 0.18, 0.18, 0.14, 10, matWheel, x, y - legH * 0.55, z, 0, 0, Math.PI / 2);
    wheel.name = 'gear';
    const hub = addCyl(g, 0.07, 0.07, 0.16, 6, matOleo, x, y - legH * 0.55, z, 0, 0, Math.PI / 2);
    hub.name = 'gear';
  }
}

function addFlapHint(g, span, chord, material, y, z) {
  const flap = addBox(g, span, 0.06, chord, material, 0, y, z);
  flap.name = 'flap';
  return flap;
}

function propDisc(parent, radius, y, z, darkMat) {
  const prop = new THREE.Group();
  prop.name = 'prop';
  addBox(prop, 0.09, radius * 2, 0.06, darkMat);
  const b2 = addBox(prop, 0.09, radius * 2, 0.06, darkMat);
  b2.rotation.z = Math.PI / 2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.95, 20),
    makeToonPbr({
      color: 0x333333,
      transparent: true,
      opacity: 0.18,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide
    })
  );
  disc.position.z = 0.04;
  prop.add(disc);
  prop.position.set(0, y, z);
  parent.add(prop);
  return prop;
}

function addNavAndShadow(g, tips = { x: 1.2, y: 0.4, z: 0.1 }, strobe = { x: 0, y: 0.9, z: -1.5 }, blobY = -0.9) {
  const navGeo = new THREE.SphereGeometry(0.14, 8, 6);
  const red = new THREE.Mesh(
    navGeo,
    new THREE.MeshStandardMaterial({
      color: 0xff3030,
      emissive: 0xff1515,
      emissiveIntensity: 2.4,
      roughness: 0.35,
      metalness: 0.08
    })
  );
  red.position.set(-tips.x, tips.y, tips.z);
  red.name = 'navRed';
  g.add(red);
  const green = new THREE.Mesh(
    navGeo.clone(),
    new THREE.MeshStandardMaterial({
      color: 0x30ff70,
      emissive: 0x18ee50,
      emissiveIntensity: 2.4,
      roughness: 0.35,
      metalness: 0.08
    })
  );
  green.position.set(tips.x, tips.y, tips.z);
  green.name = 'navGreen';
  g.add(green);
  const strobeM = new THREE.Mesh(
    navGeo.clone(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.2,
      roughness: 0.25,
      metalness: 0.05
    })
  );
  strobeM.position.set(strobe.x, strobe.y, strobe.z);
  strobeM.name = 'navStrobe';
  strobeM.userData.blink = true;
  g.add(strobeM);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = blobY;
  blob.name = 'blobShadow';
  g.add(blob);
}

/** Cessna 182 — high wing, V-struts, cowling, fixed gear, prop disc */
function kitCessna182(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  // Fuselage + cowling bulge
  addFuselage(g, 0.48, 4.4, body, 0.4);
  addCyl(g, 0.52, 0.42, 0.85, 16, body, 0, 0.38, 2.35, Math.PI / 2, 0, 0);
  addSphere(g, 0.42, 12, metal, 0, 0.38, 2.7, 1.05, 0.9, 0.7);
  addBox(g, 0.95, 0.55, 0.7, metal, 0, 0.35, 2.55);
  // High wing + struts
  addWing(g, 8.2, 0.14, 1.45, body, 1.15, 0.2);
  addFlapHint(g, 5.5, 0.32, dark, 1.12, -0.4);
  addBox(g, 0.14, 0.9, 0.14, dark, -1.35, 0.7, 0.15);
  addBox(g, 0.14, 0.9, 0.14, dark, 1.35, 0.7, 0.15);
  addBox(g, 0.12, 0.78, 0.12, dark, -2.5, 0.78, 0.05, 0, 0, 0.38);
  addBox(g, 0.12, 0.78, 0.12, dark, 2.5, 0.78, 0.05, 0, 0, -0.38);
  addBox(g, 0.1, 0.65, 0.1, dark, -3.4, 0.85, 0.05, 0, 0, 0.45);
  addBox(g, 0.1, 0.65, 0.1, dark, 3.4, 0.85, 0.05, 0, 0, -0.45);
  // Tail
  addBox(g, 2.6, 0.1, 0.55, body, 0, 0.55, -1.95);
  addBox(g, 0.12, 1.35, 0.75, accent, 0, 1.15, -2.0);
  addBox(g, 0.7, 0.5, 1.15, glass, 0, 0.85, 0.85);
  addSphere(g, 0.55, 12, glass, 0, 0.92, 0.95, 1.15, 0.72, 0.9);
  // Cabin side windows — thicker readable strip
  addBox(g, 0.06, 0.32, 1.35, glass, 0.5, 0.72, 0.15);
  addBox(g, 0.06, 0.32, 1.35, glass, -0.5, 0.72, 0.15);
  propDisc(g, 0.95, 0.38, 2.95, dark);
  // Spinner
  const spin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 8), metal);
  spin.rotation.x = -Math.PI / 2;
  spin.position.set(0, 0.38, 3.12);
  g.add(spin);
  gearSet(g, [[-0.85, -0.15, 0.35, 0.55], [0.85, -0.15, 0.35, 0.55], [0, -0.1, 1.85, 0.45]], gearMetal, gearTire);
  addNavAndShadow(g, { x: 4.0, y: 1.15, z: 0.2 }, { x: 0, y: 1.7, z: -2.0 }, -0.75);
}

/** Private jet — low wing, aft engines, T-tail */
function kitPrivateJet(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 6.0;
  addFuselage(g, 0.5, len, body, 0.4);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), body);
  nose.scale.set(0.95, 0.82, 1.35);
  nose.position.set(0, 0.4, len / 2 + 0.05);
  g.add(nose);
  // Low wing
  addWing(g, 9.0, 0.12, 1.7, body, 0.18, -0.15);
  addFlapHint(g, 6.2, 0.32, dark, 0.14, -0.85);
  // T-tail
  addBox(g, 0.14, 1.85, 1.05, accent, 0, 1.35, -2.65);
  addBox(g, 3.4, 0.1, 0.75, body, 0, 2.25, -2.55);
  // Aft engines
  for (const x of [-0.72, 0.72]) {
    addCyl(g, 0.28, 0.34, 1.65, 10, metal, x, 0.72, -2.15, Math.PI / 2, 0, 0);
    addCyl(g, 0.24, 0.24, 0.14, 10, dark, x, 0.72, -3.0, Math.PI / 2, 0, 0);
    addCyl(g, 0.3, 0.32, 0.12, 10, dark, x, 0.72, -1.35, Math.PI / 2, 0, 0);
  }
  addBox(g, 0.72, 0.42, 1.15, glass, 0, 0.78, 1.55);
  const wmat = makeToonPbr({
    color: 0x224455,
    emissive: 0x6688aa,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.1
  });
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.04, 0.15, 0.2, wmat, 0.54, 0.5, 0.7 - i * 0.48);
    addBox(g, 0.04, 0.15, 0.2, wmat, -0.54, 0.5, 0.7 - i * 0.48);
  }
  gearSet(g, [[-1.0, -0.4, 0.2], [1.0, -0.4, 0.2], [0, -0.35, 2.1, 0.48]], gearMetal, gearTire);
  addNavAndShadow(g, { x: 4.4, y: 0.2, z: -0.1 }, { x: 0, y: 2.35, z: -2.55 }, -0.95);
}

/** Airliner — long tube, underwing pods, tall fin, window strip */
function kitAirliner(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 11.5;
  addFuselage(g, 0.86, len, body, 0.55);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), body);
  nose.scale.set(0.95, 0.88, 1.45);
  nose.position.set(0, 0.55, len / 2 + 0.15);
  g.add(nose);
  // Cockpit windows
  addBox(g, 0.9, 0.35, 0.55, glass, 0, 0.95, len / 2 - 0.2);
  addSphere(g, 0.42, 12, glass, 0, 0.98, len / 2 - 0.05, 1.4, 0.55, 0.7);
  addWing(g, 17.5, 0.16, 2.6, body, 0.2, -0.6);
  addFlapHint(g, 13, 0.42, dark, 0.16, -1.55);
  addBox(g, 0.12, 1.2, 0.75, accent, -8.6, 0.85, -0.9);
  addBox(g, 0.12, 1.2, 0.75, accent, 8.6, 0.85, -0.9);
  // Tall fin + horizontal stab
  addBox(g, 0.16, 2.9, 1.7, accent, 0, 2.1, -5.2);
  addBox(g, 6.0, 0.14, 1.3, body, 0, 1.15, -5.1);
  // Underwing pods
  for (const x of [-3.6, 3.6]) {
    addCyl(g, 0.5, 0.58, 2.6, 10, metal, x, -0.55, 0.15, Math.PI / 2, 0, 0);
    addCyl(g, 0.4, 0.4, 0.22, 10, dark, x, -0.55, 1.45, Math.PI / 2, 0, 0);
    addCyl(g, 0.52, 0.55, 0.18, 10, dark, x, -0.55, -1.2, Math.PI / 2, 0, 0);
  }
  const winStripe = makeToonPbr({
    color: 0x1a3348,
    emissive: 0x88aacc,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.1
  });
  addBox(g, 0.08, 0.28, len * 0.75, winStripe, 0.92, 0.72, 0.2);
  addBox(g, 0.08, 0.28, len * 0.75, winStripe, -0.92, 0.72, 0.2);
  gearSet(
    g,
    [
      [-1.5, -0.75, -1.8, 1.0],
      [1.5, -0.75, -1.8, 1.0],
      [-1.5, -0.75, 0.6, 1.0],
      [1.5, -0.75, 0.6, 1.0],
      [0, -0.65, 4.0, 0.85]
    ],
    gearMetal,
    gearTire
  );
  addNavAndShadow(g, { x: 8.6, y: 0.25, z: -0.6 }, { x: 0, y: 3.4, z: -5.2 }, -1.2);
}

/** F-15 — twin tails, intakes, bubble canopy, afterburner glow */
function kitF15(g, kit) {
  const { body, accent, dark, glass, metal, emissive } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 6.4;
  addFuselage(g, 0.42, len * 0.9, body, 0.12);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), body);
  nose.scale.set(0.85, 0.7, 1.7);
  nose.position.set(0, 0.12, len / 2 - 0.15);
  g.add(nose);
  // Wing + LERX
  addWing(g, 8.4, 0.11, 2.1, body, 0.02, -0.35);
  addBox(g, 3.4, 0.08, 1.3, body, -2.9, 0.04, 0.45, 0, 0.4, 0);
  addBox(g, 3.4, 0.08, 1.3, body, 2.9, 0.04, 0.45, 0, -0.4, 0);
  addFlapHint(g, 5.8, 0.36, dark, -0.01, -1.15);
  // Twin vertical tails
  addBox(g, 0.1, 1.65, 1.05, accent, -0.62, 1.05, -2.35);
  addBox(g, 0.1, 1.65, 1.05, accent, 0.62, 1.05, -2.35);
  addBox(g, 3.4, 0.1, 0.75, body, 0, 0.18, -2.45);
  // Side intakes — chunky lips
  addBox(g, 0.7, 0.65, 2.35, dark, -0.7, -0.05, -1.35);
  addBox(g, 0.7, 0.65, 2.35, dark, 0.7, -0.05, -1.35);
  addBox(g, 0.12, 0.7, 0.55, accent, -1.05, -0.05, -0.35);
  addBox(g, 0.12, 0.7, 0.55, accent, 1.05, -0.05, -0.35);
  addCyl(g, 0.32, 0.4, 1.5, 8, dark, -0.55, -0.12, -2.75, Math.PI / 2, 0, 0);
  addCyl(g, 0.32, 0.4, 1.5, 8, dark, 0.55, -0.12, -2.75, Math.PI / 2, 0, 0);
  // Bubble canopy
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 10),
    makeToonPbr({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.15,
      envMapIntensity: 0.85
    })
  );
  canopy.scale.set(0.85, 0.7, 1.35);
  canopy.position.set(0, 0.55, 1.15);
  g.add(canopy);
  // Afterburner glow discs
  for (const x of [-0.55, 0.55]) {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 12),
      makeToonPbr({
        color: 0xff6622,
        emissive: 0xff4400,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0
      })
    );
    glow.position.set(x, -0.12, -3.45);
    glow.name = 'glow';
    g.add(glow);
    addCyl(g, 0.28, 0.32, 0.2, 8, emissive || accent, x, -0.12, -3.25, Math.PI / 2, 0, 0);
  }
  gearSet(g, [[-1.15, -0.55, 0.15], [1.15, -0.55, 0.15], [0, -0.5, 2.05, 0.5]], gearMetal, gearTire);
  addNavAndShadow(g, { x: 4.1, y: 0.08, z: -0.3 }, { x: 0, y: 1.7, z: -2.4 }, -1.05);
}

/** Area 51 — faceted black wedge, cyan emissive panel lines */
function kitArea51(g, kit) {
  const { body, accent, dark, emissive } = kit;
  const gearMetal = kit.oleo || kit.metal;
  const gearTire = kit.tire || dark;
  const hull = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.55, 6), body);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.2, 2.15, 1);
  g.add(hull);
  // Facet plates
  addBox(g, 4.8, 0.1, 1.8, body, 0, 0.08, -0.25);
  addBox(g, 2.2, 0.08, 1.2, body, -1.6, 0.12, 0.5, 0, 0.45, 0.15);
  addBox(g, 2.2, 0.08, 1.2, body, 1.6, 0.12, 0.5, 0, -0.45, -0.15);
  const line = emissive || accent;
  addBox(g, 4.2, 0.07, 0.1, line, 0, 0.24, 0.35);
  addBox(g, 4.2, 0.07, 0.1, line, 0, 0.24, -0.45);
  addBox(g, 0.1, 0.07, 2.6, line, 0.95, 0.24, -0.05);
  addBox(g, 0.1, 0.07, 2.6, line, -0.95, 0.24, -0.05);
  addBox(g, 3.2, 0.06, 0.08, line, 0, 0.28, -1.0);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    makeToonPbr({
      color: 0x44ffaa,
      emissive: 0x22aa66,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      metalness: 0.2,
      envMapIntensity: 0.7
    })
  );
  canopy.position.set(0, 0.42, 0.65);
  g.add(canopy);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 16),
    makeToonPbr({
      color: 0x44ff88,
      emissive: 0x44ff88,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.28;
  glow.name = 'glow';
  g.add(glow);
  for (const x of [-0.5, 0.5]) {
    addCyl(g, 0.2, 0.26, 0.65, 8, dark, x, -0.12, -1.7, Math.PI / 2, 0, 0);
    addCyl(g, 0.16, 0.18, 0.12, 8, line, x, -0.12, -2.05, Math.PI / 2, 0, 0);
  }
  gearSet(g, [[-0.75, -0.38, 0.35], [0.75, -0.38, 0.35], [0, -0.32, 1.15]], gearMetal, gearTire);
  addNavAndShadow(g, { x: 2.2, y: 0.15, z: 0.4 }, { x: 0, y: 0.35, z: -1.5 }, -0.85);
}

/** Amphibian — floats + high wing */
function kitAmphibian(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 5.2;
  addFuselage(g, 0.52, len, body, 0.55);
  addSphere(g, 0.48, 12, body, 0, 0.55, len / 2 + 0.15, 0.95, 0.82, 1.2);
  // High wing
  addWing(g, 10.2, 0.14, 1.55, body, 1.35, 0.2);
  addFlapHint(g, 7.2, 0.34, dark, 1.32, -0.45);
  addBox(g, 0.16, 1.05, 0.16, dark, -1.5, 0.9, 0.15);
  addBox(g, 0.16, 1.05, 0.16, dark, 1.5, 0.9, 0.15);
  addBox(g, 0.12, 0.9, 0.12, dark, -2.8, 0.95, 0.1, 0, 0, 0.3);
  addBox(g, 0.12, 0.9, 0.12, dark, 2.8, 0.95, 0.1, 0, 0, -0.3);
  addBox(g, 3.2, 0.1, 0.6, body, 0, 0.75, -2.2);
  addBox(g, 0.12, 1.4, 0.8, accent, 0, 1.35, -2.25);
  propDisc(g, 1.0, 0.55, len / 2 + 0.95, dark);
  addBox(g, 0.85, 0.55, 1.2, glass, 0, 0.95, 0.9);
  // Floats
  const floatMat = makeToonPbr({
    color: 0xd89850,
    roughness: 0.38,
    metalness: 0.5,
    envMapIntensity: 0.55
  });
  for (const x of [-0.95, 0.95]) {
    addBox(g, 0.5, 0.42, 4.0, floatMat, x, -0.45, 0.2);
    addBox(g, 0.35, 0.25, 0.7, floatMat, x, -0.25, 2.15);
    addBox(g, 0.09, 0.85, 0.09, dark, x * 0.55, 0.15, 0.6);
    addBox(g, 0.09, 0.85, 0.09, dark, x * 0.55, 0.15, -0.9);
  }
  // Retractable wheels on floats
  gearSet(g, [[-0.95, -0.85, 0.5, 0.4], [0.95, -0.85, 0.5, 0.4], [0, -0.7, 1.8, 0.4]], gearMetal, gearTire);
  addNavAndShadow(g, { x: 5.0, y: 1.35, z: 0.2 }, { x: 0, y: 1.95, z: -2.25 }, -1.15);
}

/** Aerobatic — short coupled, mid wing, smoke nozzle */
function kitAerobatic(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 3.6;
  addFuselage(g, 0.36, len, body, 0.3);
  addWing(g, 6.8, 0.14, 1.5, accent, 0.3, 0.15);
  addSphere(g, 0.42, 12, glass, 0, 0.62, 0.45, 1.1, 0.7, 1.2);
  addFlapHint(g, 4.8, 0.3, dark, 0.27, -0.5);
  // Tall rudder, short couple
  addBox(g, 2.2, 0.09, 0.5, body, 0, 0.4, -1.45);
  addBox(g, 0.12, 1.35, 0.85, accent, 0, 0.95, -1.5);
  propDisc(g, 1.05, 0.3, len / 2 + 0.55, dark);
  addBox(g, 0.62, 0.45, 1.0, glass, 0, 0.62, 0.45);
  addBox(g, 0.08, 0.35, 0.9, dark, -0.45, 0.35, 0.2);
  addBox(g, 0.08, 0.35, 0.9, dark, 0.45, 0.35, 0.2);
  // Wheel pants
  for (const x of [-0.75, 0.75]) {
    addBox(g, 0.22, 0.4, 0.75, dark, x, -0.1, 0.25);
  }
  gearSet(g, [[-0.75, -0.35, 0.25, 0.4], [0.75, -0.35, 0.25, 0.4], [0, -0.25, 1.2, 0.35]], gearMetal, gearTire);
  // Smoke nozzle under tail
  const nozzle = addCyl(g, 0.08, 0.1, 0.35, 6, metal, 0, -0.05, -1.7, Math.PI / 2, 0, 0);
  nozzle.name = 'smokeNozzle';
  addCyl(g, 0.06, 0.06, 0.08, 6, makeToonPbr({ color: 0x222222, emissive: 0x444444, emissiveIntensity: 0.3 }), 0, -0.05, -1.9, Math.PI / 2, 0, 0);
  addNavAndShadow(g, { x: 3.3, y: 0.3, z: 0.15 }, { x: 0, y: 1.5, z: -1.5 }, -0.7);
}

/** Cargo — high wing, four turboprops, blunt nose */
function kitCargo(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  const len = 8.0;
  addFuselage(g, 0.92, len * 0.92, body, 1.0);
  addSphere(g, 0.88, 12, body, 0, 0.95, len / 2 - 0.2, 1.05, 0.9, 1.15);
  addBox(g, 1.65, 1.5, 1.4, body, 0, 0.95, len / 2 - 0.15);
  // Ramp hint at rear
  addBox(g, 1.5, 0.12, 1.2, dark, 0, 0.2, -len / 2 + 0.4, 0.35, 0, 0);
  // High wing
  addWing(g, 14.5, 0.18, 2.4, body, 1.95, 0.25);
  addFlapHint(g, 10, 0.4, dark, 1.9, -0.8);
  addBox(g, 5.0, 0.14, 1.2, body, 0, 1.7, -3.6);
  addBox(g, 0.16, 2.3, 1.4, accent, 0, 2.55, -3.7);
  // Four props
  for (const x of [-5.0, -2.5, 2.5, 5.0]) {
    addCyl(g, 0.34, 0.4, 1.65, 8, dark, x, 1.55, 0.9, Math.PI / 2, 0, 0);
    addCyl(g, 0.38, 0.36, 0.2, 8, metal, x, 1.55, 1.7, Math.PI / 2, 0, 0);
    const prop = new THREE.Group();
    prop.name = 'prop';
    addBox(prop, 0.1, 1.7, 0.06, dark);
    const b2 = addBox(prop, 0.1, 1.7, 0.06, dark);
    b2.rotation.z = Math.PI / 2;
    prop.position.set(x, 1.55, 1.7);
    g.add(prop);
  }
  addBox(g, 1.3, 0.75, 1.1, glass, 0, 1.55, 3.5);
  gearSet(
    g,
    [
      [-1.35, -0.15, 1.2, 1.1],
      [1.35, -0.15, 1.2, 1.1],
      [-1.35, -0.15, -1.5, 1.1],
      [1.35, -0.15, -1.5, 1.1],
      [0, -0.1, 3.2, 1.0]
    ],
    gearMetal,
    gearTire
  );
  addNavAndShadow(g, { x: 7.1, y: 1.95, z: 0.25 }, { x: 0, y: 3.5, z: -3.7 }, -0.95);
}

/** Glider — very long thin wings, slender fuse */
function kitGlider(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  const gearMetal = kit.oleo || metal;
  const gearTire = kit.tire || dark;
  addFuselage(g, 0.24, 5.6, body, 0.2);
  addWing(g, 16.5, 0.08, 0.75, body, 0.32, 0.2);
  addSphere(g, 0.28, 12, glass, 0, 0.38, 1.4, 1.2, 0.7, 1.1);
  addFlapHint(g, 11, 0.22, accent, 0.3, -0.2);
  addBox(g, 0.06, 0.4, 0.3, accent, -8.15, 0.5, 0.2);
  addBox(g, 0.06, 0.4, 0.3, accent, 8.15, 0.5, 0.2);
  addBox(g, 2.6, 0.06, 0.4, body, 0, 0.4, -2.55);
  addBox(g, 0.07, 1.2, 0.65, accent, 0, 0.85, -2.6);
  addBox(g, 0.42, 0.36, 1.15, glass, 0, 0.44, 1.15);
  addBox(g, 0.5, 0.08, 0.9, accent, 0, 0.28, 0.2);
  // Single retractable wheel
  gearSet(g, [[0, -0.28, 0.35, 0.38]], gearMetal, gearTire);
  // Wingtip wheels (fixed tiny)
  addCyl(g, 0.06, 0.06, 0.08, 6, dark, -8.1, 0.05, 0.2, 0, 0, Math.PI / 2).name = 'gear';
  addCyl(g, 0.06, 0.06, 0.08, 6, dark, 8.1, 0.05, 0.2, 0, 0, Math.PI / 2).name = 'gear';
  addNavAndShadow(g, { x: 8.15, y: 0.32, z: 0.2 }, { x: 0, y: 1.35, z: -2.6 }, -0.55);
}

/** Heli — cabin bubble, rotor disc, skids */
function kitHeli(g, kit) {
  const { body, accent, dark, glass, metal } = kit;
  // Cabin + bubble
  addFuselage(g, 0.72, 2.4, body, 0.7);
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 16, 14),
    makeToonPbr({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.12,
      metalness: 0.1,
      envMapIntensity: 0.8
    })
  );
  bubble.scale.set(1.05, 0.85, 1.15);
  bubble.position.set(0, 1.05, 0.85);
  g.add(bubble);
  addBox(g, 1.45, 0.14, 2.4, accent, 0, 0.28, 0.1);
  // Boom
  addCyl(g, 0.16, 0.22, 3.0, 8, body, 0, 0.9, -2.15, Math.PI / 2, 0, 0);
  addBox(g, 0.12, 0.95, 0.55, accent, 0.55, 1.1, -3.55);
  addBox(g, 0.75, 0.1, 0.35, accent, 0.2, 1.05, -3.55);
  // Main rotor — two blade + disc
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  addCyl(rotor, 0.22, 0.22, 0.55, 10, accent, 0, 1.5, 0);
  addCyl(rotor, 0.35, 0.28, 0.22, 10, metal || accent, 0, 1.72, 0);
  const b1 = addBox(rotor, 0.28, 0.06, 6.2, dark, 0, 1.78, 0);
  const b2 = b1.clone();
  b2.rotation.y = Math.PI / 2;
  rotor.add(b2);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 28),
    makeToonPbr({
      color: 0x222222,
      transparent: true,
      opacity: 0.16,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.69;
  rotor.add(disc);
  g.add(rotor);
  const tr = new THREE.Group();
  tr.name = 'tailrotor';
  addBox(tr, 0.08, 1.15, 0.08, dark, 0.65, 1.1, -3.6);
  g.add(tr);
  // Skids (not retractable — leave visible; name gear for sync but keep always-ish)
  for (const x of [-0.62, 0.62]) {
    const skid = addBox(g, 0.08, 0.08, 3.0, dark, x, 0.1, 0.15);
    skid.name = 'gear';
    const t1 = addBox(g, 0.07, 0.5, 0.07, dark, x, 0.35, 0.75);
    t1.name = 'gear';
    const t2 = addBox(g, 0.07, 0.5, 0.07, dark, x, 0.35, -0.55);
    t2.name = 'gear';
  }
  addNavAndShadow(g, { x: 0.75, y: 1.2, z: 1.2 }, { x: 0, y: 1.75, z: -3.4 }, -0.15);
}

/** Medium-poly readable silhouettes — unique kit per aircraft id */
export function createAircraftMesh(spec) {
  const g = new THREE.Group();
  g.name = spec.id;
  const scale = spec.size || 1;
  const kit = aircraftKit(spec, getQualityKey());

  switch (spec.id) {
    case 'cessna182':
      kitCessna182(g, kit);
      break;
    case 'privatejet':
      kitPrivateJet(g, kit);
      break;
    case 'airliner':
      kitAirliner(g, kit);
      break;
    case 'f15':
      kitF15(g, kit);
      break;
    case 'area51':
      kitArea51(g, kit);
      break;
    case 'amphibian':
      kitAmphibian(g, kit);
      break;
    case 'aerobatic':
      kitAerobatic(g, kit);
      break;
    case 'cargo':
      kitCargo(g, kit);
      break;
    case 'glider':
      kitGlider(g, kit);
      break;
    case 'heli':
      kitHeli(g, kit);
      break;
    default:
      // Fallback: treat by type flags
      if (spec.isHeli) kitHeli(g, kit);
      else if (spec.type === 'experimental') kitArea51(g, kit);
      else if (spec.type === 'glider') kitGlider(g, kit);
      else if (spec.type === 'fighter') kitF15(g, kit);
      else if (spec.canWater) kitAmphibian(g, kit);
      else kitCessna182(g, kit);
      break;
  }

  addCraftDetails(g, spec);

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
  const cellColors = [0xff4422, 0xffffff, 0xff4422, 0x2266cc, 0xffffff, 0xff4422, 0x2266cc];
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.05, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    makeToonPbr({ color: 0xff5533, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide, envMapIntensity: 0.25 })
  );
  dome.position.y = 3.35;
  canopy.add(dome);
  for (let i = 0; i < 7; i++) {
    const stripe = new THREE.Mesh(
      new THREE.SphereGeometry(3.08, 10, 8, (i / 7) * Math.PI * 2, Math.PI * 0.16, 0, Math.PI * 0.5),
      makeToonPbr({ color: cellColors[i], roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide })
    );
    stripe.position.y = 3.35;
    canopy.add(stripe);
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

/** Sage-and-cream walkable pilot dino */
export function createDinoMesh() {
  const g = new THREE.Group();
  g.name = 'dino';
  const sage = makeToonPbr({ color: 0x88a494, roughness: 0.62, metalness: 0.04 });
  const cream = makeToonPbr({ color: 0xecece8, roughness: 0.7, metalness: 0.02 });
  const dark = makeFarLambert(0x2a2e32);
  const body = addSphere(g, 0.42, 12, sage, 0, 0.95, 0, 1.05, 1.15, 1.25);
  body.name = 'dinoBody';
  addSphere(g, 0.28, 10, cream, 0, 0.82, 0.22, 1.1, 1.0, 1.15);
  const head = addSphere(g, 0.32, 12, sage, 0, 1.48, 0.28, 1.05, 0.95, 1.15);
  head.name = 'dinoHead';
  addSphere(g, 0.16, 8, cream, 0, 1.38, 0.48, 1.2, 0.7, 1.1);
  addSphere(g, 0.06, 6, dark, 0.12, 1.55, 0.48);
  addSphere(g, 0.06, 6, dark, -0.12, 1.55, 0.48);
  addSphere(g, 0.035, 6, makeFarLambert(0xffffff), 0.14, 1.57, 0.52);
  addSphere(g, 0.035, 6, makeFarLambert(0xffffff), -0.14, 1.57, 0.52);
  const tail = new THREE.Group();
  tail.name = 'dinoTail';
  addCyl(tail, 0.06, 0.16, 0.95, 8, sage, 0, 0, -0.55, Math.PI / 2);
  tail.position.set(0, 0.9, -0.35);
  g.add(tail);
  const legL = new THREE.Group();
  legL.name = 'dinoLegL';
  addCyl(legL, 0.08, 0.11, 0.55, 8, sage, 0, -0.2, 0);
  addSphere(legL, 0.11, 8, cream, 0, -0.48, 0.08, 1.2, 0.6, 1.4);
  legL.position.set(-0.18, 0.55, 0.05);
  g.add(legL);
  const legR = new THREE.Group();
  legR.name = 'dinoLegR';
  addCyl(legR, 0.08, 0.11, 0.55, 8, sage, 0, -0.2, 0);
  addSphere(legR, 0.11, 8, cream, 0, -0.48, 0.08, 1.2, 0.6, 1.4);
  legR.position.set(0.18, 0.55, 0.05);
  g.add(legR);
  const armL = addCyl(g, 0.05, 0.07, 0.38, 6, sage, -0.38, 1.05, 0.12, 0.4, 0, 0.5);
  armL.name = 'dinoArmL';
  const armR = addCyl(g, 0.05, 0.07, 0.38, 6, sage, 0.38, 1.05, 0.12, 0.4, 0, -0.5);
  armR.name = 'dinoArmR';
  addBox(g, 0.08, 0.1, 0.08, sage, 0, 1.78, 0.12);
  addBox(g, 0.06, 0.08, 0.06, sage, 0.08, 1.72, -0.05);
  const wings = new THREE.Group();
  wings.name = 'dinoWings';
  wings.visible = false;
  const membrane = makeToonPbr({
    color: 0x3a5a6a,
    roughness: 0.75,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide
  });
  addBox(wings, 1.7, 0.04, 0.7, membrane, 0, 1.02, 0.05);
  addBox(wings, 0.35, 0.04, 0.85, membrane, 0, 0.55, -0.35);
  g.add(wings);
  return g;
}

export function createSkydiverMesh() {
  const g = createDinoMesh();
  g.rotation.x = 1.15;
  const wings = g.getObjectByName('dinoWings');
  if (wings) wings.visible = false;
  return g;
}

export function createWingsuitFlyerMesh() {
  const g = createDinoMesh();
  g.rotation.x = 1.05;
  const wings = g.getObjectByName('dinoWings');
  if (wings) wings.visible = true;
  wings.scale.set(1.35, 1, 1.15);
  return g;
}

export function createWingsuitRackMesh() {
  const g = new THREE.Group();
  g.name = 'suitRack';
  addBox(g, 0.12, 2.4, 0.12, makeFarLambert(0x6a5a44), -0.7, 1.2, 0);
  addBox(g, 0.12, 2.4, 0.12, makeFarLambert(0x6a5a44), 0.7, 1.2, 0);
  addBox(g, 1.7, 0.1, 0.1, makeFarLambert(0x4a3a2a), 0, 2.35, 0);
  const suit = makeToonPbr({ color: 0x2a4a58, roughness: 0.7, metalness: 0.08, side: THREE.DoubleSide });
  addBox(g, 1.35, 0.06, 0.7, suit, 0, 1.55, 0.05);
  addBox(g, 0.35, 0.9, 0.28, makeFarLambert(0x88a494), 0, 1.35, 0.05);
  addBox(g, 0.22, 0.22, 0.22, makeFarLambert(0x88a494), 0, 1.95, 0.12);
  return g;
}

export function createMotorcycleMesh() {
  const g = new THREE.Group();
  const red = makeToonPbr({ color: 0xff2a22, roughness: 0.38, metalness: 0.42, envMapIntensity: 0.45 });
  const black = makeFarLambert(0x141418);
  const chrome = makeToonPbr({ color: 0xd0d6dc, roughness: 0.22, metalness: 0.82 });
  addBox(g, 0.42, 0.38, 1.55, red, 0, 0.58, 0.05);
  addBox(g, 0.36, 0.22, 0.55, black, 0, 0.78, -0.45);
  addBox(g, 0.28, 0.16, 0.4, red, 0, 0.72, 0.55);
  addCyl(g, 0.16, 0.18, 0.55, 8, chrome, 0, 0.55, 0.12, Math.PI / 2);
  for (const z of [-0.78, 0.78]) {
    const wheel = addCyl(g, 0.4, 0.4, 0.16, 14, makeToonPbr({ color: 0x111111, roughness: 0.95 }), 0, 0.4, z, 0, 0, Math.PI / 2);
    wheel.name = z > 0 ? 'wheelF' : 'wheelR';
    addCyl(g, 0.22, 0.22, 0.1, 10, chrome, 0, 0.4, z, 0, 0, Math.PI / 2);
  }
  addBox(g, 0.07, 0.55, 0.07, chrome, 0, 0.72, 0.58);
  addBox(g, 0.72, 0.05, 0.05, chrome, 0, 0.98, 0.62);
  addBox(g, 0.12, 0.12, 0.12, black, -0.32, 0.98, 0.62);
  addBox(g, 0.12, 0.12, 0.12, black, 0.32, 0.98, 0.62);
  addBox(g, 0.38, 0.55, 0.38, makeFarLambert(0x1c2430), 0, 1.12, -0.12);
  addBox(g, 0.28, 0.22, 0.28, makeFarLambert(0xddbb99), 0, 1.48, -0.08);
  addBox(g, 0.22, 0.08, 0.18, makeToonPbr({ color: 0xffe066, emissive: 0xffaa33, emissiveIntensity: 0.7 }), 0, 0.55, 0.95);
  addBox(g, 0.16, 0.06, 0.08, makeToonPbr({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.5 }), 0, 0.52, -0.88);
  addBox(g, 0.08, 0.18, 0.28, black, 0, 0.62, -0.85);
  return g;
}

export function createSupercarMesh() {
  const g = new THREE.Group();
  const body = makeToonPbr({ color: 0x00c8ff, roughness: 0.32, metalness: 0.52, envMapIntensity: 0.6 });
  const dark = makeFarLambert(0x0a1520);
  const glass = makeToonPbr({ color: 0x88ddee, transparent: true, opacity: 0.48, roughness: 0.12, metalness: 0.12 });
  addBox(g, 1.95, 0.42, 4.5, body, 0, 0.52, 0);
  addBox(g, 1.75, 0.22, 1.15, body, 0, 0.82, -0.65);
  addBox(g, 1.85, 0.16, 0.7, body, 0, 0.48, 1.85);
  addBox(g, 1.6, 0.32, 1.45, dark, 0, 0.98, -0.12);
  addBox(g, 1.48, 0.08, 1.05, glass, 0, 1.16, 0.38, -0.22);
  addBox(g, 0.06, 0.18, 1.1, glass, 0.78, 0.95, 0.05);
  addBox(g, 0.06, 0.18, 1.1, glass, -0.78, 0.95, 0.05);
  addBox(g, 1.15, 0.06, 1.6, dark, 0, 0.34, 0.1);
  for (const [x, z] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) {
    const wh = addCyl(g, 0.38, 0.38, 0.3, 14, makeToonPbr({ color: 0x111111, roughness: 0.95 }), x, 0.38, z, 0, 0, Math.PI / 2);
    wh.name = 'wheel';
    addCyl(g, 0.18, 0.18, 0.32, 8, makeToonPbr({ color: 0xc9d0d6, metalness: 0.7, roughness: 0.3 }), x, 0.38, z, 0, 0, Math.PI / 2);
  }
  addBox(g, 1.55, 0.1, 0.16, makeToonPbr({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.85 }), 0, 0.48, 2.22);
  addBox(g, 1.35, 0.07, 0.1, makeToonPbr({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.65 }), 0, 0.46, -2.22);
  addBox(g, 1.7, 0.04, 0.55, dark, 0, 0.28, -2.05);
  addBox(g, 0.55, 0.08, 0.35, makeFarLambert(0xffcc33), 0, 0.72, 1.55);
  addBox(g, 0.12, 0.12, 0.12, makeFarLambert(0x111111), 0.55, 0.62, 1.9);
  addBox(g, 0.12, 0.12, 0.12, makeFarLambert(0x111111), -0.55, 0.62, 1.9);
  addBox(g, 0.08, 0.22, 0.08, dark, 0, 0.7, -0.9);
  return g;
}

export function createBalloonMesh() {
  const g = new THREE.Group();
  const gore = [0xff5533, 0xffe066, 0xffffff, 0x3a7ad8, 0xff5533, 0xffe066, 0xffffff, 0x3a7ad8];
  for (let i = 0; i < 8; i++) {
    const panel = new THREE.Mesh(
      new THREE.SphereGeometry(3.62, 8, 12, (i / 8) * Math.PI * 2, Math.PI * 0.26),
      makeToonPbr({ color: gore[i], roughness: 0.78, metalness: 0.04, side: THREE.DoubleSide })
    );
    panel.position.y = 8.2;
    panel.scale.y = 1.18;
    g.add(panel);
  }
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 0.7, 1.8, 12, 1, true),
    makeToonPbr({ color: 0xffeedd, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide })
  );
  skirt.position.y = 4.7;
  g.add(skirt);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.08, 6, 20),
    makeFarLambert(0x222222)
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 8.2;
  g.add(band);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xcc8844 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(a) * 2.2, 5.2, Math.sin(a) * 2.2),
          new THREE.Vector3(Math.cos(a) * 0.55, 2.2, Math.sin(a) * 0.55)
        ]),
        lineMat
      )
    );
  }
  addBox(g, 1.55, 1.3, 1.55, makeFarLambert(0x8a5a28), 0, 1.5, 0);
  addBox(g, 1.6, 0.12, 1.6, makeFarLambert(0x6a4020), 0, 2.18, 0);
  addBox(g, 0.18, 0.45, 0.18, makeFarLambert(0x333333), 0.55, 1.2, 0.55);
  addBox(g, 0.18, 0.45, 0.18, makeFarLambert(0x333333), -0.55, 1.2, 0.55);
  const burner = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.7, 8),
    makeToonPbr({ color: 0xffaa33, emissive: 0xff6600, emissiveIntensity: 0.8, roughness: 0.5 })
  );
  burner.position.y = 2.7;
  burner.name = 'burner';
  g.add(burner);
  const bag = makeFarLambert(0xc2a36a);
  addBox(g, 0.28, 0.32, 0.28, bag, 0.7, 0.95, 0.55);
  addBox(g, 0.28, 0.32, 0.28, bag, -0.7, 0.95, 0.55);
  return g;
}

export function createRocketMesh() {
  const g = new THREE.Group();
  addCyl(g, 1.15, 1.35, 12, 14, makeToonPbr({ color: 0xf2f2f5, roughness: 0.32, metalness: 0.5 }), 0, 7, 0);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 3.2, 14),
    makeToonPbr({ color: 0xff3333, roughness: 0.4, metalness: 0.2 })
  );
  nose.position.y = 14.6;
  g.add(nose);
  addCyl(g, 1.18, 1.18, 0.55, 14, makeToonPbr({ color: 0x2244aa, roughness: 0.45, metalness: 0.25 }), 0, 10, 0);
  addCyl(g, 1.18, 1.18, 0.4, 14, makeToonPbr({ color: 0x2244aa, roughness: 0.45, metalness: 0.25 }), 0, 4.2, 0);
  addBox(g, 0.35, 0.22, 0.08, makeFarLambert(0x88ccee), 0, 12.4, 1.12);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const fin = addBox(g, 0.12, 2.6, 1.9, makeToonPbr({ color: 0xff3333, roughness: 0.45, metalness: 0.15 }));
    fin.position.set(Math.cos(a) * 1.25, 2.1, Math.sin(a) * 1.25);
    fin.rotation.y = a;
    const grid = addBox(g, 0.06, 0.9, 0.9, makeFarLambert(0x8899aa));
    grid.position.set(Math.cos(a) * 1.4, 11.2, Math.sin(a) * 1.4);
    grid.rotation.y = a;
    grid.name = 'gridfin';
  }
  for (const [x, z] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
    addCyl(g, 0.22, 0.32, 0.7, 8, makeToonPbr({ color: 0x445566, metalness: 0.6, roughness: 0.35 }), x, 0.4, z);
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
