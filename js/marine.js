import * as THREE from 'three';
import { WORLD } from './world.js';

function body(color, length, radius) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), mat);
  hull.rotation.z = Math.PI / 2;
  g.add(hull);
  return g;
}

function dolphinMesh() {
  const g = body(0x8fd4e8, 2.4, 0.35);
  const snout = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.7, 6),
    new THREE.MeshLambertMaterial({ color: 0xd8f4ff })
  );
  snout.rotation.z = -Math.PI / 2;
  snout.position.x = 1.7;
  g.add(snout);
  return g;
}

function whaleMesh() {
  const g = body(0x243044, 10, 1.3);
  const fluke = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.15, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x1a2838 })
  );
  fluke.position.x = -6.2;
  g.add(fluke);
  return g;
}

function sharkMesh() {
  const g = body(0x6a7380, 3.2, 0.4);
  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.9, 4),
    new THREE.MeshLambertMaterial({ color: 0x4e565f })
  );
  fin.position.y = 0.7;
  g.add(fin);
  return g;
}

/**
 * A few animals in the southeast of the lake. The north-south strip through
 * the lake center stays empty so it can be used as a water runway.
 */
export function createMarine(scene) {
  const root = new THREE.Group();
  root.name = 'marine';
  scene.add(root);
  const lake = WORLD.lake;
  const animals = [];

  function add(mesh, orbitR, speed, phase, bob) {
    mesh.position.y = 2.1;
    root.add(mesh);
    animals.push({ mesh, orbitR, speed, phase, bob });
  }

  add(dolphinMesh(), 78, 0.35, 0.2, 1.1);
  add(dolphinMesh(), 96, 0.42, 2.1, 1.3);
  add(dolphinMesh(), 64, 0.5, 4.0, 0.9);
  add(whaleMesh(), 130, 0.08, 1.2, 0.35);
  add(sharkMesh(), 88, 0.22, 3.3, 0.15);
  add(sharkMesh(), 110, 0.18, 5.1, 0.2);

  // Orbit center is offset from the lake center, away from x = lake.x.
  const cx = lake.x + 150;
  const cz = lake.z + 70;

  return {
    root,
    update(dt) {
      const t = performance.now() * 0.001;
      for (const a of animals) {
        a.phase += a.speed * dt;
        let x = cx + Math.cos(a.phase) * a.orbitR;
        let z = cz + Math.sin(a.phase) * a.orbitR * 0.72;
        // Keep the centerline water lane clear.
        if (Math.abs(x - lake.x) < 48) x += Math.sign(x - lake.x || 1) * 48;
        const dx = lake.x - x;
        const dz = lake.z - z;
        const d = Math.hypot(dx, dz);
        if (d > lake.r - 36) {
          x = lake.x - (dx / d) * (lake.r - 36);
          z = lake.z - (dz / d) * (lake.r - 36);
        }
        const leap = a.bob > 0.5 ? Math.max(0, Math.sin(t * 1.4 + a.phase)) : 0;
        a.mesh.position.set(x, 1.9 + leap * a.bob, z);
        a.mesh.rotation.y = -a.phase;
        a.mesh.rotation.z = Math.sin(t * 2 + a.phase) * 0.08;
      }
    }
  };
}
