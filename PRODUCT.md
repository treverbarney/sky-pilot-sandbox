# Sky Pilot Sandbox — Product vision & player notes

This file captures the **user’s design intent** from the Grok Bot build chats so the project can continue outside Grok Bot without losing requirements. It is not a verbatim chat log; it is the durable product brief.

## Elevator pitch

A **phone PWA** flight sandbox: start at an airport hangar, pick among **10 very different aircraft**, fly with **phone tilt** plus on-screen systems, and explore a nearby world (city, lake, mountains). Support **landing**, **crash explosions**, **parachute jump with swoop**, **fast ground vehicles**, **hot-air balloon**, and a **space rocket** with a hard landing.

## Core fantasy

- Feel like a **designed product** (design engineers + artists), not a cheap AI demo.
- Graphics goal: **detailed, stylized, Fortnite-adjacent** readability and richness (AI-assisted textures/art), realistic-looking materials and world detail — still performant on phones.
- **Depth over arcade clones**: every aircraft flies, takes off, and lands differently; procedures and checklists matter.

## Aircraft roster (must stay distinct)

1. **Cessna 182** — easiest, forgiving, skydive-friendly; easiest landing.
2. **Small private jet** (Citation Mustang class).
3. **Airliner** (A320/737 class) — heavy, slow rotate, **very hard** takeoff/landing; more steps/systems.
4. **F-15** — fast, high roll, hot landing.
5. **Area 51 unknown-tech jet** — fictional; can almost do anything (thrust vector / near-hover); landing still a hard puzzle.
6. **Amphibian / floatplane** — **water landings** on the lake; gear vs surface critical.
7. **Aerobatic prop** (Extra 300 class).
8. **Cargo turboprop** (C-130J class locked in research).
9. **Glider** — energy management, little/no thrust.
10. **Light helicopter** (R44 class) — collective / hover VTOL.

Research-backed V-speeds, masses, and procedures live in `docs/aircraft-research.md` and `docs/physics-targets.md`.

## Controls

- **Phone tilt** for bank/pitch (motion permission on iOS).
- Fallback: touch drag / keyboard.
- **Many systems buttons**, **per aircraft** (not identical sets): flaps, gear, brakes, trim, rudder, throttle; plus type-specific (mixture/prop, spoilers, reverse, afterburner, thrust vector, ballast, water/land gear mode, collective, etc.).
- Multi-page control layout intent: PRIMARY / SYS / PROC — see `docs/controls-depth.md`.
- HUD: **altitude**, **airspeed (KIAS)**, **corner minimap**, **aircraft info/config**.

## Takeoff & landing (skill challenge)

- Takeoff and landing speeds **accurate to type**; wrong config/speed fails or scores badly.
- **Live checklists** for takeoff and landing per aircraft (show requirements so the player knows what to do).
- Airliner especially: more procedure for TO/LDG.
- Flare, sink rate, alignment, TDZ, configuration gates — see `docs/landing-refinement.md`.
- Crash into ground → **explosion** FX + retry/hangar options.
- Successful runway landing (and **lake** for amphibian).

## Jump / parachute / ground return

- **Jump out** → controllable parachute with lots of movement.
- Can **dive** the canopy, then near ground **pull toggles / swoop** for a long, enjoyable ground skim the player controls.
- On ground: **spawn motorcycle or supercar** (both **200+ mph**) back to airport, **or teleport** to airport.

## Airport extras

- **Hot air balloon** (flyable) — orange pad.
- **Space rocket** — fly to space; **landing extremely difficult**.

## World

- Airport + **small city**, **lake**, land, **mountains** — everything relatively close / explorable.
- Map detail and art quality are first-class (textures, runway markings, lighting). See `docs/graphics-upgrade.md`.

## Product quality bar

- Polished hangar: silhouettes, difficulty, **Info** sheets (specs + how to fly/TO/LDG), **Help** / first-run onboarding.
- Info on **everything** (controls, modes, pads, parachute, vehicles).
- Physics better than arcade clones; landing is a real challenge.
- PWA installable; motion tips for iOS/Android.
- Prefer **Vite** build (`npm run dev` / `npm run build`) for development outside Grok Bot.

## Out of scope (unless later asked)

- Full FAA/study-level sim fidelity
- Multiplayer / ATC
- Photoreal (target is stylized high-detail game art)

## Source chats (Grok Bot)

- Initial endless tilt flyer PWA (`plane-pwa`) superseded by this sandbox.
- User chose **build everything in one go** (balloon, rocket, vehicles included).
- Later asks: quality art/UI pass, research-backed aircraft, checklists, then Fortnite-like graphics + deeper landing/controls.
- User asked to **move project into build and off Grok Bot** → GitHub + Vite.

