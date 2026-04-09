// packages/coaching/__tests__/scheduling.test.ts
import { describe, it, expect } from 'vitest';
import {
  mergeAvailability,
  calculateAvailableSlots,
  getCoachSlotsForDate,
} from '../src/scheduling';

describe('mergeAvailability', () => {
  it('returns recurring slots when no overrides', () => {
    const result = mergeAvailability(
      [{ start_time: '09:00', end_time: '12:00' }],
      []
    );
    expect(result).toEqual([{ start_time: '09:00', end_time: '12:00' }]);
  });

  it('removes overlapping slots with "remove" override', () => {
    const result = mergeAvailability(
      [
        { start_time: '09:00', end_time: '12:00' },
        { start_time: '14:00', end_time: '18:00' },
      ],
      [{ start_time: '09:00', end_time: '12:00', type: 'remove' }]
    );
    expect(result).toEqual([{ start_time: '14:00', end_time: '18:00' }]);
  });

  it('adds extra slots with "add" override', () => {
    const result = mergeAvailability(
      [{ start_time: '09:00', end_time: '12:00' }],
      [{ start_time: '14:00', end_time: '16:00', type: 'add' }]
    );
    expect(result).toHaveLength(2);
    expect(result[1].start_time).toBe('14:00');
  });
});

describe('calculateAvailableSlots', () => {
  it('generates 60min slots from availability', () => {
    const slots = calculateAvailableSlots(
      [{ start_time: '09:00', end_time: '12:00' }],
      [],
      60
    );
    expect(slots).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
    ]);
  });

  it('excludes booked slots', () => {
    const slots = calculateAvailableSlots(
      [{ start_time: '09:00', end_time: '12:00' }],
      [{ start_time: '10:00', end_time: '11:00' }],
      60
    );
    expect(slots).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '11:00', end: '12:00' },
    ]);
  });

  it('handles 30min sessions', () => {
    const slots = calculateAvailableSlots(
      [{ start_time: '09:00', end_time: '10:00' }],
      [],
      30
    );
    expect(slots).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:00' },
    ]);
  });
});

describe('getCoachSlotsForDate', () => {
  it('combines recurring + overrides + bookings', () => {
    const slots = getCoachSlotsForDate({
      recurringSlots: [{ start_time: '09:00', end_time: '12:00' }],
      overrides: [{ start_time: '14:00', end_time: '16:00', type: 'add' }],
      existingBookings: [{ start_time: '09:00', end_time: '10:00' }],
      sessionDurationMinutes: 60,
    });
    expect(slots).toEqual([
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
    ]);
  });
});
