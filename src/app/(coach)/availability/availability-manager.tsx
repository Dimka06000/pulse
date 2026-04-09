'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

interface AvailabilityManagerProps {
  initialSlots: AvailabilitySlot[];
}

const DAY_NAMES = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function AvailabilityManager({ initialSlots }: AvailabilityManagerProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [daySlots, setDaySlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [saving, setSaving] = useState(false);

  function getSlotsForDay(day: number) {
    return slots.filter((s) => s.day_of_week === day);
  }

  function startEditDay(day: number) {
    const existing = getSlotsForDay(day);
    if (existing.length > 0) {
      setDaySlots(existing.map((s) => ({ start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) })));
    } else {
      setDaySlots([{ start_time: '09:00', end_time: '12:00' }]);
    }
    setEditingDay(day);
  }

  function addSlotRow() {
    setDaySlots((prev) => [...prev, { start_time: '14:00', end_time: '18:00' }]);
  }

  function removeSlotRow(index: number) {
    setDaySlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlotRow(index: number, field: 'start_time' | 'end_time', value: string) {
    setDaySlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  async function saveDay() {
    if (editingDay === null) return;
    setSaving(true);

    try {
      const res = await fetch('/api/coaches/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: editingDay,
          slots: daySlots,
        }),
      });

      if (res.ok) {
        // Update local state
        setSlots((prev) => {
          const otherDays = prev.filter((s) => s.day_of_week !== editingDay);
          const newSlots = daySlots.map((s, i) => ({
            id: `temp-${editingDay}-${i}`,
            day_of_week: editingDay,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: true,
          }));
          return [...otherDays, ...newSlots];
        });
        setEditingDay(null);
      }
    } catch {
      alert('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function clearDay() {
    if (editingDay === null) return;
    setSaving(true);

    try {
      await fetch('/api/coaches/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: editingDay, slots: [] }),
      });

      setSlots((prev) => prev.filter((s) => s.day_of_week !== editingDay));
      setEditingDay(null);
    } catch {
      alert('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Définissez vos créneaux récurrents pour chaque jour de la semaine.
      </p>

      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
        const daySlotsExisting = getSlotsForDay(day);
        const isEditing = editingDay === day;

        return (
          <div key={day} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{DAY_NAMES[day]}</h3>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => isEditing ? setEditingDay(null) : startEditDay(day)}
              >
                {isEditing ? 'Annuler' : 'Modifier'}
              </Button>
            </div>

            {!isEditing && (
              <div className="mt-2">
                {daySlotsExisting.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun créneau</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {daySlotsExisting.map((s, i) => (
                      <span key={i} className="text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-lg">
                        {s.start_time.substring(0, 5)} &ndash; {s.end_time.substring(0, 5)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isEditing && (
              <div className="mt-3 space-y-3">
                {daySlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlotRow(index, 'start_time', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-400">&ndash;</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlotRow(index, 'end_time', e.target.value)}
                      className="w-32"
                    />
                    {daySlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlotRow(index)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button variant="ghost" className="text-sm" onClick={addSlotRow}>
                    + Ajouter un créneau
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveDay} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                  <Button variant="ghost" className="text-red-500" onClick={clearDay} disabled={saving}>
                    Tout supprimer
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
