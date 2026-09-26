# Physics Targets — Sky Pilot Sandbox Flight Model

Target numbers the flight model should hit. All SI unless noted.  
Conversion: **1 kt = 0.514444 m/s**, **1 fpm = 0.00508 m/s**, **1 lb = 0.453592 kg**, **1 lbf ≈ 4.448 N**.

These are **design targets** derived from `aircraft-research.md`. Game code may approximate; prefer matching bands below over vague “feel.”

---

## Global aero defaults (unless overridden)

| Parameter | Target | Notes |
|-----------|--------|-------|
| Stall AoA (clean) | **14–16°** | Onset buffet ~12–14° |
| Stall AoA (landing flaps) | **12–14°** | Flaps lower stall AoA slightly; raise CL_max |
| Critical AoA hard stall | **18°** | Full break / spin entry gate |
| CL_max clean | **1.3–1.5** | GA higher end; jets lower |
| CL_max landing | **1.8–2.4** | With flaps/slats |
| Parasite Cd0 | type-specific | See table |
| Induced factor | `k = 1/(π·e·AR)` | e ≈ 0.7–0.85 |
| Ground effect | +10–20% lift < 1 wingspan | Soften flare |
| Density model | ISA ρ = 1.225·(T/T0)^(…) | Or simple exp scale |

---

## Per-aircraft target table

Speeds in **m/s** (≈ kt × 0.514). Mass in **kg**. Thrust in **N**. Climb in **m/s**. Roll in **rad/s** (and °/s).

### 1. Cessna 182 — `cessna182`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 1,200–1,400 kg | MTOW 1,406 kg |
| wingArea | 16.2 m² | 174 ft² |
| stallSpeed clean | **28 m/s** | 54 kt |
| stallSpeed flaps | **24 m/s** | 47 kt |
| cruiseSpeed | **75 m/s** | 145 kt |
| Vno | **72 m/s** | 140 kt |
| Vne / maxSpeed | **90 m/s** | 175 kt |
| Vr | **28 m/s** | 55 kt |
| Vref | **34 m/s** | 66 kt |
| climbRate SL | **4.7 m/s** | 924 fpm |
| maxThrust | ~2,500–3,000 N equiv. prop | 230 hp @ prop η≈0.8 |
| T/W (static equiv.) | ~0.20–0.25 | |
| rollRate max | **1.0–1.3 rad/s** | ~60–75 °/s |
| pitchRate max | **0.8–1.0 rad/s** | |
| Cd0 | 0.030–0.038 | |
| landSpeedMax (fwd) | 35 m/s | |
| landVertMax | 3.5 m/s | forgiving |
| stallAoA | 15° clean / 13° flaps | |

### 2. Light private jet (Mustang class) — `privatejet`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 3,500–3,900 kg | MTOW 3,921 kg |
| wingArea | 20–28 m² | Mustang ~21 m² class |
| stallSpeed clean | **48 m/s** | 94 kt |
| stallSpeed flaps | **38 m/s** | 73 kt |
| cruiseSpeed | **175 m/s** | 340 kt |
| Vmo | **129 m/s** | 250 kt |
| maxSpeed (TAS game) | **200–220 m/s** | |
| Vr | **50 m/s** | ~97 kt |
| V2 | **55 m/s** | ~107 kt |
| Vref | **52 m/s** | ~100 kt |
| climbRate SL | **15.3 m/s** | 3,010 fpm |
| maxThrust | ~13,000 N (2×6.5 kN) | 2×1,460 lbf |
| T/W | **0.34** | at MTOW |
| rollRate max | **1.4–1.8 rad/s** | ~80–100 °/s |
| Cd0 | 0.020–0.025 | |
| landSpeedMax | 70 m/s | |
| landVertMax | 2.8 m/s | |
| stallAoA | 14° / 12° flaps | |

### 3. Narrowbody airliner — `airliner`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 60,000–78,000 kg | A320/737 mid |
| wingArea | 122–125 m² | A320 122.6 |
| stallSpeed clean | **80–85 m/s** | ~160 kt heavy |
| stallSpeed landing | **55–60 m/s** | ~110 kt |
| cruiseSpeed | **230–240 m/s** | M0.78 @ FL350 ≈ 450+ kt TAS; game may cap IAS-like |
| Vmo | **180 m/s** | 350 kt |
| maxSpeed | **250 m/s** | game TAS clamp |
| Vr | **70–75 m/s** | ~140 kt |
| V2 | **80 m/s** | ~155 kt |
| Vref | **72–75 m/s** | ~140–145 kt |
| climbRate SL | **12–15 m/s** | ~2,400–3,000 fpm |
| maxThrust | ~200–240 kN | 2× CFM56/V2500 class |
| T/W | **0.30–0.35** | |
| rollRate max | **0.4–0.6 rad/s** | ~25–35 °/s |
| Cd0 | 0.020–0.028 | |
| landSpeedMax | 85 m/s | |
| landVertMax | **1.6 m/s** | hard — airline firm |
| stallAoA | 14° / 12° | |

### 4. F-15 — `f15`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 13,000–20,000 kg combat; up to 30,800 MTOW | empty 13 t |
| wingArea | 56.5 m² | 608 ft² |
| stallSpeed approach | **65–75 m/s** | ~125–145 kt |
| cruise / mil | **250–300 m/s** | |
| maxSpeed | **420–740 m/s** | M1.2 SL → M2.5 alt; game pick **420–500** playable |
| Vr | **60 m/s** | ~115 kt |
| Vref / on-speed | **70–85 m/s** | AoA priority |
| climbRate | **250 m/s** burst | ~50,000 fpm |
| maxThrust dry / AB | ~100 kN / **210–260 kN** | 2× F100 |
| T/W AB clean | **>1.0** | |
| rollRate max | **3.5–4.5 rad/s** | ~200–250 °/s |
| Cd0 | 0.015–0.022 | |
| landSpeedMax | 95 m/s | |
| landVertMax | 2.2 m/s | |
| stallAoA | 20–25° (fighter CL) | |

### 5. Area 51 advanced jet — `area51` **FICTIONAL**

| Param | Fictional target |
|-------|------------------|
| mass | 9,000–10,000 kg |
| wingArea | 40 m² |
| stallSpeed (no TV) | 45 m/s |
| stallSpeed (TV assist) | **10–20 m/s** |
| cruise | 350 m/s |
| maxSpeed | **380–500 m/s** |
| Vr / lift | 40 m/s or vertical TV |
| Vref TV | 30–45 m/s |
| climbRate | **300 m/s** burst |
| maxThrust | 90–180 kN + vector |
| T/W | **1.5–2.0** |
| rollRate | **3.0–4.0 rad/s** |
| hoverAssist | 0.8–0.9 lift fraction from TV |
| landVertMax | 2.0 m/s |
| stallAoA | 30°+ with TV |

### 6. Amphibian Caravan — `amphibian`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 3,500–3,970 kg | MTOW 8,750 lb |
| wingArea | 26 m² | 279 ft² |
| stallSpeed | **31 m/s** | 60 kt |
| cruiseSpeed | **82 m/s** | 159 kt |
| maxSpeed | **90 m/s** | 175 kt |
| Vr | **36–38 m/s** | ~70–75 kt |
| Vref | **40 m/s** | ~78 kt |
| climbRate | **4.8 m/s** | 940 fpm |
| maxThrust | ~4,000–5,000 N equiv. | 675 shp |
| T/W | ~0.12–0.15 | |
| rollRate | **0.9–1.1 rad/s** | |
| Cd0 | 0.038–0.045 | floats draggy |
| landSpeedMax | 40 m/s | |
| landVertMax | 3.0 m/s land / **2.5 m/s water** | |
| stallAoA | 15° / 13° | |

### 7. Aerobatic Extra 300 — `aerobatic`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 750–950 kg | |
| wingArea | 10.7–12 m² | |
| stallSpeed | **28–31 m/s** | 55–60 kt |
| cruiseSpeed | **88 m/s** | 170 kt |
| Vne / maxSpeed | **113 m/s** | 220 kt |
| Vr | **32 m/s** | 62 kt |
| Vref | **38 m/s** | 74 kt |
| climbRate | **16.3 m/s** | 3,200 fpm |
| maxThrust | ~2,800–3,500 N | 300 hp class |
| T/W | ~0.35–0.45 | |
| rollRate max | **6.5–7.0 rad/s** | **~370–400 °/s** |
| pitchRate | **2.5–3.0 rad/s** | |
| Cd0 | 0.035–0.042 | |
| landSpeedMax | 38 m/s | |
| landVertMax | 3.2 m/s | |
| stallAoA | 16° (symmetrical foil) | |
| g limit | ±8 to ±10 | |

### 8. Cargo turboprop C-130J — `cargo`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 34,000–70,000 kg (game may scale 14–40 t for play) | OEW 34 t; MTOW 70 t |
| wingArea | 162 m² | 1,745 ft² |
| stallSpeed | **51 m/s** | 100 kt |
| cruiseSpeed | **179 m/s** | 348 kt |
| maxSpeed | **190 m/s** | |
| Vr | **60 m/s** | ~115 kt |
| V2 | **65 m/s** | ~125 kt |
| Vref | **72 m/s** | ~140 kt |
| climbRate | **10.7 m/s** | 2,100 fpm |
| maxThrust | ~80–120 kN equiv. (4 props) | 4×4,637 shp class |
| T/W | ~0.15–0.25 | |
| rollRate | **0.6–0.9 rad/s** | ~35–50 °/s |
| Cd0 | 0.030–0.040 | |
| landSpeedMax | 55–80 m/s (if mass scaled, use 55) | |
| landVertMax | 2.5 m/s | |
| stallAoA | 14° / 12° | |

> If the game keeps the lighter `mass: 14000` placeholder, scale thrust/ stall together so **stall ≈ 42 m/s**, **cruise ≈ 130 m/s**, **T/W ≈ 0.20**, but document that as a **scaled C-130 analog**, not full MTOW.

### 9. Glider ASW 27 — `glider`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 245–500 kg | |
| wingArea | 9.0 m² | |
| stallSpeed | **20–24 m/s** | 38–46 kt |
| bestL/D speed | **28 m/s** | 54 kt |
| Vne / maxSpeed | **73 m/s** | 154 kt |
| VA / rough | **55 m/s** | 116 kt |
| minSink | **0.58 m/s** | |
| L/D max | **48** | |
| climbRate | 0 (or sustainer ≤1 m/s) | |
| maxThrust | 0–200 N | optional sustainer |
| rollRate | **1.4–1.8 rad/s** | |
| Cd0 | **0.008–0.014** | critical |
| CL_max | 1.5–1.7 flaps | |
| landSpeedMax | 32 m/s | |
| landVertMax | 2.0 m/s | |
| stallAoA | 15° / 14° flaps | |

### 10. Light helicopter R44 — `heli`

| Param | Target | ≈ real |
|-------|--------|--------|
| mass | 680–1,134 kg | MTOW 2,500 lb |
| rotor / “wing” proxy | disc ~80 m² (not wingArea 4) | R44 radius ~5 m |
| hover IAS | **0–5 m/s** | |
| ETL onset | **15–20 m/s** | ~30–40 kt |
| Vy | **28 m/s** | 55 kt |
| cruise | **55–56 m/s** | 108–110 kt |
| Vne | **62 m/s** | 120 kt |
| auto speed | **31–36 m/s** | 60–70 kt |
| climbRate | **≥5.1 m/s** | >1,000 fpm |
| maxCollectiveLift | ≥ mass·g · 1.15 at SL | hover margin |
| yawRate | **2.0–2.5 rad/s** | |
| rollRate | **1.5–2.0 rad/s** | |
| landSpeedMax horiz | **15 m/s** | |
| landVertMax | **2.0 m/s** | |
| “stallAoA” | N/A — use rotor stall / vortex ring gates | |

---

## Speed bands (m/s) — HUD / envelope helpers

Use these bands for warnings and scoring:

| Band | GA prop | VLJ | Airliner | Fighter | Amphib | Aero | Cargo | Glider | Heli |
|------|---------|-----|----------|---------|--------|------|-------|--------|------|
| Stall warn | 24–30 | 38–50 | 55–85 | 60–80 | 28–35 | 28–35 | 45–55 | 20–26 | — |
| Approach | 32–40 | 48–55 | 70–80 | 70–90 | 38–45 | 35–42 | 65–75 | 26–32 | 20–35 |
| Cruise | 60–80 | 150–180 | 200–240 | 200–350 | 70–85 | 70–95 | 140–180 | 25–45 | 45–56 |
| Never-exceed | 90 | 129 IAS | 180 IAS | 420+ | 90 | 113 | 190 | 73 | 62 |

---

## Thrust / weight ballpark (dimensionless at MTOW, SL static)

| Aircraft | T/W target |
|----------|------------|
| Cessna 182 | 0.22 |
| Citation Mustang | 0.34 |
| A320/737 | 0.32 |
| F-15 AB | 1.1–1.3 |
| Area 51 **FIC** | 1.6 |
| Caravan Amphib | 0.13 |
| Extra 300 | 0.40 |
| C-130J | 0.20 |
| Glider | 0.00 |
| R44 (hover margin) | Lift/Weight ≥ 1.15 |

---

## Stall AoA summary

| Type | Clean | Landing / high lift |
|------|-------|---------------------|
| GA / aerobatic / amphib / cargo / glider | 14–16° | 12–14° |
| Jets (Mustang / airliner) | 13–15° | 11–13° |
| Fighter | 18–25° (usable alpha) | 16–20° |
| Area 51 + TV | 30°+ soft | — |
| Helicopter | rotor AoA / VRS model, not wing stall | |

---

## Climb rate character (SL, MTOW-ish)

| Aircraft | m/s | fpm | Feel |
|----------|-----|-----|------|
| 182 | 4.7 | 924 | leisurely |
| Mustang | 15.3 | 3,010 | eager jet |
| Airliner | 12–15 | 2.4–3.0k | heavy but strong |
| F-15 | 250 | 50k | vertical |
| Area 51 | 300 | 60k | cartoon-extreme |
| Amphib | 4.8 | 940 | draggy |
| Extra | 16.3 | 3,200 | rocket prop |
| C-130J | 10.7 | 2,100 | solid |
| Glider | −0.58 min sink | — | energy only |
| R44 | ≥5.1 | ≥1,000 | collective |

---

## Roll rate character (max commanded)

| Aircraft | rad/s | °/s | Tag |
|----------|-------|-----|-----|
| 182 | 1.2 | 70 | docile |
| Mustang | 1.5 | 85 | jet crisp |
| Airliner | 0.5 | 30 | ponderous |
| F-15 | 4.0 | 230 | fighter |
| Area 51 | 3.5 | 200 | vectored |
| Amphib | 1.0 | 55 | heavy float |
| Extra | 6.8 | **390** | signature |
| C-130J | 0.75 | 45 | transport |
| Glider | 1.6 | 90 | long wing but light |
| R44 | 1.8 | 100 | cyclic |

---

## Landing enforcement thresholds (game)

| Check | Fail condition |
|-------|----------------|
| Gear | Gear-up on runway (retractable types) → crash |
| Water gear | Amphib gear DOWN on water → crash; gear UP on land → crash |
| Flaps | Airliner/Mustang: flaps < approach setting at <100 ft AGL → hard scoring |
| Vref band | Speed > 1.3× Vref at flare → bounce/float; < 1.05× stall → drop-in |
| Vert rate | Exceed `landVertMax` → crash |
| Glider spoilers | Optional: require spoilers open after touch |
| Heli | Horiz speed > landSpeedMax or tilt > limit → dynamic rollover |

---

## Mapping to current `aircraft-data.js` (read-only note)

Existing placeholders are already in the right *order of magnitude* for a phone sandbox. Preferred tuning pulls:

- Keep 182 stall **28**, max **75**; climb feel via thrust.
- Mustang: raise cruise toward **175–200** m/s if world allows; stall **~48–55**.
- Airliner: keep low roll **0.45**, tight **landVertMax 1.6**.
- F-15: roll **3.5+**, maxSpeed **≥400**.
- Area 51: keep `thrustVector` / `hoverAssist`.
- Amphib: `canWater`, water vert **2.5**.
- Aerobatic: push `rollRate` toward **4–7**.
- Cargo: either document as scaled C-130 or raise mass toward 35–70 t.
- Glider: Cd0 low, thrust ~0, stall **22**.
- Heli: `maxCollectiveLift` ≥ `mass * 9.81 * 1.15`.

**Do not treat this file as permission to edit game code** — it is the target sheet only.

---

## Unit cheat sheet

```
kt  → m/s  : × 0.514444
m/s → kt   : × 1.94384
fpm → m/s  : × 0.00508
m/s → fpm  : × 196.85
lb  → kg   : × 0.453592
lbf → N    : × 4.44822
deg/s → rad/s : × π/180 ≈ 0.017453
```
