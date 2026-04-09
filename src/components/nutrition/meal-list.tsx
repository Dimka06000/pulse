'use client';

interface Meal {
  name: string;
  time?: string;
  description: string;
  calories?: number;
}

interface MealListProps {
  meals: Meal[];
}

const MEAL_EMOJIS: Record<string, string> = {
  'Petit-déjeuner': '\uD83C\uDF05',
  'Déjeuner': '\u2600\uFE0F',
  'Dîner': '\uD83C\uDF19',
  'Collation': '\uD83C\uDF4E',
};

export function MealList({ meals }: MealListProps) {
  if (meals.length === 0) {
    return <p className="text-sm text-gray-400">Aucun repas défini</p>;
  }

  return (
    <div className="space-y-3">
      {meals.map((meal, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{MEAL_EMOJIS[meal.name] || '\uD83C\uDF7D\uFE0F'}</span>
              <span className="font-medium text-gray-900">{meal.name}</span>
              {meal.time && (
                <span className="text-xs text-gray-400">{meal.time}</span>
              )}
            </div>
            {meal.calories && (
              <span className="text-sm text-gray-400">{meal.calories} kcal</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{meal.description}</p>
        </div>
      ))}
    </div>
  );
}
