/**
 * Takeoff & landing checklist UI — tracks steps for selected aircraft.
 * Syncs with approach phases: final / short_final / flare_window / align / config.
 */

export class Checklist {
  constructor() {
    this.root = document.getElementById('checklist');
    this.titleEl = document.getElementById('checklist-title');
    this.listEl = document.getElementById('checklist-items');
    this.phaseEl = document.getElementById('checklist-phase');
    this.vbandEl = document.getElementById('checklist-vband');
    this.spec = null;
    this.phase = 'takeoff'; // takeoff | cruise | landing
    this.done = new Set();
    this._lastHash = '';
    this.airborneOnce = false;
  }

  setAircraft(spec) {
    this.spec = spec;
    this.phase = spec?.type === 'glider' ? 'cruise' : 'takeoff';
    this.done.clear();
    this._lastHash = '';
    if (this.root) this.root.classList.remove('hidden');
    this.render(null);
  }

  hide() {
    if (this.root) this.root.classList.add('hidden');
  }

  setPhase(phase) {
    if (phase !== this.phase) {
      this.phase = phase;
      this._lastHash = '';
    }
  }

  /**
   * Auto phase: takeoff until airborne; landing when descending / approach phases.
   */
  update(snap, worldHints = {}) {
    if (!this.spec) return { phase: this.phase, complete: false, items: [] };

    const airborne = snap.airborne;
    const agl = snap.agl ?? snap.alt;
    const vs = snap.vs ?? 0;
    const nearRwy = !!worldHints.onRunwayApproach || !!worldHints.nearRunway;
    const ap = snap.approachPhase;

    if (!airborne && this.airborneOnce) {
      this.setPhase('landing');
    } else if (!airborne && !this.airborneOnce) {
      this.setPhase('takeoff');
    } else if (airborne) {
      this.airborneOnce = true;
      if (
        ap === 'flare_window' || ap === 'short_final' || ap === 'final' ||
        (vs < -1.5 && agl < 400) ||
        (nearRwy && agl < 250 && vs < 2)
      ) {
        this.setPhase('landing');
      } else if (agl > 80 && vs > -1) {
        this.setPhase('cruise');
      }
    }

    const items = this.phase === 'landing'
      ? (this.spec.landingChecklist || [])
      : this.phase === 'takeoff'
        ? (this.spec.takeoffChecklist || [])
        : this._cruiseItems();

    const enriched = {
      ...snap,
      onRunwayApproach: worldHints.onRunwayApproach,
      headingAligned: worldHints.headingAligned,
      wantWater: snap.waterMode
    };

    const states = items.map((it) => {
      const key = this.phase + ':' + it.id;
      let ok = this.done.has(key);
      if (!ok) {
        try { ok = !!it.check(enriched); } catch { ok = false; }
        if (ok) this.done.add(key);
      }
      return { id: it.id, label: it.label, ok };
    });

    const complete = states.length > 0 && states.every((s) => s.ok);
    this.render(states, snap);
    return { phase: this.phase, complete, items: states, approachPhase: ap };
  }

  _cruiseItems() {
    const s = this.spec;
    return [
      {
        id: 'config',
        label: s.isHeli ? 'Collective / ETL cruise' : 'Clean config / monitor speed',
        check: (st) => s.isHeli ? st.speed > 15 : (st.flaps < 0.3 || st.alt > 200)
      },
      {
        id: 'energy',
        label: s.type === 'glider' ? 'Manage energy / L/D' : 'Stay above stall',
        check: (st) => st.speed > (s.stallSpeed || 20) * 1.1
      }
    ];
  }

  render(states, snap = null) {
    if (!this.listEl || !this.spec) return;
    let phaseLabel = this.phase === 'takeoff' ? 'TAKEOFF' : this.phase === 'landing' ? 'LANDING' : 'CRUISE';
    // Sub-phase for landing
    if (this.phase === 'landing' && snap?.approachPhase) {
      const map = {
        downwind: 'SETUP',
        final: 'FINAL',
        short_final: 'SHORT FINAL',
        flare_window: 'FLARE',
        touchdown: 'TOUCH',
        rollout: 'ROLLOUT'
      };
      phaseLabel = map[snap.approachPhase] || phaseLabel;
    }
    if (this.phase === 'takeoff' && snap?.rotateReady) {
      phaseLabel = 'ROTATE';
    }
    if (this.phaseEl) this.phaseEl.textContent = phaseLabel;
    if (this.titleEl) {
      this.titleEl.textContent = this.spec.name + (this.spec.fictional ? ' (FIC)' : '');
    }

    if (this.vbandEl) {
      const s = this.spec;
      if (this.phase === 'takeoff') {
        const cfg = snap?.takeoffConfigOk ? 'CFG OK' : 'CFG…';
        this.vbandEl.textContent = `Vr ${msKt(s.vr)} kt · V2 ${msKt(s.v2)} kt · ${cfg}`;
      } else if (this.phase === 'landing') {
        const sink = s.landVertMax;
        const st = snap?.stableApproach === false ? 'UNSTABLE' : snap?.stableApproach ? 'STABLE' : 'GATE…';
        this.vbandEl.textContent = `VRef ${msKt(s.vref)} kt · sink≤${sink} m/s · ${st}`;
      } else {
        this.vbandEl.textContent = `Cruise ~${msKt(s.cruiseSpeed)} kt · Vne ${msKt(s.maxSpeed)} kt`;
      }
    }

    const hash = this.phase + '|' + (snap?.approachPhase || '') + '|' +
      (states || []).map((x) => (x.ok ? '1' : '0') + x.id).join(',') +
      '|' + (snap?.rotateReady ? 'R' : '') + (snap?.stableApproach === false ? 'U' : '');
    if (hash === this._lastHash) return;
    this._lastHash = hash;

    this.listEl.innerHTML = '';
    for (const st of (states || [])) {
      const li = document.createElement('li');
      li.className = st.ok ? 'ok' : '';
      li.dataset.id = st.id;
      li.innerHTML = `<span class="mark">${st.ok ? '✓' : '○'}</span> ${escapeHtml(st.label)}`;
      this.listEl.appendChild(li);
    }

    if (this.root) {
      this.root.classList.toggle('phase-landing', this.phase === 'landing');
      this.root.classList.toggle('phase-takeoff', this.phase === 'takeoff');
      this.root.classList.toggle('phase-flare', snap?.approachPhase === 'flare_window');
      this.root.dataset.phase = this.phase;
      this.root.dataset.approach = snap?.approachPhase || '';
    }
  }

  resetFlight() {
    this.airborneOnce = false;
    this.done.clear();
    this.phase = 'takeoff';
    this._lastHash = '';
  }
}

function msKt(ms) {
  if (ms == null) return '—';
  return Math.round(ms * 1.94384);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
