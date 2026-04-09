// packages/coaching/src/credits.ts
// Credits = internal currency. 1 credit = 1 session with a specific coach.
// Bridge to OIK token later.
// Extracted from Elaubody credits.ts, adapted for per-coach scoping.

export type Credit = {
  id: string;
  user_id: string;
  coach_id: string;
  total_sessions: number;
  used_sessions: number;
  expires_at: string | null;
  session_template_id?: string | null;
};

export type PlanInfo = {
  type: 'single' | 'pack' | 'subscription';
  sessions_count: number | null;
  sessions_per_week: number | null;
  validity_days: number | null;
};

export type CreditCalculation = {
  totalSessions: number;
  expiresAt: Date | null;
};

/**
 * Find the first available credit for a given coach.
 * Optionally filter by session_template_id.
 * Credits without session_template_id are "universal" for that coach.
 *
 * From Elaubody: findAvailableCredit() — added coachId filtering.
 */
export function findAvailableCredit(
  credits: Credit[],
  coachId: string,
  sessionTemplateId?: string
): Credit | null {
  const now = new Date();

  for (const credit of credits) {
    // Must be for the right coach
    if (credit.coach_id !== coachId) continue;
    // Must not be fully used
    if (credit.used_sessions >= credit.total_sessions) continue;
    // Must not be expired
    if (credit.expires_at && new Date(credit.expires_at) < now) continue;
    // If filtering by template, match template or accept universal (null)
    if (sessionTemplateId) {
      if (credit.session_template_id && credit.session_template_id !== sessionTemplateId) {
        continue;
      }
    }

    return credit;
  }

  return null;
}

/**
 * Calculate how many sessions a plan grants and when they expire.
 *
 * From Elaubody: calculateCreditsForPlan() — unchanged logic.
 */
export function calculateCreditsForPlan(plan: PlanInfo): CreditCalculation {
  switch (plan.type) {
    case 'single':
      return {
        totalSessions: plan.sessions_count ?? 1,
        expiresAt: null,
      };

    case 'pack': {
      let expiresAt: Date | null = null;
      if (plan.validity_days) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.validity_days);
      }
      return {
        totalSessions: plan.sessions_count ?? 1,
        expiresAt,
      };
    }

    case 'subscription':
      return {
        totalSessions: (plan.sessions_per_week ?? 1) * 4,
        expiresAt: null, // Expires at period end (set by webhook)
      };

    default:
      return { totalSessions: 1, expiresAt: null };
  }
}

/** Format cents to French EUR string: "50,00 €" */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
