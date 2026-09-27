import * as THREE from 'three';

/** Floating course rings — Pilotwings circuit over the compact world. */

export class FlightCourse {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'course';
    this.rings = [];
    this.hit = 0;
    this.active = false;
    scene.add(this.group);
  }

  layoutFor(spec) {
    this.clear();
    const pts = this._points(spec);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3dff9a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const glow = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    pts.forEach((p, i) => {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(p.r, p.r * 0.08, 10, 28), mat.clone());
      torus.position.set(p.x, p.y, p.z);
      torus.rotation.y = p.yaw || 0;
      torus.userData.idx = i;
      torus.userData.r = p.r;
      torus.userData.taken = false;
      const inner = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.92, p.r * 0.02, 8, 20), glow);
      torus.add(inner);
      this.group.add(torus);
      this.rings.push(torus);
    });
    this.hit = 0;
    this.active = true;
  }

  _points(spec) {
    if (spec?.isHeli) {
      return [
        { x: -40, y: 18, z: -40, r: 8 },
        { x: 40, y: 28, z: 40, r: 8 },
        { x: 90, y: 22, z: -20, r: 8 },
        { x: WORLD_PAD, y: 16, z: 20, r: 9 }
      ];
    }
    if (spec?.type === 'glider') {
      return [
        { x: 40, y: 360, z: -80, r: 16 },
        { x: 160, y: 280, z: 80, r: 16 },
        { x: 80, y: 180, z: 220, r: 14 },
        { x: 0, y: 90, z: 80, r: 14 },
        { x: 0, y: 28, z: -200, r: 12 }
      ];
    }
    const high = spec?.type === 'fighter' || spec?.type === 'experimental' || spec?.id === 'airliner';
    const y0 = high ? 55 : 38;
    return [
      { x: 0, y: y0, z: 220, r: 14 },
      { x: 0, y: y0 + 35, z: 520, r: 16 },
      { x: 220, y: y0 + 40, z: 280, r: 16, yaw: 0.6 },
      { x: 90, y: y0 + 10, z: -80, r: 14, yaw: -0.4 },
      { x: 0, y: 32, z: -420, r: 12 }
    ];
  }

  clear() {
    this.rings.forEach((r) => this.group.remove(r));
    this.rings = [];
    this.hit = 0;
    this.active = false;
  }

  update(pos) {
    if (!this.active || !pos) return 0;
    let gained = 0;
    for (const ring of this.rings) {
      if (ring.userData.taken) {
        ring.rotation.z += 0.02;
        continue;
      }
      ring.rotation.z += 0.015;
      const d = ring.position.distanceTo(pos);
      if (d < ring.userData.r * 0.92) {
        ring.userData.taken = true;
        ring.material.color.setHex(0xffd24a);
        ring.material.opacity = 0.35;
        this.hit += 1;
        gained += 1;
      }
    }
    return gained;
  }

  get total() { return this.rings.length; }

  pulse(t) {
    for (const ring of this.rings) {
      if (ring.userData.taken) continue;
      const s = 1 + Math.sin(t * 3 + ring.userData.idx) * 0.04;
      ring.scale.setScalar(s);
    }
  }
}

const WORLD_PAD = 0;
