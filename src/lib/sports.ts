export const SPORTS = [
  'crossfit', 'yoga', 'running', 'trail', 'boxe', 'musculation',
  'fitness', 'pilates', 'meditation', 'natation', 'cyclisme', 'autre',
] as const;

export type Sport = typeof SPORTS[number];

export const SPORT_LABELS: Record<Sport, string> = {
  crossfit: 'CrossFit',
  yoga: 'Yoga',
  running: 'Running',
  trail: 'Trail',
  boxe: 'Boxe',
  musculation: 'Musculation',
  fitness: 'Fitness',
  pilates: 'Pilates',
  meditation: 'Méditation',
  natation: 'Natation',
  cyclisme: 'Cyclisme',
  autre: 'Autre',
};

export const SPORT_EMOJIS: Record<Sport, string> = {
  crossfit: '🏋️',
  yoga: '🧘',
  running: '🏃',
  trail: '⛰️',
  boxe: '🥊',
  musculation: '💪',
  fitness: '🤸',
  pilates: '🧘',
  meditation: '🧠',
  natation: '🏊',
  cyclisme: '🚴',
  autre: '⚡',
};

export const SPORT_GRADIENTS: Record<Sport, string> = {
  crossfit: 'linear-gradient(135deg, #ef4444, #f97316)',
  yoga: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  running: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  trail: 'linear-gradient(135deg, #10b981, #06b6d4)',
  boxe: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  musculation: 'linear-gradient(135deg, #10b981, #059669)',
  fitness: 'linear-gradient(135deg, #f97316, #f59e0b)',
  pilates: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  meditation: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  natation: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  cyclisme: 'linear-gradient(135deg, #14b8a6, #22c55e)',
  autre: 'linear-gradient(135deg, #64748b, #475569)',
};

export const SPORT_GRADIENT_CLASSES: Record<Sport, string> = {
  crossfit: 'from-red-500 to-orange-500',
  yoga: 'from-violet-500 to-pink-500',
  running: 'from-cyan-500 to-blue-500',
  trail: 'from-emerald-500 to-cyan-500',
  boxe: 'from-amber-500 to-red-500',
  musculation: 'from-emerald-500 to-green-600',
  fitness: 'from-orange-500 to-amber-500',
  pilates: 'from-violet-400 to-violet-500',
  meditation: 'from-indigo-500 to-violet-500',
  natation: 'from-sky-500 to-cyan-500',
  cyclisme: 'from-teal-500 to-green-500',
  autre: 'from-slate-500 to-slate-600',
};
