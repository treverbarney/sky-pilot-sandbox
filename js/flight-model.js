import * as THREE from 'three';
import { weather, windAt } from './weather.js';
import { sampleHeight } from './world.js';

const G = 9.81;
const RHO0 = 1.225;

/**
 * Parameterized flight model (SI: m, m/s, rad).
 * Lift/drag/stall, ground roll, flaps, gear, spoilers, heli, glider, TV, water.
 */
export class FlightModel {
  constructor(spec) {
    this.spec = spec;
    this.position = new THREE.Vector3(0, 2, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.quaternion = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.angular = new THREE.Vector3();

    this.throttle = 0;
    this.collective = 0.4;
    this.flaps = 0;
    this.flapIndex = 0;
    this.gearDown = true;
    this.brakes = false;
    this.spoilers = false;
    this.spoilersArmed = false;
    this.reverse = false;
    this.afterburner = false;
    this.thrustVectorOn = !!(spec.thrustVector);
    this.mixtureRich = true;
    this.propFull = true;
    this.conditionRun = true;
    this.ballast = 0; // 0..1
    this.waterMode = false; // intended water ops (amphib)
    this.trim = 0;
    this.rudder = 0;
    this.aileron = 0;
    this.elevator = 0;

    this.onGround = true;
    this.onWater = false;
    this.alive = true;
    this.airborneTime = 0;
    this.stalling = false;
    this.aoa = 0;
    this.lastTouchScore = null;
    this.approachPhase = 'downwind';
    this.stableApproach = null; // null unknown, true/false at gate
    this.flareEntered = false;
    this.flareHoldOffTime = 0;
    this.flareHoldOffOk = false;
    this.balloonInFlare = false;
    this._flareAgLMin = 999;
    this._prevAgl = 999;
    this.takeoffConfigOk = false;
    this.rotateReady = false;
    this._unstableWarned = false;
    this._flareCueShown = false;
    this.smokeOn = false;
    this.parkBrake = false;
    this.autobrakeLevel = 0;
    this.flareAssist = false;
    this.goAroundActive = false;
    this._goAroundClimbTime = 0;
    this._autobrakeActive = false;
    this._passedStableGate = false;
    this._windX = 2.5 + Math.random() * 1.5; // ~3–6 kt crosswind from +X
    this._dutchPhase = 0;
    this._engineN1 = 0;
    this._cmdRoll = 0;
    this._cmdPitch = 0;
    this._cmdYaw = 0;
    this._tmp = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._force = new THREE.Vector3();
  }

  reset(pos, heading = 0, speed = 0) {
    this.position.copy(pos);
    this.velocity.set(Math.sin(heading) * speed, 0, Math.cos(heading) * speed);
    this.euler.set(0, heading, 0, 'YXZ');
    this.quaternion.setFromEuler(this.euler);
    this.throttle = 0;
    this.collective = 0.4;
    this.flaps = 0;
    this.flapIndex = 0;
    this.gearDown = true;
    this.brakes = false;
    this.spoilers = false;
    this.spoilersArmed = false;
    this.reverse = false;
    this.afterburner = false;
    this.thrustVectorOn = !!(this.spec.thrustVector);
    this.mixtureRich = true;
    this.propFull = true;
    this.conditionRun = true;
    this.ballast = 0;
    this.waterMode = false;
    this.trim = 0;
    this.rudder = 0;
    this.aileron = 0;
    this.elevator = 0;
    this.onGround = true;
    this.onWater = false;
    this.alive = true;
    this.airborneTime = 0;
    this.stalling = false;
    this.aoa = 0;
    this.lastTouchScore = null;
    this.approachPhase = 'downwind';
    this.stableApproach = null;
    this.flareEntered = false;
    this.flareHoldOffTime = 0;
    this.flareHoldOffOk = false;
    this.balloonInFlare = false;
    this._flareAgLMin = 999;
    this._prevAgl = 999;
    this.takeoffConfigOk = false;
    this.rotateReady = false;
    this._unstableWarned = false;
    this._flareCueShown = false;
    this.smokeOn = false;
    this.parkBrake = false;
    this.autobrakeLevel = 0;
    this.flareAssist = false;
    this.goAroundActive = false;
    this._goAroundClimbTime = 0;
    this._autobrakeActive = false;
    this._passedStableGate = false;
    this._windX = 2.5 + Math.random() * 1.5;
    this._dutchPhase = 0;
    this._engineN1 = 0;
    this._cmdRoll = 0;
    this._cmdPitch = 0;
    this._cmdYaw = 0;
  }

  setAttitudeInputs(aileron, elevator, rudder) {
    this.aileron = THREE.MathUtils.clamp(aileron, -1, 1);
    this.elevator = THREE.MathUtils.clamp(elevator, -1, 1);
    this.rudder = THREE.MathUtils.clamp(rudder, -1, 1);
  }

  cycleFlaps(dir = 1) {
    const steps = this.spec.flapSteps || [0, 1];
    this.flapIndex = THREE.MathUtils.clamp(this.flapIndex + dir, 0, steps.length - 1);
    this.flaps = steps[this.flapIndex];
    return this.flaps;
  }

  setFlapIndex(i) {
    const steps = this.spec.flapSteps || [0, 1];
    this.flapIndex = THREE.MathUtils.clamp(i, 0, steps.length - 1);
    this.flaps = steps[this.flapIndex];
  }

  getSpeed() { return this.velocity.length(); }
  getGroundSpeed() { return Math.hypot(this.velocity.x, this.velocity.z); }
  getAirspeed() {
    const w = windAt(this.position.y);
    const ax = this.velocity.x - (w.x || 0);
    const az = this.velocity.z - (w.z || 0);
    return Math.hypot(ax, this.velocity.y, az);
  }
  getAirHoriz() {
    const w = windAt(this.position.y);
    return Math.hypot(this.velocity.x - (w.x || 0), this.velocity.z - (w.z || 0));
  }
  getAltitude() { return this.position.y; }
  getVerticalSpeed() { return this.velocity.y; }

  getEffectiveMass() {
    const s = this.spec;
    if (s.hasBallast) return s.mass * (1 + 0.25 * this.ballast);
    return s.mass;
  }

  getStallSpeed() {
    const s = this.spec;
    const clean = s.stallSpeed;
    const dirty = s.stallSpeedFlaps || clean * 0.86;
    const f = Math.max(0, Math.min(1, this.flaps || 0));
    let vs = clean + (dirty - clean) * f;
    if (s.thrustVector && this.thrustVectorOn && this.throttle > 0.5) {
      vs = Math.min(vs, s.stallSpeedTV || 15);
    }
    if (s.hasBallast && this.ballast > 0) vs *= Math.sqrt(1 + 0.25 * this.ballast);
    return vs;
  }

  /** Snapshot for checklist / HUD */
  getSnap(extra = {}) {
    const spd = this.getSpeed();
    return {
      throttle: this.throttle,
      collective: this.collective,
      flaps: this.flaps,
      flapIndex: this.flapIndex,
      gearDown: this.gearDown,
      brakes: this.brakes,
      spoilers: this.spoilers,
      spoilersArmed: this.spoilersArmed,
      reverse: this.reverse,
      afterburner: this.afterburner,
      thrustVectorOn: this.thrustVectorOn,
      mixtureRich: this.mixtureRich,
      propFull: this.propFull,
      conditionRun: this.conditionRun,
      ballast: this.ballast,
      waterMode: this.waterMode,
      wantWater: this.waterMode,
      speed: spd,
      vs: this.getVerticalSpeed(),
      alt: this.getAltitude(),
      agl: extra.agl ?? this.position.y,
      airborne: !this.onGround,
      onGround: this.onGround,
      onWater: this.onWater,
      rotating: !this.onGround || this.euler.x < -0.05,
      stalling: this.stalling,
      aoa: this.aoa,
      bank: this.euler.z,
      pitch: this.euler.x,
      onRunwayApproach: !!extra.onRunwayApproach,
      headingAligned: !!extra.headingAligned,
      approachPhase: this.approachPhase,
      stableApproach: this.stableApproach,
      flareEntered: this.flareEntered,
      flareHoldOffOk: this.flareHoldOffOk,
      balloonInFlare: this.balloonInFlare,
      takeoffConfigOk: this.takeoffConfigOk,
      rotateReady: this.rotateReady,
      smokeOn: this.smokeOn,
      parkBrake: this.parkBrake,
      autobrakeLevel: this.autobrakeLevel,
      flareAssist: this.flareAssist,
      goAroundActive: this.goAroundActive,
      ...extra
    };
  }

  update(dt, terrainHeight, isWater, world) {
    this._world = world;
    if (!this.alive) return;
    const s = this.spec;
    dt = Math.min(dt, 0.05);
    this._dt = dt;
    const mass = this.getEffectiveMass();

    // Attitude: heavy jets mushy at low speed; C182 stays snappy / pitch-sensitive
    const spdNow = this.getSpeed();
    const vrRef = s.vr || 30;
    const inertia = s.controlInertia ?? (s.mass > 40000 ? 0.85 : (s.mass > 10000 ? 0.5 : 0.2));
    let auth = 0.32 + 0.68 * Math.min(1, spdNow / Math.max(12, vrRef * 0.85));
    auth = 1 - inertia * (1 - auth);
    if (s.id === 'cessna182' || s.diff === 'easy') auth = Math.max(auth, 0.88);
    if (s.snappy || s.id === 'aerobatic') auth = Math.max(auth, 0.95);
    const gndMul = this.onGround ? (spdNow < 5 ? 0.15 : 0.45) : 1;
    let rollAuth = auth;
    if (s.snappy || s.id === 'aerobatic') rollAuth = Math.min(1.15, auth * 1.12);
    const rollCmd = this.aileron * s.rollRate * gndMul * rollAuth;
    let pitchInput = this.elevator + this.trim;
    if (this.flareAssist && !this.onGround && this.approachPhase === 'flare_window') {
      pitchInput += (s.diff === 'easy' ? 0.12 : 0.07);
    }
    let pitchSens = 1;
    if (s.id === 'cessna182' || s.type === 'aerobatic' || s.snappy) pitchSens = 1.28;
    if (s.snappy || s.id === 'aerobatic') pitchSens = 1.42;
    if (s.id === 'airliner' || s.id === 'cargo' || s.longRoll) pitchSens = 0.82;
    // Airliner/cargo: the nose comes up late and slowly. A fighter hung below corner loses the nose.
    if ((s.id === 'airliner' || s.id === 'cargo' || s.longRoll) && this.onGround) pitchSens *= 0.42;
    if ((s.type === 'fighter' || s.id === 'f15') && !this.onGround && spdNow < (s.stallSpeed || 60) * 1.28) pitchSens *= 0.62;
    if (s.id === 'gyro' || s.type === 'gyro') pitchSens *= 1.25;
    if (s.id === 'blimp' || s.type === 'blimp') pitchSens *= 0.32;
    if (this.onWater && s.waterPitchDamp) pitchSens *= s.waterPitchDamp;
    const pitchCmd = pitchInput * s.pitchRate * (this.onGround ? 0.5 : 1) * auth * pitchSens;
    // Light planes: strong rudder; airliner/cargo: heavy tiller (slow nosewheel)
    let yawMul = 1;
    const nwAuth = s.nosewheelAuth ?? (s.tillerHeavy ? 0.3 : (s.mass < 2000 ? 1.35 : 0.7));
    if (this.onGround && !s.isHeli) {
      const nw = Math.min(1, Math.max(0, (spdNow - 2) / 18));
      yawMul = (0.55 + 1.55 * nw) * nwAuth;
      if (s.tillerHeavy || s.id === 'airliner' || s.id === 'cargo') {
        yawMul *= 0.5 + 0.5 * Math.min(1, spdNow / 28);
      }
    }
    const yawCmd = this.rudder * s.yawRate * (this.onGround ? yawMul : 1);

    // Control lag: airliner / cargo wash out stick; Extra / F-15 snap
    const lag = Math.max(0.02, s.controlLag ?? (s.mass > 40000 ? 0.4 : 0.08));
    const lagK = Math.min(1, dt / lag);
    this._cmdRoll += (rollCmd - this._cmdRoll) * lagK;
    this._cmdPitch += (pitchCmd - this._cmdPitch) * lagK;
    this._cmdYaw += (yawCmd - this._cmdYaw) * lagK;

    this.euler.z += this._cmdRoll * dt;
    this.euler.x += this._cmdPitch * dt;
    this.euler.y += this._cmdYaw * dt;

    // Coordinated turn: bank produces heading change (user can still slip with rudder)
    if (!s.isHeli && !this.onGround) {
      const tas = Math.max(18, this.getAirHoriz?.() || this.getSpeed());
      this.euler.y += Math.sin(this.euler.z) * (9.81 / tas) * dt * 1.15;
    }

    // Dutch-roll / wing-rock in crosswind when banked (C182 touchy)
    const windSense = s.windSense ?? 0.5;
    const dutch = s.dutchRoll ?? 0;
    if (!s.isHeli && !this.onGround && dutch > 0 && Math.abs(this.euler.z) > 0.08) {
      this._dutchPhase += dt * (1.6 + windSense);
      const rock = Math.sin(this._dutchPhase) * dutch * windSense * 0.05 * Math.abs(this.euler.z);
      this.euler.z += rock * dt * 8;
      this.euler.y += rock * 0.35 * dt * 6;
    }
    // Nosewheel / tailwheel: rudder steers more with groundspeed (heavy tiller = slow)
    if (this.onGround) {
      const gs = Math.hypot(this.velocity.x, this.velocity.z);
      const nwAuth = s.nosewheelAuth ?? (s.tillerHeavy ? 0.3 : (s.mass < 2000 ? 1.35 : 0.7));
      const steer = this.rudder * (0.35 + Math.min(1.4, gs * 0.035)) * nwAuth;
      this.euler.y += steer * dt;
    }

    if (!s.thrustVector && s.type !== 'aerobatic' && s.type !== 'fighter' && !s.isHeli) {
      this.euler.x = THREE.MathUtils.clamp(this.euler.x, -1.2, 1.2);
      this.euler.z = THREE.MathUtils.clamp(this.euler.z, -1.4, 1.4);
    }
    this.quaternion.setFromEuler(this.euler);

    this._fwd.set(0, 0, 1).applyQuaternion(this.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(this.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(this.quaternion);

    const speedGs = this.velocity.length();
    const wx0 = windAt(Math.max(0, this.position.y - terrainHeight));
    const airX = this.velocity.x - (wx0.x || 0);
    const airZ = this.velocity.z - (wx0.z || 0);
    const airY = this.velocity.y;
    const speed = Math.hypot(airX, airY, airZ);
    this._airSpeed = speed;
    const agl = this.position.y - terrainHeight;
    this._updateApproachPhase(agl, dt);
    this._updateTakeoffGates();
    this._updateGoAround(dt, agl);

    // Nosewheel: align ground-track with heading when rolling
    if (this.onGround && !s.isHeli && speedGs > 2 && Math.abs(this.rudder) > 0.02) {
      const hdg = this.euler.y;
      const desired = new THREE.Vector3(Math.sin(hdg), 0, Math.cos(hdg));
      const horiz = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
      const hs = horiz.length();
      if (hs > 0.5) {
        const blend = Math.min(0.35, 0.08 + hs * 0.008) * Math.abs(this.rudder) * dt * 60;
        horiz.normalize().lerp(desired, Math.min(1, blend)).multiplyScalar(hs);
        this.velocity.x = horiz.x;
        this.velocity.z = horiz.z;
      }
    }

    // Flare sink bleed: nose-up damps descent (firmFlare = less float / firmer)
    if (!this.onGround && !s.isHeli && this.approachPhase === 'flare_window' && this.velocity.y < -0.2) {
      const noseUp = (-this.euler.x) > 0.04;
      const elevUp = (this.elevator + this.trim) < -0.05;
      if (noseUp || elevUp) {
        let bleed = s.diff === 'easy' ? 1.7 : (s.diff === 'med' ? 1.4 : 1.15);
        if (s.firmFlare) bleed *= 0.72;
        if (this.throttle <= (s.flareIdleThr ?? 0.2)) bleed *= 1.25;
        if (this.flareAssist && !s.firmFlare) bleed *= 1.15;
        this.velocity.y *= Math.pow(1 / bleed, dt * 4);
      }
    }
    const wasGround = this.onGround;
    this.onWater = false;
    this._force.set(0, 0, 0);

    // Density altitude (simple)
    const alt = Math.max(0, this.position.y);
    const rho = RHO0 * Math.exp(-alt / 8500) * (weather.dens || 1);

    if (s.isHeli) {
      this._updateHeli(dt, speed, agl, rho, mass);
    } else {
      this._updateFixedWing(dt, speed, agl, rho, mass);
    }

    this._force.y -= mass * G;

    this._tmp.copy(this._force).multiplyScalar(dt / mass);
    this.velocity.add(this._tmp);

    // A pullout bends the flight path toward level at a limited rate. Still descending until it is flat.
    // Do not stop at a steep mush: a light prop was quitting around -6 m/s and settling near -18.
    // Path angle is clamped at 0 so the bend cannot rotate the velocity up into a climb.
    if (!s.isHeli && !this.onGround && (this.elevator + this.trim) < -0.2 && this.velocity.y < -0.6) {
      const iasNow = this._airSpeed || this.getAirspeed();
      const vsNow = this.getStallSpeed();
      if (iasNow > vsNow * 1.3) {
        const pull = Math.min(1, -(this.elevator + this.trim));
        const wP = windAt(Math.max(0, agl));
        let ax = this.velocity.x - (wP.x || 0);
        let ay = this.velocity.y;
        let az = this.velocity.z - (wP.z || 0);
        const horiz = Math.hypot(ax, az);
        const spd = Math.hypot(horiz, ay);
        if (spd > 1 && ay < 0) {
          const fwdH = Math.hypot(this._fwd.x, this._fwd.z) || 1;
          const path = Math.atan2(-ay, Math.max(horiz, 0.5));
          // Light props need the arc to finish (the old -6 m/s cutoff left them mushed),
          // but a slower rate so the level-off still spends altitude.
          const light = s.type === 'prop' || s.type === 'glider' || (s.mass || 0) < 3000;
          const rate = (light ? 0.22 : 0.35) + (light ? 0.4 : 0.7) * pull;
          const next = Math.max(0, path - rate * dt);
          const nh = spd * Math.cos(next);
          const ny = -spd * Math.sin(next);
          const bleed = 1 - Math.min(0.06, (0.015 + 0.04 * pull) * dt * 6);
          this.velocity.x = (wP.x || 0) + (this._fwd.x / fwdH) * nh * bleed;
          this.velocity.y = ny * bleed;
          this.velocity.z = (wP.z || 0) + (this._fwd.z / fwdH) * nh * bleed;
        }
      }
    }

    // Crosswind weathervane from live weather (do not add wind as extra accel — aero uses airspeed)
    {
      const wloc = windAt(agl);
      const wx = wloc.x || 0;
      const wz = wloc.z || 0;
      const cross = wx * Math.cos(this.euler.y) - wz * Math.sin(this.euler.y);
      const head = -(wx * Math.sin(this.euler.y) + wz * Math.cos(this.euler.y));
      const ws = (s.windSense ?? 0.5) * (1 + (weather.turb || 0) * 0.7);
      if (!this.onGround && !s.isHeli) {
        this.euler.z += cross * ws * 0.014 * dt;
        this.euler.y += cross * ws * 0.007 * dt;
        if (weather.turb > 0.15) {
          this.euler.z += Math.sin(performance.now() * 0.004 + this._dutchPhase) * weather.turb * 0.28 * dt;
          this.euler.x += Math.cos(performance.now() * 0.003) * weather.turb * 0.14 * dt;
        }
        if ((weather.shear || 0) > 0.3 && agl < 40 && agl > 4) {
          this.velocity.y -= weather.shear * 1.8 * dt * (s.mass < 3000 ? 1.4 : 0.7);
        }
      }
      if (this.onGround && !s.isHeli && spdNow > 2) {
        const wv = s.weathervane ?? 0.5;
        const lightBoost = (s.mass < 2500 || s.type === 'glider' || s.snappy || s.id === 'gyro' || s.id === 'blimp') ? 1.45 : 1.0;
        this.euler.y += cross * wv * 0.022 * lightBoost * dt * Math.min(1.2, spdNow / 16);
        const drift = cross * (s.mass < 2500 ? 0.35 : 0.12) * dt;
        this.velocity.x += Math.cos(this.euler.y) * drift;
        this.velocity.z -= Math.sin(this.euler.y) * drift;
        if (head < -4 && this.throttle > 0.7 && this.airborneTime < 0.2) {
          this.velocity.x += Math.sin(this.euler.y) * 0.4 * dt;
          this.velocity.z += Math.cos(this.euler.y) * 0.4 * dt;
        }
        if (s.id === 'gyro' || s.id === 'blimp' || s.type === 'gyro' || s.type === 'blimp') {
          this.euler.y += cross * (s.id === 'blimp' || s.type === 'blimp' ? 0.08 : 0.05) * dt;
        }
        if ((s.id === 'cessna182' || s.id === 'gyro' || s.id === 'duster' || s.snappy) && spdNow > 10 && Math.abs(cross) > 0.6) {
          this.euler.z += Math.sign(cross) * ws * 0.1 * dt * Math.min(1, (spdNow - 10) / 20);
          if (Math.abs(this.euler.z) > 0.85 && spdNow > 14 && Math.abs(cross) > 6) {
            this.euler.z *= 0.4;
            this.velocity.x *= 0.55;
            this.velocity.z *= 0.55;
            return { event: 'rough', reason: 'crosswind ground loop — keep rolling', vert: 0, gs: spdNow };
          }
        }
      }
    }

    // Vne is indicated airspeed. A 182's limit sits far below an F-15's; wind stays in the groundspeed.
    {
      const vne = s.maxSpeed || 200;
      const wV = windAt(Math.max(0, this.position.y));
      const ax = this.velocity.x - (wV.x || 0);
      const ay = this.velocity.y;
      const az = this.velocity.z - (wV.z || 0);
      const ias = Math.hypot(ax, ay, az);
      const fighter = s.type === 'fighter' || s.id === 'f15';
      this._vneBuffet = 0;
      // Fast jets often top out just under 0.86 Vne, so buffet would stay silent.
      // Start theirs a little earlier. Light props stay at 0.86 Vne. Do not lower the cap.
      const buffetAt = fighter ? 0.80 : 0.86;
      const buffetBand = fighter ? 0.26 : 0.14;
      if (!s.isHeli && ias > vne * buffetAt) {
        const frac = (ias - vne * buffetAt) / Math.max(1, vne * buffetBand);
        this._vneBuffet = Math.min(fighter ? 1.1 : 1.7, frac);
        const t = performance.now() * 0.001;
        this.euler.x += Math.sin(t * 46) * this._vneBuffet * 0.04 * dt * 28;
        this.euler.z += Math.cos(t * 33) * this._vneBuffet * 0.032 * dt * 28;
        this.quaternion.setFromEuler(this.euler);
      }
      const cap = vne * (fighter ? 1.06 : 1.02);
      if (ias > cap && ias > 1) {
        const k = cap / ias;
        this.velocity.x = (wV.x || 0) + ax * k;
        this.velocity.y = ay * k;
        this.velocity.z = (wV.z || 0) + az * k;
      }
    }

    this.position.addScaledVector(this.velocity, dt);

    if (world && !this.onGround) {
      const hit = world.hitSolid?.(this.position.x, this.position.z);
      const aglNow = this.position.y - terrainHeight;
      const gsHit = Math.hypot(this.velocity.x, this.velocity.z);
      if (hit && aglNow < obstacleHeight(hit, s)) {
        if (hit === 'building' || hit === 'hangar' || hit === 'tower' || hit === 'house' || hit === 'water-tower') {
          this.alive = false;
          return { event: 'crash', reason: `hit ${hit}` };
        }
        if (hit === 'tree') {
          const dens = world.forestDens?.(this.position.x, this.position.z) || 0.4;
          const heavy = (s.size || 1) > 1.25 || (s.mass || 0) > 8000;
          if (dens > 0.55 || heavy && dens > 0.28) {
            if (gsHit > 28 || this.velocity.y < -12) {
              this.alive = false;
              return { event: 'crash', reason: 'forest breakup' };
            }
            this.velocity.multiplyScalar(0.15);
            this.velocity.y = 0;
            this.position.y = terrainHeight + 2;
            return { event: 'wreck_walk', reason: 'trees took the wings — you can walk' };
          }
          this.velocity.x *= 0.55;
          this.velocity.z *= 0.55;
          this.velocity.y = Math.min(this.velocity.y, -1);
          return { event: 'rough', reason: 'clipped trees' };
        }
      }
    }

    const contactY = terrainHeight + (s.isHeli ? 1.2 : 1.5) * (s.size || 1) * 0.5;
    if (this.position.y <= contactY) {
      this.position.y = contactY;
      const vert = Math.max(0, -this.velocity.y);
      const gs = Math.hypot(this.velocity.x, this.velocity.z);

      if (isWater && s.canWater) {
        return this._handleWaterContact(wasGround, vert, gs);
      } else if (isWater && !s.canWater) {
        // GTA-style skip/ditch: only wreck on a slam
        if (vert > 12) {
          this.alive = false;
          return { event: 'crash', reason: 'ditched too hard', vert, gs };
        }
        this.velocity.y = Math.abs(this.velocity.y) * 0.35;
        this.velocity.x *= 0.7;
        this.velocity.z *= 0.7;
        this.position.y = contactY + 0.8;
        return { event: 'rough', reason: 'water contact — not amphib (ATP fail)', vert, gs };
      } else {
        return this._handleGroundContact(wasGround, vert, gs, isWater);
      }
    } else {
      this.onGround = false;
      this.airborneTime += dt;
    }
    return null;
  }

  _handleWaterContact(wasGround, vert, gs) {
    const s = this.spec;
    this.onWater = true;
    this.onGround = true;

    // Gear DOWN on water = wreck for amphib
    if (s.hasGear && this.gearDown && this.airborneTime > 1.5 && vert > 0.3) {
      if (vert > 10) {
        this.alive = false;
        return { event: 'crash', reason: 'gear down on water', vert, gs };
      }
      this.velocity.y = 0;
      this.velocity.x *= 0.5;
      this.velocity.z *= 0.5;
      return { event: 'rough', reason: 'gear down on water — ATP fail', vert, gs };
    }

    const vmax = s.waterLandVertMax || 2.5;
    if (vert > 12 || gs > (s.landSpeedMax || 40) * 2.2) {
      this.alive = false;
      return { event: 'crash', reason: 'water impact', vert, gs };
    }

    // Water drag / step taxi — soggy amphib rollout
    this.velocity.y = 0;
    let wfric = 0.91;
    if (s.id === 'amphibian' || s.soggyWaterRollout) {
      wfric = 0.86 - Math.min(0.06, (s.waterRolloutDrag || 0.1) * 0.25);
      this.euler.x *= 0.78;
      this.euler.z *= 0.88;
      this.quaternion.setFromEuler(this.euler);
    } else {
      this.euler.x *= 0.92;
    }
    if (this.brakes || this.reverse) wfric = Math.min(wfric, 0.80);
    this.velocity.x *= wfric;
    this.velocity.z *= wfric;

    if (!wasGround && this.airborneTime > 2) {
      const score = this._scoreLanding(vert, gs, true);
      this.lastTouchScore = score;
      if (score.fail) {
        return { event: 'land', surface: 'water', vert, gs, score, standardFail: true };
      }
      return { event: 'land', surface: 'water', vert, gs, score };
    }
    return null;
  }

  _handleGroundContact(wasGround, vert, gs, isWater) {
    const s = this.spec;
    this.onGround = true;
    const world = this._world;
    const surf = world?.classifySurface?.(this.position.x, this.position.z) || { id: 'grass', rough: 0.18, maxClass: 'light' };
    const cls = landClass(s);
    const allowed = surfaceAllows(cls, surf, s);

    if (!allowed && this.airborneTime > 1.2 && vert > 0.8) {
      if (surf.id === 'forest' || surf.id === 'suburb' || surf.maxClass === 'none') {
        if (vert > 8 || gs > 35 || (s.size || 1) > 1.4) {
          this.alive = false;
          return { event: 'crash', reason: `cannot land ${surf.id}` };
        }
        return { event: 'wreck_walk', reason: `broke up on ${surf.id}` };
      }
      if (cls === 'heavy' && (surf.id === 'road' || surf.id === 'grass')) {
        if (gs > 40 || vert > 6) {
          this.alive = false;
          return { event: 'crash', reason: 'too short / too rough for heavy' };
        }
        this.velocity.x *= 0.4;
        this.velocity.z *= 0.4;
        return { event: 'rough', reason: 'heavy on a short surface — ATP fail, still rolling' };
      }
    }

    if (world && gs > 10) {
      const look = 4 + Math.min(12, gs * 0.12);
      const h0 = sampleHeight(this.position.x, this.position.z);
      const h1 = sampleHeight(
        this.position.x + Math.sin(this.euler.y) * look,
        this.position.z + Math.cos(this.euler.y) * look
      );
      const bump = h1 - h0;
      const thresh = 0.28 + (surf.rough || 0.1) * 1.4;
      if (bump > thresh) {
        this.velocity.y = Math.min(16, bump * 3.2 + gs * 0.05 * (s.mass > 8000 ? 1.4 : 1));
        this.velocity.x *= 0.92;
        this.velocity.z *= 0.92;
        this.onGround = false;
        this.position.y += 0.35;
        this.euler.x -= Math.min(0.25, bump * 0.08);
        this.quaternion.setFromEuler(this.euler);
        return { event: 'bounce', vert: bump, gs, reason: 'hit a bump' };
      }
    }

    let fricExtra = 0;
    if (surf.id === 'grass' || surf.id === 'flat') fricExtra = 0.01;
    if (surf.id === 'road') fricExtra = 0.004;
    if (surf.rough > 0.25) {
      this.euler.z += (Math.random() - 0.5) * surf.rough * 0.04;
      this.velocity.x *= 1 - surf.rough * 0.015;
      this.velocity.z *= 1 - surf.rough * 0.015;
    }
    this._surfFric = fricExtra;

    // Amphib gear UP on land = crash
    if (s.canWater && s.hasGear && !this.gearDown && this.airborneTime > 1.5 && vert > 0.5) {
      if (vert > 12) {
        this.alive = false;
        return { event: 'crash', reason: 'belly on land', vert, gs };
      }
      this.velocity.x *= 0.6;
      this.velocity.z *= 0.6;
    }

    const gearOk = !s.hasGear || s.gearFixed || this.gearDown;
    if (!gearOk && this.airborneTime > 1.5 && vert > 0.5) {
      if (vert > 12) {
        this.alive = false;
        return { event: 'crash', reason: 'gear up wreck', vert, gs };
      }
      this.velocity.x *= 0.55;
      this.velocity.z *= 0.55;
    }

    if (this.airborneTime > 1.5) {
      const score = this._scoreLanding(vert, gs, false);
      this.lastTouchScore = score;

      // Only a smash ends the flight. ATP numbers still live on the score.
      if (vert > 14) {
        this.alive = false;
        return {
          event: 'crash',
          reason: 'impact — airframe limit',
          vert, gs, score
        };
      }
      if (vert > (s.landVertMax || 3) * 2.2) {
        this.velocity.y = vert * 0.22;
        this.onGround = false;
        this.position.y += 0.6;
        return { event: 'bounce', vert, gs, score, standardFail: true };
      }
      if ((weather.gustKt || 0) > 8 && !wasGround && gs > 12 && Math.random() < 0.35 + weather.gustKt * 0.01) {
        this.velocity.y = 1.4 + weather.gustKt * 0.08;
        this.onGround = false;
        this.position.y += 0.4;
        return { event: 'bounce', vert, gs, score, reason: 'gust on the mains' };
      }
    }

    this.velocity.y = Math.max(0, this.velocity.y);

    // Rolling resistance in time, not per frame, so a light prop can actually reach Vr.
    const step = Math.max(0.016, Math.min(0.05, this._dt || 0.05));
    let tau = 36;
    if (this.parkBrake || this.park) {
      tau = 0.35;
      this.throttle = Math.min(this.throttle, 0.02);
    } else if (this.brakes) {
      tau = 0.7;
    }
    let fric = Math.exp(-step / tau);
    if (this._autobrakeActive && (this.autobrakeLevel || this.autobrake) > 0 && !this.reverse) {
      fric *= (this.autobrakeLevel || this.autobrake) >= 2 ? 0.90 : 0.94;
    }
    if (this.reverse && this.throttle > 0.05) {
      fric *= 0.92;
      this._autobrakeActive = false;
    }
    if (this.spoilers && wasGround === false) fric *= 0.95;
    if (this.throttle < 0.05 && !this.reverse && !this.parkBrake && !this.park) fric *= 0.997;
    if (s.mass > 20000) fric *= this.brakes ? 0.98 : 0.995;
    if (this._surfFric) fric *= (1 - this._surfFric);
    if (weather.wet > 0.2) {
      const slip = 0.012 + weather.wet * 0.03;
      fric = Math.min(0.998, fric + slip * (this.brakes ? 0.7 : 0.35));
    }
    this.velocity.x *= fric;
    this.velocity.z *= fric;

    if (this.getSpeed() < 8) {
      this.euler.x *= 0.9;
      this.euler.z *= 0.9;
      this.quaternion.setFromEuler(this.euler);
    }

    // Auto-deploy armed spoilers on touch (airliner)
    if (!wasGround && this.spoilersArmed) this.spoilers = true;
    if (!wasGround && this.airborneTime > 1.5 && this.autobrakeLevel > 0) {
      this._autobrakeActive = true;
    }
    if (!wasGround) this.goAroundActive = false;

    if (!wasGround && this.airborneTime > 2) {
      return { event: 'touchdown', vert, gs, score: this.lastTouchScore };
    }
    return null;
  }

  _scoreLanding(vert, gs, water) {
    const s = this.spec;
    const issues = [];
    const breakdown = { config: 0, sink: 0, speed: 0, align: 0, flare: 0 };
    let fail = false;
    let points = 100;
    const diff = s.diff || 'med';
    const hard = diff === 'hard' || diff === 'expert';
    const easy = diff === 'easy';

    const landVert = water ? (s.waterLandVertMax || s.landVertMax || 2.5) : (s.landVertMax || 3.0);
    const vref = s.vref || s.stallSpeed * 1.3;
    const appMin = s.approachSpeedMin ?? vref * 0.9;
    const appMax = s.approachSpeedMax ?? vref * 1.15;

    // ── Config gates ──────────────────────────────────────
    if (!s.isHeli && s.gearRetractable && !this.gearDown && !water) {
      issues.push('gear up'); fail = true; points = 0; breakdown.config = -100;
    }
    if (s.canWater && water && this.gearDown) {
      issues.push('gear down on water'); fail = true; points = 0; breakdown.config = -100;
    }
    if (s.canWater && !water && s.hasGear && !this.gearDown) {
      issues.push('gear up on land'); fail = true; points = 0; breakdown.config = -100;
    }

    const needFlaps = s.flapLanding ?? s.flapApproach ?? 0.5;
    if (s.enforceFlapsLanding && this.flaps < needFlaps - 0.05) {
      issues.push('flaps not set');
      const pen = hard ? 40 : 25;
      points -= pen; breakdown.config -= pen;
      if (hard) fail = true;
    } else if (!s.isHeli && s.flapLanding != null && this.flaps >= needFlaps - 0.05) {
      breakdown.config += 0;
    }

    if (s.requireSpoilersArmed) {
      if (this.spoilersArmed || this.spoilers) {
        points += 5; breakdown.config += 5;
      } else {
        issues.push('spoilers not armed');
        const pen = hard ? 30 : 20;
        points -= pen; breakdown.config -= pen;
        if (diff === 'expert' || (hard && s.enforceStableApproach)) fail = true;
      }
    }
    // Glider: spoilers are energy/path — reward open, punish high-energy closed
    if (s.energySpoilerPath || s.type === 'glider') {
      if (this.spoilers) {
        points += 10; breakdown.config += 10;
      } else if (gs > (s.vref || 28) * 1.15 || vert > 1.2) {
        issues.push('energy high — spoilers');
        points -= 20; breakdown.speed -= 20;
        if (gs > (s.landSpeedMax || 32) * 0.92) fail = true;
      }
    }

    if (s.hasMixture) {
      if (this.mixtureRich) { points += 3; breakdown.config += 3; }
      else {
        const pen = easy ? 3 : 8;
        points -= pen; breakdown.config -= pen; issues.push('mixture lean');
      }
    }
    if (s.hasProp) {
      if (this.propFull) { points += 3; breakdown.config += 3; }
      else {
        const pen = easy ? 3 : 8;
        points -= pen; breakdown.config -= pen; issues.push('prop not full');
      }
    }
    if (s.hasCondition) {
      if (this.conditionRun) { points += 3; breakdown.config += 3; }
      else { points -= 8; breakdown.config -= 8; issues.push('condition cut'); }
    }
    if (s.thrustVector) {
      const tvOk = this.thrustVectorOn || gs > 55;
      if (this.thrustVectorOn && gs <= 55) { points += 5; breakdown.config += 5; }
      else if (!tvOk && gs < 50) {
        issues.push('TV off + slow');
        points -= 30; breakdown.config -= 30;
        if (diff === 'expert' || s.tvFailModes) fail = true;
      }
      // Conventional vs TV failure modes
      if (s.tvFailModes && !this.thrustVectorOn) {
        if (gs < 55) {
          issues.push('conventional too slow (TV off)');
          points -= 40; breakdown.speed -= 40;
          if (gs < 42 || vert > 1.4) fail = true;
        } else if (gs >= 55 && gs <= 90) {
          points += 6; breakdown.speed += 6;
        }
      }
      if (s.tvFailModes && this.thrustVectorOn && gs < 35 && vert > 1.6) {
        issues.push('TV hover drop');
        points -= 25; breakdown.sink -= 25;
        if (vert > 2.2) fail = true;
      }
    }
    if (s.punishSlowFloat || s.onSpeedLanding || s.id === 'f15') {
      const onSpeedMin = (s.approachSpeedMin ?? 70);
      const onSpeedMax = (s.approachSpeedMax ?? 90);
      if (gs < onSpeedMin * 0.85) {
        issues.push('slow float (fighter)');
        points -= 35; breakdown.speed -= 35;
        if (gs < onSpeedMin * 0.7) fail = true;
      } else if (gs >= onSpeedMin && gs <= onSpeedMax) {
        points += 10; breakdown.speed += 10; // on-speed
      }
    }
    if ((s.id === 'f15' || s.type === 'fighter') && this.euler.x < -0.12 && gs > 40) {
      points += 8; breakdown.flare += 8;
    }
    if (s.canWater && water && !this.gearDown) {
      points += 10; breakdown.config += 10;
    }

    // ── Sink rate bands ───────────────────────────────────
    const sinkRatio = landVert > 0 ? vert / landVert : 1;
    if (vert > landVert) {
      issues.push('hard landing'); fail = true;
      points -= 50; breakdown.sink -= 50;
    } else if (sinkRatio <= 0.35) {
      points += 20; breakdown.sink += 20;
    } else if (sinkRatio <= 0.60) {
      points += 12; breakdown.sink += 12;
    } else if (sinkRatio <= 0.85) {
      breakdown.sink += 0;
    } else {
      issues.push('firm vertical');
      points -= 20; breakdown.sink -= 20;
    }

    // ── Speed / Vref ──────────────────────────────────────
    if (s.isHeli) {
      if (gs > s.landSpeedMax) {
        issues.push('heli forward speed'); fail = true;
        points -= 40; breakdown.speed -= 40;
      } else if (gs <= 5) {
        points += 10; breakdown.speed += 10;
      }
    } else {
      if (gs >= appMin && gs <= appMax) {
        points += 15; breakdown.speed += 15;
      } else if (gs > appMax && gs <= vref * 1.30) {
        issues.push('fast (soft)');
        points -= 15; breakdown.speed -= 15;
      } else if (gs > vref * 1.30) {
        issues.push('fast (above Vref band)');
        points -= 25; breakdown.speed -= 25;
        if (gs > (s.landSpeedMax || vref * 1.5) * 0.95) fail = true;
      }
      {
        let stallRef = this.getStallSpeed();
        if (s.thrustVector && this.thrustVectorOn) {
          stallRef = Math.min(stallRef, s.stallSpeedTV || 15);
        }
        if (gs < stallRef * 1.05 && vert > 1.2) {
          issues.push('slow / drop-in');
          const pen = easy ? 15 : (hard ? 30 : 25);
          points -= pen; breakdown.speed -= pen;
          if (hard && gs < stallRef * 0.95) fail = true;
        }
      }
    }

    // ── Alignment (runway frame: heading 0, x lateral, z along) ──
    const x = this.position.x;
    const z = this.position.z;
    const halfW = 25;
    const halfL = 900;
    const yaw = this.euler.y;
    // normalize heading error vs runway 0 (and 180)
    let hdgErr = Math.abs(((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    if (hdgErr > Math.PI) hdgErr = Math.PI * 2 - hdgErr;
    if (hdgErr > Math.PI / 2) hdgErr = Math.PI - hdgErr; // accept either direction
    const hdgDeg = hdgErr * 180 / Math.PI;
    const bank = Math.abs(this.euler.z);
    const onRwyLat = Math.abs(x) <= halfW;
    const alongOk = Math.abs(z) <= halfL;

    if (!s.isHeli && !water) {
      const lat = Math.abs(x);
      if (lat <= 8) { points += 10; breakdown.align += 10; }
      else if (lat <= 15) { points += 5; breakdown.align += 5; }
      else if (lat <= halfW) { breakdown.align += 0; }
      else if (alongOk) {
        issues.push('off centerline');
        points -= 15; breakdown.align -= 15;
        if (hard && lat > halfW + 10) { fail = true; issues.push('off runway'); }
      }

      if (hdgDeg <= 5) { points += 8; breakdown.align += 8; }
      else if (hdgDeg <= 10) { points += 3; breakdown.align += 3; }
      else if (hdgDeg > 20 && onRwyLat) {
        issues.push('heading error');
        points -= 20; breakdown.align -= 20;
        if (hard) fail = true;
      }

      if (bank <= 0.15) { points += 5; breakdown.align += 5; }
      else if (bank <= 0.35) { breakdown.align += 0; }
      else {
        issues.push('wing low');
        points -= 15; breakdown.align -= 15;
        if (bank > 0.55) fail = true;
      }

      // TDZ: threshold at -halfL; prefer first 300m after threshold for jets, first third for GA
      const fromThreshold = z - (-halfL);
      const tdzMax = s.tdzPreferMax || 500;
      if (fromThreshold < -30) {
        issues.push('short of threshold');
        points -= 15; breakdown.align -= 15;
      } else if (fromThreshold > halfL) {
        issues.push('long landing');
        points -= 10; breakdown.align -= 10;
      } else if (fromThreshold > tdzMax && hard) {
        issues.push('long TDZ');
        points -= 10; breakdown.align -= 10;
      }
    } else if (bank > 0.55) {
      issues.push('wing low'); fail = true; points -= 20;
    }

    // ── Flare quality ─────────────────────────────────────
    if (!s.isHeli) {
      const idleGate = s.flareIdleThr ?? 0.2;
      if (this.flareEntered && this.throttle <= idleGate) {
        points += 8; breakdown.flare += 8;
      } else if (this.flareEntered && s.type !== 'glider') {
        issues.push('flare not idle');
        points -= 8; breakdown.flare -= 8;
      }
      if (this.flareHoldOffOk) {
        points += 7; breakdown.flare += 7;
      }
      if (this.balloonInFlare) {
        issues.push('balloon in flare');
        points -= 10; breakdown.flare -= 10;
      }
    } else {
      // heli hover settle — slow vertical; run-on / hard sink still bites
      if (s.hoverSettle) {
        if (gs < 4 && vert < landVert * 0.55) { points += 14; breakdown.flare += 14; }
        else if (gs < 8 && vert < landVert * 0.7) { points += 6; breakdown.flare += 6; }
        else if (gs > 10 || vert > landVert * 0.85) {
          issues.push('hover settle rough');
          points -= 12; breakdown.flare -= 12;
        }
        if (gs > (s.landSpeedMax || 15) * 0.7 && vert > 1.0) {
          issues.push('run-on instead of settle');
          points -= 15; breakdown.speed -= 15;
        }
      } else if (gs < 5 && vert < landVert * 0.6) {
        points += 10; breakdown.flare += 10;
      }
    }

    // Unstable approach penalty (hard types: soft cap ≤75)
    if (this.stableApproach === false) {
      const pen = hard ? 25 : 15;
      if (!issues.includes('unstable approach')) issues.push('unstable approach');
      points -= pen; breakdown.align -= pen;
      if (hard) points = Math.min(points, 75);
    }

    // Hard config / crash gates zero the score
    const fatal = ['gear up', 'gear down on water', 'gear up on land', 'hard landing',
      'heli forward speed', 'off runway', 'wing low'];
    if (fail && issues.some((i) => fatal.includes(i))) {
      points = 0;
      breakdown.config = Math.min(breakdown.config, -100);
    }

    points = Math.max(0, Math.min(100, Math.round(points)));
    let grade = 'D';
    if (points >= 90) grade = 'S';
    else if (points >= 80) grade = 'A';
    else if (points >= 65) grade = 'B';
    else if (points >= 50) grade = 'C';

    const reason = issues[0] || 'ok';
    return { points, issues, fail, reason, vert, gs, water, breakdown, grade, phase: this.approachPhase };
  }

  /** Approach phase machine + flare / stable-gate tracking */
  _updateApproachPhase(agl, dt) {
    const s = this.spec;
    if (this.onGround) {
      if (this.airborneTime > 2 && this.getSpeed() > 5) this.approachPhase = 'rollout';
      else if (!this.airborneTime) this.approachPhase = 'downwind';
      this._prevAgl = agl;
      return;
    }

    const flareStart = (s.canWater && this.waterMode)
      ? (s.waterFlareStartAgl || s.flareStartAgl || 4)
      : (s.flareStartAgl || 6);
    const holdFloor = s.flareHoldOffFloor || 0.4;
    const stableAgl = s.stableGateAgl || 152;
    const vs = this.velocity.y;
    const sinking = vs < -0.5;

    // Stable gate sample near target AGL (once)
    if (this.stableApproach == null && agl < stableAgl + 15 && agl > stableAgl - 40 && sinking) {
      const vref = s.vref || s.stallSpeed * 1.3;
      const appMin = s.approachSpeedMin ?? vref * 0.85;
      const appMax = s.approachSpeedMax ?? vref * 1.2;
      const spd = this.getAirHoriz();
      let hdg = Math.abs(((this.euler.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
      if (hdg > Math.PI) hdg = Math.PI * 2 - hdg;
      if (hdg > Math.PI / 2) hdg = Math.PI - hdg;
      const hdgOk = hdg < (10 * Math.PI / 180);
      const spdOk = s.isHeli ? spd < 40 : (spd >= appMin * 0.9 && spd <= appMax * 1.15);
      const sinkOk = Math.abs(vs) <= 5.08;
      const cfgOk = this._landingConfigOk();
      this.stableApproach = bankOk && hdgOk && spdOk && sinkOk && cfgOk;
      if (this.stableApproach) this._passedStableGate = true;
    }

    // Final approach sink advisory flag (for HUD)
    this.sinkAdvisory = (!s.isHeli && agl < 150 && agl > flareStart && vs < -5.08);

    if (agl <= flareStart && agl >= holdFloor * 0.5) {
      this.approachPhase = 'flare_window';
      if (!this.flareEntered) {
        this.flareEntered = true;
        this._flareAgLMin = agl;
      }
      // Hold-off: stay in window ≥0.3s before touch
      this.flareHoldOffTime += dt;
      if (this.flareHoldOffTime >= 0.3) this.flareHoldOffOk = true;
      // Balloon: AGL rising >1m while in flare
      if (agl > this._flareAgLMin + 1.0) this.balloonInFlare = true;
      this._flareAgLMin = Math.min(this._flareAgLMin, agl);
    } else if (agl < 30) {
      this.approachPhase = 'short_final';
    } else if (agl < 200) {
      this.approachPhase = 'final';
    } else {
      this.approachPhase = 'downwind';
    }

    this._prevAgl = agl;
  }

  _landingConfigOk() {
    const s = this.spec;
    if (s.isHeli) return true;
    if (s.enforceGear && s.gearRetractable && !this.gearDown) return false;
    if (s.enforceFlapsLanding && this.flaps < (s.flapApproach || 0.5) - 0.05) return false;
    if (s.requireSpoilersArmed && !(this.spoilersArmed || this.spoilers)) return false;
    return true;
  }

  /** Takeoff rotate gates — unique Vr + config per type */
  _updateTakeoffGates() {
    const s = this.spec;
    if (!this.onGround || this.airborneTime > 1) {
      this.rotateReady = false;
      return;
    }
    const spd = this.getAirHoriz();
    const vr = s.vr || 30;
    // Strict band — airliner must not cue rotate at 40 kt
    const inVrBand = spd >= vr * 0.98 && spd <= vr * 1.22;

    let cfg = true;
    if (s.hasMixture && !this.mixtureRich) cfg = false;
    if (s.hasProp && !this.propFull) cfg = false;
    if (s.hasCondition && !this.conditionRun) cfg = false;

    if (s.requireFlapsToRotate || s.id === 'airliner' || s.id === 'privatejet' || s.id === 'cargo') {
      const ft = s.flapTakeoff ?? 0.25;
      const alt = s.flapTakeoffAlt;
      const ok = Math.abs(this.flaps - ft) < 0.22 ||
        (alt != null && Math.abs(this.flaps - alt) < 0.22);
      if (this.flaps > 0.85) cfg = false;
      else if (!ok) cfg = false;
    } else if (s.flapTakeoff != null && s.type !== 'glider') {
      const ft = s.flapTakeoff;
      const alt = s.flapTakeoffAlt;
      const ok = Math.abs(this.flaps - ft) < 0.2 ||
        (alt != null && Math.abs(this.flaps - alt) < 0.2) ||
        (ft === 0 && this.flaps <= 0.7);
      if (!ok && this.flaps > 0.85) cfg = false;
    }
    if (s.hasSpoilers && this.spoilers) cfg = false;
    if (s.canWater) {
      const wantWater = this.waterMode;
      if (wantWater && this.gearDown) cfg = false;
      if (!wantWater && !this.gearDown) cfg = false;
    }
    const thrMin = (s.id === 'airliner' || s.id === 'cargo') ? 0.85 : 0.7;
    this.takeoffConfigOk = cfg;
    this.rotateReady = cfg && inVrBand && this.throttle >= thrMin;
  }

  _updateFixedWing(dt, speed, agl, rho, mass) {
    const s = this.spec;
    let thrustMag = s.idleThrust + (s.maxThrust - s.idleThrust) * this.throttle;
    // Engine spool — jets lag the lever; props almost instant
    const spoolSec = s.engineSpool ?? (
      s.type === 'jet' || s.id === 'airliner' || s.id === 'privatejet' ? 3.4
        : s.type === 'fighter' || s.type === 'experimental' ? 1.1
          : s.isHeli ? 1.6
            : 0.35
    );
    if (spoolSec > 0.05 && !this.reverse) {
      const n1Target = THREE.MathUtils.clamp(this.throttle, 0, 1);
      const spoolK = Math.min(1, dt / spoolSec);
      // Spool-up slower than spool-down for big fans
      const k = n1Target > this._engineN1 ? spoolK * (s.id === 'airliner' || s.id === 'cargo' ? 0.72 : 1) : Math.min(1, spoolK * 1.6);
      this._engineN1 += (n1Target - this._engineN1) * k;
      thrustMag = s.idleThrust + (s.maxThrust - s.idleThrust) * this._engineN1;
    } else {
      this._engineN1 = this.throttle;
    }
    // Per-type takeoff accel: C182 short roll, airliner long
    if (this.onGround) {
      const scale = s.takeoffAccelScale ?? 1;
      thrustMag = s.idleThrust + (thrustMag - s.idleThrust) * scale;
    }

    // Prop/mixture efficiency
    if (s.hasProp && !this.propFull) thrustMag *= 0.75;
    if (s.hasMixture && !this.mixtureRich && this.position.y < 1500) thrustMag *= 0.7;
    if (s.hasCondition && !this.conditionRun) thrustMag *= 0.15;

    // Afterburner only above thr gate (default / abThrMin 60%)
    const abMin = s.abThrMin ?? 0.6;
    if (s.hasAfterburner && this.afterburner) {
      if (this.throttle > abMin) {
        const ab = s.abThrust || s.maxThrust * 1.8;
        const n1 = this._engineN1 || this.throttle;
        thrustMag = s.idleThrust + (ab - s.idleThrust) * n1;
      } else {
        this.afterburner = false; // under gate — mil only
      }
    }

    // Reverse thrust on ground
    if (this.reverse && this.onGround) {
      const revFrac = s.reverseThrustFrac || 0.4;
      thrustMag = -Math.abs(thrustMag) * revFrac * Math.max(this.throttle, 0.3);
    }

    // Rolling resistance — longRoll cargo/airliner; shortField aerobatic pops off
    if (this.onGround && speed > 0.5 && !this.reverse) {
      let grd = s.groundRollDrag ?? (s.mass > 40000 ? 0.045 : 0.02);
      if (s.shortField) grd *= 0.75;
      if (s.longRoll) grd *= 1.08;
      if (s.id === 'airliner') grd *= 1.35;
      const velDir = this.velocity.lengthSq() > 0.01
        ? this._tmp.copy(this.velocity).normalize()
        : this._fwd;
      this._force.addScaledVector(velDir, -mass * G * grd * (1 + speed * 0.012));
    }

    // Area 51 thrust vector
    if (s.thrustVector && this.thrustVectorOn && s.hoverAssist) {
      const hover = s.hoverAssist * (1 - Math.min(1, speed / 55));
      const liftThrust = Math.max(0, thrustMag) * hover;
      this._force.addScaledVector(this._up, liftThrust);
      // Also bleed some into vertical when nose high
      if (this.euler.x < -0.3) {
        this._force.y += Math.max(0, thrustMag) * 0.25 * (-this.euler.x);
      }
      thrustMag *= 1 - hover * 0.55;
    }

    this._force.addScaledVector(this._fwd, thrustMag);

    const wloc = windAt(agl);
    const airX = this.velocity.x - (wloc.x || 0);
    const airY = this.velocity.y;
    const airZ = this.velocity.z - (wloc.z || 0);
    const airSpd = Math.hypot(airX, airY, airZ);

    // Aerodynamics vs air mass (IAS, not groundspeed)
    if (airSpd > 0.5) {
      const velDir = this._tmp.set(airX, airY, airZ).normalize();
      // AoA: angle between forward and velocity projected
      const fwdDot = THREE.MathUtils.clamp(this._fwd.dot(velDir), -1, 1);
      let aoa = Math.acos(fwdDot);
      // Sign: positive AoA when velocity below nose
      if (this._up.dot(velDir) > 0) aoa = -aoa;
      this.aoa = aoa;

      const stallAoA = this.flaps > 0.3
        ? (s.stallAoAFlaps || 12 * Math.PI / 180)
        : (s.stallAoA || 15 * Math.PI / 180);

      let Cl = s.liftCoef * (0.15 + 2.8 * Math.sin(Math.max(-0.4, Math.min(0.5, aoa + 0.04))));
      Cl += this.flaps * s.flapLift;

      // Stall break — light props mush, fighters depart, heavies are blunt
      const vs = this.getStallSpeed();
      const lightProp = s.type === 'prop' || s.id === 'gyro' || s.type === 'gyro' || s.id === 'cessna182' || s.id === 'duster';
      const fighter = s.type === 'fighter' || s.id === 'f15';
      const glider = s.type === 'glider';
      let stallFactor = 1;
      if (lightProp || glider) {
        if (speed < vs * 1.16) {
          const depth = THREE.MathUtils.clamp((vs * 1.16 - speed) / (vs * 0.30), 0, 1);
          stallFactor = Math.max(0.38, 1 - 0.55 * depth * depth);
          this.stalling = speed < vs * 1.02;
          if (this.stalling && !this.onGround) {
            this.euler.x += (glider ? 0.62 : 0.32) * dt;
            this.euler.z += Math.sin(performance.now() * 0.0025) * (glider ? 0.22 : 0.12) * dt;
          }
        } else if (Math.abs(aoa) > stallAoA) {
          const over = (Math.abs(aoa) - stallAoA) / (12 * Math.PI / 180);
          stallFactor = Math.max(speed > vs * 1.35 ? 0.72 : 0.42, 1 - over * 0.5);
          this.stalling = over > 0.5 && speed < vs * 1.5;
          if (!this.onGround && this.stalling) this.euler.x += 0.26 * dt;
        } else {
          this.stalling = false;
        }
      } else if (fighter) {
        const overSpd = speed < vs * 1.04 ? (vs * 1.04 - speed) / vs : 0;
        const overAoA = Math.max(0, (Math.abs(aoa) - stallAoA * 0.96) / (5 * Math.PI / 180));
        const over = Math.max(overSpd, overAoA);
        if (over > 0.02) {
          stallFactor = Math.max(0.05, 1 - over * 1.45);
          this.stalling = over > 0.12;
          this.euler.z += Math.sign(this.euler.z || this.aileron || 0.25) * over * 1.6 * dt;
          if (!this.onGround) this.euler.x += 1.05 * Math.min(1.2, over) * dt;
        } else {
          this.stalling = false;
        }
        // Hanging it out on approach just falls through. No Cessna float.
        if (!this.onGround && agl < 45 && speed < vs * 1.3) {
          this._force.y -= mass * 7.5 * (1 - speed / (vs * 1.3));
        }
      } else {
        if (speed < vs) {
          stallFactor = Math.max(s.id === 'airliner' ? 0.08 : 0.12, (speed / vs) ** 2);
          this.stalling = true;
          if (!this.onGround && s.id === 'airliner') this.euler.x += 0.45 * dt;
        } else if (Math.abs(aoa) > stallAoA) {
          const over = (Math.abs(aoa) - stallAoA) / (8 * Math.PI / 180);
          stallFactor = Math.max(0.2, 1 - over);
          this.stalling = over > 0.3;
          this.euler.z += Math.sign(this.euler.z || this.aileron || 0.01) * over * 0.4 * dt;
        } else {
          this.stalling = false;
        }
      }
      Cl *= stallFactor;

      // Spoilers kill lift. Specs that only nick it still dump the wing.
      if (this.spoilers && (s.hasSpoilers || s.spoilerLiftKill)) {
        const kill = Math.min(0.92, Math.max(0.78, s.spoilerLiftKill || 0));
        Cl *= (1 - kill);
      }

      // Ground effect — strong below ~20 ft; peak from type (C182 floats hard)
      const GE_CEIL = 6.1;
      let ge = 0;
      if (agl < GE_CEIL && agl > 0) {
        ge = 1 - agl / GE_CEIL;
        const peak = s.gePeak ?? (s.type === 'fighter' ? 0.06 : (s.diff === 'easy' ? 0.22 : 0.12));
        Cl *= 1 + peak * ge;
      }

      // Early-lift block: heavy jets cannot leap before ~0.98 Vr
      if (this.onGround && (s.earlyLiftBlock || s.id === 'airliner')) {
        const vr = s.vr || 70;
        const gate = s.id === 'airliner' ? 0.98 : 0.95;
        if (speed < vr * gate) {
          const t = speed / (vr * gate);
          Cl *= Math.max(s.id === 'airliner' ? 0.06 : 0.12, t * t);
        }
      }

      // Flare window: only a real nose-up on a light type bleeds sink. Firm jets and fighters do not float.
      if (!s.firmFlare && s.type !== 'fighter' && s.id !== 'f15' && s.id !== 'airliner'
        && this.approachPhase === 'flare_window' && this.euler.x < -0.04 && this.velocity.y < 0) {
        const easy = (s.diff === 'easy' || s.diff === 'med');
        const assist = (this.flareAssist !== false && easy) ? 1.25 : 0.85;
        this.velocity.y *= Math.pow(0.58, dt * assist);
      }

      const q = 0.5 * rho * speed * speed;
      const lift = q * s.wingArea * Cl;
      // Lift: prefer body-up; blend velocity-normal when valid
      const liftDir = this._right.clone().cross(velDir);
      if (liftDir.lengthSq() > 1e-6) {
        liftDir.normalize();
        if (liftDir.y < 0) liftDir.negate();
        const upLift = this._up.clone().multiplyScalar(0.65).addScaledVector(liftDir, 0.35);
        if (upLift.lengthSq() > 0.01) upLift.normalize();
        this._force.addScaledVector(upLift, lift);
      } else {
        this._force.addScaledVector(this._up, lift);
      }

      let Cd = s.drag + this.flaps * Math.max(s.flapDrag || 0, 0.045) + (this.gearDown && s.gearRetractable ? s.gearDrag : 0);
      if (this.spoilers && (s.hasSpoilers || s.spoilerDrag)) Cd += Math.max(s.spoilerDrag || 0, 0.22);
      if (s.id === 'gyro' || s.type === 'gyro') Cd += 0.09;
      let kInd = 0.04;
      if (ge > 0) kInd *= 0.90;
      if (s.type === 'glider') kInd = 0.028 + (Math.abs(aoa) > 0.12 ? 0.05 : 0);
      Cd += (Cl * Cl) * kInd;
      // Glider: exceptionally clean until you pull. A pull spends the dive.
      if (s.type === 'glider' && !this.spoilers) Cd = Math.min(Cd, s.drag + this.flaps * s.flapDrag * 0.5 + Cl * Cl * (Math.abs(aoa) > 0.1 ? 0.045 : 0.022));

      const vne = s.maxSpeed || 200;
      const machFrac = speed / Math.max(20, vne);
      if (machFrac > 0.7) {
        const rise = (machFrac - 0.7) / 0.3;
        const riseK = fighter ? 1.15 : (glider ? 0.85 : (s.id === 'airliner' ? 2.6 : (lightProp ? 7.2 : 3.1)));
        Cd *= 1 + riseK * rise * rise;
      }

      const drag = q * s.wingArea * Cd;
      this._force.addScaledVector(velDir, -drag);

      // Pulling out of a dive buys a curved flight path, not free altitude. Induced drag is the bill.
      const noseUpCmd = (this.elevator + this.trim) < -0.12;
      if (!this.onGround && noseUpCmd && this.velocity.y < -7 && speed > vs * 1.35) {
        const pull = Math.min(1, -(this.elevator + this.trim));
        this._force.addScaledVector(velDir, -q * s.wingArea * (0.08 + 0.7 * pull));
      }

      if (glider && !this.onGround) {
        const ld = s.bestLD || 42;
        const horiz = Math.hypot(airX, airZ);
        const minSink = Math.max(s.minSink || 0.55, horiz / ld);
        if (this.velocity.y > -minSink * 0.4 && speed < vne * 0.92) {
          this._force.y -= mass * (1.6 + Math.max(0, this.velocity.y + minSink * 0.4));
        }
      }
    } else {
      this.stalling = false;
    }

    // Extra water taxi drag when on water
    if (this.onWater && speed > 0.5) {
      const velDir = this._tmp.copy(this.velocity).normalize();
      this._force.addScaledVector(velDir, -speed * speed * 40);
    }

    // Gyro and blimp are wind toys: they do not penetrate, they weathercock.
    if (s.id === 'gyro' || s.type === 'gyro') {
      const w = windAt(agl);
      this._force.x += ((w.x || 0) - this.velocity.x) * mass * 0.16;
      this._force.z += ((w.z || 0) - this.velocity.z) * mass * 0.16;
      const cross = (w.x || 0) * Math.cos(this.euler.y) - (w.z || 0) * Math.sin(this.euler.y);
      this.euler.y += cross * 0.06 * dt;
    }
    if (s.id === 'blimp' || s.type === 'blimp') {
      const w = windAt(agl);
      this._force.y += mass * G * 0.98;
      this._force.x += ((w.x || 0) - this.velocity.x) * mass * 0.65;
      this._force.z += ((w.z || 0) - this.velocity.z) * mass * 0.65;
      const cross = (w.x || 0) * Math.cos(this.euler.y) - (w.z || 0) * Math.sin(this.euler.y);
      this.euler.y += cross * 0.04 * dt;
    }
  }

  _updateHeli(dt, speed, agl, rho, mass) {
    const s = this.spec;
    // Collective lift with density
    const dens = rho / RHO0;
    let lift = this.collective * s.maxCollectiveLift * dens;

    // ETL: translational lift above ~30-40 kt
    const etl = s.etlSpeed || 18;
    if (speed > etl * 0.5) {
      const etlBonus = Math.min(1, (speed - etl * 0.5) / etl) * 0.18;
      lift *= 1 + etlBonus;
    }

    // Vortex ring risk: high descent + low forward speed — still bites
    if (this.velocity.y < -4.5 && speed < 14 && agl > 2.5 && this.collective > 0.45) {
      const bite = s.vrsBite ? 0.38 : 0.55;
      lift *= bite;
      if (s.vrsBite && this.velocity.y < -6 && speed < 10) {
        this.velocity.y -= 2.2 * dt;
      }
    }

    this._force.addScaledVector(this._up, lift);

    const wH = windAt(agl);
    this._force.x += (wH.x || 0) * mass * 0.11;
    this._force.z += (wH.z || 0) * mass * 0.11;

    // Torque yaw bias when collective high (counter with rudder)
    this.euler.y += (this.collective - 0.45) * 0.35 * dt;

    if (speed > 0.3) {
      const velDir = this._tmp.copy(this.velocity).normalize();
      const dragArea = (s.rotorArea || 80) * 0.015 + s.wingArea * s.drag * 6;
      const drag = 0.5 * rho * speed * speed * dragArea;
      this._force.addScaledVector(velDir, -drag);
    }

    // Ground effect
    if (agl < 10) {
      this._force.y += (1 - agl / 10) * 2500 * this.collective * dens;
    }
    // Hover settle: damp drift near gate when collective matched
    if (s.hoverSettle && agl < (s.hoverGateAgl || 2.5) * 2.2 && speed < 8) {
      const settle = 1 - Math.min(1, agl / ((s.hoverGateAgl || 2.5) * 2.2));
      this.velocity.x *= Math.pow(0.92, dt * 8 * settle);
      this.velocity.z *= Math.pow(0.92, dt * 8 * settle);
      if (this.velocity.y < -0.8 && this.collective > 0.35 && this.collective < 0.7) {
        this.velocity.y *= Math.pow(0.75, dt * 6 * settle);
      }
    }
  }

  /** Go-around assist — blocked for glider / noToga */
  _updateGoAround(dt, agl) {
    const s = this.spec;
    if (s.noToga || s.type === 'glider' || !(s.maxThrust > 0)) {
      this.goAroundActive = false;
      return;
    }
    if (!this.goAroundActive || this.onGround) return;
    this._goAroundClimbTime = (this._goAroundClimbTime || 0) + dt;
    if (this.throttle >= 0.85 && this.velocity.y < 8) {
      this.velocity.y += 3.5 * dt;
    }
    if (this._goAroundClimbTime > 12 || agl > 250) {
      this.goAroundActive = false;
      this._goAroundClimbTime = 0;
    }
  }
}

function landClass(s) {
  if (!s) return 'light';
  if (s.type === 'blimp' || s.id === 'blimp') return 'balloon';
  if (s.isHeli) return 'heli';
  if (s.id === 'airliner' || s.id === 'cargo') return 'heavy';
  if (s.type === 'fighter' || s.id === 'f15' || s.id === 'privatejet') return 'hot';
  return 'light';
}

function surfaceAllows(cls, surf, spec) {
  if (!surf) return true;
  if (spec?.canWater && surf.id === 'water') return true;
  if (cls === 'balloon' || cls === 'heli') {
    return surf.id !== 'building' && surf.id !== 'forest';
  }
  if (cls === 'heavy') return surf.id === 'runway' || (surf.id === 'flat' && surf.long);
  if (cls === 'hot') return surf.id === 'runway' || surf.id === 'flat' || surf.id === 'road';
  if (surf.id === 'runway' || surf.id === 'road' || surf.id === 'flat' || surf.id === 'grass') return true;
  return false;
}

function obstacleHeight(hit, spec) {
  if (hit === 'building' || hit === 'hangar' || hit === 'tower' || hit === 'water-tower') return 28;
  if (hit === 'house') return 9;
  if (hit === 'tree') return 12 + (spec?.size || 1) * 2;
  return 6;
}
