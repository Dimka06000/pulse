'use client';

import { useState } from 'react';

interface PlanFormProps {
  clientName: string;
  initial?: {
    goal: string;
    dailyCalories: number;
    macros: { protein: number; carbs: number; fat: number };
    meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
  };
  onSubmit: (data: {
    goal: string;
    dailyCalories: number;
    macros: { protein: number; carbs: number; fat: number };
    meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
  }) => Promise<void>;
  loading?: boolean;
}

const PRESET_GOALS = ['Perte de poids', 'Prise de masse', 'Énergie & vitalité', 'Rééquilibrage'];
const DEFAULT_MEALS = [
  { name: 'Petit-déjeuner', time: '07:30', description: '', calories: 0 },
  { name: 'Déjeuner', time: '12:30', description: '', calories: 0 },
  { name: 'Collation', time: '16:00', description: '', calories: 0 },
  { name: 'Dîner', time: '19:30', description: '', calories: 0 },
];

export function PlanForm({ clientName, initial, onSubmit, loading }: PlanFormProps) {
  const [goal, setGoal] = useState(initial?.goal || '');
  const [dailyCalories, setDailyCalories] = useState(initial?.dailyCalories || 2000);
  const [protein, setProtein] = useState(initial?.macros.protein || 120);
  const [carbs, setCarbs] = useState(initial?.macros.carbs || 250);
  const [fat, setFat] = useState(initial?.macros.fat || 65);
  const [meals, setMeals] = useState(initial?.meals || DEFAULT_MEALS);

  function updateMeal(index: number, field: string, value: string | number) {
    setMeals((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      goal,
      dailyCalories,
      macros: { protein, carbs, fat },
      meals,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Plan nutrition pour {clientName}</h3>

      {/* Goal */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Objectif</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {PRESET_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                goal === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Ou saisissez un objectif personnalisé..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
        />
      </div>

      {/* Calories + Macros */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Calories/jour</label>
          <input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(+e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Protéines (g)</label>
          <input type="number" value={protein} onChange={(e) => setProtein(+e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Glucides (g)</label>
          <input type="number" value={carbs} onChange={(e) => setCarbs(+e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Lipides (g)</label>
          <input type="number" value={fat} onChange={(e) => setFat(+e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </div>
      </div>

      {/* Meals */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Repas</label>
        <div className="space-y-3">
          {meals.map((meal, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                <input
                  type="text"
                  value={meal.name}
                  onChange={(e) => updateMeal(i, 'name', e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium sm:w-32"
                />
                <input
                  type="time"
                  value={meal.time || ''}
                  onChange={(e) => updateMeal(i, 'time', e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={meal.calories || ''}
                  onChange={(e) => updateMeal(i, 'calories', +e.target.value)}
                  placeholder="kcal"
                  className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-20 sm:col-span-1"
                />
              </div>
              <textarea
                value={meal.description}
                onChange={(e) => updateMeal(i, 'description', e.target.value)}
                placeholder="Contenu du repas..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMeals([...meals, { name: 'Collation', description: '', calories: 0 }])}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
        >
          + Ajouter un repas
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !goal}
        className="rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer le plan'}
      </button>
    </form>
  );
}
