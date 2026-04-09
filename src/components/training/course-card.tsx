'use client';

interface CourseCardProps {
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  badgeIcon: string;
  requiredForVerification: boolean;
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  onEnroll: () => void;
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Commencer',
  in_progress: 'Continuer',
  completed: 'Terminé',
};

export function CourseCard({
  title, description, durationMinutes, badgeIcon, requiredForVerification,
  status, progress, onEnroll, loading,
}: CourseCardProps) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
      status === 'completed' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'
    }`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{badgeIcon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400">
              {Math.round(durationMinutes / 60) > 0
                ? `${Math.round(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ''}`
                : `${durationMinutes} min`
              }
              {requiredForVerification && ' \u00B7 Requis pour la vérification'}
            </p>
          </div>
        </div>
        {requiredForVerification && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Obligatoire
          </span>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-600">{description}</p>

      {/* Progress bar */}
      {status !== 'available' && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onEnroll}
        disabled={status === 'completed' || loading}
        className={`w-full rounded-full py-2.5 text-sm font-semibold transition-colors ${
          status === 'completed'
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        } disabled:opacity-70`}
      >
        {loading ? 'Chargement...' : STATUS_LABELS[status]}
      </button>
    </div>
  );
}
