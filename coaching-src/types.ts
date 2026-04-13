// ─── Enums ───────────────────────────────────────────────────────────

export type UserRole = 'client' | 'coach' | 'admin';

export type HierarchyMode = 'solo' | 'team' | 'franchise';

export type HierarchyStatus = 'pending' | 'active' | 'revoked';

export type CollabType = 'individual' | 'group' | 'team';

export type CollabStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CollabRole = 'lead' | 'assistant' | 'observer';

export type SessionLevel = 'discovery' | 'standard' | 'advanced' | 'intensive';

export type SessionType = 'one_on_one' | 'group' | 'workshop' | 'assessment';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type CancelledBy = 'client' | 'coach' | 'system';

export type EventType = 'platform' | 'partner';

export type EventStatus = 'draft' | 'open' | 'full' | 'completed' | 'cancelled';

export type EventParticipantRole = 'coach' | 'athlete';

export type EventParticipantStatus = 'applied' | 'confirmed' | 'rejected' | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export type PaymentType = 'session' | 'package' | 'event' | 'subscription' | 'tip';

// ─── Core Interfaces ─────────────────────────────────────────────────

export interface User {
  id: string;
  did: string;
  displayName: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CoachProfile {
  id: string;
  userId: string;
  specialties: string[];
  certifications: string[];
  hierarchyMode: HierarchyMode;
  hourlyRate?: number;
  currency: string;
  availabilitySchedule?: Record<string, unknown>;
  maxClients: number;
  currentClients: number;
  rating: number;
  totalSessions: number;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CoachHierarchy {
  id: string;
  parentCoachId: string;
  childCoachId: string;
  status: HierarchyStatus;
  commissionRate: number;
  createdAt: number;
  updatedAt: number;
}

// ─── Collaboration ───────────────────────────────────────────────────

export interface Collaboration {
  id: string;
  clientId: string;
  type: CollabType;
  status: CollabStatus;
  title: string;
  description?: string;
  goals: string[];
  startDate: number;
  endDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollaborationCoach {
  id: string;
  collaborationId: string;
  coachId: string;
  role: CollabRole;
  joinedAt: number;
}

// ─── Sessions & Bookings ─────────────────────────────────────────────

export interface SessionTemplate {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  level: SessionLevel;
  type: SessionType;
  durationMinutes: number;
  price: number;
  currency: string;
  maxParticipants: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Booking {
  id: string;
  templateId: string;
  collaborationId?: string;
  coachId: string;
  clientId: string;
  status: BookingStatus;
  scheduledAt: number;
  durationMinutes: number;
  price: number;
  currency: string;
  cancelledBy?: CancelledBy;
  cancelReason?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Events ──────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  partnerId?: string | null;
  date: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  slotsCoach: number;
  slotsAthlete: number;
  price: number;
  sport?: string | null;
  level?: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  registeredAt: number;
}

// ─── Event Filters & Inputs ─────────────────────────────────────────

export interface EventFilters {
  sport?: string;
  level?: string;
  dateFrom?: string;        // ISO date string
  dateTo?: string;          // ISO date string
  city?: string;
  type?: EventType;         // 'platform' | 'partner'
  status?: EventStatus;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  type: EventType;
  partnerId?: string;       // required if type === 'partner'
  date: string;             // ISO timestamp
  lat?: number;
  lng?: number;
  address?: string;
  slotsCoach: number;
  slotsAthlete: number;
  price: number;
  sport?: string;
  level?: string;           // default 'all'
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: string;
  lat?: number;
  lng?: number;
  address?: string;
  slotsCoach?: number;
  slotsAthlete?: number;
  price?: number;
  sport?: string;
  level?: string;
  status?: EventStatus;
}

export interface RegisterEventInput {
  eventId: string;
  userId: string;
  role: EventParticipantRole;  // 'coach' | 'athlete'
}

export interface EventWithCounts extends Event {
  filledCoach: number;
  filledAthlete: number;
  confirmedCoach: number;
  confirmedAthlete: number;
  userStatus?: EventParticipantStatus | null;  // current user's status if registered
}

export interface MatchCandidate {
  userId: string;
  name: string;
  matchScore: number;        // 0-100
  matchReasons: string[];    // e.g. ["sport match", "within radius", "level match"]
}

// ─── Ratings & Endorsements ──────────────────────────────────────────

export interface Rating {
  id: string;
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  score: number; // 1-5
  comment?: string;
  createdAt: number;
}

export interface Endorsement {
  id: string;
  fromCoachId: string;
  toCoachId: string;
  skill: string;
  message?: string;
  createdAt: number;
}

// ─── Domain-Specific ─────────────────────────────────────────────────

export interface NutritionPlan {
  id: string;
  collaborationId: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  meals: Record<string, unknown>[];
  startDate: number;
  endDate?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Credits = internal currency. Bridge to OIK later.
 */
export interface UserCredit {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  lastTransactionAt?: number;
  updatedAt: number;
}

export interface SessionReport {
  id: string;
  bookingId: string;
  coachId: string;
  clientId: string;
  summary: string;
  privateNotes?: string;
  goals: string[];
  nextSteps: string[];
  attachments: string[];
  createdAt: number;
}

// ─── Tracking (Human Language) ──────────────────────────────────────

export interface AthleteProgressEntry {
  date: string;
  metric: string;
  value: number;
  unit: string;
  label: string;
}

export interface SessionReportInput {
  bookingId: string;
  coachNotes: string;
  athleteProgress: AthleteProgressEntry[];
  nextSessionFocus: string;
}

export interface AthleteProgressSummary {
  clientId: string;
  clientName: string;
  avatarUrl?: string;
  lastSessionDate?: string;
  totalSessions: number;
  weightTrend?: {
    current: number;
    previous: number;
    direction: 'up' | 'down' | 'stable';
    delta: number;
    sentence: string;
  };
  frequencyTrend?: {
    thisMonth: number;
    lastMonth: number;
    direction: 'up' | 'down' | 'stable';
    sentence: string;
  };
  performanceTrend?: {
    direction: 'up' | 'down' | 'stable';
    sentence: string;
  };
  recentNotes: string[];
}

export interface ClientListItem {
  id: string;
  name: string;
  avatarUrl?: string;
  lastSession?: string;
  totalSessions: number;
  trend: 'up' | 'down' | 'stable';
  trendSentence: string;
}

// ─── Nutrition (Coach sees macros/micros ONLY, never meals — QR access) ─

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  name: string;
  time?: string;
  description: string;
  calories?: number;
}

export interface NutritionPlanInput {
  userId: string;
  coachId?: string;
  goal: string;
  dailyCalories: number;
  macros: Macros;
  meals: Meal[];
  vivoSyncId?: string;
}

export interface NutritionPlanView {
  id: string;
  goal: string;
  dailyCalories: number;
  macros: Macros;
  meals: Meal[];
  coachName?: string;
  vivoSyncId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Training & Certification ───────────────────────────────────────

export type CourseCategory = 'platform_basics' | 'first_aid' | 'sports_nutrition' | 'pedagogy' | 'partner_cert';

export type CourseStatus = 'available' | 'in_progress' | 'completed';

export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  durationMinutes: number;
  modules: CourseModule[];
  requiredForVerification: boolean;
  badgeIcon: string;
  createdAt: string;
}

export interface CourseModule {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz';
  contentUrl?: string;
  quizQuestions?: QuizQuestion[];
  durationMinutes: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TrainingEnrollment {
  id: string;
  courseId: string;
  coachId: string;
  status: CourseStatus;
  progress: number;
  completedModules: string[];
  startedAt: string;
  completedAt?: string;
}

export interface CoachPathway {
  steps: PathwayStep[];
  currentStep: number;
  isVerified: boolean;
}

export interface PathwayStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

// ─── Platform ────────────────────────────────────────────────────────

export interface PlatformSettings {
  id: string;
  commissionRate: number;
  minBookingNoticeHours: number;
  cancellationWindowHours: number;
  maxFreeTrialSessions: number;
  supportedCurrencies: string[];
  updatedAt: number;
}

// ─── Search & Filters ───────────────────────────────────────────────

export interface CoachSearchFilters {
  sport?: string;
  level?: SessionLevel;
  priceMin?: number;
  priceMax?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRating?: number;
  sortBy?: 'relevance' | 'distance' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  limit?: number;
}

export interface CoachSearchResult {
  id: string;
  userId: string;
  bio: string;
  specialties: string[];
  certifications: unknown[];
  hourlyRate: number;
  lat: number | null;
  lng: number | null;
  radius: number;
  acceptsAnonymousReviews: boolean;
  isVerified: boolean;
  avgRating: number;
  totalSessions: number;
  // Joined from profiles
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  city: string | null;
  // Computed
  distanceKm?: number;
  endorsementCount?: number;
}

export interface CoachPublicProfile extends CoachSearchResult {
  ratings: Rating[];
  endorsements: Endorsement[];
  sessionTemplates: SessionTemplate[];
}

export interface CreateCoachProfileInput {
  bio?: string;
  specialties?: string[];
  hourlyRate?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  acceptsAnonymousReviews?: boolean;
}

export interface UpdateCoachProfileInput {
  bio?: string;
  specialties?: string[];
  certifications?: unknown[];
  hourlyRate?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  acceptsAnonymousReviews?: boolean;
  displayName?: string;
  yearsExperience?: number;
  mainSports?: string[];
  instagram?: string;
  website?: string;
}

// ─── Social Layer Input Types ───────────────────────────────────────

/** Hierarchy invite payload */
export interface HierarchyInviteInput {
  juniorCoachId: string;
  mode: 'team' | 'cabinet' | 'mentorship' | 'mixed';
  commissionSplit: number;       // 0–100
  seniorApprovalRequired: boolean;
}

/** Hierarchy update payload (accept, end, update config) */
export interface HierarchyUpdateInput {
  status?: 'active' | 'ended';
  commissionSplit?: number;
  seniorApprovalRequired?: boolean;
  mode?: 'team' | 'cabinet' | 'mentorship' | 'mixed';
}

/** My hierarchy response — both sides */
export interface MyHierarchy {
  asSenior: (CoachHierarchy & { junior: Pick<CoachProfile, 'id' | 'userId'> & { userName: string } })[];
  asJunior: (CoachHierarchy & { senior: Pick<CoachProfile, 'id' | 'userId'> & { userName: string } })[] | null;
}

/** Collaboration create payload */
export interface CollabCreateInput {
  name: string;
  description?: string;
  type: CollabType;
  durationWeeks?: number;
}

/** Collaboration update payload */
export interface CollabUpdateInput {
  name?: string;
  description?: string;
  status?: CollabStatus;
  durationWeeks?: number;
}

/** Invite coach to collab */
export interface CollabInviteInput {
  coachId: string;
  role: CollabRole;
  revenueShare: number;         // 0–100
}

/** My collabs response */
export interface MyCollabs {
  asLead: (Collaboration & { coaches: (CollaborationCoach & { coachName: string })[] })[];
  asParticipant: (Collaboration & { coaches: (CollaborationCoach & { coachName: string })[] })[];
}

/** Endorsement create payload */
export interface EndorsementCreateInput {
  endorseeId: string;
  specialty: string;
}

/** Endorsements grouped by specialty for display */
export interface EndorsementGroup {
  specialty: string;
  count: number;
  endorsers: { id: string; endorserId: string; endorserName: string; createdAt: number }[];
}

/** Rating create payload */
export interface RatingCreateInput {
  bookingId: string;
  score: number;                // 1–5
  comment: string;
  isAnonymous: boolean;
}

/** Coach reply payload */
export interface RatingReplyInput {
  coachReply: string;
}

/** Rating with athlete info for display */
export interface RatingWithAthlete extends Rating {
  athleteName: string | null;   // null if anonymous
  bookingDate: string;
  sessionTitle: string;
}

/** Rating stats for a coach */
export interface RatingStats {
  avgRating: number;
  totalRatings: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
