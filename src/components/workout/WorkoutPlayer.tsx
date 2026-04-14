'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  name: string;
  sets: number;
  reps: number | null;
  rest_seconds: number;
  duration_minutes: number | null;
  notes: string;
}

interface WorkoutStats {
  duration_seconds: number;
  exercises_completed: number;
  sets_completed: number;
  started_at: string;
  completed_at: string;
}

interface WorkoutPlayerProps {
  workout: {
    id: string;
    title: string;
    exercises: Exercise[];
    totalDuration: number;
  };
  onComplete: (stats: WorkoutStats) => void;
  onExit: () => void;
}

type Phase = 'exercise' | 'rest' | 'timed' | 'paused' | 'completed';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Countdown Ring SVG ───────────────────────────────────────────────────────

function CountdownRing({
  remaining,
  total,
  color,
  size = 220,
}: {
  remaining: number;
  total: number;
  color: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  );
}

// ── Set Dots ─────────────────────────────────────────────────────────────────

function SetDots({
  total,
  current,
  onTap,
}: {
  total: number;
  current: number;
  onTap: (set: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onTap(i + 1)}
          className={`h-3 w-3 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'bg-brand-500 scale-125 shadow-lg shadow-brand-500/40'
              : i + 1 < current
              ? 'bg-brand-500/60'
              : 'bg-white/20'
          }`}
          aria-label={`Set ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutPlayer({ workout, onComplete, onExit }: WorkoutPlayerProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [previousPhase, setPreviousPhase] = useState<Phase>('exercise');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restCountdown, setRestCountdown] = useState(0);
  const [timedCountdown, setTimedCountdown] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [startedAt] = useState(new Date().toISOString());

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Timer refs
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exercise = workout.exercises[currentExerciseIndex];
  const totalExercises = workout.exercises.length;
  const isTimed = exercise && exercise.duration_minutes !== null && exercise.duration_minutes > 0;

  // ── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'paused' || phase === 'completed') {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      return;
    }
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [phase]);

  // ── Auto-start timed exercise ─────────────────────────────────────────
  useEffect(() => {
    if (phase === 'exercise' && isTimed && exercise) {
      setPhase('timed');
      setTimedCountdown(exercise.duration_minutes! * 60);
    }
  }, [phase, isTimed, exercise, currentExerciseIndex, currentSet]);

  // ── Countdown timer (rest & timed) ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'rest' && phase !== 'timed') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      if (phase === 'rest') {
        setRestCountdown(prev => {
          if (prev <= 1) {
            // Rest complete — advance
            if (countdownRef.current) clearInterval(countdownRef.current);
            try { navigator.vibrate?.(200); } catch {}
            advanceAfterRest();
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === 'timed') {
        setTimedCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            try { navigator.vibrate?.(200); } catch {}
            handleSetComplete();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentExerciseIndex, currentSet]);

  // ── Navigation logic ──────────────────────────────────────────────────

  const advanceAfterRest = useCallback(() => {
    if (!exercise) return;
    if (currentSet < exercise.sets) {
      // Next set of same exercise
      setCurrentSet(prev => prev + 1);
      setPhase('exercise');
    } else {
      // Next exercise
      if (currentExerciseIndex < totalExercises - 1) {
        setCompletedExercises(prev => prev + 1);
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
        setPhase('exercise');
      } else {
        // Workout complete
        setCompletedExercises(prev => prev + 1);
        setPhase('completed');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, currentSet, currentExerciseIndex, totalExercises]);

  const handleSetComplete = useCallback(() => {
    if (!exercise) return;
    setCompletedSets(prev => prev + 1);

    // If last set of last exercise, complete
    if (currentSet >= exercise.sets && currentExerciseIndex >= totalExercises - 1) {
      setCompletedExercises(prev => prev + 1);
      setPhase('completed');
      return;
    }

    // Start rest
    setRestCountdown(exercise.rest_seconds || 60);
    setPhase('rest');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, currentSet, currentExerciseIndex, totalExercises]);

  const handleSkipRest = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    advanceAfterRest();
  };

  const handleNext = () => {
    // Skip to next exercise entirely
    if (currentExerciseIndex < totalExercises - 1) {
      // Count remaining sets as completed
      if (exercise) {
        setCompletedSets(prev => prev + (exercise.sets - currentSet + 1));
      }
      setCompletedExercises(prev => prev + 1);
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('exercise');
    }
  };

  const handlePrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setCurrentSet(1);
      setPhase('exercise');
    }
  };

  const handleSetTap = (set: number) => {
    setCurrentSet(set);
  };

  // ── Pause/Resume ──────────────────────────────────────────────────────

  const handlePause = () => {
    setPreviousPhase(phase);
    setPhase('paused');
  };

  const handleResume = () => {
    setPhase(previousPhase === 'paused' ? 'exercise' : previousPhase);
  };

  // ── Completion ────────────────────────────────────────────────────────

  const handleComplete = () => {
    onComplete({
      duration_seconds: elapsedSeconds,
      exercises_completed: completedExercises,
      sets_completed: completedSets,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
  };

  // ── Swipe gestures ────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0) handleNext(); // Swipe left → next
      else handlePrev();          // Swipe right → prev
    }
  };

  // ── Next info for rest screen ─────────────────────────────────────────

  const getNextInfo = (): string => {
    if (!exercise) return '';
    if (currentSet < exercise.sets) {
      return `Set ${currentSet + 1} / ${exercise.sets}`;
    }
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1].name;
    }
    return 'Termine !';
  };

  const getNextLabel = (): string => {
    if (!exercise) return '';
    if (currentSet < exercise.sets) return 'Prochain :';
    return 'Prochain exercice :';
  };

  // ── Progress ──────────────────────────────────────────────────────────

  const totalSetsInWorkout = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const progressRatio = totalSetsInWorkout > 0 ? completedSets / totalSetsInWorkout : 0;

  // ── RENDER ────────────────────────────────────────────────────────────

  // ── Completed screen ──────────────────────────────────────────────────
  if (phase === 'completed') {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center text-white z-50"
        style={{ overscrollBehavior: 'none' }}>
        {/* Checkmark animation */}
        <div className="relative mb-8">
          <div className="h-24 w-24 rounded-full bg-brand-500/20 flex items-center justify-center animate-pulse">
            <div className="h-16 w-16 rounded-full bg-brand-500 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold mb-2">Entrainement termine !</h1>
        <p className="text-gray-400 text-sm mb-8">Bravo, vous avez tout donne !</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-10 px-4">
          <div className="rounded-2xl bg-gray-900 p-4 text-center">
            <p className="text-2xl font-mono font-bold">{formatTime(elapsedSeconds)}</p>
            <p className="text-xs text-gray-400 mt-1">Duree</p>
          </div>
          <div className="rounded-2xl bg-gray-900 p-4 text-center">
            <p className="text-2xl font-mono font-bold">{completedExercises}</p>
            <p className="text-xs text-gray-400 mt-1">Exercices</p>
          </div>
          <div className="rounded-2xl bg-gray-900 p-4 text-center">
            <p className="text-2xl font-mono font-bold">{completedSets}</p>
            <p className="text-xs text-gray-400 mt-1">Series</p>
          </div>
          <div className="rounded-2xl bg-gray-900 p-4 text-center">
            <p className="text-2xl font-mono font-bold">
              {Math.round(progressRatio * 100)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Complete</p>
          </div>
        </div>

        <button
          onClick={handleComplete}
          className="w-full max-w-xs rounded-2xl bg-brand-500 py-4 text-base font-bold text-white hover:bg-brand-600 transition mx-4"
        >
          Enregistrer
        </button>
        <button
          onClick={onExit}
          className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition"
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  // ── Paused overlay ────────────────────────────────────────────────────
  if (phase === 'paused') {
    return (
      <div className="fixed inset-0 bg-gray-950/95 flex flex-col items-center justify-center text-white z-50"
        style={{ overscrollBehavior: 'none' }}>
        <p className="text-4xl font-extrabold mb-2">En pause</p>
        <p className="text-gray-400 text-sm mb-10">{formatTime(elapsedSeconds)} ecoules</p>

        <button
          onClick={handleResume}
          className="w-64 rounded-2xl bg-brand-500 py-4 text-base font-bold text-white hover:bg-brand-600 transition mb-4"
        >
          Reprendre
        </button>
        <button
          onClick={onExit}
          className="w-64 rounded-2xl bg-gray-800 py-4 text-base font-semibold text-gray-300 hover:bg-gray-700 transition"
        >
          Quitter
        </button>
      </div>
    );
  }

  // ── Rest screen ───────────────────────────────────────────────────────
  if (phase === 'rest') {
    const restTotal = exercise?.rest_seconds || 60;
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-safe-top"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
          <button onClick={handlePause} className="text-sm text-gray-400 hover:text-white transition py-3">
            ⏸ Pause
          </button>
          <span className="text-xs text-gray-500 font-mono">{formatTime(elapsedSeconds)}</span>
        </div>

        <p className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-6">Repos</p>

        {/* Countdown ring */}
        <div className="relative mb-6">
          <CountdownRing remaining={restCountdown} total={restTotal} color="#22c55e" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-mono font-extrabold tabular-nums">
              {restCountdown}
            </span>
          </div>
        </div>

        {/* Next info */}
        <p className="text-xs text-gray-500 mb-1">{getNextLabel()}</p>
        <p className="text-lg font-bold text-gray-300 mb-10">{getNextInfo()}</p>

        {/* Skip button */}
        <button
          onClick={handleSkipRest}
          className="rounded-2xl bg-gray-800 px-10 py-4 text-base font-semibold text-white hover:bg-gray-700 transition"
        >
          Passer ▶
        </button>
      </div>
    );
  }

  // ── Timed exercise screen ─────────────────────────────────────────────
  if (phase === 'timed' && exercise) {
    const timedTotal = exercise.duration_minutes! * 60;
    return (
      <div
        className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
          <button onClick={handlePause} className="text-sm text-gray-400 hover:text-white transition py-3">
            ⏸ Pause
          </button>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${progressRatio * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 font-semibold mb-4">
            {exercise.notes || exercise.name}
          </p>

          {/* Countdown ring */}
          <div className="relative mb-6">
            <CountdownRing remaining={timedCountdown} total={timedTotal} color="#f59e0b" size={240} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-mono font-extrabold tabular-nums text-amber-400">
                {formatTime(timedCountdown)}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Set {currentSet} / {exercise.sets}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-center mb-2">{exercise.name}</h2>

          <SetDots total={exercise.sets} current={currentSet} onTap={handleSetTap} />
        </div>

        {/* Bottom action */}
        <div className="px-6 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
          <button
            onClick={handleSetComplete}
            className="w-full rounded-2xl bg-amber-500 py-4 text-base font-bold text-white hover:bg-amber-600 transition"
          >
            Terminer
          </button>
          <p className="text-center text-xs text-gray-600 mt-3 font-mono">
            ⏱ {formatTime(elapsedSeconds)}
          </p>
        </div>
      </div>
    );
  }

  // ── Exercise screen (main) ────────────────────────────────────────────
  if (!exercise) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
      style={{ overscrollBehavior: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
        <button onClick={onExit} className="text-sm text-gray-400 hover:text-white transition py-3">
          ← Quitter
        </button>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progressRatio * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {currentExerciseIndex + 1}/{totalExercises}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Exercise name */}
        <div className="rounded-3xl bg-gray-900/80 border border-gray-800 px-8 py-10 w-full max-w-sm text-center mb-8">
          <h2 className="text-2xl font-extrabold leading-tight mb-3">{exercise.name}</h2>
          <p className="text-xl font-bold text-brand-500">
            {exercise.sets} × {exercise.reps ? `${exercise.reps} reps` : `${exercise.duration_minutes} min`}
          </p>
        </div>

        {/* Set indicator */}
        <p className="text-sm text-gray-400 font-semibold mb-3">
          Set {currentSet} / {exercise.sets}
        </p>
        <SetDots total={exercise.sets} current={currentSet} onTap={handleSetTap} />

        {/* Notes */}
        {exercise.notes && (
          <div className="mt-6 rounded-2xl bg-gray-900/60 border border-gray-800 px-5 py-3 max-w-sm w-full">
            <p className="text-sm text-gray-400 italic text-center">
              &ldquo;{exercise.notes}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="px-6 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
        <div className="flex gap-3">
          <button
            onClick={handlePause}
            className="flex-1 rounded-2xl bg-gray-800 py-4 text-center font-semibold text-gray-300 hover:bg-gray-700 transition"
          >
            ⏸ Pause
          </button>
          <button
            onClick={handleSetComplete}
            className="flex-[2] rounded-2xl bg-brand-500 py-4 text-center font-bold text-white hover:bg-brand-600 transition"
          >
            {currentSet < exercise.sets ? `Repos ${exercise.rest_seconds}s` : 'Suivant ▶'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-3 font-mono">
          ⏱ {formatTime(elapsedSeconds)}
        </p>
      </div>
    </div>
  );
}
