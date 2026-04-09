'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionPicker } from './session-picker';
import { Calendar } from './calendar';
import { SlotPicker } from './slot-picker';
import { BookingSummary } from './booking-summary';

interface SessionTemplate {
  id: string;
  title: string;
  sport: string;
  level: string;
  type: string;
  duration: number;
  price: number;
  description?: string | null;
}

interface BookingWizardProps {
  coachId: string;
  coachName: string;
  sessions: SessionTemplate[];
  availableDays: number[];    // ISO days when coach has recurring availability
}

type Slot = { start: string; end: string };

const STEP_LABELS = [
  'Choisir une séance',
  'Choisir une date',
  'Choisir un horaire',
  'Confirmer',
];

export function BookingWizard({
  coachId,
  coachName,
  sessions,
  availableDays,
}: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionTemplate | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [hasCredits, setHasCredits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedSession) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setError(null);

    fetch(
      `/api/slots?coach_id=${coachId}&date=${selectedDate}&session_template_id=${selectedSession.id}`
    )
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setError('Erreur lors du chargement des créneaux'))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedSession, coachId]);

  function handleSelectSession(session: SessionTemplate) {
    setSelectedSession(session);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(1);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep(3);
  }

  async function handleConfirmWithCredit() {
    if (!selectedSession || !selectedDate || !selectedSlot) return;
    setLoading(true);
    setError(null);

    const scheduledAt = `${selectedDate}T${selectedSlot.start}:00`;
    const endAt = `${selectedDate}T${selectedSlot.end}:00`;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coachId,
          session_template_id: selectedSession.id,
          scheduled_at: scheduledAt,
          end_at: endAt,
        }),
      });

      if (res.status === 402) {
        // No credits, go to payment
        setHasCredits(false);
        await handlePayWithStripe();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la réservation');
        return;
      }

      router.push('/bookings?success=true');
    } catch {
      setError('Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  }

  async function handlePayWithStripe() {
    if (!selectedSession || !selectedDate || !selectedSlot) return;
    setLoading(true);
    setError(null);

    const scheduledAt = `${selectedDate}T${selectedSlot.start}:00`;
    const endAt = `${selectedDate}T${selectedSlot.end}:00`;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coachId,
          session_template_id: selectedSession.id,
          scheduled_at: scheduledAt,
          end_at: endAt,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Erreur de paiement');
      }
    } catch {
      setError('Erreur de paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={`text-xs font-medium transition-colors ${
              i === step
                ? 'text-brand-600'
                : i < step
                  ? 'text-gray-500 cursor-pointer hover:text-brand-400'
                  : 'text-gray-300'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <SessionPicker
          sessions={sessions}
          selected={selectedSession}
          onSelect={handleSelectSession}
        />
      )}

      {step === 1 && (
        <Calendar
          availableDays={availableDays}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      )}

      {step === 2 && (
        <SlotPicker
          slots={slots}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          loading={slotsLoading}
        />
      )}

      {step === 3 && selectedSession && selectedDate && selectedSlot && (
        <BookingSummary
          coachName={coachName}
          sessionTitle={selectedSession.title}
          date={selectedDate}
          slot={selectedSlot}
          priceCents={Math.round(selectedSession.price * 100)}
          hasCredits={hasCredits}
          onConfirm={handleConfirmWithCredit}
          onPay={handlePayWithStripe}
          loading={loading}
        />
      )}
    </div>
  );
}
