'use client';

import { cn } from '@/lib/utils';
import { formatPrice } from '@oikos/coaching';

interface SessionTemplate {
  id: string;
  title: string;
  sport: string;
  level: string;
  type: string;
  duration: number;
  price: number;
  description?: string | null;
}

interface SessionPickerProps {
  sessions: SessionTemplate[];
  selected: SessionTemplate | null;
  onSelect: (session: SessionTemplate) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all: 'Tous niveaux',
  discovery: 'Découverte',
  standard: 'Standard',
  intensive: 'Intensif',
};

const TYPE_LABELS: Record<string, string> = {
  individual: 'Individuel',
  one_on_one: 'Individuel',
  group: 'Groupe',
  online: 'En ligne',
  workshop: 'Atelier',
  assessment: 'Évaluation',
};

export function SessionPicker({ sessions, selected, onSelect }: SessionPickerProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Ce coach n&apos;a pas encore de séances disponibles
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelect(session)}
          className={cn(
            'w-full text-left rounded-xl border p-4 transition-colors',
            selected?.id === session.id
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-200 hover:border-brand-300'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{session.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{session.sport}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {LEVEL_LABELS[session.level] || session.level}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {TYPE_LABELS[session.type] || session.type}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {session.duration} min
                </span>
              </div>
            </div>
            <span className="text-lg font-bold text-brand-600">
              {formatPrice(Math.round(session.price * 100))}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
