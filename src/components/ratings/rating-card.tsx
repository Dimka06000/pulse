interface RatingCardProps {
  athleteName: string | null;
  score: number;
  comment: string;
  isAnonymous: boolean;
  coachReply: string | null;
  bookingDate: string;
  sessionTitle: string;
  ratingId: string;
  isCoachView: boolean;
  onReply?: (ratingId: string) => void;
}

export function RatingCard({
  athleteName,
  score,
  comment,
  isAnonymous,
  coachReply,
  bookingDate,
  sessionTitle,
  ratingId,
  isCoachView,
  onReply,
}: RatingCardProps) {
  const displayName = isAnonymous ? 'Anonyme' : (athleteName ?? 'Sportif');
  const formattedDate = bookingDate
    ? new Date(bookingDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-500">{sessionTitle} &middot; {formattedDate}</p>
        </div>
        <div className="flex text-yellow-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={star <= score ? 'text-yellow-400' : 'text-gray-200'}>
              &#9733;
            </span>
          ))}
        </div>
      </div>

      {comment && <p className="mt-2 text-sm text-gray-700">{comment}</p>}

      {coachReply && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Réponse du coach</p>
          <p className="mt-1 text-sm text-gray-700">{coachReply}</p>
        </div>
      )}

      {isCoachView && !coachReply && onReply && (
        <button
          onClick={() => onReply(ratingId)}
          className="mt-2 text-sm text-brand-600 hover:underline"
        >
          Répondre
        </button>
      )}
    </div>
  );
}
