import * as THREE from 'three';
import { WORLD } from './world.js';

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function hull(color, length, radius) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 8), mat(color));
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}

function tail(color, w, h) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, w), mat(color));
  t.name = 'tail';
  const stock = new THREE.Mesh(new THREE.BoxGeometry(h, 0.08, 0.2), mat(color));
  stock.position.x = -h * 0.4;
  t.add(stock);
  return t;
}

function dolphinMesh(color) {
  const g = new THREE.Group();
  g.add(hull(color, 2.2, 0.32));
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 4, 6), mat(0xe7f7ff));
  belly.rotation.z = Math.PI / 2;
  belly.position.y = -0.12;
  g.add(belly);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 6), mat(0xd8f4ff));
  snout.rotation.z = -Math.PI / 2;
  snout.position.x = 1.65;
  g.add(snout);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), mat(color));
  fin.position.set(-0.1, 0.38, 0);
  g.add(fin);
  const pec = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.7), mat(color));
  pec.position.set(0.2, -0.15, 0);
  g.add(pec);
  const fluke = tail(color, 0.9, 0.45);
  fluke.position.x = -1.45;
  g.add(fluke);
  g.userData.kind = 'dolphin';
  return g;
}

function whaleMesh() {
  const g = new THREE.Group();
  g.add(hull(0x243044, 11, 1.35));
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 7, 4, 8), mat(0x8aa0b8));
  belly.rotation.z = Math.PI / 2;
  belly.position.y = -0.45;
  g.add(belly);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.1), mat(0x1a2838));
  jaw.position.set(6.2, -0.2, 0);
  g.add(jaw);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 4), mat(0x1c2a3a));
  fin.position.set(-1, 1.3, 0);
  g.add(fin);
  const fluke = tail(0x1a2838, 3.2, 1.4);
  fluke.position.x = -6.6;
  g.add(fluke);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 6), mat(0xf4fbff));
  spout.name = 'spout';
  spout.position.set(2.2, 1.8, 0);
  g.add(spout);
  g.userData.kind = 'whale';
  return g;
}

function sharkMesh() {
  const g = new THREE.Group();
  g.add(hull(0x6d7682, 3.1, 0.38));
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 4), mat(0x3e4650));
  fin.position.y = 0.62;
  g.add(fin);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 5), mat(0x9aa3ad));
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 2.05;
  g.add(nose);
  const fluke = tail(0x525a64, 1.1, 0.7);
  fluke.position.x = -1.9;
  g.add(fluke);
  g.userData.kind = 'shark';
  return g;
}

function buoy(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), mat(color));
  body.scale.y = 1.3;
  body.position.y = 0.4;
  g.add(body);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5), mat(0x222222));
  pole.position.y = 1.3;
  g.add(pole);
  return g;
}

/**
 * Animals stay in the southeast basin. Orange and green buoys mark the edges
 * of the north-south water lane through the lake center, and nothing swims there.
 */
export function createMarine(scene) {
  const root = new THREE.Group();
  root.name = 'marine';
  scene.add(root);
  const lake = WORLD.lake;
  const animals = [];

  function add(mesh, orbitR, speed, phase, bob, depth) {
    root.add(mesh);
    animals.push({ mesh, orbitR, speed, phase, bob, depth });
  }

  add(dolphinMesh(0x8fd4e8), 70, 0.38, 0.4, 1.15, 0);
  add(dolphinMesh(0xb7e6c8), 92, 0.46, 2.2, 1.25, 0);
  add(dolphinMesh(0x7ec8ea), 58, 0.52, 4.1, 1.0, 0);
  add(whaleMesh(), 128, 0.07, 1.1, 0.4, 0.4);
  add(sharkMesh(), 84, 0.24, 3.4, 0.05, 0.9);
  add(sharkMesh(), 108, 0.19, 5.4, 0.05, 1.1);

  const laneZ0 = lake.z - 200;
  const laneZ1 = lake.z + 200;
  for (let z = laneZ0; z <= laneZ1; z += 55) {
    for (const [side, color] of [[-1, 0xff8a2a], [1, 0x3ddc7a]]) {
      const b = buoy(color);
      b.position.set(lake.x + side * 52, 1.7, z);
      root.add(b);
    }
  }

  const cx = lake.x + 145;
  const cz = lake.z + 80;

  return {
    root,
    update(dt) {
      const t = performance.now() * 0.001;
      for (const a of animals) {
        a.phase += a.speed * dt;
        let x = cx + Math.cos(a.phase) * a.orbitR;
        let z = cz + Math.sin(a.phase * 0.92) * a.orbitR * 0.7;
        if (Math.abs(x - lake.x) < 58) x += Math.sign(x - lake.x || 1) * 58;
        const dx = lake.x - x;
        const dz = lake.z - z;
        const d = Math.hypot(dx, dz);
        const limit = lake.r - 40;
        if (d > limit) {
          x = lake.x - (dx / d) * limit;
          z = lake.z - (dz / d) * limit;
        }
        const kind = a.mesh.userData.kind;
        const leap = kind === 'dolphin' ? Math.max(0, Math.sin(t * 1.35 + a.phase * 2)) : 0;
        a.mesh.position.set(x, 1.85 + leap * a.bob - a.depth, z);
        a.mesh.rotation.y = -a.phase + (kind === 'shark' ? 0.4 : 0);
        a.mesh.rotation.z = Math.sin(t * 2.1 + a.phase) * (kind === 'dolphin' ? 0.12 : 0.04);
        const tailM = a.mesh.getObjectByName('tail');
        if (tailM) tailM.rotation.y = Math.sin(t * (kind === 'whale' ? 1.2 : 6) + a.phase) * 0.45;
        const spout = a.mesh.getObjectByName('spout');
        if (spout) {
          const blow = Math.max(0, Math.sin(t * 0.35 + a.phase));
          spout.visible = blow > 0.55;
          spout.scale.y = 0.4 + blow;
        }
      }
    }
  };
}
