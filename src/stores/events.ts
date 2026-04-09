import { create } from 'zustand';
import type { EventWithCounts, EventFilters } from '@oikos/coaching';

interface EventsState {
  events: EventWithCounts[];
  selectedEvent: EventWithCounts | null;
  filters: EventFilters;
  totalCount: number;
  loading: boolean;
  error: string | null;

  setFilters: (filters: Partial<EventFilters>) => void;
  resetFilters: () => void;
  fetchEvents: () => Promise<void>;
  fetchEvent: (id: string) => Promise<void>;
  registerForEvent: (eventId: string, role: 'coach' | 'athlete') => Promise<void>;
  cancelRegistration: (eventId: string) => Promise<void>;
}

const defaultFilters: EventFilters = {
  page: 1,
  limit: 20,
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  selectedEvent: null,
  filters: { ...defaultFilters },
  totalCount: 0,
  loading: false,
  error: null,

  setFilters: (partial) => {
    set((state) => ({ filters: { ...state.filters, ...partial, page: 1 } }));
    get().fetchEvents();
  },

  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
    get().fetchEvents();
  },

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.set(key, String(val));
        }
      });
      const res = await fetch(`/api/events?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement');
      set({ events: json.data, totalCount: json.count, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchEvent: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/events/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement');
      set({ selectedEvent: json, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  registerForEvent: async (eventId, role) => {
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur inscription');
      }
      // Refresh event detail + list
      await get().fetchEvent(eventId);
      await get().fetchEvents();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  cancelRegistration: async (eventId) => {
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur annulation');
      }
      await get().fetchEvent(eventId);
      await get().fetchEvents();
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
