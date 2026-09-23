import { test as base, expect } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const TEST_FAMILY_ID = process.env.TEST_FAMILY_ID || '';

export const canRunBrowserTests = Boolean(
  TEST_USER_EMAIL && TEST_USER_PASSWORD && TEST_FAMILY_ID
);

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error);
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);

    if (errors.length > 0) {
      throw new Error(`Page errors occurred: ${errors.map((e) => e.message).join('; ')}`);
    }
  },
});

export { expect };

export function getTestCredentials() {
  return {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    familyId: TEST_FAMILY_ID,
  };
}

export async function authenticateViaUI(page) {
  if (!canRunBrowserTests) {
    throw new Error('Browser tests require TEST_USER_EMAIL, TEST_USER_PASSWORD, and TEST_FAMILY_ID');
  }

  const { email, password } = getTestCredentials();

  await page.goto('/signin');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  await page.click('button[type="submit"]');

  await page.waitForURL(/\/app/, { timeout: 10000 });
}
