import * as THREE from 'three';
import { AIRCRAFT, getAircraft, msToKt } from './aircraft-data.js';
import { FlightModel } from './flight-model.js';
import { createAircraftMesh } from './meshes.js';
import { createWorld, WORLD, sampleHeight } from './world.js';
import { Controls } from './controls.js';
import { ModeManager } from './modes.js';
import { Effects } from './effects.js';
import { HUD } from './hud.js';
import { buildHangarGrid, openInfoSheet, fillHelpModal, wireHelp, displayNameFor } from './hangar-ui.js';
import { Checklist } from './checklist.js';
import {
  loadGraphicsAssets,
  applyRendererQuality,
  getQualityKey,
  setQualityKey,
  QUALITY
} from './materials.js';

const canvas = document.getElementById('c');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 8000);
camera.position.set(0, 20, -40);

/** Created in init(); null if WebGL unavailable — hangar still works */
let renderer = null;
let webglOk = false;

function createRenderer() {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.setSize(window.innerWidth, window.innerHeight, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  applyRendererQuality(r, getQualityKey());
  return r;
}

let world, effects, modes, hud, controls, helpApi, checklist;
let checklistStatus = null;
let flight = null;
let craftMesh = null;
let currentSpec = null;
let gameMode = 'menu'; // menu | flight | chute | vehicle | balloon | rocket | crash | landed | ground
let orbitAng = 0;
let clock = new THREE.Clock();
let spawnPadPrompt = false;
let ringPulse = 0;
let _wasOnGround = false;

const el = {
  menu: document.getElementById('menu'),
  crash: document.getElementById('crash'),
  landed: document.getElementById('landed'),
  loading: document.getElementById('loading'),
  loadBar: document.getElementById('load-bar'),
  hud: document.getElementById('hud'),
  controls: document.getElementById('controls'),
  groundUi: document.getElementById('ground-ui'),
  heliCol: document.getElementById('heli-collective'),
  grid: document.getElementById('aircraft-grid'),
  status: document.getElementById('status-msg'),
  crashMsg: document.getElementById('crash-msg'),
  landMsg: document.getElementById('land-msg'),
  infoSheet: document.getElementById('info-sheet'),
  help: document.getElementById('help-modal')
};

function setLoad(p) {
  el.loadBar.style.width = Math.round(p * 100) + '%';
}

function init() {
  // Hangar UI first — must not depend on WebGL succeeding
  try {
    setupHangarAndHelp();
  } catch (err) {
    console.error('[Sky Pilot] hangar setup failed', err);
    if (el.status) el.status.textContent = 'Hangar failed — hard refresh (Ctrl+Shift+R / clear site data).';
  }

  wireQualityButton();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  window.addEventListener('resize', onResize);
  onResize();
  bootGraphics();
}

let _fpsAcc = 0;
let _fpsFrames = 0;
let _fpsLowMs = 0;

async function bootGraphics() {
  try {
    setLoad(0.12);
    renderer = createRenderer();
    webglOk = true;
    setLoad(0.2);
    await loadGraphicsAssets(renderer, getQualityKey());
    setLoad(0.42);
    world = createWorld(scene, { qualityKey: getQualityKey() });
    setLoad(0.58);
    effects = new Effects(scene);
    modes = new ModeManager(scene);
    hud = new HUD();
    controls = new Controls();
    checklist = new Checklist();
    controls.bindUI({
      throttle: document.getElementById('throttle'),
      rudder: document.getElementById('rudder'),
      collective: document.getElementById('collective'),
      flaps: document.getElementById('btn-flaps'),
      gear: document.getElementById('btn-gear'),
      brake: document.getElementById('btn-brake'),
      spoilers: document.getElementById('btn-spoilers'),
      arm: document.getElementById('btn-arm'),
      mix: document.getElementById('btn-mix'),
      prop: document.getElementById('btn-prop'),
      cond: document.getElementById('btn-cond'),
      ab: document.getElementById('btn-ab'),
      tv: document.getElementById('btn-tv'),
      rev: document.getElementById('btn-rev'),
      ballast: document.getElementById('btn-ballast'),
      water: document.getElementById('btn-water'),
      toga: document.getElementById('btn-toga'),
      ga: document.getElementById('btn-ga'),
      hold: document.getElementById('btn-hold'),
      autobrake: document.getElementById('btn-autobrake'),
      nav: document.getElementById('btn-nav'),
      smoke: document.getElementById('btn-smoke'),
      trimUp: document.getElementById('btn-trim-up'),
      trimDn: document.getElementById('btn-trim-dn'),
      camera: document.getElementById('btn-camera'),
      eject: document.getElementById('btn-eject')
    });
    setLoad(0.88);
    wireButtons();
    setLoad(1);
    requestAnimationFrame(loop);
  } catch (err) {
    console.error('[Sky Pilot] WebGL/world init failed — hangar still available', err);
    webglOk = false;
    if (el.status) {
      el.status.textContent = '3D engine failed (WebGL?). Hangar cards still work — try hard refresh.';
    }
    try { wireButtons(); } catch (_) { /* ignore */ }
  }

  setTimeout(() => {
    el.loading?.classList.add('hidden');
    helpApi?.maybeFirstRun();
  }, 320);
}

function wireQualityButton() {
  const btn = document.getElementById('btn-quality');
  if (!btn) return;
  const sync = () => {
    const k = getQualityKey();
    btn.textContent = `GFX ${QUALITY[k]?.label || k}`;
    btn.dataset.quality = k;
  };
  sync();
  btn.addEventListener('click', () => {
    const order = ['low', 'medium', 'high'];
    const cur = getQualityKey();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setQualityKey(next);
    sync();
    if (el.status) {
      el.status.textContent = `Graphics → ${QUALITY[next].label}. Reload to rebuild world (textures/LOD).`;
    }
    // Soft apply DPR now; full world rebuild needs reload
    if (renderer) applyRendererQuality(renderer, next);
    hud?.toast?.(`Quality ${QUALITY[next].label} — reload for full effect`);
  });
}

function setupHangarAndHelp() {
  fillHelpModal(el.help);
  helpApi = wireHelp(
    el.help,
    document.getElementById('btn-help'),
    []
  );
  document.getElementById('btn-help-flight')?.addEventListener('click', () => helpApi.open());

  buildHangarGrid(el.grid, {
    onSelect: (id) => startFlight(id),
    onInfo: (id) => openInfoSheet(el.infoSheet, id, {
      onFly: (fid) => startFlight(fid)
    })
  });
}

function wireButtons() {
  document.getElementById('btn-motion').addEventListener('click', async () => {
    await controls.requestMotion();
    el.status.textContent = controls.motionMsg;
  });
  document.getElementById('btn-eject').addEventListener('click', () => tryEject());
  document.getElementById('btn-retry').addEventListener('click', () => {
    if (currentSpec) startFlight(currentSpec.id);
  });
  document.getElementById('btn-hangar').addEventListener('click', () => showHangar());
  document.getElementById('btn-respawn').addEventListener('click', () => teleportAirport());
  document.getElementById('btn-land-again').addEventListener('click', () => {
    if (currentSpec) startFlight(currentSpec.id);
  });
  document.getElementById('btn-land-hangar').addEventListener('click', () => showHangar());
  document.getElementById('btn-land-explore').addEventListener('click', () => {
    el.landed.classList.add('hidden');
    gameMode = 'flight';
    showFlightUI(true);
    if (currentSpec) checklist.setAircraft(currentSpec);
    hud.toast('Free explore — JUMP anytime');
  });
  document.getElementById('btn-swoop').addEventListener('click', () => {
    modes.swoop = !modes.swoop;
    document.getElementById('btn-swoop').classList.toggle('on', modes.swoop);
    hud.toast(modes.swoop ? 'Swoop ON — skim the ground' : 'Swoop off');
  });
  document.getElementById('btn-dive').addEventListener('click', () => {
    modes.dive = !modes.dive;
    document.getElementById('btn-dive').classList.toggle('on', modes.dive);
  });
  document.getElementById('btn-bike').addEventListener('click', () => spawnVehicle('bike'));
  document.getElementById('btn-car').addEventListener('click', () => spawnVehicle('car'));
  document.getElementById('btn-teleport').addEventListener('click', () => teleportAirport());
}

function showHangar() {
  cleanupCraft();
  modes.clearActive();
  gameMode = 'menu';
  el.menu.classList.remove('hidden');
  el.crash.classList.add('hidden');
  el.landed.classList.add('hidden');
  el.infoSheet.classList.add('hidden');
  showFlightUI(false);
  el.groundUi.classList.add('hidden');
  hud.hideChecklist();
  checklist?.hide();
  camera.position.set(WORLD.hangar.x - 40, 25, WORLD.hangar.z - 60);
  camera.lookAt(WORLD.hangar.x, 8, WORLD.hangar.z);
}

function showFlightUI(on) {
  el.hud.classList.toggle('hidden', !on);
  el.controls.classList.toggle('hidden', !on);
}

function cleanupCraft() {
  if (craftMesh) {
    scene.remove(craftMesh);
    craftMesh = null;
  }
  flight = null;
}

function startFlight(id) {
  const spec = getAircraft(id);
  currentSpec = spec;
  cleanupCraft();
  modes.clearActive();

  flight = new FlightModel(spec);
  const spawn = new THREE.Vector3(-30, 2, -WORLD.runway.halfL + 80);
  if (spec.type === 'glider') {
    spawn.set(0, 400, -200);
    flight.reset(spawn, 0, 40);
    flight.onGround = false;
    flight.throttle = 0;
  } else if (spec.isHeli) {
    spawn.set(WORLD.hangar.x + 30, 3, WORLD.hangar.z + 20);
    flight.reset(spawn, 0, 0);
    controls.collective = 0.45;
    flight.collective = 0.45;
  } else {
    flight.reset(spawn, 0, 0);
  }

  craftMesh = createAircraftMesh(spec);
  scene.add(craftMesh);
  syncMesh();

  controls.configureForAircraft(spec);
  document.getElementById('throttle').value = 0;
  el.heliCol.classList.toggle('hidden', !spec.isHeli);
  // Also honor research info chips for any extra buttons

  el.menu.classList.add('hidden');
  el.crash.classList.add('hidden');
  el.landed.classList.add('hidden');
  el.infoSheet.classList.add('hidden');
  el.groundUi.classList.add('hidden');
  showFlightUI(true);

  const label = displayNameFor(spec.id, spec.name);
  hud.setAircraft(label, spec.id);
  hud.setMode(spec.isHeli ? 'HELI' : spec.type === 'glider' ? 'GLIDER' : 'AIR');
  checklist.resetFlight();
  checklist.setAircraft(spec);
  if (spec.type === 'glider') {
    checklist.airborneOnce = true;
    checklist.setPhase('cruise');
    flight.airborneTime = 5;
  }
  gameMode = 'flight';
  _wasOnGround = true;
  const tip = spec.isHeli
    ? 'Raise COLL to hover'
    : spec.type === 'glider'
      ? 'Energy management — spoilers for path'
      : `Checklist: rotate ~${msToKt(spec.vr).toFixed(0)} kt`;
  hud.toast(`${label} — ${tip}`);
}


function syncMesh() {
  if (!craftMesh || !flight) return;
  craftMesh.position.copy(flight.position);
  craftMesh.quaternion.copy(flight.quaternion);
  const prop = craftMesh.getObjectByName('prop');
  if (prop) prop.rotation.z += flight.throttle * 1.5 + flight.getSpeed() * 0.05;
  // Spin all named props (cargo)
  craftMesh.traverse((o) => {
    if (o.name === 'prop' && o !== prop) {
      o.rotation.z += flight.throttle * 1.5 + flight.getSpeed() * 0.05;
    }
  });
  const rotor = craftMesh.getObjectByName('rotor');
  if (rotor) rotor.rotation.y += 0.3 + flight.collective * 0.8;
  const tr = craftMesh.getObjectByName('tailrotor');
  if (tr) tr.rotation.x += 0.8 + flight.collective * 0.5;
  const glow = craftMesh.getObjectByName('glow');
  if (glow) glow.material.opacity = 0.2 + flight.throttle * 0.5;
  craftMesh.traverse((o) => {
    if (o.name === 'gear') o.visible = flight.gearDown;
  });
  const strobe = craftMesh.getObjectByName('navStrobe');
  const navRed = craftMesh.getObjectByName('navRed');
  const navGreen = craftMesh.getObjectByName('navGreen');
  const lights = controls?.navLights !== false;
  if (navRed) navRed.visible = lights;
  if (navGreen) navGreen.visible = lights;
  if (strobe) {
    strobe.visible = lights;
    if (lights) strobe.scale.setScalar(0.7 + 0.5 * Math.abs(Math.sin(performance.now() * 0.008)));
  }
}

function tryEject() {
  if (gameMode !== 'flight' || !flight || !currentSpec) return;
  if (!currentSpec.ejectOk) {
    hud.toast('No eject on this aircraft');
    return;
  }
  if (flight.getAltitude() < 30 && flight.onGround) {
    tryBoardSpecial();
    return;
  }
  const pos = flight.position.clone();
  const vel = flight.velocity.clone();
  cleanupCraft();
  modes.startParachute(pos, vel);
  gameMode = 'chute';
  hud.setMode('CHUTE');
  hud.hideChecklist();
  el.groundUi.classList.remove('hidden');
  document.getElementById('btn-bike').classList.add('hidden');
  document.getElementById('btn-car').classList.add('hidden');
  document.getElementById('btn-swoop').classList.remove('hidden');
  document.getElementById('btn-dive').classList.remove('hidden');
  hud.toast('Parachute deployed — SWOOP near ground');
}

function tryBoardSpecial() {
  if (!flight) return;
  const x = flight.position.x, z = flight.position.z;
  if (world.nearBalloon(x, z)) {
    cleanupCraft();
    modes.startBalloon();
    gameMode = 'balloon';
    hud.setMode('BALLOON');
    hud.hideChecklist();
    el.groundUi.classList.add('hidden');
    hud.toast('Balloon — throttle = burner');
    return true;
  }
  if (world.nearRocket(x, z)) {
    cleanupCraft();
    modes.startRocket();
    gameMode = 'rocket';
    hud.setMode('ROCKET');
    hud.hideChecklist();
    el.groundUi.classList.add('hidden');
    hud.toast('Rocket — full throttle to space; reentry is brutal');
    return true;
  }
  hud.toast('Taxi to orange/red pads for balloon/rocket');
  return false;
}

function onChuteLand(pos) {
  hud.toast('On ground — grab a vehicle or teleport');
  document.getElementById('btn-bike').classList.remove('hidden');
  document.getElementById('btn-car').classList.remove('hidden');
  document.getElementById('btn-swoop').classList.add('hidden');
  document.getElementById('btn-dive').classList.add('hidden');
  const landPos = pos.clone();
  modes.clearActive();
  modes.pos.copy(landPos);
  gameMode = 'ground';
  hud.setMode('GROUND');
}

function spawnVehicle(kind) {
  const p = modes.pos.clone();
  if (gameMode === 'chute' && modes.mesh) p.copy(modes.pos);
  modes.startVehicle(kind, p);
  gameMode = 'vehicle';
  hud.setMode(kind === 'bike' ? 'BIKE' : 'CAR');
  el.groundUi.classList.remove('hidden');
  document.getElementById('btn-swoop').classList.add('hidden');
  document.getElementById('btn-dive').classList.add('hidden');
  hud.toast(`${kind === 'bike' ? 'Motorcycle' : 'Supercar'} — throttle to 200+ mph`);
}

function teleportAirport() {
  modes.clearActive();
  el.crash.classList.add('hidden');
  el.groundUi.classList.add('hidden');
  if (currentSpec) {
    startFlight(currentSpec.id);
    hud.toast('Teleported to airport');
  } else {
    showHangar();
  }
}

function handleCrash(reason) {
  if (flight && craftMesh) {
    effects.explode(flight.position.clone());
  }
  if (modes.mesh) {
    effects.explode(modes.pos.clone());
  }
  gameMode = 'crash';
  el.crashMsg.textContent = reason || 'Impact';
  el.crash.classList.remove('hidden');
  showFlightUI(false);
  el.groundUi.classList.add('hidden');
  hud.hideChecklist();
  checklist?.hide();
  hud.setMode('CRASH');
}

function handleLanding(info) {
  const spec = currentSpec;
  const pos = flight?.position?.clone?.() || modes.pos.clone();
  if (info.surface === 'water') {
    effects.splash(pos, Math.min(2, 0.6 + (info.vert || 1)));
  } else {
    effects.landingDust(pos, Math.min(2, 0.5 + (info.vert || 1)));
  }
  let msg = `Touchdown ${info.surface || 'runway'} — ${info.gs?.toFixed?.(0) || '?'} m/s, sink ${info.vert?.toFixed?.(1) || '?'} m/s`;
  if (info.score) {
    msg += ` · ${info.score.grade || ''} ${info.score.points}/100`;
    const b = info.score.breakdown;
    if (b) {
      msg += ` [cfg ${b.config >= 0 ? '+' : ''}${b.config} sink ${b.sink >= 0 ? '+' : ''}${b.sink} spd ${b.speed >= 0 ? '+' : ''}${b.speed} align ${b.align >= 0 ? '+' : ''}${b.align} flare ${b.flare >= 0 ? '+' : ''}${b.flare}]`;
    }
  }
  if (info.score?.issues?.length) msg += ` (${info.score.issues.join(', ')})`;
  if (spec) msg += ` · ${displayNameFor(spec.id, spec.name)}`;
  if (checklistStatus && !checklistStatus.complete && (spec?.diff === 'hard' || spec?.diff === 'expert')) {
    msg += ' · checklist incomplete';
  }
  el.landMsg.textContent = msg;
  el.landed.classList.remove('hidden');
  gameMode = 'landed';
  showFlightUI(false);
  checklist?.hide();
  hud.setMode('LAND');
}

function updateCamera(dt, targetPos, targetQuat, speed) {
  const mode = controls.cameraMode;
  if (mode === 1) {
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(targetQuat || new THREE.Quaternion());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(targetQuat || new THREE.Quaternion());
    camera.position.copy(targetPos).addScaledVector(up, 1.2).addScaledVector(fwd, 2);
    camera.lookAt(targetPos.clone().addScaledVector(fwd, 40).addScaledVector(up, 0.5));
  } else if (mode === 2) {
    orbitAng += dt * 0.4;
    const r = 30 + speed * 0.05;
    camera.position.set(
      targetPos.x + Math.sin(orbitAng) * r,
      targetPos.y + 12,
      targetPos.z + Math.cos(orbitAng) * r
    );
    camera.lookAt(targetPos);
  } else {
    const quat = targetQuat || new THREE.Quaternion().setFromEuler(new THREE.Euler(0, modes.heading || 0, 0, 'YXZ'));
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0);
    const desired = targetPos.clone().addScaledVector(back, 22 + Math.min(40, speed * 0.08)).addScaledVector(up, 8);
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    const look = targetPos.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(quat), 20);
    look.y += 2;
    camera.lookAt(look);
  }
}

function updateHudConfig() {
  if (!flight) return;
  const flare = flight.approachPhase === 'flare_window';
  hud.setConfig({
    flaps: flight.flaps ?? controls.flaps ?? 0,
    gear: flight.gearDown,
    spoilers: !!controls.spoilers || !!flight.spoilers,
    spoilersArmed: !!controls.spoilersArmed || !!flight.spoilersArmed,
    ab: !!controls.afterburner || !!flight.afterburner,
    tv: !!controls.thrustVectorOn || !!flight.thrustVectorOn,
    brakes: !!controls.brakes || !!flight.brakes,
    nearGround: flight.getAltitude() < 80,
    water: !!flight.waterMode || world.isWater(flight.position.x, flight.position.z),
    stable: flight.stableApproach,
    flare,
    rotate: !!(flight.onGround && flight.rotateReady),
    smoke: !!controls.smokeOn
  });
  const sw = document.getElementById('stall-warn');
  if (sw) sw.classList.toggle('hidden', !flight.stalling);

  const fc = document.getElementById('flare-cue');
  if (fc) {
    const show = flare && !flight.onGround;
    fc.classList.toggle('hidden', !show);
    if (show) {
      const idle = (currentSpec?.flareIdleThr ?? 0.2);
      fc.textContent = flight.throttle <= idle ? 'FLARE' : 'FLARE · IDLE';
    }
  }
  const ac = document.getElementById('approach-cue');
  if (ac) {
    let msg = '';
    if (flight.sinkAdvisory) msg = 'SINK HIGH';
    else if (flight.stableApproach === false && flight.approachPhase === 'final') msg = 'UNSTABLE';
    else if (flight.onGround && flight.rotateReady) msg = 'ROTATE';
    ac.textContent = msg;
    ac.classList.toggle('hidden', !msg);
    ac.classList.toggle('warn', msg === 'SINK HIGH' || msg === 'UNSTABLE');
    ac.classList.toggle('ok', msg === 'ROTATE');
  }
}

function runwayApproachHints() {
  if (!flight) return { onRunwayApproach: false, headingAligned: false, nearRunway: false };
  const x = flight.position.x, z = flight.position.z;
  const onRwy = world.isOnRunway(x, z);
  const near = Math.abs(x) < WORLD.runway.halfW * 4 && Math.abs(z) < WORLD.runway.halfL * 1.4;
  const h = ((flight.euler.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const aligned = Math.abs(Math.sin(h)) < 0.35;
  const approaching = near && aligned && flight.position.y < 350;
  return { onRunwayApproach: approaching || onRwy, headingAligned: aligned, nearRunway: near };
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update();
  effects.update(dt);
  world?.update?.(dt);
  // FPS governor → auto Low
  _fpsAcc += dt; _fpsFrames++;
  if (_fpsAcc >= 1) {
    const fps = _fpsFrames / _fpsAcc;
    _fpsAcc = 0; _fpsFrames = 0;
    if (fps < 28) {
      _fpsLowMs += 1000;
      if (_fpsLowMs >= 3000 && getQualityKey() !== 'low') {
        setQualityKey('low');
        if (renderer) applyRendererQuality(renderer, 'low');
        hud?.toast?.('Auto quality → Low (FPS)');
        _fpsLowMs = 0;
      }
    } else {
      _fpsLowMs = 0;
    }
  }

  // Pulse pad rings
  ringPulse += dt;
  if (world?.bring) {
    const s = 1 + Math.sin(ringPulse * 2.5) * 0.06;
    world.bring.scale.set(s, s, s);
    world.bring.material.opacity = 0.7 + Math.sin(ringPulse * 2.5) * 0.2;
  }
  if (world?.rring) {
    const s = 1 + Math.sin(ringPulse * 2.5 + 1) * 0.06;
    world.rring.scale.set(s, s, s);
    world.rring.material.opacity = 0.7 + Math.sin(ringPulse * 2.5 + 1) * 0.2;
  }

  if (gameMode === 'menu') {
    orbitAng += dt * 0.15;
    camera.position.set(
      WORLD.hangar.x + Math.sin(orbitAng) * 70,
      30,
      WORLD.hangar.z + Math.cos(orbitAng) * 70
    );
    camera.lookAt(WORLD.hangar.x, 8, WORLD.hangar.z);
    renderer.render(scene, camera);
    return;
  }

  if (gameMode === 'flight' && flight && craftMesh) {
    controls.applyToModel(flight);
    if (flight.onGround && flight.getSpeed() < 5) {
      if (world.nearBalloon(flight.position.x, flight.position.z) ||
          world.nearRocket(flight.position.x, flight.position.z)) {
        if (!spawnPadPrompt) {
          hud.toast('JUMP to board balloon / rocket');
          spawnPadPrompt = true;
        }
      } else spawnPadPrompt = false;
    }

    const th = world.getHeight(flight.position.x, flight.position.z);
    const water = world.isWater(flight.position.x, flight.position.z);
    const agl = flight.position.y - th;
    const hints = runwayApproachHints();
    const snap = flight.getSnap({ agl, ...hints });
    checklistStatus = checklist.update(snap, hints);
    const ev = flight.update(dt, th, water);
    syncMesh();
    updateHudConfig();

    // Contrails at speed / altitude
    const spd = flight.getSpeed();
    if (!flight.onGround && spd > 60 && flight.position.y > 80) {
      const trailPos = flight.position.clone().add(
        new THREE.Vector3(0, 0, -4).applyQuaternion(flight.quaternion)
      );
      effects.contrail(trailPos, flight.velocity, Math.min(1.5, (spd - 50) / 80));
    }
    // Aerobatic smoke
    if (controls.smokeOn && !flight.onGround) {
      const smokePos = flight.position.clone().add(
        new THREE.Vector3(0, -0.5, -3).applyQuaternion(flight.quaternion)
      );
      effects.smokeTrail(smokePos, flight.velocity, 1.2);
    }
    // Rotate callout (once per roll)
    if (flight.onGround && flight.rotateReady && !flight._rotateToast) {
      flight._rotateToast = true;
      hud.toast(`ROTATE — Vr ${msToKt(currentSpec.vr).toFixed(0)} kt`);
    }
    if (!flight.onGround) flight._rotateToast = false;
    // Unstable approach toast once
    if (flight.stableApproach === false && !flight._unstableWarned && flight.approachPhase === 'final') {
      flight._unstableWarned = true;
      hud.toast('UNSTABLE approach — configure / align');
    }
    // Flare cue toast once
    if (flight.approachPhase === 'flare_window' && !flight._flareCueShown) {
      flight._flareCueShown = true;
      hud.toast('FLARE — idle & round out');
    }
    // Airliner/Mustang: nudge SYS page once if spoilers not armed on short final
    if (
      currentSpec?.requireSpoilersArmed &&
      !controls.spoilersArmed &&
      (flight.approachPhase === 'short_final' || flight.approachPhase === 'final') &&
      !flight._armPrompt
    ) {
      flight._armPrompt = true;
      controls.setPage('SYS');
      controls.highlightControl('ARM');
      hud.toast('ARM spoilers for landing');
    }
    // Water wake for amphib
    if (currentSpec?.canWater && water && flight.onGround && spd > 3) {
      effects.wake(flight.position, spd);
    }
    // Touchdown FX edge
    if (!_wasOnGround && flight.onGround) {
      if (water) effects.splash(flight.position.clone(), 1);
      else effects.landingDust(flight.position.clone(), 0.8);
    }
    _wasOnGround = flight.onGround;

    if (ev?.event === 'crash') {
      handleCrash(ev.reason);
    } else if (ev?.event === 'land') {
      if ((currentSpec?.diff === 'hard' || currentSpec?.diff === 'expert') &&
          checklistStatus && !checklistStatus.complete && currentSpec.enforceStableApproach) {
        handleCrash('unstable water landing / checklist');
      } else {
        handleLanding({ ...ev, surface: 'water' });
      }
    } else if (ev?.event === 'touchdown') {
      const onRwy = world.isOnRunway(flight.position.x, flight.position.z);
      if ((currentSpec?.diff === 'hard' || currentSpec?.diff === 'expert') &&
          checklistStatus && !checklistStatus.complete &&
          currentSpec.enforceStableApproach) {
        flight.alive = false;
        handleCrash('unstable approach / checklist incomplete');
      } else if (currentSpec?.runwayOnly && !onRwy && !currentSpec.canWater) {
        if (ev.vert > currentSpec.landVertMax * 0.7) {
          flight.alive = false;
          handleCrash('off-field landing');
        } else {
          handleLanding({ ...ev, surface: 'field' });
        }
      } else {
        handleLanding({ ...ev, surface: onRwy ? 'runway' : 'ground' });
      }
    }

    if (flight.position.y < -50) handleCrash('lost');

    updateCamera(dt, flight.position, flight.quaternion, flight.getSpeed());
    hud.update(dt, {
      alt: flight.getAltitude(),
      speed: flight.getSpeed(),
      vs: flight.getVerticalSpeed(),
      x: flight.position.x,
      z: flight.position.z,
      heading: flight.euler.y
    });
  }

  if (gameMode === 'chute' || gameMode === 'vehicle' || gameMode === 'balloon' || gameMode === 'rocket') {
    const ev = modes.update(dt, controls, world);
    if (ev?.event === 'chute_land') onChuteLand(ev.pos);
    if (ev?.event === 'crash') handleCrash(ev.reason);
    if (ev?.event === 'balloon_land') hud.toast('Balloon secured');
    if (ev?.event === 'space') hud.toast('SPACE — prepare for reentry');
    if (ev?.event === 'reentry') hud.toast('REENTRY — retro burn & aim for pad!');
    if (ev?.event === 'rocket_land') {
      el.landMsg.textContent = 'Rocket recovered near pad — legendary.';
      el.landed.classList.remove('hidden');
      gameMode = 'landed';
      showFlightUI(false);
    }

    // Chute canopy gentle sway
    if (gameMode === 'chute' && modes.mesh) {
      const canopy = modes.mesh.getObjectByName('canopy');
      if (canopy) canopy.rotation.z = Math.sin(ringPulse * 1.8) * 0.05;
    }
    // Rocket flame core
    if (gameMode === 'rocket' && modes.mesh) {
      const flame = modes.mesh.getObjectByName('flame');
      const core = modes.mesh.getObjectByName('flameCore');
      if (core) core.visible = !!flame?.visible;
    }

    const pos = modes.pos;
    const spd = modes.getSpeed();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, modes.heading || 0, 0, 'YXZ'));
    updateCamera(dt, pos, gameMode === 'rocket' || gameMode === 'balloon' ? modes.mesh?.quaternion : q, spd);
    hud.update(dt, {
      alt: pos.y,
      speed: spd,
      vs: modes.vel.y,
      x: pos.x,
      z: pos.z,
      heading: modes.heading || 0
    });
  }

  if (gameMode === 'ground') {
    updateCamera(dt, modes.pos, null, 0);
    hud.update(dt, { alt: modes.pos.y, speed: 0, vs: 0, x: modes.pos.x, z: modes.pos.z, heading: 0 });
  }

  if (renderer) renderer.render(scene, camera);
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (renderer) {
    applyRendererQuality(renderer, getQualityKey());
    renderer.setSize(w, h, false);
  }
  camera.aspect = w / h;
  camera.fov = w < h ? 65 : 55;
  camera.updateProjectionMatrix();
}

init();
