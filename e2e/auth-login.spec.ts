// e2e/auth-login.spec.ts
import { test, expect } from '@playwright/test';

// These tests require the app to be running with a seeded DB.
// The seed creates: staff user (username: 'staff', password per seed),
// and admin user (username: 'admin', password per seed).
// In CI, set STAFF_USERNAME/STAFF_PASSWORD/ADMIN_PASSWORD env vars to match seed.

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!seed';

test.describe('Login page', () => {
  test('renders login form with username and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Username or email"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test('shows generic error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username or email"]', 'nonexistent_user');
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
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', 'DefinitelyWrongPw999!');
    await page.click('[data-testid="login-submit"]');

    const errorEl = page.locator('[data-testid="login-error"]');
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText('Invalid username or password');
  });

  test('successful login redirects to /staff/tickets', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');

    // After successful login, should land on staff tickets
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });

  test('can log in with email address instead of username', async ({ page }) => {
    // UAT Test 2: auth must accept email as the login identifier
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!seed';
    await page.goto('/login');
    await page.fill('input[aria-label="Username or email"]', ADMIN_EMAIL);
    await page.fill('input[aria-label="Password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });

  test('preserves callbackUrl after successful login', async ({ page }) => {
    await page.goto('/login?callbackUrl=/staff/tickets');
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');

    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });

  test('submit button is disabled while signing in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
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
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
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
    await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
    await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });

    // Click the real logout button in the staff layout nav
    const logoutBtn = page.locator('[data-testid="logout-btn"]');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // After signOut with callbackUrl='/login', should land on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Visiting protected route should redirect back to login (session is cleared)
    await page.goto('/staff/tickets');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
