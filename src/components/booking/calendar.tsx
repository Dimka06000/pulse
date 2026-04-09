'use client';

import { cn } from '@/lib/utils';
import { jsToIsoDay } from '@/lib/date-utils';

interface CalendarProps {
  availableDays: number[];  // ISO days (1=Mon..7=Sun) when coach works
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function Calendar({ availableDays, selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }

  const firstDayIso = jsToIsoDay(days[0].getDay());
  const padBefore = firstDayIso - 1;

  const toDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-semibold text-gray-400 py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: padBefore }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const isoDay = jsToIsoDay(day.getDay());
          const isPast = day < today;
          const isAvailable = !isPast && availableDays.includes(isoDay);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelectDate(dateStr)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors',
                isPast || !isAvailable
                  ? 'text-gray-300 cursor-default'
                  : 'cursor-pointer hover:bg-brand-50 text-gray-700',
                isSelected && 'bg-brand-500 text-white font-bold'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
