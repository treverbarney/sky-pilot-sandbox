import * as THREE from 'three';

// Informational distances, not a hard sim:
// 182 / short-field: about 150–300 m of dirt is enough, rollout is bumpy.
// Airliner: about 1600 m and nearly flat, otherwise it bounces or breaks.
// Fighter: about 700 m and enough speed, otherwise a hard bounce.
// Balloon sits on flat ground in modes.js as long as it is not a building.

const ROADS = [
  {
    name: 'Bakken 14-22',
    ax: 1180, az: 1180, bx: 1180, bz: 1480,
    halfW: 8, rough: 0.42
  },
  {
    name: 'Lease spur',
    ax: 360, az: -1560, bx: 500, bz: -1560,
    halfW: 6, rough: 0.55
  },
  {
    name: 'Section-line dirt',
    ax: -1580, az: -150, bx: -1580, bz: 1750,
    halfW: 14, rough: 0.15
  },
  {
    // ~370 m, east of the lake. Long enough for a 182 or duster, short and rough for an airliner or fighter.
    name: 'East two-track',
    ax: 1480, az: -620, bx: 1480, bz: -250,
    halfW: 8, rough: 0.36
  }
];

function segDist(x, z, rd) {
  const dx = rd.bx - rd.ax;
  const dz = rd.bz - rd.az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - rd.ax) * dx + (z - rd.az) * dz) / len2));
  const px = rd.ax + dx * t;
  const pz = rd.az + dz * t;
  return { d: Math.hypot(x - px, z - pz), len: Math.hypot(dx, dz) };
}

export function leaseTouch(flight, surf, vert, gs, wasGround) {
  const s = flight.spec;
  const len = surf.lengthM || 0;
  const rough = surf.rough || 0.4;
  const light = s.id === 'cessna182' || s.id === 'duster' || s.shortField;
  const heavy = s.id === 'airliner' || s.id === 'cargo';
  const hot = s.type === 'fighter' || s.id === 'f15' || s.id === 'privatejet' || s.id === 'area51';

  if (s.isHeli) return null;

  if (light && len >= 160) {
    flight.euler.z += (Math.random() - 0.5) * rough * 0.15;
    flight.velocity.x *= 0.99;
    flight.velocity.z *= 0.99;
    flight.quaternion.setFromEuler(flight.euler);
    if (!wasGround && flight.airborneTime > 1.2) {
      return { event: 'rough', reason: 'bumpy lease-road rollout', vert, gs };
    }
    return null;
  }
  if (light && len < 160) {
    if (vert > 8 || gs > 45) {
      flight.alive = false;
      return { event: 'crash', reason: 'dirt strip too short for even a light plane', vert, gs };
    }
    flight.velocity.y = 1.8;
    flight.onGround = false;
    flight.position.y += 0.45;
    return { event: 'bounce', reason: 'dirt strip shorter than a 182 or duster can use', vert, gs };
  }

  if (heavy) {
    const ok = len >= 1600 && rough < 0.22;
    if (ok) {
      return !wasGround && flight.airborneTime > 1.2
        ? { event: 'rough', reason: 'long dirt strip — still not a paved runway', vert, gs }
        : null;
    }
    if (vert > 6 || gs > 72) {
      flight.alive = false;
      return { event: 'crash', reason: 'airliner broke up on the lease road', vert, gs };
    }
    flight.velocity.y = 2.6 + vert * 0.35;
    flight.velocity.x *= 0.55;
    flight.velocity.z *= 0.55;
    flight.onGround = false;
    flight.position.y += 0.9;
    return { event: 'bounce', reason: 'lease road too short and rough for the airliner', vert, gs };
  }

  if (hot) {
    const longEnough = len >= 750 && rough < 0.3;
    const fastEnough = gs > 55;
    if (longEnough && fastEnough) {
      return !wasGround ? { event: 'rough', reason: 'fast dirt rollout', vert, gs } : null;
    }
    if (gs > 85 || vert > 5.5) {
      flight.alive = false;
      return { event: 'crash', reason: 'fighter needs more length and speed', vert, gs };
    }
    flight.velocity.y = 3.4;
    flight.velocity.x *= 0.62;
    flight.velocity.z *= 0.62;
    flight.onGround = false;
    flight.position.y += 0.75;
    return { event: 'bounce', reason: 'lease road too short for the fighter', vert, gs };
  }

  if (len >= 400 && rough < 0.36) {
    return !wasGround ? { event: 'rough', reason: 'dirt rollout', vert, gs } : null;
  }
  if (vert > 8 || gs > 48) {
    flight.alive = false;
    return { event: 'crash', reason: 'broke up on the lease road', vert, gs };
  }
  flight.velocity.y = 2.1;
  flight.onGround = false;
  flight.position.y += 0.55;
  return { event: 'bounce', reason: 'lease road too rough', vert, gs };
}

function pumpjack() {
  const g = new THREE.Group();
  const steel = new THREE.MeshLambertMaterial({ color: 0xc4552a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2e33 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 4.2), dark);
  base.position.y = 0.2;
  g.add(base);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), steel);
  post.position.y = 1.8;
  g.add(post);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 0.28), steel);
  beam.position.y = 3.3;
  beam.name = 'beam';
  const horse = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.4), dark);
  horse.position.set(2.2, -0.4, 0);
  beam.add(horse);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), dark);
  weight.position.set(-2.3, -0.2, 0);
  beam.add(weight);
  g.add(beam);
  return g;
}

function derrick() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd7d3c4 });
  const leg = new THREE.BoxGeometry(0.35, 28, 0.35);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const m = new THREE.Mesh(leg, mat);
    m.position.set(x, 14, z);
    g.add(m);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 5), mat);
  crown.position.y = 28;
  g.add(crown);
  const sub = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 8), new THREE.MeshLambertMaterial({ color: 0x3a4250 }));
  sub.position.y = 1.2;
  g.add(sub);
  return g;
}

function tanks() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xe8e4d8 });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.2, 10), mat);
    t.position.set(i * 4.2, 2.2, 0);
    g.add(t);
  }
  return g;
}

function roadMesh(rd) {
  const g = new THREE.Group();
  const dx = rd.bx - rd.ax;
  const dz = rd.bz - rd.az;
  const len = Math.hypot(dx, dz);
  const midX = (rd.ax + rd.bx) / 2;
  const midZ = (rd.az + rd.bz) / 2;
  const yaw = -Math.atan2(dx, dz);
  const dirt = rd.rough > 0.3 ? 0x8a6844 : 0xa48458;

  function lay(width, color, y) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, len),
      new THREE.MeshLambertMaterial({ color })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw;
    mesh.position.set(midX, y, midZ);
    g.add(mesh);
  }

  lay(rd.halfW * 2 + 6, 0x6d5438, 1.18); // gravel shoulder
  lay(rd.halfW * 2, dirt, 1.26);
  lay(1.1, 0x5c4630, 1.32); // center rut
  return g;
}

function flareStack() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 14, 6),
    new THREE.MeshLambertMaterial({ color: 0xb9b3a4 })
  );
  pole.position.y = 7;
  g.add(pole);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.4, 6),
    new THREE.MeshLambertMaterial({ color: 0xffb15a, emissive: 0xff6a1a, emissiveIntensity: 0.8 })
  );
  flame.name = 'flame';
  flame.position.y = 15.2;
  g.add(flame);
  return g;
}

function trailer() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c4 })
  );
  box.position.y = 1.8;
  g.add(box);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.6, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x3a4250 })
  );
  door.position.set(1.65, 1.6, 2.4);
  g.add(door);
  return g;
}

function pickup() {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 2.2), new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
  cab.position.set(0, 1.3, 0.6);
  g.add(cab);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.2), new THREE.MeshLambertMaterial({ color: 0x8e2c24 }));
  bed.position.set(0, 0.9, -1.4);
  g.add(bed);
  return g;
}

function wellhead() {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c3138 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6), dark);
  pipe.position.y = 0.8;
  g.add(pipe);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.28), new THREE.MeshLambertMaterial({ color: 0xd4552a }));
  cross.position.y = 1.5;
  g.add(cross);
  return g;
}

function dressLease(root, flames) {
  const flare = flareStack();
  flare.position.set(1275, 1.2, 1265);
  root.add(flare);
  const flame = flare.getObjectByName('flame');
  if (flame) flames.push(flame);

  const doghouse = trailer();
  doghouse.position.set(1148, 1.2, 1168);
  root.add(doghouse);

  const truck = pickup();
  truck.position.set(1162, 1.2, 1178);
  truck.rotation.y = 0.4;
  root.add(truck);

  for (const [x, z] of [[1132, 1268], [1210, 1395], [1260, 1290]]) {
    const w = wellhead();
    w.position.set(x, 1.2, z);
    root.add(w);
  }

  // Fence posts along the east side of the Bakken lease, off the road.
  const postMat = new THREE.MeshLambertMaterial({ color: 0xc8b48a });
  for (let z = 1180; z <= 1480; z += 18) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 5), postMat);
    post.position.set(1202, 1.8, z);
    root.add(post);
  }

  // A few pumpjacks beside the long section-line strip, not on it.
  return;
}

export function createFieldOps(scene) {
  const root = new THREE.Group();
  root.name = 'field-ops';
  scene.add(root);
  const beams = [];
  const flames = [];

  for (const rd of ROADS) {
    const mesh = roadMesh(rd);
    rd.length = Math.hypot(rd.bx - rd.ax, rd.bz - rd.az);
    root.add(mesh);
  }

  const jacks = [
    [1120, 1280], [1120, 1360], [1245, 1320], [1088, 1420]
  ];
  for (const [x, z] of jacks) {
    const p = pumpjack();
    p.position.set(x, 1.2, z);
    root.add(p);
    beams.push(p.getObjectByName('beam'));
  }

  const rig = derrick();
  rig.position.set(1240, 1.2, 1220);
  root.add(rig);

  const battery = tanks();
  battery.position.set(1105, 1.2, 1210);
  root.add(battery);
  dressLease(root, flames);

  const sideJacks = [[-1540, 200], [-1540, 700], [-1620, 1100], [1536, -430]];
  for (const [x, z] of sideJacks) {
    const p = pumpjack();
    p.position.set(x, 1.2, z);
    root.add(p);
    beams.push(p.getObjectByName('beam'));
  }

  return {
    root,
    classify(x, z) {
      for (const rd of ROADS) {
        const hit = segDist(x, z, rd);
        if (hit.d < rd.halfW + 2) {
          return {
            id: 'lease',
            name: rd.name,
            rough: rd.rough,
            lengthM: hit.len,
            long: hit.len >= 1500,
            maxClass: hit.len >= 1500 && rd.rough < 0.22 ? 'heavy' : 'light'
          };
        }
      }
      return null;
    },
    update(dt) {
      const t = performance.now() * 0.001;
      beams.forEach((beam, i) => {
        if (beam) beam.rotation.z = Math.sin(t * 1.3 + i * 0.7) * 0.38;
      });
      for (const flame of flames) {
        const flick = 0.75 + Math.abs(Math.sin(t * 9)) * 0.45;
        flame.scale.y = flick;
        flame.material.emissiveIntensity = 0.5 + flick;
      }
    }
  };
}
