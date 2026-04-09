'use client';

import { Button } from './button';
import { Badge } from './badge';
import { SPORT_EMOJIS, SPORT_LABELS, type Sport } from '@/lib/sports';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  sport: string | null;
  target_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  participants_count: number;
  user_joined: boolean;
  user_value: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin: (challengeId: string) => void;
  joining?: boolean;
}

function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function ChallengeCard({ challenge, onJoin, joining }: ChallengeCardProps) {
  const days = daysRemaining(challenge.end_date);
  const progress = challenge.user_joined
    ? Math.min(100, (challenge.user_value / challenge.target_value) * 100)
    : 0;

  const sportEmoji = challenge.sport ? (SPORT_EMOJIS[challenge.sport as Sport] || '⚡') : '🏆';
  const sportLabel = challenge.sport ? (SPORT_LABELS[challenge.sport as Sport] || challenge.sport) : null;

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{sportEmoji}</span>
            <h3 className="text-sm font-bold text-text">{challenge.title}</h3>
          </div>
          {challenge.description && (
            <p className="mt-1 text-xs text-muted">{challenge.description}</p>
          )}
        </div>
        {sportLabel && <Badge variant="sport">{sportLabel}</Badge>}
      </div>

      {/* Target */}
      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-text">{challenge.target_value}</span>
        <span className="text-xs text-muted">{challenge.unit}</span>
      </div>

      {/* Progress bar (only if joined) */}
      {challenge.user_joined && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="font-semibold text-text">{challenge.user_value} / {challenge.target_value} {challenge.unit}</span>
            <span className="text-muted">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span>👥 {challenge.participants_count} participant{challenge.participants_count > 1 ? 's' : ''}</span>
          <span>{days > 0 ? `${days}j restants` : 'Termine'}</span>
        </div>
        {challenge.user_joined ? (
          <Badge variant="success">Inscrit</Badge>
        ) : (
          <Button
            variant="primary"
            size="sm"
            loading={joining}
            onClick={() => onJoin(challenge.id)}
            disabled={days === 0}
          >
            Rejoindre
          </Button>
        )}
      </div>
    </div>
  );
}
