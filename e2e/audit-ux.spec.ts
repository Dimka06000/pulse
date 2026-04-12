import { test, expect, Page } from '@playwright/test';

const BASE = 'https://pulse-eight-sigma.vercel.app';
const SS = 'e2e/screenshots/audit';

const CREDS = {
  email: 'dimitri@coaching-app.fr',
  password: 'Oikos2026!',
};

/** Navigate, wait for render, screenshot. Captures error state if navigation fails. */
async function snap(page: Page, path: string, name: string, extra?: () => Promise<void>) {
  const issues: string[] = [];

  // Listen for console errors
  const errors: string[] = [];
  const onError = (msg: any) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', onError);

  try {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const status = resp?.status() ?? 0;
    if (status >= 400) issues.push(`HTTP ${status} on ${path}`);

    await page.waitForTimeout(4000);

    // Check for visible error messages
    const errorEl = page.locator('[role="alert"], .error, .text-red-500, .text-destructive');
    const errorCount = await errorEl.count();
    if (errorCount > 0) {
      for (let i = 0; i < Math.min(errorCount, 3); i++) {
        const text = await errorEl.nth(i).textContent().catch(() => '');
        if (text?.trim()) issues.push(`Visible error: "${text.trim().slice(0, 100)}"`);
      }
    }

    if (extra) await extra();

    await page.screenshot({ path: `${SS}/${name}.png`, fullPage: true });
  } catch (e: any) {
    issues.push(`Navigation error: ${e.message?.slice(0, 150)}`);
    await page.screenshot({ path: `${SS}/${name}-error.png`, fullPage: true }).catch(() => {});
  }

  page.off('console', onError);
  if (errors.length) issues.push(`Console errors: ${errors.slice(0, 3).join(' | ').slice(0, 200)}`);

  return issues;
}

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1000);

  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');

  // Wait for redirect (dashboard or wherever)
  await page.waitForTimeout(5000);
  const url = page.url();
  console.log(`[AUTH] After login, redirected to: ${url}`);
  return url;
}

test.describe('Audit UX/UI complet — Pulse', () => {
  const allIssues: Record<string, string[]> = {};

  function record(name: string, issues: string[]) {
    if (issues.length) allIssues[name] = issues;
  }

  test('Phase 1 — Login + Pages athlète', async ({ page }) => {
    // Login
    const redirectUrl = await login(page);
    await page.screenshot({ path: `${SS}/00-after-login.png`, fullPage: true });

    // Dashboard
    record('dashboard', await snap(page, '/dashboard', '01-dashboard'));
    record('planning', await snap(page, '/planning', '02-planning'));
    record('progress', await snap(page, '/progress', '03-progress'));
    record('goals', await snap(page, '/goals', '04-goals'));
    record('nutrition', await snap(page, '/nutrition', '05-nutrition'));
    record('journal', await snap(page, '/journal', '06-journal'));
    record('insights', await snap(page, '/insights', '07-insights'));
    record('community', await snap(page, '/community', '08-community'));
    record('profile', await snap(page, '/profile', '09-profile'));
    record('explore', await snap(page, '/explore', '10-explore'));

    // Print issues
    console.log('\n=== ISSUES FOUND (Athlete pages) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });

  test('Phase 2 — Pages coach', async ({ page }) => {
    await login(page);

    record('coach-dashboard', await snap(page, '/coach', '11-coach-dashboard'));
    record('coach-clients', await snap(page, '/coach/clients', '12-coach-clients'));
    record('coach-sessions', await snap(page, '/coach/sessions', '13-coach-sessions'));
    record('coach-revenue', await snap(page, '/coach/revenue', '14-coach-revenue'));
    record('coach-reviews', await snap(page, '/coach/reviews', '15-coach-reviews'));
    record('coach-events', await snap(page, '/coach/events', '16-coach-events'));
    record('coach-availability', await snap(page, '/coach/availability', '17-coach-availability'));

    console.log('\n=== ISSUES FOUND (Coach pages) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });

  test('Phase 3 — Clubs discovery + storefront', async ({ page }) => {
    await login(page);

    // Clubs discovery
    record('clubs', await snap(page, '/clubs', '20-clubs-discovery'));

    // Get first club slug from the page
    await page.goto(`${BASE}/clubs`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(2000);

    // Find club links
    const clubLinks = page.locator('a[href*="/clubs/"]');
    const clubCount = await clubLinks.count();
    console.log(`[CLUBS] Found ${clubCount} club links on /clubs`);

    let clubSlug = '';
    for (let i = 0; i < clubCount; i++) {
      const href = await clubLinks.nth(i).getAttribute('href');
      if (href && href.match(/^\/clubs\/[a-z0-9-]+$/)) {
        clubSlug = href.replace('/clubs/', '');
        break;
      }
    }

    if (!clubSlug) {
      console.log('[CLUBS] No club slug found, using fallback');
      clubSlug = 'test-club';
    }
    console.log(`[CLUBS] Using slug: ${clubSlug}`);

    // Club storefront & sub-pages
    record('club-storefront', await snap(page, `/clubs/${clubSlug}`, '21-club-storefront'));
    record('club-feed', await snap(page, `/clubs/${clubSlug}/feed`, '22-club-feed'));
    record('club-events', await snap(page, `/clubs/${clubSlug}/events`, '23-club-events'));
    record('club-members', await snap(page, `/clubs/${clubSlug}/members`, '24-club-members'));
    record('club-announcements', await snap(page, `/clubs/${clubSlug}/announcements`, '25-club-announcements'));
    record('club-join', await snap(page, `/clubs/${clubSlug}/join`, '26-club-join'));

    // Club manage (if founder)
    record('club-manage', await snap(page, `/clubs/${clubSlug}/manage`, '27-club-manage'));
    record('club-manage-events', await snap(page, `/clubs/${clubSlug}/manage/events`, '28-club-manage-events'));
    record('club-manage-plans', await snap(page, `/clubs/${clubSlug}/manage/plans`, '29-club-manage-plans'));
    record('club-manage-settings', await snap(page, `/clubs/${clubSlug}/manage/settings`, '30-club-manage-settings'));

    // Explore → Clubs tab
    record('explore-clubs-tab', await snap(page, '/explore', '31-explore-clubs-tab', async () => {
      const clubsTab = page.getByRole('button', { name: /clubs/i });
      if (await clubsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clubsTab.click();
        await page.waitForTimeout(1500);
      }
    }));

    // Clubs create
    record('clubs-create', await snap(page, '/clubs/create', '32-clubs-create'));

    console.log('\n=== ISSUES FOUND (Clubs) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });

  test('Phase 4 — Admin + pages publiques sans auth', async ({ page }) => {
    await login(page);

    // Admin
    record('admin', await snap(page, '/admin', '40-admin'));

    console.log('\n=== ISSUES FOUND (Admin) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });

  test('Phase 5 — Pages sans auth (redirect check)', async ({ page }) => {
    // NO login — test that protected pages redirect
    record('no-auth-dashboard', await snap(page, '/dashboard', '50-noauth-dashboard'));
    record('no-auth-planning', await snap(page, '/planning', '51-noauth-planning'));
    record('no-auth-coach', await snap(page, '/coach', '52-noauth-coach'));
    record('no-auth-clubs', await snap(page, '/clubs', '53-noauth-clubs'));
    record('no-auth-admin', await snap(page, '/admin', '54-noauth-admin'));

    // Check public pages still work
    record('public-home', await snap(page, '/', '55-public-home'));
    record('public-login', await snap(page, '/login', '56-public-login'));
    record('public-signup', await snap(page, '/signup', '57-public-signup'));
    record('public-explore', await snap(page, '/explore', '58-public-explore'));

    console.log('\n=== ISSUES FOUND (No Auth) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });

  test('Phase 6 — Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    record('mobile-dashboard', await snap(page, '/dashboard', '60-mobile-dashboard'));
    record('mobile-planning', await snap(page, '/planning', '61-mobile-planning'));
    record('mobile-clubs', await snap(page, '/clubs', '62-mobile-clubs'));
    record('mobile-explore', await snap(page, '/explore', '63-mobile-explore'));
    record('mobile-coach', await snap(page, '/coach', '64-mobile-coach'));
    record('mobile-profile', await snap(page, '/profile', '65-mobile-profile'));
    record('mobile-goals', await snap(page, '/goals', '66-mobile-goals'));
    record('mobile-progress', await snap(page, '/progress', '67-mobile-progress'));

    console.log('\n=== ISSUES FOUND (Mobile) ===');
    for (const [k, v] of Object.entries(allIssues)) {
      console.log(`[${k}] ${v.join('; ')}`);
    }
  });
});
