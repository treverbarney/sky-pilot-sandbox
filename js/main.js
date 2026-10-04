import * as THREE from 'three';
import { AIRCRAFT, getAircraft, msToKt } from './aircraft-data.js';
import { FlightModel } from './flight-model.js';
import { createAircraftMesh } from './meshes.js';
import { createWorld, WORLD, sampleHeight, STARS } from './world.js';
import { createMarine } from './marine.js';
import { createFieldOps } from './field-ops.js';
import { weather, updateWeather, applyWind, setStorm, setStormAuto, weatherLabel, STORM, setWeather, PRESETS, currentPreset } from './weather.js';
import { Controls } from './controls.js';
import { ModeManager } from './modes.js';
import { Effects } from './effects.js';
import { HUD } from './hud.js';
import { buildHangarGrid, openInfoSheet, fillHelpModal, wireHelp, displayNameFor, buildMissionBoard } from './hangar-ui.js';
import { missionById, fitLabel, saveMissionResult } from './missions.js';
import { Checklist } from './checklist.js';
import { GameAudio } from './audio.js';
import { FlightCourse } from './course.js';
import { scoreTest, saveBest, bestFor, MEDAL, testKindFor, isUnlocked, saveStar, loadStars } from './career.js';
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
  const r = new THREE.WebGLRenderer({ canvas, antialias: getQualityKey() !== 'low', powerPreference: 'high-performance' });
  r.setSize(window.innerWidth, window.innerHeight, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  applyRendererQuality(r, getQualityKey());
  return r;
}

let world, effects, modes, hud, controls, helpApi, checklist, audio, course, marine, fieldOps;
let checklistStatus = null;
let flight = null;
let craftMesh = null;
let currentSpec = null;
let pendingMission = null;
let activeMission = null;
let gameMode = 'menu'; // menu | flight | chute | vehicle | balloon | rocket | crash | landed | ground
let orbitAng = 0;
let clock = new THREE.Clock();
let spawnPadPrompt = false;
let ringPulse = 0;
let _wasOnGround = false;
let paused = false;
let duskOn = false;
let _airportToast = false;
let pathPip = null;
let _walkHint = false;

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
    marine = createMarine(scene);
    fieldOps = createFieldOps(scene);
    {
      const baseClassify = world.classifySurface.bind(world);
      world.classifySurface = (x, z) => fieldOps.classify(x, z) || baseClassify(x, z);
    }
    setLoad(0.58);
    {
      const have = new Set(loadStars());
      world.root?.traverse((o) => {
        if (o.name === 'hidestar' && have.has(o.userData.starId)) o.visible = false;
      });
    }
    effects = new Effects(scene);
    modes = new ModeManager(scene);
    hud = new HUD();
    controls = new Controls();
    checklist = new Checklist();
    audio = new GameAudio();
    course = new FlightCourse(scene);
    const unlockAudio = () => audio.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
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
    controls.bindStick(canvas);
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
  buildMissionBoard(document.getElementById('mission-board'), {
    onPick: (id) => {
      pendingMission = missionById(id);
      const best = pendingMission.best.map((a) => displayNameFor(a, a)).join(', ');
      hud?.toast?.(`${pendingMission.name} — pick a ship. BEST: ${best}`);
      if (el.status) el.status.textContent = `${pendingMission.name}: ${pendingMission.brief}`;
    }
  });
}

function wireButtons() {
  document.getElementById('btn-motion').addEventListener('click', async () => {
    await controls.requestMotion();
    el.status.textContent = controls.motionMsg;
  });
  document.getElementById('btn-recenter')?.addEventListener('click', () => {
    controls.recenter();
    hud.toast('Tilt recentered');
  });
  document.getElementById('btn-weather')?.addEventListener('click', () => {
    document.getElementById('weather-sheet')?.classList.toggle('hidden');
    syncWeatherUi();
  });
  document.getElementById('btn-wx-fly')?.addEventListener('click', () => {
    document.getElementById('weather-sheet')?.classList.toggle('hidden');
    syncWeatherUi();
  });
  document.getElementById('wx-close')?.addEventListener('click', () => {
    document.getElementById('weather-sheet')?.classList.add('hidden');
  });
  document.querySelectorAll('[data-wx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = setWeather(btn.dataset.wx);
      applyWorldWeather();
      syncWeatherUi();
      hud?.toast?.(`${p.label} — ${p.blurb}`);
    });
  });
  document.getElementById('btn-eject')?.addEventListener('click', () => tryEject());
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    if (currentSpec) startFlight(currentSpec.id);
  });
  document.getElementById('btn-hangar')?.addEventListener('click', () => showHangar());
  document.getElementById('btn-respawn')?.addEventListener('click', () => teleportAirport());
  document.getElementById('btn-land-again')?.addEventListener('click', () => {
    if (currentSpec) startFlight(currentSpec.id);
  });
  document.getElementById('btn-land-hangar')?.addEventListener('click', () => showHangar());
  document.getElementById('btn-land-explore')?.addEventListener('click', () => {
    el.landed.classList.add('hidden');
    gameMode = 'flight';
    showFlightUI(true);
    if (currentSpec) checklist.setAircraft(currentSpec);
    hud.toast('Free explore — JUMP anytime');
  });
  document.getElementById('btn-swoop')?.addEventListener('pointerdown', () => {
    modes.swoop = true;
    document.getElementById('btn-swoop').classList.add('on');
  });
  document.getElementById('btn-swoop')?.addEventListener('pointerup', () => {
    modes.swoop = false;
    document.getElementById('btn-swoop').classList.remove('on');
  });
  document.getElementById('btn-dive')?.addEventListener('pointerdown', () => {
    modes.dive = true;
    document.getElementById('btn-dive').classList.add('on');
  });
  document.getElementById('btn-dive')?.addEventListener('pointerup', () => {
    modes.dive = false;
    document.getElementById('btn-dive').classList.remove('on');
  });
  document.getElementById('btn-bike')?.addEventListener('click', () => spawnVehicle('bike'));
  document.getElementById('btn-car')?.addEventListener('click', () => spawnVehicle('car'));
  document.getElementById('btn-exit-veh')?.addEventListener('click', () => exitVehicle());
  document.getElementById('btn-deploy')?.addEventListener('click', () => deployCanopy());
  document.getElementById('btn-board')?.addEventListener('click', () => boardNearest());
  document.getElementById('btn-walk-ramp')?.addEventListener('click', () => {
    beginWalk(new THREE.Vector3(WORLD.hangar.x + 20, 2, WORLD.hangar.z + 20));
  });
  document.getElementById('btn-teleport')?.addEventListener('click', () => teleportAirport());
  document.getElementById('btn-mute')?.addEventListener('click', () => {
    const on = audio?.toggleMute?.();
    document.getElementById('btn-mute').textContent = on ? 'Sound off' : 'Sound on';
  });
  document.getElementById('btn-dusk')?.addEventListener('click', () => {
    duskOn = !duskOn;
    applyWorldWeather();
    document.getElementById('btn-dusk').textContent = duskOn ? 'Dusk' : 'Day';
  });
  document.getElementById('btn-pause')?.addEventListener('click', () => setPaused(true));
  document.getElementById('btn-resume')?.addEventListener('click', () => setPaused(false));
  document.getElementById('btn-pause-hangar')?.addEventListener('click', () => {
    setPaused(false);
    showHangar();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (gameMode !== 'menu') setPaused(!paused);
    }
    if (e.code === 'KeyE') {
      if (gameMode === 'walk') boardNearest();
      else if (gameMode === 'vehicle') exitVehicle();
      else if (gameMode === 'flight' && flight?.onGround && flight.getSpeed() < 8) exitToWalk();
    }
    if (e.code === 'Space' || e.code === 'KeyC') {
      if (gameMode === 'skydive' || gameMode === 'wingsuit') {
        e.preventDefault();
        deployCanopy();
      }
    }
  });
}

function syncWeatherUi() {
  const lab = document.getElementById('wx-readout');
  const blurb = document.getElementById('wx-blurb');
  if (lab) lab.textContent = weatherLabel();
  if (blurb) blurb.textContent = currentPreset().blurb;
  document.querySelectorAll('[data-wx]').forEach((b) => {
    b.classList.toggle('on', b.dataset.wx === weather.preset);
  });
  const top = document.getElementById('btn-weather');
  if (top) top.textContent = currentPreset().label;
}

function applyWorldWeather() {
  world?.setFog?.(weather.fog || 0.00018, duskOn);
}

function setPaused(on) {
  paused = !!on;
  document.getElementById('pause')?.classList.toggle('hidden', !paused);
}

function showHangar() {
  cleanupCraft();
  modes.clearActive();
  course?.clear();
  audio?.hush();
  paused = false;
  document.getElementById('pause')?.classList.add('hidden');
  gameMode = 'menu';
  el.menu.classList.remove('hidden');
  el.crash.classList.add('hidden');
  el.landed.classList.add('hidden');
  el.infoSheet.classList.add('hidden');
  showFlightUI(false);
  el.groundUi.classList.add('hidden');
  hud.hideChecklist();
  hud.setMission('');
  checklist?.hide();
  setupHangarAndHelp();
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

function startFlight(id, opts = {}) {
  const spec = getAircraft(id);
  currentSpec = spec;
  cleanupCraft();
  const walkPos = modes.pos.clone();
  const walkHdg = modes.heading || 0;
  if (modes.mode === 'walk' && modes._dino) modes._dino.visible = false;
  modes.mode = 'none';
  modes.mesh = null;

  flight = new FlightModel(spec);
  const spawn = new THREE.Vector3(-8, 2, -WORLD.runway.halfL + 30);
  if (opts.fromPos) {
    spawn.copy(opts.fromPos);
    spawn.y = (world?.getHeight?.(spawn.x, spawn.z) ?? 0) + 2;
    flight.reset(spawn, opts.heading ?? walkHdg, 0);
  } else if (spec.type === 'glider') {
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
  if (pendingMission) {
    activeMission = pendingMission;
    pendingMission = null;
    if (activeMission.wx) {
      applyWind(activeMission.wx.fromDeg, activeMission.wx.speedKt);
      setStorm(activeMission.wx.storm || 0);
    }
    const fit = fitLabel(activeMission, spec.id);
    hud.toast(`${activeMission.name} · ${fit} · ${activeMission.brief}`, 4);
  }
  gameMode = 'flight';
  _wasOnGround = true;
  paused = false;
  _airportToast = false;
  document.getElementById('pause')?.classList.add('hidden');
  const tip = spec.isHeli
    ? 'Raise COLL to hover'
    : spec.type === 'glider'
      ? 'Energy management — spoilers for path'
      : `Taxi anywhere — rotate ~${msToKt(spec.vr).toFixed(0)} kt`;
  hud.toast(`${label} — ${tip} · sandbox: take off from here`);
  const kind = activeMission?.kind || testKindFor(spec);
  if (activeMission?.noRings) {
    course?.clear();
    hud.setMission(activeMission.name);
  } else {
    course?.layoutFor(spec, kind);
    hud.setMission(`${(activeMission?.name || kind).toUpperCase()} 0/${course.total} rings`);
  }
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
    if (o.name === 'flap') o.rotation.x = (flight.flaps || 0) * 0.5;
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

function buzz(ms = 18) {
  try { navigator.vibrate?.(ms); } catch (_) { /* ignore */ }
}

function tryEject() {
  if (gameMode !== 'flight' || !flight || !currentSpec) return;
  if (!currentSpec.ejectOk) {
    hud.toast('No eject on this aircraft');
    return;
  }
  if (flight.getAltitude() < 30 && flight.onGround) {
    if (tryBoardSpecial()) return;
    if (flight.getSpeed() < 8) {
      exitToWalk();
      return;
    }
    hud.toast('Too low / too fast to jump — stop first or climb');
    return;
  }
  const pos = flight.position.clone();
  const vel = flight.velocity.clone();
  cleanupCraft();
  modes.startSkydive(pos, vel);
  gameMode = modes.mode === 'wingsuit' ? 'wingsuit' : 'skydive';
  hud.setMode(gameMode === 'wingsuit' ? 'WINGSUIT' : 'FREEFALL');
  hud.hideChecklist();
  el.groundUi.classList.remove('hidden');
  document.getElementById('btn-bike').classList.add('hidden');
  document.getElementById('btn-car').classList.add('hidden');
  document.getElementById('btn-swoop').classList.remove('hidden');
  document.getElementById('btn-dive').classList.remove('hidden');
  document.getElementById('btn-deploy')?.classList.remove('hidden');
  document.getElementById('btn-board')?.classList.add('hidden');
  hud.toast(modes.hasWingsuit
    ? 'Wingsuit — fly your body. DEPLOY when you want the canopy'
    : 'Freefall — TRACK/DIVE your body, then DEPLOY');
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

function deployCanopy() {
  if (gameMode !== 'skydive' && gameMode !== 'wingsuit') return;
  if (!modes.deployCanopy()) return;
  gameMode = 'chute';
  hud.setMode('CHUTE');
  document.getElementById('btn-deploy')?.classList.add('hidden');
  document.getElementById('btn-swoop').classList.remove('hidden');
  document.getElementById('btn-dive').classList.remove('hidden');
  hud.toast('Canopy out — DIVE to build energy, SWOOP to flare and skim');
}

function onChuteLand(pos) {
  const landPos = pos.clone();
  modes.clearActive();
  beginWalk(landPos);
  modes.parkRides(landPos, { water: false });
  hud.toast('Rides dropped next to you — BOARD the bike or car, or AIRPORT');
}

function beginWalk(fromPos) {
  modes.startWalk(fromPos || modes.pos, modes.heading || 0);
  gameMode = 'walk';
  hud.setMode('DINO');
  hud.setAircraft('Dino Pilot');
  showFlightUI(false);
  el.menu.classList.add('hidden');
  el.crash.classList.add('hidden');
  el.groundUi.classList.remove('hidden');
  document.getElementById('btn-swoop').classList.add('hidden');
  document.getElementById('btn-dive').classList.add('hidden');
  document.getElementById('btn-bike').classList.remove('hidden');
  document.getElementById('btn-car').classList.remove('hidden');
  document.getElementById('btn-exit-veh')?.classList.add('hidden');
  document.getElementById('btn-deploy')?.classList.add('hidden');
  document.getElementById('btn-board')?.classList.remove('hidden');
}

function exitToWalk() {
  const p = flight ? flight.position.clone() : modes.pos.clone();
  const hdg = flight ? flight.euler.y : modes.heading;
  cleanupCraft();
  beginWalk(p);
  modes.heading = hdg;
  hud.toast('Out of the aircraft — walk the ramp');
}

function exitVehicle() {
  if (gameMode !== 'vehicle' && gameMode !== 'boat' && modes.mode !== 'bike' && modes.mode !== 'car' && modes.mode !== 'boat') return;
  const p = modes.pos.clone();
  p.x += Math.sin(modes.heading + 1.2) * 3;
  p.z += Math.cos(modes.heading + 1.2) * 3;
  beginWalk(p);
  hud.toast('Dismounted');
}

function boardNearest() {
  const n = modes.nearestBoardable();
  if (!n) {
    hud.toast('Walk closer to a parked plane, bike, or car');
    return;
  }
  if (n.kind === 'wingsuit') {
    modes.hasWingsuit = true;
    const dw = modes._dino?.getObjectByName('dinoWings');
    if (dw) dw.visible = true;
    hud.toast('Wingsuit on — JUMP from a plane and fly it, then DEPLOY');
    return;
  }
  if (n.kind === 'boat') {
    modes.startBoat(modes.pos.clone());
    gameMode = 'boat';
    hud.setMode('BOAT');
    document.getElementById('btn-exit-veh')?.classList.remove('hidden');
    hud.toast('Boat — throttle to shore, then hop out');
    return;
  }
  if (n.kind === 'plane') {
    startFlight(n.id, { fromPos: modes.pos.clone(), heading: modes.heading });
    return;
  }
  if (n.kind === 'bike' || n.kind === 'car') {
    spawnVehicle(n.kind);
    return;
  }
  if (n.kind === 'balloon') {
    modes.startBalloon();
    gameMode = 'balloon';
    hud.setMode('BALLOON');
    return;
  }
  if (n.kind === 'rocket') {
    modes.startRocket();
    gameMode = 'rocket';
    hud.setMode('ROCKET');
  }
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
  hud.toast(`${kind === 'bike' ? 'Bike — lean it, easy high-side' : 'Car — planted, understeers at speed'} · E or EXIT to hop off`);
  document.getElementById('btn-exit-veh')?.classList.remove('hidden');
  document.getElementById('btn-board')?.classList.add('hidden');
  if (modes._dino) modes._dino.visible = false;
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

function showStandard(msg, fail = false) {
  const elStd = document.getElementById('standard-banner');
  if (!elStd) {
    hud.toast(msg, 3.2);
    return;
  }
  elStd.textContent = msg;
  elStd.classList.toggle('fail', !!fail);
  elStd.classList.remove('hidden');
  clearTimeout(showStandard._t);
  showStandard._t = setTimeout(() => elStd.classList.add('hidden'), 4200);
}

function handleWreckWalk(reason) {
  const p = flight?.position?.clone?.() || modes.pos.clone();
  cleanupCraft();
  beginWalk(p);
  const wet = world?.isWater?.(p.x, p.z);
  modes.parkRides(p, { water: !!wet });
  hud.toast(reason || 'Walked away — rides nearby');
  showStandard(reason || 'Airframe done. You lived.', true);
}

function handleCrash(reason) {
  if (flight && craftMesh) {
    effects.explode(flight.position.clone());
  }
  if (modes.mesh) {
    effects.explode(modes.pos.clone());
  }
  audio?.crash();
  audio?.hush();
  buzz(40);
  const ringsHit = course?.hit || 0;
  const result = scoreTest({
    ringsHit,
    ringsTotal: course?.total || 0,
    landScore: null,
    crashed: true
  });
  gameMode = 'crash';
  const tip = crashTip(reason);
  el.crashMsg.textContent = `${reason || 'Impact'} · ${tip}`;
  el.crash.classList.remove('hidden');
  showFlightUI(false);
  el.groundUi.classList.add('hidden');
  hud.hideChecklist();
  hud.setMission('');
  checklist?.hide();
  hud.setMode('CRASH');
}

function crashTip(reason = '') {
  const r = String(reason).toLowerCase();
  if (r.includes('hard') || r.includes('impact') || r.includes('sink')) return 'ATP tip: flare and idle — sink under ~240 fpm';
  if (r.includes('fast')) return 'ATP tip: bleed to Vref before the threshold';
  if (r.includes('gear')) return 'ATP tip: three green before flare';
  if (r.includes('water') || r.includes('ditch')) return 'ATP tip: only the amphib is rated for the lake';
  if (r.includes('building') || r.includes('hangar') || r.includes('house')) return 'Buildings end the airframe. Walk away if you can.';
  if (r.includes('forest') || r.includes('tree')) return 'A few trees you might live. The woods will take a wing.';
  if (r.includes('pull') || r.includes('wingsuit impact') || r.includes('canopy smash')) {
    return 'Pull higher, then dive and SWOOP late to skim';
  }
  if (r.includes('bike') || r.includes('car') || r.includes('hit') || r.includes('high-side') || r.includes('lake')) {
    return 'Slow down before buildings, woods, hangar, and water';
  }
  return 'You can retry or hangar — sandbox still wants you flying';
}

function handleLanding(info) {
  const spec = currentSpec;
  const pos = flight?.position?.clone?.() || modes.pos.clone();
  if (info.surface === 'water') {
    effects.splash(pos, Math.min(2, 0.6 + (info.vert || 1)));
  } else {
    effects.landingDust(pos, Math.min(2, 0.5 + (info.vert || 1)));
  }
  const result = scoreTest({
    ringsHit: course?.hit || 0,
    ringsTotal: course?.total || 0,
    landScore: info.score,
    crashed: false
  });
  if (spec) saveBest(spec.id, result);
  if (activeMission && spec) {
    saveMissionResult(activeMission.id, spec.id, result.points);
  }
  const atpFail = !!(info.standardFail || info.score?.fail || result.medal === 'none');
  const pad = world?.nearestPad?.(pos.x, pos.z);
  if (pad?.later) {
    hud.toast(`Landed ${pad.name}`, 3);
    showStandard(`FIELD: ${pad.name.toUpperCase()} · ${atpFail ? 'ATP fail, still down' : 'nice arrival'}`, atpFail);
  }
  const medal = MEDAL[result.medal]?.label || result.grade;
  const sink = info.vert != null ? `${info.vert.toFixed(1)} m/s sink` : '';
  const issues = info.score?.issues?.length ? info.score.issues.join(', ') : '';
  const std = atpFail
    ? `ATP STANDARD: FAIL${issues ? ' — ' + issues : ''} · still flying`
    : `ATP STANDARD: PASS · ${medal} ${result.points}/100`;
  showStandard(`${std} · ${sink}`, atpFail);
  hud.toast(atpFail ? 'Keep going — that would not pass a checkride' : `Nice — ${medal}`, 2.8);
  if (result.medal === 'gold' || result.medal === 'silver') audio?.medal();
  else audio?.land((info.vert || 2) < 2);
  const medalEl = document.getElementById('land-medal');
  if (medalEl) medalEl.textContent = medal === '—' ? '' : medal;
  const surf = world?.classifySurface?.(pos.x, pos.z);
  if (info.surface === 'water' || surf?.id === 'water') {
    modes.parkRides(pos, { water: true });
    hud.toast('Boat standing by — BOARD it to reach shore');
  } else if (surf && surf.id !== 'runway') {
    hud.toast(`${surf.id} landing — you can take off again if it is flat enough`);
  }
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
    const desired = targetPos.clone().addScaledVector(back, 18 + Math.min(55, speed * 0.14)).addScaledVector(up, 6 + Math.min(10, speed * 0.03));
    // Tiny speed-based camera lag (chase only) — higher speed → slightly softer follow
    const lag = Math.min(0.012, speed * 0.000035);
    const follow = Math.max(0.0004, 0.001 - lag);
    camera.position.lerp(desired, 1 - Math.pow(follow, dt));
    const look = targetPos.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(quat), 20);
    look.y += 2;
    camera.lookAt(look);
  }
}

function updateHudConfig() {
  if (!flight) return;
  const flare = flight.approachPhase === 'flare_window';
  const phase = flight.approachPhase;
  const takeoffPhase = !!(flight.onGround && flight.airborneTime < 1);
  const shortFinal = phase === 'short_final' || phase === 'flare_window';
  const showVSpeeds = takeoffPhase || shortFinal || !!(flight.onGround && flight.rotateReady);
  const flapLabel = (() => {
    if (!currentSpec) return null;
    if (takeoffPhase || flight.onGround) {
      if (currentSpec.flapTakeoff == null) return null;
      const labs = currentSpec.flapLabels;
      const steps = currentSpec.flapSteps || [];
      let li = steps.findIndex((v) => Math.abs(v - currentSpec.flapTakeoff) < 0.05);
      const tip = (li >= 0 && labs?.[li]) ? labs[li] : `${Math.round(currentSpec.flapTakeoff * 100)}%`;
      return `TO FLAPS ${tip}`;
    }
    if (shortFinal && currentSpec.flapLanding != null) {
      const labs = currentSpec.flapLabels;
      const steps = currentSpec.flapSteps || [];
      let li = steps.findIndex((v) => Math.abs(v - currentSpec.flapLanding) < 0.05);
      const tip = (li >= 0 && labs?.[li]) ? labs[li] : `${Math.round(currentSpec.flapLanding * 100)}%`;
      return `LDG FLAPS ${tip}`;
    }
    return null;
  })();
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
    smoke: !!controls.smokeOn,
    n1: flight._engineN1,
    showVSpeeds,
    takeoffPhase,
    shortFinal,
    vrHint: (showVSpeeds && currentSpec?.vr != null) ? `Vr ${Math.round(currentSpec.vr * 1.94384)}` : null,
    vrefHint: (showVSpeeds && currentSpec?.vref != null) ? `Vref ${Math.round(currentSpec.vref * 1.94384)}` : null,
    flapHint: showVSpeeds ? flapLabel : null
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
  if (paused) {
    if (renderer) renderer.render(scene, camera);
    return;
  }
  controls.update();
  effects.update(dt);
  world?.update?.(dt);
  marine?.update?.(dt);
  fieldOps?.update?.(dt);
  updateWeather(dt);
  applyWorldWeather();
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
    const ev = flight.update(dt, th, water, world);
    syncMesh();
    updateHudConfig();
    if (course) {
      const gained = course.update(flight.position);
      if (gained) {
        audio?.ring();
        buzz(12);
        hud.setMission(`${(course.kind || 'TEST').toUpperCase()} ${course.hit}/${course.total} rings`);
        hud.toast(`Ring ${course.hit}/${course.total}`);
      }
      course.pulse(ringPulse);
    }
    audio?.setFlight(flight.throttle || flight.collective || 0, flight.getSpeed(), flight.stalling, flight.onGround);
    if (flight.onGround && !world.isOnRunway(flight.position.x, flight.position.z) && flight.getGroundSpeed() > 14) {
      if (!loop._rumble || performance.now() - loop._rumble > 220) {
        loop._rumble = performance.now();
        try { navigator.vibrate?.(8); } catch (_) { /* ignore */ }
      }
    }

    for (const s of STARS) {
      const dx = flight.position.x - s.x, dy = flight.position.y - s.y, dz = flight.position.z - s.z;
      if (dx * dx + dy * dy + dz * dz < 22 * 22 && saveStar(s.id)) {
        audio?.medal();
        buzz(30);
        hud.toast(`Star ${loadStars().length}/5`);
        world?.root?.traverse?.((o) => {
          if (o.name === 'hidestar' && o.userData.starId === s.id) o.visible = false;
        });
      }
    }

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
      const spray = flight.stepSpray ?? (flight.onStep ? 1 : 0.3);
      effects.wake(flight.position, (flight.onStep ? spd * 1.4 : spd * 0.55) * (0.6 + spray));
      if (spray > 0.2) effects.splash(flight.position.clone(), 0.35 + spray * 0.7);
      if (flight.onStep && !flight._stepToast) {
        flight._stepToast = true;
        hud.toast('ON THE STEP — spray up, drag down');
      }
      if (!flight.onStep) flight._stepToast = false;
    }
    // Touchdown FX edge
    if (!_wasOnGround && flight.onGround) {
      if (water) effects.splash(flight.position.clone(), 1);
      else effects.landingDust(flight.position.clone(), 0.8);
    }
    _wasOnGround = flight.onGround;

    if (ev?.event === 'crash') {
      handleCrash(ev.reason);
    } else if (ev?.event === 'wreck_walk') {
      handleWreckWalk(ev.reason);
    } else if (ev?.event === 'bounce' || ev?.event === 'rough') {
      showStandard(`ATP STANDARD: FAIL — ${ev.reason || 'unstable'} · keep flying`, true);
      effects.landingDust(flight.position.clone(), 1.1);
    } else if (ev?.event === 'land') {
      handleLanding({ ...ev, surface: ev.surface || 'water' });
    } else if (ev?.event === 'touchdown') {
      const onRwy = world.isOnRunway(flight.position.x, flight.position.z);
      handleLanding({
        ...ev,
        surface: onRwy ? 'runway' : 'field',
        standardFail: !onRwy && currentSpec?.runwayOnly
      });
    }

    if (flight.position.y < -50) handleCrash('lost');

    if (!pathPip) {
      pathPip = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x7cff9a, transparent: true, opacity: 0.7 })
      );
      scene.add(pathPip);
    }
    {
      const vy = flight.velocity.y;
      const aglPip = flight.position.y - th;
      if (!flight.onGround && vy < -0.5 && aglPip < 420) {
        const tHit = Math.min(12, aglPip / Math.max(0.35, -vy));
        pathPip.visible = true;
        pathPip.position.copy(flight.position).addScaledVector(flight.velocity, tHit);
        pathPip.position.y = Math.max(th + 1.2, pathPip.position.y);
      } else {
        pathPip.visible = false;
      }
    }

    updateCamera(dt, flight.position, flight.quaternion, flight.getSpeed());
    hud.update(dt, {
      alt: flight.getAltitude(),
      speed: flight.getAirspeed ? flight.getAirspeed() : flight.getSpeed(),
      gs: flight.getGroundSpeed ? flight.getGroundSpeed() : flight.getSpeed(),
      vs: flight.getVerticalSpeed(),
      x: flight.position.x,
      z: flight.position.z,
      heading: flight.euler.y,
      nav: `APT ${Math.round(Math.hypot(flight.position.x - WORLD.hangar.x, flight.position.z - WORLD.hangar.z))} m`,
      wx: weatherLabel()
    });
  }

  if (gameMode === 'chute' || gameMode === 'vehicle' || gameMode === 'balloon' || gameMode === 'rocket' || gameMode === 'walk' || gameMode === 'skydive' || gameMode === 'wingsuit' || gameMode === 'boat') {
    const ev = modes.update(dt, controls, world);
    if (ev?.event === 'chute_land') onChuteLand(ev.pos);
    if (ev?.event === 'walk_state') {
      const n = ev.near;
      const board = document.getElementById('btn-board');
      if (board) {
        board.textContent = n ? `BOARD ${n.name}` : 'BOARD';
        board.classList.toggle('on', !!n);
      }
      if (n && !_walkHint) {
        _walkHint = true;
        hud.toast(`E / BOARD — ${n.name}`);
      }
    }
    if (ev?.event === 'airport_arrive' && !_airportToast) {
      _airportToast = true;
      hud.toast('Back at the airport — teleport or hangar');
    }
    if (ev?.event === 'skydive_state') {
      const tag = ev.kind === 'suit' ? 'SUIT' : 'FALL';
      const glide = ev.glide ? ` · GR ${ev.glide.toFixed(1)}` : '';
      hud.setMission(`${tag} ${Math.round(ev.agl)} m AGL · ${Math.round(ev.speed)} m/s${glide} · DEPLOY`);
    }
    if (ev?.event === 'chute_state') {
      if (ev.opening) hud.setMission('CANOPY OPENING');
      else if (ev.skimming) hud.setMission(`SKIM ${Math.round(ev.speed)} m/s · ${ev.agl.toFixed(0)} m AGL`);
    }
    if (ev?.event === 'crash') handleCrash(ev.reason);
    if (ev?.event === 'balloon_land') {
      hud.toast('Balloon down — you can walk, grab a ride, or AIRPORT');
      modes.parkRides(modes.pos.clone(), { water: world?.isWater?.(modes.pos.x, modes.pos.z) });
      beginWalk(modes.pos.clone());
    }
    if (ev?.event === 'boat_beach') {
      hud.toast('Beached — bike and car waiting');
      modes.parkRides(ev.pos || modes.pos, { water: false });
      beginWalk(ev.pos || modes.pos);
    }
    if (ev?.event === 'wreck_walk') handleWreckWalk(ev.reason);
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
    updateCamera(dt, pos, ['rocket', 'balloon', 'skydive', 'wingsuit'].includes(gameMode) ? modes.mesh?.quaternion : q, spd);
    hud.update(dt, {
      alt: pos.y,
      speed: spd,
      vs: modes.vel.y,
      x: pos.x,
      z: pos.z,
      heading: modes.heading || 0,
      nav: `APT ${Math.round(Math.hypot(pos.x - WORLD.hangar.x, pos.z - WORLD.hangar.z))} m`
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
