'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingCard } from './booking-card';
import { CancelButton } from './cancel-button';

type Booking = {
  id: string;
  scheduled_at: string;
  end_at: string;
  status: string;
  session_templates?: { title: string; sport: string } | null;
  coach_profiles?: { profiles: { name: string } } | null;
};

interface BookingListProps {
  upcoming: Booking[];
  past: Booking[];
}

export function BookingList({ upcoming: initialUpcoming, past }: BookingListProps) {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState(initialUpcoming);

  function handleCancelled(id: string) {
    setUpcoming((prev) => prev.filter((b) => b.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
            À venir
          </h3>
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking}>
                <CancelButton
                  bookingId={booking.id}
                  onCancelled={() => handleCancelled(booking.id)}
                />
              </BookingCard>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Passées
          </h3>
          <div className="space-y-3">
            {past.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          Aucune réservation pour le moment
        </p>
      )}
    </div>
  );
}
