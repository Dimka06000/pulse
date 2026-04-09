'use client';

const TYPE_LABELS: Record<string, string> = {
  joint_session: 'Session commune',
  program: 'Programme',
  guest: 'Invité',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
};

interface CollabCoach {
  id: string;
  coachId: string;
  role: string;
  revenueShare: number;
  coachName: string;
}

interface CollabCardProps {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  coaches: CollabCoach[];
  isLead: boolean;
  onInvite: (collabId: string) => void;
}

export function CollabCard({
  id,
  name,
  type,
  status,
  description,
  coaches,
  isLead,
  onInvite,
}: CollabCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{TYPE_LABELS[type] ?? type}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
          {status === 'draft' ? 'Brouillon' : status === 'active' ? 'Active' : 'Terminée'}
        </span>
      </div>

      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}

      {/* Coach list with revenue shares */}
      <div className="mt-3 space-y-1">
        {coaches.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {c.coachName}
              {c.role === 'lead' && (
                <span className="ml-1 text-xs text-brand-600">(lead)</span>
              )}
            </span>
            <span className="font-medium text-gray-900">{c.revenueShare}%</span>
          </div>
        ))}
      </div>

      {isLead && status !== 'completed' && (
        <button
          onClick={() => onInvite(id)}
          className="mt-3 text-sm text-brand-600 hover:underline"
        >
          + Inviter un coach
        </button>
      )}
    </div>
  );
}
