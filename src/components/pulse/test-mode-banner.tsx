'use client';

/**
 * Shows a small banner when Stripe is in test mode.
 * Only renders if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with "pk_test_".
 */
export function TestModeBanner() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!key.startsWith('pk_test_')) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-400 text-amber-900 text-center text-[11px] font-bold py-1 pointer-events-none">
      MODE TEST — Les paiements utilisent Stripe test (carte 4242 4242 4242 4242)
    </div>
  );
}
