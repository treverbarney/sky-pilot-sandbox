/**
 * Hangar cards, aircraft info sheet, help modal, first-run onboarding.
 * Visual / info architecture — does not own flight physics.
 */
import { AIRCRAFT } from './aircraft-data.js';
import {
  AIRCRAFT_INFO, DIFF_LABEL, DIFF_HINT, SILHOUETTE_SVG, getAircraftInfo
} from './aircraft-info.js';

const HELP_SEEN_KEY = 'sky-pilot-help-seen-v1';

export function buildHangarGrid(gridEl, { onSelect, onInfo }) {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  for (const a of AIRCRAFT) {
    const info = getAircraftInfo(a.id) || {};
    const accent = info.accent || '#3db8ff';
    const sil = SILHOUETTE_SVG[info.silhouette] || SILHOUETTE_SVG.highwing;
    const diff = a.diff || 'med';
    const card = document.createElement('article');
    card.className = `ac-card diff-${diff} type-${a.id}${info.fictional ? ' fictional' : ''}`;
    card.style.setProperty('--ac-accent', accent);
    card.dataset.id = a.id;
    card.dataset.diff = diff;
    card.title = `${info.shortName || a.name} — ${DIFF_LABEL[diff] || diff}`;
    card.innerHTML = `
      <div class="ac-card-sil" aria-hidden="true">
        <svg viewBox="0 0 120 48" class="sil-svg">${sil}</svg>
      </div>
      <div class="ac-card-body">
        <div class="ac-card-top">
          <h3>${info.shortName || a.name}</h3>
          <span class="diff ${diff}">${DIFF_LABEL[diff] || diff}</span>
        </div>
        <p class="ac-class">${info.classLabel || a.type || ''}${info.fictional ? ' · <em>Fictional</em>' : ''}</p>
        <p class="ac-blurb">${info.blurb || a.blurb}</p>
        <div class="ac-card-actions">
          <button type="button" class="btn-card-info" data-info="${a.id}">Info</button>
          <button type="button" class="btn-card-fly" data-fly="${a.id}">Fly</button>
        </div>
      </div>`;
    card.querySelector('[data-fly]').addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect?.(a.id);
    });
    card.querySelector('[data-info]').addEventListener('click', (e) => {
      e.stopPropagation();
      onInfo?.(a.id);
    });
    // Tap card body also opens info (Fly is explicit)
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      onInfo?.(a.id);
    });
    gridEl.appendChild(card);
  }
}

export function openInfoSheet(sheetEl, id, { onFly, onClose } = {}) {
  const a = AIRCRAFT.find((x) => x.id === id);
  const info = getAircraftInfo(id);
  if (!sheetEl || !a || !info) return;

  const sil = SILHOUETTE_SVG[info.silhouette] || SILHOUETTE_SVG.highwing;
  const controls = (info.controls || []).map((c) => `<span class="chip">${c}</span>`).join('');
  const toList = (arr) => (arr || []).map((s) => `<li>${s}</li>`).join('');

  sheetEl.innerHTML = `
    <div class="info-sheet-panel" style="--ac-accent:${info.accent}">
      <button type="button" class="info-close" aria-label="Close">×</button>
      <div class="info-hero">
        <svg viewBox="0 0 120 48" class="sil-svg large">${sil}</svg>
        ${info.fictional ? '<span class="badge-fic">FICTIONAL</span>' : ''}
      </div>
      <header class="info-head">
        <h2>${info.fullName}</h2>
        <div class="info-meta">
          <span class="diff ${a.diff}">${DIFF_LABEL[a.diff] || a.diff}</span>
          <span class="info-class">${info.classLabel}</span>
        </div>
        <p class="info-blurb">${info.blurb}</p>
        <p class="info-diff-hint">${DIFF_HINT[a.diff] || ''}</p>
      </header>
      <section class="info-specs">
        <h3>Key specs</h3>
        <dl class="spec-grid">
          <div><dt>Cruise</dt><dd>${info.cruise}</dd></div>
          <div><dt>Vne / Vmo</dt><dd>${info.vne}</dd></div>
          <div><dt>Stall / min</dt><dd>${info.stall}</dd></div>
          <div><dt>Climb</dt><dd>${info.climb}</dd></div>
          <div><dt>MTOW</dt><dd>${info.mtow}</dd></div>
          <div><dt>Approach</dt><dd>${info.approach}</dd></div>
        </dl>
      </section>
      <section class="info-controls">
        <h3>On-screen controls</h3>
        <div class="chip-row">${controls}</div>
      </section>
      <section class="info-check">
        <div>
          <h3>Takeoff</h3>
          <ol>${toList(info.takeoff)}</ol>
        </div>
        <div>
          <h3>Landing</h3>
          <ol>${toList(info.landing)}</ol>
        </div>
      </section>
      ${info.notes ? `<p class="info-notes">${info.notes}</p>` : ''}
      <div class="info-actions">
        <button type="button" class="btn btn-secondary info-back">Back</button>
        <button type="button" class="btn btn-primary info-fly">Fly ${info.shortName}</button>
      </div>
    </div>`;

  sheetEl.classList.remove('hidden');
  const close = () => {
    sheetEl.classList.add('hidden');
    onClose?.();
  };
  sheetEl.querySelector('.info-close').onclick = close;
  sheetEl.querySelector('.info-back').onclick = close;
  sheetEl.querySelector('.info-fly').onclick = () => {
    close();
    onFly?.(id);
  };
  // Backdrop click
  sheetEl.onclick = (e) => {
    if (e.target === sheetEl) close();
  };
}

export function fillHelpModal(helpEl) {
  if (!helpEl) return;
  const body = helpEl.querySelector('.help-body');
  if (!body) return;
  body.innerHTML = `
    <section>
      <h3>Welcome</h3>
      <p>Sky Pilot Sandbox is a phone-first flight playground: hangar → 10 aircraft → airport world → parachute, vehicles, balloon &amp; rocket pads.</p>
    </section>
    <section>
      <h3>Hangar</h3>
      <ul>
        <li>Tap a card for the full <strong>info sheet</strong> (specs &amp; checklists).</li>
        <li>Tap <strong>Fly</strong> to spawn on the runway (glider starts aloft; heli at the pad).</li>
        <li>Difficulty: Easy · Medium · Hard · Expert (fictional Area 51).</li>
        <li>On phone, tap <strong>Enable motion</strong> first for tilt controls.</li>
      </ul>
    </section>
    <section>
      <h3>Flight controls</h3>
      <ul>
        <li><strong>Phone tilt</strong> — bank (aileron) &amp; pitch (elevator).</li>
        <li><strong>THR</strong> — throttle. Helicopter uses <strong>COLL</strong> collective too.</li>
        <li><strong>RUD</strong> — rudder / yaw. Pedals for heli torque.</li>
        <li><strong>FLAPS / GEAR / BRAKE</strong> — systems (varies by aircraft).</li>
        <li><strong>TRIM ▲▼</strong> — pitch trim. <strong>CAM</strong> — chase → cockpit → orbit.</li>
        <li><strong>JUMP</strong> — eject / parachute (when allowed). Near orange/red pads: board balloon or rocket.</li>
      </ul>
      <p class="help-kbd">Desktop: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> pitch/roll · <kbd>Q</kbd><kbd>E</kbd> rudder · <kbd>R</kbd>/<kbd>F</kbd> throttle (heli: collective) · <kbd>[</kbd><kbd>]</kbd> flaps · <kbd>G</kbd> gear · <kbd>X</kbd> spoilers · <kbd>V</kbd> AB · <kbd>T</kbd> TV · <kbd>B</kbd> brake · <kbd>H</kbd> reverse.</p>
      <p>Live <strong>takeoff/landing checklist</strong> tracks config &amp; V-speeds for the selected aircraft. Hard/expert types fail unstable approaches.</p>
    </section>
    <section>
      <h3>Aircraft modes</h3>
      <ul>
        <li><strong>Props / jets / fighters</strong> — classic runway ops; configure flaps &amp; gear.</li>
        <li><strong>Amphibian</strong> — land on runway or the lake; gear state must match surface.</li>
        <li><strong>Glider</strong> — air start, tiny sustainer; use spoilers/energy for the pattern.</li>
        <li><strong>Helicopter</strong> — collective + tilt cyclic; hover landings.</li>
        <li><strong>Area 51</strong> — fictional thrust vector / near-hover; still skill-gated.</li>
      </ul>
    </section>
    <section>
      <h3>Parachute</h3>
      <ul>
        <li>JUMP when airborne (if aircraft allows eject).</li>
        <li><strong>SWOOP</strong> near the ground for a skim; <strong>DIVE</strong> to lose altitude faster.</li>
        <li>Tilt steers the canopy. Land, then grab a vehicle or teleport.</li>
      </ul>
    </section>
    <section>
      <h3>Vehicles</h3>
      <ul>
        <li>After chute landing: <strong>Bike</strong> or <strong>Car</strong> — throttle toward 200+ mph.</li>
        <li><strong>✈ Airport</strong> teleports you back to the runway with your last aircraft.</li>
      </ul>
    </section>
    <section>
      <h3>Balloon &amp; rocket pads</h3>
      <ul>
        <li>Taxi to the <strong>orange</strong> ring (balloon) or <strong>red</strong> ring (rocket) near the hangar.</li>
        <li>When stopped, press <strong>JUMP</strong> to board.</li>
        <li>Balloon: throttle = burner. Rocket: full throttle to space — reentry is brutal; aim for the pad.</li>
      </ul>
    </section>
    <section>
      <h3>HUD</h3>
      <ul>
        <li><strong>ALT</strong> feet · <strong>KIAS</strong> knots · <strong>fpm</strong> vertical speed.</li>
        <li>Minimap: runway, lake, city, balloon (amber) &amp; rocket (red) pads.</li>
        <li>Checklist panel (when shown) mirrors takeoff/landing steps for the selected type.</li>
      </ul>
    </section>
    <section>
      <h3>Tips</h3>
      <ul>
        <li>Start with the <strong>Cessna 182</strong>. Save the airliner &amp; F-15 for later.</li>
        <li>Configure before the fence — flaps &amp; gear matter.</li>
        <li>Install as a PWA for fullscreen + better motion access on some phones.</li>
      </ul>
    </section>`;
}

export function wireHelp(helpEl, openBtn, closeBtns = []) {
  if (!helpEl) return {
    open() {},
    close() {},
    maybeFirstRun() {}
  };
  const open = () => {
    helpEl.classList.remove('hidden');
    try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch (_) {}
  };
  const close = () => helpEl.classList.add('hidden');
  openBtn?.addEventListener('click', open);
  closeBtns.forEach((b) => b?.addEventListener('click', close));
  helpEl.addEventListener('click', (e) => {
    if (e.target === helpEl) close();
  });
  helpEl.querySelectorAll('[data-help-close]').forEach((b) => b.addEventListener('click', close));
  return {
    open,
    close,
    maybeFirstRun() {
      try {
        if (!localStorage.getItem(HELP_SEEN_KEY)) open();
      } catch (_) {
        /* ignore */
      }
    }
  };
}

export function displayNameFor(id, fallback) {
  const info = getAircraftInfo(id);
  return info?.shortName || fallback || id;
}
