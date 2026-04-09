export { COACHING_MANIFEST } from './module.js';

export {
  searchCoaches,
  getCoachProfile,
  createCoachProfile,
  updateCoachProfile,
  getAllSpecialties,
  getMyCoachProfile,
  getCoachSessionTemplates,
} from './engine.js';

export * from './hierarchy.js';
export * from './collaboration.js';
export * from './endorsement.js';
export * from './ratings.js';
export * from './tracking.js';
export * from './nutrition.js';
export * from './training.js';
export * from './events.js';
export * from './scheduling.js';
export * from './credits.js';
export * from './commission.js';
export * from './cancellation.js';

export type {
  // Enums
  UserRole,
  HierarchyMode,
  HierarchyStatus,
  CollabType,
  CollabStatus,
  CollabRole,
  SessionLevel,
  SessionType,
  BookingStatus,
  CancelledBy,
  EventType,
  EventStatus,
  EventParticipantRole,
  EventParticipantStatus,
  PaymentStatus,
  PaymentType,
  // Interfaces
  User,
  CoachProfile,
  CoachHierarchy,
  Collaboration,
  CollaborationCoach,
  SessionTemplate,
  Booking,
  Event,
  EventParticipant,
  Rating,
  Endorsement,
  NutritionPlan,
  UserCredit,
  SessionReport,
  PlatformSettings,
  CoachSearchFilters,
  CoachSearchResult,
  CoachPublicProfile,
  CreateCoachProfileInput,
  UpdateCoachProfileInput,
  // Social Layer
  HierarchyInviteInput,
  HierarchyUpdateInput,
  MyHierarchy,
  CollabCreateInput,
  CollabUpdateInput,
  CollabInviteInput,
  MyCollabs,
  EndorsementCreateInput,
  EndorsementGroup,
  RatingCreateInput,
  RatingReplyInput,
  RatingWithAthlete,
  RatingStats,
  // Tracking
  AthleteProgressEntry,
  SessionReportInput,
  AthleteProgressSummary,
  ClientListItem,
  // Nutrition
  Macros,
  Meal,
  NutritionPlanInput,
  NutritionPlanView,
  // Training
  CourseCategory,
  CourseStatus,
  TrainingCourse,
  CourseModule,
  QuizQuestion,
  TrainingEnrollment,
  CoachPathway,
  PathwayStep,
  // Events
  EventFilters,
  CreateEventInput,
  UpdateEventInput,
  RegisterEventInput,
  EventWithCounts,
  MatchCandidate,
} from './types.js';
