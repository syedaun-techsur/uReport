// e2e/auth-gap-placeholder.spec.ts
// Gap closure tests for /staff/tickets placeholder page (Plan 02-04)
// Requires: running app with seeded users (Plan 02-03 seed fix)
import { test, expect } from '@playwright/test';

const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

test.describe('Gap closure: /staff/tickets placeholder', () => {
  test('unauthenticated request to /staff/tickets redirects to /login with callbackUrl', async ({ page }) => {
    // Ensure no session cookie from a prior test
    await page.context().clearCookies();
    await page.goto('/staff/tickets');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/callbackUrl/);
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('successful login redirects to /staff/tickets and page renders', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('staff');
    await page.getByLabel('Password').fill(STAFF_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Staff console/i })).toBeVisible();
  });
});
