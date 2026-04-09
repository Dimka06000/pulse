'use client';

import { cn } from '@/lib/utils';

interface Slot {
  start: string;
  end: string;
}

interface SlotPickerProps {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  loading: boolean;
}

export function SlotPicker({ slots, selectedSlot, onSelectSlot, loading }: SlotPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-400">Chargement des créneaux...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-400">Aucun créneau disponible ce jour</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      {slots.map((slot) => {
        const isSelected =
          selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;

        return (
          <button
            key={slot.start}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
              isSelected
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 hover:border-brand-400 text-gray-700'
            )}
          >
            {slot.start}
          </button>
        );
      })}
    </div>
  );
}
