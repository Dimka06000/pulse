'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BodyState } from '@/lib/training/body-state-engine';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedState: BodyState | null = null;
let cacheTimestamp = 0;

export function useBodyState(): {
  bodyState: BodyState | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [bodyState, setBodyState] = useState<BodyState | null>(cachedState);
  const [loading, setLoading] = useState(!cachedState);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchState = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && cachedState && Date.now() - cacheTimestamp < CACHE_TTL) {
      setBodyState(cachedState);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/body-state', { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const data: BodyState = await res.json();
      cachedState = data;
      cacheTimestamp = Date.now();
      setBodyState(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    return () => { abortRef.current?.abort(); };
  }, [fetchState]);

  const refresh = useCallback(() => fetchState(true), [fetchState]);

  return { bodyState, loading, error, refresh };
}
