// packages/coaching/src/scheduling.ts
// Multi-coach scheduling engine.
// Extracted from Elaubody slots.ts + availability.ts, adapted for N coaches.

// ---- Types ----

export type TimeRange = {
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
};

export type AvailabilityOverride = TimeRange & {
  type: 'add' | 'remove';
};

export type TimeSlot = {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

export type ExistingBooking = {
  start_time: string;
  end_time: string;
};

// ---- Helpers (inlined to keep package dependency-free) ----

function timeToMinutes(time: string): number {
  const [h, m] = time.substring(0, 5).split(':').map(Number) as [number, number];
  return h * 60 + m;
}

function addMinutesToTime(time: string, minutes: number): string {
  const total = timeToMinutes(time) + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---- Core Functions ----

/**
 * Merge recurring weekly slots with date-specific overrides.
 * "remove" overrides cancel overlapping recurring slots.
 * "add" overrides inject extra availability.
 *
 * From Elaubody: mergeAvailability() — unchanged logic.
 */
export function mergeAvailability(
  recurring: TimeRange[],
  overrides: AvailabilityOverride[]
): TimeRange[] {
  const removes = overrides.filter((o) => o.type === 'remove');
  const adds = overrides.filter((o) => o.type === 'add');

  const filtered = recurring.filter((slot) => {
    return !removes.some((rem) => {
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);
      const remStart = timeToMinutes(rem.start_time);
      const remEnd = timeToMinutes(rem.end_time);
      return slotStart < remEnd && slotEnd > remStart;
    });
  });

  const added = adds.map((a) => ({
    start_time: a.start_time,
    end_time: a.end_time,
  }));

  return [...filtered, ...added].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
}

/**
 * Calculate bookable time slots from availability windows,
 * excluding already-booked slots.
 *
 * From Elaubody: calculateAvailableSlots() — unchanged logic.
 */
export function calculateAvailableSlots(
  availabilities: TimeRange[],
  existingBookings: ExistingBooking[],
  sessionDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const avail of availabilities) {
    let current = avail.start_time.substring(0, 5);

    while (true) {
      const slotEnd = addMinutesToTime(current, sessionDurationMinutes);

      if (timeToMinutes(slotEnd) > timeToMinutes(avail.end_time)) break;

      const overlaps = existingBookings.some((booking) => {
        return (
          timeToMinutes(current) < timeToMinutes(booking.end_time) &&
          timeToMinutes(slotEnd) > timeToMinutes(booking.start_time)
        );
      });

      if (!overlaps) {
        slots.push({ start: current, end: slotEnd });
      }

      current = slotEnd;
    }
  }

  return slots;
}

/**
 * For a coach: get available slots on a specific date.
 * Combines recurring schedule + date overrides + existing bookings.
 *
 * This is the top-level function called by the API route.
 */
export function getCoachSlotsForDate(params: {
  recurringSlots: TimeRange[];
  overrides: AvailabilityOverride[];
  existingBookings: ExistingBooking[];
  sessionDurationMinutes: number;
}): TimeSlot[] {
  const merged = mergeAvailability(params.recurringSlots, params.overrides);
  return calculateAvailableSlots(
    merged,
    params.existingBookings,
    params.sessionDurationMinutes
  );
}
