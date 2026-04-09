'use client';

import { useEventsStore } from '@/stores/events';

interface EventRegisterButtonProps {
  eventId: string;
  userStatus: string | null;
  role: 'coach' | 'athlete';
  isFull: boolean;
  isPast: boolean;
}

export function EventRegisterButton({
  eventId,
  userStatus,
  role,
  isFull,
  isPast,
}: EventRegisterButtonProps) {
  const { registerForEvent, cancelRegistration } = useEventsStore();

  if (isPast) {
    return (
      <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-medium">
        Evenement termine
      </button>
    );
  }

  // Already registered
  if (userStatus === 'confirmed') {
    return (
      <div className="space-y-2">
        <div className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 font-medium text-center">
          Inscription confirmee
        </div>
        <button
          onClick={() => cancelRegistration(eventId)}
          className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50"
        >
          Annuler mon inscription
        </button>
      </div>
    );
  }

  if (userStatus === 'applied') {
    return (
      <div className="space-y-2">
        <div className="w-full py-3 rounded-xl bg-amber-50 text-amber-700 font-medium text-center">
          {role === 'coach' ? 'Candidature en attente' : 'Inscription en attente de paiement'}
        </div>
        <button
          onClick={() => cancelRegistration(eventId)}
          className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50"
        >
          Annuler
        </button>
      </div>
    );
  }

  if (userStatus === 'rejected') {
    return (
      <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-medium">
        Candidature non retenue
      </button>
    );
  }

  // Not registered
  if (isFull && role === 'athlete') {
    return (
      <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-medium">
        Complet
      </button>
    );
  }

  return (
    <button
      onClick={() => registerForEvent(eventId, role)}
      className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
    >
      {role === 'coach' ? 'Postuler comme coach' : "S'inscrire"}
    </button>
  );
}
