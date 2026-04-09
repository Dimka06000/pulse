'use client';

import { MacroRing } from './macro-ring';
import { MealList } from './meal-list';

interface PlanCardProps {
  goal: string;
  dailyCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
  coachName?: string;
  updatedAt: string;
}

export function PlanCard({ goal, dailyCalories, macros, meals, coachName }: PlanCardProps) {
  return (
    <div className="space-y-6">
      {/* Goal */}
      <div className="rounded-xl bg-indigo-50 p-5">
        <p className="text-sm text-indigo-600">Objectif</p>
        <p className="mt-1 text-lg font-semibold text-indigo-900">{goal}</p>
        {coachName && (
          <p className="mt-2 text-xs text-indigo-400">Prescrit par {coachName}</p>
        )}
      </div>

      {/* Macros */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-medium text-gray-500">Répartition quotidienne</h3>
        <MacroRing protein={macros.protein} carbs={macros.carbs} fat={macros.fat} dailyCalories={dailyCalories} />
      </div>

      {/* Meals */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-500">Repas</h3>
        <MealList meals={meals} />
      </div>
    </div>
  );
}
