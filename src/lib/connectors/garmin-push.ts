export interface GarminWorkoutStep {
  type: 'warmup' | 'active' | 'rest' | 'cooldown' | 'repeat';
  duration?: { type: 'time' | 'distance'; value: number; unit: string };
  target?: { type: 'pace' | 'heart_rate' | 'power'; low?: number; high?: number };
  description?: string;
  repeatCount?: number;
  steps?: GarminWorkoutStep[];
}

export interface GarminWorkout {
  workoutName: string;
  sport: string;
  steps: GarminWorkoutStep[];
}

export function formatWorkoutForGarmin(
  title: string,
  sport: string,
  workoutData: Record<string, unknown>,
): GarminWorkout {
  const steps: GarminWorkoutStep[] = [];

  // Warmup
  steps.push({
    type: 'warmup',
    duration: { type: 'time', value: 10, unit: 'minutes' },
    description: 'Echauffement',
  });

  // Main workout from data
  const exercises = (workoutData.exercises || []) as Array<{
    name: string;
    sets?: number;
    reps?: number;
    duration_minutes?: number;
    rest_seconds?: number;
  }>;

  for (const ex of exercises) {
    if (ex.sets && ex.reps) {
      steps.push({
        type: 'repeat',
        repeatCount: ex.sets,
        steps: [
          { type: 'active', description: `${ex.name} x${ex.reps}` },
          {
            type: 'rest',
            duration: { type: 'time', value: ex.rest_seconds || 60, unit: 'seconds' },
          },
        ],
      });
    } else if (ex.duration_minutes) {
      steps.push({
        type: 'active',
        duration: { type: 'time', value: ex.duration_minutes, unit: 'minutes' },
        description: ex.name,
      });
    }
  }

  // Cooldown
  steps.push({
    type: 'cooldown',
    duration: { type: 'time', value: 5, unit: 'minutes' },
    description: 'Retour au calme',
  });

  return { workoutName: title, sport, steps };
}
