'use client';

import { useEffect, useState } from 'react';
import { useSocialStore } from '@/stores/social';
import { HierarchyCard } from '@/components/hierarchy/hierarchy-card';
import { InviteJuniorForm } from '@/components/hierarchy/invite-junior-form';
import { CommissionConfig } from '@/components/hierarchy/commission-config';

export default function TeamPage() {
  const { hierarchy, hierarchyLoading, fetchHierarchy } = useSocialStore();
  const [showInvite, setShowInvite] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  if (hierarchyLoading && !hierarchy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const juniors = (hierarchy?.asSenior ?? []) as Record<string, unknown>[];
  const senior = (hierarchy?.asJunior?.[0] ?? null) as Record<string, unknown> | null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mon équipe</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          + Inviter un junior
        </button>
      </div>

      {/* Senior section (if I'm a junior) */}
      {senior && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Mon senior
          </h2>
          <div className="mt-2">
            <HierarchyCard
              id={senior.id as string}
              name={(senior.senior as Record<string, unknown>)?.userName as string ?? 'Inconnu'}
              mode={senior.mode as string ?? 'team'}
              commissionSplit={senior.commissionRate as number ?? 0}
              status={senior.status as string ?? 'pending'}
              role="junior"
              seniorApprovalRequired={false}
            />
          </div>
        </section>
      )}

      {/* Juniors section */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Mes juniors ({juniors.length})
        </h2>

        {juniors.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucun junior pour le moment</p>
            <p className="mt-1 text-sm text-gray-400">
              Invitez un coach pour travailler ensemble
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {juniors.map((j) => (
              <div key={j.id as string}>
                <HierarchyCard
                  id={j.id as string}
                  name={(j.junior as Record<string, unknown>)?.userName as string ?? 'Inconnu'}
                  mode={j.mode as string ?? 'team'}
                  commissionSplit={j.commissionRate as number ?? 0}
                  status={j.status as string ?? 'pending'}
                  role="senior"
                  seniorApprovalRequired={false}
                />
                {(j.status as string) === 'active' && (
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === (j.id as string) ? null : (j.id as string))
                    }
                    className="mt-1 text-xs text-brand-600 hover:underline"
                  >
                    {expandedId === (j.id as string) ? 'Fermer config' : 'Configurer'}
                  </button>
                )}
                {expandedId === (j.id as string) && (
                  <div className="mt-2">
                    <CommissionConfig
                      hierarchyId={j.id as string}
                      currentSplit={j.commissionRate as number ?? 0}
                      currentApproval={false}
                      currentMode={j.mode as string ?? 'team'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <InviteJuniorForm onClose={() => setShowInvite(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
