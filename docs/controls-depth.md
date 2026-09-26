# Controls Depth — Extra Actions Without Clutter

**Goal:** Expose more **actionable** systems per aircraft class (procedure depth from `aircraft-research.md`) while keeping the phone HUD readable — **≤ ~6 primary touch targets** visible at once, secondary actions on pages/panels, clear **hold vs toggle** rules.

**Baseline today:** `controls.js` shows/hides a flat set from `spec.controls` (`THR`, `COLL`, `FLAPS`, `GEAR`, `SPOILERS`, `BRAKE`, `MIX`, `PROP`, `COND`, `AB`, `TV`, `REV`, `BALLAST`, `WATER`, `TRIM`) plus CAM/JUMP/HELP. Many types already hide unused buttons; complex types (amphib, cargo, airliner) still crowd the column.

**Out of scope:** Editing game code in this doc. Implement in `controls.js`, `index.html` / CSS, `aircraft-data.js` control metadata.

---

## 1. UX principles

1. **Primary strip = flight-critical now** — things you tap every takeoff/landing (THR/COLL, FLAPS, GEAR, BRAKE).
2. **Secondary page = procedure / phase** — MIX, PROP, COND, BALLAST, WATER, spoilers arm, lights, etc.
3. **Tertiary / hold = momentary** — push-to-talk style: brakes (option), view nudge, trim jog already clicky.
4. **One thumb zone** — right-side column for toggles; left for thr/rudder; top HUD never becomes a button farm.
5. **Per-class layouts** — don’t show a universal mega-panel; configure from data.
6. **Desktop parity** — keyboard remains; panels are for touch discovery.

---

## 2. Interaction taxonomy

| Kind | Behavior | Examples | Visual |
|------|----------|----------|--------|
| **Toggle latch** | Tap on/off; stays | GEAR, AB, TV, REV, WATER, MIX, PROP, COND, BALLAST, spoilers extend | `.on` class |
| **Momentary hold** | Active while pressed; release clears | BRAKE (optional mode), PTT radio (future), smoke | Fill while held |
| **Step cycle** | Tap advances; long-press or secondary reverses | FLAPS, lights brightness | Label shows step |
| **Arm then auto** | Arm toggle; deploys on condition | Spoilers ARM → deploy on WOW | “ARMED” chip |
| **Slider** | Continuous | THR, COLL, RUD | Existing |
| **Page switch** | Swaps which toggles are visible | SYS / PROC / COMBAT | Segmented control |

**Default brake policy (refine):** keep **latch toggle** as now for touch reliability in flare; add optional **Hold Brake** mode in settings for desktop-feel. Shift key remains hold on desktop.

---

## 3. Panel / page layout

### 3.1 Chrome

```text
┌─────────────────────────────────────────────┐
│ HUD (airspeed, alt, vsi, config chips)      │
├──────────┬──────────────────────┬───────────┤
│ THR/COLL │                      │ Page tabs │
│ RUD      │      3D view         │ PRIMARY   │
│          │                      │ SYS       │
│          │                      │ (PROC)    │
│          │                      │ CAM JUMP  │
└──────────┴──────────────────────┴───────────┘
│ Checklist drawer (existing, collapsible)    │
└─────────────────────────────────────────────┘
```

**Tabs (max 2–3):**

| Tab ID | Role | Max buttons |
|--------|------|-------------|
| `PRIMARY` | Always-relevant flight controls | **4–5** |
| `SYS` | Systems / config | **4–6** |
| `PROC` | Optional third for expert types only | **4** |

Glider / 182 may use **single page** (no tabs) to avoid chrome waste.

**Page control UI:** segmented `PRI | SYS` under the button column (~32 px tall), or a single `⋯ SYS` button that expands an overlay sheet (bottom sheet on portrait).

**Recommendation:**  
- Portrait phone → **bottom sheet** for SYS (doesn’t steal column width).  
- Landscape → **side tabs**.

### 3.2 Always-visible (outside pages)

| Control | Notes |
|---------|-------|
| THR or COLL | Never paged away |
| RUD | Never paged away |
| CAM | Cycle |
| JUMP | Mode exit |
| Checklist handle | Existing |
| HELP | Existing |

BRAKE: prefer **PRIMARY** (landing critical), not buried.

---

## 4. Hold vs toggle matrix (canonical)

| Control | Touch default | Long-press | Keyboard |
|---------|---------------|------------|----------|
| THR / COLL / RUD | Slider | — | arrows / W S / Q E |
| FLAPS | Step ↑ tap; **long-press ↓** or `[` `]` | Reverse step | `[` `]` Z C |
| GEAR | Toggle | — | G |
| BRAKE | Toggle latch (default) | Optional hold-mode | B toggle; Shift hold |
| SPOILERS | Toggle extend **or** Arm on SYS | Double-tap = arm+extend | X |
| MIX / PROP / COND | Toggle | — | optional keys |
| AB | Toggle (requires thr &gt; 0.6 in model) | — | V |
| TV | Toggle | — | T |
| REV | Toggle; auto-off airborne | — | H |
| BALLAST | Toggle or 3-step cycle | — | — |
| WATER | Toggle intended surface | — | — |
| TRIM | Tap ± | Hold to slew (±0.02 / 100 ms) | — |
| TOGA / GO-AROUND | Momentary set thr=1 + flaps schedule | — | — (new) |
| SMOKE (aero) | Hold | — | — (new) |
| LIGHTS | Cycle OFF/TAXI/NAV | — | — (new, cosmetic) |

---

## 5. Per-class control maps

Control pool from research: `THR`, `COLL`, `FLAPS`, `GEAR`, `SPOILERS`/`SPEEDBRK`, `MIX`, `PROP`, `COND`, `AB`, `TV`, `BALLAST`, `WATER`, plus game `BRAKE`, `REV`, `TRIM`.

### 5.1 Cessna 182 — `easy`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS (step), BRAKE, TRIM |
| SYS | MIX, PROP |
| Hidden | GEAR (fixed), SPOILERS, AB, TV, REV, WATER, BALLAST, COND |

**New optional:** CARB HEAT as cosmetic toggle on SYS (no physics required v1) — skip if unused.

### 5.2 Citation Mustang — `med`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, GEAR, BRAKE, SPOILERS |
| SYS | REV, SPOILER **ARM** (if split), TRIM |

Expose: `THR`, `FLAPS`, `GEAR`, `SPOILERS`, `REV`, `BRAKE`, `TRIM`.

**Pattern:** Spoilers button = extend; long-press or SYS “ARM” sets `spoilersArmed` for landing checklist.

### 5.3 Airliner — `hard`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, GEAR, BRAKE, SPOILERS |
| SYS | REV, ARM SPOILERS, TOGA (sets thr high), TRIM |

Strict: SYS sheet should be one tap away on final. Consider **auto-open SYS** when landing checklist active and spoilers not armed (once per approach, dismissible).

### 5.4 F-15 — `hard`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, GEAR, BRAKE, AB |
| SYS | SPOILERS/speedbrake, TRIM, (optional) HOOK cosmetic |

Combat page not needed. AB stays PRIMARY (combat + TO).

### 5.5 Area 51 — `expert`

| Page | Controls |
|------|----------|
| PRIMARY | GEAR, TV, AB, BRAKE |
| SYS | FLAPS, TRIM, (optional) HOVER ASSIST bias slider |

TV is PRIMARY — landing depends on it. FLAPS secondary.

### 5.6 Caravan Amphib — `med` (highest clutter risk)

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, GEAR, WATER, BRAKE |
| SYS | PROP, COND, REV (beta), TRIM |

**WATER** must stay PRIMARY (gear↔surface gate). Label GEAR dynamically: `GEAR DOWN (LAND)` vs `GEAR UP (WATER)` based on `waterMode`.

### 5.7 Extra 300 — `med`

| Page | Controls |
|------|----------|
| PRIMARY | MIX, PROP, BRAKE, (optional FLAPS) |
| SYS | SMOKE hold, TRIM |

Gear fixed — hide GEAR. Smoke = hold for aerobatic trail (FX only).

### 5.8 C-130J analog — `med`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, GEAR, BRAKE, REV |
| SYS | COND, PROP, TRIM |

Mirror research: condition + prop matter for TO/LDG.

### 5.9 ASW 27 glider — `hard`

| Page | Controls |
|------|----------|
| PRIMARY | FLAPS, SPOILERS, GEAR, BRAKE |
| SYS | BALLAST, TRIM |

No THR (or micro sustainer on SYS). Spoilers are path control — PRIMARY.

### 5.10 R44 heli — `med`

| Page | Controls |
|------|----------|
| PRIMARY | (COLL slider already left), BRAKE optional, TRIM if used |
| SYS | RPM governor proxy toggle (cosmetic/assist), LIGHTS |

Hide flaps/spoilers/gear. Keep UI minimal — collective is the depth.

---

## 6. Data schema (for `aircraft-data.js`)

```js
// Additive fields — implementers
controls: ['THR', 'FLAPS', 'GEAR', 'BRAKE', 'MIX', 'PROP', 'TRIM'],
controlLayout: {
  pages: [
    { id: 'PRIMARY', controls: ['FLAPS', 'GEAR', 'BRAKE'] },
    { id: 'SYS', controls: ['MIX', 'PROP', 'TRIM'] }
  ],
  // omitted pages => single flat list (current behavior)
},
controlMeta: {
  BRAKE: { mode: 'toggle' },          // or 'hold'
  FLAPS: { mode: 'step', longPress: 'stepDown' },
  SPOILERS: { mode: 'toggle', armable: true },
  TOGA: { mode: 'momentary', action: 'toga' },
  SMOKE: { mode: 'hold' },
  TRIM: { mode: 'jog', holdSlew: true }
}
```

Fallback: if `controlLayout` absent, use today’s flat `configureForAircraft` visibility.

---

## 7. Anti-clutter rules (hard)

1. **Never show &gt; 6** toggle/step buttons on one page.
2. **Never show** controls not in `spec.controls` / layout.
3. Fixed-gear → no GEAR button (already).
4. Non-heli → no COLL; heli → no FLAPS/SPOILERS.
5. Glider → no THR on PRIMARY (hide slider).
6. Labels ≤ **10 characters** (`FLAPS 30`, `MIX RICH`, `SPD BRK`).
7. Active page remembered per aircraft id in memory (not required persistent).
8. Checklist item tap → **focus/highlight** related control (pulse border) instead of adding more buttons.

---

## 8. New actionable controls (priority)

Ship only if physics or scoring uses them (see `landing-refinement.md`):

| Priority | Control | Who | Effect |
|----------|---------|-----|--------|
| P0 | Spoilers **ARM** | Mustang, Airliner | Checklist + score |
| P0 | WATER primary | Amphib | Already exists — keep primary |
| P1 | TOGA momentary | Airliner, Mustang | thr→1, ensure TO flaps |
| P1 | TRIM hold-slew | All with TRIM | Faster trim on touch |
| P1 | FLAPS long-press down | All with flaps | Removes contextmenu-only discoverability issue |
| P2 | SMOKE hold | Extra 300 | FX trail |
| P2 | GO-AROUND | Hard types | thr up + flaps TO + gear up suggest |
| P3 | LIGHTS cycle | All | Cosmetic emissive |
| P3 | HOOK / CHUTE | F-15 | Cosmetic or drag spike |

Do **not** add ATC freq, fuel pumps, or magnetos unless checklist scoring needs them — prefer checklist auto-complete flavor text.

---

## 9. Visual / CSS specs (actionable)

| Element | Spec |
|---------|------|
| Tab chip | 44×28 min touch; selected filled accent |
| Bottom sheet | 40% max height; drag handle; dim 3D slightly |
| Hold button | Radial fill while pressed (CSS `transition`) |
| Armed state | Amber outline vs green `.on` for extended |
| Disabled airborne | REV greyed when `!onGround` |
| AB gated | Dim when thr &lt; 0.6; tap may nudge thr or toast |

---

## 10. Acceptance criteria

| Check | Pass |
|-------|------|
| 182 portrait | ≤5 right-side controls visible; MIX/PROP one sheet away |
| Amphib | WATER + GEAR both reachable without opening sheet **or** GEAR on PRIMARY with WATER |
| Airliner final | ARM spoilers ≤2 taps from flight view |
| Extra | Smoke does not appear on 182 |
| Heli | No flaps/gear/spoilers visible |
| Desktop | All actions still keyboard-reachable |
| No regression | Existing `configureForAircraft` behavior if layout omitted |

---

## 11. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| A | `controlLayout` data + page/sheet UI chrome |
| B | Long-press flaps down; TRIM hold-slew; spoilers arm state |
| C | Per-class layouts for all 10 from §5 |
| D | TOGA / GO-AROUND / smoke as P1–P2 |
| E | Settings: brake hold vs latch |

**References:** control pool & checklists in `docs/aircraft-research.md`; landing gates in `docs/landing-refinement.md` & `docs/physics-targets.md`; current wiring in `js/controls.js`.

*Design spec only — not game-code changes.*
