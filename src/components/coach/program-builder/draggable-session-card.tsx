'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SPORT_EMOJIS, SPORT_GRADIENT_CLASSES, type Sport } from '@/lib/sports';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface DraggableItem {
  id: string;
  title: string;
  sport: string;
  duration: number;
  kind: 'session' | 'routine';
  type?: string;
}

interface DraggableSessionCardProps {
  item: DraggableItem;
}

// ─── Routine type → emoji mapping ───────────────────────────────────────────
const ROUTINE_TYPE_EMOJIS: Record<string, string> = {
  warmup: '🔥',
  cooldown: '❄️',
  prehab: '🛡️',
  mobility: '🧘',
  core: '💪',
  activation: '⚡',
};

// ─── Component ──────────────────────────────────────────────────────────────
export function DraggableSessionCard({ item }: DraggableSessionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { ...item },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const gradientClass =
    SPORT_GRADIENT_CLASSES[item.sport as Sport] || 'from-slate-500 to-slate-600';

  const leftIcon =
    item.kind === 'routine' && item.type
      ? ROUTINE_TYPE_EMOJIS[item.type] || '⚡'
      : SPORT_EMOJIS[item.sport as Sport] || '⚡';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Sport color bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-lg bg-gradient-to-r ${gradientClass}`}
      />

      <div className="flex items-center gap-2">
        {/* Left icon */}
        <span className="text-base shrink-0">{leftIcon}</span>

        {/* Title */}
        <span className="text-sm font-medium text-gray-800 truncate flex-1">
          {item.title}
        </span>

        {/* Duration badge */}
        <span className="text-xs text-gray-500 shrink-0">{item.duration} min</span>
      </div>
    </div>
  );
}
