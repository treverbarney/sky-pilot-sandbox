/**
 * Display / info architecture for hangar & HUD.
 * Specs from docs/aircraft-research.md — presentation only (physics owns flight numbers).
 */
export const DIFF_LABEL = {
  easy: 'Easy',
  med: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

export const DIFF_HINT = {
  easy: 'Forgiving stall · soft landing envelope',
  med: 'Needs proper config · moderate energy',
  hard: 'Hot approach · heavy inertia · energy management',
  expert: 'Extreme speeds · fictional systems'
};

/** Per-aircraft presentation: names, blurbs, controls, checklists, key specs */
export const AIRCRAFT_INFO = {
  cessna182: {
    shortName: 'Cessna 182',
    fullName: 'Cessna 182 Skylane',
    classLabel: 'GA high-wing',
    accent: '#3d7cff',
    silhouette: 'highwing',
    blurb: 'Docile trainer energy — best first flight & skydive platform.',
    fictional: false,
    cruise: '145 KTAS',
    vne: '175 KIAS',
    stall: '~45 kt ldg',
    climb: '924 fpm',
    mtow: '3,100 lb',
    approach: '65–70 KIAS',
    controls: ['THR', 'FLAPS', 'MIX', 'PROP'],
    takeoff: [
      'Mixture RICH',
      'Prop FULL FORWARD',
      'Flaps 0° (or 20° short)',
      'Throttle FULL → rotate ~55 KIAS',
      'Climb Vy ~80 KIAS; flaps UP'
    ],
    landing: [
      'Mixture RICH / Prop FULL FWD',
      'Flaps 10° → 20° → 30° on final',
      'Aim VRef ~65–70 KIAS',
      'Idle in flare; hold off'
    ],
    notes: 'Fixed gear — ignore GEAR or leave DOWN.'
  },
  privatejet: {
    shortName: 'Citation Mustang',
    fullName: 'Light Private Jet · Citation Mustang class',
    classLabel: 'VLJ',
    accent: '#8aa4c8',
    silhouette: 'bizjet',
    blurb: 'Clean twinjet — hotter approach than GA, enforce gear-down.',
    fictional: false,
    cruise: '340 KTAS',
    vne: '250 / M0.63',
    stall: '~73 kt',
    climb: '3,010 fpm',
    mtow: '8,645 lb',
    approach: '95–110 KIAS',
    controls: ['THR', 'FLAPS', 'GEAR', 'SPOILERS'],
    takeoff: [
      'Flaps 15°',
      'Speed brakes stowed',
      'Thrust TO → rotate VR',
      'Gear UP after positive climb',
      'Flaps UP on schedule'
    ],
    landing: [
      'Flaps 15° approach',
      'Gear DOWN — three green',
      'Flaps 30° landing',
      'Maintain VRef to threshold'
    ],
    notes: 'Stable-approach discipline; gear-up = crash.'
  },
  airliner: {
    shortName: 'Airliner',
    fullName: 'Narrowbody Airliner · A320 / 737-800 class',
    classLabel: 'Airliner',
    accent: '#e04858',
    silhouette: 'airliner',
    blurb: 'Heavy inertia, slow rotate — very hard landing & long rollout.',
    fictional: false,
    cruise: 'M 0.78–0.80',
    vne: '350 / M0.82',
    stall: '~110 kt ldg',
    climb: '~2,500 fpm',
    mtow: '~170,000 lb',
    approach: '130–150 KIAS',
    controls: ['THR', 'FLAPS', 'GEAR', 'SPOILERS'],
    takeoff: [
      'Flaps TO (1+F / Flaps 5)',
      'Thrust TOGA',
      'Rotate VR → climb V2',
      'Gear UP',
      'Flaps UP on schedule'
    ],
    landing: [
      'Gear DOWN',
      'Flaps CONF 3 / 30 then FULL',
      'Spoilers ARMED',
      'Stabilize VApp by 1,000 ft AGL'
    ],
    notes: 'Strict stable-approach gate; runway preferred.'
  },
  f15: {
    shortName: 'F-15 Eagle',
    fullName: 'F-15C Eagle',
    classLabel: 'Fighter',
    accent: '#6a8498',
    silhouette: 'fighter',
    blurb: 'Blistering roll rate & climb — hot landing, afterburner band.',
    fictional: false,
    cruise: 'M 0.9+',
    vne: 'M 2.5+',
    stall: 'AoA limited',
    climb: '~50,000 fpm',
    mtow: '68,000 lb',
    approach: '140–170 KIAS',
    controls: ['THR', 'FLAPS', 'GEAR', 'SPOILERS', 'AB'],
    takeoff: [
      'Flaps/slats TO',
      'Throttle MIL → AB as needed',
      'Rotate ~110–130 KIAS',
      'Gear UP ASAP',
      'Flaps/slats UP'
    ],
    landing: [
      'Speedbrake as required',
      'Gear DOWN',
      'Flaps/slats LAND',
      'On-speed AoA / idle in flare'
    ],
    notes: 'High energy — plan the downwind early.'
  },
  area51: {
    shortName: 'Area 51 Tech',
    fullName: 'Area 51 Advanced Jet',
    classLabel: 'Experimental',
    accent: '#44ff88',
    silhouette: 'xplane',
    blurb: 'Thrust-vectored black project — speculative / fictional systems.',
    fictional: true,
    cruise: 'M 1.4',
    vne: 'M 3.0',
    stall: '~40 kt TV',
    climb: 'Extreme',
    mtow: '22,000 lb',
    approach: '60–90 KIAS TV',
    controls: ['THR', 'GEAR', 'FLAPS', 'TV', 'AB'],
    takeoff: [
      'Thrust vector ENABLE',
      'Throttle ≥70%',
      'Lift at 80 KIAS or TV vertical',
      'Gear UP',
      'Vector to cruise'
    ],
    landing: [
      'TV ENABLE (or conventional)',
      'Gear DOWN',
      'Decel 60–90 KIAS with vector',
      'Vertical rate < 2 m/s'
    ],
    notes: 'FICTIONAL — labeled speculative in UI. Hover assist still skill-gated.'
  },
  amphibian: {
    shortName: 'Caravan Amphib',
    fullName: 'Cessna 208 Caravan Amphibian',
    classLabel: 'Floatplane',
    accent: '#e88844',
    silhouette: 'amphib',
    blurb: 'Land or lake — gear state is critical on water.',
    fictional: false,
    cruise: '159 KTAS',
    vne: '175 KIAS',
    stall: '60 kt',
    climb: '~940 fpm',
    mtow: '8,750 lb',
    approach: '75–85 KIAS',
    controls: ['THR', 'FLAPS', 'GEAR', 'COND', 'PROP', 'WATER'],
    takeoff: [
      'Land: gear DOWN · Water: gear UP',
      'Flaps 20°',
      'Condition / Prop FULL',
      'Power UP → rotate / step fly-off'
    ],
    landing: [
      'Confirm gear for surface',
      'Flaps landing',
      'Approach ~80 KIAS',
      'Water: gear UP verified (critical)'
    ],
    notes: 'Gear-down on water = wreck. Use the lake east of the airport.'
  },
  aerobatic: {
    shortName: 'Extra 300',
    fullName: 'Extra 300 / 300L class',
    classLabel: 'Aerobatic',
    accent: '#ff3355',
    silhouette: 'extra',
    blurb: '360–400°/s roll — sensitive pitch, light wing loading.',
    fictional: false,
    cruise: '170–175 kt',
    vne: '220 KIAS',
    stall: '55–60 kt',
    climb: '3,200 fpm',
    mtow: '~2,100 lb',
    approach: '70–80 KIAS',
    controls: ['THR', 'MIX', 'PROP'],
    takeoff: [
      'Mixture RICH',
      'Prop FULL FWD',
      'Flaps UP',
      'Throttle FULL → rotate ~60–65'
    ],
    landing: [
      'Prop FULL / Mixture RICH',
      'Approach ~75 KIAS',
      'Slip if high',
      'Idle flare; stick back'
    ],
    notes: 'Watch VNE in dive lines. Gear locked DOWN.'
  },
  cargo: {
    shortName: 'C-130J',
    fullName: 'C-130J Super Hercules',
    classLabel: 'Cargo turboprop',
    accent: '#c8a050',
    silhouette: 'herc',
    blurb: 'Stable workhorse — heavy, long rollout, turboprop feel.',
    fictional: false,
    cruise: '348 KTAS',
    vne: '—',
    stall: '~100 kt',
    climb: '2,100 fpm',
    mtow: '155,000 lb',
    approach: '140–150 KIAS',
    controls: ['THR', 'FLAPS', 'GEAR', 'COND', 'PROP'],
    takeoff: [
      'Flaps TO',
      'Condition RUN / props FULL',
      'Power levers TO',
      'Rotate Vr → V2 · Gear UP'
    ],
    landing: [
      'Gear DOWN',
      'Flaps approach → landing',
      'Props FULL',
      'Stabilize ~140–150 KIAS'
    ],
    notes: 'Plan a long runway. landVertMax is tight for the mass.'
  },
  glider: {
    shortName: 'ASW 27',
    fullName: 'Schleicher ASW 27',
    classLabel: 'Sailplane',
    accent: '#88b8e0',
    silhouette: 'glider',
    blurb: 'Air start · 48:1 L/D — energy management, no go-around.',
    fictional: false,
    cruise: '54 kt L/D',
    vne: '154 kt',
    stall: '~40 kt',
    climb: 'sink 0.58 m/s',
    mtow: '1,102 lb',
    approach: '50–60 kt',
    controls: ['FLAPS', 'GEAR', 'SPOILERS', 'BALLAST'],
    takeoff: [
      'Spoilers LOCKED CLOSED',
      'Flaps launch setting',
      'Gear DOWN for launch',
      'Gear UP after release'
    ],
    landing: [
      'Gear DOWN',
      'Flaps landing',
      'Spoilers for path',
      'Aim ~55 kt over threshold'
    ],
    notes: 'Spawns aloft. THR is tiny sustainer only — plan the pattern.'
  },
  heli: {
    shortName: 'Robinson R44',
    fullName: 'Robinson R44 Raven II',
    classLabel: 'Light helicopter',
    accent: '#44aa66',
    silhouette: 'heli',
    blurb: 'Collective + cyclic VTOL — hover landings, torque yaw.',
    fictional: false,
    cruise: '109–110 KIAS',
    vne: '120 KIAS',
    stall: 'n/a',
    climb: '>1,000 fpm',
    mtow: '2,500 lb',
    approach: '60 kt → hover',
    controls: ['COLL', 'cyclic (tilt)'],
    takeoff: [
      'RPM / needles joined',
      'Collective raise → hover',
      'Pedals center torque',
      'Transition · climb Vy 55 KIAS'
    ],
    landing: [
      'Approach ~60 KIAS decelerating',
      'Settle to hover ~5 ft',
      'Vertical down · skids level',
      'Collective full down'
    ],
    notes: 'Hide flaps/spoilers. Autorotation: collective DOWN, 60–70 KIAS.'
  }
};

export function getAircraftInfo(id) {
  return AIRCRAFT_INFO[id] || null;
}

/** SVG path silhouettes (viewBox 0 0 120 48) — side profiles */
export const SILHOUETTE_SVG = {
  highwing: `<path d="M8 30 h28 l6-4 h22 l8 4 h20 v3 h-12 l-4 8 h-8 l2-8 H40 l-3 8 h-7 l2-8 H14 z" fill="currentColor"/><path d="M18 26 h36 v3 H18z" fill="currentColor" opacity=".85"/><circle cx="22" cy="38" r="3.5" fill="currentColor" opacity=".5"/><circle cx="52" cy="38" r="3.5" fill="currentColor" opacity=".5"/>`,
  bizjet: `<path d="M6 28 l18-6 h40 l22 4 v6 H70 l-4 8 h-8 l2-8 H36 l-3 8 h-7 l2-8 H14z" fill="currentColor"/><ellipse cx="88" cy="28" rx="10" ry="4" fill="currentColor" opacity=".7"/><circle cx="30" cy="38" r="3" fill="currentColor" opacity=".45"/><circle cx="62" cy="38" r="3" fill="currentColor" opacity=".45"/>`,
  airliner: `<path d="M4 26 l22-5 h55 l28 5 v7 H90 l-5 10 h-10 l3-10 H50 l-4 10 h-9 l3-10 H20z" fill="currentColor"/><path d="M40 22 h36 l4 4 H38z" fill="currentColor" opacity=".8"/><circle cx="38" cy="38" r="3.2" fill="currentColor" opacity=".4"/><circle cx="58" cy="38" r="3.2" fill="currentColor" opacity=".4"/><circle cx="78" cy="38" r="3.2" fill="currentColor" opacity=".4"/>`,
  fighter: `<path d="M10 30 l20-8 14-2 30 2 22 6 v5 H78 l6 8 h-8 l-4-8 H42 l-2 6 h-6 l1-6 H22z" fill="currentColor"/><path d="M48 20 l18 2 -2 6 H50z" fill="currentColor" opacity=".75"/>`,
  xplane: `<path d="M20 28 l20-10 20 2 28 8 -8 6 H48 l-6 6 h-8 l4-6 H28z" fill="currentColor"/><ellipse cx="60" cy="30" rx="18" ry="8" fill="currentColor" opacity=".35"/>`,
  amphib: `<path d="M8 26 h30 l8-4 h24 l10 4 h16 v4 H78 l-3 6 H28 l-2 4 h-8 l2-4 H12z" fill="currentColor"/><path d="M14 34 h28 v5 H14z M52 34 h28 v5 H52z" fill="currentColor" opacity=".55"/>`,
  extra: `<path d="M10 28 h20 l4-6 h28 l6 6 h20 v4 H78 l4 8 h-8 l-2-8 H40 l2 8 h-7 l-2-8 H18z" fill="currentColor"/><path d="M28 18 h28 l2 6 H30z" fill="currentColor" opacity=".85"/>`,
  herc: `<path d="M6 27 l18-4 h50 l30 4 v7 H88 l-4 9 h-10 l2-9 H48 l-3 9 h-9 l2-9 H22z" fill="currentColor"/><path d="M34 20 h40 v5 H34z" fill="currentColor" opacity=".75"/><circle cx="42" cy="24" r="4" fill="currentColor" opacity=".5"/><circle cx="58" cy="24" r="4" fill="currentColor" opacity=".5"/>`,
  glider: `<path d="M30 30 h50 v3 H30z M55 20 h4 v22 h-4z" fill="currentColor"/><path d="M8 28 h104 v2.5 H8z" fill="currentColor" opacity=".9"/><path d="M95 24 h3 v12 h-3z" fill="currentColor"/>`,
  heli: `<path d="M28 26 h36 l8 4 v8 H40 l-4 6 h-8 l3-6 H28z" fill="currentColor"/><path d="M8 22 h104 v2 H8z" fill="currentColor" opacity=".85"/><path d="M68 28 h28 v3 H68z" fill="currentColor" opacity=".7"/>`
};
