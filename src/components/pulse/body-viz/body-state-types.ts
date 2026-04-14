// ── Re-export BodyState from the canonical source ──
// This file exists so Phase 2 components can import locally.
// Once Phase 1 BodyVisualization is created, all imports go through body-state-engine.

export type { BodyState } from '@/lib/training/body-state-engine';
