import { create } from 'zustand';

interface SocialState {
  // Hierarchy
  hierarchy: { asSenior: unknown[]; asJunior: unknown[] | null } | null;
  hierarchyLoading: boolean;
  fetchHierarchy: () => Promise<void>;
  inviteJunior: (data: Record<string, unknown>) => Promise<void>;
  updateHierarchy: (id: string, data: Record<string, unknown>) => Promise<void>;

  // Collabs
  collabs: { asLead: unknown[]; asParticipant: unknown[] } | null;
  collabsLoading: boolean;
  fetchCollabs: () => Promise<void>;
  createCollab: (data: Record<string, unknown>) => Promise<void>;
  inviteToCollab: (collabId: string, data: Record<string, unknown>) => Promise<void>;

  // Ratings (for coach review page)
  ratings: { ratings: unknown[]; stats: unknown } | null;
  ratingsLoading: boolean;
  fetchRatings: (coachId: string) => Promise<void>;
  submitRating: (data: Record<string, unknown>) => Promise<void>;
  replyToRating: (ratingId: string, reply: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  // ─── Hierarchy ──────────────────────────────────────────────────
  hierarchy: null,
  hierarchyLoading: false,
  fetchHierarchy: async () => {
    set({ hierarchyLoading: true });
    try {
      const res = await fetch('/api/hierarchy/me');
      if (!res.ok) throw new Error('Failed to fetch hierarchy');
      const data = await res.json();
      set({ hierarchy: data });
    } finally {
      set({ hierarchyLoading: false });
    }
  },
  inviteJunior: async (data) => {
    const res = await fetch('/api/hierarchy/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
    await get().fetchHierarchy();
  },
  updateHierarchy: async (id, data) => {
    const res = await fetch(`/api/hierarchy/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
    await get().fetchHierarchy();
  },

  // ─── Collabs ────────────────────────────────────────────────────
  collabs: null,
  collabsLoading: false,
  fetchCollabs: async () => {
    set({ collabsLoading: true });
    try {
      const res = await fetch('/api/collabs/me');
      if (!res.ok) throw new Error('Failed to fetch collabs');
      const data = await res.json();
      set({ collabs: data });
    } finally {
      set({ collabsLoading: false });
    }
  },
  createCollab: async (data) => {
    const res = await fetch('/api/collabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
    await get().fetchCollabs();
  },
  inviteToCollab: async (collabId, data) => {
    const res = await fetch(`/api/collabs/${collabId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
    await get().fetchCollabs();
  },

  // ─── Ratings ────────────────────────────────────────────────────
  ratings: null,
  ratingsLoading: false,
  fetchRatings: async (coachId) => {
    set({ ratingsLoading: true });
    try {
      const res = await fetch(`/api/coaches/${coachId}/ratings`);
      if (!res.ok) throw new Error('Failed to fetch ratings');
      const data = await res.json();
      set({ ratings: data });
    } finally {
      set({ ratingsLoading: false });
    }
  },
  submitRating: async (data) => {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
  },
  replyToRating: async (ratingId, reply) => {
    const res = await fetch(`/api/ratings/${ratingId}/reply`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachReply: reply }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erreur');
    }
  },
}));
