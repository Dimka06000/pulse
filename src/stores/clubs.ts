import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  sports: string[];
  levels: string[];
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  join_mode: 'open' | 'approval' | 'invite';
  stripe_account_id: string | null;
  is_active: boolean;
  member_count?: number;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'founder' | 'coach_admin' | 'coach' | 'captain' | 'member';
  status: 'active' | 'pending' | 'suspended' | 'left';
  joined_at: string;
  profiles?: { first_name: string; last_name: string; avatar_url: string | null };
}

export interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  description: string;
  event_type: string;
  sport: string | null;
  level: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  is_members_only: boolean;
  status: string;
  participant_count?: number;
  is_registered?: boolean;
}

interface ClubsState {
  // Discovery list
  clubs: Club[];
  totalCount: number;
  loading: boolean;
  error: string | null;

  // Currently viewed club
  activeClub: Club | null;

  // Clubs user belongs to
  myClubs: (Club & { role: string })[];

  // Persisted
  activeClubSlug: string | null;

  // User's role in active club
  myRole: string | null;

  // Club detail data
  members: ClubMember[];
  events: ClubEvent[];
  announcements: any[];

  // Actions
  fetchClubs: (params?: Record<string, string>) => Promise<void>;
  fetchClub: (slugOrId: string) => Promise<void>;
  fetchMyClubs: () => Promise<void>;
  setActiveClub: (slug: string) => void;
  fetchMembers: (clubId: string) => Promise<void>;
  joinClub: (clubId: string) => Promise<void>;
  updateMember: (clubId: string, userId: string, data: Partial<ClubMember>) => Promise<void>;
  fetchEvents: (clubId: string) => Promise<void>;
  createEvent: (clubId: string, data: Partial<ClubEvent>) => Promise<ClubEvent>;
  registerForEvent: (clubId: string, eventId: string) => Promise<void>;
  cancelEventRegistration: (clubId: string, eventId: string) => Promise<void>;
  fetchAnnouncements: (clubId: string) => Promise<void>;
  postAnnouncement: (clubId: string, data: any) => Promise<void>;
}

export const useClubsStore = create<ClubsState>()(
  persist(
    (set, get) => ({
      clubs: [],
      totalCount: 0,
      loading: false,
      error: null,
      activeClub: null,
      myClubs: [],
      activeClubSlug: null,
      myRole: null,
      members: [],
      events: [],
      announcements: [],

      fetchClubs: async (params?) => {
        set({ loading: true, error: null });
        try {
          const searchParams = new URLSearchParams(params);
          const res = await fetch(`/api/clubs?${searchParams}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des clubs');
          set({ clubs: json.data || json.clubs || [], totalCount: json.count ?? (json.data || json.clubs || []).length, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      fetchClub: async (slugOrId: string) => {
        set({ loading: true, error: null });
        try {
          // Determine if it looks like a slug (non-UUID) or an ID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
          const url = isUuid
            ? `/api/clubs/${slugOrId}`
            : `/api/clubs/${slugOrId}?by=slug`;

          const res = await fetch(url);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement du club');

          const club: Club = json;

          // Determine myRole
          let { myClubs } = get();
          if (myClubs.length === 0) {
            await get().fetchMyClubs();
            myClubs = get().myClubs;
          }
          const membership = myClubs.find((c) => c.id === club.id);
          const myRole = membership?.role ?? null;

          set({ activeClub: club, myRole, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      fetchMyClubs: async () => {
        try {
          const res = await fetch('/api/clubs?mine=true');
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement de mes clubs');

          const raw = json.data || json.clubs || [];
          const myClubs: (Club & { role: string })[] = raw.map((c: any) => ({ ...c, role: c.role || c.my_role }));
          set({ myClubs });

          // Auto-set activeClubSlug if none selected and user has clubs
          const { activeClubSlug } = get();
          if (!activeClubSlug && myClubs.length > 0) {
            set({ activeClubSlug: myClubs[0].slug });
          }
        } catch {
          // Silent catch for fetches
        }
      },

      setActiveClub: (slug: string) => {
        set({ activeClubSlug: slug });
      },

      fetchMembers: async (clubId: string) => {
        try {
          const res = await fetch(`/api/clubs/${clubId}/members`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des membres');
          set({ members: json.data });
        } catch {
          // Silent catch for fetches
        }
      },

      joinClub: async (clubId: string) => {
        const res = await fetch(`/api/clubs/${clubId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur lors de l\'adhésion au club');
        }
        // Refresh data
        await get().fetchMyClubs();
        await get().fetchMembers(clubId);
      },

      updateMember: async (clubId: string, userId: string, data: Partial<ClubMember>) => {
        const res = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur mise à jour du membre');
        }
        await get().fetchMembers(clubId);
      },

      fetchEvents: async (clubId: string) => {
        try {
          const res = await fetch(`/api/clubs/${clubId}/events`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des événements');
          set({ events: json.data });
        } catch {
          // Silent catch for fetches
        }
      },

      createEvent: async (clubId: string, data: Partial<ClubEvent>) => {
        const res = await fetch(`/api/clubs/${clubId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur création de l\'événement');
        }
        const json = await res.json();
        await get().fetchEvents(clubId);
        return json;
      },

      registerForEvent: async (clubId: string, eventId: string) => {
        const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur inscription à l\'événement');
        }
        await get().fetchEvents(clubId);
      },

      cancelEventRegistration: async (clubId: string, eventId: string) => {
        const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur annulation de l\'inscription');
        }
        await get().fetchEvents(clubId);
      },

      fetchAnnouncements: async (clubId: string) => {
        try {
          const res = await fetch(`/api/clubs/${clubId}/announcements`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des annonces');
          set({ announcements: json.data });
        } catch {
          // Silent catch for fetches
        }
      },

      postAnnouncement: async (clubId: string, data: any) => {
        const res = await fetch(`/api/clubs/${clubId}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Erreur publication de l\'annonce');
        }
        await get().fetchAnnouncements(clubId);
      },
    }),
    {
      name: 'pulse-clubs',
      partialize: (state) => ({ activeClubSlug: state.activeClubSlug }),
    }
  )
);
