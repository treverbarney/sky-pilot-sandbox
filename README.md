# Sky Pilot Sandbox

Phone-first PWA flight sandbox: hangar with 10 aircraft, live takeoff/landing checklists, parachute swoop, ground vehicles, hot-air balloon, and space rocket.

## Develop / build (recommended)

```bash
npm install
npm run dev      # http://localhost:8777
npm run build    # production assets in dist/
npm run preview  # serve dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

### Static fallback (no Node)

The older `python3 -m http.server` path still works if you restore a Three.js import map in `index.html` (see docs). Prefer Vite + npm for builds off Grok Bot.

---

# Sky Pilot Sandbox

Phone-first **Progressive Web App** flight sandbox. Start in the hangar, pick among **10 aircraft** with distinct flight models and **procedures**, fly a compact world (airport · city · lake · mountains), land or crash, jump with a controllable parachute (dive + swoop), then race back on a **motorcycle / supercar** (200+ mph) or teleport. Airport pads unlock a **hot-air balloon** and a **space rocket** (brutal reentry).

This supersedes the simpler `plane-pwa` endless-flyer concept with a full 3D sandbox.

## Tech

| Piece | Choice |
|--------|--------|
| 3D | **Three.js r170** via native **import map** + jsDelivr CDN |
| Modules | ES modules under `js/` (no bundler) |
| PWA | `manifest.webmanifest` + `service-worker.js` **v5** (network-first for HTML/CSS/JS + CDN; cache fallback offline) |
| Physics | Lift / drag / AoA stall / flaps / gear / spoilers / ground friction / water / heli collective / TV — **parameterized per aircraft** from research targets |
| Target | Mid-range phones — low-poly meshes, capped pixel ratio, modest draw calls |

### CDN / import map

`index.html` maps:

```text
three  → https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js
three/addons/ → https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/
```

First load needs network for Three.js; the service worker then caches it.

**Service worker (`sky-pilot-sandbox-v5`):** network-first for `./`, `index.html`, `css/`, `js/`, and CDN Three.js — so hangar/UI upgrades always show when online. Offline falls back to the last cached shell. Icons use cache-first.

## Serve

```bash
cd /workspace/sky-pilot-sandbox
python3 -m http.server 8777
```

Open **http://localhost:8777/**.

### Stale hangar / hard refresh

If the hangar still shows old plain text cards (no SVG silhouette / Info·Fly buttons), the previous **cache-first** service worker may be stuck:

1. Hard refresh: **Ctrl+Shift+R** (Mac: **Cmd+Shift+R**), or DevTools → Application → Service Workers → Unregister, then Clear site data.
2. Confirm `service-worker.js` reports `CACHE = 'sky-pilot-sandbox-v5'` (network-first for app JS/CSS).
3. `index.html` loads `js/main.js?v=5` as an extra cache-bust.

After v5 activates, reloads should pick up hangar-ui premium cards automatically.

### Phone on same LAN

1. Find the host IP (`ip addr` / `ifconfig`, e.g. `192.168.1.42`).
2. On the phone (same Wi‑Fi): `http://192.168.1.42:8777/`.
3. Tap **Enable motion**, then choose an aircraft.

Device orientation works best over **HTTPS** or installed PWA. Plain LAN HTTP may block sensors on iOS — use a tunnel (Cloudflare Tunnel, ngrok, etc.) if needed.

## Install PWA

- **Android Chrome:** menu → Install app / Add to Home screen.
- **iOS Safari:** Share → Add to Home Screen.

Manifest allows **any** orientation (portrait + landscape).

## How to play

### Hangar

Premium hangar cards show an SVG silhouette, difficulty chip, and **Info** / **Fly** buttons. Tap **Info** (or the card) for the full sheet (specs + checklists); **Fly** spawns on the runway. Difficulty: Easy · Medium · Hard · Expert.

| # | Aircraft | Feel |
|---|----------|------|
| 1 | Cessna 182 | MIX/PROP/flaps steps; fixed gear; forgiving |
| 2 | Citation Mustang | Flaps 15/30, gear, spoilers; hot approach |
| 3 | Narrowbody Airliner | Strict config, spoilers/reverse, **1.6 m/s** sink limit |
| 4 | F-15 | Afterburner, fighter roll, on-speed landing |
| 5 | Area 51 Tech **FIC** | Thrust vector + AB; near-hover; still skill-gated |
| 6 | Caravan Amphibian | Gear must match land/water; WATER toggle |
| 7 | Extra 300 | ~390°/s roll; MIX/PROP |
| 8 | C-130J Analog | Scaled mass; COND/PROP/reverse; long rollout |
| 9 | ASW 27 Glider | Energy only; spoilers/ballast; air start |
| 10 | Robinson R44 | Collective hover; ETL; VTOL land |

Research targets live in `docs/aircraft-research.md` and `docs/physics-targets.md`.

### Flight controls (per aircraft)

Not every aircraft shows the same buttons. Exposed sets come from research (`THR`, `FLAPS`, `GEAR`, `SPOILERS`, `MIX`, `PROP`, `COND`, `AB`, `TV`, `REV`, `BALLAST`, `WATER`, `COLL`).

| Input | Action |
|-------|--------|
| Phone tilt | Bank (aileron) + pitch (elevator) |
| THR / COLL | Throttle or helicopter collective |
| RUD | Rudder / yaw (heli torque) |
| FLAPS | Cycle flap steps (right-click / `[` `]` step) |
| GEAR / SPOILERS / BRAKE / REV | Systems |
| MIX · PROP · COND | Prop / turboprop procedure |
| AB · TV | Afterburner / thrust vector (fighters & Area 51) |
| WATER | Amphib intended surface (gear must match) |
| BALLAST | Glider wing loading |
| TRIM▲▼ · CAM · JUMP · HELP | Trim, camera, eject/board, aircraft help |
| Desktop | WASD/arrows · Q/E · R/F · G gear · X spoilers · V AB · T TV · B brake · H reverse · `[` `]` flaps |

### Takeoff & landing checklists

In-flight checklist panel tracks **required steps and V-speeds** for the **selected** aircraft (auto phase: takeoff → cruise → landing).

- Shows Vr / VRef / stall bands in knots.
- Items complete when config/speed/alignment match (flaps, gear, mix/prop, TV, runway line-up, etc.).
- **Hard / expert** types fail or are harshly scored for gear-up, wrong flaps, unstable approach, or incomplete landing checklist.
- Amphib: gear-down on water or gear-up on land → crash.

Landing success panel includes a simple **score** and issue list (fast, flaps, wing-low, …).

### Parachute & ground

- **DIVE** — faster descent · **SWOOP** — trade height for long ground-skim.
- On landing: **BIKE** / **CAR** (both can exceed **200 mph**) or **AIRPORT** teleport.

### Airport extras

- Taxi/land near the **orange** ring → **JUMP** → hot-air balloon (throttle = burner).
- **Red** ring → rocket. Full throttle to compressed “space” (~25 km), then survive reentry and land near the pad.

### Success / fail

- Soft runway touchdown (or lake for amphibian with gear UP) → landing success panel.
- Hard impact / gear-up / ditch non-amphibian / unstable hard-aircraft approach → explosion + retry / hangar / teleport.

## New systems (flight depth)

| Module | Role |
|--------|------|
| `js/aircraft-data.js` | Research-backed mass, thrust, stall, Vr/Vref, flap steps, control sets, checklists, how-to text |
| `js/flight-model.js` | AoA lift/stall, flap/gear/spoiler drag, ground/water friction, reverse, AB, TV hover, heli ETL/VRS soft, glider energy, landing scoring |
| `js/controls.js` | Per-aircraft visible controls + keyboard bindings |
| `js/checklist.js` | Takeoff/landing/cruise checklist UI + completion tracking |
| `js/hud.js` | Config chips, stall cue, minimap (art + flight) |
| `js/checklist.js` | Live takeoff/landing completion tracker |
| `js/hangar-ui.js` / `aircraft-info.js` | Hangar cards, info sheets, help modal (art pass) |
| Hangar Info / HELP | Specs + how to fly/takeoff/land per type |


## Graphics upgrade (stylized PBR)

Fortnite-like readable look: saturated materials, soft specular, chunky silhouettes — **not** photoreal. See `docs/graphics-upgrade.md`.

| Asset | Path | Notes |
|-------|------|-------|
| Runway asphalt + markings | `assets/textures/runway.png` | 1024 seamless atlas |
| Grass / terrain | `assets/textures/grass.png` | 1024 |
| Water / lake | `assets/textures/water.png` | 1024 |
| Mountain rock | `assets/textures/rock.png` | 1024 |
| City facade atlas | `assets/textures/facade.png` | 1024 (2×2 panels) |
| Sky / horizon | `assets/textures/sky.png` | 1024 (+ PMREM env) |
| Clouds sheet | `assets/textures/clouds.png` | 512 RGBA (High preset) |
| Aircraft metal / paint / composite | `assets/textures/aircraft-*.png` | 512 reusable maps |

Code: `js/materials.js` (factories, quality presets, texture + env load), textured `world.js` / `meshes.js`, richer `effects.js`. Hangar **GFX** cycles Low / Medium / High (`localStorage`). Auto-drops to Low if FPS &lt; 28 for ~3 s.

## File tree

```text
sky-pilot-sandbox/
├── index.html              # Shell, HUD, hangar, checklist, help, import map
├── manifest.webmanifest
├── service-worker.js
├── README.md
├── docs/
│   ├── aircraft-research.md
│   └── physics-targets.md
├── css/style.css
├── icons/icon-192.png
├── icons/icon-512.png
├── assets/textures/       # Stylized PBR atlases (runway, grass, …)
└── js/
    ├── main.js             # Loop, state, camera, checklist wiring
    ├── aircraft-data.js    # 10 aircraft parameters + procedures
    ├── flight-model.js     # Aero / ground / water / heli / TV
    ├── checklist.js        # TO/LDG checklist tracker
    ├── hangar-ui.js        # Hangar cards + info sheet + help
    ├── aircraft-info.js    # Presentation specs / checklists text
    ├── meshes.js           # Low-poly craft & FX
    ├── world.js            # Airport, city, lake, mountains
    ├── controls.js         # Tilt + touch + keyboard (per type)
    ├── modes.js            # Chute, vehicles, balloon, rocket
    ├── effects.js          # Explosion particles
    └── hud.js              # Gauges + minimap + config
```

## Known limitations

- Flight model is **simplified** (not FAA sim) — tuned for distinct feel and phones; numbers track `docs/physics-targets.md`.
- C-130 is a **playable scaled analog**, not full 70 t MTOW.
- Area 51 jet is **fictional**.
- World is compact (~4 km); mountains/city/lake are stylized mid-poly with texture atlases.
- Rocket “space” altitude is compressed for playability; reentry is intentionally harsh.
- CDN Three.js requires network at least once; offline shell alone won’t render 3D until cached.
- iOS motion often needs HTTPS / Home Screen app.
- No multiplayer, sound pack, or complex ATC.

## License

Sample / demo project — use freely (CC0-style).
