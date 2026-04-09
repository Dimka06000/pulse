'use client';

import { useState } from 'react';
import { Button } from './button';
import { useToast } from './toast';

interface PushToDeviceProps {
  workoutData: Record<string, unknown>;
  title: string;
  sport: string;
}

export function PushToDevice({ workoutData, title, sport }: PushToDeviceProps) {
  const [pushing, setPushing] = useState(false);
  const { toast } = useToast();

  const handlePush = async () => {
    setPushing(true);
    try {
      const res = await fetch('/api/device/push-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workout_data: workoutData, title, sport }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('success', 'Envoyé !', `Séance envoyée vers ${data.provider || 'votre montre'}`);
      } else {
        toast('error', 'Erreur', data.error || "Impossible d'envoyer vers la montre");
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setPushing(false);
    }
  };

  return (
    <Button size="sm" variant="dark" loading={pushing} onClick={handlePush}>
      {'⌚ Envoyer à ma montre'}
    </Button>
  );
}
