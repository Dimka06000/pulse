'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { formatPrice } from '@oikos/coaching';

type Session = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  level: string;
  type: string;
  max_participants: number;
  duration: number;
  price: number;
};

interface SessionsManagerProps {
  initialSessions: Session[];
}

const LEVELS = [
  { value: 'discovery', label: 'Découverte' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'intensive', label: 'Intensif' },
];

const TYPES = [
  { value: 'one_on_one', label: 'Individuel' },
  { value: 'group', label: 'Groupe' },
  { value: 'workshop', label: 'Atelier' },
  { value: 'assessment', label: 'Évaluation' },
];

export function SessionsManager({ initialSessions }: SessionsManagerProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('standard');
  const [type, setType] = useState('one_on_one');
  const [maxParticipants, setMaxParticipants] = useState(1);
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(50);

  function resetForm() {
    setTitle('');
    setSport('');
    setDescription('');
    setLevel('standard');
    setType('one_on_one');
    setMaxParticipants(1);
    setDuration(60);
    setPrice(50);
    setError(null);
  }

  async function handleCreate() {
    if (!title.trim() || !sport.trim()) {
      setError('Titre et sport sont requis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/coaches/me/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sport: sport.trim(),
          description: description.trim() || null,
          level,
          type,
          max_participants: maxParticipants,
          duration,
          price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de création');
        return;
      }

      const newSession = await res.json();
      setSessions((prev) => [newSession, ...prev]);
      setShowForm(false);
      resetForm();
      router.refresh();
    } catch {
      setError('Erreur de création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {sessions.length} séance{sessions.length !== 1 ? 's' : ''} configurée{sessions.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : 'Nouvelle séance'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Nouvelle séance</h3>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="Titre de la séance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Sport (ex: Boxe, Yoga, Fitness)"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            />
          </div>

          <Textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Select
                label="Niveau"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                options={LEVELS}
              />
            </div>
            <div>
              <Select
                label="Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={TYPES}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Durée (min)</label>
              <Input
                type="number"
                min={15}
                max={180}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prix (EUR)</label>
              <Input
                type="number"
                min={0}
                step={5}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {type === 'group' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Participants max</label>
              <Input
                type="number"
                min={2}
                max={50}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
            </div>
          )}

          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? 'Création...' : 'Créer la séance'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{session.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{session.sport}</p>
                {session.description && (
                  <p className="text-sm text-gray-400 mt-1">{session.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {LEVELS.find((l) => l.value === session.level)?.label || session.level}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {TYPES.find((t) => t.value === session.type)?.label || session.type}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {session.duration} min
                  </span>
                  {session.max_participants > 1 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Max {session.max_participants}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold text-brand-600">
                {formatPrice(Math.round(session.price * 100))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
