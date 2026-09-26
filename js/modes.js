import * as THREE from 'three';
import {
  createParachuteMesh, createMotorcycleMesh, createSupercarMesh,
  createBalloonMesh, createRocketMesh
} from './meshes.js';
import { sampleHeight, WORLD } from './world.js';

/** Alternate play modes after eject / at pads */
export class ModeManager {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'none'; // none | parachute | bike | car | balloon | rocket
    this.mesh = null;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.swoop = false;
    this.dive = false;
    this.rocketPhase = 'pad'; // pad | ascent | space | reentry | land
    this.rocketThrottle = 0;
    this.alive = true;
    this._balloon = null;
    this._rocket = null;
    this.spawnAirportExtras();
  }

  spawnAirportExtras() {
    this._balloon = createBalloonMesh();
    this._balloon.position.set(WORLD.balloonPad.x, 0, WORLD.balloonPad.z);
    this.scene.add(this._balloon);
    this._rocket = createRocketMesh();
    this._rocket.position.set(WORLD.rocketPad.x, 0, WORLD.rocketPad.z);
    this.scene.add(this._rocket);
  }

  clearActive() {
    if (this.mesh && this.mesh !== this._balloon && this.mesh !== this._rocket) {
      this.scene.remove(this.mesh);
    }
    if (this.mode === 'balloon' && this._balloon) {
      this._balloon.position.set(WORLD.balloonPad.x, 0, WORLD.balloonPad.z);
    }
    if (this.mode === 'rocket' && this._rocket) {
      this._rocket.position.set(WORLD.rocketPad.x, 0, WORLD.rocketPad.z);
      this._rocket.rotation.set(0, 0, 0);
      const flame = this._rocket.getObjectByName('flame');
      if (flame) flame.visible = false;
    }
    this.mesh = null;
    this.mode = 'none';
    this.alive = true;
    this.swoop = false;
    this.dive = false;
    this.rocketPhase = 'pad';
    this.vel.set(0, 0, 0);
  }

  startParachute(fromPos, fromVel) {
    this.clearActive();
    this.mode = 'parachute';
    this.mesh = createParachuteMesh();
    this.pos.copy(fromPos);
    this.vel.copy(fromVel).multiplyScalar(0.3);
    this.vel.y = Math.min(this.vel.y, -5);
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);
  }

  startVehicle(kind, fromPos) {
    this.clearActive();
    this.mode = kind; // bike | car
    this.mesh = kind === 'bike' ? createMotorcycleMesh() : createSupercarMesh();
    const h = sampleHeight(fromPos.x, fromPos.z);
    this.pos.set(fromPos.x, h + 0.5, fromPos.z);
    this.vel.set(0, 0, 0);
    this.heading = 0;
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);
  }

  startBalloon() {
    this.clearActive();
    this.mode = 'balloon';
    this.mesh = this._balloon;
    this.pos.set(WORLD.balloonPad.x, 2, WORLD.balloonPad.z);
    this.vel.set(0, 0, 0);
    this.heading = 0;
  }

  startRocket() {
    this.clearActive();
    this.mode = 'rocket';
    this.mesh = this._rocket;
    this.pos.set(WORLD.rocketPad.x, 1, WORLD.rocketPad.z);
    this.vel.set(0, 0, 0);
    this.heading = 0;
    this.rocketPhase = 'pad';
    this.rocketThrottle = 0;
  }

  update(dt, controls, world) {
    if (this.mode === 'none' || !this.mesh) return null;
    dt = Math.min(dt, 0.05);

    if (this.mode === 'parachute') return this._updateChute(dt, controls, world);
    if (this.mode === 'bike' || this.mode === 'car') return this._updateVehicle(dt, controls, world);
    if (this.mode === 'balloon') return this._updateBalloon(dt, controls, world);
    if (this.mode === 'rocket') return this._updateRocket(dt, controls, world);
    return null;
  }

  _updateChute(dt, controls, world) {
    // Steer with aileron/elevator
    const steer = controls.aileron;
    const pitch = controls.elevator;
    this.heading += steer * 1.5 * dt;
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));

    let sink = this.dive ? 28 : 12;
    let horiz = this.dive ? 18 : 10;
    if (this.swoop && this.pos.y < 80) {
      // Toggle swoop — convert altitude to forward speed, skim
      sink = Math.max(1, sink - 14);
      horiz = 35 + Math.min(40, (80 - this.pos.y) * 0.5);
    }
    this.vel.x = fwd.x * horiz + pitch * fwd.x * -5;
    this.vel.z = fwd.z * horiz + pitch * fwd.z * -5;
    this.vel.y = -sink + (this.swoop && this.pos.y < 40 ? 8 : 0);

    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -steer * 0.3;

    if (this.pos.y <= ground + 1.5) {
      this.pos.y = ground + 1.5;
      return { event: 'chute_land', pos: this.pos.clone() };
    }
    return null;
  }

  _updateVehicle(dt, controls, world) {
    const maxSpd = this.mode === 'bike' ? 95 : 110; // m/s > 200 mph (200 mph ≈ 89 m/s)
    const accel = this.mode === 'bike' ? 35 : 40;
    const thr = controls.throttle;
    const steer = controls.aileron + controls.rudder * 0.5;

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const target = thr * maxSpd;
    const dir = speed > 1
      ? Math.atan2(this.vel.x, this.vel.z)
      : this.heading;
    this.heading = dir + steer * (0.8 + speed * 0.01) * dt * (thr > 0.05 || speed > 5 ? 1 : 0.3);

    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    let spd = speed;
    if (thr > 0.02) spd = Math.min(maxSpd, spd + accel * thr * dt);
    else spd = Math.max(0, spd - 15 * dt);
    if (controls.brakes) spd = Math.max(0, spd - 50 * dt);

    this.vel.x = fwd.x * spd;
    this.vel.z = fwd.z * spd;
    this.vel.y = 0;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const ground = world.getHeight(this.pos.x, this.pos.z);
    // Water wipeout
    if (world.isWater(this.pos.x, this.pos.z) && spd > 20) {
      this.alive = false;
      return { event: 'crash', reason: 'drove into lake' };
    }
    this.pos.y = ground + 0.5;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -steer * Math.min(0.35, spd / 80);
    return null;
  }

  _updateBalloon(dt, controls, world) {
    // Vertical via throttle (burner); horizontal mild wind + tilt steer
    const burn = controls.throttle;
    this.vel.y += (burn * 8 - 2.5) * dt; // buoyancy vs sink
    this.vel.y *= 0.99;
    this.vel.x += controls.aileron * 4 * dt;
    this.vel.z += controls.elevator * 4 * dt;
    this.vel.x *= 0.98;
    this.vel.z *= 0.98;
    // Ambient wind
    this.vel.x += 0.4 * dt;
    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    if (this.pos.y < ground + 3) {
      this.pos.y = ground + 3;
      this.vel.y = Math.max(0, this.vel.y);
      if (burn < 0.05 && Math.hypot(this.vel.x, this.vel.z) < 3) {
        return { event: 'balloon_land' };
      }
    }
    if (this.pos.y > 2000) this.vel.y = Math.min(this.vel.y, 0);
    this.mesh.position.copy(this.pos);
    return null;
  }

  _updateRocket(dt, controls, world) {
    const thr = controls.throttle;
    this.rocketThrottle = thr;
    const flame = this.mesh.getObjectByName('flame');
    if (flame) {
      flame.visible = thr > 0.1 && this.rocketPhase !== 'space';
      flame.scale.setScalar(0.5 + thr * 1.5);
    }

    if (this.rocketPhase === 'pad') {
      if (thr > 0.7) {
        this.rocketPhase = 'ascent';
      }
      this.mesh.position.copy(this.pos);
      return null;
    }

    if (this.rocketPhase === 'ascent') {
      // Need high throttle to reach space (~80km); playable compressed to 25km
      const thrust = thr * 120;
      this.vel.y += (thrust - 9.81) * dt;
      // Steer slightly
      this.vel.x += controls.aileron * 8 * dt;
      this.vel.z += controls.elevator * 8 * dt;
      this.pos.addScaledVector(this.vel, dt);
      // Tilt visual
      this.mesh.rotation.z = -controls.aileron * 0.2;
      this.mesh.rotation.x = controls.elevator * 0.2;
      this.mesh.position.copy(this.pos);
      if (this.pos.y > 25000) {
        this.rocketPhase = 'space';
        this.vel.y = Math.min(this.vel.y, 50);
        return { event: 'space' };
      }
      // Tip-over crash on ascent
      if (this.pos.y > 200 && Math.hypot(this.vel.x, this.vel.z) > this.vel.y * 0.8 && thr < 0.3) {
        // unstable
      }
      const ground = world.getHeight(this.pos.x, this.pos.z);
      if (this.pos.y < ground + 2 && this.vel.y < -5) {
        this.alive = false;
        return { event: 'crash', reason: 'rocket impact' };
      }
      return null;
    }

    if (this.rocketPhase === 'space') {
      // Free float — cut engines feel; start reentry when descending
      this.vel.y -= 2 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.x += 0.3 * dt;
      if (this.pos.y < 20000) {
        this.rocketPhase = 'reentry';
        return { event: 'reentry' };
      }
      return null;
    }

    if (this.rocketPhase === 'reentry') {
      // Extremely difficult: need to bleed speed, keep attitude, land near pad
      this.vel.y -= 15 * dt;
      // Atmospheric drag
      const spd = this.vel.length();
      this.vel.multiplyScalar(1 - 0.15 * dt);
      // Limited control
      this.vel.x += controls.aileron * 15 * dt;
      this.vel.z += controls.elevator * 15 * dt;
      // Throttle as retro
      if (thr > 0.1) {
        this.vel.y += thr * 40 * dt;
        this.vel.multiplyScalar(1 - thr * 0.05 * dt);
      }
      this.pos.addScaledVector(this.vel, dt);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.x = Math.atan2(-this.vel.z, Math.max(1, -this.vel.y)) * 0.5;

      const ground = world.getHeight(this.pos.x, this.pos.z);
      if (this.pos.y <= ground + 5) {
        const impact = -this.vel.y;
        const horiz = Math.hypot(this.vel.x, this.vel.z);
        const nearPad = Math.hypot(this.pos.x - WORLD.rocketPad.x, this.pos.z - WORLD.rocketPad.z) < 80;
        if (impact < 12 && horiz < 25 && nearPad) {
          this.rocketPhase = 'land';
          this.pos.y = ground + 5;
          this.vel.set(0, 0, 0);
          return { event: 'rocket_land' };
        }
        this.alive = false;
        return { event: 'crash', reason: `reentry failure (v=${impact.toFixed(0)} h=${horiz.toFixed(0)})` };
      }
      return null;
    }
    return null;
  }

  getSpeed() {
    return this.vel.length();
  }
}
