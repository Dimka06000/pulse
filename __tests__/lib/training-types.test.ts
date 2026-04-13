import { describe, it, expect } from 'vitest';
import { isCardioSport, SPORT_TO_DISCIPLINE, DISCIPLINE_PROFILES } from '@/lib/training/exercises';

describe('training exercises', () => {
  it('identifies cardio sports', () => {
    expect(isCardioSport('running')).toBe(true);
    expect(isCardioSport('cyclisme')).toBe(true);
    expect(isCardioSport('natation')).toBe(true);
    expect(isCardioSport('musculation')).toBe(false);
    expect(isCardioSport('boxe')).toBe(false);
  });

  it('maps pulse sports to VIVO disciplines', () => {
    expect(SPORT_TO_DISCIPLINE['musculation']).toBe('strength');
    expect(SPORT_TO_DISCIPLINE['running']).toBe('run');
    expect(SPORT_TO_DISCIPLINE['natation']).toBe('swim');
    expect(SPORT_TO_DISCIPLINE['cyclisme']).toBe('bike');
    expect(SPORT_TO_DISCIPLINE['meditation']).toBe('rest');
  });

  it('has discipline profiles for all disciplines', () => {
    expect(DISCIPLINE_PROFILES.run.muscleEngagement.quadriceps).toBe(85);
    expect(DISCIPLINE_PROFILES.swim.muscleEngagement.shoulders).toBe(85);
    expect(DISCIPLINE_PROFILES.bike.muscleEngagement.quadriceps).toBe(90);
  });
});
