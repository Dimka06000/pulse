import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3100';

test('Pulse — parcours complet utilisateur non connecté', async ({ page }) => {
  // 1. Accueil
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page).toHaveTitle(/Pulse/i);
  await page.screenshot({ path: 'e2e/screenshots/01-home-desktop.png', fullPage: true });

  // 2. Login
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.screenshot({ path: 'e2e/screenshots/02-login.png', fullPage: true });

  // 3. Signup
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.screenshot({ path: 'e2e/screenshots/03-signup.png', fullPage: true });

  // 4. Onboarding (public)
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.screenshot({ path: 'e2e/screenshots/04-onboarding.png', fullPage: true });

  // 5. Explore (page publique)
  await page.goto(`${BASE}/explore`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  expect(page.url()).toContain('/explore');
  await page.screenshot({ path: 'e2e/screenshots/05-explore.png', fullPage: true });

  // 6. Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.screenshot({ path: 'e2e/screenshots/06-mobile-home.png', fullPage: true });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.screenshot({ path: 'e2e/screenshots/07-mobile-login.png', fullPage: true });
});

test('API health check', async ({ request }) => {
  const res = await request.get(`${BASE}/api/auth/session`);
  expect(res.status()).toBeLessThan(500);
});
