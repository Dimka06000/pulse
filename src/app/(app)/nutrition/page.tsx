'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { PlanCard } from '@/components/nutrition/plan-card';
import { PlanForm } from '@/components/nutrition/plan-form';
import { EmptyState } from '@/components/pulse/empty-state';
import { useAuthStore } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NutritionPlan {
  id: string;
  goal: string;
  daily_calories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
  coach_name?: string;
  updated_at: string;
}

export default function NutritionPage() {
  const { userId } = useAuthStore();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlan = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/nutrition');
      if (res.ok) {
        const data = await res.json();
        // API returns plan or null/empty
        if (data && data.id) {
          setPlan(data);
        } else if (Array.isArray(data) && data.length > 0) {
          setPlan(data[0]);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleCreate = async (data: {
    goal: string;
    dailyCalories: number;
    macros: { protein: number; carbs: number; fat: number };
    meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
  }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: data.goal,
          dailyCalories: data.dailyCalories,
          macros: data.macros,
          meals: data.meals,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        await fetchPlan();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <>
      <AppHeader title="Nutrition" />
      <div className="p-4 md:p-8 pb-24 max-w-2xl mx-auto">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Nutrition</h1>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-surface" />
            <div className="h-40 animate-pulse rounded-2xl bg-surface" />
            <div className="h-32 animate-pulse rounded-2xl bg-surface" />
          </div>
        ) : showForm ? (
          <div>
            <button
              onClick={() => setShowForm(false)}
              className="mb-4 text-sm text-muted hover:text-text transition"
            >
              ← Retour
            </button>
            <PlanForm
              clientName="Mon plan"
              initial={plan ? {
                goal: plan.goal,
                dailyCalories: plan.daily_calories,
                macros: plan.macros,
                meals: plan.meals,
              } : undefined}
              onSubmit={handleCreate}
              loading={saving}
            />
          </div>
        ) : plan ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text">Mon plan actuel</h2>
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Modifier
              </button>
            </div>
            <PlanCard
              goal={plan.goal}
              dailyCalories={plan.daily_calories}
              macros={plan.macros}
              meals={plan.meals}
              coachName={plan.coach_name}
              updatedAt={plan.updated_at}
            />
          </div>
        ) : (
          <EmptyState
            icon="🥗"
            title="Pas encore de plan nutrition"
            description="Créez votre plan personnalisé ou demandez à votre coach de vous en assigner un."
            actionLabel="Créer mon plan"
            onAction={() => setShowForm(true)}
          />
        )}
      </div>
    </>
  );
}
