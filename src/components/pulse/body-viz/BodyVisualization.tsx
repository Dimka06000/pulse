'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BodyState } from '@/lib/training/body-state-engine';
import {
  BODY_OUTLINE,
  HEAD_CIRCLE,
  MUSCLE_PATHS,
  TENDON_POSITIONS,
  JOINT_POSITIONS,
  MUSCLE_LABELS_FR,
  TENDON_LABELS_FR,
  JOINT_LABELS_FR,
  STATUS_LABELS_FR,
} from './body-paths';
import { NervousSystemOverlay } from './NervousSystemOverlay';
import { RecoveryTimeline } from './RecoveryTimeline';
import { InjuryAlerts } from './InjuryAlerts';

// ── Types ──

type Mode = 'muscles' | 'nervous' | 'joints';
type TimeRange = '0' | '7' | '14' | '28';

const TIME_BUTTONS: { value: TimeRange; label: string }[] = [
  { value: '0', label: "Aujourd'hui" },
  { value: '7', label: '-7j' },
  { value: '14', label: '-14j' },
  { value: '28', label: '-28j' },
];

interface BodyVisualizationProps {
  bodyState: BodyState;
  mode?: Mode;
  compact?: boolean;
}

// ── Heat color from load percent ──

function heatColor(loadPercent: number): string {
  if (loadPercent >= 85) return '#ef4444';
  if (loadPercent >= 60) return '#f97316';
  if (loadPercent >= 30) return '#f59e0b';
  return '#22c55e';
}

function heatOpacity(loadPercent: number): number {
  if (loadPercent >= 85) return 0.8;
  if (loadPercent >= 60) return 0.6;
  if (loadPercent >= 30) return 0.4;
  return 0.2;
}

function alertColor(level: 'normal' | 'warning' | 'danger'): string {
  if (level === 'danger') return '#ef4444';
  if (level === 'warning') return '#f59e0b';
  return '#22c55e';
}

const NERVOUS_STATE_FR: Record<string, string> = {
  parasympathetic: 'Parasympathique (repos)',
  transitioning: 'En transition',
  sympathetic: 'Sympathique (stress)',
};

// ── Component ──

export function BodyVisualization({ bodyState: initialBodyState, mode: initialMode, compact }: BodyVisualizationProps) {
  const [mode, setMode] = useState<Mode>(initialMode || 'muscles');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('0');
  const [bodyState, setBodyState] = useState<BodyState>(initialBodyState);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (timeRange === '0') setBodyState(initialBodyState);
  }, [initialBodyState, timeRange]);

  // Fetch historical body state
  const fetchHistorical = useCallback(async (days: TimeRange) => {
    if (days === '0') {
      setBodyState(initialBodyState);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`/api/body-state?daysAgo=${days}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data: BodyState = await res.json();
      setBodyState(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  }, [initialBodyState]);

  const handleTimeChange = (range: TimeRange) => {
    setTimeRange(range);
    fetchHistorical(range);
  };

  const tabs: { key: Mode; label: string }[] = [
    { key: 'muscles', label: 'Muscles' },
    { key: 'nervous', label: 'Syst. nerveux' },
    { key: 'joints', label: 'Articulations' },
  ];

  const isJointsMode = mode === 'joints';
  const isMusclesMode = mode === 'muscles';
  const isNervousMode = mode === 'nervous';

  // Selected muscle tooltip data
  const sel = selectedMuscle ? bodyState.muscleRegions[selectedMuscle] : null;
  const selLabel = selectedMuscle ? MUSCLE_LABELS_FR[selectedMuscle] || selectedMuscle : '';

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-950 to-gray-900 overflow-hidden">
      {/* Glow animation style */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .glow-pulse {
          animation: pulseGlow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Mode tabs */}
      {!compact && (
        <div className="flex gap-1 p-3 pb-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setMode(t.key); setSelectedMuscle(null); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === t.key
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Time range selector */}
      {!compact && (
        <div className="flex gap-1 justify-center px-3 pb-2">
          {TIME_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => handleTimeChange(btn.value)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                timeRange === btn.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* SVG Body */}
      <div className="flex justify-center p-4 pb-2" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.3s' }}>
        <svg
          viewBox="0 0 200 400"
          className={compact ? 'h-[180px] w-auto' : 'h-[250px] md:h-[340px] w-auto'}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Body outline */}
          <path d={BODY_OUTLINE} fill="none" stroke="#374151" strokeWidth="1.2" opacity="0.5" />

          {/* Head */}
          <circle cx={HEAD_CIRCLE.cx} cy={HEAD_CIRCLE.cy} r={HEAD_CIRCLE.r}
            fill="none" stroke="#374151" strokeWidth="1.2" opacity="0.5" />

          {/* Muscle regions */}
          {Object.entries(MUSCLE_PATHS).map(([key, { path }]) => {
            const region = bodyState.muscleRegions[key];
            if (!region) return null;

            const isOverloaded = region.status === 'overloaded';
            const dimmed = isJointsMode;
            const color = heatColor(region.loadPercent);
            const opacity = dimmed ? 0.08 : heatOpacity(region.loadPercent);
            const isSelected = selectedMuscle === key;

            return (
              <path
                key={key}
                d={path}
                fill={color}
                fillOpacity={opacity}
                stroke={isSelected ? '#ffffff' : color}
                strokeWidth={isSelected ? 1.5 : 0.5}
                strokeOpacity={dimmed ? 0.1 : 0.6}
                className={isOverloaded && !dimmed ? 'glow-pulse' : ''}
                style={{ cursor: !compact && isMusclesMode ? 'pointer' : 'default' }}
                onClick={() => {
                  if (!compact && isMusclesMode) {
                    setSelectedMuscle(selectedMuscle === key ? null : key);
                  }
                }}
              />
            );
          })}

          {/* Tendon indicators (circles) */}
          {(isJointsMode || isMusclesMode) && Object.entries(TENDON_POSITIONS).map(([key, pos]) => {
            const tendon = bodyState.tendonRegions[key];
            if (!tendon) return null;
            const color = alertColor(tendon.alertLevel);
            const show = isJointsMode ? 1 : 0.4;
            return (
              <g key={`tendon-${key}`}>
                <circle cx={pos.x} cy={pos.y} r={3} fill={color} opacity={show} />
                {/* Mirror for bilateral tendons */}
                <circle cx={200 - pos.x} cy={pos.y} r={3} fill={color} opacity={show} />
              </g>
            );
          })}

          {/* Joint indicators (diamonds) */}
          {(isJointsMode || isMusclesMode) && Object.entries(JOINT_POSITIONS).map(([key, pos]) => {
            const joint = bodyState.jointRegions[key];
            if (!joint) return null;
            const color = alertColor(joint.alertLevel);
            const show = isJointsMode ? 1 : 0.3;
            const s = 4;
            const diamond = `M${pos.x},${pos.y - s} L${pos.x + s},${pos.y} L${pos.x},${pos.y + s} L${pos.x - s},${pos.y} Z`;
            const mirrorDiamond = `M${200 - pos.x},${pos.y - s} L${200 - pos.x + s},${pos.y} L${200 - pos.x},${pos.y + s} L${200 - pos.x - s},${pos.y} Z`;
            return (
              <g key={`joint-${key}`}>
                <path d={diamond} fill={color} opacity={show} />
                {pos.x !== 100 && <path d={mirrorDiamond} fill={color} opacity={show} />}
              </g>
            );
          })}

          {/* Nervous system SVG overlay */}
          {isNervousMode && (
            <NervousSystemOverlay
              nervousSystemState={bodyState.nervousSystemState}
              intensity={bodyState.nervousSystemIntensity}
            />
          )}
        </svg>
      </div>

      {/* Nervous system mode: info panel */}
      {isNervousMode && !compact && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Système nerveux</p>
            <p className="text-lg font-bold text-white">
              {NERVOUS_STATE_FR[bodyState.nervousSystemState]}
            </p>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${bodyState.nervousSystemIntensity}%`,
                  backgroundColor: bodyState.nervousSystemIntensity > 70 ? '#ef4444'
                    : bodyState.nervousSystemIntensity > 40 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Intensité: {bodyState.nervousSystemIntensity}%
            </p>
          </div>
        </div>
      )}

      {/* Joints mode: legend */}
      {isJointsMode && !compact && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Joints */}
            {Object.entries(bodyState.jointRegions).map(([key, joint]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                <div className="h-2.5 w-2.5 rotate-45 shrink-0" style={{ backgroundColor: alertColor(joint.alertLevel) }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{JOINT_LABELS_FR[key] || key}</p>
                  <p className="text-[10px] text-gray-500">{STATUS_LABELS_FR[joint.alertLevel]} · {joint.impactPercent}%</p>
                </div>
              </div>
            ))}
            {/* Tendons */}
            {Object.entries(bodyState.tendonRegions).filter(([, t]) => t.stressPercent > 0).map(([key, tendon]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: alertColor(tendon.alertLevel) }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{TENDON_LABELS_FR[key] || key}</p>
                  <p className="text-[10px] text-gray-500">{STATUS_LABELS_FR[tendon.alertLevel]} · {tendon.stressPercent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscle tooltip (on tap) */}
      {isMusclesMode && selectedMuscle && sel && !compact && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-white/10 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-white">{selLabel}</h4>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: heatColor(sel.loadPercent) + '22',
                  color: heatColor(sel.loadPercent),
                }}
              >
                {STATUS_LABELS_FR[sel.status]}
              </span>
            </div>

            {/* Load bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Charge</span>
                <span>{sel.loadPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${sel.loadPercent}%`, backgroundColor: heatColor(sel.loadPercent) }}
                />
              </div>
            </div>

            {/* Recovery bar */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Récupération</span>
                <span>{Math.round(sel.recoveryProgress * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${sel.recoveryProgress * 100}%` }}
                />
              </div>
            </div>

            {bodyState.recoveryTimeEstimate > 0 && (
              <p className="text-[10px] text-gray-500 mt-2">
                Temps de récupération estimé: ~{bodyState.recoveryTimeEstimate}h
              </p>
            )}

            <button
              onClick={() => setSelectedMuscle(null)}
              className="mt-2 text-[10px] text-gray-500 hover:text-gray-300 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Recovery Timeline */}
      {!compact && (
        <div className="px-4 pb-4">
          <RecoveryTimeline bodyState={bodyState} />
        </div>
      )}

      {/* Injury Alerts */}
      {!compact && <InjuryAlerts bodyState={bodyState} />}
    </div>
  );
}
