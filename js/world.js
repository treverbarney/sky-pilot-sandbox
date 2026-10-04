import * as THREE from 'three';
import {
  makeToonPbr,
  makeFarLambert,
  getTextures,
  getEnvMap,
  QUALITY,
  getQualityKey
} from './materials.js';

/** World extents (m) — compact exploreable sandbox */
export const WORLD = {
  size: 4000,
  airport: { x: 0, z: 0 },
  runway: { halfW: 25, halfL: 900, heading: 0 },
  lake: { x: 600, z: -400, r: 280 },
  city: { x: -500, z: 400 },
  hangar: { x: -80, z: -40 },
  balloonPad: { x: 60, z: -80 },
  rocketPad: { x: 120, z: -100 },
  wingsuitRack: { x: -52, z: -18 },
  mountains: [
    { x: -900, z: -800, h: 420, r: 350 },
    { x: 1100, z: 700, h: 380, r: 300 },
    { x: -200, z: 1100, h: 280, r: 250 },
    { x: 900, z: -1000, h: 500, r: 400 }
  ],
  forest: { x: 280, z: 720, r: 340 },
  suburbs: { x: -500, z: 400, inner: 160, outer: 420 },
  flats: [
    { id: 'farm-north', name: 'North farm', x: 80, z: 520, r: 70 },
    { id: 'prairie-east', name: 'East prairie', x: 980, z: -80, r: 80 },
    { id: 'meadow-south', name: 'South meadow', x: -40, z: -1180, r: 75 },
    { id: 'clearing-west', name: 'West clearing', x: -980, z: 80, r: 72 },
    { id: 'ridge-flat', name: 'Ridge flat', x: 420, z: 1080, r: 55 }
  ],
  roads: [
    { ax: 0, az: 0, bx: -500, bz: 400 },
    { ax: -500, az: 400, bx: 280, bz: 720 },
    { ax: 0, az: 0, bx: 600, bz: -400 },
    { ax: 0, az: 0, bx: 80, bz: 520 },
    { ax: -80, az: -40, bx: -500, bz: 400 }
  ]
};

export const WIND = { x: 3.2, z: 1.4 };

export const LANDMARKS = [
  { id: 'rwy', name: 'RWY', x: 0, z: 0 },
  { id: 'hangar', name: 'HGR', x: -80, z: -40 },
  { id: 'lake', name: 'LAKE', x: 600, z: -400 },
  { id: 'city', name: 'CITY', x: -500, z: 400 },
  { id: 'npeak', name: 'PEAK', x: -200, z: 1100 },
  { id: 'wpeak', name: 'WEST', x: -900, z: -800 },
  { id: 'suit', name: 'SUIT', x: -52, z: -18 },
  { id: 'balloon', name: 'BAL', x: 60, z: -80 },
  { id: 'forest', name: 'WOODS', x: 280, z: 720 },
  { id: 'farm', name: 'FARM', x: 80, z: 520 },
  { id: 'suburb', name: 'SUB', x: -720, z: 220 },
  { id: 'prairie', name: 'FLAT', x: 980, z: -80 }
];

export const STARS = [
  { id: 'star-lake', x: 600, y: 55, z: -400 },
  { id: 'star-city', x: -500, y: 90, z: 400 },
  { id: 'star-peak', x: -200, y: 250, z: 1100 },
  { id: 'star-west', x: -900, y: 300, z: -800 },
  { id: 'star-field', x: 280, y: 35, z: 220 }
];

/** Later-game landing spots — fly there when you want a new target. */
export const LANDING_PADS = [
  { id: 'home', name: 'Home runway', x: 0, z: 0, r: 45, later: false },
  { id: 'road-city', name: 'City highway', x: -250, z: 200, r: 28, later: true },
  { id: 'lake-beach', name: 'Lake beach', x: 420, z: -520, r: 30, later: true },
  { id: 'city-lot', name: 'City lot', x: -500, z: 400, r: 24, later: true },
  { id: 'north-shelf', name: 'North shelf', x: -180, z: 980, r: 28, later: true },
  { id: 'west-meadow', name: 'West meadow', x: -720, z: -620, r: 32, later: true },
  { id: 'east-field', name: 'East field', x: 860, z: 180, r: 30, later: true },
  { id: 'farm-north', name: 'North farm', x: 80, z: 520, r: 55, later: true },
  { id: 'prairie-east', name: 'East prairie', x: 980, z: -80, r: 60, later: true },
  { id: 'meadow-south', name: 'South meadow', x: -40, z: -1180, r: 55, later: true },
  { id: 'clearing-west', name: 'West clearing', x: -980, z: 80, r: 55, later: true }
];

function groundColor(x, z) {
  const dx = x - WORLD.lake.x, dz = z - WORLD.lake.z;
  if (dx * dx + dz * dz < WORLD.lake.r * WORLD.lake.r) return null;
  if (Math.abs(x) < WORLD.runway.halfW + 5 && Math.abs(z) < WORLD.runway.halfL + 20) {
    return new THREE.Color(0x3a3a44);
  }
  if (Math.abs(x) < 200 && Math.abs(z) < 1000) return new THREE.Color(0x3a6e38);
  const cx = x - WORLD.city.x, cz = z - WORLD.city.z;
  if (Math.abs(cx) < 160 && Math.abs(cz) < 160) return new THREE.Color(0x4a4a54);
  const sx = x - WORLD.suburbs.x, sz = z - WORLD.suburbs.z;
  const sd = Math.hypot(sx, sz);
  if (sd < WORLD.suburbs.outer && sd > WORLD.suburbs.inner) return new THREE.Color(0x6a7a58);
  const fx = x - WORLD.forest.x, fz = z - WORLD.forest.z;
  if (fx * fx + fz * fz < WORLD.forest.r * WORLD.forest.r) return new THREE.Color(0x2d5a32);
  for (const f of WORLD.flats) {
    const ddx = x - f.x, ddz = z - f.z;
    if (ddx * ddx + ddz * ddz < f.r * f.r) return new THREE.Color(0x7a9a4a);
  }
  const n = Math.sin(x * 0.01) * Math.cos(z * 0.01);
  const n2 = Math.sin(x * 0.003 + z * 0.004);
  if (n2 > 0.55) return new THREE.Color(0x5a7a42);
  return n > 0.2 ? new THREE.Color(0x457838) : new THREE.Color(0x548a44);
}

/**
 * @param {THREE.Scene} scene
 * @param {{ qualityKey?: string }} [opts]
 */
export function createWorld(scene, opts = {}) {
  const qualityKey = opts.qualityKey || getQualityKey();
  const q = QUALITY[qualityKey] || QUALITY.medium;
  const tex = getTextures() || {};
  const useStd = q.useStandardWorld;

  const root = new THREE.Group();
  root.name = 'world';

  // Sky + fog — stylized depth
  scene.background = new THREE.Color(0x6ec8ff);
  scene.fog = new THREE.FogExp2(0xb8d8f4, 0.00018);
  if (getEnvMap()) scene.environment = getEnvMap();

  // Lighting — warm key, cool fill
  const hemi = new THREE.HemisphereLight(0xd8f0ff, 0x4a7a3a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d2, 1.35);
  sun.position.set(280, 480, 160);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8ec8ff, 0.42);
  fill.position.set(-200, 120, -180);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x607888, 0.28));

  // Cartoon sun disc
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(46, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false })
  );
  sunBall.position.set(620, 520, 280);
  root.add(sunBall);
  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(70, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, fog: false })
  );
  sunHalo.position.copy(sunBall.position);
  root.add(sunHalo);

  // Ground — vertex color base + optional grass detail map
  const segs = 80;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const uvs = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let y = 0;
    for (const m of WORLD.mountains) {
      const dx = x - m.x, dz = z - m.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < m.r) {
        const t = 1 - d / m.r;
        y += m.h * t * t;
      }
    }
    y += Math.sin(x * 0.008) * Math.cos(z * 0.007) * 12;
    pos.setY(i, y);
    // Tile UV for grass detail (~40 m repeat)
    if (uvs) {
      uvs.setXY(i, x / 40, z / 40);
    }
    const c = groundColor(x, z);
    if (c) {
      if (y > 260) c.lerp(new THREE.Color(0xe8eef5), Math.min(1, (y - 260) / 120));
      else if (y > 180) c.lerp(new THREE.Color(0x8a8a7a), Math.min(0.5, (y - 180) / 100));
      // Rock tint on slopes (mountains)
      if (y > 80 && y < 260) c.lerp(new THREE.Color(0x6a6558), Math.min(0.35, (y - 80) / 200));
      colors.push(c.r, c.g, c.b);
    } else {
      colors.push(0.12, 0.32, 0.52);
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv2', geo.attributes.uv.clone());
  geo.computeVertexNormals();

  let groundMat;
  if (useStd && tex.grass) {
    const gmap = tex.grass.clone();
    gmap.wrapS = gmap.wrapT = THREE.RepeatWrapping;
    gmap.colorSpace = THREE.SRGBColorSpace;
    groundMat = new THREE.MeshStandardMaterial({
      map: gmap,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.2,
      flatShading: false,
      fog: true
    });
    if (getEnvMap()) groundMat.envMap = getEnvMap();
  } else {
    groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  }
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  root.add(ground);

  // Lake — Standard specular surface
  const lakeOuter = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.lake.r + 12, 48),
    useStd
      ? makeToonPbr({ color: 0x1a4a6a, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.2 })
      : makeFarLambert(0x1a4a6a)
  );
  lakeOuter.rotation.x = -Math.PI / 2;
  lakeOuter.position.set(WORLD.lake.x, 1.15, WORLD.lake.z);
  root.add(lakeOuter);

  let lakeMat;
  if (useStd) {
    lakeMat = makeToonPbr({
      color: 0x1a5a7a,
      map: tex.water || null,
      roughness: 0.25,
      metalness: 0.3,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: 0.92
    });
  } else {
    lakeMat = makeFarLambert(0x2a78b8, tex.water || null, { transparent: true, opacity: 0.92 });
  }
  if (tex.water) {
    const wm = tex.water.clone();
    wm.wrapS = wm.wrapT = THREE.RepeatWrapping;
    wm.repeat.set(4, 4);
    wm.colorSpace = THREE.SRGBColorSpace;
    lakeMat.map = wm;
  }
  const lake = new THREE.Mesh(new THREE.CircleGeometry(WORLD.lake.r, 48), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(WORLD.lake.x, 1.6, WORLD.lake.z);
  root.add(lake);

  // Shore foam strip
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(WORLD.lake.r - 6, WORLD.lake.r + 4, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd8f0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      fog: true
    })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(WORLD.lake.x, 1.65, WORLD.lake.z);
  root.add(foam);

  const lakeShine = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.lake.r * 0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x66bbee, transparent: true, opacity: 0.22 })
  );
  lakeShine.rotation.x = -Math.PI / 2;
  lakeShine.position.set(WORLD.lake.x + 40, 1.7, WORLD.lake.z - 30);
  root.add(lakeShine);

  // Runway surface with asphalt atlas
  let rwyMat;
  if (useStd) {
    rwyMat = makeToonPbr({
      color: 0xffffff,
      map: tex.runway || null,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.15
    });
  } else {
    rwyMat = makeFarLambert(0x2a2a32, tex.runway || null);
  }
  if (tex.runway && rwyMat.map) {
    rwyMat.map = tex.runway.clone();
    rwyMat.map.wrapS = rwyMat.map.wrapT = THREE.RepeatWrapping;
    rwyMat.map.repeat.set(1, WORLD.runway.halfL / 40);
    rwyMat.map.colorSpace = THREE.SRGBColorSpace;
  }
  const rwy = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.runway.halfW * 2, WORLD.runway.halfL * 2),
    rwyMat
  );
  rwy.rotation.x = -Math.PI / 2;
  rwy.position.y = 0.4;
  root.add(rwy);

  // Extra high-contrast markings (readable landing cues)
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-WORLD.runway.halfW + 1.2, WORLD.runway.halfW - 1.2]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.7, WORLD.runway.halfL * 2 - 20), markMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.52, 0);
    root.add(edge);
  }
  for (let z = -WORLD.runway.halfL + 40; z < WORLD.runway.halfL; z += 58) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 36), markMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.52, z);
    root.add(dash);
  }
  for (const zSign of [-1, 1]) {
    const z0 = zSign * (WORLD.runway.halfL - 50);
    for (let i = 0; i < 6; i++) {
      const x = -16 + i * 6.5;
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 24), markMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(x, 0.53, z0);
      root.add(bar);
    }
    for (const x of [-9, 9]) {
      const ap = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 28), markMat);
      ap.rotation.x = -Math.PI / 2;
      ap.position.set(x, 0.53, zSign * (WORLD.runway.halfL - 220));
      root.add(ap);
    }
  }
  for (const zSign of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const chev = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), markMat);
      chev.rotation.x = -Math.PI / 2;
      chev.position.set(0, 0.53, zSign * (WORLD.runway.halfL - 120 - k * 40));
      root.add(chev);
    }
  }

  // Runway heading is 0 (north-south): designators are 36 / 18, not 09/27.
  // Seven-segment digits scaled to ~20 m so they read on approach. Font has 0-9.
  function addRwyDigit(parent, digit, ox, oz, rotY, mat) {
    const top = [0, 1.28, 1.45, 0.42];
    const mid = [0, 0, 1.28, 0.38];
    const bot = [0, -1.28, 1.45, 0.42];
    const upL = [-0.64, 0.66, 0.42, 1.2];
    const upR = [0.64, 0.66, 0.42, 1.2];
    const loL = [-0.64, -0.66, 0.42, 1.2];
    const loR = [0.64, -0.66, 0.42, 1.2];
    const flag = [0.28, 1.22, 0.7, 0.36];
    const segs = {
      0: [top, bot, upL, upR, loL, loR],
      1: [upR, loR, flag],
      2: [top, mid, bot, upR, loL],
      3: [top, mid, bot, upR, loR],
      4: [mid, upL, upR, loR],
      5: [top, mid, bot, upL, loR],
      6: [top, mid, bot, upL, loL, loR],
      7: [top, upR, loR],
      8: [top, mid, bot, upL, upR, loL, loR],
      9: [top, mid, bot, upL, upR, loR]
    };
    const g = new THREE.Group();
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 3.7),
      new THREE.MeshBasicMaterial({ color: 0x14141c })
    );
    back.rotation.x = -Math.PI / 2;
    back.position.y = -0.02;
    g.add(back);
    for (const [lx, lz, w, d] of segs[digit] || segs[8]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(lx, 0, lz);
      g.add(m);
    }
    g.scale.setScalar(6.8);
    g.position.set(ox, 0.58, oz);
    g.rotation.y = rotY;
    parent.add(g);
  }
  const numMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // Approach from +Z reads "36"; from -Z reads "18"
  addRwyDigit(root, 3, -8.2, WORLD.runway.halfL - 230, 0, numMat);
  addRwyDigit(root, 6, 8.2, WORLD.runway.halfL - 230, 0, numMat);
  addRwyDigit(root, 1, -8.2, -WORLD.runway.halfL + 230, Math.PI, numMat);
  addRwyDigit(root, 8, 8.2, -WORLD.runway.halfL + 230, Math.PI, numMat);
  // Aiming-point diamonds (stronger)
  for (const zSign of [-1, 1]) {
    for (const x of [-10, 10]) {
      const aim = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 26), markMat);
      aim.rotation.x = -Math.PI / 2;
      aim.position.set(x, 0.54, zSign * (WORLD.runway.halfL - 280));
      root.add(aim);
    }
  }

  // Runway edge lights — InstancedMesh
  const lightCount = q.clouds || qualityKey === 'high' ? 64 : 48;
  const lightGeo = new THREE.SphereGeometry(0.45, 6, 4);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a0,
    emissive: 0xffc060,
    emissiveIntensity: 1.65,
    roughness: 0.35,
    metalness: 0.08
  });
  lightMat.userData.pulse = true;
  const lights = new THREE.InstancedMesh(lightGeo, lightMat, lightCount);
  const dummy = new THREE.Object3D();
  let li = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < lightCount / 2; i++) {
      const z = -WORLD.runway.halfL + 30 + (i / (lightCount / 2 - 1)) * (WORLD.runway.halfL * 2 - 60);
      dummy.position.set(side * (WORLD.runway.halfW - 0.5), 0.7, z);
      dummy.updateMatrix();
      lights.setMatrixAt(li++, dummy.matrix);
    }
  }
  lights.instanceMatrix.needsUpdate = true;
  root.add(lights);

  // Taxiway + apron
  const taxi = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 130),
    useStd
      ? makeToonPbr({ color: 0x353540, roughness: 0.88, metalness: 0.02 })
      : makeFarLambert(0x353540)
  );
  taxi.rotation.x = -Math.PI / 2;
  taxi.position.set(-40, 0.35, -55);
  root.add(taxi);
  const taxiEdge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 120),
    new THREE.MeshBasicMaterial({ color: 0xffcc33 })
  );
  taxiEdge.rotation.x = -Math.PI / 2;
  taxiEdge.position.set(-31.5, 0.45, -55);
  root.add(taxiEdge);

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 50),
    useStd
      ? makeToonPbr({ color: 0x3a3a46, roughness: 0.9, metalness: 0.02 })
      : makeFarLambert(0x3a3a46)
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(WORLD.hangar.x + 10, 0.32, WORLD.hangar.z + 25);
  root.add(apron);

  // Hangar — richer
  const hangar = new THREE.Group();
  const hangarBody = useStd
    ? makeToonPbr({
        color: 0x6a7e90,
        map: tex.facade || null,
        roughness: 0.7,
        metalness: 0.15,
        envMapIntensity: 0.35
      })
    : makeFarLambert(0x6a7e90, tex.facade || null);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(52, 16, 32), hangarBody);
  hb.position.y = 8;
  hangar.add(hb);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(56, 1.8, 36),
    useStd
      ? makeToonPbr({ color: 0x3a4a5a, roughness: 0.55, metalness: 0.4 })
      : makeFarLambert(0x3a4a5a)
  );
  roof.position.y = 16.8;
  hangar.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(28, 12, 0.4),
    useStd
      ? makeToonPbr({ color: 0x1a2230, roughness: 0.9, metalness: 0.05 })
      : makeFarLambert(0x1a2230)
  );
  door.position.set(0, 6, 16.2);
  hangar.add(door);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(52.2, 1.2, 32.2),
    useStd
      ? makeToonPbr({
          color: 0x3db8ff,
          emissive: 0x1a80c0,
          emissiveIntensity: 0.25,
          roughness: 0.5,
          metalness: 0.2
        })
      : makeFarLambert(0x3db8ff)
  );
  stripe.position.y = 12;
  hangar.add(stripe);
  hangar.position.set(WORLD.hangar.x, 0, WORLD.hangar.z);
  root.add(hangar);
  dressHangar(root, hangar, useStd);

  // Control tower
  const towerMat = useStd
    ? makeToonPbr({ color: 0xe8eef5, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.4 })
    : makeFarLambert(0xe8eef5);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 28, 8), towerMat);
  tower.position.set(70, 14, -30);
  root.add(tower);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(13, 5, 13),
    useStd
      ? makeToonPbr({
          color: 0x7ec8e8,
          emissive: 0x3a90b0,
          emissiveIntensity: 0.2,
          roughness: 0.25,
          metalness: 0.15,
          transparent: true,
          opacity: 0.85,
          envMapIntensity: 0.6
        })
      : makeFarLambert(0x7ec8e8)
  );
  cab.position.set(70, 30.5, -30);
  root.add(cab);
  const cabRoof = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.6, 14),
    useStd
      ? makeToonPbr({ color: 0x445566, roughness: 0.5, metalness: 0.4 })
      : makeFarLambert(0x445566)
  );
  cabRoof.position.set(70, 33.2, -30);
  root.add(cabRoof);

  // City blocks — atlas facades + window emissive
  const city = new THREE.Group();
  const facadeMat = [];
  const facadeColors = [0x5a6578, 0x7a8494, 0x4a5568, 0x6a7388];
  for (let i = 0; i < 4; i++) {
    if (useStd) {
      const m = makeToonPbr({
        color: facadeColors[i],
        map: tex.facade || null,
        roughness: 0.75,
        metalness: 0.08,
        envMapIntensity: 0.3
      });
      if (m.map) {
        m.map = tex.facade.clone();
        m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
        m.map.repeat.set(0.5, 0.5);
        m.map.offset.set((i % 2) * 0.5, (i >> 1) * 0.5);
        m.map.colorSpace = THREE.SRGBColorSpace;
      }
      facadeMat.push(m);
    } else {
      facadeMat.push(makeFarLambert(facadeColors[i], tex.facade || null));
    }
  }
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffe8a0,
    emissive: 0xffcc66,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55
  });
  const buildingCount = qualityKey === 'low' ? 28 : qualityKey === 'high' ? 48 : 36;
  const roofColors = [0xff7a3a, 0xffd24a, 0x3db8ff, 0xff5a7a, 0x7adf6a];
  for (let i = 0; i < buildingCount; i++) {
    const w = 10 + Math.random() * 18;
    const d = 10 + Math.random() * 18;
    const h = 16 + Math.random() * 72;
    const bx = (Math.random() - 0.5) * 380;
    const bz = (Math.random() - 0.5) * 380;
    const cartoon = i % 3 !== 0;
    if (cartoon) {
      const r = Math.min(w, d) * 0.42;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 12), facadeMat[i % 4]);
      tower.position.set(WORLD.city.x + bx, h / 2, WORLD.city.z + bz);
      city.add(tower);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.05, 12, 8),
        useStd
          ? makeToonPbr({ color: roofColors[i % roofColors.length], roughness: 0.45, metalness: 0.08 })
          : makeFarLambert(roofColors[i % roofColors.length])
      );
      cap.position.set(WORLD.city.x + bx, h + r * 0.15, WORLD.city.z + bz);
      cap.scale.set(1, 0.55, 1);
      city.add(cap);
    } else {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat[i % 4]);
      b.position.set(WORLD.city.x + bx, h / 2, WORLD.city.z + bz);
      city.add(b);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(Math.min(w, d) * 0.35, 10, 8),
        useStd
          ? makeToonPbr({ color: roofColors[i % roofColors.length], roughness: 0.5, metalness: 0.1 })
          : makeFarLambert(roofColors[i % roofColors.length])
      );
      cap.position.set(WORLD.city.x + bx, h + 1.2, WORLD.city.z + bz);
      cap.scale.set(w / 8, 0.45, d / 8);
      city.add(cap);
    }
    if (i % 3 === 0) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.42, 0.28), winMat);
      win.position.set(WORLD.city.x + bx, h * 0.45, WORLD.city.z + bz + Math.min(w, d) * 0.45);
      city.add(win);
    }
  }
  root.add(city);


  // Terminal building (passenger hall) near hangar apron
  const terminal = new THREE.Group();
  const termMat = useStd
    ? makeToonPbr({
        color: 0xd8e0ea,
        map: tex.facade || null,
        roughness: 0.6,
        metalness: 0.08,
        envMapIntensity: 0.35
      })
    : makeFarLambert(0xd8e0ea, tex.facade || null);
  const termBody = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 22), termMat);
  termBody.position.y = 5;
  terminal.add(termBody);
  const termGlass = new THREE.Mesh(
    new THREE.BoxGeometry(60, 6, 0.4),
    useStd
      ? makeToonPbr({
          color: 0x6ec8f0,
          emissive: 0x2a6a90,
          emissiveIntensity: 0.25,
          roughness: 0.2,
          metalness: 0.15,
          transparent: true,
          opacity: 0.75,
          envMapIntensity: 0.65
        })
      : makeFarLambert(0x6ec8f0)
  );
  termGlass.position.set(0, 5, 11.2);
  terminal.add(termGlass);
  const termRoof = new THREE.Mesh(
    new THREE.BoxGeometry(74, 1.2, 26),
    useStd
      ? makeToonPbr({ color: 0x3a4a5c, roughness: 0.5, metalness: 0.35 })
      : makeFarLambert(0x3a4a5c)
  );
  termRoof.position.y = 10.6;
  terminal.add(termRoof);
  terminal.position.set(WORLD.hangar.x + 95, 0, WORLD.hangar.z + 10);
  root.add(terminal);
  dressAirport(root, useStd, qualityKey);

  // PAPI — 4-box glide path lights (white / red readable)
  const papiGroup = new THREE.Group();
  papiGroup.name = 'papi';
  const papiColors = [0xff2222, 0xff2222, 0xffffff, 0xffffff];
  for (let i = 0; i < 4; i++) {
    const col = papiColors[i];
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 1.8),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 2.2,
        roughness: 0.3,
        metalness: 0.08
      })
    );
    box.position.set(WORLD.runway.halfW + 14 + i * 3.4, 1.05, -WORLD.runway.halfL + 180);
    box.userData.papiPulse = true;
    papiGroup.add(box);
    // Soft glow halo
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 10),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(box.position.x, 0.56, box.position.z);
    papiGroup.add(halo);
  }
  root.add(papiGroup);

  // Road from airport apron toward city
  const roadMat = useStd
    ? makeToonPbr({ color: 0x2e2e36, roughness: 0.92, metalness: 0.02 })
    : makeFarLambert(0x2e2e36);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 520), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(-220, 0.28, 160);
  road.rotation.z = -0.55;
  root.add(road);
  const centerline = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 500),
    new THREE.MeshBasicMaterial({ color: 0xffee88 })
  );
  centerline.rotation.x = -Math.PI / 2;
  centerline.position.set(-220, 0.35, 160);
  centerline.rotation.z = -0.55;
  root.add(centerline);

  // Lake dock
  const dock = new THREE.Group();
  const wood = useStd
    ? makeToonPbr({ color: 0x8a6540, roughness: 0.85, metalness: 0.05 })
    : makeFarLambert(0x8a6540);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.45, 36), wood);
  deck.position.set(0, 1.9, 0);
  dock.add(deck);
  for (const z of [-14, -4, 6, 14]) {
    for (const x of [-3.2, 3.2]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.2, 6), wood);
      pile.position.set(x, 0.6, z);
      dock.add(pile);
    }
  }
  dock.position.set(WORLD.lake.x - WORLD.lake.r + 8, 0, WORLD.lake.z);
  root.add(dock);

  // Parked GA on apron (static props)
  const parkedMat = useStd
    ? makeToonPbr({ color: 0xf2f4f8, roughness: 0.65, metalness: 0.08, envMapIntensity: 0.4 })
    : makeFarLambert(0xf2f4f8);
  const parkedAccent = useStd
    ? makeToonPbr({ color: 0x3d8cff, roughness: 0.55, metalness: 0.05 })
    : makeFarLambert(0x3d8cff);
  for (let i = 0; i < 4; i++) {
    const ga = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.2, 8), parkedMat);
    fus.rotation.z = Math.PI / 2;
    fus.position.y = 1.1;
    ga.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 1.1), parkedAccent);
    wing.position.y = 1.25;
    ga.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.8), parkedAccent);
    tail.position.set(-1.8, 1.7, 0);
    ga.add(tail);
    ga.position.set(WORLD.hangar.x + 25 + i * 18, 0, WORLD.hangar.z + 38);
    ga.rotation.y = Math.PI * 0.15 * (i % 2 === 0 ? 1 : -1);
    root.add(ga);
  }

  // Taxi / threshold lights extras (blue taxi) — instanced
  {
    const taxiN = qualityKey === 'low' ? 16 : 28;
    const tGeo = new THREE.SphereGeometry(0.35, 5, 4);
    const tMat = new THREE.MeshStandardMaterial({
      color: 0x5599ff,
      emissive: 0x3388ff,
      emissiveIntensity: 1.55,
      roughness: 0.35,
      metalness: 0.08
    });
    const tLights = new THREE.InstancedMesh(tGeo, tMat, taxiN);
    const td = new THREE.Object3D();
    for (let i = 0; i < taxiN; i++) {
      td.position.set(-40 + (i % 2) * 12, 0.55, -110 + Math.floor(i / 2) * 8);
      td.updateMatrix();
      tLights.setMatrixAt(i, td.matrix);
    }
    tLights.instanceMatrix.needsUpdate = true;
    root.add(tLights);
  }


  // Trees — InstancedMesh trunks + crowns (draw-call friendly)
  {
    const treeCount = qualityKey === 'low' ? 40 : qualityKey === 'high' ? 90 : 64;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 1, 8);
    const leafGeo = new THREE.SphereGeometry(2.15, 10, 8);
    const trunkM = makeFarLambert(0x5a3a20);
    const leafM = makeToonPbr({ color: 0x3aaa3a, roughness: 0.85, metalness: 0.02 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkM, treeCount);
    const leaves = new THREE.InstancedMesh(leafGeo, leafM, treeCount);
    const td = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (i % 7) * 0.17;
      const rad = WORLD.lake.r + 35 + ((i * 47) % 140);
      const tx = WORLD.lake.x + Math.cos(ang) * rad;
      const tz = WORLD.lake.z + Math.sin(ang) * rad;
      const th = 3.5 + ((i * 13) % 20) * 0.1;
      td.position.set(tx, th / 2, tz);
      td.scale.set(1, th, 1);
      td.rotation.set(0, 0, 0);
      td.updateMatrix();
      trunks.setMatrixAt(i, td.matrix);
      td.position.set(tx, th + 1.6, tz);
      const s = 1.15 + ((i % 5) * 0.12);
      td.scale.set(s, s * 0.85, s);
      td.updateMatrix();
      leaves.setMatrixAt(i, td.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    root.add(trunks);
    root.add(leaves);
  }

  // Extra tree band along road (instanced)
  {
    const n = qualityKey === 'low' ? 12 : 24;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.2, 8);
    const leafGeo = new THREE.SphereGeometry(1.7, 10, 8);
    const trunks = new THREE.InstancedMesh(trunkGeo, makeFarLambert(0x4a3018), n);
    const leaves = new THREE.InstancedMesh(leafGeo, makeFarLambert(0x3a7a32), n);
    const td = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const x = -80 + t * (-280);
      const z = -40 + t * 380;
      td.position.set(x - 10, 1.6, z);
      td.scale.set(1, 1, 1);
      td.updateMatrix();
      trunks.setMatrixAt(i, td.matrix);
      td.position.set(x - 10, 3.6, z);
      td.updateMatrix();
      leaves.setMatrixAt(i, td.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    root.add(trunks);
    root.add(leaves);
  }

  // Cartoon shrubs around the airport
  {
    const n = qualityKey === 'low' ? 10 : 22;
    const bushGeo = new THREE.SphereGeometry(1.4, 8, 6);
    const bushM = useStd
      ? makeToonPbr({ color: 0x3db85a, roughness: 0.9, metalness: 0.02 })
      : makeFarLambert(0x3db85a);
    const bushes = new THREE.InstancedMesh(bushGeo, bushM, n);
    const td = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      td.position.set(Math.cos(ang) * (90 + (i % 5) * 18), 1.1, Math.sin(ang) * (140 + (i % 4) * 20) - 20);
      const s = 0.8 + (i % 4) * 0.25;
      td.scale.set(s, s * 0.7, s);
      td.updateMatrix();
      bushes.setMatrixAt(i, td.matrix);
    }
    bushes.instanceMatrix.needsUpdate = true;
    root.add(bushes);
  }

  // Balloon & rocket pads + pulsing rings
  const bpad = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 0.45, 16),
    useStd
      ? makeToonPbr({ color: 0x4a4a58, roughness: 0.8, metalness: 0.1 })
      : makeFarLambert(0x4a4a58)
  );
  bpad.position.set(WORLD.balloonPad.x, 0.28, WORLD.balloonPad.z);
  root.add(bpad);
  const rpad = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11, 0.55, 10),
    useStd
      ? makeToonPbr({ color: 0x3a3a44, roughness: 0.8, metalness: 0.1 })
      : makeFarLambert(0x3a3a44)
  );
  rpad.position.set(WORLD.rocketPad.x, 0.32, WORLD.rocketPad.z);
  root.add(rpad);

  const ringGeo = new THREE.RingGeometry(6.5, 8.2, 24);
  const bring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: 0xffb028, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  bring.rotation.x = -Math.PI / 2;
  bring.position.set(WORLD.balloonPad.x, 0.85, WORLD.balloonPad.z);
  bring.name = 'balloonRing';
  root.add(bring);
  const rring = new THREE.Mesh(
    ringGeo.clone(),
    new THREE.MeshBasicMaterial({ color: 0xff4422, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  rring.rotation.x = -Math.PI / 2;
  rring.position.set(WORLD.rocketPad.x, 0.85, WORLD.rocketPad.z);
  rring.name = 'rocketRing';
  root.add(rring);

  // Skydome with gradient + optional sky map
  const skyGeo = new THREE.SphereGeometry(3800, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const skyCols = [];
  const skyPos = skyGeo.attributes.position;
  for (let i = 0; i < skyPos.count; i++) {
    const y = skyPos.getY(i);
    const t = Math.max(0, Math.min(1, y / 2000));
    // zenith #3a9dff → horizon #f0c9a0
    const r = 0.23 * t + 0.94 * (1 - t);
    const g = 0.62 * t + 0.79 * (1 - t);
    const b = 1.0 * t + 0.63 * (1 - t);
    skyCols.push(r, g, b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  const skyDome = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      map: tex.sky || null,
      side: THREE.BackSide,
      fog: false,
      transparent: true,
      opacity: tex.sky ? 0.85 : 0.55
    })
  );
  skyDome.position.y = -20;
  root.add(skyDome);

  // Optional cloud planes (High)
  if (q.clouds && tex.clouds) {
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Mesh(
        new THREE.PlaneGeometry(600 + Math.random() * 400, 220 + Math.random() * 120),
        new THREE.MeshBasicMaterial({
          map: tex.clouds,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          fog: true,
          side: THREE.DoubleSide
        })
      );
      c.position.set(
        (Math.random() - 0.5) * 2800,
        380 + Math.random() * 220,
        (Math.random() - 0.5) * 2800
      );
      c.rotation.y = Math.random() * Math.PI;
      c.userData.drift = 2 + Math.random() * 4;
      c.name = 'cloud';
      root.add(c);
    }
  }

  // Thick cartoon cloud banks over lake + peaks
  {
    const puff = new THREE.SphereGeometry(28, 10, 8);
    const puffMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });
    const banks = [
      { x: 520, y: 220, z: -360, n: 7 },
      { x: -180, y: 340, z: 980, n: 6 },
      { x: 980, y: 380, z: -860, n: 6 },
      { x: -40, y: 260, z: 180, n: 5 }
    ];
    banks.forEach((b, bi) => {
      const g = new THREE.Group();
      g.name = 'cloudbank';
      g.userData.drift = 1.2 + bi * 0.3;
      for (let i = 0; i < b.n; i++) {
        const m = new THREE.Mesh(puff, puffMat);
        m.position.set((i - 2) * 22, (i % 3) * 10, (i % 2) * 16);
        m.scale.setScalar(0.7 + (i % 3) * 0.25);
        g.add(m);
      }
      g.position.set(b.x, b.y, b.z);
      root.add(g);
    });
  }

  STARS.forEach((s) => {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(3.2, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    star.position.set(s.x, s.y, s.z);
    star.name = 'hidestar';
    star.userData.starId = s.id;
    root.add(star);
  });

  // Windsock + flock — world feels inhabited
  const sock = new THREE.Group();
  sock.name = 'windsock';
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 9, 8),
    makeFarLambert(0xc9c4b8)
  );
  pole.position.y = 4.5;
  sock.add(pole);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 3.2, 8, 1, true),
    makeToonPbr({ color: 0xff7a2a, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide })
  );
  cone.rotation.z = Math.PI / 2;
  cone.position.set(1.6, 8.4, 0);
  cone.name = 'sockCone';
  sock.add(cone);
  sock.position.set(-38, 0, -70);
  root.add(sock);

  const flock = new THREE.Group();
  flock.name = 'flock';
  const birdGeo = new THREE.ConeGeometry(0.35, 1.1, 4);
  const birdMat = makeFarLambert(0x1a1a22);
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(birdGeo, birdMat);
    b.rotation.x = Math.PI / 2;
    b.userData.phase = i * 0.7;
    flock.add(b);
  }
  flock.position.set(180, 70, 120);
  root.add(flock);

  LANDING_PADS.filter((p) => p.later).forEach((p) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.r * 0.55, p.r, 28),
      new THREE.MeshBasicMaterial({ color: 0xffc14a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, sampleHeight(p.x, p.z) + 0.6, p.z);
    ring.name = 'landpad';
    root.add(ring);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xffef8a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(p.x, sampleHeight(p.x, p.z) + 0.62, p.z);
    root.add(dot);
  });

  decorateSandbox(root, qualityKey, useStd, tex);

  scene.add(root);

  const heightData = { geo, size: WORLD.size, segs };

  return {
    root,
    heightData,
    bring,
    rring,
    getHeight(x, z) {
      return sampleHeight(x, z);
    },
    isWater(x, z) {
      const dx = x - WORLD.lake.x, dz = z - WORLD.lake.z;
      return dx * dx + dz * dz < WORLD.lake.r * WORLD.lake.r;
    },
    isOnRunway(x, z) {
      return Math.abs(x) < WORLD.runway.halfW + 8 && Math.abs(z) < WORLD.runway.halfL + 10;
    },
    nearBalloon(x, z) {
      return Math.hypot(x - WORLD.balloonPad.x, z - WORLD.balloonPad.z) < 15;
    },
    nearRocket(x, z) {
      return Math.hypot(x - WORLD.rocketPad.x, z - WORLD.rocketPad.z) < 18;
    },
    nearestPad(x, z) {
      let best = null;
      let bestD = 1e9;
      for (const p of LANDING_PADS) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r && d < bestD) {
          best = p;
          bestD = d;
        }
      }
      return best;
    },
    onRoad(x, z) {
      for (const rd of WORLD.roads || []) {
        const dx = rd.bx - rd.ax, dz = rd.bz - rd.az;
        const len = Math.hypot(dx, dz) || 1;
        const t = Math.max(0, Math.min(1, ((x - rd.ax) * dx + (z - rd.az) * dz) / (len * len)));
        const px = rd.ax + dx * t, pz = rd.az + dz * t;
        if (Math.hypot(x - px, z - pz) < 11) return true;
      }
      return Math.abs(x) < WORLD.runway.halfW + 10 && Math.abs(z) < WORLD.runway.halfL + 12;
    },
    slopeAt(x, z) {
      const h = sampleHeight(x, z);
      const hx = sampleHeight(x + 8, z);
      const hz = sampleHeight(x, z + 8);
      return Math.hypot(hx - h, hz - h) / 8;
    },
    classifySurface(x, z) {
      if (this.isWater(x, z)) return { id: 'water', rough: 0.15, maxClass: 'amphib' };
      if (this.isOnRunway(x, z)) return { id: 'runway', rough: 0.02, maxClass: 'heavy' };
      if (this.onRoad(x, z)) return { id: 'road', rough: 0.08, maxClass: 'light' };
      for (const f of WORLD.flats || []) {
        if (Math.hypot(x - f.x, z - f.z) < f.r) {
          const long = f.r >= 70;
          return { id: 'flat', name: f.name, rough: 0.12, maxClass: long ? 'heavy' : 'light', long };
        }
      }
      const fx = x - WORLD.forest.x, fz = z - WORLD.forest.z;
      const fd = Math.hypot(fx, fz) / (WORLD.forest.r || 1);
      if (fd < 1) {
        return { id: 'forest', rough: 0.7, dens: 1 - fd, maxClass: 'none' };
      }
      const sx = x - WORLD.suburbs.x, sz = z - WORLD.suburbs.z;
      const sd = Math.hypot(sx, sz);
      if (sd < WORLD.suburbs.outer && sd > WORLD.suburbs.inner) {
        return { id: 'suburb', rough: 0.35, maxClass: 'heli' };
      }
      const sl = this.slopeAt(x, z);
      if (sl > 0.12) return { id: 'slope', rough: 0.45 + sl, maxClass: sl > 0.22 ? 'none' : 'heli' };
      return { id: 'grass', rough: 0.18, maxClass: 'light' };
    },
    forestDens(x, z) {
      const fx = x - WORLD.forest.x, fz = z - WORLD.forest.z;
      const fd = Math.hypot(fx, fz) / (WORLD.forest.r || 1);
      if (fd >= 1) return 0;
      return Math.max(0, 1 - fd);
    },
    hitSolid(x, z) {
      if (Math.hypot(x - WORLD.hangar.x, z - WORLD.hangar.z) < 22) return 'hangar';
      if (Math.hypot(x + 152, z + 58) < 14) return 'terminal';
      if (Math.hypot(x - 70, z + 30) < 10) return 'tower';
      const cx = x - WORLD.city.x, cz = z - WORLD.city.z;
      const cd = Math.hypot(cx, cz);
      if (cd < 95 && cd > 28) return 'building';
      const sx = x - WORLD.suburbs.x, sz = z - WORLD.suburbs.z;
      const sd = Math.hypot(sx, sz);
      if (sd < WORLD.suburbs.outer && sd > WORLD.suburbs.inner) {
        const ang = Math.atan2(sz, sx);
        const slot = Math.abs((ang * 6.5) % 1 - 0.5);
        if (slot < 0.12) return 'house';
      }
      const fx = x - WORLD.forest.x, fz = z - WORLD.forest.z;
      if (fx * fx + fz * fz < (WORLD.forest.r * 0.92) ** 2 && !this.onRoad(x, z)) return 'tree';
      if (Math.hypot(x - WORLD.city.x - 70, z - WORLD.city.z + 40) < 12) return 'water-tower';
      return null;
    },
    setDusk(on) {
      scene.background = new THREE.Color(on ? 0x2a3a68 : 0x6ec8ff);
      scene.fog = new THREE.FogExp2(on ? 0x6a7aa0 : 0xb8d8f4, on ? 0.00028 : 0.00018);
    },
    setFog(density = 0.00018, dusk = false) {
      scene.background = new THREE.Color(dusk ? 0x2a3a68 : density > 0.00035 ? 0x8aa4b8 : 0x6ec8ff);
      scene.fog = new THREE.FogExp2(dusk ? 0x6a7aa0 : density > 0.00035 ? 0x9aabb8 : 0xb8d8f4, density);
    },
    /** Slow cloud drift — call from main loop */
    update(dt) {
      const t = performance.now() * 0.001;
      root.traverse((o) => {
        if (o.name === 'cloud' && o.userData.drift) {
          o.position.x += o.userData.drift * dt;
          if (o.position.x > 1600) o.position.x = -1600;
        }
        if (o.name === 'cloudbank' && o.userData.drift) {
          o.position.x += o.userData.drift * dt;
          if (o.position.x > 1700) o.position.x = -1700;
        }
        if (o.name === 'hidestar') {
          o.rotation.y += dt * 1.6;
          o.position.y += Math.sin(t * 2 + o.position.x) * 0.02;
        }
        if (o.userData.papiPulse && o.material && o.material.emissiveIntensity != null) {
          o.material.emissiveIntensity = 1.8 + Math.sin(t * 3.2) * 0.55;
        }
        if (o.name === 'sockCone') {
          o.rotation.y = Math.atan2(WIND.x || 0.01, WIND.z || 0.01);
        }
        if (o.name === 'hangarBeacon') {
          o.rotation.y += dt * 2.2;
        }
        if (o.name === 'flock') {
          o.position.x = 180 + Math.sin(t * 0.18) * 90;
          o.position.z = 120 + Math.cos(t * 0.14) * 70;
          o.children.forEach((b, i) => {
            b.position.set(
              Math.sin(t * 0.9 + b.userData.phase) * 6,
              Math.sin(t * 2 + i) * 1.4,
              i * 2.2 - 10
            );
          });
        }
      });
      if (lightMat) {
        lightMat.emissiveIntensity = 1.35 + Math.sin(t * 2.4) * 0.45;
      }
    }
  };
}

export function sampleHeight(x, z) {
  let y = 0;
  for (const m of WORLD.mountains) {
    const dx = x - m.x, dz = z - m.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < m.r) {
      const t = 1 - d / m.r;
      y += m.h * t * t;
    }
  }
  y += Math.sin(x * 0.008) * Math.cos(z * 0.007) * 12;
  if (Math.abs(x) < 220 && Math.abs(z) < 1000) y *= 0.02;
  const dx = x - WORLD.lake.x, dz = z - WORLD.lake.z;
  if (dx * dx + dz * dz < (WORLD.lake.r + 30) ** 2) y = Math.min(y, 0.5);
  const cx = x - WORLD.city.x, cz = z - WORLD.city.z;
  if (Math.abs(cx) < 280 && Math.abs(cz) < 280) y *= 0.04;
  const fx = x - WORLD.forest.x, fz = z - WORLD.forest.z;
  if (fx * fx + fz * fz < WORLD.forest.r * WORLD.forest.r) y = Math.min(y, 8);
  for (const f of WORLD.flats || []) {
    const ddx = x - f.x, ddz = z - f.z;
    const d = Math.hypot(ddx, ddz);
    if (d < f.r) y *= d / f.r * 0.15;
  }
  return Math.max(0, y);
}


function boxAt(parent, w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function cylAt(parent, rt, rb, h, seg, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/** Props must stay off the runway strip and the road corridors. */
function blocksRoad(x, z, pad = 14) {
  if (Math.abs(x) < WORLD.runway.halfW + 6 && Math.abs(z) < WORLD.runway.halfL + 8) return true;
  for (const rd of WORLD.roads) {
    const dx = rd.bx - rd.ax;
    const dz = rd.bz - rd.az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - rd.ax) * dx + (z - rd.az) * dz) / len2));
    const px = rd.ax + dx * t;
    const pz = rd.az + dz * t;
    if ((x - px) * (x - px) + (z - pz) * (z - pz) < pad * pad) return true;
  }
  return false;
}

/**
 * Hangar ramp dressing. Interior clutter sits inside the bay; the fuel truck,
 * cones, and tie-down paint stay south/east so the city road (leaving north-west)
 * and the runway stay clear. Windsock is already placed by createWorld.
 */
function dressHangar(root, hangar, useStd) {
  const red = useStd
    ? makeToonPbr({ color: 0xe23b2f, roughness: 0.45, metalness: 0.12 })
    : makeFarLambert(0xe23b2f);
  const steel = useStd
    ? makeToonPbr({ color: 0xc5ccd4, roughness: 0.32, metalness: 0.62 })
    : makeFarLambert(0xc5ccd4);
  const dark = makeFarLambert(0x1c2430);
  const orange = useStd
    ? makeToonPbr({ color: 0xff8a1e, roughness: 0.5, metalness: 0.08 })
    : makeFarLambert(0xff8a1e);
  const glass = useStd
    ? makeToonPbr({
        color: 0x8fd4ff,
        emissive: 0x2a6a90,
        emissiveIntensity: 0.35,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.82
      })
    : makeFarLambert(0x8fd4ff);
  const yellow = makeFarLambert(0xffd23a);
  const cream = makeFarLambert(0xf4efe4);
  const paint = new THREE.MeshBasicMaterial({ color: 0xfff4d2 });
  const nosePaint = new THREE.MeshBasicMaterial({ color: 0xe23b2f });

  const office = new THREE.Group();
  office.name = 'hangarOffice';
  boxAt(office, 14, 7, 8, cream, 0, 3.5, 0);
  boxAt(office, 15.2, 0.55, 9.2, red, 0, 7.25, 0);
  for (const x of [-4.2, -1.4, 1.4, 4.2]) {
    boxAt(office, 2.1, 2.4, 0.18, glass, x, 4.2, 4.08);
    boxAt(office, 2.3, 0.16, 0.22, steel, x, 5.5, 4.12);
  }
  boxAt(office, 1.7, 2.5, 0.18, dark, 0, 1.35, 4.12);
  for (let i = 0; i < 4; i++) {
    boxAt(office, 2.4, 0.28, 0.72, steel, 0, 0.2 + i * 0.28, 4.5 + i * 0.55);
  }
  boxAt(office, 0.12, 1.35, 0.12, steel, -1.2, 1.55, 6.3);
  boxAt(office, 0.12, 1.35, 0.12, steel, 1.2, 1.55, 6.3);
  boxAt(office, 2.6, 0.08, 0.08, yellow, 0, 2.15, 6.3);
  office.position.set(12, 0, -20);
  hangar.add(office);

  const chestMat = useStd
    ? makeToonPbr({ color: 0xd23a32, roughness: 0.55, metalness: 0.22 })
    : makeFarLambert(0xd23a32);
  for (const z of [-8, 0, 7]) {
    const chest = new THREE.Group();
    boxAt(chest, 1.7, 1.15, 0.85, chestMat, 0, 0.58, 0);
    boxAt(chest, 1.55, 0.1, 0.72, steel, 0, 1.2, 0);
    boxAt(chest, 0.14, 0.18, 0.16, yellow, -0.42, 0.72, 0.44);
    boxAt(chest, 0.14, 0.18, 0.16, yellow, 0.42, 0.72, 0.44);
    chest.position.set(20.2, 0, z);
    hangar.add(chest);
  }
  boxAt(hangar, 8.2, 0.95, 1.45, steel, -6, 0.48, -12.2);
  boxAt(hangar, 7.8, 0.12, 1.2, dark, -6, 1.02, -12.2);
  boxAt(hangar, 0.35, 2.6, 3.4, steel, -22.2, 1.3, -10);
  for (const y of [0.55, 1.35, 2.15]) {
    boxAt(hangar, 0.55, 0.28, 2.8, orange, -21.85, y, -10);
  }
  cylAt(hangar, 0.48, 0.48, 1.1, 10, dark, 14, 0.55, -12);
  cylAt(hangar, 0.48, 0.48, 1.1, 10, orange, 15.3, 0.55, -12);
  boxAt(hangar, 0.85, 1.05, 0.55, red, 17.5, 0.52, 4);

  for (const [x, z] of [[15.2, 13.5], [18.2, 5.5]]) {
    cylAt(hangar, 0.22, 0.22, 0.9, 8, red, x, 0.72, z);
    cylAt(hangar, 0.09, 0.09, 0.22, 6, dark, x, 1.25, z);
    boxAt(hangar, 0.3, 0.1, 0.12, yellow, x, 0.95, z + 0.18);
  }

  for (const [x, z] of [[15.5, 20.5], [20.5, 23.5], [15.5, 26.5]]) {
    cylAt(hangar, 0.1, 0.42, 0.75, 8, orange, x, 0.38, z);
    boxAt(hangar, 0.55, 0.08, 0.1, cream, x, 0.5, z);
  }

  const beacon = new THREE.Group();
  beacon.name = 'hangarBeacon';
  cylAt(beacon, 0.2, 0.32, 1.15, 8, steel, 0, 0.55, 0);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff3355,
      emissive: 0xff2244,
      emissiveIntensity: 2.2,
      roughness: 0.35
    })
  );
  lamp.position.y = 1.3;
  beacon.add(lamp);
  boxAt(beacon, 1.35, 0.08, 0.08, dark, 0, 1.3, 0);
  boxAt(beacon, 0.08, 0.08, 1.35, dark, 0, 1.3, 0);
  beacon.position.set(-14, 17.7, 2);
  hangar.add(beacon);

  for (const [x, z] of [[-62, -64], [-48, -78], [-78, -90]]) {
    if (blocksRoad(x, z, 10)) continue;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(11, 8), paint);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.46, z);
    root.add(pad);
    const nose = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.8), nosePaint);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(x, 0.48, z + 2);
    root.add(nose);
  }

  const tx = -108;
  const tz = -82;
  if (!blocksRoad(tx, tz, 12)) {
    const truck = new THREE.Group();
    truck.name = 'fuelTruck';
    const cab = useStd
      ? makeToonPbr({ color: 0xf4f7fb, roughness: 0.4, metalness: 0.25 })
      : makeFarLambert(0xf4f7fb);
    boxAt(truck, 2.3, 1.85, 2.3, cab, 0, 1.55, 2.4);
    boxAt(truck, 1.9, 0.85, 1.15, glass, 0, 1.95, 3.0);
    cylAt(truck, 1.15, 1.15, 5.4, 14, red, 0, 1.75, -1.2, Math.PI / 2, 0, 0);
    boxAt(truck, 0.35, 0.55, 4.8, yellow, 0, 1.75, -1.2);
    boxAt(truck, 2.5, 0.45, 7.6, dark, 0, 0.72, 0.3);
    for (const [x, z] of [[-1.0, 2.3], [1.0, 2.3], [-1.0, -2.1], [1.0, -2.1]]) {
      cylAt(truck, 0.5, 0.5, 0.36, 10, dark, x, 0.5, z, 0, 0, Math.PI / 2);
    }
    cylAt(truck, 0.1, 0.1, 1.5, 6, steel, 1.25, 1.15, -3.7);
    boxAt(truck, 0.7, 0.4, 0.55, yellow, 1.2, 0.85, -3.5);
    truck.position.set(tx, 0, tz);
    truck.rotation.y = 0.35;
    root.add(truck);
  }
}


/** Taxi signs, blast fence, fuel-farm fittings, a small GA terminal, baggage carts. */
function dressAirport(root, useStd, qualityKey) {
  const low = qualityKey === 'low';
  const yellow = useStd
    ? makeToonPbr({ color: 0xffcc22, roughness: 0.55, metalness: 0.08 })
    : makeFarLambert(0xffcc22);
  const black = makeFarLambert(0x1a1a22);
  const steel = useStd
    ? makeToonPbr({ color: 0xb7c0ca, roughness: 0.35, metalness: 0.55 })
    : makeFarLambert(0xb7c0ca);
  const red = makeFarLambert(0xd6453d);
  const cream = makeFarLambert(0xf3efe6);
  const glass = useStd
    ? makeToonPbr({
        color: 0x7ec8ea,
        emissive: 0x246888,
        emissiveIntensity: 0.28,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.78
      })
    : makeFarLambert(0x7ec8ea);
  const blue = makeFarLambert(0x3a7ad4);

  function taxiSign(x, z, rotY, digits) {
    if (blocksRoad(x, z, 8)) return;
    const g = new THREE.Group();
    cylAt(g, 0.12, 0.14, 2.6, 6, steel, -1.15, 1.3, 0);
    cylAt(g, 0.12, 0.14, 2.6, 6, steel, 1.15, 1.3, 0);
    boxAt(g, 3.2, 1.7, 0.18, yellow, 0, 2.7, 0);
    boxAt(g, 2.9, 1.35, 0.08, black, 0, 2.7, 0.12);
    // Chunky arrow head so the sign reads as a direction, plus a runway pair
    boxAt(g, 0.28, 0.7, 0.1, yellow, -0.7, 2.7, 0.18);
    boxAt(g, 0.55, 0.28, 0.1, yellow, -0.35, 2.95, 0.18);
    const bit = {
      3: [[0.15, 0.35], [0.15, 0], [0.15, -0.35], [0.45, 0.18], [0.45, -0.18]],
      6: [[-0.15, 0.35], [-0.15, 0], [-0.15, -0.35], [-0.45, 0.18], [-0.45, -0.18], [0.15, -0.18]]
    };
    for (const d of digits) {
      for (const [lx, ly] of bit[d] || []) {
        boxAt(g, 0.22, 0.16, 0.08, yellow, lx + (d === 6 ? 0.7 : 0.15), 2.7 + ly, 0.2);
      }
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    root.add(g);
  }
  // Beside the taxiway, west of the pavement — not on the runway
  taxiSign(-58, -96, 0.15, [3, 6]);
  taxiSign(-58, -8, -0.2, [1, 8]);

  // Blast fence parallel to the runway, off the west edge near the north end
  const slats = low ? 14 : 26;
  const slatGeo = new THREE.BoxGeometry(0.28, 5.2, 1.15);
  const fence = new THREE.InstancedMesh(slatGeo, steel, slats);
  const dummy = new THREE.Object3D();
  const fenceX = -WORLD.runway.halfW - 18;
  for (let i = 0; i < slats; i++) {
    const z = WORLD.runway.halfL - 40 - i * 2.4;
    dummy.position.set(fenceX, 2.6, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    fence.setMatrixAt(i, dummy.matrix);
  }
  fence.instanceMatrix.needsUpdate = true;
  root.add(fence);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, slats * 2.4), makeFarLambert(0x6a7078));
  base.position.set(fenceX, 0.25, WORLD.runway.halfL - 40 - (slats - 1) * 1.2);
  root.add(base);

  // Fuel farm fittings around the tanks already at x=-120..-96, z=30
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 26, 8), steel);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(-108, 6.4, 30);
  root.add(pipe);
  cylAt(root, 0.22, 0.22, 3.2, 8, steel, -120, 5.2, 30);
  cylAt(root, 0.22, 0.22, 3.2, 8, steel, -96, 5.2, 30);
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 1.1),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffcc22 : 0x222222 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-120 + i * 12, 0.55, 38);
    root.add(stripe);
  }
  if (!blocksRoad(-88, 52, 12)) {
    const shed = new THREE.Group();
    boxAt(shed, 6, 4.2, 5, cream, 0, 2.1, 0);
    boxAt(shed, 6.6, 0.4, 5.6, red, 0, 4.4, 0);
    boxAt(shed, 2.2, 2.2, 0.15, glass, 0, 2.4, 2.55);
    boxAt(shed, 1.2, 0.8, 0.8, red, 2.2, 0.5, 2.2);
    shed.position.set(-88, 0, 52);
    root.add(shed);
  }

  // Small GA terminal west of the field — the big hall sits near the runway centerline
  if (!blocksRoad(-152, -58, 12)) {
    const term = new THREE.Group();
    term.name = 'gaTerminal';
    boxAt(term, 28, 7, 12, cream, 0, 3.5, 0);
    boxAt(term, 30, 0.7, 14, blue, 0, 7.4, 0);
    boxAt(term, 22, 3.2, 0.2, glass, 0, 3.6, 6.1);
    boxAt(term, 3.2, 3.4, 0.2, black, -8, 1.8, 6.15);
    boxAt(term, 3.2, 3.4, 0.2, black, 8, 1.8, 6.15);
    boxAt(term, 16, 0.35, 6, steel, 0, 3.2, 9.2);
    for (const x of [-6, 0, 6]) {
      cylAt(term, 0.15, 0.18, 3.2, 6, steel, x, 1.6, 11.5);
    }
    // Canopy sign
    boxAt(term, 8, 1.6, 0.25, yellow, 0, 6.2, 6.3);
    boxAt(term, 1.2, 0.35, 0.12, black, -1.6, 6.2, 6.48);
    boxAt(term, 1.2, 0.35, 0.12, black, 0, 6.55, 6.48);
    boxAt(term, 1.2, 0.35, 0.12, black, 1.6, 6.2, 6.48);
    term.position.set(-152, 0, -58);
    root.add(term);

    const cartN = low ? 4 : 8;
    const cartGeo = new THREE.BoxGeometry(1.3, 0.7, 2.2);
    const cartMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const carts = new THREE.InstancedMesh(cartGeo, cartMat, cartN);
    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8);
    const wheels = new THREE.InstancedMesh(wheelGeo, black, cartN * 4);
    const colors = [0xf2f2f2, 0xffcc33, 0x3a7ad4, 0xd6453d];
    let w = 0;
    for (let i = 0; i < cartN; i++) {
      const x = -152 - 10 + (i % 4) * 3.2;
      const z = -58 + 16 + Math.floor(i / 4) * 3.4;
      dummy.position.set(x, 0.7, z);
      dummy.rotation.set(0, i % 2 ? 0.2 : -0.15, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carts.setMatrixAt(i, dummy.matrix);
      carts.setColorAt(i, new THREE.Color(colors[i % colors.length]));
      for (const [ox, oz] of [[-0.5, 0.7], [0.5, 0.7], [-0.5, -0.7], [0.5, -0.7]]) {
        dummy.position.set(x + ox, 0.22, z + oz);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.updateMatrix();
        wheels.setMatrixAt(w++, dummy.matrix);
      }
    }
    carts.instanceMatrix.needsUpdate = true;
    if (carts.instanceColor) carts.instanceColor.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
    root.add(carts);
    root.add(wheels);
  }
}

function decorateSandbox(root, qualityKey, useStd, tex) {
  const low = qualityKey === 'low';
  const roadMat = useStd
    ? makeToonPbr({ color: 0x3a3a42, roughness: 0.92, metalness: 0.02 })
    : makeFarLambert(0x3a3a42);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2e9c4 });
  const houseMat = [
    makeFarLambert(0xe8dcc8),
    makeFarLambert(0xd4c4a8),
    makeFarLambert(0xc9d4c0)
  ];
  const roofMat = makeFarLambert(0x8a3a32);
  const trunkMat = makeFarLambert(0x5a3a22);
  const leafMat = makeFarLambert(0x3d8a4a);
  const leafDark = makeFarLambert(0x2a6a38);

  // Roads airport → city → woods → lake → farm
  for (const rd of WORLD.roads) {
    const dx = rd.bx - rd.ax, dz = rd.bz - rd.az;
    const len = Math.hypot(dx, dz) || 1;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, len), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.atan2(dx, dz);
    road.position.set((rd.ax + rd.bx) * 0.5, 0.4, (rd.az + rd.bz) * 0.5);
    root.add(road);
    const dashes = low ? 8 : 16;
    for (let i = 0; i < dashes; i++) {
      const t = (i + 0.5) / dashes;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), dashMat);
      d.rotation.x = -Math.PI / 2;
      d.rotation.z = Math.atan2(dx, dz);
      d.position.set(rd.ax + dx * t, 0.45, rd.az + dz * t);
      root.add(d);
    }
  }

  // Forest
  const treeN = low ? 48 : 110;
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.7, 6, 6);
  const crownGeo = new THREE.SphereGeometry(3.2, 8, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeN);
  const crowns = new THREE.InstancedMesh(crownGeo, leafMat, treeN);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeN; i++) {
    const ang = (i / treeN) * Math.PI * 2 + i * 0.37;
    const rad = (WORLD.forest.r * 0.15) + (i % 9) / 9 * WORLD.forest.r * 0.8;
    const x = WORLD.forest.x + Math.cos(ang) * rad;
    const z = WORLD.forest.z + Math.sin(ang) * rad * 0.85;
    const y = sampleHeight(x, z);
    dummy.position.set(x, y + 3, z);
    dummy.scale.set(1, 0.8 + (i % 5) * 0.12, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 7.2 + (i % 4);
    dummy.scale.set(0.9 + (i % 3) * 0.2, 0.9, 0.9 + (i % 3) * 0.15);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  }
  root.add(trunks);
  root.add(crowns);

  // Extra grove near lake
  for (let i = 0; i < (low ? 8 : 16); i++) {
    const x = WORLD.lake.x - 220 + (i % 8) * 18;
    const z = WORLD.lake.z + 200 + Math.floor(i / 8) * 22;
    const t = new THREE.Mesh(trunkGeo, trunkMat);
    t.position.set(x, sampleHeight(x, z) + 3, z);
    root.add(t);
    const c = new THREE.Mesh(crownGeo, leafDark);
    c.position.set(x, sampleHeight(x, z) + 7.4, z);
    root.add(c);
  }

  // Suburb houses in a ring around downtown
  const homes = low ? 22 : 40;
  for (let i = 0; i < homes; i++) {
    const ang = (i / homes) * Math.PI * 2;
    const rad = WORLD.suburbs.inner + 40 + (i % 5) * 28;
    const x = WORLD.suburbs.x + Math.cos(ang) * rad;
    const z = WORLD.suburbs.z + Math.sin(ang) * rad;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), houseMat[i % 3]);
    body.position.y = 3;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 4), roofMat);
    roof.position.y = 8;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    g.position.set(x, sampleHeight(x, z), z);
    g.rotation.y = ang + Math.PI / 2;
    root.add(g);
  }

  // Downtown extras: plaza, water tower, billboard, parked cars
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(28, 24), makeFarLambert(0x8a8a92));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(WORLD.city.x, 0.5, WORLD.city.z);
  root.add(plaza);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 22, 10), makeFarLambert(0xb0b8c4));
  tower.position.set(WORLD.city.x + 70, 11, WORLD.city.z - 40);
  root.add(tower);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), makeFarLambert(0xc45a4a));
  tank.position.set(WORLD.city.x + 70, 24, WORLD.city.z - 40);
  root.add(tank);
  const board = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 0.6), makeFarLambert(0xffcc44));
  board.position.set(WORLD.city.x - 40, 10, WORLD.city.z + 90);
  root.add(board);

  const carMat = [0x3a6ad8, 0xd84a3a, 0xf2f2f0, 0x2a2a30];
  for (let i = 0; i < (low ? 6 : 12); i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 4.4), makeFarLambert(carMat[i % 4]));
    const ang = i * 0.7;
    car.position.set(WORLD.city.x + Math.cos(ang) * 36, 0.9, WORLD.city.z + Math.sin(ang) * 36);
    car.rotation.y = ang;
    root.add(car);
  }

  // Farm: barn, silo, fence posts on north flat
  const farm = WORLD.flats[0];
  const barn = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 14), makeFarLambert(0xb43a32));
  barn.position.set(farm.x - 18, sampleHeight(farm.x, farm.z) + 5, farm.z);
  root.add(barn);
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 16, 10), makeFarLambert(0xc9c4b8));
  silo.position.set(farm.x - 30, sampleHeight(farm.x, farm.z) + 8, farm.z + 8);
  root.add(silo);

  // Pier on lake
  const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 28), makeFarLambert(0x8a6a44));
  pier.position.set(WORLD.lake.x - WORLD.lake.r + 20, 0.6, WORLD.lake.z);
  root.add(pier);

  // Radio mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 48, 6), makeFarLambert(0x8899aa));
  mast.position.set(140, 24, 40);
  root.add(mast);

  // Fuel farm
  for (let i = 0; i < 3; i++) {
    const tank2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 7, 12), makeFarLambert(0xd8c45a));
    tank2.position.set(-120 + i * 12, 3.6, 30);
    root.add(tank2);
  }

  // Flat landing discs
  for (const f of WORLD.flats) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(f.r * 0.92, 24),
      makeFarLambert(0x88aa55)
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(f.x, sampleHeight(f.x, f.z) + 0.35, f.z);
    root.add(disc);
  }
}

