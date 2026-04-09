'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CancelButtonProps {
  bookingId: string;
  onCancelled: () => void;
}

export function CancelButton({ bookingId, onCancelled }: CancelButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(
      'Êtes-vous sûr(e) de vouloir annuler cette réservation ?'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'annulation");
        return;
      }

      onCancelled();
    } catch {
      alert("Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className="text-red-500 hover:text-red-700 text-sm"
      onClick={handleCancel}
      disabled={loading}
    >
      {loading ? 'Annulation...' : 'Annuler'}
    </Button>
  );
}
