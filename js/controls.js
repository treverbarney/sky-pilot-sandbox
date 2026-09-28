/** Phone tilt + on-screen + keyboard controls — paged PRIMARY/SYS per aircraft */

const CONTROL_META = {
  THR: { el: 'throttle-wrap', type: 'slider' },
  COLL: { el: 'heli-collective', type: 'slider' },
  FLAPS: { el: 'btn-flaps', type: 'btn' },
  GEAR: { el: 'btn-gear', type: 'btn' },
  SPOILERS: { el: 'btn-spoilers', type: 'btn' },
  ARM: { el: 'btn-arm', type: 'btn' },
  BRAKE: { el: 'btn-brake', type: 'btn' },
  MIX: { el: 'btn-mix', type: 'btn' },
  PROP: { el: 'btn-prop', type: 'btn' },
  COND: { el: 'btn-cond', type: 'btn' },
  AB: { el: 'btn-ab', type: 'btn' },
  TV: { el: 'btn-tv', type: 'btn' },
  REV: { el: 'btn-rev', type: 'btn' },
  BALLAST: { el: 'btn-ballast', type: 'btn' },
  WATER: { el: 'btn-water', type: 'btn' },
  TOGA: { el: 'btn-toga', type: 'btn' },
  HOLD: { el: 'btn-hold', type: 'btn' },
  GA: { el: 'btn-ga', type: 'btn' },
  AUTOBRAKE: { el: 'btn-autobrake', type: 'btn' },
  NAV: { el: 'btn-nav', type: 'btn' },
  SMOKE: { el: 'btn-smoke', type: 'btn' },
  TRIM: { el: 'trim-group', type: 'group' }
};

const ALWAYS_VISIBLE = new Set(['CAM', 'JUMP', 'HELP']);

export class Controls {
  constructor() {
    this.aileron = 0;
    this.elevator = 0;
    this.rudder = 0;
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
    this.thrustVectorOn = false;
    this.mixtureRich = true;
    this.propFull = true;
    this.conditionRun = true;
    this.ballast = 0;
    this.waterMode = false;
    this.trim = 0;
    this.smokeOn = false;
    this.parkBrake = false;
    this.park = false;
    this.autobrakeLevel = 0;
    this.autobrake = 0;
    this.flareAssist = true;
    this.navLights = true;
    this.goAroundActive = false;
    this.goAround = false;
    this.motionEnabled = false;
    this.motionMsg = 'Motion not enabled';
    this.cameraMode = 0;
    this.keys = {};
    this.spec = null;
    this._orient = { beta: 45, gamma: 0 };
    this._baseBeta = 45;
    this._smoothA = 0;
    this._smoothE = 0;
    this._stickA = 0;
    this._stickE = 0;
    this._stickActive = false;
    this._flapLabels = ['0', '1'];
    this._brakeLatched = false;
    this._page = 'PRIMARY';
    this._pages = [];
    this._pageControls = {};
    this._trimHold = null;
    this._trimHoldTimer = null;
    this._flapPressTimer = null;
    this._smokeHeld = false;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this._isGameKey(e.code)) e.preventDefault();
      this._handleKeyToggle(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!this._brakeLatched) this.brakes = false;
      }
      if (e.code === 'KeyM') {
        this.smokeOn = false;
        this._syncBtn('btn-smoke', false);
      }
    });
  }

  _isGameKey(code) {
    return /Arrow|KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|KeyG|KeyB|KeyV|KeyT|KeyX|KeyZ|KeyC|KeyH|KeyM|KeyO|KeyP|KeyL|Space|Shift|Digit|Bracket/.test(code);
  }

  _handleKeyToggle(code) {
    if (!this.spec) return;
    const has = (c) => (this.spec.controls || []).includes(c);
    if (code === 'KeyG' && has('GEAR') && !this.spec.gearFixed) {
      this.gearDown = !this.gearDown;
      this._syncBtn('btn-gear', this.gearDown);
      this._updateGearLabel();
    }
    if (code === 'BracketLeft' || code === 'KeyZ') {
      if (has('FLAPS')) this._flapsStep(-1);
    }
    if (code === 'BracketRight' || code === 'KeyC') {
      if (has('FLAPS')) this._flapsStep(1);
    }
    if (code === 'KeyB') {
      this.brakes = !this.brakes;
      this._brakeLatched = this.brakes;
      this._syncBtn('btn-brake', this.brakes);
    }
    if (code === 'KeyX' && has('SPOILERS')) {
      this.spoilers = !this.spoilers;
      this._syncBtn('btn-spoilers', this.spoilers);
    }
    if (code === 'KeyO' && (has('ARM') || has('SPOILERS'))) {
      this.spoilersArmed = !this.spoilersArmed;
      this._syncArmBtn();
    }
    if (code === 'KeyP') {
      this.parkBrake = !this.parkBrake;
      if (this.parkBrake) {
        this.brakes = true;
        this._brakeLatched = true;
        this._syncBtn('btn-brake', true);
      }
    }
    if (code === 'KeyL') {
      this.flareAssist = !this.flareAssist;
    }
    if ((code === 'Digit2' || code === 'Numpad2') && (has('ARM') || this.spec?.autobrakeCapable)) {
      this._cycleAutobrake();
    }
    if (code === 'KeyV' && has('AB')) {
      this.afterburner = !this.afterburner;
      this._syncBtn('btn-ab', this.afterburner);
    }
    if (code === 'KeyT' && has('TV')) {
      this.thrustVectorOn = !this.thrustVectorOn;
      this._syncBtn('btn-tv', this.thrustVectorOn);
    }
    if (code === 'KeyH' && has('REV')) {
      this.reverse = !this.reverse;
      this._syncBtn('btn-rev', this.reverse);
    }
    if (code === 'KeyM' && has('SMOKE')) {
      this.smokeOn = true;
      this._syncBtn('btn-smoke', true);
    }
    if ((code === 'Digit1' || code === 'Numpad1') && has('TOGA')) {
      this._fireToga();
    }
  }

  async requestMotion() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') {
          this.motionMsg = 'Motion permission denied';
          return false;
        }
      }
      if (!window.DeviceOrientationEvent) {
        this.motionMsg = 'Motion unavailable on this device';
        return false;
      }
      window.addEventListener('deviceorientation', this._onOrient);
      this.motionEnabled = true;
      this.motionMsg = 'Motion enabled — hold phone ~45° upright';
      this.recenter();
      return true;
    } catch (err) {
      this.motionMsg = 'Motion error: ' + (err.message || err);
      return false;
    }
  }

  recenter() {
    this._baseBeta = this._orient.beta ?? 45;
    this._smoothA = 0;
    this._smoothE = 0;
    this.motionMsg = 'Recentered';
  }

  _onOrient = (e) => {
    if (e.beta != null) this._orient.beta = e.beta;
    if (e.gamma != null) this._orient.gamma = e.gamma;
  };

  /** On-screen stick — works when tilt is off, and as a fine trim with tilt. */
  bindStick(canvas) {
    if (!canvas || this._stickBound) return;
    this._stickBound = true;
    const start = (ev) => {
      if (ev.target.closest && ev.target.closest('#controls, button, input, .overlay, #hud-config, #checklist')) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      this._stickActive = true;
      this._stickOrigin = { x: ev.clientX, y: ev.clientY };
      const g = document.getElementById('stick-ghost');
      if (g) {
        g.classList.remove('hidden');
        g.style.left = ev.clientX + 'px';
        g.style.top = ev.clientY + 'px';
      }
      canvas.setPointerCapture?.(ev.pointerId);
    };
    const move = (ev) => {
      if (!this._stickActive || !this._stickOrigin) return;
      const dx = (ev.clientX - this._stickOrigin.x) / 96;
      const dy = (ev.clientY - this._stickOrigin.y) / 96;
      this._stickA = clamp(dx, -1, 1);
      this._stickE = clamp(dy, -1, 1);
    };
    const end = () => {
      this._stickActive = false;
      this._stickA = 0;
      this._stickE = 0;
      document.getElementById('stick-ghost')?.classList.add('hidden');
    };
    canvas.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  bindUI(els) {
    this.els = els;
    const thr = els.throttle;
    const rud = els.rudder;
    const col = els.collective;
    thr.addEventListener('input', () => { this.throttle = thr.value / 100; });
    rud.addEventListener('input', () => { this.rudder = rud.value / 100; });
    if (col) col.addEventListener('input', () => { this.collective = col.value / 100; });

    // Flaps: tap up, long-press down
    if (els.flaps) {
      this._bindStepHold(els.flaps, () => this._flapsStep(1), () => this._flapsStep(-1));
      els.flaps.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._flapsStep(-1);
      });
    }

    this._bindToggle(els.gear, () => {
      if (this.spec?.gearFixed) return;
      this.gearDown = !this.gearDown;
      this._syncBtn('btn-gear', this.gearDown);
      this._updateGearLabel();
    });
    if (els.brake) {
      this._bindStepHold(els.brake, () => {
        if (this.parkBrake) {
          this.parkBrake = false;
          this.brakes = false;
          this._brakeLatched = false;
        } else {
          this.brakes = !this.brakes;
          this._brakeLatched = this.brakes;
        }
        this._syncBtn('btn-brake', this.brakes || this.parkBrake);
      }, () => {
        this.parkBrake = !this.parkBrake;
        if (this.parkBrake) {
          this.brakes = true;
          this._brakeLatched = true;
        }
        this._syncBtn('btn-brake', this.brakes || this.parkBrake);
      });
    }
    this._bindToggle(els.spoilers, () => {
      this.spoilers = !this.spoilers;
      this._syncBtn('btn-spoilers', this.spoilers);
    });
    if (els.arm) {
      this._bindStepHold(els.arm, () => {
        this.spoilersArmed = !this.spoilersArmed;
        this._syncArmBtn();
      }, () => {
        this._cycleAutobrake();
      });
    }
    this._bindToggle(els.mix, () => {
      this.mixtureRich = !this.mixtureRich;
      this._syncBtn('btn-mix', this.mixtureRich);
      if (els.mix) els.mix.textContent = this.mixtureRich ? 'MIX RICH' : 'MIX LEAN';
    });
    this._bindToggle(els.prop, () => {
      this.propFull = !this.propFull;
      this._syncBtn('btn-prop', this.propFull);
      if (els.prop) els.prop.textContent = this.propFull ? 'PROP FULL' : 'PROP LO';
    });
    this._bindToggle(els.cond, () => {
      this.conditionRun = !this.conditionRun;
      this._syncBtn('btn-cond', this.conditionRun);
      if (els.cond) els.cond.textContent = this.conditionRun ? 'COND RUN' : 'COND CUT';
    });
    this._bindToggle(els.ab, () => {
      // Afterburner only above 60% thr — no auto-bump
      if (!this.afterburner && this.throttle < (this.spec?.abThrMin ?? 0.6)) {
        return;
      }
      this.afterburner = !this.afterburner;
      this._syncBtn('btn-ab', this.afterburner);
    });
    this._bindToggle(els.tv, () => {
      this.thrustVectorOn = !this.thrustVectorOn;
      this._syncBtn('btn-tv', this.thrustVectorOn);
    });
    this._bindToggle(els.rev, () => {
      this.reverse = !this.reverse;
      this._syncBtn('btn-rev', this.reverse);
    });
    this._bindToggle(els.ballast, () => {
      this.ballast = this.ballast > 0.5 ? 0 : 1;
      this._syncBtn('btn-ballast', this.ballast > 0.5);
    });
    this._bindToggle(els.water, () => {
      this.waterMode = !this.waterMode;
      this._syncBtn('btn-water', this.waterMode);
      if (els.water) els.water.textContent = this.waterMode ? 'WATER' : 'LAND';
      this._updateGearLabel();
    });
    this._bindToggle(els.toga, () => this._fireToga());
    this._bindToggle(els.hold, () => {
      this.park = !this.park;
      this.parkBrake = this.park;
      if (this.park) {
        this.throttle = 0;
        this.brakes = true;
        this._brakeLatched = true;
        if (this.els?.throttle) this.els.throttle.value = 0;
      }
      this._syncBtn('btn-hold', this.park);
      this._syncBtn('btn-brake', this.brakes || this.park);
    });
    this._bindToggle(els.ga, () => this._fireGoAround());
    this._bindToggle(els.autobrake, () => this._cycleAutobrake());
    this._bindToggle(els.nav, () => {
      this.navLights = !this.navLights;
      this._syncBtn('btn-nav', this.navLights);
    });

    // Smoke: hold
    if (els.smoke) {
      const start = (e) => {
        e.preventDefault();
        this.smokeOn = true;
        this._smokeHeld = true;
        this._syncBtn('btn-smoke', true);
      };
      const end = () => {
        this.smokeOn = false;
        this._smokeHeld = false;
        this._syncBtn('btn-smoke', false);
      };
      els.smoke.addEventListener('pointerdown', start);
      els.smoke.addEventListener('pointerup', end);
      els.smoke.addEventListener('pointerleave', end);
      els.smoke.addEventListener('pointercancel', end);
    }

    // Trim jog + hold-slew
    if (els.trimUp) this._bindTrimHold(els.trimUp, +1);
    if (els.trimDn) this._bindTrimHold(els.trimDn, -1);
    if (els.camera) els.camera.addEventListener('click', () => { this.cameraMode = (this.cameraMode + 1) % 3; });

    // Page tabs
    document.querySelectorAll('.ctrl-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.setPage(tab.dataset.page));
    });
  }

  _bindTrimHold(el, dir) {
    const step = () => {
      this.trim = Math.max(-0.25, Math.min(0.25, this.trim + dir * 0.02));
    };
    const start = (e) => {
      e.preventDefault();
      step();
      this._clearTrimHold();
      this._trimHoldTimer = setInterval(step, 100);
    };
    const end = () => this._clearTrimHold();
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', (e) => e.preventDefault());
  }

  _clearTrimHold() {
    if (this._trimHoldTimer) {
      clearInterval(this._trimHoldTimer);
      this._trimHoldTimer = null;
    }
  }

  _bindStepHold(el, onTap, onLong) {
    let timer = null;
    let longFired = false;
    el.addEventListener('pointerdown', (e) => {
      longFired = false;
      timer = setTimeout(() => {
        longFired = true;
        onLong();
      }, 380);
    });
    const clear = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };
    el.addEventListener('pointerup', (e) => {
      clear();
      if (!longFired) onTap();
    });
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    // prevent duplicate click
    el.addEventListener('click', (e) => e.preventDefault());
  }

  _fireToga() {
    // Glider / noToga types have no go-around thrust path
    if (this.spec?.noToga || this.spec?.type === 'glider' || !(this.spec?.maxThrust > 0)) {
      return;
    }
    this.throttle = 1;
    this.reverse = false;
    this.parkBrake = false;
    this.brakes = false;
    this._brakeLatched = false;
    this.spoilers = false;
    this.spoilersArmed = false;
    this._syncBtn('btn-rev', false);
    this._syncBtn('btn-brake', false);
    this._syncBtn('btn-spoilers', false);
    this._syncArmBtn();
    if (this.els?.throttle) this.els.throttle.value = 100;
    const s = this.spec;
    const airborne = this._onGroundHint === false;
    if (airborne) {
      this.goAroundActive = true;
      // Retract one flap step toward takeoff setting
      if (s && this.flaps > 0.05) {
        const steps = s.flapSteps || [0, 1];
        const target = s.flapTakeoff != null ? s.flapTakeoff : Math.max(0, this.flaps - 0.25);
        let best = 0;
        let bestDist = 99;
        steps.forEach((v, i) => {
          const d = Math.abs(v - target);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        this.flapIndex = best;
        this.flaps = steps[best];
        this._updateFlapsLabel();
      }
    } else {
      this.goAroundActive = false;
      if (s && s.flapTakeoff != null && this.flaps > (s.flapTakeoff + 0.15)) {
        const steps = s.flapSteps || [0, 1];
        let best = 0;
        let bestDist = 99;
        steps.forEach((v, i) => {
          const d = Math.abs(v - s.flapTakeoff);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        this.flapIndex = best;
        this.flaps = steps[best];
        this._updateFlapsLabel();
      }
    }
    const toga = document.getElementById('btn-toga');
    if (toga) {
      toga.classList.add('on');
      setTimeout(() => toga.classList.remove('on'), 400);
    }
  }

  _cycleAutobrake() {
    this.autobrakeLevel = (this.autobrakeLevel + 1) % 3;
    this.autobrake = this.autobrakeLevel;
    const el = document.getElementById('btn-autobrake');
    if (el) {
      el.classList.toggle('on', this.autobrakeLevel > 0);
      el.textContent = this.autobrakeLevel === 0 ? 'A/B OFF' : this.autobrakeLevel === 1 ? 'A/B LO' : 'A/B MED';
    }
  }

  _fireGoAround() {
    this._fireToga();
    this.spoilers = false;
    this.park = false;
    this.parkBrake = false;
    this.goAroundActive = true;
    this._syncBtn('btn-spoilers', false);
    this._syncBtn('btn-hold', false);
    const ga = document.getElementById('btn-ga');
    if (ga) {
      ga.classList.add('on');
      setTimeout(() => ga.classList.remove('on'), 400);
    }
  }

  _bindToggle(el, fn) {
    if (!el) return;
    el.addEventListener('click', fn);
  }

  _syncBtn(id, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('on', !!on);
  }

  _syncArmBtn() {
    const el = document.getElementById('btn-arm');
    if (!el) return;
    el.classList.toggle('on', !!this.spoilersArmed);
    el.classList.toggle('armed', !!this.spoilersArmed);
    el.textContent = this.spoilersArmed ? 'ARMED' : 'ARM SPD';
  }

  _updateGearLabel() {
    const el = document.getElementById('btn-gear');
    if (!el || !this.spec) return;
    if (this.spec.canWater || this.spec.hasWaterMode) {
      if (this.waterMode) {
        el.textContent = this.gearDown ? 'GEAR DN!' : 'GEAR UP';
      } else {
        el.textContent = this.gearDown ? 'GEAR DN' : 'GEAR UP';
      }
    } else {
      el.textContent = this.gearDown ? 'GEAR DN' : 'GEAR UP';
    }
  }

  _flapsStep(dir) {
    const steps = this.spec?.flapSteps || [0, 1];
    this.flapIndex = Math.max(0, Math.min(steps.length - 1, this.flapIndex + dir));
    this.flaps = steps[this.flapIndex];
    this._updateFlapsLabel();
  }

  _updateFlapsLabel() {
    const el = document.getElementById('btn-flaps');
    if (!el) return;
    const labels = this.spec?.flapLabels || this._flapLabels;
    const lab = labels[this.flapIndex] ?? `${Math.round(this.flaps * 100)}%`;
    el.textContent = `FLAPS ${lab}`;
    el.classList.toggle('on', this.flaps > 0.05);
  }

  setPage(pageId) {
    if (!pageId) return;
    this._page = pageId;
    document.querySelectorAll('.ctrl-tab').forEach((t) => {
      t.classList.toggle('on', t.dataset.page === pageId);
    });
    this._applyPageVisibility();
  }

  _applyPageVisibility() {
    const set = new Set(this.spec?.controls || []);
    const layout = this.spec?.controlLayout;
    const pageIds = layout?.pages?.map((p) => p.id) || ['PRIMARY'];
    const active = this._pageControls[this._page] || [];

    // All controllable buttons
    const allBtnIds = Object.values(CONTROL_META).map((m) => m.el);
    for (const id of allBtnIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (id === 'throttle-wrap') {
        el.classList.toggle('hidden', this.spec?.type === 'glider' || (this.spec?.isHeli && !set.has('THR')));
        continue;
      }
      if (id === 'heli-collective') {
        el.classList.toggle('hidden', !(set.has('COLL') || this.spec?.isHeli));
        continue;
      }
      // Determine control key from CONTROL_META
      const ctrlKey = Object.keys(CONTROL_META).find((k) => CONTROL_META[k].el === id);
      if (!ctrlKey) continue;

      const inSpec = set.has(ctrlKey) || (ctrlKey === 'BRAKE' && (set.has('BRAKE') || true));
      // Gear fixed → hide
      if (ctrlKey === 'GEAR' && this.spec?.gearFixed) {
        el.classList.toggle('hidden', true);
        continue;
      }
      if (ctrlKey === 'BRAKE' && !set.has('BRAKE') && !(this.spec?.controls || []).includes('BRAKE')) {
        // still show brake if in layout
      }

      if (!layout || pageIds.length <= 1) {
        // Flat mode: show if in controls set
        const show = set.has(ctrlKey) || (ctrlKey === 'BRAKE' && set.has('BRAKE'));
        // TRIM group
        if (ctrlKey === 'TRIM') {
          el.classList.toggle('hidden', !set.has('TRIM'));
          continue;
        }
        el.classList.toggle('hidden', !set.has(ctrlKey));
        continue;
      }

      // Paged: only show controls on active page (and in spec)
      const onPage = active.includes(ctrlKey);
      const show = onPage && (set.has(ctrlKey) || ctrlKey === 'ARM' || ctrlKey === 'TOGA' || ctrlKey === 'SMOKE' ||
        (ctrlKey === 'BRAKE'));
      // ARM/TOGA/SMOKE may be in layout even if also listed in controls
      const really = onPage && (
        set.has(ctrlKey) ||
        active.includes(ctrlKey)
      );
      if (ctrlKey === 'GEAR' && this.spec?.gearFixed) {
        el.classList.toggle('hidden', true);
      } else {
        el.classList.toggle('hidden', !really);
      }
    }

    // Always-visible chrome
    ['btn-camera', 'btn-eject', 'btn-help-flight'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
    const hold = document.getElementById('btn-hold');
    if (hold) hold.classList.remove('hidden');
    const nav = document.getElementById('btn-nav');
    if (nav) nav.classList.remove('hidden');
    const ga = document.getElementById('btn-ga');
    if (ga) ga.classList.toggle('hidden', !(set.has('TOGA') || this.spec?.diff === 'hard' || this.spec?.diff === 'expert'));
    const abk = document.getElementById('btn-autobrake');
    if (abk) {
      const jet = this.spec?.type === 'jet' || this.spec?.type === 'airliner' || this.spec?.id === 'airliner' || this.spec?.id === 'privatejet';
      abk.classList.toggle('hidden', !jet);
    }
  }

  /** Show/hide controls for selected aircraft */
  configureForAircraft(spec) {
    this.spec = spec;
    const set = new Set(spec.controls || ['THR', 'FLAPS', 'GEAR', 'BRAKE', 'TRIM']);

    // Build page map
    const layout = spec.controlLayout;
    this._pages = layout?.pages || [{ id: 'PRIMARY', controls: [...set].filter((c) => c !== 'THR' && c !== 'COLL') }];
    this._pageControls = {};
    for (const p of this._pages) {
      this._pageControls[p.id] = p.controls.slice(0, 6);
    }
    this._page = this._pages[0]?.id || 'PRIMARY';

    // Tabs visibility
    const tabs = document.getElementById('ctrl-tabs');
    const multi = this._pages.length > 1;
    if (tabs) {
      tabs.classList.toggle('hidden', !multi);
      tabs.querySelectorAll('.ctrl-tab').forEach((t) => {
        const id = t.dataset.page;
        const exists = this._pages.some((p) => p.id === id);
        t.classList.toggle('hidden', !exists);
        t.classList.toggle('on', id === this._page);
      });
    }

    // Defaults
    this.flapIndex = 0;
    this.flaps = 0;
    this.gearDown = true;
    this.brakes = false;
    this.spoilers = false;
    this.spoilersArmed = false;
    this.reverse = false;
    this.afterburner = false;
    this.thrustVectorOn = !!spec.thrustVector;
    this.mixtureRich = true;
    this.propFull = true;
    this.conditionRun = true;
    this.ballast = 0;
    this.waterMode = false;
    this.throttle = 0;
    this.smokeOn = false;
    this.parkBrake = false;
    this.autobrakeLevel = 0;
    this.flareAssist = !!spec.flareAssistDefault;
    this.goAroundActive = false;
    this.collective = spec.isHeli ? 0.45 : 0.4;
    this.trim = 0;

    this._syncBtn('btn-gear', true);
    this._syncBtn('btn-brake', false);
    this._syncBtn('btn-spoilers', false);
    this._syncArmBtn();
    this._syncBtn('btn-mix', true);
    this._syncBtn('btn-prop', true);
    this._syncBtn('btn-cond', true);
    this._syncBtn('btn-ab', false);
    this._syncBtn('btn-tv', this.thrustVectorOn);
    this._syncBtn('btn-rev', false);
    this._syncBtn('btn-ballast', false);
    this._syncBtn('btn-water', false);
    this._syncBtn('btn-smoke', false);
    const mix = document.getElementById('btn-mix');
    if (mix) mix.textContent = 'MIX RICH';
    const prop = document.getElementById('btn-prop');
    if (prop) prop.textContent = 'PROP FULL';
    const cond = document.getElementById('btn-cond');
    if (cond) cond.textContent = 'COND RUN';
    const water = document.getElementById('btn-water');
    if (water) water.textContent = 'LAND';
    this._updateFlapsLabel();
    this._updateGearLabel();

    if (spec.gearFixed) this.gearDown = true;

    this._applyPageVisibility();
  }

  /** Pulse a control related to checklist item */
  highlightControl(ctrlKey) {
    const meta = CONTROL_META[ctrlKey];
    if (!meta) return;
    // Switch to page containing it
    for (const [pid, list] of Object.entries(this._pageControls)) {
      if (list.includes(ctrlKey)) {
        this.setPage(pid);
        break;
      }
    }
    const el = document.getElementById(meta.el);
    if (!el) return;
    el.classList.add('pulse-hint');
    setTimeout(() => el.classList.remove('pulse-hint'), 1200);
  }

  update() {
    let a = 0, e = 0, r = this.rudder;

    if (this.motionEnabled) {
      a = clamp(this._orient.gamma / 32, -1, 1);
      e = clamp((this._orient.beta - this._baseBeta) / 28, -1, 1);
    }
    if (this._stickActive) {
      a += this._stickA;
      e += this._stickE;
    }

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) a -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) a += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) e -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) e += 1;
    if (this.keys['KeyQ']) r -= 1;
    if (this.keys['KeyE']) r += 1;
    if (this.keys['KeyR']) this.throttle = Math.min(1, this.throttle + 0.01);
    if (this.keys['KeyF']) this.throttle = Math.max(0, this.throttle - 0.01);
    if (this.throttle > 0.08 && this.park) {
      this.park = false;
      this._syncBtn('btn-hold', false);
    }
    if (this.spec?.isHeli) {
      if (this.keys['KeyR']) this.collective = Math.min(1, this.collective + 0.008);
      if (this.keys['KeyF']) this.collective = Math.max(0, this.collective - 0.008);
    }
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.brakes = true;

    // Auto-off reverse when airborne
    if (this.reverse && this.spec && !this._onGroundHint) {
      // cleared by applyToModel via fm
    }

    a = clamp(a, -1, 1);
    e = clamp(e, -1, 1);
    r = clamp(r, -1, 1);

    const expoAmt = this.spec?.inputExpo ?? 1.45;
    const gain = this.spec?.tiltGain ?? 1;
    const dead = this.spec?.diff === 'easy' ? 0.05 : 0.06;
    const radial = Math.hypot(a, e);
    if (radial < dead) {
      a = 0;
      e = 0;
    } else {
      const t = (radial - dead) / (1 - dead);
      const shaped = Math.pow(t, expoAmt) * gain;
      a = (a / radial) * Math.min(1, shaped);
      e = (e / radial) * Math.min(1, shaped);
    }

    const smooth = this.spec?.id === 'airliner' || this.spec?.id === 'cargo'
      ? 0.11
      : (this.spec?.snappy ? 0.28 : 0.2);
    this._smoothA += (a - this._smoothA) * smooth;
    this._smoothE += (e - this._smoothE) * smooth;
    this.aileron = this._smoothA;
    this.elevator = this._smoothE;
    this.rudder = r;

    if (this.els && this.els.throttle && document.activeElement !== this.els.throttle) {
      this.els.throttle.value = Math.round(this.throttle * 100);
    }
    if (this.els && this.els.collective && document.activeElement !== this.els.collective) {
      this.els.collective.value = Math.round(this.collective * 100);
    }

    // Dim AB when thr low
    const ab = document.getElementById('btn-ab');
    if (ab && !ab.classList.contains('hidden')) {
      ab.classList.toggle('gated', this.throttle < 0.6 && !this.afterburner);
    }
    // Grey REV when airborne
    const rev = document.getElementById('btn-rev');
    if (rev && !rev.classList.contains('hidden')) {
      rev.classList.toggle('gated', !this._onGroundHint);
    }
  }

  applyToModel(fm) {
    fm.setAttitudeInputs(this.aileron, this.elevator, this.rudder);
    fm.throttle = this.throttle;
    fm.flaps = this.flaps;
    fm.flapIndex = this.flapIndex;
    fm.gearDown = this.gearDown;
    fm.brakes = this.brakes;
    fm.spoilers = this.spoilers;
    fm.spoilersArmed = this.spoilersArmed;
    // Auto-off reverse airborne
    if (this.reverse && !fm.onGround) {
      this.reverse = false;
      this._syncBtn('btn-rev', false);
    }
    fm.reverse = this.reverse;
    const abMin = this.spec?.abThrMin ?? 0.6;
    if (this.afterburner && this.throttle <= abMin) {
      this.afterburner = false;
      this._syncBtn('btn-ab', false);
    }
    fm.afterburner = this.afterburner;
    fm.thrustVectorOn = this.thrustVectorOn;
    fm.mixtureRich = this.mixtureRich;
    fm.propFull = this.propFull;
    fm.conditionRun = this.conditionRun;
    fm.ballast = this.ballast;
    fm.waterMode = this.waterMode;
    fm.trim = this.trim;
    fm.collective = this.collective;
    fm.smokeOn = this.smokeOn;
    fm.parkBrake = this.parkBrake || this.park;
    fm.park = this.park || this.parkBrake;
    fm.autobrakeLevel = this.autobrakeLevel || this.autobrake || 0;
    fm.autobrake = fm.autobrakeLevel;
    fm.flareAssist = this.flareAssist !== false;
    fm.goAroundActive = this.goAroundActive;
    fm.navLights = this.navLights !== false;
    this._onGroundHint = !!fm.onGround;
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export { CONTROL_META };
