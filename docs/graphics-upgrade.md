# Graphics Upgrade — Fortnite-like Stylized Realism (Mobile Three.js)

**Goal:** Raise visual fidelity toward a **stylized, readable, saturated** look (Fortnite / Rocket League / Zelda BOTW energy) — **not** photoreal. Keep mid-phone targets: **≥30 FPS**, **≤~80–100 draw calls**, **≤~150k–250k visible tris**, texture memory **≤~80–100 MB**.

**Out of scope:** Changing game code in this doc. Implementers wire patterns into `js/world.js`, `js/meshes.js`, `js/main.js`, optional new `js/materials.js` / `js/graphics-budget.js`.

**Baseline today:** `MeshLambertMaterial` + flat shading, vertex-colored ground, `FogExp2`, Hemisphere + 2 Directionals + Ambient, procedural box/cyl aircraft, no atlases/LOD/env maps (`world.js`, `meshes.js`).

---

## 1. Art direction (stylized realism)

| Pillar | Spec |
|--------|------|
| Silhouette | Chunky, readable shapes; slight bevel / soft edge darkening via AO or vertex color, not high poly |
| Color | Saturated base colors; warm sun, cool sky fill; avoid muddy mid-grays |
| Specular | Soft, broad highlights on metal/glass only — **not** mirror chrome |
| Shadows | Prefer **baked AO / lightmaps** over realtime cascaded shadows on mobile |
| Edges | Optional cheap rim (emissive or Fresnel-ish via env intensity), never black outlines as primary look |
| Scale | Compact 4 km world stays; detail density rises near runway/city/lake, falls off with LOD |

**Hybrid material model:** Use `MeshStandardMaterial` as the **hero** path (aircraft, runway markings, lake surface, nearby buildings). Keep `MeshLambertMaterial` / `MeshBasicMaterial` for **far LOD**, particles, UI-adjacent meshes, and sky.

---

## 2. Concrete Three.js material patterns

### 2.1 Shared factories (`materials.js` recommended)

```js
// Pseudocode — implementers own exact API
import * as THREE from 'three';

export function makeToonPbr({
  color = 0xffffff,
  map = null,
  roughness = 0.65,
  metalness = 0.05,
  aoMap = null,
  envMapIntensity = 0.45,
  flatShading = false
} = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    map,
    roughness,
    metalness,
    aoMap,
    aoMapIntensity: aoMap ? 0.85 : 0,
    envMapIntensity,
    flatShading,
    fog: true
  });
  // Soft “toon” bias: higher roughness + restrained metal + baked AO
  // Do NOT enable MeshPhysical clearcoat/iridescence on mid phones
  return m;
}

export function makeFarLambert(color, map = null) {
  return new THREE.MeshLambertMaterial({
    color, map, flatShading: true, fog: true
  });
}
```

### 2.2 Env map (cheap stylized reflections)

1. Generate or load a **small** equirect / cube: **256²** or **512²** HDR/LDR sky gradient (warm horizon, cyan zenith). Prefer LDR PNG/JPG for first ship; HDR optional later.
2. `scene.environment = pmrem.fromEquirectangular(tex).texture` via `THREE.PMREMGenerator` **once** at boot.
3. Aircraft metals: `metalness 0.35–0.55`, `roughness 0.35–0.5`, `envMapIntensity 0.35–0.6`.
4. Paint/composites: `metalness 0–0.08`, `roughness 0.55–0.8`, `envMapIntensity 0.25–0.4`.
5. Glass canopies: separate material, `transparent: true`, `opacity 0.45–0.65`, `metalness 0.1`, `roughness 0.15`, `envMapIntensity 0.7` — **one** glass material shared across fleet.

**Disable** env reflections on LOD2+ and all distant world props (`envMapIntensity = 0` or Lambert).

### 2.3 Baked AO tricks (no second UV authoring pain)

| Trick | How |
|-------|-----|
| Duplicate UV | After build: `geo.setAttribute('uv2', geo.attributes.uv)` when AO shares unwrap (Three.js AO uses red channel; set `aoMap.colorSpace = THREE.NoColorSpace`) |
| Vertex AO | Darken creases in vertex colors (ground already uses vertex color; extend to aircraft panel lines) |
| Atlas AO pack | Pack AO into **R** of a packed ORM atlas (see §3); assign `aoMap` to that texture, ignore G/B in material or use roughness/metal maps later |
| Lightmap lite | For static runway + hangar: single **512** lightmap multiplied via `lightMap` + `uv2`, intensity 0.6–1.0 — replaces realtime shadows |

**Do not** rely on AO with only Directional lights and no ambient/hemi — AO multiplies ambient/indirect. Keep HemisphereLight + scene.environment so AO reads.

### 2.4 Optional soft toon step (phase 2)

If Standard alone looks too smooth:

- Build a 1D `gradientMap` (4–6 soft steps, **NearestFilter**) and use `MeshToonMaterial` **only** for non-metal props / far city.
- Or `onBeforeCompile` / TSL later to quantize diffuse while keeping Standard specular — **not** required for v1.

**v1 recommendation:** Standard + baked AO + env + stylized palette. Skip custom toon shader until profiles show headroom.

---

## 3. Texture atlas strategy

### 3.1 Atlases to ship

| Atlas | Size | Contents | Used by |
|-------|------|----------|---------|
| `world-albedo-1024.webp` | **1024** | Grass variants, dirt, asphalt, taxi paint snippets, city facade strips, rock, snow tint | Ground patches, runway, buildings LOD0–1 |
| `world-orm-1024.webp` | **1024** | Packed **O**=AO, **R**=roughness, **M**=metalness (or grayscale AO-only in R for v1) | Same UVs as albedo |
| `aircraft-shared-512.webp` | **512** | Panel lines, rivet noise, national-mark stubs, tire, intake dark | All aircraft skins |
| `aircraft-livery-512.webp` × N | **512** each | Per-type color blocks (or one 1024 mega-livery atlas for all 10) | Fuselage accents |
| `fx-256.webp` | **256** | Splash, smoke, AB glow sprites | Particles |

**Hard rules**

- Prefer **512** for mobile hero props; **1024** only for world albedo/ORM shared atlas.
- Never ship 2048+ for this PWA.
- `texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())`.
- Color maps: `texture.colorSpace = THREE.SRGBColorSpace`. Data/ORM/AO: `NoColorSpace`.
- Generate mipmaps; `minFilter = LinearMipmapLinearFilter`.
- One material per atlas region set → meshes sharing atlas **batch** better.

### 3.2 UV budget

- Aircraft: one unwrap per type into shared 512; accents as solid `color` tint where possible to skip extra maps.
- City blocks: modular UVs into world atlas (3–6 facade tiles).
- Ground: keep vertex color as base; multiply optional 1024 detail only near camera (see LOD).

---

## 4. LOD system

Use `THREE.LOD` for repeated / distant content. Camera distance in meters (world is ~4 km).

### 4.1 Aircraft (player + any AI later)

| LOD | Distance | Tris (target) | Material |
|-----|----------|---------------|----------|
| 0 | 0–40 m | 2.5k–6k | Standard + maps + env |
| 1 | 40–120 m | 800–1.5k | Standard, albedo only, no normal |
| 2 | 120–400 m | 200–400 | Lambert, flat color |
| 3 | >400 m | Billboard quad or hide | Basic |

Player craft stays LOD0 in chase/cockpit; external cam may drop to LOD1 beyond 80 m.

### 4.2 World props

| Asset | LOD0 | LOD1 | LOD2 / cull |
|-------|------|------|-------------|
| Runway lights / cones | Full | Merged strips | Hide >600 m |
| City buildings | Simple extruded + atlas | Box + solid color | Impostor cluster / hide >800 m |
| Trees / bushes | 2-plane cross or low cone | Single plane | Cull |
| Mountains | Current sculpted mesh | Same mesh, Lambert | Same (already low) |
| Lake | Dual layer + specular Standard | Single Lambert disc | — |

### 4.3 Ground detail

- Keep one **80×80** (or 96×96) terrain mesh.
- Optional near-camera **detail decals** (runway numbers, centerline) as separate thin meshes, not terrain subdivisions.
- Do **not** raise terrain segs above ~128 without profiling.

---

## 5. Draw-call & GPU budgets (mid phones)

Targets aligned with common Three.js mobile guidance (~&lt;100 calls, mid-phone 30 FPS):

| Metric | Budget | Measure |
|--------|--------|---------|
| Draw calls | **≤ 80** typical flight; **≤ 100** spike at airport | `renderer.info.render.calls` |
| Triangles | **≤ 200k** visible | `renderer.info.render.triangles` |
| Pixel ratio | `Math.min(devicePixelRatio, 1.5)` default; settings: Low 1.0 / High 2.0 | `renderer.setPixelRatio` |
| Shadow maps | **Off** by default on mobile; optional Low 512² single shadow for sun if FPS ≥45 | — |
| Post FX | None for v1 (no bloom/SSAO). AB glow = emissive mesh / sprite | — |
| Geometries | Merge static airport with `BufferGeometryUtils.mergeGeometries` | One mesh for taxi+markings where possible |
| Instancing | `InstancedMesh` for runway lights, trees, city window dots | 1 call per type |

**Implementation checklist**

1. Share materials (one asphalt, one grass, one glass).
2. Merge static opaque airport pieces.
3. Instance repeated props.
4. Cap lights: keep current 1 hemi + 2 dir + 1 ambient; **no** per-building PointLights.
5. Dispose unused textures on hangar↔flight if streaming later.

---

## 6. Sky / fog / lighting

### 6.1 Sky

| Layer | Spec |
|-------|------|
| Background | Keep color clear; drive from time-of-day preset |
| Skydome | Existing inverted hemisphere — upgrade to **vertex-color gradient** (zenith `#3a9dff` → horizon `#f0c9a0`) + `fog: false` |
| Optional clouds | 3–6 soft transparent planes or impostors; **256** atlas; slow drift; cull behind camera |

### 6.2 Fog

```js
// Stylized depth, not haze wall
scene.fog = new THREE.FogExp2(0x9ecfff, 0.00022); // slightly softer than current 0.00028
// Alternate linear for clearer distant mountains:
// scene.fog = new THREE.Fog(0x9ecfff, 800, 3200);
```

Match fog color to horizon skydome so mountains dissolve cleanly.

### 6.3 Lighting (stylized key)

| Light | Intensity / color | Notes |
|-------|-------------------|-------|
| Hemisphere | sky `#c8e4ff` 0.75 · ground `#3d5a32` 0.65–0.8 | Primary fill; enables AO readability |
| Sun Directional | `#fff1d6` **1.0–1.2** | Key; position high-forward |
| Cool fill Directional | `#88aadd` **0.25–0.35** | Rim / shadow lift |
| Ambient | `#405060` **0.15–0.25** | Prevent crushed blacks |
| Env (PMREM) | intensity via materials 0.25–0.6 | Specular only |

**No** realtime shadow maps in default mobile preset. If added: `sun.castShadow = true`, mapSize 512, bias tuned, only ground+aircraft receive/cast.

### 6.4 Time presets (data-only)

`dawn` · `day` · `dusk` · `night` — swap fog color, hemi/sun intensities, env map, runway light emissive. Default ship **day**.

---

## 7. Scene detail upgrades (runway / city / lake / mountain)

### 7.1 Runway

| Element | Spec |
|---------|------|
| Surface | Standard asphalt from atlas; roughness ~0.9; subtle AO near edges |
| Centerline / threshold | Decal meshes or atlas strips; emissive 0 at day, slight at night |
| Numbers / aiming point | 2–4 textured quads (512 atlas region) — high readability for landing cues |
| Edge lights | `InstancedMesh` spheres/boxes, emissive `#ffd080`, count ~40–80 |
| Blast pad / overrun | Darker albedo region |
| Hangar | Merged geo + atlas; interior dark AO |

### 7.2 City

| Element | Spec |
|---------|------|
| Block count | Keep compact footprint (~220 m); **8–20** buildings |
| LOD0 | Extrude + atlas facades; window emissive mask optional (night) |
| Color | Stylized concrete `#6a6e78`, accent roofs, no photo facades |
| Props | 1–2 billboard trees, water tower — instanced |

### 7.3 Lake

| Element | Spec |
|---------|------|
| Surface | `MeshStandardMaterial` color `#1a5a7a`, metalness 0.3, roughness 0.25, envMapIntensity 0.55 |
| Shore | Vertex color blend + foam strip quad |
| Depth disc | Keep layered discs; outer darker |
| Amphib splash | Existing FX; tint white-cyan |

### 7.4 Mountains

| Element | Spec |
|---------|------|
| Keep | Procedural height blobs |
| Upgrade | Rock/snow albedo tint from atlas; snow line lerp already in vertex color — strengthen contrast |
| Ridges | Slight darker AO vertex bands |
| Far | Rely on fog; do not add tree forests |

---

## 8. Aircraft materials (per class)

Shared glass + tire + panel atlas. Per-type **base color** + metalness band:

| Class | Base approach | metalness | roughness | Notes |
|-------|---------------|-----------|-----------|-------|
| Cessna 182 | White/paint Standard | 0.05 | 0.7 | Soft specular; strut AO |
| Citation / Airliner | Gloss white + dark belly | 0.12 / 0.4 engines | 0.45 / 0.35 | Engine cowls shinier |
| F-15 | Gray composite | 0.25 | 0.4 | Intake interiors very dark |
| Area 51 **FIC** | Near-black + emissive panel lines | 0.5 | 0.3 | Subtle cyan emissive `#00e5ff` × 0.2 |
| Amphib | Paint + float metal | 0.08 / 0.45 floats | 0.65 / 0.4 | Floats shinier wet look |
| Extra 300 | High-sat scheme | 0.05 | 0.55 | Accent color pops |
| C-130 | Matte gray/green | 0.1 | 0.75 | Low specular |
| Glider | Gelcoat white | 0.08 | 0.35 | Long wing specular streak OK |
| R44 | Bubble glass hero | glass 0.1 / 0.12 | paint 0.7 | Rotor disc stays transparent |

**Landing gear:** dark rubber `roughness 0.95`, metal oleo `metalness 0.6`. Hide gear meshes when retracted (already named `'gear'`).

---

## 9. Renderer / quality presets

```text
Low:    DPR≤1.0, Lambert world, no env on props, fog denser, no instances extras, calls≪60
Medium: DPR≤1.5, Standard heroes + env, atlases 512/1024, LOD on, default ship target
High:   DPR≤2.0, optional 512 shadow, richer city LOD0, clouds on
```

Persist preset in `localStorage`. Auto-detect: if average FPS &lt; 28 for 3 s → drop to Low.

---

## 10. Implementation phases (for other agents)

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| A | `materials.js` factories + PMREM env + aircraft Standard swap | Aircraft read shinier; FPS ≥30 on mid phone |
| B | World atlas 1024 + runway decals + lake Standard | Draw calls ≤100 |
| C | LOD + InstancedMesh lights/trees + merge airport static | Calls ≤80 in cruise |
| D | Quality preset + FPS governor | Auto Low works |
| E (optional) | Soft gradientMap toon props / night preset | Art-directed, not required |

**Do not** add MeshPhysical clearcoat, SSR, SSAO, or 4K textures.

---

## 11. References

- Three.js `MeshStandardMaterial` / `aoMap` / `PMREMGenerator` docs
- Mobile Three.js budgets: ~&lt;100 draw calls (community / Don McCurdy guidance); mid-phone 30 FPS floor
- Fortnite mobile: aggressive LOD, atlasing, shader permutation control (inspiration only — we stay WebGL Three.js)
- Existing: `docs/physics-targets.md` (world scale), `js/world.js`, `js/meshes.js`

*This file is a design spec only — not permission to edit game code by itself; implementers follow their own tasking.*
