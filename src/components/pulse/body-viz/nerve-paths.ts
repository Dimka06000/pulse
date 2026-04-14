// ── Nervous System SVG Paths ──
// ViewBox: 0 0 200 400 — matches body silhouette

/** Central spine from base of skull to pelvis */
export const SPINE_PATH =
  'M100,45 C100,55 99,70 99,90 C99,110 100,140 100,170 C100,200 100,230 100,250 C100,270 100,280 100,285';

/** Brain outline and center point */
export const BRAIN_PATHS = {
  outline:
    'M88,22 C88,14 92,8 100,8 C108,8 112,14 112,22 C112,30 108,36 100,38 C92,36 88,30 88,22Z',
  center: { x: 100, y: 22 },
};

export interface NerveBranch {
  id: string;
  path: string;
  region: string;
  type: 'major' | 'minor';
}

/** Nerve branches — simplified anatomy */
export const NERVE_BRANCHES: NerveBranch[] = [
  // Cervical plexus — neck to shoulders
  {
    id: 'cervical',
    path: 'M100,50 C95,55 85,60 75,65 M100,50 C105,55 115,60 125,65',
    region: 'neck_shoulders',
    type: 'major',
  },

  // Brachial plexus — left arm
  {
    id: 'brachial_left',
    path: 'M75,65 C68,80 60,110 55,140 C52,155 50,170 48,185',
    region: 'left_arm',
    type: 'major',
  },
  // Brachial plexus — right arm
  {
    id: 'brachial_right',
    path: 'M125,65 C132,80 140,110 145,140 C148,155 150,170 152,185',
    region: 'right_arm',
    type: 'major',
  },

  // Thoracic nerves — mid-spine to core/chest
  {
    id: 'thoracic',
    path: 'M99,90 C90,95 80,100 75,105 M99,90 C108,95 118,100 125,105',
    region: 'torso',
    type: 'major',
  },

  // Lumbar nerves — lower spine to hips
  {
    id: 'lumbar',
    path: 'M100,230 C92,235 82,240 75,248 M100,230 C108,235 118,240 125,248',
    region: 'lower_back',
    type: 'major',
  },

  // Sciatic — left leg (hip down through posterior leg)
  {
    id: 'sciatic_left',
    path: 'M100,280 C95,285 88,295 85,310 C82,330 80,350 78,375',
    region: 'left_leg_posterior',
    type: 'major',
  },
  // Sciatic — right leg
  {
    id: 'sciatic_right',
    path: 'M100,280 C105,285 112,295 115,310 C118,330 120,350 122,375',
    region: 'right_leg_posterior',
    type: 'major',
  },

  // Femoral — left thigh (anterior)
  {
    id: 'femoral_left',
    path: 'M100,270 C94,278 88,290 84,310 C82,325 80,340 79,355',
    region: 'left_thigh',
    type: 'minor',
  },
  // Femoral — right thigh
  {
    id: 'femoral_right',
    path: 'M100,270 C106,278 112,290 116,310 C118,325 120,340 121,355',
    region: 'right_thigh',
    type: 'minor',
  },

  // Tibial — left lower leg
  {
    id: 'tibial_left',
    path: 'M84,310 C82,325 80,345 78,370 C77,380 76,390 76,395',
    region: 'left_lower_leg',
    type: 'minor',
  },
  // Tibial — right lower leg
  {
    id: 'tibial_right',
    path: 'M116,310 C118,325 120,345 122,370 C123,380 124,390 124,395',
    region: 'right_lower_leg',
    type: 'minor',
  },
];
