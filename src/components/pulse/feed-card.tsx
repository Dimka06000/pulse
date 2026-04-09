'use client';

import { useState } from 'react';
import { SportGradient } from './sport-gradient';
import { SPORT_EMOJIS, type Sport } from '@/lib/sports';

interface FeedPost {
  id: string;
  user: { name: string; avatar_url: string | null };
  activity_type: string;
  sport: string | null;
  title: string;
  description: string;
  metrics: Record<string, number | string>;
  created_at: string;
  kudos_count: number;
  user_gave_kudos: boolean;
}

interface FeedCardProps {
  post: FeedPost;
  onKudos: (postId: string, gave: boolean) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function FeedCard({ post, onKudos }: FeedCardProps) {
  const [gave, setGave] = useState(post.user_gave_kudos);
  const [count, setCount] = useState(post.kudos_count);

  const handleKudos = () => {
    const newGave = !gave;
    setGave(newGave);
    setCount(c => newGave ? c + 1 : Math.max(0, c - 1));
    onKudos(post.id, newGave);
  };

  const sportEmoji = post.sport ? (SPORT_EMOJIS[post.sport as Sport] || '⚡') : '⚡';
  const metrics = post.metrics || {};

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-bold text-white">
          {getInitials(post.user.name)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text">{post.user.name}</p>
          <p className="text-[11px] text-muted">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Sport gradient header */}
      {post.sport && (
        <SportGradient sport={post.sport} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{sportEmoji}</span>
            <p className="text-sm font-bold">{post.title}</p>
          </div>
        </SportGradient>
      )}

      {!post.sport && (
        <div className="border-t border-border/50 px-4 py-3">
          <p className="text-sm font-bold text-text">{post.title}</p>
        </div>
      )}

      {/* Description */}
      {post.description && (
        <p className="px-4 pb-2 text-xs text-muted">{post.description}</p>
      )}

      {/* Metrics */}
      {Object.keys(metrics).length > 0 && (
        <div className="flex gap-4 border-t border-border/30 px-4 py-2.5">
          {metrics.duration_minutes && (
            <div className="text-center">
              <p className="text-xs font-bold text-text">{String(metrics.duration_minutes)} min</p>
              <p className="text-[10px] text-muted">Duree</p>
            </div>
          )}
          {metrics.distance_km && (
            <div className="text-center">
              <p className="text-xs font-bold text-text">{String(metrics.distance_km)} km</p>
              <p className="text-[10px] text-muted">Distance</p>
            </div>
          )}
          {metrics.calories && (
            <div className="text-center">
              <p className="text-xs font-bold text-text">{String(metrics.calories)} kcal</p>
              <p className="text-[10px] text-muted">Calories</p>
            </div>
          )}
          {metrics.avg_heart_rate && (
            <div className="text-center">
              <p className="text-xs font-bold text-text">{String(metrics.avg_heart_rate)} bpm</p>
              <p className="text-[10px] text-muted">FC moy.</p>
            </div>
          )}
        </div>
      )}

      {/* Kudos bar */}
      <div className="flex items-center justify-between border-t border-border/30 px-4 py-2">
        <button
          onClick={handleKudos}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            gave
              ? 'bg-brand-500/10 text-brand-600'
              : 'bg-surface text-muted hover:bg-surface/80'
          }`}
        >
          <span className="text-base">{gave ? '👏' : '👋'}</span>
          {count > 0 && <span>{count}</span>}
          <span>{gave ? 'Bravo !' : 'Kudos'}</span>
        </button>
      </div>
    </div>
  );
}
