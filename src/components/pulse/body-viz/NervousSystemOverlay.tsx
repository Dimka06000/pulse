'use client';

import { useMemo } from 'react';
import { SPINE_PATH, BRAIN_PATHS, NERVE_BRANCHES } from './nerve-paths';

interface NervousSystemOverlayProps {
  nervousSystemState: 'parasympathetic' | 'transitioning' | 'sympathetic';
  intensity: number; // 0-100
}

// ── Color palettes per state ──
const PALETTE = {
  sympathetic: {
    primary: '#ef4444',
    secondary: '#f97316',
    auraInner: 'rgba(239,68,68,0.25)',
    auraOuter: 'rgba(239,68,68,0)',
  },
  transitioning: {
    primary: '#a855f7',
    secondary: '#6366f1',
    auraInner: 'rgba(139,92,246,0.2)',
    auraOuter: 'rgba(139,92,246,0)',
  },
  parasympathetic: {
    primary: '#06b6d4',
    secondary: '#22c55e',
    auraInner: 'rgba(6,182,212,0.18)',
    auraOuter: 'rgba(6,182,212,0)',
  },
} as const;

const ANIM_SPEED = {
  sympathetic: 0.8,
  transitioning: 1.5,
  parasympathetic: 3,
} as const;

export function NervousSystemOverlay({
  nervousSystemState,
  intensity,
}: NervousSystemOverlayProps) {
  const palette = PALETTE[nervousSystemState];
  const baseSpeed = ANIM_SPEED[nervousSystemState];

  // Higher intensity = faster for sympathetic, slower base for parasympathetic
  const speedFactor = 1 + (intensity - 50) / 200; // 0.75 - 1.25
  const duration = baseSpeed / speedFactor;
  const glowOpacity = 0.3 + (intensity / 100) * 0.5;

  // Determine which nerves are visible based on intensity
  const visibleNerves = useMemo(() => {
    if (intensity >= 60) return NERVE_BRANCHES;
    return NERVE_BRANCHES.filter((n) => n.type === 'major');
  }, [intensity]);

  // Dash direction: sympathetic = outward (negative offset), parasympathetic = inward
  const dashDirection =
    nervousSystemState === 'parasympathetic' ? 20 : -20;

  const pulseAnim =
    nervousSystemState === 'sympathetic'
      ? 'sympatheticPulse'
      : nervousSystemState === 'parasympathetic'
        ? 'parasympatheticBreath'
        : 'transitionPulse';

  return (
    <g className="nervous-overlay">
      {/* Inline keyframes */}
      <style>{`
        @keyframes sympatheticPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes parasympatheticBreath {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes transitionPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.85; }
        }
        @keyframes nerveDashForward {
          to { stroke-dashoffset: ${dashDirection}; }
        }
      `}</style>

      {/* Defs: gradients + filters */}
      <defs>
        <radialGradient id="nerveAura" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor={palette.auraInner} />
          <stop offset="100%" stopColor={palette.auraOuter} />
        </radialGradient>
        <linearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        <filter id="nerveGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="brainGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background aura */}
      <ellipse
        cx="100"
        cy="180"
        rx="90"
        ry="170"
        fill="url(#nerveAura)"
        style={{
          animation: `${pulseAnim} ${duration * 1.2}s ease-in-out infinite`,
          willChange: 'opacity',
        }}
      />

      {/* Brain */}
      <path
        d={BRAIN_PATHS.outline}
        fill={palette.primary}
        fillOpacity={glowOpacity}
        filter="url(#brainGlow)"
        style={{
          animation: `${pulseAnim} ${duration}s ease-in-out infinite`,
          willChange: 'opacity',
        }}
      />

      {/* Spine */}
      <path
        d={SPINE_PATH}
        fill="none"
        stroke="url(#spineGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#nerveGlow)"
        style={{
          animation: `${pulseAnim} ${duration}s ease-in-out infinite`,
          willChange: 'opacity',
        }}
      />
      {/* Spine dash particles */}
      <path
        d={SPINE_PATH}
        fill="none"
        stroke={palette.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 8"
        style={{
          animation: `nerveDashForward ${duration * 0.6}s linear infinite`,
          willChange: 'transform',
        }}
      />

      {/* Nerve branches */}
      {visibleNerves.map((nerve, idx) => (
        <g key={nerve.id}>
          {/* Glow layer */}
          <path
            d={nerve.path}
            fill="none"
            stroke={nerve.type === 'major' ? palette.primary : palette.secondary}
            strokeWidth={nerve.type === 'major' ? 2 : 1.2}
            strokeLinecap="round"
            filter="url(#nerveGlow)"
            opacity={nerve.type === 'major' ? glowOpacity : glowOpacity * 0.7}
            style={{
              animation: `${pulseAnim} ${duration}s ease-in-out infinite`,
              willChange: 'opacity',
            }}
          />
          {/* Dash particles */}
          <path
            d={nerve.path}
            fill="none"
            stroke={palette.secondary}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="3 7"
            opacity={0.8}
            style={{
              animation: `nerveDashForward ${duration * 0.8}s linear infinite`,
              animationDelay: `${idx * 0.15}s`,
              willChange: 'transform',
            }}
          />
        </g>
      ))}
    </g>
  );
}
