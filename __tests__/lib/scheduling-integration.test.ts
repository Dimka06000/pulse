import { describe, it, expect } from 'vitest';
import {
  mergeAvailability,
  calculateAvailableSlots,
  getCoachSlotsForDate,
} from '@oikos/coaching';

describe('Scheduling integration (web perspective)', () => {
  describe('mergeAvailability', () => {
    it('returns original slots when no overrides', () => {
      const result = mergeAvailability(
        [{ start_time: '08:00', end_time: '12:00' }],
        []
      );
      expect(result).toHaveLength(1);
      expect(result[0].start_time).toBe('08:00');
    });

    it('handles multiple add overrides', () => {
      const result = mergeAvailability(
        [{ start_time: '09:00', end_time: '12:00' }],
        [
          { start_time: '14:00', end_time: '16:00', type: 'add' },
          { start_time: '17:00', end_time: '19:00', type: 'add' },
        ]
      );
      expect(result).toHaveLength(3);
    });

    it('handles remove + add combination', () => {
      const result = mergeAvailability(
        [
          { start_time: '09:00', end_time: '12:00' },
          { start_time: '14:00', end_time: '18:00' },
        ],
        [
          { start_time: '09:00', end_time: '12:00', type: 'remove' },
          { start_time: '19:00', end_time: '21:00', type: 'add' },
        ]
      );
      expect(result).toHaveLength(2);
      expect(result[0].start_time).toBe('14:00');
      expect(result[1].start_time).toBe('19:00');
    });
  });

  describe('calculateAvailableSlots', () => {
    it('handles 90min sessions', () => {
      const slots = calculateAvailableSlots(
        [{ start_time: '09:00', end_time: '12:00' }],
        [],
        90
      );
      expect(slots).toEqual([
        { start: '09:00', end: '10:30' },
        { start: '10:30', end: '12:00' },
      ]);
    });

    it('returns empty when all slots booked', () => {
      const slots = calculateAvailableSlots(
        [{ start_time: '09:00', end_time: '10:00' }],
        [{ start_time: '09:00', end_time: '10:00' }],
        60
      );
      expect(slots).toEqual([]);
    });

    it('handles empty availability', () => {
      const slots = calculateAvailableSlots([], [], 60);
      expect(slots).toEqual([]);
    });
  });

  describe('getCoachSlotsForDate — full flow', () => {
    it('morning + afternoon with one booking', () => {
      const slots = getCoachSlotsForDate({
        recurringSlots: [
          { start_time: '09:00', end_time: '12:00' },
          { start_time: '14:00', end_time: '17:00' },
        ],
        overrides: [],
        existingBookings: [{ start_time: '10:00', end_time: '11:00' }],
        sessionDurationMinutes: 60,
      });
      // Morning: 09-10, 11-12 (10-11 booked). Afternoon: 14-15, 15-16, 16-17
      expect(slots).toHaveLength(5);
      expect(slots[0]).toEqual({ start: '09:00', end: '10:00' });
      expect(slots[1]).toEqual({ start: '11:00', end: '12:00' });
    });

    it('empty day (all removed by override)', () => {
      const slots = getCoachSlotsForDate({
        recurringSlots: [{ start_time: '09:00', end_time: '12:00' }],
        overrides: [{ start_time: '09:00', end_time: '12:00', type: 'remove' }],
        existingBookings: [],
        sessionDurationMinutes: 60,
      });
      expect(slots).toEqual([]);
    });
  });
});
