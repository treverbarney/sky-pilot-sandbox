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

  if (light && len >= 140) {
    flight.euler.z += (Math.random() - 0.5) * rough * 0.15;
    flight.velocity.x *= 0.99;
    flight.velocity.z *= 0.99;
    flight.quaternion.setFromEuler(flight.euler);
    if (!wasGround && flight.airborneTime > 1.2) {
      return { event: 'rough', reason: 'bumpy lease-road rollout', vert, gs };
    }
    return null;
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
    const ok = len >= 700 && rough < 0.3;
    if (ok && gs > 42) {
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
  const dx = rd.bx - rd.ax;
  const dz = rd.bz - rd.az;
  const len = Math.hypot(dx, dz);
  const geo = new THREE.PlaneGeometry(rd.halfW * 2, len);
  const mat = new THREE.MeshLambertMaterial({ color: rd.rough > 0.3 ? 0x8a6844 : 0xa48458 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((rd.ax + rd.bx) / 2, 1.25, (rd.az + rd.bz) / 2);
  mesh.rotation.z = -Math.atan2(dx, dz);
  return mesh;
}

export function createFieldOps(scene) {
  const root = new THREE.Group();
  root.name = 'field-ops';
  scene.add(root);
  const beams = [];

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
      for (const beam of beams) {
        if (beam) beam.rotation.z = Math.sin(t * 1.3) * 0.35;
      }
    }
  };
}
