import * as THREE from 'three';

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
  getAltitude() { return this.position.y; }
  getVerticalSpeed() { return this.velocity.y; }

  getEffectiveMass() {
    const s = this.spec;
    if (s.hasBallast) return s.mass * (1 + 0.25 * this.ballast);
    return s.mass;
  }

  getStallSpeed() {
    const s = this.spec;
    let vs = this.flaps > 0.4 ? (s.stallSpeedFlaps || s.stallSpeed * 0.85) : s.stallSpeed;
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

  update(dt, terrainHeight, isWater) {
    if (!this.alive) return;
    const s = this.spec;
    dt = Math.min(dt, 0.05);
    const mass = this.getEffectiveMass();

    // Attitude rates — damp on ground; nosewheel steers yaw on wheels
    const gndMul = this.onGround ? (this.getSpeed() < 5 ? 0.15 : 0.45) : 1;
    const rollCmd = this.aileron * s.rollRate * gndMul;
    let pitchInput = this.elevator + this.trim;
    if (this.flareAssist && !this.onGround && this.approachPhase === 'flare_window') {
      pitchInput += (s.diff === 'easy' ? 0.12 : 0.07);
    }
    const pitchCmd = pitchInput * s.pitchRate * (this.onGround ? 0.5 : 1);
    const spdNow = this.getSpeed();
    let yawMul = 1;
    if (this.onGround && !s.isHeli) {
      const nw = Math.min(1, Math.max(0, (spdNow - 2) / 18));
      yawMul = 1.0 + 1.6 * nw;
    }
    const yawCmd = this.rudder * s.yawRate * (this.onGround ? yawMul : 1);

    this.euler.z += rollCmd * dt;
    this.euler.x += pitchCmd * dt;
    this.euler.y += yawCmd * dt;
    // Nosewheel / tailwheel: rudder steers more with groundspeed
    if (this.onGround) {
      const gs = Math.hypot(this.velocity.x, this.velocity.z);
      const steer = this.rudder * (0.35 + Math.min(1.4, gs * 0.035));
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

    const speed = this.velocity.length();
    const agl = this.position.y - terrainHeight;
    this._updateApproachPhase(agl, dt);
    this._updateTakeoffGates();
    this._updateGoAround(dt, agl);

    // Nosewheel: align ground-track with heading when rolling
    if (this.onGround && !s.isHeli && speed > 2 && Math.abs(this.rudder) > 0.02) {
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

    // Flare sink bleed: nose-up in flare window damps descent
    if (!this.onGround && !s.isHeli && this.approachPhase === 'flare_window' && this.velocity.y < -0.2) {
      const noseUp = (-this.euler.x) > 0.04;
      const elevUp = (this.elevator + this.trim) < -0.05;
      if (noseUp || elevUp) {
        let bleed = s.diff === 'easy' ? 1.7 : (s.diff === 'med' ? 1.4 : 1.15);
        if (this.throttle <= (s.flareIdleThr ?? 0.2)) bleed *= 1.25;
        if (this.flareAssist) bleed *= 1.15;
        this.velocity.y *= Math.pow(1 / bleed, dt * 4);
      }
    }
    const wasGround = this.onGround;
    this.onWater = false;
    this._force.set(0, 0, 0);

    // Density altitude (simple)
    const alt = Math.max(0, this.position.y);
    const rho = RHO0 * Math.exp(-alt / 8500);

    if (s.isHeli) {
      this._updateHeli(dt, speed, agl, rho, mass);
    } else {
      this._updateFixedWing(dt, speed, agl, rho, mass);
    }

    this._force.y -= mass * G;

    this._tmp.copy(this._force).multiplyScalar(dt / mass);
    this.velocity.add(this._tmp);

    // Soft speed clamp near Vne
    const vmax = s.maxSpeed || 200;
    const spd2 = this.velocity.length();
    if (spd2 > vmax * 1.05) {
      this.velocity.multiplyScalar((vmax * 1.05) / spd2);
    }

    this.position.addScaledVector(this.velocity, dt);

    const contactY = terrainHeight + (s.isHeli ? 1.2 : 1.5) * (s.size || 1) * 0.5;
    if (this.position.y <= contactY) {
      this.position.y = contactY;
      const vert = Math.max(0, -this.velocity.y);
      const gs = Math.hypot(this.velocity.x, this.velocity.z);

      if (isWater && s.canWater) {
        return this._handleWaterContact(wasGround, vert, gs);
      } else if (isWater && !s.canWater) {
        this.alive = false;
        return { event: 'crash', reason: 'ditched', vert, gs };
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
      this.alive = false;
      return { event: 'crash', reason: 'gear down on water', vert, gs };
    }

    const vmax = s.waterLandVertMax || 2.5;
    if (vert > vmax || gs > s.landSpeedMax * 1.25) {
      this.alive = false;
      return { event: 'crash', reason: 'water impact', vert, gs };
    }

    // Water drag / step taxi
    this.velocity.y = 0;
    let wfric = 0.94;
    if (this.brakes || this.reverse) wfric = 0.88;
    this.velocity.x *= wfric;
    this.velocity.z *= wfric;

    if (!wasGround && this.airborneTime > 2) {
      const score = this._scoreLanding(vert, gs, true);
      this.lastTouchScore = score;
      if (score.fail) {
        this.alive = false;
        return { event: 'crash', reason: score.reason, vert, gs, score };
      }
      return { event: 'land', surface: 'water', vert, gs, score };
    }
    return null;
  }

  _handleGroundContact(wasGround, vert, gs, isWater) {
    const s = this.spec;
    this.onGround = true;

    // Amphib gear UP on land = crash
    if (s.canWater && s.hasGear && !this.gearDown && this.airborneTime > 1.5 && vert > 0.5) {
      this.alive = false;
      return { event: 'crash', reason: 'gear up on land', vert, gs };
    }

    const gearOk = !s.hasGear || s.gearFixed || this.gearDown;
    if (!gearOk && this.airborneTime > 1.5 && vert > 0.5) {
      this.alive = false;
      return { event: 'crash', reason: 'gear up', vert, gs };
    }

    if (this.airborneTime > 1.5) {
      const score = this._scoreLanding(vert, gs, false);
      this.lastTouchScore = score;

      // Hard physics fails
      if (vert > s.landVertMax || gs > s.landSpeedMax) {
        this.alive = false;
        return {
          event: 'crash',
          reason: vert > s.landVertMax ? 'hard landing' : 'too fast',
          vert, gs, score
        };
      }
      // Airliner hard-gate: unstable OR flaps not full OR gear up OR spoilers not armed → crash
      if (s.id === 'airliner' || s.landHardGate) {
        const flapsFull = this.flaps >= (s.flapLanding ?? 0.95) - 0.05;
        const gearOk = !s.gearRetractable || this.gearDown;
        const armed = !!(this.spoilersArmed || this.spoilers);
        const stableOk = this.stableApproach === true || this._passedStableGate;
        if (!flapsFull || !gearOk || !armed || !stableOk) {
          const reason = !gearOk ? 'gear up'
            : !flapsFull ? 'flaps not full'
            : !armed ? 'spoilers not armed'
            : 'unstable approach';
          this.alive = false;
          if (score) { score.fail = true; score.reason = reason; score.issues = [reason, ...(score.issues || [])]; }
          return { event: 'crash', reason, vert, gs, score };
        }
      }

      // Config fails for hard/med aircraft
      if (score.fail && (s.enforceGear || s.enforceFlapsLanding || s.diff === 'hard' || s.diff === 'expert')) {
        this.alive = false;
        return { event: 'crash', reason: score.reason, vert, gs, score };
      }
    }

    this.velocity.y = Math.max(0, this.velocity.y);

    // Ground friction / brakes / reverse / park / autobrake
    let fric = 0.988;
    if (this.parkBrake || this.park) {
      fric = 0.72;
      this.throttle = Math.min(this.throttle, 0.02);
    } else if (this.brakes) {
      fric = 0.86;
    }
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
        if (diff === 'expert') fail = true;
      }
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
      // heli: level skids already scored via bank; bonus for slow hover
      if (gs < 5 && vert < landVert * 0.6) { points += 10; breakdown.flare += 10; }
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
      const spd = this.getSpeed();
      const bankOk = Math.abs(this.euler.z) < 0.26;
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

  /** Takeoff rotate gates — Vr band + config */
  _updateTakeoffGates() {
    const s = this.spec;
    if (!this.onGround || this.airborneTime > 1) {
      this.rotateReady = false;
      return;
    }
    const spd = this.getSpeed();
    const vr = s.vr || 30;
    const inVrBand = spd >= vr * 0.92 && spd <= vr * 1.25;

    let cfg = true;
    if (s.hasMixture && !this.mixtureRich) cfg = false;
    if (s.hasProp && !this.propFull) cfg = false;
    if (s.hasCondition && !this.conditionRun) cfg = false;
    if (s.flapTakeoff != null && s.type !== 'glider') {
      // Allow 0 or takeoff setting (and short-field alt)
      const ft = s.flapTakeoff;
      const alt = s.flapTakeoffAlt;
      const ok = Math.abs(this.flaps - ft) < 0.2 ||
        (alt != null && Math.abs(this.flaps - alt) < 0.2) ||
        (ft === 0 && this.flaps <= 0.7);
      if (!ok && this.flaps > 0.85) cfg = false; // landing flaps on TO bad
    }
    if (s.hasSpoilers && this.spoilers) cfg = false;
    if (s.canWater) {
      const wantWater = this.waterMode;
      if (wantWater && this.gearDown) cfg = false;
      if (!wantWater && !this.gearDown) cfg = false;
    }
    if (s.thrustVector && s.diff === 'expert') {
      // TV recommended but not hard-required for rotate at speed
    }

    this.takeoffConfigOk = cfg;
    this.rotateReady = cfg && inVrBand && this.throttle >= 0.7;
  }

  _updateFixedWing(dt, speed, agl, rho, mass) {
    const s = this.spec;
    let thrustMag = s.idleThrust + (s.maxThrust - s.idleThrust) * this.throttle;

    // Prop/mixture efficiency
    if (s.hasProp && !this.propFull) thrustMag *= 0.75;
    if (s.hasMixture && !this.mixtureRich && this.position.y < 1500) thrustMag *= 0.7;
    if (s.hasCondition && !this.conditionRun) thrustMag *= 0.15;

    // Afterburner
    if (s.hasAfterburner && this.afterburner && this.throttle > 0.6) {
      const ab = s.abThrust || s.maxThrust * 1.8;
      thrustMag = s.idleThrust + (ab - s.idleThrust) * this.throttle;
    }

    // Reverse thrust on ground
    if (this.reverse && this.onGround) {
      const revFrac = s.reverseThrustFrac || 0.4;
      thrustMag = -Math.abs(thrustMag) * revFrac * Math.max(this.throttle, 0.3);
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

    // Aerodynamics
    if (speed > 0.5) {
      const velDir = this._tmp.copy(this.velocity).normalize();
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

      // Stall break
      const vs = this.getStallSpeed();
      let stallFactor = 1;
      if (speed < vs) {
        stallFactor = Math.max(0.12, (speed / vs) ** 2);
        this.stalling = true;
      } else if (Math.abs(aoa) > stallAoA) {
        const over = (Math.abs(aoa) - stallAoA) / (8 * Math.PI / 180);
        stallFactor = Math.max(0.2, 1 - over);
        this.stalling = over > 0.3;
        // Wing drop cue
        this.euler.z += Math.sign(this.euler.z || this.aileron || 0.01) * over * 0.4 * dt;
      } else {
        this.stalling = false;
      }
      Cl *= stallFactor;

      // Spoilers kill lift / add drag
      if (this.spoilers) {
        Cl *= (1 - (s.spoilerLiftKill || 0.4));
      }

      // Ground effect — strong below ~20 ft (6.1 m)
      const GE_CEIL = 6.1;
      let ge = 0;
      if (agl < GE_CEIL && agl > 0) {
        ge = 1 - agl / GE_CEIL;
        const isGA = s.type === 'prop' || s.diff === 'easy' || s.canWater;
        const isFighter = s.type === 'fighter' || s.type === 'experimental';
        const peak = isFighter ? 0.10 : (isGA ? 0.18 : 0.14);
        Cl *= 1 + peak * ge;
      }

      // Flare window: nose-up bleeds sink (stronger on easy types)
      if (this.approachPhase === 'flare_window' && this.euler.x > 0.04 && this.velocity.y < 0) {
        const easy = (s.diff === 'easy' || s.diff === 'med');
        const assist = (this.flareAssist !== false && easy) ? 1.55 : 1.12;
        this.velocity.y *= Math.pow(0.42, dt * assist);
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

      let Cd = s.drag + this.flaps * s.flapDrag + (this.gearDown && s.gearRetractable ? s.gearDrag : 0);
      if (this.spoilers) Cd += s.spoilerDrag || 0.1;
      let kInd = 0.04;
      if (ge > 0) kInd *= 0.90;
      Cd += (Cl * Cl) * kInd;
      // Glider: exceptionally clean
      if (s.type === 'glider' && !this.spoilers) Cd = Math.min(Cd, s.drag + this.flaps * s.flapDrag * 0.5 + Cl * Cl * 0.025);

      const drag = q * s.wingArea * Cd;
      this._force.addScaledVector(velDir, -drag);
    } else {
      this.stalling = false;
    }

    // Extra water taxi drag when on water
    if (this.onWater && speed > 0.5) {
      const velDir = this._tmp.copy(this.velocity).normalize();
      this._force.addScaledVector(velDir, -speed * speed * 40);
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

    // Vortex ring risk: high descent + low forward speed
    if (this.velocity.y < -5 && speed < 12 && agl > 3 && this.collective > 0.5) {
      lift *= 0.55; // VRS soft trap
    }

    this._force.addScaledVector(this._up, lift);

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
  }
}
