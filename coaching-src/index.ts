export { COACHING_MANIFEST } from './module';

export {
  searchCoaches,
  getCoachProfile,
  createCoachProfile,
  updateCoachProfile,
  getAllSpecialties,
  getMyCoachProfile,
  getCoachSessionTemplates,
} from './engine';

export * from './hierarchy';
export * from './collaboration';
export * from './endorsement';
export * from './ratings';
export * from './tracking';
export * from './nutrition';
export * from './training';
export * from './events';
export * from './scheduling';
export * from './credits';
export * from './commission';
export * from './cancellation';

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
} from './types';
