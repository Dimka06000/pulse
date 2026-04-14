// ── SVG Body Paths ──
// Anatomically reasonable SVG path data for a human body silhouette (front view)
// viewBox: 0 0 200 400

// Full body outline silhouette
export const BODY_OUTLINE =
  'M100,12 C108,12 114,18 114,28 C114,38 108,46 100,46 C92,46 86,38 86,28 C86,18 92,12 100,12 Z ' + // head
  'M92,46 L88,52 L68,56 L56,60 L44,80 L38,100 L36,112 L40,114 L44,110 L52,88 L62,72 L72,62 L80,56 L92,52 Z ' + // left arm outline
  'M108,46 L112,52 L132,56 L144,60 L156,80 L162,100 L164,112 L160,114 L156,110 L148,88 L138,72 L128,62 L120,56 L108,52 Z ' + // right arm outline
  'M88,52 L80,56 L76,70 L72,90 L72,120 L74,150 L76,170 L80,190 L78,210 L76,230 L72,260 L68,290 L64,320 L62,350 L66,370 L60,380 L58,388 L72,390 L76,382 L78,370 L82,340 L86,310 L90,280 L94,260 L98,240 L100,230 Z ' + // left leg
  'M112,52 L120,56 L124,70 L128,90 L128,120 L126,150 L124,170 L120,190 L122,210 L124,230 L128,260 L132,290 L136,320 L138,350 L134,370 L140,380 L142,388 L128,390 L124,382 L122,370 L118,340 L114,310 L110,280 L106,260 L102,240 L100,230 Z'; // right leg

// Head circle position
export const HEAD_CIRCLE = { cx: 100, cy: 28, r: 16 };

// ── Muscle Region Paths ──
// Each path + label position for tooltip anchoring

export const MUSCLE_PATHS: Record<string, { path: string; labelX: number; labelY: number }> = {
  // Shoulders (deltoid caps)
  shoulders: {
    path: 'M72,58 Q68,54 64,60 Q60,68 64,76 L76,66 Z M128,58 Q132,54 136,60 Q140,68 136,76 L124,66 Z',
    labelX: 100, labelY: 62,
  },
  // Chest (pectorals)
  chest: {
    path: 'M78,68 Q82,64 100,66 Q118,64 122,68 L124,82 Q112,90 100,92 Q88,90 76,82 Z',
    labelX: 100, labelY: 78,
  },
  // Biceps (front upper arms)
  biceps: {
    path: 'M64,76 L60,82 L54,98 L58,102 L66,86 L72,74 Z M136,76 L140,82 L146,98 L142,102 L134,86 L128,74 Z',
    labelX: 54, labelY: 88,
  },
  // Triceps (back upper arms, visible on sides)
  triceps: {
    path: 'M58,78 L54,84 L48,100 L52,104 L58,90 L62,80 Z M142,78 L146,84 L152,100 L148,104 L142,90 L138,80 Z',
    labelX: 148, labelY: 88,
  },
  // Forearms
  forearms: {
    path: 'M48,100 L44,108 L38,114 L42,118 L50,108 L54,100 Z M152,100 L156,108 L162,114 L158,118 L150,108 L146,100 Z',
    labelX: 42, labelY: 110,
  },
  // Core (abdominals)
  core: {
    path: 'M84,92 Q92,88 100,90 Q108,88 116,92 L118,130 Q110,136 100,138 Q90,136 82,130 Z',
    labelX: 100, labelY: 112,
  },
  // Upper back (shown as shoulder blade areas on sides)
  upper_back: {
    path: 'M76,68 L72,72 L74,86 L80,82 Z M124,68 L128,72 L126,86 L120,82 Z',
    labelX: 74, labelY: 76,
  },
  // Lower back (lumbar bands on sides)
  lower_back: {
    path: 'M78,120 L76,130 L78,142 L84,138 L82,128 L80,118 Z M122,120 L124,130 L122,142 L116,138 L118,128 L120,118 Z',
    labelX: 126, labelY: 130,
  },
  // Hip flexors
  hip_flexors: {
    path: 'M86,140 Q92,136 100,138 Q108,136 114,140 L112,156 Q106,152 100,154 Q94,152 88,156 Z',
    labelX: 100, labelY: 148,
  },
  // Glutes (hip area)
  glutes: {
    path: 'M82,150 Q80,142 78,148 L76,164 Q84,170 92,168 L88,156 Z M118,150 Q120,142 122,148 L124,164 Q116,170 108,168 L112,156 Z',
    labelX: 100, labelY: 160,
  },
  // Quadriceps (front thighs)
  quadriceps: {
    path: 'M86,160 L82,180 L78,210 L76,240 L80,250 L88,248 L92,230 L94,210 L96,190 L94,170 Z ' +
          'M114,160 L118,180 L122,210 L124,240 L120,250 L112,248 L108,230 L106,210 L104,190 L106,170 Z',
    labelX: 100, labelY: 210,
  },
  // Hamstrings (inner thigh area, visible from front)
  hamstrings: {
    path: 'M94,170 L96,190 L98,210 L98,240 L96,248 L92,250 L94,230 L94,210 L96,190 Z ' +
          'M106,170 L104,190 L102,210 L102,240 L104,248 L108,250 L106,230 L106,210 L104,190 Z',
    labelX: 100, labelY: 230,
  },
  // Calves (lower legs)
  calves: {
    path: 'M78,260 L74,280 L70,300 L68,320 L66,345 L70,350 L76,340 L80,320 L82,300 L84,280 L82,260 Z ' +
          'M122,260 L126,280 L130,300 L132,320 L134,345 L130,350 L124,340 L120,320 L118,300 L116,280 L118,260 Z',
    labelX: 100, labelY: 310,
  },
};

// ── Tendon Positions (small circles) ──

export const TENDON_POSITIONS: Record<string, { x: number; y: number }> = {
  achilles:        { x: 68, y: 355 },  // behind ankle (also mirrored)
  patellar:        { x: 80, y: 252 },  // below kneecap
  it_band:         { x: 76, y: 220 },  // outer thigh
  plantar_fascia:  { x: 66, y: 380 },  // foot
  rotator_cuff:    { x: 66, y: 62 },   // shoulder
  biceps_tendon:   { x: 62, y: 78 },   // front shoulder
  wrist_flexors:   { x: 40, y: 116 },  // wrist area
};

// ── Joint Positions (small diamonds) ──

export const JOINT_POSITIONS: Record<string, { x: number; y: number }> = {
  knees:        { x: 80, y: 255 },
  ankles:       { x: 68, y: 360 },
  hips:         { x: 82, y: 155 },
  shoulders:    { x: 68, y: 58 },
  elbows:       { x: 52, y: 96 },
  wrists:       { x: 40, y: 114 },
  lumbar_spine: { x: 100, y: 135 },
};

// ── French Labels ──

export const MUSCLE_LABELS_FR: Record<string, string> = {
  quadriceps: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  calves: 'Mollets',
  glutes: 'Fessiers',
  hip_flexors: 'Psoas / Fléchisseurs',
  core: 'Abdominaux',
  lower_back: 'Lombaires',
  upper_back: 'Haut du dos',
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
};

export const TENDON_LABELS_FR: Record<string, string> = {
  achilles: 'Tendon d\'Achille',
  patellar: 'Tendon rotulien',
  it_band: 'Bandelette IT',
  plantar_fascia: 'Fascia plantaire',
  rotator_cuff: 'Coiffe des rotateurs',
  biceps_tendon: 'Tendon du biceps',
  wrist_flexors: 'Fléchisseurs du poignet',
};

export const JOINT_LABELS_FR: Record<string, string> = {
  knees: 'Genoux',
  ankles: 'Chevilles',
  hips: 'Hanches',
  shoulders: 'Épaules',
  elbows: 'Coudes',
  wrists: 'Poignets',
  lumbar_spine: 'Rachis lombaire',
};

export const STATUS_LABELS_FR: Record<string, string> = {
  fresh: 'Frais',
  fatigued: 'Fatigué',
  overloaded: 'Surchargé',
  normal: 'Normal',
  warning: 'Attention',
  danger: 'Danger',
};

export const OVERALL_STATE_FR: Record<string, string> = {
  recovered: 'Prêt',
  moderate: 'En récupération',
  fatigued: 'Fatigué',
  overtrained: 'Surentraîné',
};
