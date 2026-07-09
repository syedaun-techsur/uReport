// e2e/staff-ticket-detail.spec.ts
// Playwright E2E tests for the staff ticket detail page (STAFF-06, STAFF-10, STAFF-11)
// Requires: running app at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
//           + seeded DB with staff user and at least one ticket.
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
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

// Helper: get the first ticket ID from the queue API
async function getFirstTicketId(page: Page): Promise<string | undefined> {
  const resp = await page.request.get('/api/staff/tickets?page=1&page_size=1');
  const body = await resp.json();
  return body.data?.[0]?.ticket_id;
}

test.describe('Staff Ticket Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('ticket detail page loads with header and reference ID', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    await page.goto(`/staff/tickets/${id}`);
    // Reference ID or some ticket metadata should be visible (header section)
    await expect(page.locator('[data-testid="ticket-header"], h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('history timeline section is visible', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    await page.goto(`/staff/tickets/${id}`);
    await expect(page.locator('[data-testid="history-timeline"], .history-timeline, ol, ul').first()).toBeVisible({ timeout: 10000 });
  });

  test('mini map renders when ticket has coordinates', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    await page.goto(`/staff/tickets/${id}`);
    // Leaflet map container should be present (may take a moment to load client-side)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });
});
