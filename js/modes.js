import * as THREE from 'three';
import {
  createParachuteMesh, createMotorcycleMesh, createSupercarMesh,
  createBalloonMesh, createRocketMesh, createDinoMesh, createAircraftMesh,
  createSkydiverMesh, createWingsuitFlyerMesh, createWingsuitRackMesh, createBoatMesh
} from './meshes.js';
import { sampleHeight, WORLD, WIND } from './world.js';
import { weather, windAt } from './weather.js';
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
    this._parkedBoat = null;
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
      if (this.mesh !== this._parkedBike && this.mesh !== this._parkedCar && this.mesh !== this._parkedBoat) {
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
    if (this.vel.y > -4) this.vel.y = Math.min(this.vel.y, -6);
    this._openT = 0;
    this._shocked = false;
    this._canopyStall = 0;
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

  parkRides(fromPos, opts = {}) {
    const water = opts.water;
    const hdg = this.heading || 0;
    const side = (ang, dist) => ({
      x: fromPos.x + Math.sin(hdg + ang) * dist,
      z: fromPos.z + Math.cos(hdg + ang) * dist
    });
    if (water) {
      if (!this._parkedBoat) {
        this._parkedBoat = createBoatMesh();
        this.scene.add(this._parkedBoat);
      }
      const p = side(0.4, 6);
      this._parkedBoat.position.set(p.x, 0.4, p.z);
      this._parkedBoat.visible = true;
    } else {
      if (!this._parkedBike) {
        this._parkedBike = createMotorcycleMesh();
        this.scene.add(this._parkedBike);
      }
      if (!this._parkedCar) {
        this._parkedCar = createSupercarMesh();
        this.scene.add(this._parkedCar);
      }
      const b = side(1.2, 5);
      const c = side(-1.2, 7);
      const hb = sampleHeight(b.x, b.z);
      const hc = sampleHeight(c.x, c.z);
      this._parkedBike.position.set(b.x, hb + 0.4, b.z);
      this._parkedCar.position.set(c.x, hc + 0.4, c.z);
      this._parkedBike.visible = true;
      this._parkedCar.visible = true;
    }
  }

  startBoat(fromPos) {
    this.clearActive();
    this.mode = 'boat';
    if (!this._parkedBoat) {
      this._parkedBoat = createBoatMesh();
      this.scene.add(this._parkedBoat);
    }
    this.mesh = this._parkedBoat;
    this.mesh.visible = true;
    this.pos.set(fromPos.x, 0.5, fromPos.z);
    this.vel.set(0, 0, 0);
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
    if (this._parkedBoat && this._parkedBoat.visible && this.mode === 'walk') {
      const d = Math.hypot(this.pos.x - this._parkedBoat.position.x, this.pos.z - this._parkedBoat.position.z);
      if (d < 8) best = { kind: 'boat', id: 'boat', name: 'Boat', dist: d };
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
    if (this.mode === 'boat') return this._updateBoat(dt, controls, world);
    if (this.mode === 'walk') return this._updateWalk(dt, controls, world);
    if (this.mode === 'balloon') return this._updateBalloon(dt, controls, world);
    if (this.mode === 'rocket') return this._updateRocket(dt, controls, world);
    return null;
  }

  _updateChute(dt, controls, world) {
    const steer = controls.aileron;
    const pitch = controls.elevator;
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const agl = this.pos.y - ground;
    this._openT = (this._openT || 0) + dt;
    const opening = this._openT < 1.15;
    const dive = !!(this.dive || pitch > 0.42);
    const flare = !!(this.swoop || pitch < -0.48);

    if (!this._shocked) {
      this._shocked = true;
      const sp = this.vel.length();
      this._shock = Math.min(1, Math.max(0, (sp - 22) / 40));
      if (sp > 28) this.vel.multiplyScalar(0.62);
    } else {
      this._shock = Math.max(0, (this._shock || 0) - dt * 1.4);
    }

    const w = windAt(Math.max(0, this.pos.y));
    let ax = this.vel.x - (w.x || 0);
    let ay = this.vel.y;
    let az = this.vel.z - (w.z || 0);
    let air = Math.hypot(ax, ay, az);
    const mass = 100;
    const area = 7.2;
    const rho = 1.2;

    this.heading += steer * (1.15 + Math.min(2.4, air / 16)) * dt;
    const fwdX = Math.sin(this.heading);
    const fwdZ = Math.cos(this.heading);

    // Loaded carve: a hard turn at speed costs energy, it does not mint it.
    let cl = 0.7;
    let cd = 0.24;
    if (opening) {
      cl = 0.32;
      cd = 1.15;
    } else if ((this._canopyStall || 0) > 0) {
      cl = 0.12;
      cd = 1.25;
      this._canopyStall -= dt;
    } else if (flare && !dive) {
      const h = Math.hypot(ax, az);
      // A double-toggle with nothing in the bank stalls. Speed you built in the dive is the only money.
      const slow = air < 13 || (agl > 28 && h < 11 && -ay < 6);
      if (slow) {
        this._canopyStall = agl > 18 ? 1.8 : 1.15;
        cl = 0.1;
        cd = 1.35;
      } else {
        cl = 1.32;
        cd = agl < 18 ? 0.38 : 0.58;
      }
    } else if (dive) {
      // Front-riser dive: steep, and altitude turns into speed. Not a flat cruise.
      cl = 0.12;
      cd = 0.085;
    }
    if (!opening && Math.abs(steer) > 0.4 && air > 14 && (this._canopyStall || 0) <= 0) {
      cd *= 1.22;
      cl *= 0.9;
    }

    if (air > 0.4) {
      const ihx = ax / air;
      const ihy = ay / air;
      const ihz = az / air;
      const q = 0.5 * rho * air * air;
      const lift = q * area * cl;
      const drag = q * area * cd;
      let rx = -ihz;
      let rz = ihx;
      const rm = Math.hypot(rx, rz);
      let lx, ly, lz;
      if (rm < 1e-4) {
        lx = fwdX; ly = 0.15; lz = fwdZ;
      } else {
        rx /= rm; rz /= rm;
        lx = -rz * ihy;
        ly = rz * ihx - rx * ihz;
        lz = rx * ihy;
      }
      const lm = Math.hypot(lx, ly, lz) || 1;
      const sUp = ly < 0 ? -1 : 1;
      lx = sUp * lx / lm; ly = sUp * ly / lm; lz = sUp * lz / lm;
      const liftAcc = lift / mass;
      const dragAcc = drag / mass;
      ax += lx * liftAcc * dt;
      ay += (ly * liftAcc - 9.81) * dt;
      az += lz * liftAcc * dt;
      ax -= ihx * dragAcc * dt;
      ay -= ihy * dragAcc * dt;
      az -= ihz * dragAcc * dt;
    } else {
      ay -= 9.81 * dt;
    }

    // Canopy wants to fly along heading; a carve yaws the track instead of teleporting speed.
    const hsp = Math.hypot(ax, az);
    if (hsp > 0.5 && (this._canopyStall || 0) <= 0 && !opening) {
      const want = Math.atan2(fwdX, fwdZ);
      const have = Math.atan2(ax, az);
      let diff = want - have;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const yaw = Math.max(-1, Math.min(1, diff * 1.6)) * Math.min(1, hsp / 12);
      const c = Math.cos(yaw * dt * 2.2);
      const sn = Math.sin(yaw * dt * 2.2);
      const nx = ax * c + az * sn;
      const nz = -ax * sn + az * c;
      ax = nx; az = nz;
    }

    this.vel.x = ax + (w.x || 0);
    this.vel.y = ay;
    this.vel.z = az + (w.z || 0);
    this.pos.addScaledVector(this.vel, dt);

    const g2 = world.getHeight(this.pos.x, this.pos.z);
    const agl2 = this.pos.y - g2;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -steer * (0.35 + Math.min(0.45, hsp / 40));
    const stalled = (this._canopyStall || 0) > 0;
    this.mesh.rotation.x = opening ? 0.15 + this._shock * 0.5 : (stalled ? 0.7 : (dive ? 0.48 : (flare ? -0.35 : 0.06)));
    const canopy = this.mesh.getObjectByName('canopy');
    if (canopy) {
      const shockScale = opening ? 0.4 + this._openT * 0.5 : 1;
      canopy.scale.setScalar(shockScale * (this._shock > 0.2 ? 0.92 : 1));
    }

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const skimming = flare && !opening && !stalled && agl2 > 0.8 && agl2 < 12 && speed > 16 && this.vel.y > -4;
    if (this.pos.y <= g2 + 1.45 && !skimming) {
      this.pos.y = g2 + 1.5;
      if (speed > 26 || this.vel.y < -8 || stalled) {
        this.alive = false;
        return { event: 'crash', reason: stalled ? 'canopy stall — no flare energy' : 'canopy smash' };
      }
      return { event: 'chute_land', pos: this.pos.clone() };
    }
    if (skimming && this.pos.y < g2 + 1.2) this.pos.y = g2 + 1.3;
    return {
      event: 'chute_state',
      agl: agl2,
      speed,
      skimming,
      opening,
      stalled,
      shock: this._shock || 0
    };
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
    const wFall = windAt(Math.max(0, this.pos.y));
    this.vel.x += (wFall.x || 0) * 0.18 * dt;
    this.vel.z += (wFall.z || 0) * 0.18 * dt;
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
    const dive = !!(this.dive || pitch > 0.35);
    const flare = !!(this.swoop || pitch < -0.28);
    this.heading += steer * (0.7 + Math.min(0.8, Math.max(0, -this.vel.y) * 0.02)) * dt;
    const fwdX = Math.sin(this.heading);
    const fwdZ = Math.cos(this.heading);
    const w = windAt(Math.max(0, this.pos.y));
    let ax = this.vel.x - (w.x || 0);
    let ay = this.vel.y;
    let az = this.vel.z - (w.z || 0);
    let air = Math.max(0.001, Math.hypot(ax, ay, az));
    const mass = 85;
    const area = 0.66;
    const rho = 1.2;
    const stalled = air < 30 && !dive;
    let cl = stalled ? 0.12 : (dive ? 0.42 : (flare ? 1.05 : 0.86));
    let cd = stalled ? 0.9 : (dive ? 0.2 : (flare ? 0.62 : 0.32));
    if (flare && air < 36) {
      cl = 0.14;
      cd = 0.95;
    }
    const ihx = ax / air;
    const ihy = ay / air;
    const ihz = az / air;
    const q = 0.5 * rho * air * air;
    const lift = q * area * cl;
    const dragF = q * area * cd;
    let rx = -ihz;
    let rz = ihx;
    const rm = Math.hypot(rx, rz);
    let lx, ly, lz;
    if (rm < 1e-4) {
      lx = fwdX; ly = 0; lz = fwdZ;
    } else {
      rx /= rm; rz /= rm;
      lx = -rz * ihy;
      ly = rz * ihx - rx * ihz;
      lz = rx * ihy;
    }
    const lm = Math.hypot(lx, ly, lz) || 1;
    const sUp = (ly === 0 ? 1 : Math.sign(ly));
    lx = sUp * lx / lm; ly = Math.abs(ly) / lm; lz = sUp * lz / lm;
    ax += (lx * lift / mass) * dt;
    ay += (ly * lift / mass - 9.81) * dt;
    az += (lz * lift / mass) * dt;
    ax -= ihx * (dragF / mass) * dt;
    ay -= ihy * (dragF / mass) * dt;
    az -= ihz * (dragF / mass) * dt;

    const hsp = Math.hypot(ax, az) || 0.001;
    if (!stalled && hsp > 8) {
      const want = Math.atan2(fwdX, fwdZ);
      const have = Math.atan2(ax, az);
      let diff = want - have;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const yaw = Math.max(-0.8, Math.min(0.8, diff));
      const c = Math.cos(yaw * dt * 0.8);
      const sn = Math.sin(yaw * dt * 0.8);
      const nx = ax * c + az * sn;
      const nz = -ax * sn + az * c;
      ax = nx; az = nz;
    }

    this.vel.x = ax + (w.x || 0);
    this.vel.y = ay;
    this.vel.z = az + (w.z || 0);
    this.pos.addScaledVector(this.vel, dt);
    const ground = world.getHeight(this.pos.x, this.pos.z);
    const agl = this.pos.y - ground;
    const horiz = Math.hypot(ax, az);
    const sink = Math.max(0.4, -ay);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = dive ? 1.25 : (flare ? 0.5 : 0.95);
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
      glide: horiz / sink,
      stalled: stalled || (flare && air < 36)
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
    const wB = windAt(Math.max(0, this.pos.y));
    this.vel.x += (wB.x || 0) * (0.5 + (weather.shear || 0) * 0.45) * dt;
    this.vel.z += (wB.z || 0) * (0.5 + (weather.shear || 0) * 0.45) * dt;
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
      const hit = world.hitSolid?.(this.pos.x, this.pos.z);
      if (hit === 'building' || hit === 'hangar' || hit === 'house' || hit === 'tower') {
        this.alive = false;
        return { event: 'crash', reason: `balloon into ${hit}` };
      }
      if (burn < 0.05 && Math.hypot(this.vel.x, this.vel.z) < 4) {
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

  _updateBoat(dt, controls, world) {
    this.heading += controls.aileron * 1.1 * dt;
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    let spd = Math.hypot(this.vel.x, this.vel.z);
    if (controls.throttle > 0.02) spd = Math.min(28, spd + 18 * controls.throttle * dt);
    else spd = Math.max(0, spd - 8 * dt);
    this.vel.x = fwd.x * spd;
    this.vel.z = fwd.z * spd;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const wet = world.isWater(this.pos.x, this.pos.z);
    if (!wet) {
      this.pos.y = world.getHeight(this.pos.x, this.pos.z) + 0.35;
      if (spd < 4) return { event: 'boat_beach', pos: this.pos.clone() };
    } else {
      this.pos.y = 0.45;
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -controls.aileron * 0.15;
    return { event: 'boat_state', speed: spd, wet };
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
