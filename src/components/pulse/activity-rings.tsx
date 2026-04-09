'use client';

interface ActivityRingsProps {
  move: number;
  moveGoal: number;
  exercise: number;
  exerciseGoal: number;
  stand: number;
  standGoal: number;
  size?: number;
}

function ActivityRings({
  move,
  moveGoal,
  exercise,
  exerciseGoal,
  stand,
  standGoal,
  size = 160,
}: ActivityRingsProps) {
  const center = size / 2;
  const strokeWidth = size * 0.09;
  const gap = strokeWidth * 0.6;

  const outerR = center - strokeWidth / 2 - 2;
  const middleR = outerR - strokeWidth - gap;
  const innerR = middleR - strokeWidth - gap;

  const movePercent = moveGoal > 0 ? Math.min(move / moveGoal, 1) : 0;
  const exercisePercent = exerciseGoal > 0 ? Math.min(exercise / exerciseGoal, 1) : 0;
  const standPercent = standGoal > 0 ? Math.min(stand / standGoal, 1) : 0;

  const rings = [
    { r: outerR, percent: movePercent, bgColor: 'rgba(239,68,68,0.15)', gradId: 'moveGrad', color1: '#ef4444', color2: '#f97316' },
    { r: middleR, percent: exercisePercent, bgColor: 'rgba(34,197,94,0.15)', gradId: 'exGrad', color1: '#22c55e', color2: '#16a34a' },
    { r: innerR, percent: standPercent, bgColor: 'rgba(6,182,212,0.15)', gradId: 'standGrad', color1: '#06b6d4', color2: '#3b82f6' },
  ];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {rings.map((ring) => (
            <linearGradient key={ring.gradId} id={ring.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ring.color1} />
              <stop offset="100%" stopColor={ring.color2} />
            </linearGradient>
          ))}
        </defs>
        {rings.map((ring) => {
          const circumference = 2 * Math.PI * ring.r;
          const offset = circumference * (1 - ring.percent);
          return (
            <g key={ring.gradId}>
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={ring.r}
                fill="none"
                stroke={ring.bgColor}
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              {ring.percent > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={ring.r}
                  fill="none"
                  stroke={`url(#${ring.gradId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-text">
          {Math.round(((movePercent + exercisePercent + standPercent) / 3) * 100)}%
        </span>
        <span className="text-[10px] text-muted">global</span>
      </div>
    </div>
  );
}

export { ActivityRings, type ActivityRingsProps };
