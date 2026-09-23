const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // Explicitly test in Light Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('medida_theme', 'light');
  });
  await page.waitForTimeout(600);

  const elementsToCheck = [
    { name: '.ft-landing', sel: '.ft-landing' },
    { name: '.ft-landing__inner', sel: '.ft-landing__inner' },
    { name: '.fl-header', sel: '.fl-header' },
    { name: '#fl-main', sel: '#fl-main' },
    { name: '#hero', sel: '#hero' },
    { name: '#product-preview', sel: '#product-preview' },
    { name: '#features', sel: '#features' },
    { name: '#how-it-works', sel: '#how-it-works' },
    { name: '#privacy', sel: '#privacy' },
    { name: '.fl-cta', sel: '.fl-cta' },
    { name: '.fl-footer', sel: '.fl-footer' },
    { name: '.fl-top-btn', sel: '.fl-top-btn' },
    { name: 'scroll-progress', sel: '[data-slot="scroll-progress-root"]' },
  ];

  const results = await page.evaluate((elements) => {
    return elements.map(({ name, sel }) => {
      const el = document.querySelector(sel);
      if (!el) {
        return { name, status: 'MISSING_FROM_DOM' };
      }
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        name,
        status: 'EXISTS',
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
        position: cs.position,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        hasZeroHeight: rect.height === 0,
        isInvisible: cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0,
        textLength: el.textContent ? el.textContent.trim().length : 0,
        childCount: el.children.length,
      };
    });
  }, elementsToCheck);

  console.log('DOM & Computed Style Verification Results (Light Mode):');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
