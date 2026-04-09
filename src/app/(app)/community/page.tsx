'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { FeedCard } from '@/components/pulse/feed-card';
import { ChallengeCard } from '@/components/pulse/challenge-card';
import { EmptyState } from '@/components/pulse/empty-state';
import { useAuthStore } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = 'feed' | 'challenges';

export default function CommunityPage() {
  const { userId } = useAuthStore();
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!userId) return;
    const res = await fetch('/api/feed?page=1&limit=20');
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
    }
  }, [userId]);

  const fetchChallenges = useCallback(async () => {
    if (!userId) return;
    const res = await fetch('/api/challenges?active=true');
    if (res.ok) {
      const data = await res.json();
      setChallenges(data.challenges || []);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFeed(), fetchChallenges()]).finally(() => setLoading(false));
  }, [fetchFeed, fetchChallenges]);

  const handleKudos = async (postId: string, gave: boolean) => {
    if (gave) {
      await fetch(`/api/feed/${postId}/kudos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji: '👏' }),
      });
    } else {
      await fetch(`/api/feed/${postId}/kudos`, { method: 'DELETE' });
    }
  };

  const handleJoin = async (challengeId: string) => {
    setJoiningId(challengeId);
    const res = await fetch(`/api/challenges/${challengeId}/join`, { method: 'POST' });
    if (res.ok) {
      setChallenges(prev => prev.map(c =>
        c.id === challengeId
          ? { ...c, user_joined: true, participants_count: c.participants_count + 1 }
          : c
      ));
    }
    setJoiningId(null);
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Communaute" />
        <div className="p-4 md:p-8 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Communaute" />
      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Desktop title */}
        <h1 className="hidden md:block text-2xl font-extrabold text-text">Communaute</h1>

        {/* Tabs */}
        <div className="flex rounded-xl bg-surface p-1">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === 'feed'
                ? 'bg-white text-text shadow-sm'
                : 'text-muted'
            }`}
          >
            {"Fil d'activite"}
          </button>
          <button
            onClick={() => setTab('challenges')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === 'challenges'
                ? 'bg-white text-text shadow-sm'
                : 'text-muted'
            }`}
          >
            Challenges
          </button>
        </div>

        {/* Feed tab */}
        {tab === 'feed' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <EmptyState
                icon="📡"
                title="Aucune activite"
                description="Les activites de la communaute apparaitront ici."
              />
            ) : (
              posts.map(post => (
                <FeedCard key={post.id} post={post} onKudos={handleKudos} />
              ))
            )}
          </div>
        )}

        {/* Challenges tab */}
        {tab === 'challenges' && (
          <div className="space-y-4">
            {challenges.length === 0 ? (
              <EmptyState
                icon="🏆"
                title="Aucun challenge"
                description="Les challenges actifs apparaitront ici."
              />
            ) : (
              challenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onJoin={handleJoin}
                  joining={joiningId === challenge.id}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
