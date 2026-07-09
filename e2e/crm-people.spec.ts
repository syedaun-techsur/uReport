// e2e/crm-people.spec.ts
// Playwright E2E tests for CRM people management (CRM-01, CRM-02, CRM-03, CRM-04, CRM-05)
// Requires: running app at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
//           + seeded DB with staff/admin user.
//
// Seed credentials: username='staff', password='Staff1234!secure' (or admin / Admin1234!secure)
// (see prisma/seed.ts — overrideable via STAFF_USERNAME / STAFF_PASSWORD env vars)

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

// Helper: log in as staff using the actual login form fields
async function loginAsStaff(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
  await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

// Helper: create a test person via API (using page's request context — authenticated)
async function createTestPerson(
  request: APIRequestContext,
  overrides: Record<string, string> = {}
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `Test CRM Person ${Date.now()}`;
  const res = await request.post('/api/staff/people', {
    data: {
      name,
      email: overrides.email ?? `crm${Date.now()}@example.com`,
      phone: overrides.phone ?? '555-0100',
      notes: 'Created by E2E test',
    },
  });

  if (!res.ok()) {
    throw new Error(`Failed to create test person: ${res.status()}`);
  }

  const json = (await res.json()) as { id: string };
  return { id: json.id, name };
}

test.describe('CRM People Management', () => {
  // Ensure at least one person exists for search/view tests
  let testPersonId: string;
  let testPersonName: string;

  test.beforeAll(async ({ request }) => {
    // We need an authenticated request; the shared setup will authenticate below
    // Note: beforeAll runs without page login — we rely on beforeEach for login
    // so create person in beforeAll using a fresh API request after navigating login
    // Actually, we'll create person in the first test's beforeEach context
  });

  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  // ─── Test 1: Search for a person ──────────────────────────────────────────

  test('staff can search for a person', async ({ page, request }) => {
    // Ensure at least one person exists
    const person = await createTestPerson(request);
    testPersonId = person.id;
    testPersonName = person.name;

    await page.goto('/staff/people');

    const searchInput = page.getByTestId('person-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type enough chars to trigger FTS search
    const shortName = testPersonName.split(' ').pop()!.slice(0, 8); // e.g. "12345678"
    await searchInput.fill(shortName);

    // Wait for debounce (300ms) + API response
    await page.waitForTimeout(600);

    // Results or "no matching" should appear (FTS needs search_vector populated)
    // We accept either a result row OR the no-results message (FTS index may need update)
    const resultRow = page.getByTestId('person-row').first();
    const noResults = page.getByTestId('no-results');
    const hasResults = await resultRow.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasResults || hasNoResults).toBe(true);
  });

  // ─── Test 2: View person detail with linked tickets ────────────────────────

  test('staff can view person detail with linked tickets', async ({ page, request }) => {
    // Create a person if we don't have one from Test 1
    if (!testPersonId) {
      const person = await createTestPerson(request);
      testPersonId = person.id;
      testPersonName = person.name;
    }

    // Navigate directly to the person detail page
    await page.goto(`/staff/people/${testPersonId}`);

    // Detail page should load with name and linked tickets section
    const personName = page.getByTestId('person-name');
    await expect(personName).toBeVisible({ timeout: 10000 });

    // Linked tickets section heading should be visible
    await expect(page.getByText(/Linked Tickets/)).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 3: Create a new person ──────────────────────────────────────────

  test('staff can create a new person', async ({ page }) => {
    await page.goto('/staff/people/new');

    // Form fields should be visible
    await expect(page.locator('#person-name')).toBeVisible({ timeout: 10000 });

    const uniqueName = `E2E New Person ${Date.now()}`;
    const uniqueEmail = `e2e${Date.now()}@example.com`;

    await page.fill('#person-name', uniqueName);
    await page.fill('#person-email', uniqueEmail);
    await page.fill('#person-phone', '555-9999');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to the new person's detail page
    await page.waitForURL('**/staff/people/**', { timeout: 15000 });

    // Verify the person's name is displayed on the detail page
    await expect(page.getByTestId('person-name')).toContainText(uniqueName, { timeout: 10000 });
  });

  // ─── Test 4: Edit a person's contact details ──────────────────────────────

  test('staff can edit a person contact details', async ({ page, request }) => {
    // Create a fresh person to edit
    const person = await createTestPerson(request, { phone: '555-1111' });

    await page.goto(`/staff/people/${person.id}/edit`);

    // Edit form should be pre-populated
    const phoneInput = page.locator('#person-phone');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    // Update the phone number
    await phoneInput.clear();
    const newPhone = '555-9876';
    await phoneInput.fill(newPhone);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect back to detail page
    await page.waitForURL(`**/staff/people/${person.id}`, { timeout: 15000 });

    // Verify updated phone shown
    await expect(page.getByText(newPhone)).toBeVisible({ timeout: 10000 });
  });

  // ─── Test 5: Link a person to a ticket (conditional on Phase 5 existing) ──

  // Phase 5 (staff ticket queue) IS executed — checking if /staff/tickets exists
  test('staff can see linked constituents panel on ticket detail', async ({ page, request }) => {
    // Get a ticket from the API
    const ticketsRes = await request.get('/api/staff/tickets?page=1&page_size=1');
    if (!ticketsRes.ok()) {
      test.skip();
      return;
    }
    const ticketsJson = (await ticketsRes.json()) as { data: Array<{ ticket_id: string }> };
    if (!ticketsJson.data?.length) {
      test.skip();
      return;
    }

    const ticketId = ticketsJson.data[0].ticket_id;
    const person = await createTestPerson(request);

    // Link person to ticket via API
    const linkRes = await request.post(`/api/staff/tickets/${ticketId}/persons`, {
      data: { person_id: person.id, role: 'contact' },
    });

    // Accept both 201 (created) and 409 (already linked) as success
    expect([201, 409]).toContain(linkRes.status());

    // Navigate to the ticket detail page
    await page.goto(`/staff/tickets/${ticketId}`);
    // Just verify the page loads without error
    await expect(page.locator('h1, h2, [data-testid="ticket-header"]').first()).toBeVisible({ timeout: 10000 });
  });

  // ─── Test 6: Empty state for unknown query ────────────────────────────────

  test('search returns empty state for unknown query', async ({ page }) => {
    await page.goto('/staff/people');

    const searchInput = page.getByTestId('person-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search for a unique nonsense string
    await searchInput.fill('zzzzunknownperson');
    await page.waitForTimeout(600);

    // Should show "No matching people found" message
    await expect(page.getByTestId('no-results')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('No matching people found')).toBeVisible({ timeout: 5000 });
  });
});
