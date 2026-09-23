import { test, expect, canRunBrowserTests, authenticateViaUI, getTestCredentials } from './authenticated.fixture.js';

const describeBrowser = canRunBrowserTests ? test : test.skip;

test.describe('M5A Browser Smoke Tests', () => {
  test('1. Landing page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/ANVAYA|Family Tree/i);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('2. Login page loads', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/ANVAYA|Family Tree/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test.describe('Authenticated Browser Tests (requires credentials)', () => {
    test('3-7. Authenticated smoke tests', async ({ page }) => {
      if (!canRunBrowserTests) {
        test.skip();
        return;
      }

      const { familyId } = getTestCredentials();

      await authenticateViaUI(page);

      await expect(page).toHaveURL(/\/app/);

      await page.goto(`/app/family/${familyId}`);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(new RegExp(`/app/family/${familyId}`));

      const treeContainer = page.locator('[data-testid="tree-container"], .ft-app, .canvas-container').first();
      await expect(treeContainer).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(2000);

      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test('Environment check', async () => {
    if (!canRunBrowserTests) {
      console.log('\n[INFO] Authenticated browser tests SKIPPED');
      console.log('  Required environment variables:');
      console.log('    TEST_USER_EMAIL - test user email');
      console.log('    TEST_USER_PASSWORD - test user password');
      console.log('    TEST_FAMILY_ID - UUID of test family');
      console.log('  To run authenticated browser tests, configure these variables and re-run.');
    }
    expect(true).toBe(true);
  });
});

test.describe('Route accessibility', () => {
  test('Route: / returns 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
  });

  test('Route: /signin returns 200', async ({ page }) => {
    const response = await page.goto('/signin');
    expect(response.status()).toBe(200);
  });

  test('Route: /signup returns 200', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response.status()).toBe(200);
  });
});
