'use client';

import { useEffect, useState } from 'react';
import { useSocialStore } from '@/stores/social';
import { CollabCard } from '@/components/collabs/collab-card';
import { CreateCollabForm } from '@/components/collabs/create-collab-form';
import { InviteCoachModal } from '@/components/collabs/invite-coach-modal';
import { Skeleton } from '@/components/pulse/skeleton';

export default function CollabsPage() {
  const { collabs, collabsLoading, fetchCollabs } = useSocialStore();
  const [showCreate, setShowCreate] = useState(false);
  const [invitingCollabId, setInvitingCollabId] = useState<string | null>(null);

  useEffect(() => {
    fetchCollabs();
  }, [fetchCollabs]);

  if (collabsLoading && !collabs) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const allCollabs: (Record<string, unknown> & { isLead: boolean })[] = [
    ...(collabs?.asLead ?? []).map((c) => ({ ...(c as Record<string, unknown>), isLead: true })),
    ...(collabs?.asParticipant ?? []).map((c) => ({ ...(c as Record<string, unknown>), isLead: false })),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Collaborations</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          + Nouvelle collab
        </button>
      </div>

      {allCollabs.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500">Aucune collaboration</p>
          <p className="mt-1 text-sm text-gray-400">
            Créez une collaboration pour travailler avec d&apos;autres coachs
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {allCollabs.map((c) => (
            <CollabCard
              key={c.id as string}
              id={c.id as string}
              name={c.title as string}
              type={c.type as string}
              status={c.status as string}
              description={(c.description as string) ?? ''}
              coaches={(c.coaches as { id: string; coachId: string; role: string; revenueShare: number; coachName: string }[]) ?? []}
              isLead={c.isLead as boolean}
              onInvite={setInvitingCollabId}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <CreateCollabForm onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}

      {/* Invite modal */}
      {invitingCollabId && (
        <InviteCoachModal
          collabId={invitingCollabId}
          onClose={() => setInvitingCollabId(null)}
        />
      )}
    </div>
  );
}
