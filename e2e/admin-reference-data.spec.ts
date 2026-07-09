// e2e/admin-reference-data.spec.ts
// Playwright E2E tests for admin reference-data management (Phase 06-01).
// Requires: running app at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
//           + seeded DB with admin and staff users.
//
// Admin credentials: username='admin', password='Admin1234!secure'
// Staff credentials: username='staff', password='Staff1234!secure'
// (see prisma/seed.ts)

import { test, expect, type Page } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!secure';
const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username or email"]', ADMIN_USERNAME);
  await page.fill('input[aria-label="Password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  // Admin should land on /staff/tickets after login (no dedicated admin landing page)
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

async function loginAsStaff(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
  await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

test.describe('Admin Reference Data Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can create a category', async ({ page }) => {
    await page.goto('/admin/categories');
    await expect(page.locator('h1')).toContainText('Categories');

    // Open create form
    await page.click('button:has-text("Create Category")');
    await expect(page.locator('input[id="service_code"]')).toBeVisible();

    // Fill in form
    const uniqueCode = `TEST_${Date.now()}`;
    await page.fill('input[id="service_code"]', uniqueCode);
    await page.fill('input[id="name"]', 'Test Category E2E');

    // Submit
    await page.click('button[type="submit"]:has-text("Create Category")');

    // Should appear in table
    await expect(page.locator(`text=Test Category E2E`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${uniqueCode}`)).toBeVisible();
  });

  test('admin can deactivate a category', async ({ page }) => {
    // First create a category to deactivate
    await page.goto('/admin/categories');

    const uniqueCode = `DEACT_${Date.now()}`;
    await page.click('button:has-text("Create Category")');
    await page.fill('input[id="service_code"]', uniqueCode);
    await page.fill('input[id="name"]', 'To Deactivate E2E');
    await page.click('button[type="submit"]:has-text("Create Category")');
    await expect(page.locator('text=To Deactivate E2E')).toBeVisible({ timeout: 5000 });

    // Reload to ensure fresh data
    await page.reload();
    await expect(page.locator('text=To Deactivate E2E')).toBeVisible({ timeout: 5000 });

    // Find and click Deactivate button for that row
    const row = page.locator('tr', { hasText: 'To Deactivate E2E' });
    await row.locator('button:has-text("Deactivate")').click();

    // Badge should change to Inactive (or the row is still there with Inactive badge)
    await expect(page.locator('tr', { hasText: 'To Deactivate E2E' }).locator('text=Inactive')).toBeVisible({ timeout: 5000 });
  });

  test('admin can create a department', async ({ page }) => {
    await page.goto('/admin/departments');
    await expect(page.locator('h1')).toContainText('Departments');

    await page.click('button:has-text("Create Department")');
    await expect(page.locator('input[id="dept-name"]')).toBeVisible();

    await page.fill('input[id="dept-name"]', `Test Dept ${Date.now()}`);
    await page.click('button[type="submit"]:has-text("Create Department")');

    // New dept should appear in table
    await expect(page.locator('text=Active').first()).toBeVisible({ timeout: 5000 });
  });

  test('admin can create a substatus', async ({ page }) => {
    await page.goto('/admin/substatuses');
    await expect(page.locator('h1')).toContainText('Substatuses');

    // Click + Add on the "Open" bucket
    const openSection = page.locator('div', { hasText: 'Open' }).first();
    await openSection.locator('button:has-text("+ Add")').first().click();

    await expect(page.locator('input[id="sub-label"]')).toBeVisible();
    const uniqueLabel = `Awaiting Review ${Date.now()}`;
    await page.fill('input[id="sub-label"]', uniqueLabel);

    // Status should default to 'open' — keep it
    await page.click('button[type="submit"]:has-text("Create Substatus")');

    // The new substatus should appear in the open section
    await expect(page.locator(`text=${uniqueLabel}`)).toBeVisible({ timeout: 5000 });
  });

  test('admin can create a response template', async ({ page }) => {
    await page.goto('/admin/response-templates');
    await expect(page.locator('h1')).toContainText('Response Templates');

    await page.click('button:has-text("Create Template")');
    await expect(page.locator('input[id="tmpl-name"]')).toBeVisible();

    const uniqueName = `Thank You Template ${Date.now()}`;
    await page.fill('input[id="tmpl-name"]', uniqueName);
    await page.fill('textarea[id="tmpl-body"]', 'Thank you for reporting ticket {{ticket_id}}. We will review it shortly.');

    // Should show {{ticket_id}} as a known token — no orange warning
    await expect(page.locator('text=Unknown tokens')).not.toBeVisible();

    await page.click('button[type="submit"]:has-text("Create Template")');

    // Should appear in table
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
  });

  test('response template with unknown token shows placeholder hint', async ({ page }) => {
    await page.goto('/admin/response-templates');
    await page.click('button:has-text("Create Template")');

    await page.fill('input[id="tmpl-name"]', `Unknown Token Test ${Date.now()}`);
    await page.fill('textarea[id="tmpl-body"]', 'Hello {{unknown_field}}');

    // Unknown token warning should appear
    await expect(page.locator('text=Unknown tokens')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=unknown_field')).toBeVisible();
  });
});

test.describe('Admin Access Control', () => {
  test('non-admin staff cannot access /admin/categories', async ({ page }) => {
    await loginAsStaff(page);

    // Staff navigating to admin should be redirected
    await page.goto('/admin/categories');

    // Middleware redirects staff away from admin — expect redirect to /staff/tickets
    await expect(page).toHaveURL(/\/staff\/tickets/, { timeout: 10000 });
  });
});
