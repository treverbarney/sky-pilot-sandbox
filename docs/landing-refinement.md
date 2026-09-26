# Landing & Takeoff Refinement — Flare, Sink, Alignment, Config, Scoring

**Goal:** Deepen takeoff/landing so each aircraft class feels distinct and skill-gated, using **concrete numbers** from `aircraft-research.md` and `physics-targets.md`. Extends today’s simple `_scoreLanding` (gear / flaps / Vref band / vert / wing-low) in `js/flight-model.js`.

**Out of scope:** Editing game code here. Implement in `flight-model.js`, `checklist.js`, `aircraft-data.js`, HUD cues.

---

## 1. Design principles

1. **Configuration gates before energy gates** — wrong gear/flaps fail hard types before sink math.
2. **Flare is a window, not a button** — height band + pitch/throttle behavior, per class.
3. **Sink rate is the primary touchdown quality signal** — compare to `landVertMax` from physics targets.
4. **Alignment is scored, not only crashed** — centerline + heading + bank.
5. **Per-type weights** — easy (182) forgiving; hard/expert (airliner, F-15, Area 51, glider) harsh.

Conversion (from physics-targets): **1 kt = 0.514444 m/s**, **1 fpm = 0.00508 m/s**, **m/s → fpm × 196.85**.

---

## 2. Approach phases (shared state machine)

Add explicit phases for scoring + checklist (can map to existing takeoff/cruise/landing checklist phases):

| Phase | Gate | Player cue |
|-------|------|------------|
| `downwind` / setup | AGL &gt; 200 m or distance | Config early for hard types |
| `final` | On runway extended centerline ±200 m lateral, AGL &lt; 200 m | Stabilize |
| `short_final` | AGL &lt; **100 ft ≈ 30 m** | Config must be landing |
| `flare_window` | AGL in per-type flare band (§3) | Idle / round out |
| `touchdown` | Contact runway/water/heli skids | Freeze score sample |
| `rollout` | On ground, gs &gt; 5 m/s | Spoilers/rev/brakes for jets |

**Stabilized approach (industry-inspired, game-simplified)** — evaluate at **500 ft AGL ≈ 152 m** (VMC sandbox default; optional 1000 ft for airliner “strict” mode):

| Criterion | Pass |
|-----------|------|
| Flight path | Aiming at runway aim point (± half runway width) |
| Heading | Within **±10°** of runway heading (0° in current world) |
| Bank | \|bank\| &lt; **15°** (0.26 rad) |
| Speed | Within per-type approach band (§5) |
| Config | Landing gear/flaps/spoilers-armed as required |
| Sink | \|vz\| ≤ **1000 fpm ≈ 5.08 m/s** on final (not touchdown limit) |

Unstable at gate → HUD warning; for `hard`/`expert`, continuing may apply score cap or force go-around prompt (soft: score penalty only in v1).

---

## 3. Flare window (per aircraft)

Flare = round-out band where throttle should be near idle (or collective cushion for heli) and pitch increases to arrest sink.

| Aircraft | Flare start AGL | Flare “hold-off” floor | Idle throttle gate | Pitch cue |
|----------|-----------------|------------------------|--------------------|-----------|
| Cessna 182 | **15–20 ft (4.5–6 m)** | 0.3–1.0 m | thr ≤ 0.15 | Hold nose up; float OK |
| Citation Mustang | **20–30 ft (6–9 m)** | 0.5–1.2 m | thr ≤ 0.20 | Don’t balloon |
| Airliner | **30–40 ft (9–12 m)** | 0.5–1.5 m | thr ≤ 0.25 | Positive but firm |
| F-15 | **15–25 ft (4.5–7.5 m)** | 0.4–1.0 m | thr ≤ 0.25 | On-speed; aerobrake after |
| Area 51 **FIC** | **10–40 ft** (TV) / 20–30 conventional | TV: vertical ≤ 2.0 m/s | thr flexible if TV | TV sink &lt; 2 m/s |
| Amphib (land) | **15–20 ft** | 0.3–1.0 m | thr ≤ 0.20 | — |
| Amphib (water) | **10–15 ft** | Attitude hold | thr ≤ 0.20 | Gear **UP** critical |
| Extra 300 | **10–15 ft** | 0.2–0.8 m | thr ≤ 0.15 | Aggressive hold-off OK |
| C-130J analog | **25–35 ft** | 0.5–1.5 m | thr ≤ 0.25 | Long deck |
| Glider | **10–20 ft** | 0.2–0.8 m | N/A (spoilers for path) | Spoilers modulate |
| R44 | Hover gate **3–8 ft** then vertical | Skids level | collective ↓ after touch | Horiz ≤ `landSpeedMax` |

**Game checks (actionable)**

```text
inFlareWindow = agl <= flareStart && agl >= holdOffFloor && phase == short_final|flare
flareIdleOK   = isHeli ? true : throttle <= idleGate
flarePitchOK  = pitch >= pitchMinForType  // e.g. nose-up vs velocity
```

Score: enter window with idle (+8), hold off ≥0.3 s before touch (+7), balloon (agl rising &gt; 1 m in flare) (−10).

Research anchors:

- 182: approach ~70 KIAS, idle in flare (`aircraft-research.md` §1).
- Mustang: VRef ~95–110 kt, idle in flare (§2).
- Airliner: stabilize by 1000 ft AGL, idle flare (§3).
- F-15: on-speed AoA / ~140–170 KIAS (§4).
- Area 51: vertical rate &lt; 2 m/s (§5); physics `landVertMax` 2.0 m/s.
- Glider: ~55 kt threshold, spoilers after touch (§9).
- R44: hover ~5 ft then vertical (§10).

---

## 4. Sink rate (touchdown quality)

Use `landVertMax` from `physics-targets.md` as **crash threshold**. Softer bands for scoring:

| Quality | Vertical speed | Points (base) | Feel |
|---------|----------------|---------------|------|
| Butter | ≤ 0.35 × landVertMax | +20 | Greaser |
| Soft | ≤ 0.60 × landVertMax | +12 | Good |
| Firm | ≤ 0.85 × landVertMax | 0 | Acceptable |
| Hard | ≤ 1.00 × landVertMax | −20 + issue | Survives; ugly |
| Crash | &gt; landVertMax | fail | Explosion |

### Per-type `landVertMax` (from physics-targets — **authoritative**)

| ID | landVertMax (m/s) | ≈ fpm | Notes |
|----|-------------------|-------|-------|
| cessna182 | **3.5** | 689 | forgiving |
| privatejet | **2.8** | 551 | |
| airliner | **1.6** | 315 | airline firm — tight |
| f15 | **2.2** | 433 | |
| area51 | **2.0** | 394 | |
| amphibian | **3.0** land / **2.5** water | 591 / 492 | surface-specific |
| aerobatic | **3.2** | 630 | |
| cargo | **2.5** | 492 | |
| glider | **2.0** | 394 | |
| heli | **2.0** | 394 | + horiz ≤ 15 m/s |

**Final approach sink advisory** (not crash): warn if sink &gt; **5.08 m/s (1000 fpm)** below 150 m AGL while still above flare start — matches FSF stabilized-approach guideline cited in research practice.

---

## 5. Speed / Vref bands at threshold & flare

From physics-targets Vref / approach bands + research KIAS.

| Aircraft | Vref (m/s) | Ideal threshold | Soft fail | Hard fail |
|----------|------------|-----------------|-----------|-----------|
| 182 | **34** (~66 kt) | 32–38 | &gt; 34×1.30 | &gt; landSpeedMax **35** |
| Mustang | **52** (~100 kt) | 48–55 | &gt; 52×1.30 | &gt; **70** |
| Airliner | **72–75** (~140–145 kt) | 70–80 | &gt; 75×1.25 | &gt; **85** |
| F-15 | **70–85** on-speed | 70–90 | &gt; 95 | &gt; **95** landSpeedMax |
| Area 51 TV | **30–45** | 30–45 | &gt; 55 no TV | crash rules per TV |
| Amphib | **40** (~78 kt) | 38–45 | &gt; 40×1.30 | &gt; **40** landSpeedMax |
| Extra | **38** (~74 kt) | 35–42 | &gt; 38×1.30 | &gt; **38** |
| Cargo | **72** (~140 kt) | 65–75 | &gt; 72×1.25 | scaled landSpeedMax |
| Glider | ~28–32 approach | 26–32 | &gt; 36 | &gt; **32** |
| Heli | decelerate to hover | horiz ≤ **15** | — | &gt; 15 fail |

Also enforce **slow/drop-in**: gs &lt; stallSpeed × 1.05 with vert &gt; 1.2 m/s → issue (already in `_scoreLanding`); keep and weight higher for easy types (−15) vs hard (−30 + possible fail).

Research VRef reminders:

- 182: ≈ 1.3 × VS0 ≈ 64 KIAS; game aim 65–70 over threshold.
- Mustang: green-circle ~95–110 KIAS flaps 30°.
- Airliner: VRef flaps full ~130–150 KIAS.
- Caravan amphib: ~75–85 KIAS.
- C-130: approach ~145 KIAS normal.
- ASW 27: ~55 kt over threshold.

---

## 6. Alignment scoring

World runway: heading **0**, halfW **25 m**, halfL **900 m** (`WORLD` in `world.js`).

| Check | Measure at touchdown | Soft | Fail |
|-------|----------------------|------|------|
| Centerline offset | \|x\| (runway frame) | ≤ 8 m: +10; ≤ 15 m: +5; ≤ 25 m: 0 | &gt; halfW → off-runway crash/score 0 |
| Heading error | \|yaw − runwayHd\| | ≤ 5°: +8; ≤ 10°: +3 | &gt; 20° fail (groundloop risk) |
| Bank | \|euler.z\| | ≤ 0.15 rad (~9°): +5; ≤ 0.35: 0 | &gt; 0.55 fail (existing) |
| Touchdown zone | \|z\| along runway | Prefer first **300 m** after threshold | Past mid-runway: −10 “long”; before threshold: −15 “short” |

Touchdown zone aim point: ~**150–300 m** past threshold for jets/airliner; GA may accept first third of runway.

---

## 7. Configuration gates

Mirror research checklists + physics-targets “Landing enforcement thresholds.”

### 7.1 Universal

| Gate | Fail / penalty |
|------|----------------|
| Gear-up on runway (retractable) | **Crash** (`enforceGear`) |
| Amphib gear DOWN on water | **Crash** |
| Amphib gear UP on land | **Crash** |
| Wing low &gt; 0.55 rad | **Crash** |
| vert &gt; landVertMax or gs &gt; landSpeedMax | **Crash** |

### 7.2 Per-type landing config (must be true by short_final / touch)

| Aircraft | Required | Soft if missing | Hard if missing |
|----------|----------|-----------------|-----------------|
| 182 | flaps ≥ approach (e.g. ≥ 0.5 / 20°+); MIX RICH; PROP FULL | −10 each | rarely fail |
| Mustang | gear DOWN; flaps ≥ 30° landing; spoilers available | −20 | flaps short → fail if `enforceFlapsLanding` |
| Airliner | gear DOWN; flaps FULL; spoilers **armed** | — | any missing → **fail** |
| F-15 | gear DOWN; flaps/slats land; speedbrake optional | −15 | gear → fail |
| Area 51 | gear DOWN; TV ON for slow approach **or** conventional speed band | TV off + slow → fail | |
| Amphib land | gear DOWN; flaps landing; PROP/COND as required | −15 | gear mismatch crash |
| Amphib water | gear UP verified; flaps landing | — | gear DOWN → crash |
| Extra | MIX/PROP full; flaps often 0 | −5 | — |
| Cargo | gear DOWN; flaps landing; PROP FULL; COND RUN | −20 | gear → fail |
| Glider | gear DOWN; flaps landing; spoilers for path (not mandatory open pre-touch) | −15 gear | gear-up crash if retractable |
| Heli | skids level; collective management | horiz/tilt fail | |

**Spoilers armed (airliner/Mustang):** state `spoilersArmed === true` before touch; auto-deploy on weight-on-wheels optional (+5 if auto or manual within 1 s).

**Takeoff gates (symmetric depth)** — score or block rotate:

| Aircraft | Before rotate |
|----------|---------------|
| 182 | MIX RICH, PROP FULL, flaps 0 or 20° short |
| Mustang | flaps 15°, spoilers stowed, thrust TO |
| Airliner | flaps TO (1+F / 5), trim set |
| F-15 | flaps TO, AB optional |
| Area 51 | TV enable for short rotate / vertical |
| Amphib | gear matches surface; flaps 20° |
| Cargo | flaps TO; COND RUN; PROP FULL |
| Glider | spoilers locked closed; gear down for launch |
| Heli | RPM/needles joined proxy; collective smooth |

Rotate cue at `Vr` from physics-targets (182 **28 m/s**, Mustang **50**, airliner **70–75**, F-15 **60**, etc.).

---

## 8. Touchdown scoring model (replace/extend `_scoreLanding`)

Start from **100**, apply deltas, clamp 0–100. `fail` ⇒ crash path for hard enforcement.

### 8.1 Category weights by difficulty

| Diff | Config weight | Sink weight | Speed weight | Align weight | Unstable approach |
|------|---------------|-------------|--------------|--------------|-------------------|
| easy | low | forgiving | soft | soft | warn only |
| med | medium | standard | standard | standard | −15 |
| hard | high / fail | tight | tight | tight | −25 or fail continue |
| expert | fail on any major | tight | tight | tight | fail recommended |

### 8.2 Suggested point table (v1)

| Event | Δ points |
|-------|----------|
| Gear correct | 0 (wrong = fail or −100) |
| Flaps correct | 0 / wrong −25 to fail |
| Spoilers armed (if required) | +5 / missing −20 |
| MIX/PROP/COND correct when typed | +3 each / −8 each |
| TV correct (Area 51) | +5 / −30 |
| Speed in ideal band | +15 |
| Speed soft-high | −15 |
| Speed soft-low / drop-in | −25 |
| Sink butter / soft / firm / hard | +20 / +12 / 0 / −20 |
| Centerline ≤8 / ≤15 m | +10 / +5 |
| Heading ≤5° / ≤10° | +8 / +3 |
| Bank good | +5 |
| Flare idle + hold-off | +8 / +7 |
| Balloon / float excessive | −10 |
| Long / short TDZ | −10 / −15 |
| Unstable at 500 ft | −15 to −25 |
| Water landing correct gear | +10 bonus amphib |

Letter grades for UI: 90+ S, 80–89 A, 65–79 B, 50–64 C, &lt;50 D (if survived).

### 8.3 Per-aircraft score emphasis

| Aircraft | Emphasize | De-emphasize |
|----------|-----------|--------------|
| 182 | Flare hold-off, flaps steps | Exact centerline |
| Mustang | Gear+flaps 30, Vref, spoilers | — |
| Airliner | Stable approach, landVertMax **1.6**, config | Butter sink (firm OK) |
| F-15 | On-speed band, gear, sink ≤2.2 | Slow GA-style float |
| Area 51 | TV sink &lt;2, or conventional Vref | — |
| Amphib | Surface↔gear match | — |
| Extra | Energy/slip OK; don’t punish light wing-low as much | Jet-style stable gate |
| Cargo | Long TDZ OK; config; sink ≤2.5 | Short GA runway technique |
| Glider | Energy: speed + spoilers path; no go-around | Throttle criteria |
| Heli | Horiz ≤15, vert ≤2.0, level skids | Vref |

---

## 9. HUD / checklist hooks

1. **Flare cue:** when entering flare window, flash “FLARE” + idle hint.
2. **Sink bar:** show vz in fpm or m/s vs butter/firm/crash bands during short_final.
3. **Alignment needles:** simple lateral deviation + heading error (reuse minimap).
4. **Config chips:** already in `hud.js` — add “ARMED” for spoilers, “STABLE/UNSTABLE”.
5. **Checklist:** bind new gates (`flareIdle`, `aligned`, `stable500`, `tdz`) into `checklist.js` landing items.
6. **Success panel:** show breakdown: Config / Sink / Speed / Align / Flare sub-scores.

---

## 10. Acceptance tests (implementers)

| Test | Expect |
|------|--------|
| 182: flaps 30, ~34 m/s, vert 1.0, centerline | score ≥ 85, no fail |
| Airliner: gear up | crash |
| Airliner: config OK, vert 1.7 | crash (exceeds 1.6) |
| Airliner: config OK, vert 1.2, unstable at 500 | land with score ≤ 75 |
| Amphib water gear down | crash |
| Amphib water gear up, vert 2.0 | land, water surface |
| Heli horiz 16 m/s | crash / fail |
| Area 51 TV on, 35 m/s, vert 1.5 | land ≥ 70 |
| Glider gear up (retractable) | crash |
| F-15 wing-low 0.6 rad | crash |

---

## 11. Implementation phases

| Phase | Work |
|-------|------|
| 1 | Data: add `flareStartAgL`, `flareIdleThr`, `stableGateAgl`, `scoreWeights` to `aircraft-data.js` from tables above |
| 2 | Flight model: phase detection, sink bands, alignment, extended `_scoreLanding` |
| 3 | Checklist + HUD cues |
| 4 | Takeoff rotate gates + Vr callout |
| 5 | Tune on device against physics-targets feel |

**Cite sources of truth:** `docs/aircraft-research.md` (procedures, KIAS), `docs/physics-targets.md` (SI targets, landVertMax, Vref, enforcement table). Do not invent conflicting V-speeds — override only with intentional playability notes (e.g. scaled C-130).

*Design spec only — not game-code changes.*
