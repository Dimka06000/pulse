'use client';

interface CycleOverlayProps {
  cycleData: { lastPeriodDate: string; avgCycleDays: number; avgPeriodDays: number } | null;
  weekNumber: number;
  programStartDate: string;
}

type Phase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

const PHASE_COLORS: Record<Phase, string> = {
  menstruation: 'bg-red-300',
  follicular: 'bg-emerald-300',
  ovulation: 'bg-amber-300',
  luteal: 'bg-blue-300',
};

const PHASE_LABELS: Record<Phase, string> = {
  menstruation: 'Règles',
  follicular: 'Folliculaire',
  ovulation: 'Ovulation',
  luteal: 'Lutéale',
};

const LEGEND_PHASES: Phase[] = ['menstruation', 'follicular', 'ovulation', 'luteal'];

function getPhase(
  lastPeriodDate: string,
  avgCycleDays: number,
  avgPeriodDays: number,
  targetDate: string
): Phase {
  const last = new Date(lastPeriodDate);
  const target = new Date(targetDate);
  const diffMs = target.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayInCycle = ((diffDays % avgCycleDays) + avgCycleDays) % avgCycleDays;

  if (dayInCycle < avgPeriodDays) return 'menstruation';
  if (dayInCycle < 13) return 'follicular';
  if (dayInCycle < 16) return 'ovulation';
  return 'luteal';
}

export function CycleOverlay({ cycleData, weekNumber, programStartDate }: CycleOverlayProps) {
  if (!cycleData) return null;

  const { lastPeriodDate, avgCycleDays, avgPeriodDays } = cycleData;
  const startMs = new Date(programStartDate).getTime();
  const weekOffsetDays = (weekNumber - 1) * 7;

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateMs = startMs + (weekOffsetDays + i) * 24 * 60 * 60 * 1000;
    const iso = new Date(dateMs).toISOString().slice(0, 10);
    return getPhase(lastPeriodDate, avgCycleDays, avgPeriodDays, iso);
  });

  return (
    <div className="flex flex-col gap-0.5 mb-1">
      {/* 7-segment strip */}
      <div className="flex w-full h-1.5">
        {days.map((phase, i) => (
          <span
            key={i}
            className={`flex-1 ${PHASE_COLORS[phase]} ${i === 0 ? 'rounded-l' : ''} ${i === 6 ? 'rounded-r' : ''}`}
            title={PHASE_LABELS[phase]}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap">
        {LEGEND_PHASES.map((phase) => (
          <span key={phase} className="flex items-center gap-0.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${PHASE_COLORS[phase]}`} />
            <span className="text-[9px] text-gray-400 leading-none">{PHASE_LABELS[phase]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
