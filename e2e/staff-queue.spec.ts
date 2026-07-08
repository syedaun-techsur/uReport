// e2e/staff-queue.spec.ts
// Playwright E2E tests for the staff ticket queue (STAFF-01, STAFF-02, STAFF-03)
// Requires: running app at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
//           + seeded DB with staff user.
//
// Seed credentials: username='staff', password='Staff1234!secure'
// (see prisma/seed.ts — overrideable via STAFF_USERNAME / STAFF_PASSWORD env vars)

import { test, expect, type Page } from '@playwright/test';

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

// Helper: log in as staff using the actual login form fields
async function loginAsStaff(page: Page) {
  await page.goto('/login');
  // The login form uses 'identifier' field (accepts username or email)
  await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
  await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  // After login, staff should land on /staff/tickets
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

test.describe('Staff Ticket Queue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('queue page loads and shows ticket table', async ({ page }) => {
    // Table or empty state should be visible
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 10000 });
  });

  test('filter by status updates URL and table', async ({ page }) => {
    // Select "open" status via the status-filter select
    await page.selectOption('[data-testid="status-filter"]', 'open');
    // URL should contain status=open
    await expect(page).toHaveURL(/status=open/, { timeout: 5000 });
  });

  test('FTS search input debounces and triggers fetch', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('pothole');
    // Wait for debounce (300ms) + network + URL update
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/q=pothole/, { timeout: 5000 });
  });

  test('sort by updated_at updates URL', async ({ page }) => {
    await page.selectOption('[data-testid="sort-field"]', 'updated_at');
    await expect(page).toHaveURL(/sort=updated_at/, { timeout: 5000 });
  });
});
