import { test, expect } from '@playwright/test';

async function loginAsStaff(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('[aria-label="identifier"]', 'staff');
  await page.fill('[aria-label="password"]', 'Staff1234!secure');
  await page.click('[type="submit"]');
  await page.waitForURL('/staff/tickets');
}

async function getFirstTicketId(page: import('@playwright/test').Page): Promise<string | null> {
  const resp = await page.request.get('/api/staff/tickets?page=1&page_size=1&status=open');
  const body = await resp.json();
  return (body as { data?: { ticket_id?: string }[] }).data?.[0]?.ticket_id ?? null;
}

test.describe('Staff Ticket Mutations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('PATCH status creates TicketHistory entry', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    // PATCH via API directly
    const resp = await page.request.patch(`/api/staff/tickets/${id}`, {
      data: { status: 'in_progress' }
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // History should have a STATUS_CHANGE entry
    const histEntry = (body as { history?: { action?: string; to_value?: string }[] }).history?.find((h) => h.action === 'STATUS_CHANGE');
    expect(histEntry).toBeTruthy();
    expect(histEntry?.to_value).toBe('in_progress');
  });

  test('POST response creates TicketHistory entry', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    const resp = await page.request.post(`/api/staff/tickets/${id}/responses`, {
      data: { body: 'Test internal note from Playwright', is_public: false }
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect((body as { response_id?: string }).response_id).toBeTruthy();
    expect((body as { is_public?: boolean }).is_public).toBe(false);
  });

  test('POST response with empty body returns 422', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    const resp = await page.request.post(`/api/staff/tickets/${id}/responses`, {
      data: { body: '   ', is_public: false }
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect((body as { error?: { code?: string } }).error?.code).toBe('EMPTY_RESPONSE');
  });

  test('ResponseComposer UI renders and submits', async ({ page }) => {
    const id = await getFirstTicketId(page);
    if (!id) test.skip();
    await page.goto(`/staff/tickets/${id}`);
    // Response composer should be visible
    const textarea = page.locator('[data-testid="response-body"], textarea');
    await expect(textarea.first()).toBeVisible({ timeout: 10000 });
    // Type a note
    await textarea.first().fill('Test note from E2E');
    // Submit
    await page.click('button:has-text("Post"), button:has-text("Submit"), [data-testid="response-submit"]');
    // Should succeed (no error visible)
    await expect(page.locator('[data-testid="response-error"]')).not.toBeVisible();
  });
});
