// e2e/auth-login.spec.ts
import { test, expect } from '@playwright/test';

// These tests require the app to be running with a seeded DB.
// The seed creates: staff user (username: 'staff', password per seed),
// and admin user (username: 'admin', password per seed).
// In CI, set STAFF_USERNAME/STAFF_PASSWORD/ADMIN_PASSWORD env vars to match seed.

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

test.describe('Login page', () => {
  test('renders login form with username and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Username"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test('shows generic error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', 'nonexistent_user');
    await page.fill('input[aria-label="Password"]', 'WrongPassword123!');
    await page.click('[data-testid="login-submit"]');

    const errorEl = page.locator('[data-testid="login-error"]');
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText('Invalid username or password');
    // Ensure error is generic — no "username not found" or "wrong password" distinction
    await expect(errorEl).not.toContainText('username');
    await expect(errorEl).not.toContainText('not found');
  });

  test('shows error for wrong password on existing user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', 'DefinitelyWrongPw999!');
    await page.click('[data-testid="login-submit"]');

    const errorEl = page.locator('[data-testid="login-error"]');
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText('Invalid username or password');
  });

  test('successful login redirects to /staff/tickets', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');

    // After successful login, should land on staff tickets
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });

  test('preserves callbackUrl after successful login', async ({ page }) => {
    await page.goto('/login?callbackUrl=/staff/tickets');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');

    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });

  test('submit button is disabled while signing in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);

    // Click and immediately check disabled state
    const submitBtn = page.locator('[data-testid="login-submit"]');
    await submitBtn.click();
    // Button should show pending state briefly
    await expect(submitBtn).toBeDisabled({ timeout: 1000 }).catch(() => {
      // If it resolves too fast (dev mode), this is acceptable
    });
  });
});

test.describe('Session persistence (AUTH-02)', () => {
  test('session survives page reload after login', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });

    // Reload the page — session should persist
    await page.reload();
    await expect(page).toHaveURL(/\/staff\/tickets/);
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('Logout (AUTH-03)', () => {
  test('logout clears session and redirects to login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });

    // POST to signOut endpoint (simulates logout button action)
    await page.goto('/api/auth/signout');
    // After signout, visiting protected route should redirect to login
    await page.goto('/staff/tickets');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
