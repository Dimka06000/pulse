'use client';

import { DayCell, type WorkoutCard } from './day-cell';

// ─── Constants ──────────────────────────────────────────────────────────────
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ─── Types ──────────────────────────────────────────────────────────────────
interface WeekGridProps {
  weekNumber: number;
  workouts: (WorkoutCard & { day_number: number })[];
  onAddWorkout?: (weekNumber: number, dayNumber: number) => void;
  onClickWorkout: (workout: WorkoutCard) => void;
  onDeleteWorkout: (workoutId: string) => void;
  tsbByDay?: Record<number, number>;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function WeekGrid({
  weekNumber,
  workouts,
  onAddWorkout,
  onClickWorkout,
  onDeleteWorkout,
  tsbByDay,
}: WeekGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {DAY_LABELS.map((label, index) => {
        const dayNumber = index + 1; // 1-based (Mon=1 … Sun=7)
        const dayWorkouts = workouts.filter((w) => w.day_number === dayNumber);

        return (
          <DayCell
            key={dayNumber}
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            dayLabel={label}
            workouts={dayWorkouts}
            onAddWorkout={() => onAddWorkout?.(weekNumber, dayNumber)}
            onClickWorkout={onClickWorkout}
            onDeleteWorkout={onDeleteWorkout}
            tsb={tsbByDay?.[dayNumber]}
          />
        );
      })}
    </div>
  );
}

export type { WorkoutCard };
