// e2e/staff-bookmarks.spec.ts
// Playwright E2E tests for staff bookmark CRUD (STAFF-04, STAFF-05)
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

test.describe('Staff Bookmark CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('save a bookmark and see it in the dropdown', async ({ page }) => {
    // Navigate to the queue with a filter applied
    await page.goto('/staff/tickets?status=open');
    await page.waitForURL('**/staff/tickets**', { timeout: 10000 });

    // Click the save bookmark button
    await page.click('[data-testid="save-bookmark-btn"], button:has-text("Save view")');

    // Wait for the dialog to appear and fill the name
    await page.fill('[data-testid="bookmark-name-input"], input[id="bookmark-name-input"]', 'Test View');

    // Confirm save
    await page.click('[data-testid="confirm-save-btn"], button:has-text("Save"):not([data-testid="save-bookmark-btn"])');

    // After save, the bookmark name should appear in the dropdown
    await expect(page.locator('[data-testid="bookmark-select"] option, select[name="bookmark"] option').filter({ hasText: 'Test View' })).toBeVisible({ timeout: 5000 });
  });

  test('load a bookmark restores filter state', async ({ page }) => {
    // Create bookmark via API directly for determinism
    const resp = await page.request.post('/api/staff/bookmarks', {
      data: { name: 'Load Test View', filter_json: { status: 'in_progress' } },
    });
    expect(resp.status()).toBe(201);

    await page.goto('/staff/tickets');
    await page.waitForURL('**/staff/tickets**', { timeout: 10000 });

    // Select the bookmark from the dropdown
    const dropdown = page.locator('[data-testid="bookmark-select"], select[name="bookmark"]');
    await dropdown.selectOption({ label: 'Load Test View' });

    // URL should now contain status=in_progress
    await expect(page).toHaveURL(/status=in_progress/, { timeout: 5000 });
  });

  test('delete a bookmark removes it from the list', async ({ page }) => {
    // Create bookmark via API
    const resp = await page.request.post('/api/staff/bookmarks', {
      data: { name: 'Delete Me View', filter_json: {} },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json() as { id: string };
    const { id } = body;

    // Delete via API and verify it's gone
    const delResp = await page.request.delete(`/api/staff/bookmarks/${id}`);
    expect(delResp.status()).toBe(204);

    // Refresh and confirm not in list
    await page.reload();
    await page.waitForURL('**/staff/tickets**', { timeout: 10000 });
    await expect(page.locator('[data-testid="bookmark-select"] option, select[name="bookmark"] option').filter({ hasText: 'Delete Me View' })).not.toBeVisible();
  });
});
