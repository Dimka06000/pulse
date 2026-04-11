import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Internal types ─────────────────────────────────────────────────

interface PathwayRow {
  coach_id: string;
  profile_complete: boolean;
  basics_course_done: boolean;
  endorsements_count: number;
  completed_sessions: number;
  is_verified: boolean;
  updated_at: string;
}

// ─── Courses ────────────────────────────────────────────────────────

/**
 * Get all available training courses with enrollment status for a coach.
 */
export async function getTrainingCourses(
  supabase: SupabaseClient,
  coachId: string
) {
  // Get all courses
  const { data: courses, error } = await supabase
    .from('training_courses')
    .select('*')
    .order('required_for_verification', { ascending: false });

  if (error) return { error: error.message, data: [] };

  // Get coach enrollments
  const { data: enrollments } = await supabase
    .from('training_enrollments')
    .select('course_id, status, progress, completed_modules, started_at, completed_at')
    .eq('coach_id', coachId);

  const enrollMap = new Map(
    (enrollments || []).map((e) => [e.course_id, e])
  );

  // Merge
  const result = (courses || []).map((c) => {
    const enrollment = enrollMap.get(c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      durationMinutes: c.duration_minutes,
      modules: typeof c.modules === 'string' ? JSON.parse(c.modules) : (c.modules || []),
      requiredForVerification: c.required_for_verification,
      badgeIcon: c.badge_icon,
      status: enrollment?.status || ('available' as const),
      progress: enrollment?.progress || 0,
      completedModules: enrollment?.completed_modules || [],
      startedAt: enrollment?.started_at,
      completedAt: enrollment?.completed_at,
    };
  });

  return { data: result };
}

/**
 * Enroll in a course (or resume). Creates enrollment row if not exists.
 */
export async function enrollInCourse(
  supabase: SupabaseClient,
  coachId: string,
  courseId: string
) {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('training_enrollments')
    .select('id, status')
    .eq('coach_id', coachId)
    .eq('course_id', courseId)
    .single();

  if (existing) {
    if (existing.status === 'completed') {
      return { error: 'Cours déjà terminé' };
    }
    // Resume: update status to in_progress
    const { data, error } = await supabase
      .from('training_enrollments')
      .update({ status: 'in_progress' })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  // New enrollment
  const { data, error } = await supabase
    .from('training_enrollments')
    .insert({
      course_id: courseId,
      coach_id: coachId,
      status: 'in_progress',
      progress: 0,
      completed_modules: [],
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

/**
 * Complete a module within a course.
 * Updates progress percentage. If all modules done -> status = completed.
 */
export async function completeModule(
  supabase: SupabaseClient,
  coachId: string,
  courseId: string,
  moduleId: string
) {
  // Get enrollment
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .select('id, completed_modules')
    .eq('coach_id', coachId)
    .eq('course_id', courseId)
    .single();

  if (enrollErr || !enrollment) return { error: 'Inscription introuvable' };

  // Get course to know total modules
  const { data: course } = await supabase
    .from('training_courses')
    .select('modules')
    .eq('id', courseId)
    .single();

  if (!course) return { error: 'Cours introuvable' };

  const totalModules = (course.modules as unknown[]).length;
  const completedModules = [...(enrollment.completed_modules as string[])];

  if (!completedModules.includes(moduleId)) {
    completedModules.push(moduleId);
  }

  const progress = Math.round((completedModules.length / totalModules) * 100);
  const isComplete = completedModules.length >= totalModules;

  const { data, error } = await supabase
    .from('training_enrollments')
    .update({
      completed_modules: completedModules,
      progress,
      status: isComplete ? 'completed' : 'in_progress',
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('id', enrollment.id)
    .select()
    .single();

  if (error) return { error: error.message };

  // If this was the required course, update pathway
  if (isComplete) {
    const { data: courseData } = await supabase
      .from('training_courses')
      .select('required_for_verification')
      .eq('id', courseId)
      .single();

    if (courseData?.required_for_verification) {
      await updatePathway(supabase, coachId, { basics_course_done: true });
    }
  }

  return { data };
}

// ─── Coach Pathway ──────────────────────────────────────────────────

/**
 * The coach pathway to verified status:
 * 1. Créer votre profil (profile_complete)
 * 2. Cours "Les bases de la plateforme" (basics_course_done)
 * 3. 3 endorsements de pairs (endorsements_count >= 3)
 * 4. 10 séances réalisées (completed_sessions >= 10)
 * 5. Coach vérifié (is_verified — auto when 1-4 done)
 */
export async function getCoachPathway(
  supabase: SupabaseClient,
  coachId: string
) {
  // Get or create pathway record
  const { data: rawPathway } = await supabase
    .from('coach_pathway_progress')
    .select('*')
    .eq('coach_id', coachId)
    .single();

  let pathway = rawPathway as unknown as PathwayRow | null;

  if (!pathway) {
    const { data: created } = await supabase
      .from('coach_pathway_progress')
      .insert({ coach_id: coachId })
      .select()
      .single();
    pathway = created as unknown as PathwayRow | null;
  }

  if (!pathway) return { error: 'Impossible de créer le parcours' };

  // Build steps
  const steps = [
    {
      key: 'profile',
      label: 'Créer votre profil',
      description: 'Remplissez votre bio, spécialités et tarifs',
      completed: pathway.profile_complete,
      current: !pathway.profile_complete,
    },
    {
      key: 'basics',
      label: 'Cours « Les bases »',
      description: 'Apprenez à utiliser la plateforme',
      completed: pathway.basics_course_done,
      current: pathway.profile_complete && !pathway.basics_course_done,
    },
    {
      key: 'endorsements',
      label: `3 validations de pairs (${pathway.endorsements_count}/3)`,
      description: 'Faites-vous recommander par d\'autres coachs',
      completed: pathway.endorsements_count >= 3,
      current: pathway.basics_course_done && pathway.endorsements_count < 3,
    },
    {
      key: 'sessions',
      label: `10 séances réalisées (${pathway.completed_sessions}/10)`,
      description: 'Accompagnez vos premiers clients',
      completed: pathway.completed_sessions >= 10,
      current: pathway.endorsements_count >= 3 && pathway.completed_sessions < 10,
    },
    {
      key: 'verified',
      label: 'Coach vérifié',
      description: 'Badge vérifié sur votre profil — confiance maximale',
      completed: pathway.is_verified,
      current: pathway.completed_sessions >= 10 && !pathway.is_verified,
    },
  ];

  const currentStep = steps.findIndex((s) => s.current);

  return {
    data: {
      steps,
      currentStep: currentStep === -1 ? (pathway.is_verified ? 5 : 0) : currentStep,
      isVerified: pathway.is_verified,
    },
  };
}

/**
 * Update pathway progress. Called by other engines when milestones are reached.
 * Auto-verifies coach when all 4 conditions met.
 */
export async function updatePathway(
  supabase: SupabaseClient,
  coachId: string,
  updates: Partial<{
    profile_complete: boolean;
    basics_course_done: boolean;
    endorsements_count: number;
    completed_sessions: number;
  }>
) {
  // Get current state
  const { data: rawCurrent } = await supabase
    .from('coach_pathway_progress')
    .select('*')
    .eq('coach_id', coachId)
    .single();

  const current = rawCurrent as unknown as PathwayRow | null;
  const merged = { ...current, ...updates } as PathwayRow;

  // Check if all conditions met -> auto-verify
  const shouldVerify =
    merged.profile_complete &&
    merged.basics_course_done &&
    merged.endorsements_count >= 3 &&
    merged.completed_sessions >= 10;

  const updatePayload: Record<string, unknown> = {
    ...updates,
    is_verified: shouldVerify,
  };

  const { error } = await supabase
    .from('coach_pathway_progress')
    .update(updatePayload)
    .eq('coach_id', coachId);

  // Also update coach_profiles.is_verified
  if (shouldVerify && !current?.is_verified) {
    await supabase
      .from('coach_profiles')
      .update({ is_verified: true } as Record<string, unknown>)
      .eq('id', coachId);
  }

  return { error: error?.message };
}
