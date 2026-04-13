'use client';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ProgramBlock {
  id: string;
  title: string;
  phase: string;
  focus: string;
  week_start: number;
  week_end: number;
  order_index: number;
  progression_curve: number[];
}

interface TimelineBarProps {
  blocks: ProgramBlock[];
  totalWeeks: number;
  activeWeek: number;
  onBlockClick: (block: ProgramBlock) => void;
  onAddBlock: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  base: 'bg-blue-500',
  build: 'bg-amber-500',
  peak: 'bg-red-500',
  taper: 'bg-emerald-500',
  race: 'bg-yellow-500',
  recovery: 'bg-violet-500',
};

const PHASE_LABELS: Record<string, string> = {
  base: 'Base',
  build: 'Construction',
  peak: 'Pic',
  taper: 'Affûtage',
  race: 'Course',
  recovery: 'Récupération',
};

// ─── Component ──────────────────────────────────────────────────────────────
export function TimelineBar({
  blocks,
  totalWeeks,
  activeWeek,
  onBlockClick,
  onAddBlock,
}: TimelineBarProps) {
  const safeTotal = Math.max(totalWeeks, 1);
  const activePercent = ((activeWeek - 0.5) / safeTotal) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 mb-3">Périodisation</p>

      {/* Active week marker */}
      {blocks.length > 0 && (
        <div className="relative h-4 mb-1">
          <span
            className="absolute text-xs text-brand-600 -translate-x-1/2 leading-none select-none"
            style={{ left: `${activePercent}%` }}
          >
            ▼
          </span>
        </div>
      )}

      {/* Bar + add button */}
      <div className="flex items-center gap-2">
        {blocks.length === 0 ? (
          <div className="flex-1 h-8 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-400">
              Aucun bloc — Cliquez + pour ajouter
            </span>
          </div>
        ) : (
          <div className="flex-1 h-8 rounded-lg overflow-hidden flex">
            {blocks.map((block) => {
              const width =
                ((block.week_end - block.week_start + 1) / safeTotal) * 100;
              const colorClass = PHASE_COLORS[block.phase] || 'bg-gray-400';

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => onBlockClick(block)}
                  className={`${colorClass} cursor-pointer hover:brightness-110 transition-all flex items-center justify-center overflow-hidden px-1`}
                  style={{ width: `${width}%` }}
                  title={`${PHASE_LABELS[block.phase] || block.phase} — ${block.title}`}
                >
                  <span className="text-[11px] font-medium text-white truncate">
                    {block.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onAddBlock}
          className="rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-1 text-sm transition-colors"
        >
          +
        </button>
      </div>

      {/* Week numbers */}
      {blocks.length > 0 && (
        <div className="flex mt-2">
          {Array.from({ length: safeTotal }, (_, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] text-gray-400 select-none"
            >
              {i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
