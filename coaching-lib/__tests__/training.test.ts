import { describe, it, expect, vi } from 'vitest';
import {
  getTrainingCourses,
  enrollInCourse,
  completeModule,
  getCoachPathway,
  updatePathway,
} from '../src/training';

// ─── Supabase mock factory ──────────────────────────────────────────

function mockSupabase(overrides: Record<string, any> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return { from: vi.fn(() => chain), _chain: chain } as any;
}

// ─── getTrainingCourses ─────────────────────────────────────────────

describe('getTrainingCourses', () => {
  it('should return courses with available status when no enrollment', async () => {
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // training_courses
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'c-1', title: 'Bases', description: 'Desc', category: 'platform_basics', duration_minutes: 30, modules: [], required_for_verification: true, badge_icon: '📚' }],
              error: null,
            }),
          };
        }
        // training_enrollments
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    } as any;
    const result = await getTrainingCourses(sb, 'coach-1');
    expect(result.data).toHaveLength(1);
    expect(result.data![0].status).toBe('available');
    expect(result.data![0].progress).toBe(0);
  });

  it('should merge enrollment data with course', async () => {
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'c-1', title: 'Bases', description: '', category: 'platform_basics', duration_minutes: 30, modules: [], required_for_verification: true, badge_icon: '📚' }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ course_id: 'c-1', status: 'in_progress', progress: 50, completed_modules: ['mod-1', 'mod-2'], started_at: '2026-04-01', completed_at: null }],
            error: null,
          }),
        };
      }),
    } as any;
    const result = await getTrainingCourses(sb, 'coach-1');
    expect(result.data![0].status).toBe('in_progress');
    expect(result.data![0].progress).toBe(50);
  });
});

// ─── enrollInCourse ─────────────────────────────────────────────────

describe('enrollInCourse', () => {
  it('should return error when course already completed', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: { id: 'e-1', status: 'completed' }, error: null }),
    });
    const result = await enrollInCourse(sb, 'coach-1', 'course-1');
    expect(result.error).toBe('Cours déjà terminé');
  });

  it('should resume existing enrollment', async () => {
    let singleCallCount = 0;
    const sb = mockSupabase({
      single: vi.fn().mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) return Promise.resolve({ data: { id: 'e-1', status: 'available' }, error: null });
        return Promise.resolve({ data: { id: 'e-1', status: 'in_progress' }, error: null });
      }),
    });
    const result = await enrollInCourse(sb, 'coach-1', 'course-1');
    expect(result.data?.status).toBe('in_progress');
  });

  it('should create new enrollment when none exists', async () => {
    let singleCallCount = 0;
    const sb = mockSupabase({
      single: vi.fn().mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        return Promise.resolve({ data: { id: 'e-new', status: 'in_progress', progress: 0 }, error: null });
      }),
    });
    const result = await enrollInCourse(sb, 'coach-1', 'course-1');
    expect(result.data?.status).toBe('in_progress');
    expect(result.data?.progress).toBe(0);
  });
});

// ─── completeModule ─────────────────────────────────────────────────

describe('completeModule', () => {
  it('should return error when enrollment not found', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });
    const result = await completeModule(sb, 'coach-1', 'course-1', 'mod-1');
    expect(result.error).toBe('Inscription introuvable');
  });

  it('should not duplicate already-completed modules', async () => {
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        const baseChain = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };
        if (fromCallCount === 1) {
          // training_enrollments - get enrollment
          baseChain.single = vi.fn().mockResolvedValue({
            data: { id: 'e-1', completed_modules: ['mod-1'] },
            error: null,
          });
        } else if (fromCallCount === 2) {
          // training_courses - get course
          baseChain.single = vi.fn().mockResolvedValue({
            data: { modules: [{}, {}, {}] }, // 3 modules
            error: null,
          });
        } else {
          // update enrollment
          baseChain.single = vi.fn().mockResolvedValue({
            data: { id: 'e-1', completed_modules: ['mod-1'], progress: 33, status: 'in_progress' },
            error: null,
          });
        }
        return baseChain;
      }),
    } as any;
    const result = await completeModule(sb, 'coach-1', 'course-1', 'mod-1');
    // mod-1 was already completed, should not be added again
    expect(result.data?.completed_modules).toContain('mod-1');
    expect(result.data?.completed_modules).toHaveLength(1);
  });

  it('should auto-complete course when all modules done', async () => {
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        const baseChain = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };
        if (fromCallCount === 1) {
          baseChain.single = vi.fn().mockResolvedValue({
            data: { id: 'e-1', completed_modules: ['mod-1'] },
            error: null,
          });
        } else if (fromCallCount === 2) {
          baseChain.single = vi.fn().mockResolvedValue({
            data: { modules: [{}, {}] }, // 2 modules total
            error: null,
          });
        } else if (fromCallCount === 3) {
          baseChain.single = vi.fn().mockResolvedValue({
            data: { id: 'e-1', completed_modules: ['mod-1', 'mod-2'], progress: 100, status: 'completed' },
            error: null,
          });
        } else {
          // pathway checks
          baseChain.single = vi.fn().mockResolvedValue({
            data: { required_for_verification: true },
            error: null,
          });
        }
        return baseChain;
      }),
    } as any;
    const result = await completeModule(sb, 'coach-1', 'course-1', 'mod-2');
    expect(result.data?.status).toBe('completed');
    expect(result.data?.progress).toBe(100);
  });
});

// ─── getCoachPathway ────────────────────────────────────────────────

describe('getCoachPathway', () => {
  it('should create pathway for new coach', async () => {
    let singleCallCount = 0;
    const sb = mockSupabase({
      single: vi.fn().mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        return Promise.resolve({
          data: {
            coach_id: 'c-1',
            profile_complete: false,
            basics_course_done: false,
            endorsements_count: 0,
            completed_sessions: 0,
            is_verified: false,
          },
          error: null,
        });
      }),
    });
    const result = await getCoachPathway(sb, 'c-1');
    expect(result.data?.steps).toHaveLength(5);
    expect(result.data?.isVerified).toBe(false);
    expect(result.data?.steps[0].current).toBe(true); // First step is current
  });

  it('should show correct step for partially completed pathway', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: {
          profile_complete: true,
          basics_course_done: true,
          endorsements_count: 1,
          completed_sessions: 3,
          is_verified: false,
        },
        error: null,
      }),
    });
    const result = await getCoachPathway(sb, 'c-1');
    expect(result.data?.steps[0].completed).toBe(true);
    expect(result.data?.steps[1].completed).toBe(true);
    expect(result.data?.steps[2].current).toBe(true); // endorsements step
    expect(result.data?.steps[2].completed).toBe(false);
  });

  it('should show verified for fully completed pathway', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: {
          profile_complete: true,
          basics_course_done: true,
          endorsements_count: 5,
          completed_sessions: 15,
          is_verified: true,
        },
        error: null,
      }),
    });
    const result = await getCoachPathway(sb, 'c-1');
    expect(result.data?.isVerified).toBe(true);
    expect(result.data?.steps.every((s: any) => s.completed)).toBe(true);
  });
});

// ─── updatePathway ──────────────────────────────────────────────────

describe('updatePathway', () => {
  it('should auto-verify when all conditions met', async () => {
    let updatePayload: any;
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: select current pathway
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                profile_complete: true,
                basics_course_done: true,
                endorsements_count: 3,
                completed_sessions: 9,
                is_verified: false,
              },
              error: null,
            }),
          };
        }
        // Second call: update pathway
        return {
          update: vi.fn().mockImplementation((payload: any) => {
            updatePayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }),
    } as any;

    await updatePathway(sb, 'c-1', { completed_sessions: 10 });
    expect(updatePayload.is_verified).toBe(true);
  });

  it('should NOT verify when not all conditions met', async () => {
    let updatePayload: any;
    let fromCallCount = 0;
    const sb = {
      from: vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                profile_complete: true,
                basics_course_done: false,
                endorsements_count: 0,
                completed_sessions: 0,
                is_verified: false,
              },
              error: null,
            }),
          };
        }
        return {
          update: vi.fn().mockImplementation((payload: any) => {
            updatePayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }),
    } as any;

    await updatePathway(sb, 'c-1', { endorsements_count: 1 });
    expect(updatePayload.is_verified).toBe(false);
  });
});
