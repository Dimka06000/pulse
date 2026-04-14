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
  weight_kg?: number | null;
  exercise_type?: ExerciseType;
  bilateral?: boolean; // left/right sides
}

// Auto-detected exercise types
type ExerciseType = 'strength' | 'timed_hold' | 'cardio_interval' | 'amrap' | 'flexibility' | 'distance';

function detectExerciseType(ex: Exercise): ExerciseType {
  const name = ex.name.toLowerCase();
  // Timed holds
  if (/planche|gainage|chaise|wall sit|plank|hold|isometri/i.test(name)) return 'timed_hold';
  // Flexibility / stretching
  if (/etirement|stretch|souplesse|yoga|mobilite|assouplissement/i.test(name)) return 'flexibility';
  // AMRAP style
  if (/amrap|max rep|au max/i.test(name)) return 'amrap';
  // Cardio intervals
  if (/sprint|tabata|burpee|corde|jump|saut|course|velo|rameur|rowing/i.test(name)) return 'cardio_interval';
  // Distance based
  if (/km|metres|nage|crawl|natation/i.test(name)) return 'distance';
  // Default: strength (reps-based)
  return 'strength';
}

// Colors per exercise type
const TYPE_COLORS: Record<ExerciseType, { primary: string; bg: string; label: string }> = {
  strength: { primary: '#3b82f6', bg: 'bg-blue-500', label: 'Force' },
  timed_hold: { primary: '#f59e0b', bg: 'bg-amber-500', label: 'Maintien' },
  cardio_interval: { primary: '#ef4444', bg: 'bg-red-500', label: 'Cardio' },
  amrap: { primary: '#8b5cf6', bg: 'bg-violet-500', label: 'AMRAP' },
  flexibility: { primary: '#10b981', bg: 'bg-emerald-500', label: 'Souplesse' },
  distance: { primary: '#06b6d4', bg: 'bg-cyan-500', label: 'Endurance' },
};

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
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('left');
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Timer refs
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exercise = workout.exercises[currentExerciseIndex];
  const totalExercises = workout.exercises.length;
  const isTimed = exercise && exercise.duration_minutes !== null && exercise.duration_minutes > 0;
  const exerciseType = exercise ? (exercise.exercise_type || detectExerciseType(exercise)) : 'strength';
  const typeStyle = TYPE_COLORS[exerciseType];

  // Reset reps/weight when exercise changes
  useEffect(() => {
    if (exercise) {
      setCurrentReps(exercise.reps || 0);
      setCurrentWeight(exercise.weight_kg || 0);
      setCurrentSide('left');
    }
  }, [currentExerciseIndex, exercise]);

  // Breathing guide for flexibility
  useEffect(() => {
    if (exerciseType !== 'flexibility' || phase !== 'timed') return;
    const interval = setInterval(() => {
      setBreathPhase((p) => (p === 'in' ? 'out' : 'in'));
    }, 4000);
    return () => clearInterval(interval);
  }, [exerciseType, phase]);

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

  // ── Exercise screen (main) — ADAPTIVE per type ────────────────────────
  if (!exercise) return null;

  // Top bar (shared across all types)
  const topBar = (
    <div className="flex items-center justify-between px-5"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
      <button onClick={onExit} className="text-sm text-gray-400 hover:text-white transition py-3">
        ← Quitter
      </button>
      <div className="flex items-center gap-3">
        {/* Type badge */}
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}
          style={{ background: `${typeStyle.primary}30`, color: typeStyle.primary }}>
          {typeStyle.label}
        </span>
        <div className="h-1.5 w-20 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressRatio * 100}%`, background: typeStyle.primary }} />
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {currentExerciseIndex + 1}/{totalExercises}
        </span>
      </div>
    </div>
  );

  // Bottom bar (shared)
  const bottomBar = (
    <div className="px-6 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
      <div className="flex gap-3">
        <button
          onClick={handlePause}
          className="flex-1 rounded-2xl bg-gray-800 py-4 text-center font-semibold text-gray-300 hover:bg-gray-700 transition"
        >
          ⏸
        </button>
        <button
          onClick={handleSetComplete}
          className="flex-[2] rounded-2xl py-4 text-center font-bold text-white transition"
          style={{ background: typeStyle.primary }}
        >
          {currentSet < exercise.sets ? `Serie terminee` : 'Suivant ▶'}
        </button>
      </div>
      <p className="text-center text-xs text-gray-600 mt-3 font-mono">
        ⏱ {formatTime(elapsedSeconds)}
      </p>
    </div>
  );

  // ── STRENGTH mode: reps counter + weight input ──────────────────────
  if (exerciseType === 'strength') {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {topBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-xl font-extrabold mb-1">{exercise.name}</h2>
          <p className="text-sm text-gray-500 mb-6">Set {currentSet} / {exercise.sets}</p>

          {/* Reps counter — big tappable */}
          <div className="flex items-center gap-6 mb-6">
            <button onClick={() => setCurrentReps((r) => Math.max(0, r - 1))}
              className="h-14 w-14 rounded-full bg-gray-800 text-2xl font-bold hover:bg-gray-700 transition flex items-center justify-center">
              −
            </button>
            <div className="text-center">
              <span className="text-6xl font-mono font-extrabold tabular-nums" style={{ color: typeStyle.primary }}>
                {currentReps}
              </span>
              <p className="text-xs text-gray-500 mt-1">reps</p>
            </div>
            <button onClick={() => setCurrentReps((r) => r + 1)}
              className="h-14 w-14 rounded-full bg-gray-800 text-2xl font-bold hover:bg-gray-700 transition flex items-center justify-center">
              +
            </button>
          </div>

          {/* Weight input */}
          <div className="flex items-center gap-3 mb-6 bg-gray-900 rounded-2xl px-5 py-3">
            <button onClick={() => setCurrentWeight((w) => Math.max(0, w - 2.5))}
              className="h-10 w-10 rounded-full bg-gray-800 text-sm font-bold hover:bg-gray-700 transition flex items-center justify-center">
              −
            </button>
            <div className="text-center min-w-[80px]">
              <span className="text-2xl font-mono font-bold">{currentWeight}</span>
              <span className="text-xs text-gray-500 ml-1">kg</span>
            </div>
            <button onClick={() => setCurrentWeight((w) => w + 2.5)}
              className="h-10 w-10 rounded-full bg-gray-800 text-sm font-bold hover:bg-gray-700 transition flex items-center justify-center">
              +
            </button>
          </div>

          <SetDots total={exercise.sets} current={currentSet} onTap={handleSetTap} />

          {exercise.notes && (
            <p className="mt-4 text-xs text-gray-500 italic text-center max-w-xs">
              {exercise.notes}
            </p>
          )}
        </div>
        {bottomBar}
      </div>
    );
  }

  // ── TIMED HOLD mode: countdown + "Tenir!" ───────────────────────────
  if (exerciseType === 'timed_hold') {
    // Auto-start timed countdown if not already
    if (phase === 'exercise' && isTimed) {
      // handled by existing useEffect
    }
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}>
        {topBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-lg font-extrabold text-amber-400 mb-2 animate-pulse">Tenir !</p>
          <h2 className="text-xl font-bold mb-6">{exercise.name}</h2>

          {phase === 'timed' ? (
            <div className="relative mb-6">
              <CountdownRing remaining={timedCountdown} total={(exercise.duration_minutes || 1) * 60} color="#f59e0b" size={240} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-mono font-extrabold tabular-nums text-amber-400">
                  {formatTime(timedCountdown)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-gray-900 border border-gray-800 px-8 py-10 text-center mb-6">
              <p className="text-3xl font-bold text-amber-400">
                {exercise.duration_minutes} min
              </p>
              <p className="text-sm text-gray-500 mt-2">Set {currentSet} / {exercise.sets}</p>
            </div>
          )}

          <SetDots total={exercise.sets} current={currentSet} onTap={handleSetTap} />
        </div>
        {bottomBar}
      </div>
    );
  }

  // ── CARDIO INTERVAL mode: work/rest visual ──────────────────────────
  if (exerciseType === 'cardio_interval') {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {topBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-xl font-extrabold mb-2">{exercise.name}</h2>

          {/* Big round counter */}
          <div className="relative mb-6">
            <div className="h-44 w-44 rounded-full border-4 flex items-center justify-center"
              style={{ borderColor: typeStyle.primary }}>
              <div className="text-center">
                <span className="text-5xl font-mono font-extrabold" style={{ color: typeStyle.primary }}>
                  {currentSet}
                </span>
                <span className="text-lg text-gray-500">/{exercise.sets}</span>
                <p className="text-xs text-gray-500 mt-1">round{currentSet > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {exercise.reps && (
            <p className="text-lg font-bold text-gray-300 mb-2">{exercise.reps} reps</p>
          )}
          {exercise.duration_minutes && (
            <p className="text-lg font-bold text-gray-300 mb-2">{exercise.duration_minutes} min</p>
          )}
          <p className="text-sm text-gray-500">Repos: {exercise.rest_seconds}s entre rounds</p>

          {exercise.notes && (
            <p className="mt-4 text-xs text-gray-500 italic text-center max-w-xs">{exercise.notes}</p>
          )}
        </div>
        {bottomBar}
      </div>
    );
  }

  // ── AMRAP mode: rep counter with tap ────────────────────────────────
  if (exerciseType === 'amrap') {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}>
        {topBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-sm uppercase tracking-widest font-semibold mb-2"
            style={{ color: typeStyle.primary }}>AMRAP</p>
          <h2 className="text-xl font-extrabold mb-6">{exercise.name}</h2>

          {/* Tap to count reps */}
          <button
            onClick={() => setCurrentReps((r) => r + 1)}
            className="h-48 w-48 rounded-full border-4 flex flex-col items-center justify-center transition-transform active:scale-95 mb-6"
            style={{ borderColor: typeStyle.primary, background: `${typeStyle.primary}10` }}>
            <span className="text-6xl font-mono font-extrabold" style={{ color: typeStyle.primary }}>
              {currentReps}
            </span>
            <span className="text-xs text-gray-400 mt-1">tap pour compter</span>
          </button>

          <button onClick={() => setCurrentReps(0)}
            className="text-xs text-gray-600 hover:text-gray-400 transition">
            Remettre a zero
          </button>

          {exercise.notes && (
            <p className="mt-6 text-xs text-gray-500 italic text-center max-w-xs">{exercise.notes}</p>
          )}
        </div>
        {bottomBar}
      </div>
    );
  }

  // ── FLEXIBILITY mode: breathing guide + left/right ──────────────────
  if (exerciseType === 'flexibility') {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
        style={{ overscrollBehavior: 'none' }}>
        {topBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h2 className="text-xl font-extrabold mb-2">{exercise.name}</h2>

          {/* Breathing guide */}
          <div className="relative mb-6">
            <div className={`h-40 w-40 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${
              breathPhase === 'in' ? 'scale-100 opacity-80' : 'scale-75 opacity-50'
            }`}
              style={{ background: `${typeStyle.primary}20`, border: `2px solid ${typeStyle.primary}40` }}>
              <span className="text-lg font-semibold" style={{ color: typeStyle.primary }}>
                {breathPhase === 'in' ? 'Inspirez' : 'Expirez'}
              </span>
            </div>
          </div>

          {/* Left/Right toggle for bilateral stretches */}
          {exercise.bilateral !== false && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setCurrentSide('left')}
                className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
                  currentSide === 'left'
                    ? 'text-white' : 'bg-gray-800 text-gray-400'
                }`}
                style={currentSide === 'left' ? { background: typeStyle.primary } : {}}>
                ← Gauche
              </button>
              <button
                onClick={() => setCurrentSide('right')}
                className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
                  currentSide === 'right'
                    ? 'text-white' : 'bg-gray-800 text-gray-400'
                }`}
                style={currentSide === 'right' ? { background: typeStyle.primary } : {}}>
                Droite →
              </button>
            </div>
          )}

          <p className="text-sm text-gray-500">
            {exercise.duration_minutes ? `${exercise.duration_minutes} min` : `${exercise.reps} reps`} par cote
          </p>
          <p className="text-sm text-gray-500 mt-1">Set {currentSet} / {exercise.sets}</p>

          {exercise.notes && (
            <p className="mt-4 text-xs text-gray-500 italic text-center max-w-xs">{exercise.notes}</p>
          )}
        </div>
        {bottomBar}
      </div>
    );
  }

  // ── DEFAULT / DISTANCE mode: simple display ─────────────────────────
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col text-white z-50 select-none"
      style={{ overscrollBehavior: 'none' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {topBar}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="rounded-3xl bg-gray-900/80 border border-gray-800 px-8 py-10 w-full max-w-sm text-center mb-8">
          <h2 className="text-2xl font-extrabold leading-tight mb-3">{exercise.name}</h2>
          <p className="text-xl font-bold" style={{ color: typeStyle.primary }}>
            {exercise.sets} × {exercise.reps ? `${exercise.reps} reps` : `${exercise.duration_minutes} min`}
          </p>
        </div>
        <p className="text-sm text-gray-400 font-semibold mb-3">Set {currentSet} / {exercise.sets}</p>
        <SetDots total={exercise.sets} current={currentSet} onTap={handleSetTap} />
        {exercise.notes && (
          <div className="mt-6 rounded-2xl bg-gray-900/60 border border-gray-800 px-5 py-3 max-w-sm w-full">
            <p className="text-sm text-gray-400 italic text-center">{exercise.notes}</p>
          </div>
        )}
      </div>
      {bottomBar}
    </div>
  );
}
