'use client';

import { useDroppable } from '@dnd-kit/core';
import { SPORT_GRADIENT_CLASSES, type Sport } from '@/lib/sports';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface WorkoutCard {
  id: string;
  title: string;
  sport?: string;
  duration_minutes: number;
  workout_data?: { exercises?: { name: string }[] };
}

interface DayCellProps {
  weekNumber: number;
  dayNumber: number;
  dayLabel: string;
  workouts: WorkoutCard[];
  onAddWorkout: () => void;
  onClickWorkout: (workout: WorkoutCard) => void;
  onDeleteWorkout: (workoutId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function DayCell({
  weekNumber,
  dayNumber,
  dayLabel,
  workouts,
  onAddWorkout,
  onClickWorkout,
  onDeleteWorkout,
}: DayCellProps) {
  const droppableId = `drop-${weekNumber}-${dayNumber}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[120px] transition-colors ${
        isOver
          ? 'border-brand-500 border-dashed bg-brand-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{dayLabel}</span>
        <button
          onClick={onAddWorkout}
          className="flex h-6 w-6 items-center justify-center rounded-md text-brand-500 hover:bg-brand-50 transition text-xs font-bold"
          aria-label={`Ajouter une séance ${dayLabel}`}
        >
          +
        </button>
      </div>

      {/* Workout cards */}
      {workouts.length > 0 ? (
        <div className="space-y-1.5">
          {workouts.map((w) => {
            const gradientClass = w.sport
              ? SPORT_GRADIENT_CLASSES[w.sport as Sport] || 'from-slate-500 to-slate-600'
              : 'from-slate-500 to-slate-600';

            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => onClickWorkout(w)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onClickWorkout(w);
                }}
                className="group relative rounded-lg border border-gray-100 bg-gray-50 p-2 cursor-pointer hover:bg-gray-100 transition"
              >
                {/* Sport color bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-lg bg-gradient-to-r ${gradientClass}`}
                />

                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {w.title}
                    </p>
                    <p className="text-[10px] text-gray-400">{w.duration_minutes} min</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkout(w.id);
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition text-xs shrink-0"
                    aria-label={`Supprimer ${w.title}`}
                  >
                    &times;
                  </button>
                </div>

                {/* Exercise chips */}
                {w.workout_data?.exercises && w.workout_data.exercises.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.workout_data.exercises.slice(0, 3).map((ex, i) => (
                      <span
                        key={i}
                        className="inline-block rounded bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-600 truncate max-w-[80px]"
                      >
                        {ex.name}
                      </span>
                    ))}
                    {w.workout_data.exercises.length > 3 && (
                      <span className="text-[9px] text-gray-400">
                        +{w.workout_data.exercises.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 text-center mt-4">Aucune séance</p>
      )}
    </div>
  );
}
