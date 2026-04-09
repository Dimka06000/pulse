'use client';

interface PathwayStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface PathwayTrackerProps {
  steps: PathwayStep[];
  isVerified: boolean;
}

export function PathwayTracker({ steps, isVerified }: PathwayTrackerProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Parcours coach</h2>
        {isVerified && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
            \u2713 Vérifié
          </span>
        )}
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-start gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step.completed
                  ? 'bg-emerald-500 text-white'
                  : step.current
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? '\u2713' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`mt-1 h-6 w-0.5 ${
                  step.completed ? 'bg-emerald-300' : 'bg-gray-200'
                }`} />
              )}
            </div>

            {/* Step content */}
            <div className="pt-1">
              <p className={`text-sm font-medium ${
                step.completed ? 'text-emerald-700' : step.current ? 'text-indigo-900' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
