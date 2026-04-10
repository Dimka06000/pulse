'use client';

import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { BookingWizard } from '@/components/booking/booking-wizard';

export default function BookCoachPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <AppHeader title="Réserver" />
      <div className="p-4 md:p-8">
        <BookingWizard coachProfileId={id} />
      </div>
    </>
  );
}
