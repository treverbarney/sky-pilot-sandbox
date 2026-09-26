# Aircraft Research — Sky Pilot Sandbox

Concrete performance and procedure data for the 10 roster aircraft.  
Speeds are **KIAS** unless noted (KTAS / Mach called out). Masses in **lb** (kg).  
Game may simplify; numbers below are the realism targets.

**Sources (cited per section):** POHs / AFM excerpts, OEM brochures, Wikipedia / MILAVIA / GlobalSecurity aggregations of published specs. Speculative Area 51 jet is **fictional** and labeled as such.

---

## Shared conventions (game)

| Tag | Meaning |
|-----|---------|
| `easy` | Forgiving stall, soft landing envelope |
| `med` | Requires proper config; moderate energy |
| `hard` | Hot approach, heavy inertia, or energy-only |
| `expert` | Extreme speeds / fictional systems |

**On-screen controls pool:** `THR` (throttle), `COLL` (collective), `FLAPS`, `GEAR`, `SPOILERS`/`SPEEDBRK`, `MIX` (mixture), `PROP` (prop RPM), `COND` (condition lever), `AB` (afterburner), `TV` (thrust vector), `BALLAST`, `WATER` (amphib gear/water mode).

---

## 1. Cessna 182 (Skylane 182T class)

**Reference:** Cessna 182T Nav III POH / Airmart 182T Performance & Specs / CAP C182T POH excerpts.

### Mass & speeds

| Item | Value |
|------|-------|
| Empty / BEW | ~1,920–1,997 lb (870–905 kg) |
| MTOW | 3,100 lb (1,406 kg); ramp 3,110 lb |
| Max landing | 2,950 lb |
| Cruise | 145 KTAS @ 80% / 7,000 ft; max SL ~150 kt |
| VNO | 140 KIAS |
| VNE | 175 KIAS |
| VFE | 140 / 120 / 100 KIAS (10° / 20° / 30°) |
| VR | 50–56 KIAS |
| Vx / Vy | ~65 / 80–84 KIAS |
| Approach (full flap) | ~70 KIAS; flapless 80–85 |
| VRef (rule) | ≈ 1.3 × VS0 ≈ 64 KIAS at max wt |
| VS1 (clean) | 51–54 KCAS |
| VS0 (landing) | 41–49 KCAS (POH variants) |
| Climb | ~924 fpm SL |
| Roll character | Mild GA (~45–60°/s peak); docile |

### Required systems — TO / LDG

- **Takeoff:** Flaps 0° normal / 20° short-field; mixture RICH; prop FULL FWD; throttle FULL; fuel pump ON (as POH); cowl flaps OPEN.
- **Landing:** Mixture RICH; prop FULL FWD; flaps as needed (up to 30°/FULL); carb heat as required (carb models); fuel pump ON.

### Takeoff checklist (game-enforceable)

1. Mixture RICH  
2. Prop FULL FORWARD  
3. Flaps 0° (or 20° short)  
4. Trim takeoff  
5. Throttle FULL → rotate ~55 KIAS  
6. Climb Vy ~80 KIAS; flaps UP by 70–80 KIAS  

### Landing checklist

1. Mixture RICH / Prop FULL FWD  
2. Fuel pump ON  
3. Gear fixed (always down)  
4. Flaps 10° → 20° → 30° on final  
5. Aim VRef ~65–70 KIAS over threshold  
6. Idle in flare; hold off; brakes after touchdown  

### Game tags & controls

- **Difficulty:** `easy`
- **Expose:** `THR`, `FLAPS`, `MIX`, `PROP` (no retractable gear)
- **Notes:** Fixed gear; ignore gear button or lock DOWN.

---

## 2. Light private jet — Citation Mustang (Cessna 510) class

**Reference:** Citation Mustang Flight Planning Guide / Spec & Description; Wikipedia Citation Mustang. CJ3 noted as similar class but heavier/faster.

### Mass & speeds

| Item | Value |
|------|-------|
| Typically-equipped empty | ~5,350 lb (2,427 kg); BOW ~5,550 lb |
| MTOW | 8,645 lb (3,921 kg); ramp 8,730 |
| Max landing | 8,000 lb |
| Max cruise | 340 KTAS @ FL350 |
| Typical cruise | 320–345 KTAS |
| VMO / MMO | 250 KIAS / M 0.63 |
| VFE | 185 KIAS (15°); 150 KIAS (30°) |
| VLO/VLE | extend 250 / retract 185 / extended 250 KIAS |
| V1 (example) | ~89 KIAS (brochure sample; wt-dependent) |
| VR / V2 | ~90–105 / ~100–115 KIAS typical light VLJ (wt-dep.) |
| VS clean / VSO | ~94 / ~73 KIAS (brokerage/spec sheets) |
| VMCA | 92 KIAS clean; 81 KIAS flaps 15° |
| Approach / VRef | green-circle ≈ 1.3 VS; typically ~95–110 KIAS at mid wt, flaps 30° |
| Climb (2-eng) | ~3,010 fpm |
| Thrust/weight | ~0.34 at MTOW (2×1,460 lbf) |
| Roll character | Moderate jet (~80–100°/s); crisp for VLJ |

### Required systems — TO / LDG

- **Takeoff:** Flaps 15°; speed brakes IN; trim takeoff; N1/TO thrust; gear UP after positive climb; flaps UP on schedule.
- **Landing:** Flaps 15° then 30°; gear DOWN; speed brakes as needed; VRef + additives; thrust idle in flare; spoilers/brakes/thrust reverse if modeled.

### Takeoff checklist

1. Flaps 15°  
2. Speed brakes stowed  
3. Trims set  
4. Thrust TO → V1 → rotate VR → V2  
5. Gear UP  
6. Flaps UP after acceleration altitude  

### Landing checklist

1. Flaps 15° (approach)  
2. Gear DOWN — three green  
3. Flaps 30° (landing)  
4. Speed brakes armed/available  
5. Maintain VRef to threshold  
6. Idle / touch / spoilers / brakes  

### Game tags & controls

- **Difficulty:** `med`
- **Expose:** `THR`, `FLAPS`, `GEAR`, `SPOILERS`
- **Notes:** Hotter approach than GA; enforce gear-down before landing.

---

## 3. Narrowbody airliner — A320 / B737-800 class

**Reference:** Airbus A320 AC brochure; Boeing 737-800 performance summaries (aircraftinvestigation.info); industry cruise guidance (Mach 0.78–0.80).

*Use A320-200 as primary; 737-800 numbers interleaved where useful.*

### Mass & speeds

| Item | Value |
|------|-------|
| Empty / OEW | A320 ~93,000 lb (42 t); 737-800 ~91,000 lb |
| MTOW | A320 ~162,000–174,000 lb (73.5–79 t); 737-800 ~155,000–174,000 lb |
| MLW | ~142,000–150,000 lb class |
| Cruise | M 0.78–0.80 ≈ 450–470 KTAS @ FL350 |
| VMO / MMO | 350 KIAS / M 0.82 |
| VR (typical mid wt) | ~130–150 KIAS (737-800 sample VR 146 kt) |
| V2 (sample) | ~145–165 KIAS (737-800 sample 162 kt) |
| VRef flaps FULL / 30 | ~130–150 KIAS (sample 737 MLW VRef ~146; A320 ~140 at ~70 t) |
| Stall clean (heavy) | ~160+ KIAS order |
| Stall landing config | ~105–115 KIAS order |
| Climb | ~2,000–3,000 fpm initial (wt/thrust dep.) |
| Roll character | Low (~20–40°/s); high inertia |

### Required systems — TO / LDG

- **Takeoff:** Flaps/slats CONF 1+F or 2 (A320) / flaps 5–15 (737); autobrake/RTO; TOGA; pack/bleed per procedure; gear UP; flaps retract on schedule (S/F speeds).
- **Landing:** Gear DOWN; flaps CONF 3 then FULL (or 30/40); spoilers armed; autobrakes; VApp = VLS + wind additives; reverse thrust after touchdown.

### Takeoff checklist

1. Flaps/slats TO setting (1+F / Flaps 5)  
2. Trim / CG checked  
3. Thrust TOGA / Flex  
4. Rotate VR → climb V2  
5. Gear UP  
6. Accelerate; flaps UP on schedule  

### Landing checklist

1. Gear DOWN  
2. Flaps CONF 3 / 30  
3. Spoilers ARMED  
4. Flaps FULL / 40  
5. Stabilize VApp by 1,000 ft AGL  
6. Idle flare → spoilers → reverse → brakes  

### Game tags & controls

- **Difficulty:** `hard`
- **Expose:** `THR`, `FLAPS`, `GEAR`, `SPOILERS`
- **Notes:** Strict stable-approach gate; gear-up = crash; long rollout.

---

## 4. F-15 (F-15C class; E noted)

**Reference:** MILAVIA F-15 specs; JSBSim F-15 data page; GlobalSecurity; Falcon BMS / checklist aggregations.

### Mass & speeds

| Item | Value |
|------|-------|
| Empty (C) | ~28,600 lb (12,970 kg); E ~31,700 lb |
| Clean TO / interceptor | ~44,630 lb |
| MTOW | C 68,000 lb; E 81,000 lb |
| Max speed | Mach 2.5+ @ alt (~1,433 kt TAS); ~Mach 1.2 SL (~800 kt) |
| Cruise / mil | ~495–570 kt TAS class economical |
| Approach | ~125 kt published modeling; ops often AoA-driven ~155–190 KCAS by weight |
| Rotate | ~110 KCAS @ 40k lb; ~125 KCAS @ 55–60k lb |
| Stall | Config/wt dependent; approach near buffet/AoA limit ~20–22 units |
| Climb | ~50,000 fpm class (published max ROC) |
| Ceiling | 60,000+ ft |
| G limits | +9 / −3 typical |
| Thrust/weight | >1:1 clean with AB (2× ~23,800–29,100 lbf AB) |
| Roll character | Very high (~200–250+ °/s clean); fighter-agile |

### Required systems — TO / LDG

- **Takeoff:** Flaps/slats per TO schedule; stabilator trim; MIL or AB; gear UP ASAP; flaps/slats cruise.
- **Landing:** Gear DOWN; flaps/slats LDG; speedbrake as needed; on-speed AoA; idle/touch; chute optional (not on all variants).

### Takeoff checklist

1. Flaps/slats TO  
2. Trim set  
3. Throttle MIL → AB as needed  
4. Rotate ~110–130 KIAS  
5. Gear UP  
6. Flaps/slats UP  

### Landing checklist

1. Speedbrake as required  
2. Gear DOWN  
3. Flaps/slats LAND  
4. On-speed AoA / ~140–170 KIAS by weight  
5. Idle in flare  
6. Aerobrake → wheel brakes  

### Game tags & controls

- **Difficulty:** `hard`
- **Expose:** `THR`, `FLAPS`, `GEAR`, `SPOILERS`, `AB`
- **Notes:** Hot landing; high roll rate; AB toggles thrust band.

---

## 5. Speculative “Area 51” advanced jet — **FICTIONAL**

> **FICTIONAL / GAME ONLY.** Plausible-extreme numbers for a thrust-vectored black-project demonstrator. Not a real aircraft. Label clearly in UI as speculative.

### Invented targets (extreme but internally consistent)

| Item | Fictional value |
|------|-----------------|
| Empty / MTOW | 12,000 / 22,000 lb |
| Cruise | Mach 1.4 / ~800 KTAS @ alt |
| Dash | Mach 2.8 class |
| Vne-equivalent | Mach 3.0 structural limit (game clamp) |
| Stall / min controllable | ~40 KIAS with TV assist; ~90 KIAS wings-level no TV |
| Rotate | 80 KIAS (high-alpha TV assist) |
| Approach | 60–90 KIAS with TV; 120 without |
| Climb | 60,000+ fpm burst with TV |
| Hover / near-hover | Sustained with vector ≥85% thrust + low IAS |
| Roll | ~300 °/s with TV |
| T/W | ~1.5–2.0 with AB/TV |

### Required systems — TO / LDG

- **Takeoff:** TV ON; flaps optional; gear UP; vector bias aft for accel then up for climb.
- **Landing:** TV ON for slow approach; gear DOWN; flaps as desired; or runway conventional if TV failed.

### Takeoff checklist (game)

1. Thrust vector ENABLE  
2. Gear DOWN confirmed  
3. Throttle ≥70%  
4. Rotate / lift at 80 KIAS or TV vertical  
5. Gear UP  
6. Vector to cruise  

### Landing checklist

1. TV ENABLE (or declare conventional)  
2. Gear DOWN  
3. Decel to 60–90 KIAS with vector  
4. Vertical rate < 2 m/s  
5. Touch / idle vector  

### Game tags & controls

- **Difficulty:** `hard` / `expert`
- **Expose:** `THR`, `GEAR`, `FLAPS`, `TV`, `AB`
- **Notes:** `hoverAssist` style behavior; landing still skill-gated.

---

## 6. Amphibian / floatplane — Cessna 208 Caravan Amphibian (Wipline 8750)

**Reference:** Textron/Cessna Caravan Amphibian product specs; Wipaire 8750 performance sheets.

### Mass & speeds

| Item | Value |
|------|-------|
| Basic empty (amphib) | ~5,585 lb (2,533 kg) |
| MTOW / MLW | 8,750 lb (both; with GW kit) |
| Useful load | ~3,200 lb |
| Max cruise | 159 KTAS (amphib); landplane Caravan 186 KTAS |
| VMO / max limit | 175 KIAS |
| Stall | 60 KCAS (landing config, amphib brochure) |
| Climb | ~939–947 fpm |
| Ceiling | 20,000 ft (amphib) |
| TO ground roll land / water | 1,431 ft / 2,341 ft |
| TO over 50 ft land / water | 2,422 ft / 3,660 ft |
| LDG over 50 ft / roll | 1,853 ft / 1,206 ft |
| Approach | ~75–85 KIAS typical Caravan amphib technique |
| Roll character | Sluggish–moderate; float inertia & drag |

### Required systems — TO / LDG

- **Land takeoff:** Flaps 20° typical; condition FULL; prop FULL; gear DOWN (amphib); water rudders UP if transitioning.
- **Water takeoff:** Gear UP (hull); flaps 20°; water rudders as needed then UP; step taxi → rotate.
- **Land landing:** Gear DOWN; flaps landing; prop FULL; condition as required.
- **Water landing:** Gear UP verified; flaps landing; glassy-water technique / attitude.

### Takeoff checklist (land)

1. Float gear DOWN (land)  
2. Water rudders UP  
3. Flaps 20°  
4. Condition / Prop FULL  
5. Power UP → rotate ~70–75 KIAS  
6. Climb; flaps UP  

### Takeoff checklist (water)

1. Gear UP (critical)  
2. Water rudders as needed → UP on step  
3. Flaps 20°  
4. Power UP → on step → fly off  

### Landing checklist (land)

1. Gear DOWN — confirm  
2. Flaps landing  
3. Prop FULL  
4. Approach ~80 KIAS  
5. Touch / reverse beta if modeled  

### Landing checklist (water)

1. Gear UP — confirm (gear-down water = wreck)  
2. Flaps landing  
3. Attitude / ~75–80 KIAS  
4. Hold off; settle; power idle  

### Game tags & controls

- **Difficulty:** `med`
- **Expose:** `THR`, `FLAPS`, `GEAR`, `COND`, `PROP`, `WATER`
- **Notes:** Enforce gear state by surface; `canWater: true`.

---

## 7. Aerobatic prop — Extra 300 / 300L class

**Reference:** Extra 300/300L specs (GlobalAir, EASA TCDS summaries, AOPA Ramp Appeal, manufacturer figures).

### Mass & speeds

| Item | Value |
|------|-------|
| Empty | ~1,440–1,500 lb (650–680 kg) |
| MTOW normal | ~2,095 lb (950 kg) |
| MTOW aerobatic | ~1,808–1,918 lb (820–870 kg) |
| Cruise | ~170–175 kt |
| VA | 158 KIAS aerobatic; ~140 normal |
| VNE | 220 KIAS |
| Stall | ~55–60 KIAS |
| Climb | ~3,200 fpm |
| Roll rate | **360–400 °/s** (defining trait) |
| G limits | +10/−10 (single); +8/−8 (two-seat aero) |

### Required systems — TO / LDG

- **Takeoff:** Usually flaps UP (many aerobatic types have no/little flap use); mixture RICH; prop FULL; throttle FULL; fixed gear.
- **Landing:** Prop FULL; mixture RICH; flaps if available lightly; slip common; ~70–80 KIAS final.

### Takeoff checklist

1. Mixture RICH  
2. Prop FULL FWD  
3. Flaps UP  
4. Throttle FULL  
5. Rotate ~60–65 KIAS  
6. Climb; watch VNE in dive lines  

### Landing checklist

1. Prop FULL / Mixture RICH  
2. Flaps as equipped (often 0)  
3. Approach ~75 KIAS  
4. Slip if high  
5. Idle flare; stick back  

### Game tags & controls

- **Difficulty:** `med`
- **Expose:** `THR`, `MIX`, `PROP` (optional `FLAPS`); gear locked DOWN
- **Notes:** Emphasize extreme `rollRate`; sensitive pitch.

---

## 8. Cargo turboprop — Lockheed Martin C-130J Super Hercules

**Reference:** GlobalSecurity C-130J specs; Lockheed C-130J materials; stall ~100 kt published.

*(Chose C-130J and stick to it — not ATR/C-212.)*

### Mass & speeds

| Item | Value |
|------|-------|
| Operating empty | 75,562 lb (34,274 kg) |
| Max normal TO | 155,000 lb (70,305 kg) |
| Max overload TO | 175,000 lb (79,380 kg) |
| Max normal landing | 130,000 lb |
| Max cruise | 348 KTAS |
| Econ cruise | 339 KTAS |
| Stall | ~100 kt (published) |
| Climb SL | ~2,100 fpm |
| Cruise altitude | ~28,000 ft |
| TO run / to 15 m | 3,290 ft / 4,700 ft |
| Max-effort TO run | ~1,800 ft |
| Landing from 15 m | ~2,550 ft @ ~59 t |
| Approach / threshold | Threshold ≈ 1.35× stall; approach ≈ threshold+10 → ~145 KIAS normal (wt-dep.) |
| Vr / V2 | Wt-dep.; ballpark 110–130 / 120–140 KIAS medium weights |
| Roll character | Low–moderate; large inertia (~30–50 °/s) |

### Required systems — TO / LDG

- **Takeoff:** Flaps TO %; condition RUN; props FULL; power levers TO; gear UP after climb.
- **Landing:** Gear DOWN; flaps LDG; props FULL / ground fine after touch; condition as required; beta/reverse.

### Takeoff checklist

1. Flaps TO  
2. Condition RUN / props FULL  
3. Power levers TO  
4. Rotate Vr → V2  
5. Gear UP  
6. Flaps UP on schedule  

### Landing checklist

1. Gear DOWN  
2. Flaps approach → landing  
3. Props FULL  
4. Stabilize ~140–150 KIAS  
5. Idle / touch  
6. Ground fine / reverse / brakes  

### Game tags & controls

- **Difficulty:** `med`
- **Expose:** `THR`, `FLAPS`, `GEAR`, `COND`, `PROP`
- **Notes:** Long rollout; stable but heavy; `landVertMax` tight for mass.

---

## 9. Glider — high-performance sailplane (Schleicher ASW 27)

**Reference:** ASW 27 Wikipedia (flight manual cited); Williams Soaring ASW 27 tech specs.

### Mass & speeds

| Item | Value |
|------|-------|
| Empty | 245 kg (540 lb) |
| Max gross | 500 kg (1,102 lb) with ballast |
| Wing area | 9 m²; span 15 m; AR 25 |
| Best L/D | 48:1 |
| Min sink | 0.58 m/s (114 fpm) |
| VNE | 285 km/h = **154 kt** |
| Rough-air / VA | 215 km/h = **116 kt** |
| Aerotow / winch max | 170 / 130 km/h (92 / 70 kt) |
| Min control (full flap, no ballast) | 70 km/h = **38 kt** |
| Best L/D speed | ~54 kt (≈100 km/h) class |
| Stall (approx) | ~38–46 kt depending on loading/flaps |
| Approach | ~50–60 kt with flaps/spoilers |
| Roll character | Crisp for sailplane (~80–120 °/s with aileron+rudder) |

### Required systems — TO / LDG

- **Launch:** Aerotow or winch; gear DOWN for launch; flaps per schedule; spoilers locked shut.
- **Landing:** Gear DOWN; flaps landing; spoilers/dive brakes for path; no throttle (or tiny sustainer off).

### Takeoff / launch checklist

1. Spoilers LOCKED CLOSED  
2. Flaps launch setting  
3. Gear DOWN  
4. Canopy locked  
5. Tow/winch signal → rotate  
6. Gear UP after launch (retractable)  

### Landing checklist

1. Gear DOWN  
2. Flaps landing  
3. Spoilers as needed for path  
4. Aim ~55 kt over threshold  
5. Roundout; spoilers full after touch  
6. Brake  

### Game tags & controls

- **Difficulty:** `hard`
- **Expose:** `FLAPS`, `GEAR`, `SPOILERS`, `BALLAST`; `THR` disabled or sustainer micro
- **Notes:** Energy management; no go-around without sustainer.

---

## 10. Light helicopter — Robinson R44 Raven II class

**Reference:** Robinson R44 II POH / corporate brochures; Wikipedia R44.

### Mass & speeds

| Item | Value |
|------|-------|
| Empty | ~1,505–1,510 lb (683 kg) |
| MTOW | 2,500 lb (1,134 kg) |
| Max cruise / recommended | ~109–110 KIAS |
| Vne | 120 KIAS (>2,200 lb); 130 KIAS (≤2,200 lb) |
| Vy (ROC) | 55 KIAS |
| Autorotation | 60–70 KIAS normal; power-off Vne 100 KIAS |
| Climb | >1,000 fpm class |
| Hover IGE / OGE | charts; ~8,950 ft IGE / ~4,500 ft OGE examples at MGW |
| Max operating DA | 14,000 ft |
| Roll / yaw character | High yaw authority; coupled; sensitive collective |

### Required systems — TO / LDG

- **Takeoff:** Friction set; collective up smoothly; pedals for torque; cyclic to stay level; transition to ETL ~30–40 kt.
- **Landing:** Into wind; collective lower to descend; cyclic for spot; skids level; collective down after touch (flat pitch).

### Takeoff checklist

1. RPM governor ON / needles joined  
2. Clear area  
3. Collective raise → hover  
4. Pedals center torque  
5. Cyclic → transition  
6. Climb Vy 55 KIAS  

### Landing checklist

1. Approach ~60 KIAS decelerating  
2. Settle to hover ~5 ft  
3. Vertical down  
4. Touch skids level  
5. Collective full down  
6. Idle / cool / shutdown as needed  

### Autorotation (emergency checklist)

1. Collective DOWN  
2. Pedals center  
3. Airspeed 60–70 KIAS  
4. Flare / cushion with collective  

### Game tags & controls

- **Difficulty:** `med`
- **Expose:** `COLL`, `THR` (or map THR→COLL), cyclic via tilt; no flaps
- **Notes:** `isHeli: true`; hide flaps/spoilers; VTOL landing envelope.

---

## Summary matrix (quick lookup)

| # | Aircraft | Empty→MTOW (lb) | Cruise | Vne/Vmo | Stall Ldg | Climb | Diff | Key controls |
|---|----------|-----------------|--------|---------|-----------|-------|------|--------------|
| 1 | Cessna 182 | 1.9k→3.1k | 145 | 175 | ~45 | 924 fpm | easy | THR FLAPS MIX PROP |
| 2 | Citation Mustang | 5.4k→8.6k | 340 | 250/M0.63 | ~73 | 3010 | med | THR FLAPS GEAR SPDDBRK |
| 3 | A320/737 | ~90k→170k | M0.78 | 350/M0.82 | ~110 | ~2500 | hard | THR FLAPS GEAR SPDDBRK |
| 4 | F-15C | 29k→68k | M0.9+ | M2.5+ | AoA | 50k fpm | hard | THR FLAPS GEAR AB |
| 5 | Area 51 **FIC** | 12k→22k | M1.4 | M3 | 40 TV | extreme | expert | THR GEAR TV AB |
| 6 | Caravan Amphib | 5.6k→8.8k | 159 | 175 | 60 | 940 | med | THR FLAPS GEAR COND |
| 7 | Extra 300 | 1.5k→2.1k | 175 | 220 | 55 | 3200 | med | THR MIX PROP |
| 8 | C-130J | 76k→155k | 348 | — | ~100 | 2100 | med | THR FLAPS GEAR COND PROP |
| 9 | ASW 27 | 540→1102 | 54 L/D | 154 | ~40 | sink 0.58 | hard | FLAPS GEAR SPOILERS |
| 10 | R44 II | 1.5k→2.5k | 110 | 120 | n/a | >1000 | med | COLL (cyclic) |

---

## Source list

1. Cessna 182T POH performance pages (CAP / Sprinkle / Airmart PDFs) — https://txwg.cap.gov/media/cms/C182TPOH_7552D345422B4.pdf ; https://airmart.com/wp-content/uploads/2022/07/Cessna-182T-Skylane-Performance-and-Specifications.pdf  
2. Citation Mustang Flight Planning Guide — https://www.cavok.at/mustang/citationguide3.pdf ; Wikipedia Citation Mustang  
3. Airbus A320 Aircraft Characteristics; 737-800 performance aggregations — https://www.aircraft.airbus.com/ ; https://aircraftinvestigation.info/airplanes/Boeing_737-800.html  
4. MILAVIA / GlobalSecurity / JSBSim F-15 — https://www.milavia.net/aircraft/f-15/f-15_specs.htm ; https://jsbsim.sourceforge.net/F15.html  
5. Area 51 jet — **fictional invention for this project**  
6. Cessna Caravan Amphibian — https://cessna.txtav.com/en/turboprop/caravan ; Wipaire 8750 sheets  
7. Extra 300/300L — GlobalAir specs, EASA TCDS summaries, AOPA  
8. C-130J — https://www.globalsecurity.org/military/systems/aircraft/c-130j-specs.htm  
9. ASW 27 — https://en.wikipedia.org/wiki/Schleicher_ASW_27 (flight manual cited)  
10. Robinson R44 II POH / Robinson brochures — robinsonheli.com assets  

*Weights and V-speeds are configuration- and weight-dependent operationally; game should use the single representative numbers in `physics-targets.md`.*
