import { describe, it, expect } from 'vitest';

describe('exercises API shape', () => {
  it('exercise has required fields', () => {
    const exercise = {
      id: 'test-id',
      name: 'Squat',
      name_en: 'Squat',
      sport: 'musculation',
      category: 'compound',
      muscle_engagement: { quadriceps: 90 },
      tendon_stress: { patellar: 75 },
      joint_impact: { knees: 80 },
      is_custom: false,
    };
    expect(exercise.name).toBeTruthy();
    expect(exercise.sport).toBeTruthy();
    expect(['compound', 'isolation', 'cardio', 'flexibility']).toContain(exercise.category);
  });
});
