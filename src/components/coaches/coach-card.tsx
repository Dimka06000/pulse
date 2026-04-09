import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import type { CoachSearchResult } from '@oikos/coaching';

interface CoachCardProps {
  coach: CoachSearchResult;
}

export function CoachCard({ coach }: CoachCardProps) {
  const name = [coach.firstName, coach.lastName].filter(Boolean).join(' ') || 'Coach';

  return (
    <Link
      href={`/coach/${coach.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-14 w-14 shrink-0 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
          {coach.avatarUrl ? (
            <img src={coach.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-brand-600">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
            {coach.isVerified && (
              <span className="text-brand-600 text-sm" title="Coach vérifié">✓</span>
            )}
          </div>

          {/* Rating + sessions */}
          <div className="mt-0.5 flex items-center gap-2 text-sm">
            <StarRating rating={coach.avgRating} size="sm" />
            <span className="text-gray-500">
              {coach.totalSessions} séance{coach.totalSessions !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Location + distance */}
          {(coach.city || coach.distanceKm != null) && (
            <p className="mt-1 text-xs text-gray-500">
              {coach.city}
              {coach.distanceKm != null && ` · ${coach.distanceKm} km`}
            </p>
          )}

          {/* Specialties */}
          <div className="mt-2 flex flex-wrap gap-1">
            {coach.specialties.slice(0, 4).map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
            {coach.specialties.length > 4 && (
              <Badge>+{coach.specialties.length - 4}</Badge>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold text-gray-900">
            {coach.hourlyRate > 0 ? `${coach.hourlyRate}€` : 'Gratuit'}
          </p>
          <p className="text-xs text-gray-500">/heure</p>
        </div>
      </div>
    </Link>
  );
}
