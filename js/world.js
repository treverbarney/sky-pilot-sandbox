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
  mountains: [
    { x: -900, z: -800, h: 420, r: 350 },
    { x: 1100, z: 700, h: 380, r: 300 },
    { x: -200, z: 1100, h: 280, r: 250 },
    { x: 900, z: -1000, h: 500, r: 400 }
  ]
};

function groundColor(x, z) {
  const dx = x - WORLD.lake.x, dz = z - WORLD.lake.z;
  if (dx * dx + dz * dz < WORLD.lake.r * WORLD.lake.r) return null;
  if (Math.abs(x) < WORLD.runway.halfW + 5 && Math.abs(z) < WORLD.runway.halfL + 20) {
    return new THREE.Color(0x3a3a44);
  }
  if (Math.abs(x) < 200 && Math.abs(z) < 1000) return new THREE.Color(0x3a6e38);
  const cx = x - WORLD.city.x, cz = z - WORLD.city.z;
  if (Math.abs(cx) < 220 && Math.abs(cz) < 220) return new THREE.Color(0x4a4a54);
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
  scene.background = new THREE.Color(0x5aadef);
  scene.fog = new THREE.FogExp2(0x9ecfff, 0.00022);
  if (getEnvMap()) scene.environment = getEnvMap();

  // Lighting — warm key, cool fill
  const hemi = new THREE.HemisphereLight(0xc8e4ff, 0x3d5a32, 0.78);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
  sun.position.set(280, 480, 160);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aadd, 0.32);
  fill.position.set(-200, 120, -180);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x405060, 0.2));

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
  for (let z = -WORLD.runway.halfL + 40; z < WORLD.runway.halfL; z += 70) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 30), markMat);
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
    for (const x of [-8, 8]) {
      const ap = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 20), markMat);
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

  // Runway edge lights — InstancedMesh
  const lightCount = q.clouds || qualityKey === 'high' ? 64 : 48;
  const lightGeo = new THREE.SphereGeometry(0.45, 6, 4);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffd080,
    emissive: 0xffc060,
    emissiveIntensity: 0.85,
    roughness: 0.4,
    metalness: 0.1
  });
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
  for (let i = 0; i < buildingCount; i++) {
    const w = 10 + Math.random() * 22;
    const d = 10 + Math.random() * 22;
    const h = 18 + Math.random() * 85;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat[i % 4]);
    const bx = (Math.random() - 0.5) * 380;
    const bz = (Math.random() - 0.5) * 380;
    b.position.set(WORLD.city.x + bx, h / 2, WORLD.city.z + bz);
    city.add(b);
    if (i % 3 === 0) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.3), winMat);
      win.position.set(WORLD.city.x + bx, h * 0.45, WORLD.city.z + bz + d / 2 + 0.1);
      city.add(win);
    }
    // Accent roof
    if (i % 4 === 0) {
      const roofTile = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1, 0.6, d + 1),
        useStd
          ? makeToonPbr({ color: 0x3a4555, roughness: 0.5, metalness: 0.35 })
          : makeFarLambert(0x3a4555)
      );
      roofTile.position.set(WORLD.city.x + bx, h + 0.3, WORLD.city.z + bz);
      city.add(roofTile);
    }
  }
  root.add(city);

  // Trees near lake — fewer on Low
  const trunkM = makeFarLambert(0x5a3a20);
  const leafM = [
    makeFarLambert(0x2d6b2a),
    makeFarLambert(0x3a7a32),
    makeFarLambert(0x245a28)
  ];
  const treeCount = qualityKey === 'low' ? 36 : 70;
  for (let i = 0; i < treeCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = WORLD.lake.r + 35 + Math.random() * 140;
    const tx = WORLD.lake.x + Math.cos(ang) * rad;
    const tz = WORLD.lake.z + Math.sin(ang) * rad;
    const th = 3.5 + Math.random() * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, th, 5), trunkM);
    trunk.position.set(tx, th / 2, tz);
    root.add(trunk);
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(2.2 + Math.random(), 5 + Math.random() * 3, 6),
      leafM[i % 3]
    );
    leaf.position.set(tx, th + 2.2, tz);
    root.add(leaf);
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
    for (let i = 0; i < 5; i++) {
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
    /** Slow cloud drift — call from main loop */
    update(dt) {
      root.traverse((o) => {
        if (o.name === 'cloud' && o.userData.drift) {
          o.position.x += o.userData.drift * dt;
          if (o.position.x > 1600) o.position.x = -1600;
        }
      });
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
  if (Math.abs(cx) < 220 && Math.abs(cz) < 220) y *= 0.05;
  return Math.max(0, y);
}
