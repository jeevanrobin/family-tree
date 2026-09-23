const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Check initial theme
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Initial theme:', initialTheme);

  // Set theme to light
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('medida_theme', 'light');
  });
  await page.waitForTimeout(500);

  // Check visibility of sections
  const sections = ['hero', 'product-preview', 'features', 'how-it-works', 'privacy', 'fl-main'];
  for (const s of sections) {
    const el = page.locator('#' + s);
    const count = await el.count();
    const visible = count > 0 ? await el.isVisible() : false;
    const box = count > 0 ? await el.boundingBox() : null;
    console.log('Section #' + s + ':', { count, visible, box });
  }

  const header = page.locator('.fl-header');
  console.log('Header:', { count: await header.count(), visible: await header.isVisible(), box: await header.boundingBox() });

  const footer = page.locator('.fl-footer');
  console.log('Footer:', { count: await footer.count(), visible: await footer.isVisible(), box: await footer.boundingBox() });

  const topBtn = page.locator('.fl-top-btn');
  console.log('TopBtn at scrollTop=0:', { count: await topBtn.count(), visible: await topBtn.isVisible(), box: await topBtn.boundingBox() });

  const scrollProgress = page.locator('[data-slot="scroll-progress-root"]');
  console.log('ScrollProgress:', { count: await scrollProgress.count(), visible: await scrollProgress.isVisible(), box: await scrollProgress.boundingBox() });

  // Now scroll down
  await page.evaluate(() => {
    const landing = document.querySelector('.ft-landing');
    landing.scrollTop = 500;
    landing.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(300);

  console.log('TopBtn at scrollTop=500:', { visible: await topBtn.isVisible(), box: await topBtn.boundingBox() });
  console.log('ScrollProgress at scrollTop=500:', { visible: await scrollProgress.isVisible(), box: await scrollProgress.boundingBox() });

  const ssPath = path.resolve('test_light_desktop.png');
  await page.screenshot({ path: ssPath });
  console.log('Screenshot saved:', ssPath);

  await browser.close();
})();
