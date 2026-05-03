import { chromium } from 'playwright';

const URL = 'https://pulse-eight-sigma.vercel.app/coach/profile/edit';
const DIR = 'e2e/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Desktop screenshot
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: `${DIR}/audit-profile-desktop.png`, fullPage: true });
  console.log('Desktop screenshot saved.');

  // Check wizard steps visibility
  const stepBars = await desktopPage.$$('.mb-8.flex.gap-2 button');
  console.log(`Step bar buttons found: ${stepBars.length}`);

  // Check progress bar segments
  for (let i = 0; i < stepBars.length; i++) {
    const text = await stepBars[i].textContent();
    const isDisabled = await stepBars[i].getAttribute('disabled');
    console.log(`  Step ${i}: "${text?.trim()}" | disabled=${isDisabled !== null}`);
  }

  // Check if "Suivant" button exists
  const nextBtn = await desktopPage.$('button:has-text("Suivant")');
  console.log(`"Suivant" button found: ${!!nextBtn}`);
  const nextDisabled = nextBtn ? await nextBtn.isDisabled() : 'N/A';
  console.log(`"Suivant" button disabled: ${nextDisabled}`);

  // Check page heading
  const heading = await desktopPage.$('h1');
  const headingText = heading ? await heading.textContent() : 'NOT FOUND';
  console.log(`Heading: "${headingText}"`);

  // Check sub-heading (step indicator)
  const subHeading = await desktopPage.$('p.text-sm.text-muted');
  const subText = subHeading ? await subHeading.textContent() : 'NOT FOUND';
  console.log(`Step indicator: "${subText}"`);

  // Check form fields on step 0
  const inputs = await desktopPage.$$('input, textarea');
  console.log(`Input/textarea elements on step 0: ${inputs.length}`);

  // Check for visual glitches - overlapping elements
  const formContainer = await desktopPage.$('.mx-auto.max-w-2xl');
  if (formContainer) {
    const box = await formContainer.boundingBox();
    console.log(`Form container: ${JSON.stringify(box)}`);
  }

  // Mobile screenshot
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: `${DIR}/audit-profile-mobile.png`, fullPage: true });
  console.log('Mobile screenshot saved.');

  // Check mobile layout
  const mobileForm = await mobilePage.$('.mx-auto.max-w-2xl');
  if (mobileForm) {
    const mBox = await mobileForm.boundingBox();
    console.log(`Mobile form container: ${JSON.stringify(mBox)}`);
  }

  // Check if step labels are hidden on mobile (they use hidden sm:inline)
  const stepLabels = await mobilePage.$$('.mb-8.flex.gap-2 button span');
  let visibleLabels = 0;
  for (const label of stepLabels) {
    const visible = await label.isVisible();
    if (visible) visibleLabels++;
  }
  console.log(`Mobile: visible step labels = ${visibleLabels} (expected 0 since hidden sm:inline)`);

  // Check for horizontal overflow on mobile
  const bodyWidth = await mobilePage.evaluate(() => document.body.scrollWidth);
  console.log(`Mobile body scroll width: ${bodyWidth} (viewport: 390) — overflow: ${bodyWidth > 390}`);

  await browser.close();
  console.log('\nAudit complete.');
})();
