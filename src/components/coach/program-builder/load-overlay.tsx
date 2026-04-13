'use client';

interface LoadOverlayProps {
  tsb: number;
}

export function LoadOverlay({ tsb }: LoadOverlayProps) {
  let color: string;
  let label: string;

  if (tsb > 15) { color = 'bg-green-500'; label = 'Forme'; }
  else if (tsb > 0) { color = 'bg-green-300'; label = 'OK'; }
  else if (tsb > -10) { color = 'bg-yellow-400'; label = 'Modéré'; }
  else if (tsb > -20) { color = 'bg-orange-500'; label = 'Fatigue'; }
  else { color = 'bg-red-500'; label = 'Repos'; }

  return (
    <span className="relative group inline-flex items-center" title={`TSB: ${tsb} — ${label}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-20">
        TSB {tsb} — {label}
      </span>
    </span>
  );
}
