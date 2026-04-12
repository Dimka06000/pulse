import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    slug: string;
    description: string;
    sports: string[];
    levels: string[];
    city: string | null;
    member_count?: number;
    join_mode: 'open' | 'approval' | 'invite';
    logo_url: string | null;
  };
}

const JOIN_MODE_LABELS: Record<string, string> = {
  open: 'Ouvert',
  approval: 'Sur validation',
  invite: 'Sur invitation',
};

const JOIN_MODE_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  approval: 'bg-yellow-100 text-yellow-700',
  invite: 'bg-gray-100 text-gray-600',
};

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link
      href={`/clubs/${club.slug}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="h-14 w-14 shrink-0 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
          {club.logo_url ? (
            <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-brand-600">
              {club.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Center */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{club.name}</h3>
          {club.city && (
            <p className="mt-0.5 text-xs text-gray-500">{club.city}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {club.sports.slice(0, 4).map((sport) => (
              <Badge key={sport}>{sport}</Badge>
            ))}
            {club.sports.length > 4 && (
              <Badge>+{club.sports.length - 4}</Badge>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="shrink-0 text-right flex flex-col items-end gap-2">
          <div>
            <p className="text-lg font-semibold text-gray-900">{club.member_count ?? 0}</p>
            <p className="text-xs text-gray-500">membres</p>
          </div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${JOIN_MODE_COLORS[club.join_mode] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {JOIN_MODE_LABELS[club.join_mode] ?? club.join_mode}
          </span>
        </div>
      </div>
    </Link>
  );
}
