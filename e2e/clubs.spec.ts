import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3100';
const SS = 'e2e/screenshots/clubs';

async function snap(page: any, path: string, name: string) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SS}/${name}.png`, fullPage: true });
  } catch {
    await page.screenshot({ path: `${SS}/${name}-error.png`, fullPage: true }).catch(() => {});
  }
}

test('Clubs — pages publiques', async ({ page }) => {
  await snap(page, '/clubs', '01-clubs-discovery');
  await snap(page, '/clubs/create', '02-clubs-create');
});

test('Clubs — pages club (sans auth)', async ({ page }) => {
  // These will show auth wall or empty state
  await snap(page, '/clubs/test-club', '03-club-storefront');
  await snap(page, '/clubs/test-club/feed', '04-club-feed');
  await snap(page, '/clubs/test-club/events', '05-club-events');
  await snap(page, '/clubs/test-club/members', '06-club-members');
  await snap(page, '/clubs/test-club/announcements', '07-club-announcements');
  await snap(page, '/clubs/test-club/sessions', '08-club-sessions');
  await snap(page, '/clubs/test-club/join', '09-club-join');
});

test('Clubs — admin pages (sans auth)', async ({ page }) => {
  await snap(page, '/clubs/test-club/manage', '10-club-manage');
  await snap(page, '/clubs/test-club/manage/members', '11-club-manage-members');
  await snap(page, '/clubs/test-club/manage/events', '12-club-manage-events');
  await snap(page, '/clubs/test-club/manage/plans', '13-club-manage-plans');
  await snap(page, '/clubs/test-club/manage/settings', '14-club-manage-settings');
  await snap(page, '/clubs/test-club/manage/stripe', '15-club-manage-stripe');
});

test('Clubs — explore tab', async ({ page }) => {
  await page.goto(`${BASE}/explore`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForTimeout(1000);
  // Click the Clubs tab
  const clubsTab = page.getByRole('button', { name: /clubs/i });
  if (await clubsTab.isVisible()) {
    await clubsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}/16-explore-clubs-tab.png`, fullPage: true });
  }
});
