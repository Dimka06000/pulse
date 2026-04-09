import { describe, it, expect } from 'vitest';
import { SPORTS, SPORT_LABELS, SPORT_GRADIENTS, SPORT_EMOJIS, SPORT_GRADIENT_CLASSES } from '@/lib/sports';

describe('Sports enum', () => {
  it('has 12 sports', () => {
    expect(SPORTS).toHaveLength(12);
  });

  it('every sport has a label', () => {
    for (const sport of SPORTS) {
      expect(SPORT_LABELS[sport]).toBeTruthy();
    }
  });

  it('every sport has a gradient', () => {
    for (const sport of SPORTS) {
      expect(SPORT_GRADIENTS[sport]).toContain('linear-gradient');
    }
  });

  it('every sport has an emoji', () => {
    for (const sport of SPORTS) {
      expect(SPORT_EMOJIS[sport]).toBeTruthy();
    }
  });

  it('every sport has Tailwind gradient classes', () => {
    for (const sport of SPORTS) {
      expect(SPORT_GRADIENT_CLASSES[sport]).toContain('from-');
      expect(SPORT_GRADIENT_CLASSES[sport]).toContain('to-');
    }
  });

  it('includes expected sports', () => {
    expect(SPORTS).toContain('crossfit');
    expect(SPORTS).toContain('yoga');
    expect(SPORTS).toContain('running');
    expect(SPORTS).toContain('boxe');
    expect(SPORTS).toContain('musculation');
  });

  it('labels are human-readable French', () => {
    expect(SPORT_LABELS.crossfit).toBe('CrossFit');
    expect(SPORT_LABELS.meditation).toBe('Méditation');
    expect(SPORT_LABELS.natation).toBe('Natation');
  });
});
