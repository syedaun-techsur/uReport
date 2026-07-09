// e2e/crm-merge-anonymize.spec.ts
// Playwright E2E tests for CRM merge + anonymize operations (CRM-05)
// Requires: running app at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
//           + seeded DB with staff/admin user.
//
// Seed credentials: username='staff', password='Staff1234!secure' (or admin / Admin1234!secure)
// (see prisma/seed.ts — overrideable via STAFF_USERNAME / STAFF_PASSWORD env vars)

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const STAFF_USERNAME = process.env.STAFF_USERNAME ?? 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff1234!secure';

// Helper: log in as staff using the actual login form
async function loginAsStaff(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username or email"]', STAFF_USERNAME);
  await page.fill('input[aria-label="Password"]', STAFF_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
}

// Helper: create a test person via authenticated API request context
async function createTestPerson(
  request: APIRequestContext,
  overrides: Record<string, string | undefined> = {}
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `Merge Test Person ${Date.now()}`;
  const res = await request.post('/api/staff/people', {
    data: {
      name,
      email: overrides.email ?? `mergetest${Date.now()}@example.com`,
      phone: overrides.phone ?? '555-0200',
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to create test person (${res.status()}): ${body}`);
  }

  const json = (await res.json()) as { id: string };
  return { id: json.id, name };
}

test.describe('CRM Merge + Anonymize', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  // ─── Test 1: Staff can merge two person records ────────────────────────────

  test('staff can merge two person records', async ({ page, request }) => {
    // Create source and target persons
    const source = await createTestPerson(request, {
      name: `Merge Source ${Date.now()}`,
      email: `source${Date.now()}@example.com`,
    });
    const target = await createTestPerson(request, {
      name: `Merge Target ${Date.now()}`,
      email: `target${Date.now()}@example.com`,
    });

    // Navigate to source person's detail page
    await page.goto(`/staff/people/${source.id}`);
    await expect(page.locator('[data-testid="person-name"]')).toContainText(source.name);

    // Click "Merge with…" button
    await page.click('[data-testid="merge-btn"]');

    // Wait for merge dialog to open
    await expect(page.locator('[data-testid="merge-dialog"]')).toBeVisible();

    // Search for target person by name
    const searchInput = page.locator('[data-testid="merge-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(target.name);

    // Wait for search results to appear
    await page.waitForSelector(`[data-testid="merge-target-${target.id}"]`, { timeout: 10000 });

    // Select target from results
    await page.click(`[data-testid="merge-target-${target.id}"]`);

    // Confirmation step should appear
    await expect(page.locator('[data-testid="confirm-merge-btn"]')).toBeVisible();

    // Confirm the merge
    await page.click('[data-testid="confirm-merge-btn"]');

    // Should redirect to target person's detail page
    await page.waitForURL(`**/staff/people/${target.id}**`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`/staff/people/${target.id}`));
  });

  // ─── Test 2: Merge same person returns 422 MERGE_SAME ─────────────────────

  test('merge same person returns error', async ({ request }) => {
    // Create a person to use as both source and target
    const person = await createTestPerson(request, {
      name: `Self Merge Test ${Date.now()}`,
    });

    // Attempt merge via API directly with source_id === target_id
    const res = await request.post('/api/staff/people/merge', {
      data: {
        source_id: person.id,
        target_id: person.id,
      },
    });

    expect(res.status()).toBe(422);
    const json = (await res.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('MERGE_SAME');
  });

  // ─── Test 3: Staff can anonymize a person record ───────────────────────────

  test('staff can anonymize a person record', async ({ page, request }) => {
    // Create a person to anonymize
    const person = await createTestPerson(request, {
      name: `Anonymize Test ${Date.now()}`,
      email: `anon${Date.now()}@example.com`,
    });

    // Navigate to their detail page
    await page.goto(`/staff/people/${person.id}`);
    await expect(page.locator('[data-testid="person-name"]')).toContainText(person.name);

    // Click "Anonymize Record"
    await page.click('[data-testid="anonymize-btn"]');

    // Alert dialog should open
    await expect(page.locator('[data-testid="anonymize-dialog"]')).toBeVisible();
    // Verify the irreversibility warning is shown
    await expect(page.locator('[data-testid="anonymize-dialog"]')).toContainText(
      'All personal information will be permanently removed'
    );

    // Confirm anonymization
    await page.click('[data-testid="confirm-anonymize-btn"]');

    // Wait for page reload
    await page.waitForLoadState('networkidle');

    // Page should now show "Anonymous Constituent"
    await expect(page.locator('[data-testid="person-name"]')).toContainText('Anonymous Constituent');

    // Edit, Merge, and Anonymize buttons should be hidden
    await expect(page.locator('[data-testid="edit-person-btn"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="merge-btn"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="anonymize-btn"]')).not.toBeVisible();
  });

  // ─── Test 4: Anonymizing twice returns 409 ALREADY_ANONYMIZED ─────────────

  test('anonymizing twice returns 409', async ({ request }) => {
    // Create a person and anonymize them once
    const person = await createTestPerson(request, {
      name: `Double Anon Test ${Date.now()}`,
    });

    // First anonymize — should succeed
    const firstRes = await request.patch(`/api/staff/people/${person.id}/anonymize`);
    expect(firstRes.status()).toBe(204);

    // Second anonymize — should return 409
    const secondRes = await request.patch(`/api/staff/people/${person.id}/anonymize`);
    expect(secondRes.status()).toBe(409);
    const json = (await secondRes.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('ALREADY_ANONYMIZED');
  });

  // ─── Test 5: Merged source person is no longer accessible ────────────────

  test('merged source person redirects or shows not found', async ({ page, request }) => {
    // Create two persons for merge
    const source = await createTestPerson(request, {
      name: `404 Source ${Date.now()}`,
    });
    const target = await createTestPerson(request, {
      name: `404 Target ${Date.now()}`,
    });

    // Merge source into target via API
    const mergeRes = await request.post('/api/staff/people/merge', {
      data: {
        source_id: source.id,
        target_id: target.id,
      },
    });
    expect(mergeRes.status()).toBe(200);

    // Navigate to the source person's original URL
    await page.goto(`/staff/people/${source.id}`);

    // Source should now show 404 (soft-deleted, deleted_at is set)
    // The detail page uses findFirst({ where: { id, deleted_at: null } }) — not found → notFound()
    await expect(page).toHaveURL(new RegExp(`/staff/people/${source.id}`));
    // Next.js notFound() renders a 404 page
    const bodyText = await page.locator('body').textContent();
    const is404 = (bodyText ?? '').toLowerCase().includes('not found') ||
      (bodyText ?? '').toLowerCase().includes('404');
    expect(is404).toBe(true);
  });
});
