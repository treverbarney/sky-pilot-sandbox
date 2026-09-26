import * as THREE from 'three';
import { createExplosion } from './meshes.js';
import { makeToonPbr, makeFarLambert } from './materials.js';

/**
 * Visual FX: explosions, contrails/wake, landing dust & splash.
 * Keep particle counts modest for phones.
 */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this._trailAcc = 0;
    this._wakeAcc = 0;
    // Shared geometries to reduce allocs
    this._geoS = new THREE.SphereGeometry(0.35, 5, 4);
    this._geoM = new THREE.SphereGeometry(0.5, 5, 4);
  }

  explode(pos) {
    const parts = createExplosion(this.scene, pos);
    this.particles.push(...parts);
  }

  /** Soft contrail puffs behind fast aircraft */
  contrail(pos, vel, intensity = 1) {
    if (intensity < 0.15) return;
    this._trailAcc += intensity;
    if (this._trailAcc < 0.85) return;
    this._trailAcc = 0;
    const n = intensity > 0.7 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(
        this._geoM,
        makeToonPbr({
          color: 0xe8f4ff,
          emissive: 0xaaccff,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.4,
          roughness: 1,
          metalness: 0
        })
      );
      p.position.copy(pos);
      p.position.x += (Math.random() - 0.5) * 1.4;
      p.position.y += (Math.random() - 0.5) * 0.7;
      const back = vel.clone().normalize().multiplyScalar(-1);
      p.userData.vel = back.multiplyScalar(2 + Math.random()).add(
        new THREE.Vector3((Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2)
      );
      p.userData.life = 1.4 + Math.random() * 1.6;
      p.userData.fade = true;
      p.userData.grow = 0.55;
      p.scale.setScalar(0.6 + Math.random() * 0.5);
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /** Water wake / spray */
  wake(pos, speed) {
    this._wakeAcc += speed * 0.02;
    if (this._wakeAcc < 1) return;
    this._wakeAcc = 0;
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(
        this._geoS,
        makeToonPbr({
          color: 0xaad4ff,
          emissive: 0x66aadd,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.6,
          roughness: 0.4,
          metalness: 0.1
        })
      );
      p.position.set(
        pos.x + (Math.random() - 0.5) * 2.2,
        pos.y + 0.25,
        pos.z + (Math.random() - 0.5) * 2.2
      );
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        2.5 + Math.random() * 6,
        (Math.random() - 0.5) * 7
      );
      p.userData.life = 0.55 + Math.random() * 0.55;
      p.userData.fade = true;
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /** Landing dust cloud on runway / dirt */
  landingDust(pos, intensity = 1) {
    const count = Math.min(28, 12 + Math.floor(intensity * 14));
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        this._geoM,
        makeToonPbr({
          color: i % 3 === 0 ? 0xe8d0a0 : 0xc4a060,
          emissive: 0x9a7850,
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 0.72,
          roughness: 1,
          metalness: 0
        })
      );
      p.position.copy(pos);
      p.position.y = Math.max(0.2, pos.y);
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 16 * intensity,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 16 * intensity
      );
      p.userData.life = 0.95 + Math.random() * 1.0;
      p.userData.fade = true;
      p.userData.grow = 0.95;
      p.scale.setScalar(0.65 + Math.random() * 1.2);
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /** Splash burst for water touchdown — white-cyan */
  splash(pos, intensity = 1) {
    const count = Math.min(34, 14 + Math.floor(intensity * 16));
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        this._geoS,
        makeToonPbr({
          color: i % 2 ? 0xd8f4ff : 0x9ad0f0,
          emissive: 0x88ccee,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.78,
          roughness: 0.25,
          metalness: 0.12
        })
      );
      p.position.copy(pos);
      p.position.y = Math.max(0.3, pos.y);
      const ang = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 18 * intensity;
      p.userData.vel = new THREE.Vector3(
        Math.cos(ang) * sp,
        6 + Math.random() * 14 * intensity,
        Math.sin(ang) * sp
      );
      p.userData.life = 0.75 + Math.random() * 0.9;
      p.userData.fade = true;
      p.userData.grow = 0.5;
      this.scene.add(p);
      this.particles.push(p);
    }
    // Wide foam disc flash
    const foam = new THREE.Mesh(
      new THREE.CircleGeometry(3.2 + intensity * 2.4, 14),
      new THREE.MeshBasicMaterial({
        color: 0xe8f8ff,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(pos.x, Math.max(0.4, pos.y) + 0.05, pos.z);
    foam.userData.vel = new THREE.Vector3(0, 0, 0);
    foam.userData.life = 0.55;
    foam.userData.isFlash = true;
    foam.userData.grow = 3.6;
    this.scene.add(foam);
    this.particles.push(foam);
  }


  /** Aerobatic / AB smoke trail */
  smokeTrail(pos, vel, intensity = 1) {
    this._trailAcc += intensity * 0.6;
    if (this._trailAcc < 0.7) return;
    this._trailAcc = 0;
    const p = new THREE.Mesh(
      this._geoM,
      makeFarLambert(0xdddddd, null, { transparent: true, opacity: 0.5 })
    );
    p.position.copy(pos);
    p.position.x += (Math.random() - 0.5) * 0.8;
    const back = vel.clone().normalize().multiplyScalar(-1);
    p.userData.vel = back.multiplyScalar(1.5 + Math.random()).add(
      new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.4, (Math.random() - 0.5) * 1.5)
    );
    p.userData.life = 1.8 + Math.random();
    p.userData.fade = true;
    p.userData.grow = 0.8;
    p.userData.isSmoke = true;
    p.scale.setScalar(0.7);
    this.scene.add(p);
    this.particles.push(p);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life -= dt;
      if (!p.userData.isFlash) {
        const grav = p.userData.isSmoke ? 6 : 18;
        p.userData.vel.y -= grav * dt;
      }
      p.position.addScaledVector(p.userData.vel, dt);
      if (p.userData.spin) {
        p.rotation.x += p.userData.spin * dt;
        p.rotation.z += p.userData.spin * 0.7 * dt;
      }
      if (p.userData.isFlash) {
        const grow = p.userData.grow || 8;
        p.scale.multiplyScalar(1 + grow * dt);
        if (p.material) p.material.opacity = Math.max(0, p.userData.life * 2.8);
      } else if (p.userData.fade && p.material) {
        p.material.opacity = Math.max(0, Math.min(0.65, p.userData.life * 0.45));
        const g = p.userData.grow || 0.35;
        p.scale.multiplyScalar(1 + g * dt);
      } else {
        p.scale.multiplyScalar(0.985);
      }
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        // Don't dispose shared geos
        if (p.geometry !== this._geoS && p.geometry !== this._geoM) {
          p.geometry?.dispose?.();
        }
        p.material?.dispose?.();
        this.particles.splice(i, 1);
      }
    }
  }
}
