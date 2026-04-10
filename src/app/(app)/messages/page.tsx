'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Conversation {
  id: string;
  other: { name: string; avatar_url: string | null };
  lastMessage: { content: string; isMe: boolean; created_at: string } | null;
  unreadCount: number;
  last_message_at: string;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MessagesPage() {
  const { userId } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const res = await fetch('/api/messages');
    if (res.ok) {
      setConversations(await res.json());
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  return (
    <>
      <AppHeader title="Messages" />
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Messages</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Aucune conversation"
            description="Contactez un coach depuis la page Explorer pour démarrer une conversation."
            actionLabel="Explorer les coachs"
            onAction={() => { window.location.href = '/explore'; }}
          />
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition hover:bg-surface/50"
              >
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-sm font-bold text-white">
                  {getInitials(conv.other.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-text' : 'font-semibold text-text'}`}>
                      {conv.other.name}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-[11px] text-muted shrink-0 ml-2">
                        {timeAgo(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-text' : 'text-muted'}`}>
                      {conv.lastMessage.isMe && <span className="text-muted">Vous : </span>}
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
