// e2e/auth-middleware.spec.ts
import { test, expect } from '@playwright/test';

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!secure';

// Helper: log in as a given user
async function loginAs(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username"]', username);
  await page.fill('input[aria-label="Password"]', password);
  await page.click('[data-testid="login-submit"]');
  // Wait for redirect away from login page
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe('Middleware route guards (AUTH-04)', () => {
  test('unauthenticated user visiting /staff/tickets is redirected to /login with callbackUrl', async ({ page }) => {
    // Ensure no session cookie
    await page.context().clearCookies();
    await page.goto('/staff/tickets');
    await expect(page).toHaveURL(/\/login\?callbackUrl=.*staff.*tickets/, { timeout: 5000 });
  });

  test('unauthenticated user visiting /admin/users is redirected to /login with callbackUrl', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login\?callbackUrl=.*admin.*users/, { timeout: 5000 });
  });

  test('unauthenticated API call to /api/staff/tickets returns 401', async ({ request }) => {
    const res = await request.get('/api/staff/tickets');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('unauthenticated API call to /api/admin/users returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

test.describe('Role enforcement — staff cannot access admin routes (AUTH-04)', () => {
  test('staff user is redirected from /admin/users to /staff/tickets', async ({ page }) => {
    await loginAs(page, STAFF_USERNAME, STAFF_PASSWORD);
    await page.goto('/admin/users');
    // Staff-role users get redirected to /staff/tickets
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 5000 });
  });

  test('staff session returns 403 for /api/admin/** endpoint', async ({ page, request }) => {
    // Log in to get session cookies
    await loginAs(page, STAFF_USERNAME, STAFF_PASSWORD);
    // Use the same browser context (which now has session cookies)
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });
});

test.describe('Admin role can access both staff and admin routes (AUTH-04)', () => {
  test('admin user can navigate to /staff/tickets without redirect', async ({ page }) => {
    await loginAs(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto('/staff/tickets');
    // Admin should NOT be redirected to login or anywhere else
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('admin user can navigate to /admin/users without redirect', async ({ page }) => {
    await loginAs(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.goto('/admin/users');
    // Admin should stay on admin route (page may 404 for now — just ensure no auth redirect)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/\/staff\/tickets/);
  });
});

test.describe('Password change flow', () => {
  test('password change page renders form for authenticated staff', async ({ page }) => {
    await loginAs(page, STAFF_USERNAME, STAFF_PASSWORD);
    await page.goto('/staff/account/password');
    await expect(page.locator('[data-testid="password-change-form"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Current password"]')).toBeVisible();
    await expect(page.locator('input[aria-label="New password"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Confirm new password"]')).toBeVisible();
  });

  test('wrong current password shows field-level error', async ({ page }) => {
    await loginAs(page, STAFF_USERNAME, STAFF_PASSWORD);
    await page.goto('/staff/account/password');
    await page.fill('input[aria-label="Current password"]', 'WrongCurrentPassword999!');
    await page.fill('input[aria-label="New password"]', 'NewStaff1234!Updated');
    await page.fill('input[aria-label="Confirm new password"]', 'NewStaff1234!Updated');
    await page.click('[data-testid="password-submit"]');

    const errorEl = page.locator('[data-testid="error-current-password"]');
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText('Current password is incorrect');
  });

  test('mismatched passwords show confirm_password error (client-side Zod)', async ({ page }) => {
    await loginAs(page, STAFF_USERNAME, STAFF_PASSWORD);
    await page.goto('/staff/account/password');
    await page.fill('input[aria-label="Current password"]', STAFF_PASSWORD);
    await page.fill('input[aria-label="New password"]', 'NewStaff1234!Updated');
    await page.fill('input[aria-label="Confirm new password"]', 'MismatchedPassword999!');
    await page.click('[data-testid="password-submit"]');

    // Zod refine fires client-side before API call
    await expect(page.locator('[role="alert"]').filter({ hasText: 'Passwords do not match' })).toBeVisible({ timeout: 3000 });
  });
});
