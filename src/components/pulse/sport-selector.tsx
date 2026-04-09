'use client';

import { SPORTS, SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';

interface SportSelectorProps {
  selected: string[];
  onChange: (sports: string[]) => void;
}

export function SportSelector({ selected, onChange }: SportSelectorProps) {
  function toggle(sport: string) {
    if (selected.includes(sport)) {
      onChange(selected.filter((s) => s !== sport));
    } else {
      onChange([...selected, sport]);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {SPORTS.map((sport) => {
        const isSelected = selected.includes(sport);
        return (
          <button
            key={sport}
            type="button"
            onClick={() => toggle(sport)}
            className={[
              'flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-center',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/50',
              isSelected
                ? 'bg-gradient-to-br from-brand-500 to-cyan-500 text-white scale-[1.05] shadow-[0_4px_14px_rgba(34,197,94,0.35)]'
                : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/25',
            ].join(' ')}
          >
            <span className="text-2xl leading-none">
              {SPORT_EMOJIS[sport as Sport]}
            </span>
            <span className="text-xs font-semibold leading-tight">
              {SPORT_LABELS[sport as Sport]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
