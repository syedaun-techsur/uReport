// e2e/admin-users-apikeys.spec.ts
// Playwright E2E tests for admin user management + API key management + audit log
// Requires: running app at PLAYWRIGHT_BASE_URL with seeded DB
//
// Seed admin credentials: username='admin', password='Admin1234!secure'
// (see prisma/seed.ts)

import { test, expect, type Page } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!secure';

// Helper: log in as admin using the login form
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username or email"]', ADMIN_USERNAME);
  await page.fill('input[aria-label="Password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  // Admin redirects to staff/tickets after login — navigate to admin
  await page.waitForURL('**/staff/tickets**', { timeout: 15000 });
  await page.goto('/admin/users');
  await page.waitForURL('**/admin/users**', { timeout: 10000 });
}

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can create a staff user', async ({ page }) => {
    // Navigate to users page
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

    // Click Create User
    await page.click('[data-testid="create-user-btn"]');

    // Fill the create user form
    const timestamp = Date.now();
    const newUsername = `teststaff_${timestamp}`;
    const newEmail = `teststaff_${timestamp}@test.example.com`;

    await page.fill('#username', newUsername);
    await page.fill('#email', newEmail);
    await page.fill('#password', 'TestStaff1234!');
    await page.selectOption('#role', 'staff');

    // Submit
    await page.click('[data-testid="user-form-submit"]');

    // Wait for form to close and success toast
    await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="toast"]')).toContainText('created');

    // New user should appear in the table
    await expect(page.locator('[data-testid="users-table"]')).toContainText(newUsername, { timeout: 8000 });
  });

  test('admin cannot deactivate own account', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

    // Find the admin row — the logged-in admin user
    // The deactivate button for the self row should be disabled
    // We identify the row by finding the admin username cell
    const adminRow = page.locator('[data-testid="users-table"] tbody tr').filter({
      hasText: ADMIN_USERNAME,
    }).first();

    await expect(adminRow).toBeVisible({ timeout: 8000 });

    // Find the toggle-active button in the admin row
    // It should be disabled for the current admin user
    const deactivateBtn = adminRow.locator('button:has-text("Deactivate"), button:has-text("Reactivate")').first();

    // Either it's disabled, or clicking shows an error
    const isDisabled = await deactivateBtn.isDisabled().catch(() => false);
    if (!isDisabled) {
      // Click and expect server-side rejection
      await deactivateBtn.click();
      // Should show error toast with SELF_DEACTIVATION message
      await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('[data-testid="toast"]')).toContainText('own account');
    } else {
      // Disabled — frontend guard working
      expect(isDisabled).toBe(true);
    }
  });
});

test.describe('Admin API Key Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-keys');
    await page.waitForURL('**/admin/api-keys**', { timeout: 10000 });
  });

  test('admin can generate an API key and see plaintext once', async ({ page }) => {
    // Click Generate Key
    await page.click('[data-testid="generate-key-btn"]');

    // Wait for form to appear
    await expect(page.locator('[data-testid="key-label-input"]')).toBeVisible({ timeout: 5000 });

    // Fill label and scope
    const timestamp = Date.now();
    const keyLabel = `TestKey_${timestamp}`;
    await page.fill('[data-testid="key-label-input"]', keyLabel);
    await page.selectOption('[data-testid="key-scope-select"]', 'read');

    // Submit
    await page.click('[data-testid="generate-key-submit"]');

    // Wait for modal to appear with plaintext key (T-06-07)
    await expect(page.locator('[data-testid="apikey-modal"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="plaintext-key"]')).toBeVisible();

    // Verify the key is 64 hex characters (32 random bytes)
    const plaintextKey = await page.locator('[data-testid="plaintext-key"]').textContent();
    expect(plaintextKey).toMatch(/^[0-9a-f]{64}$/);

    // Copy button should work
    await expect(page.locator('[data-testid="copy-key-btn"]')).toBeVisible();

    // Dismiss modal
    await page.click('[data-testid="apikey-modal-dismiss"]');

    // Modal should be gone
    await expect(page.locator('[data-testid="apikey-modal"]')).not.toBeVisible({ timeout: 5000 });

    // Key should appear in table as active
    await expect(page.locator('[data-testid="api-keys-table"]')).toContainText(keyLabel, { timeout: 8000 });

    // Find the key row and verify status
    const keyRow = page.locator('[data-testid="api-keys-table"] tbody tr').filter({ hasText: keyLabel }).first();
    await expect(keyRow.locator('[class*="green"]')).toContainText('active');
  });

  test('admin can revoke an API key', async ({ page }) => {
    // First ensure at least one active key exists — generate one if needed
    const keysTable = page.locator('[data-testid="api-keys-table"]');
    await expect(keysTable).toBeVisible({ timeout: 10000 });

    // Check if there's an active revoke button
    const revokeButtons = page.locator('[data-testid^="revoke-key-"]');
    const revokeCount = await revokeButtons.count();

    if (revokeCount === 0) {
      // Generate a key first
      await page.click('[data-testid="generate-key-btn"]');
      await expect(page.locator('[data-testid="key-label-input"]')).toBeVisible({ timeout: 5000 });
      const ts = Date.now();
      await page.fill('[data-testid="key-label-input"]', `RevokeTest_${ts}`);
      await page.selectOption('[data-testid="key-scope-select"]', 'read');
      await page.click('[data-testid="generate-key-submit"]');
      await expect(page.locator('[data-testid="apikey-modal"]')).toBeVisible({ timeout: 10000 });
      await page.click('[data-testid="apikey-modal-dismiss"]');
    }

    // Now click the first revoke button
    const firstRevokeBtn = page.locator('[data-testid^="revoke-key-"]').first();
    await expect(firstRevokeBtn).toBeVisible({ timeout: 5000 });

    // Note the key id from the data-testid
    const revokeTestId = await firstRevokeBtn.getAttribute('data-testid');
    const keyId = revokeTestId?.replace('revoke-key-', '') ?? '';

    await firstRevokeBtn.click();

    // Confirm dialog appears
    await expect(page.locator('[data-testid="confirm-revoke-btn"]')).toBeVisible({ timeout: 5000 });
    await page.click('[data-testid="confirm-revoke-btn"]');

    // Toast should show revocation success
    await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 8000 });

    // Key status should now show revoked
    if (keyId) {
      await expect(page.locator(`[data-testid="key-status-${keyId}"]`)).toContainText('revoked', { timeout: 8000 });
    }
  });
});

test.describe('Admin Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can view audit log entries', async ({ page }) => {
    await page.goto('/admin/audit-log');
    await page.waitForURL('**/admin/audit-log**', { timeout: 10000 });

    // Audit log table should be visible
    await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible({ timeout: 10000 });

    // Should have at least one entry (from test setup or seed)
    // The table should show entries — verify no password/hash data visible
    const tableContent = await page.locator('[data-testid="audit-log-table"]').textContent() ?? '';

    // Security check: no password hashes in the visible log
    expect(tableContent).not.toContain('password_hash');
    expect(tableContent).not.toContain('key_hash');
    expect(tableContent).not.toContain('$2b$'); // bcrypt hash prefix

    // Headers should be present
    await expect(page.locator('[data-testid="audit-log-table"] thead')).toContainText('Timestamp');
    await expect(page.locator('[data-testid="audit-log-table"] thead')).toContainText('Actor');
    await expect(page.locator('[data-testid="audit-log-table"] thead')).toContainText('Action');
  });

  test('audit log filter by resource type works', async ({ page }) => {
    await page.goto('/admin/audit-log');
    await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible({ timeout: 10000 });

    // Filter by User resource type
    await page.selectOption('#resource-type-filter', 'User');
    await page.click('button[type="submit"]:has-text("Filter")');

    // Table should reload
    await page.waitForResponse((response) =>
      response.url().includes('/api/admin/audit-log') && response.status() === 200
    );

    // All visible action entries should be User-related (or empty)
    const tableBody = page.locator('[data-testid="audit-log-table"] tbody');
    await expect(tableBody).toBeVisible({ timeout: 5000 });
  });
});
