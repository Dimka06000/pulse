'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WorkoutPlayer from '@/components/workout/WorkoutPlayer';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface WorkoutData {
  id: string;
  title: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number | null;
    rest_seconds: number;
    duration_minutes: number | null;
    notes: string;
  }>;
  totalDuration: number;
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    if (id === 'solo') {
      // Quick solo session — empty workout
      setWorkout({
        id: 'solo',
        title: 'Seance libre',
        exercises: [
          { name: 'Exercice libre', sets: 1, reps: null, rest_seconds: 60, duration_minutes: 30, notes: '' },
        ],
        totalDuration: 30,
      });
      setLoading(false);
      return;
    }

    fetch(`/api/programs/workouts/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Seance introuvable');
        return r.json();
      })
      .then((data: WorkoutData) => {
        if (!data.exercises || data.exercises.length === 0) {
          throw new Error('Aucun exercice dans cette seance');
        }
        setWorkout(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async (stats: any) => {
    setSaving(true);
    try {
      await fetch('/api/workout-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: id,
          title: workout?.title,
          ...stats,
        }),
      });
    } catch {
      // Silently fail — workout was still completed locally
    }
    setSaving(false);
    router.push('/dashboard');
  };

  const handleExit = () => {
    router.push('/dashboard');
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !workout) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 text-white px-6">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-bold mb-2">Oups</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          {error || 'Seance introuvable'}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-2xl bg-gray-800 px-8 py-3 text-sm font-semibold hover:bg-gray-700 transition"
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  // ── Saving overlay ────────────────────────────────────────────────────
  if (saving) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Enregistrement...</p>
        </div>
      </div>
    );
  }

  return <WorkoutPlayer workout={workout} onComplete={handleComplete} onExit={handleExit} />;
}
