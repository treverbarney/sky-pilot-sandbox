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
  // Slight dusk-lean fog tint (readable night approach without full TOD)
  scene.fog = new THREE.FogExp2(0xa8c4e8, 0.00024);
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

  // Bold runway designators (36 / 18) — chunky readable digits
  function addRwyDigit(parent, digit, ox, oz, rotY, mat) {
    const segs = {
      0: [[0, 1.1, 1.6, 0.35], [0, -1.1, 1.6, 0.35], [-0.9, 0, 0.35, 2.2], [0.9, 0, 0.35, 2.2]],
      1: [[0.35, 0, 0.4, 2.5]],
      3: [[0, 1.1, 1.6, 0.35], [0, 0, 1.4, 0.3], [0, -1.1, 1.6, 0.35], [0.85, 0.55, 0.35, 1.1], [0.85, -0.55, 0.35, 1.1]],
      6: [[0, 1.1, 1.6, 0.35], [0, 0, 1.4, 0.3], [0, -1.1, 1.6, 0.35], [-0.85, 0.55, 0.35, 1.1], [-0.85, -0.55, 0.35, 1.1], [0.85, -0.55, 0.35, 1.1]],
      8: [[0, 1.1, 1.6, 0.35], [0, 0, 1.4, 0.3], [0, -1.1, 1.6, 0.35], [-0.85, 0.55, 0.35, 1.1], [0.85, 0.55, 0.35, 1.1], [-0.85, -0.55, 0.35, 1.1], [0.85, -0.55, 0.35, 1.1]]
    };
    const g = new THREE.Group();
    for (const [lx, lz, w, d] of segs[digit] || segs[8]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(lx, 0, lz);
      g.add(m);
    }
    g.position.set(ox, 0.54, oz);
    g.rotation.y = rotY;
    parent.add(g);
  }
  const numMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // Approach from +Z sees "36"; from -Z sees "18"
  addRwyDigit(root, 3, -2.2, WORLD.runway.halfL - 95, 0, numMat);
  addRwyDigit(root, 6, 2.2, WORLD.runway.halfL - 95, 0, numMat);
  addRwyDigit(root, 1, -2.2, -WORLD.runway.halfL + 95, Math.PI, numMat);
  addRwyDigit(root, 8, 2.2, -WORLD.runway.halfL + 95, Math.PI, numMat);
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
      const t = performance.now() * 0.001;
      root.traverse((o) => {
        if (o.name === 'cloud' && o.userData.drift) {
          o.position.x += o.userData.drift * dt;
          if (o.position.x > 1600) o.position.x = -1600;
        }
        if (o.userData.papiPulse && o.material && o.material.emissiveIntensity != null) {
          o.material.emissiveIntensity = 1.8 + Math.sin(t * 3.2) * 0.55;
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
  if (Math.abs(cx) < 220 && Math.abs(cz) < 220) y *= 0.05;
  return Math.max(0, y);
}
