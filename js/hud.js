import { WORLD } from './world.js';
import { getAircraftInfo } from './aircraft-info.js';

const MS_TO_KT = 1.94384;
const M_TO_FT = 3.28084;

export class HUD {
  constructor() {
    this.alt = document.getElementById('alt');
    this.spd = document.getElementById('spd');
    this.vs = document.getElementById('vs');
    this.ac = document.getElementById('ac-label');
    this.mode = document.getElementById('mode-label');
    this.gaugeAlt = document.getElementById('gauge-alt');
    this.gaugeSpd = document.getElementById('gauge-spd');
    this.gaugeVs = document.getElementById('gauge-vs');
    this.mm = document.getElementById('minimap');
    this.ctx = this.mm.getContext('2d');
    this.toastEl = document.getElementById('toast');
    this.configEl = document.getElementById('hud-config');
    this.checklist = document.getElementById('checklist');
    this.checklistList = document.getElementById('checklist-list');
    this._toastT = 0;
    this._aircraftId = null;
  }

  setAircraft(name, id = null) {
    this.ac.textContent = name;
    this._aircraftId = id;
    this._renderConfigChips(null);
  }

  setMode(m) {
    this.mode.textContent = m;
  }

  toast(msg, sec = 2.5) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    this._toastT = sec;
  }

  /** Update config chips from flight / controls state */
  setConfig(cfg = {}) {
    this._renderConfigChips(cfg);
  }

  /**
   * Show a styled checklist. Physics agent may also write into #checklist;
   * this helper keeps presentation consistent.
   */
  showChecklist(title, steps = [], doneIndex = -1) {
    if (!this.checklist || !this.checklistList) return;
    const h = this.checklist.querySelector('h4');
    if (h) h.textContent = title || 'Checklist';
    this.checklistList.innerHTML = steps
      .map((s, i) => `<li class="${i <= doneIndex ? 'done' : ''}">${s}</li>`)
      .join('');
    this.checklist.classList.remove('hidden');
  }

  hideChecklist() {
    this.checklist?.classList.add('hidden');
  }

  _renderConfigChips(cfg) {
    if (!this.configEl) return;
    if (!cfg) {
      this.configEl.innerHTML = '';
      return;
    }
    const chips = [];
    if (cfg.flaps != null) {
      chips.push({ label: cfg.flaps > 0 ? `FLAPS ${Math.round(cfg.flaps * 100)}%` : 'FLAPS UP', on: cfg.flaps > 0 });
    }
    if (cfg.gear != null) {
      chips.push({ label: cfg.gear ? 'GEAR ↓' : 'GEAR ↑', on: !!cfg.gear, warn: cfg.gear === false && cfg.nearGround });
    }
    if (cfg.spoilersArmed && !cfg.spoilers) chips.push({ label: 'ARMED', on: true, warn: true });
    if (cfg.spoilers) chips.push({ label: 'SPD BRK', on: true });
    if (cfg.ab) chips.push({ label: 'AB', on: true, warn: true });
    if (cfg.tv) chips.push({ label: 'TV', on: true });
    if (cfg.brakes) chips.push({ label: 'BRAKE', on: true });
    if (cfg.water) chips.push({ label: 'WATER', on: true });
    if (cfg.stable === true) chips.push({ label: 'STABLE', on: true });
    if (cfg.stable === false) chips.push({ label: 'UNSTABLE', on: true, warn: true });
    if (cfg.flare) chips.push({ label: 'FLARE', on: true, warn: true });
    if (cfg.rotate) chips.push({ label: 'Vr', on: true });
    if (cfg.vrHint) chips.push({ label: cfg.vrHint, on: !!cfg.rotate });
    if (cfg.vrefHint) chips.push({ label: cfg.vrefHint, on: !!cfg.flare });
    if (cfg.flapHint) chips.push({ label: cfg.flapHint, on: true });
    if (cfg.smoke) chips.push({ label: 'SMOKE', on: true });
    this.configEl.innerHTML = chips
      .map((c) => `<span class="chip${c.on ? ' on' : ''}${c.warn ? ' warn' : ''}">${c.label}</span>`)
      .join('');
  }

  update(dt, state) {
    if (this._toastT > 0) {
      this._toastT -= dt;
      if (this._toastT <= 0) this.toastEl.classList.add('hidden');
    }
    if (!state) return;
    const { alt, speed, vs, x, z, heading } = state;
    const altFt = Math.round(alt * M_TO_FT);
    const kts = Math.round(speed * MS_TO_KT);
    const fpm = Math.round(vs * M_TO_FT * 60);
    this.alt.textContent = altFt;
    this.spd.textContent = kts;
    this.vs.textContent = fpm;

    // Soft visual warnings
    this.gaugeAlt?.classList.toggle('warn-hi', altFt > 12000);
    this.gaugeSpd?.classList.toggle('warn-hi', kts > 250);
    this.gaugeSpd?.classList.toggle('danger-hi', kts > 400);
    this.gaugeVs?.classList.toggle('warn-hi', Math.abs(fpm) > 2000);
    this.gaugeVs?.classList.toggle('danger-hi', fpm < -2500);

    this._drawMinimap(x, z, heading);
  }

  _drawMinimap(x, z, heading) {
    const ctx = this.ctx;
    const W = this.mm.width, H = this.mm.height;
    ctx.clearRect(0, 0, W, H);

    // Soft vignette background
    const grd = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
    grd.addColorStop(0, 'rgba(12, 40, 70, 0.95)');
    grd.addColorStop(1, 'rgba(4, 14, 28, 0.95)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    const scale = 0.04;
    const cx = W / 2, cy = H / 2;
    const wx = (wx, wz) => [cx + (wx - x) * scale, cy + (wz - z) * scale];

    // Terrain wash
    ctx.fillStyle = 'rgba(50, 100, 55, 0.35)';
    ctx.fillRect(0, 0, W, H);

    // Lake
    ctx.fillStyle = '#2a78b8';
    let [lx, lz] = wx(WORLD.lake.x, WORLD.lake.z);
    ctx.beginPath();
    ctx.arc(lx, lz, WORLD.lake.r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mountains (simple blobs)
    ctx.fillStyle = 'rgba(90, 90, 85, 0.55)';
    for (const m of WORLD.mountains) {
      [lx, lz] = wx(m.x, m.z);
      ctx.beginPath();
      ctx.arc(lx, lz, m.r * scale * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // City
    ctx.fillStyle = '#6a7388';
    [lx, lz] = wx(WORLD.city.x, WORLD.city.z);
    ctx.fillRect(lx - 9, lz - 9, 18, 18);
    ctx.strokeStyle = 'rgba(255, 220, 140, 0.35)';
    ctx.strokeRect(lx - 9, lz - 9, 18, 18);

    // Runway
    ctx.fillStyle = '#3a3a44';
    ctx.save();
    ctx.translate(...wx(0, 0));
    ctx.fillRect(
      -WORLD.runway.halfW * scale,
      -WORLD.runway.halfL * scale,
      WORLD.runway.halfW * 2 * scale,
      WORLD.runway.halfL * 2 * scale
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -WORLD.runway.halfL * scale);
    ctx.lineTo(0, WORLD.runway.halfL * scale);
    ctx.stroke();
    ctx.restore();

    // Hangar
    ctx.fillStyle = '#7a90a8';
    [lx, lz] = wx(WORLD.hangar.x, WORLD.hangar.z);
    ctx.fillRect(lx - 3, lz - 2, 6, 4);

    // Pads with glow
    [lx, lz] = wx(WORLD.balloonPad.x, WORLD.balloonPad.z);
    ctx.fillStyle = 'rgba(255, 176, 40, 0.25)';
    ctx.beginPath(); ctx.arc(lx, lz, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb028';
    ctx.beginPath(); ctx.arc(lx, lz, 3.5, 0, Math.PI * 2); ctx.fill();

    [lx, lz] = wx(WORLD.rocketPad.x, WORLD.rocketPad.z);
    ctx.fillStyle = 'rgba(255, 68, 34, 0.25)';
    ctx.beginPath(); ctx.arc(lx, lz, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4422';
    ctx.beginPath(); ctx.arc(lx, lz, 3.5, 0, Math.PI * 2); ctx.fill();

    // Player chevron
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);
    ctx.shadowColor = 'rgba(78, 194, 255, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#4ec2ff';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4.5, -6);
    ctx.lineTo(0, -3.5);
    ctx.lineTo(4.5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Frame
    ctx.strokeStyle = 'rgba(78, 194, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Compass tick north relative
    ctx.fillStyle = 'rgba(255, 193, 74, 0.8)';
    ctx.font = 'bold 9px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W / 2, 12);
  }

  /** Prefill checklist from research info when starting a flight */
  loadAircraftChecklist(id, phase = 'takeoff') {
    const info = getAircraftInfo(id);
    if (!info) return;
    const steps = phase === 'landing' ? info.landing : info.takeoff;
    this.showChecklist(phase === 'landing' ? 'Landing' : 'Takeoff', steps, -1);
  }
}
