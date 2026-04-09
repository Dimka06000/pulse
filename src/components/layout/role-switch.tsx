'use client';

import { useAuthStore } from '@/stores/auth';

export function RoleSwitch() {
  const { activeRole, setActiveRole, userRole } = useAuthStore();

  // Only show toggle if user can be both or is a coach
  if (userRole !== 'coach' && userRole !== 'admin') return null;

  return (
    <div className="flex items-center rounded-full bg-gray-100 p-1">
      <button
        onClick={() => setActiveRole('athlete')}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
          activeRole === 'athlete'
            ? 'bg-white shadow-sm text-brand-700'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🏃 Sportif
      </button>
      <button
        onClick={() => setActiveRole('coach')}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
          activeRole === 'coach'
            ? 'bg-white shadow-sm text-brand-700'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🏋️ Coach
      </button>
    </div>
  );
}
