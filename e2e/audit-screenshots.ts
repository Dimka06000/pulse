import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();

  // Desktop screenshots
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dp = await desktopCtx.newPage();

  await dp.goto('https://pulse-eight-sigma.vercel.app/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.screenshot({ path: 'e2e/screenshots/audit-athlete-dashboard-desktop.png', fullPage: false });
  console.log('1/5 dashboard desktop');

  await dp.goto('https://pulse-eight-sigma.vercel.app/explore', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.screenshot({ path: 'e2e/screenshots/audit-explore-desktop.png', fullPage: false });
  console.log('2/5 explore desktop');

  await dp.goto('https://pulse-eight-sigma.vercel.app/planning', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.screenshot({ path: 'e2e/screenshots/audit-planning-desktop.png', fullPage: false });
  console.log('3/5 planning desktop');

  await dp.goto('https://pulse-eight-sigma.vercel.app/explore/programs', { waitUntil: 'networkidle', timeout: 30000 });
  await dp.screenshot({ path: 'e2e/screenshots/audit-explore-programs.png', fullPage: false });
  console.log('4/5 explore programs');

  await desktopCtx.close();

  // Mobile screenshot
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await mobileCtx.newPage();
  await mp.goto('https://pulse-eight-sigma.vercel.app/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await mp.screenshot({ path: 'e2e/screenshots/audit-athlete-dashboard-mobile.png', fullPage: false });
  console.log('5/5 dashboard mobile');

  await mobileCtx.close();
  await browser.close();
  console.log('Done');
})();
