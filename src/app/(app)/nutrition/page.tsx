import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';

export default function NutritionPage() {
  return (
    <>
      <AppHeader title="Nutrition" />
      <div className="p-4 md:p-8">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Nutrition</h1>
        <EmptyState
          icon="🥗"
          title="Pas de plan nutrition"
          description="Votre coach peut vous assigner un plan personnalisé, ou créez le vôtre."
        />
      </div>
    </>
  );
}
