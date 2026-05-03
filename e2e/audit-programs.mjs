import { chromium, devices } from 'playwright';

const BASE = 'https://pulse-eight-sigma.vercel.app';
const DIR = './e2e/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Desktop ───────────────────────────────────────────────────────────────
  console.log('--- Desktop viewport ---');
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await desktopCtx.newPage();

  // Go to programs list
  console.log('Navigating to /coach/programs ...');
  const dRes = await dPage.goto(`${BASE}/coach/programs`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Status: ${dRes?.status()}`);

  // Wait a bit for client hydration
  await dPage.waitForTimeout(2000);

  // Check page content
  const pageText = await dPage.textContent('body');
  const hasError = pageText?.includes('Error') || pageText?.includes('erreur') || pageText?.includes('404');
  const hasPrograms = pageText?.includes('programme');
  const hasCreateBtn = pageText?.includes('Créer un programme');
  console.log(`Has error: ${hasError}`);
  console.log(`Has programs text: ${hasPrograms}`);
  console.log(`Has 'Créer un programme' button: ${hasCreateBtn}`);

  await dPage.screenshot({ path: `${DIR}/audit-programs-list.png`, fullPage: true });
  console.log('Saved: audit-programs-list.png');

  // Try to check if create button exists and click it
  const createBtn = await dPage.$('button:has-text("Créer un programme"), a:has-text("Créer un programme")');
  if (createBtn) {
    console.log('Create button found, clicking...');
    await createBtn.click();
    await dPage.waitForTimeout(1000);
    await dPage.screenshot({ path: `${DIR}/audit-programs-wizard-step0.png`, fullPage: true });
    console.log('Saved: audit-programs-wizard-step0.png');

    // Try clicking "Suivant" to see step 1
    const nextBtn = await dPage.$('button:has-text("Suivant")');
    if (nextBtn) {
      // First select a sport and fill title to enable next
      const sportBtn = await dPage.$('button:has-text("Musculation"), button:has-text("Course"), button:has-text("Fitness")');
      if (sportBtn) {
        await sportBtn.click();
        await dPage.waitForTimeout(300);
      }
      // Type a title
      const titleInput = await dPage.$('input[placeholder*="Titre"], input[placeholder*="programme"]');
      if (titleInput) {
        await titleInput.fill('Test Programme');
        await dPage.waitForTimeout(300);
      }
      await nextBtn.click();
      await dPage.waitForTimeout(500);
      await dPage.screenshot({ path: `${DIR}/audit-programs-wizard-step1.png`, fullPage: true });
      console.log('Saved: audit-programs-wizard-step1.png');

      // Try step 2 (preview)
      const nextBtn2 = await dPage.$('button:has-text("Suivant")');
      if (nextBtn2) {
        await nextBtn2.click();
        await dPage.waitForTimeout(500);
        await dPage.screenshot({ path: `${DIR}/audit-programs-wizard-step2.png`, fullPage: true });
        console.log('Saved: audit-programs-wizard-step2.png');
      }
    }

    // Close modal
    const closeBtn = await dPage.$('button:has-text("Annuler"), button:has-text("✕")');
    if (closeBtn) await closeBtn.click();
    await dPage.waitForTimeout(500);
  } else {
    console.log('Create button NOT found');
  }

  await desktopCtx.close();

  // ── Mobile (iPhone 14) ────────────────────────────────────────────────────
  console.log('\n--- Mobile viewport (390x844) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 14'].userAgent,
    isMobile: true,
    hasTouch: true,
  });
  const mPage = await mobileCtx.newPage();

  const mRes = await mPage.goto(`${BASE}/coach/programs`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Mobile status: ${mRes?.status()}`);
  await mPage.waitForTimeout(2000);

  await mPage.screenshot({ path: `${DIR}/audit-programs-list-mobile.png`, fullPage: true });
  console.log('Saved: audit-programs-list-mobile.png');

  // Check create button on mobile
  const mCreateBtn = await mPage.$('button:has-text("Créer un programme"), a:has-text("Créer un programme")');
  if (mCreateBtn) {
    console.log('Mobile: Create button found, clicking...');
    await mCreateBtn.click();
    await mPage.waitForTimeout(1000);
    await mPage.screenshot({ path: `${DIR}/audit-programs-wizard-mobile.png`, fullPage: true });
    console.log('Saved: audit-programs-wizard-mobile.png');
  } else {
    console.log('Mobile: Create button NOT found');
  }

  await mobileCtx.close();
  await browser.close();
  console.log('\nDone!');
})();
