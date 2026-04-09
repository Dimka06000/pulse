'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { Button, EmptyState, Textarea } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';

interface VideoFeedback {
  id: string;
  athlete_id: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  coach_comment: string | null;
  coach_timestamps: Array<{ time: number; comment: string }>;
  status: 'pending' | 'reviewed';
  created_at: string;
}

export default function CoachVideosPage() {
  const [videos, setVideos] = useState<VideoFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');
  const { toast } = useToast();

  // Review state
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTimestamps, setReviewTimestamps] = useState<Array<{ time: number; comment: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/video-feedback?as=coach&status=${tab}`);
      if (res.ok) {
        setVideos(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleReview = async () => {
    if (!reviewId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/video-feedback/${reviewId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_comment: reviewComment,
          coach_timestamps: reviewTimestamps,
        }),
      });
      if (res.ok) {
        toast('success', 'Avis envoyé', "Votre retour a été envoyé à l'athlète");
        setReviewId(null);
        setReviewComment('');
        setReviewTimestamps([]);
        fetchVideos();
      } else {
        const data = await res.json();
        toast('error', 'Erreur', data.error);
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  const addTimestamp = () => {
    setReviewTimestamps([...reviewTimestamps, { time: 0, comment: '' }]);
  };

  const updateTimestamp = (index: number, field: 'time' | 'comment', value: string | number) => {
    const updated = [...reviewTimestamps];
    updated[index] = { ...updated[index], [field]: field === 'time' ? Number(value) : value };
    setReviewTimestamps(updated);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <AppHeader title="Vidéos" />
      <div className="p-4 md:p-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-surface p-1">
          {(['pending', 'reviewed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setReviewId(null); }}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                t === tab
                  ? 'bg-white text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t === 'pending' ? 'En attente' : 'Revus'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' ? '📹' : '✅'}
            title={tab === 'pending' ? 'Aucune vidéo en attente' : 'Aucune vidéo revue'}
            description={
              tab === 'pending'
                ? "Vos athlètes n'ont pas encore soumis de vidéos."
                : "Vous n'avez pas encore revu de vidéos."
            }
          />
        ) : (
          <div className="space-y-4">
            {videos.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-white">
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🎬</div>
                    )}
                    {v.duration_seconds && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        {formatDuration(v.duration_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      Athlète {v.athlete_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(v.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {v.status === 'reviewed' && v.coach_comment && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">{v.coach_comment}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {v.status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewId(reviewId === v.id ? null : v.id);
                          setReviewComment('');
                          setReviewTimestamps([]);
                        }}
                      >
                        {reviewId === v.id ? 'Fermer' : 'Revoir'}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-500">
                        Revu
                      </span>
                    )}
                  </div>
                </div>

                {/* Review panel */}
                {reviewId === v.id && (
                  <div className="border-t border-border bg-surface/50 p-4">
                    {/* Video player */}
                    <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-black">
                      <video
                        src={v.video_url}
                        controls
                        className="h-full w-full"
                        playsInline
                      />
                    </div>

                    {/* Comment */}
                    <Textarea
                      label="Commentaire"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Votre retour sur la technique, la posture..."
                      rows={3}
                    />

                    {/* Timestamps */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text">Marqueurs temporels</span>
                        <button onClick={addTimestamp} className="text-xs text-brand-500 hover:underline">
                          + Ajouter un marqueur
                        </button>
                      </div>
                      {reviewTimestamps.map((ts, i) => (
                        <div key={i} className="mb-2 flex gap-2">
                          <input
                            type="number"
                            min={0}
                            value={ts.time}
                            onChange={(e) => updateTimestamp(i, 'time', e.target.value)}
                            className="w-20 rounded border border-border px-2 py-1 text-sm"
                            placeholder="sec"
                          />
                          <input
                            type="text"
                            value={ts.comment}
                            onChange={(e) => updateTimestamp(i, 'comment', e.target.value)}
                            className="flex-1 rounded border border-border px-2 py-1 text-sm"
                            placeholder="Commentaire..."
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button loading={submitting} onClick={handleReview}>
                        Envoyer mon avis
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
