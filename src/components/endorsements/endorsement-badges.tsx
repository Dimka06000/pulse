interface EndorsementGroup {
  specialty: string;
  count: number;
  endorsers: { id: string; endorserName: string }[];
}

interface EndorsementBadgesProps {
  groups: EndorsementGroup[];
}

export function EndorsementBadges({ groups }: EndorsementBadgesProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <div
          key={g.specialty}
          className="group relative rounded-full bg-brand-50 px-3 py-1 text-sm"
          title={`Recommandé par ${g.endorsers.map((e) => e.endorserName).join(', ')}`}
        >
          <span className="font-medium text-brand-700">{g.specialty}</span>
          <span className="ml-1 text-brand-500">&middot; {g.count}</span>

          {/* Tooltip on hover */}
          <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:visible">
            <p className="mb-1 font-medium">Recommandé par :</p>
            {g.endorsers.slice(0, 5).map((e) => (
              <p key={e.id}>{e.endorserName}</p>
            ))}
            {g.endorsers.length > 5 && (
              <p className="text-gray-400">+{g.endorsers.length - 5} autres</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
