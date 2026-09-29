import * as THREE from 'three';
import {
  createParachuteMesh, createMotorcycleMesh, createSupercarMesh,
  createBalloonMesh, createRocketMesh, createDinoMesh, createAircraftMesh,
  createSkydiverMesh, createWingsuitFlyerMesh, createWingsuitRackMesh
} from './meshes.js';
import { sampleHeight, WORLD, WIND } from './world.js';
import { weather } from './weather.js';
import { AIRCRAFT } from './aircraft-data.js';

/** Alternate play modes after eject / at pads */
export class ModeManager {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'none'; // none | parachute | bike | car | balloon | rocket | walk | skydive | wingsuit
    this.mesh = null;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.swoop = false;
    this.dive = false;
    this.rocketPhase = 'pad';
    this.rocketThrottle = 0;
    this.alive = true;
    this.hasWingsuit = false;
    this._openT = 0;
    this._balloon = null;
    this._rocket = null;
    this._dino = null;
    this._ramp = null;
    this._suitRack = null;
    this._dino = null;
    this._ramp = null;
    this._parkedBike = null;
    this._parkedCar = null;
    this.nearCraft = null;
    this.walkSpeed = 0;
    this.spawnAirportExtras();
  }

  spawnAirportExtras() {
    this._balloon = createBalloonMesh();
    this._balloon.position.set(WORLD.balloonPad.x, 0, WORLD.balloonPad.z);
    this.scene.add(this._balloon);
    this._rocket = createRocketMesh();
    this._rocket.position.set(WORLD.rocketPad.x, 0, WORLD.rocketPad.z);
    this.scene.add(this._rocket);
    this._dino = createDinoMesh();
    this._dino.visible = false;
    this.scene.add(this._dino);
    this._ramp = new THREE.Group();
    this._ramp.name = 'rampLine';
    AIRCRAFT.forEach((a, i) => {
      const m = createAircraftMesh(a);
      m.scale.setScalar(0.82);
      m.position.set(WORLD.hangar.x + 18 + (i % 5) * 22, 1.2, WORLD.hangar.z + 36 + Math.floor(i / 5) * 26);
      m.rotation.y = Math.PI * 0.15;
      m.userData.acId = a.id;
      m.userData.acName = a.name;
      this._ramp.add(m);
    });
    this.scene.add(this._ramp);
    this._suitRack = createWingsuitRackMesh();
    this._suitRack.position.set(WORLD.wingsuitRack.x, 0, WORLD.wingsuitRack.z);
    this.scene.add(this._suitRack);
  }

  clearActive() {
    if (this.mesh && this.mesh !== this._balloon && this.mesh !== this._rocket && this.mesh !== this._dino) {
      if (this.mesh !== this._parkedBike && this.mesh !== this._parkedCar) {
        this.scene.remove(this.mesh);
      }
    }
    if (this._dino) this._dino.visible = false;
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
    const keepSuit = this.hasWingsuit;
    this.clearActive();
    this.hasWingsuit = keepSuit;
    this.mode = 'parachute';
    this.mesh = createParachuteMesh();
    this.pos.copy(fromPos);
    this.vel.copy(fromVel);
    this.vel.multiplyScalar(0.72);
    this.vel.y = Math.min(this.vel.y, -8);
    this._openT = 0;
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);
  }

  startSkydive(fromPos, fromVel) {
    const keepSuit = this.hasWingsuit;
    this.clearActive();
    this.hasWingsuit = keepSuit;
    this.mode = keepSuit ? 'wingsuit' : 'skydive';
    this.mesh = keepSuit ? createWingsuitFlyerMesh() : createSkydiverMesh();
    this.pos.copy(fromPos);
    this.vel.copy(fromVel);
    if (this.vel.length() < 8) this.vel.y = Math.min(this.vel.y, -12);
    this.heading = Math.atan2(this.vel.x || 0.01, this.vel.z || 1);
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);
  }

  deployCanopy() {
    if (this.mode !== 'skydive' && this.mode !== 'wingsuit') return false;
    this.startParachute(this.pos.clone(), this.vel.clone());
    return true;
  }

  startVehicle(kind, fromPos) {
    this.clearActive();
    this.mode = kind;
    if (kind === 'bike') {
      if (!this._parkedBike) {
        this._parkedBike = createMotorcycleMesh();
        this.scene.add(this._parkedBike);
      }
      this.mesh = this._parkedBike;
    } else {
      if (!this._parkedCar) {
        this._parkedCar = createSupercarMesh();
        this.scene.add(this._parkedCar);
      }
      this.mesh = this._parkedCar;
    }
    this.mesh.visible = true;
    const h = sampleHeight(fromPos.x, fromPos.z);
    this.pos.set(fromPos.x, h + 0.5, fromPos.z);
    this.vel.set(0, 0, 0);
    this.heading = this.heading || 0;
    this.mesh.position.copy(this.pos);
  }

  startWalk(fromPos, heading = 0) {
    const keepBike = this.mode === 'bike' ? this.mesh : this._parkedBike;
    const keepCar = this.mode === 'car' ? this.mesh : this._parkedCar;
    if (this.mode === 'bike' && keepBike) {
      this._parkedBike = keepBike;
      keepBike.position.copy(this.pos);
      keepBike.visible = true;
    }
    if (this.mode === 'car' && keepCar) {
      this._parkedCar = keepCar;
      keepCar.position.copy(this.pos);
      keepCar.visible = true;
    }
    if (this.mesh && this.mesh !== this._dino && this.mesh !== this._parkedBike && this.mesh !== this._parkedCar && this.mesh !== this._balloon && this.mesh !== this._rocket) {
      this.scene.remove(this.mesh);
    }
    this.mode = 'walk';
    this.mesh = this._dino;
    this._dino.visible = true;
    const h = sampleHeight(fromPos.x, fromPos.z);
    this.pos.set(fromPos.x, h + 0.15, fromPos.z);
    this.vel.set(0, 0, 0);
    this.heading = heading;
    this.walkSpeed = 0;
    this.mesh.position.copy(this.pos);
    const dw = this._dino.getObjectByName('dinoWings');
    if (dw) dw.visible = !!this.hasWingsuit;
  }

  nearestBoardable() {
    let best = null;
    let bestD = 14;
    if (this._ramp) {
      this._ramp.children.forEach((m) => {
        const d = Math.hypot(this.pos.x - m.position.x, this.pos.z - m.position.z);
        if (d < bestD) {
          bestD = d;
          best = { kind: 'plane', id: m.userData.acId, name: m.userData.acName, dist: d };
        }
      });
    }
    if (this._parkedBike && this._parkedBike.visible && this.mode === 'walk') {
      const d = Math.hypot(this.pos.x - this._parkedBike.position.x, this.pos.z - this._parkedBike.position.z);
      if (d < 6 && d < bestD) best = { kind: 'bike', id: 'bike', name: 'Motorcycle', dist: d };
    }
    if (this._parkedCar && this._parkedCar.visible && this.mode === 'walk') {
      const d = Math.hypot(this.pos.x - this._parkedCar.position.x, this.pos.z - this._parkedCar.position.z);
      if (d < 7 && d < (best?.dist ?? 14)) best = { kind: 'car', id: 'car', name: 'Supercar', dist: d };
    }
    if (Math.hypot(this.pos.x - WORLD.wingsuitRack.x, this.pos.z - WORLD.wingsuitRack.z) < 8) {
      best = { kind: 'wingsuit', id: 'wingsuit', name: this.hasWingsuit ? 'Wingsuit (on)' : 'Wingsuit', dist: 0 };
    }
    if (Math.hypot(this.pos.x - WORLD.balloonPad.x, this.pos.z - WORLD.balloonPad.z) < 12) {
      best = { kind: 'balloon', id: 'balloon', name: 'Balloon', dist: 0 };
    }
    if (Math.hypot(this.pos.x - WORLD.rocketPad.x, this.pos.z - WORLD.rocketPad.z) < 12) {
      best = { kind: 'rocket', id: 'rocket', name: 'Rocket', dist: 0 };
    }
    this.nearCraft = best;
    return best;
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
    if (this.mode === 'skydive') return this._updateSkydive(dt, controls, world);
    if (this.mode === 'wingsuit') return this._updateWingsuit(dt, controls, world);
    if (this.mode === 'bike' || this.mode === 'car') return this._updateVehicle(dt, controls, world);
    if (this.mode === 'walk') return this._updateWalk(dt, controls, world);
    if (this.mode === 'balloon') return this._updateBalloon(dt, controls, world);
    if (this.mode === 'rocket') return this._updateRocket(dt, controls, world);
    return null;
  }

  _updateChute(dt, controls, world) {
    const steer = controls.aileron;
    const pitch = controls.elevator;
    this.heading += (steer + pitch * 0.15) * 1.35 * dt;
    if (weather.turb > 0.2) this.heading += Math.sin(performance.now() * 0.003) * weather.turb * 0.4 * dt;
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const agl = this.pos.y - ground;
    this._openT = (this._openT || 0) + dt;
    const opening = this._openT < 1.15;

    const dive = this.dive;
    const flare = this.swoop;
    const energy = Math.hypot(this.vel.x, this.vel.z, Math.min(0, this.vel.y));

    let sink = opening ? 18 : 5.4;
    let horiz = opening ? Math.max(12, energy * 0.35) : 9;
    if (!opening && dive) {
      sink = 16 + Math.min(10, energy * 0.12);
      horiz = 22 + Math.min(18, energy * 0.2);
    }
    if (!opening && flare) {
      if (agl > 80) {
        sink = 3.6;
        horiz = 16;
      } else if (agl > 22) {
        sink = 1.6;
        horiz = 28 + Math.min(22, energy * 0.35);
      } else if (agl > 1.8) {
        sink = 0.15;
        horiz = Math.max(32, 18 + energy * 0.55 + (16 - agl) * 1.4);
        this.vel.y = Math.max(this.vel.y, -0.8);
      } else {
        sink = 2.8;
        horiz = Math.max(8, energy * 0.25);
      }
    }
    if (!opening && dive && flare && agl > 35) {
      sink = 22;
      horiz = 30;
    }

    const windX = (WIND?.x || weather.x || 0) * (1 + (weather.storm || 0) * 0.35);
    const windZ = (WIND?.z || weather.z || 0) * (1 + (weather.storm || 0) * 0.35);
    const wantX = fwd.x * horiz + windX;
    const wantZ = fwd.z * horiz + windZ;
    this.vel.x += (wantX - this.vel.x) * Math.min(1, (opening ? 1.2 : 2.4) * dt);
    this.vel.z += (wantZ - this.vel.z) * Math.min(1, (opening ? 1.2 : 2.4) * dt);
    const targetVy = -sink;
    this.vel.y += (targetVy - this.vel.y) * Math.min(1, (opening ? 1.6 : 3.0) * dt);

    this.pos.addScaledVector(this.vel, dt);
    const g2 = world.getHeight(this.pos.x, this.pos.z);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -steer * 0.4;
    this.mesh.rotation.x = dive ? 0.42 : (flare ? -0.22 : 0.05);
    const canopy = this.mesh.getObjectByName('canopy');
    if (canopy) canopy.scale.setScalar(opening ? 0.35 + this._openT * 0.55 : 1);

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const skimming = flare && !opening && agl > 1.6 && agl < 18 && speed > 16;
    if (this.pos.y <= g2 + 1.45 && !skimming) {
      this.pos.y = g2 + 1.5;
      if (speed > 28 || this.vel.y < -9) {
        this.alive = false;
        return { event: 'crash', reason: 'canopy smash' };
      }
      return { event: 'chute_land', pos: this.pos.clone() };
    }
    if (skimming && this.pos.y < g2 + 1.25) this.pos.y = g2 + 1.35;
    return { event: 'chute_state', agl, speed, skimming, opening };
  }

  _updateSkydive(dt, controls, world) {
    const steer = controls.aileron;
    this.heading += steer * 1.8 * dt;
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const track = this.swoop || controls.elevator < -0.2;
    const headDown = this.dive || controls.elevator > 0.35;
    const g = 9.81;
    this.vel.y -= g * dt;
    const term = headDown ? 72 : track ? 46 : 54;
    const drag = 9.81 / (term * term);
    this.vel.y += -Math.sign(this.vel.y) * this.vel.y * this.vel.y * drag * dt;
    const wantH = headDown ? 8 : track ? 28 : 12;
    this.vel.x += (fwd.x * wantH - this.vel.x) * Math.min(1, 1.1 * dt);
    this.vel.z += (fwd.z * wantH - this.vel.z) * Math.min(1, 1.1 * dt);
    this.vel.x += (WIND?.x || weather.x || 0) * 0.15 * dt;
    this.vel.z += (WIND?.z || weather.z || 0) * 0.15 * dt;
    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const agl = this.pos.y - ground;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = headDown ? 1.45 : track ? 0.85 : 1.15;
    this.mesh.rotation.z = -steer * 0.45;
    if (agl < 2.2) {
      this.alive = false;
      return { event: 'crash', reason: 'no pull — impact' };
    }
    return { event: 'skydive_state', agl, speed: this.vel.length(), kind: 'belly' };
  }

  _updateWingsuit(dt, controls, world) {
    const steer = controls.aileron;
    const pitch = THREE.MathUtils.clamp(controls.elevator, -1, 1);
    this.heading += steer * (1.05 + Math.max(0, -this.vel.y) * 0.01) * dt;
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const g = 9.81;
    const spd = Math.max(1, this.vel.length());
    // Position: dive = more speed / sink. Flare/swoop = high Cl, more drag, flatten.
    const flare = this.swoop || pitch < -0.25;
    const dive = this.dive || pitch > 0.3;
    const cl = flare ? 1.15 : dive ? 0.42 : 0.78;
    const cd = flare ? 0.55 : dive ? 0.18 : 0.28;
    const area = 1.15;
    const rho = 1.2;
    const q = 0.5 * rho * spd * spd;
    const lift = q * cl * area;
    const drag = q * cd * area;
    // Lift opposite velocity-ish, biased up
    const liftAcc = lift / 78;
    const dragAcc = drag / 78;
    this.vel.y -= g * dt;
    this.vel.y += liftAcc * dt * (flare ? 1.15 : 0.72);
    const hx = this.vel.x;
    const hz = this.vel.z;
    const hsp = Math.hypot(hx, hz) || 1;
    this.vel.x -= (hx / hsp) * dragAcc * dt;
    this.vel.z -= (hz / hsp) * dragAcc * dt;
    const cruise = dive ? 48 : flare ? 28 : 36;
    this.vel.x += (fwd.x * cruise - this.vel.x) * Math.min(1, 0.85 * dt);
    this.vel.z += (fwd.z * cruise - this.vel.z) * Math.min(1, 0.85 * dt);
    if (hsp < 16 && !dive) {
      this.vel.y -= 8 * dt; // stall
    }
    if (flare && (this.pos.y - world.getHeight(this.pos.x, this.pos.z)) < 40 && hsp > 22) {
      this.vel.y += 9 * dt;
    }
    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const agl = this.pos.y - ground;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = dive ? 1.25 : flare ? 0.55 : 0.95;
    this.mesh.rotation.z = -steer * 0.55;
    if (agl < 2.4) {
      this.alive = false;
      return { event: 'crash', reason: 'wingsuit impact' };
    }
    return {
      event: 'skydive_state',
      agl,
      speed: this.vel.length(),
      kind: 'suit',
      glide: hsp / Math.max(1, -this.vel.y)
    };
  }

  _updateVehicle(dt, controls, world) {
    const bike = this.mode === 'bike';
    const maxSpd = bike ? 118 : 138;
    const accel = bike ? 62 : 44;
    const coast = bike ? 22 : 14;
    const brakeDec = bike ? 70 : 55;
    const grip = bike ? 0.72 : 1.15;
    const thr = controls.throttle;
    const steerIn = controls.aileron + controls.rudder * 0.55;

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const steerScale = bike
      ? (0.55 + 0.9 * (1 - Math.min(1, speed / maxSpd)))
      : (0.28 + 0.55 * (1 - Math.min(1, speed / maxSpd)));
    this.heading += steerIn * steerScale * dt * (thr > 0.04 || speed > 4 ? 1 : 0.2);

    if (!bike && Math.abs(steerIn) < 0.1 && thr > 0.25) {
      const want = Math.atan2(WORLD.hangar.x - this.pos.x, WORLD.hangar.z - this.pos.z);
      let d = want - this.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.heading += d * Math.min(0.55, dt * 0.9);
    }

    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    let spd = speed;
    if (thr > 0.02) spd = Math.min(maxSpd, spd + accel * thr * dt);
    else spd = Math.max(0, spd - coast * dt);
    if (controls.brakes) spd = Math.max(0, spd - brakeDec * dt);

    const onR = world.onRoad?.(this.pos.x, this.pos.z);
    if (!onR) spd *= bike ? 0.985 : 0.992;

    this.vel.x = fwd.x * spd;
    this.vel.z = fwd.z * spd;

    const prevY = this.pos.y;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const hop = ground - (prevY - 0.55);
    if (hop > 2.4 && spd > 18) {
      this.vel.y = Math.min(14, hop * 1.6);
    }
    this.vel.y = (this.vel.y || 0) - 22 * dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y < ground + 0.55) {
      this.pos.y = ground + 0.55;
      this.vel.y = 0;
    }

    if (world.isWater(this.pos.x, this.pos.z) && spd > 16) {
      this.alive = false;
      return { event: 'crash', reason: bike ? 'bike in the lake' : 'car in the lake' };
    }

    const hit = world.hitSolid?.(this.pos.x, this.pos.z);
    if (hit && spd > (bike ? 9 : 14)) {
      this.alive = false;
      return { event: 'crash', reason: `hit ${hit}` };
    }

    if (bike && !onR && spd > 55 && Math.abs(steerIn) > 0.75) {
      this.alive = false;
      return { event: 'crash', reason: 'high-side' };
    }

    const lean = bike
      ? -steerIn * Math.min(0.72, 0.18 + spd / 90)
      : -steerIn * Math.min(0.32, spd / 160);
    const pitch = bike && controls.elevator < -0.35 && spd > 20 ? -0.28 : Math.min(0.15, (this.vel.y || 0) * 0.02);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = lean / Math.max(0.65, grip);
    this.mesh.rotation.x = pitch;
    this.mesh.traverse((o) => {
      if (o.name === 'wheel' || o.name === 'wheelF' || o.name === 'wheelR') {
        o.rotation.x += spd * dt * 0.8;
      }
    });

    const distH = Math.hypot(this.pos.x - WORLD.hangar.x, this.pos.z - WORLD.hangar.z);
    if (distH < 55 && spd < 25) return { event: 'airport_arrive' };
    return { event: 'vehicle_state', speed: spd, distH, onRoad: !!onR };
  }

  _updateBalloon(dt, controls, world) {
    const burn = controls.throttle;
    // Envelope heat lags the burner
    this._heat = (this._heat ?? 0.35) + (burn - (this._heat ?? 0.35)) * Math.min(1, dt / 1.6);
    const lift = this._heat * 11 - 3.1;
    this.vel.y += lift * dt;
    this.vel.y *= 0.985;
    this.vel.x += controls.aileron * 2.2 * dt;
    this.vel.z += controls.elevator * 2.2 * dt;
    this.vel.x += (weather.x || 0) * 0.35 * dt;
    this.vel.z += (weather.z || 0) * 0.35 * dt;
    this.vel.x *= 0.975;
    this.vel.z *= 0.975;
    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const burner = this.mesh?.getObjectByName('burner');
    if (burner) {
      burner.visible = burn > 0.08;
      burner.scale.setScalar(0.6 + burn * 1.4);
    }
    if (this.pos.y < ground + 3) {
      this.pos.y = ground + 3;
      this.vel.y = Math.max(0, this.vel.y);
      if (burn < 0.05 && Math.hypot(this.vel.x, this.vel.z) < 3) {
        return { event: 'balloon_land' };
      }
    }
    if (this.pos.y > 2000) this.vel.y = Math.min(this.vel.y, 0);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y += dt * 0.15;
    return { event: 'balloon_state', heat: this._heat };
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
      const thrust = thr * 120;
      this.vel.y += (thrust - 9.81) * dt;
      this.vel.x += controls.aileron * 10 * dt;
      this.vel.z += controls.elevator * 10 * dt;
      this.vel.x += (weather.x || 0) * 0.08 * dt;
      this.vel.z += (weather.z || 0) * 0.08 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.mesh.rotation.z = -controls.aileron * 0.28;
      this.mesh.rotation.x = controls.elevator * 0.28;
      this.mesh.position.copy(this.pos);
      this.mesh.traverse((o) => {
        if (o.name === 'gridfin') o.rotation.z = controls.aileron * 0.4;
      });
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
        if (impact < 10 && horiz < 18 && nearPad) {
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

  _updateWalk(dt, controls, world) {
    const turn = controls.aileron + controls.rudder * 0.4;
    this.heading += turn * 2.1 * dt;
    const wish = Math.max(0, -controls.elevator) * 7.2 + (controls.throttle > 0.15 ? controls.throttle * 6.5 : 0);
    const back = Math.max(0, controls.elevator) * 3.2;
    const target = wish - back;
    this.walkSpeed += (target - this.walkSpeed) * Math.min(1, 8 * dt);
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.pos.x += fwd.x * this.walkSpeed * dt;
    this.pos.z += fwd.z * this.walkSpeed * dt;
    const ground = world.getHeight(this.pos.x, this.pos.z);
    this.pos.y = ground + 0.12;
    this.vel.set(fwd.x * this.walkSpeed, 0, fwd.z * this.walkSpeed);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    const t = performance.now() * 0.001;
    const swing = Math.sin(t * 9) * Math.min(1, Math.abs(this.walkSpeed) / 4) * 0.7;
    const l = this.mesh.getObjectByName('dinoLegL');
    const r = this.mesh.getObjectByName('dinoLegR');
    const tail = this.mesh.getObjectByName('dinoTail');
    const head = this.mesh.getObjectByName('dinoHead');
    if (l) l.rotation.x = swing;
    if (r) r.rotation.x = -swing;
    if (tail) tail.rotation.y = Math.sin(t * 3) * 0.25;
    if (head) head.rotation.x = Math.sin(t * 2) * 0.04;
    const near = this.nearestBoardable();
    return { event: 'walk_state', speed: this.walkSpeed, near };
  }

  getSpeed() {
    return this.vel.length();
  }
}
