// e2e/staff-reports.spec.ts
import { test, expect } from '@playwright/test';

// Helper: log in as staff
async function loginAsStaff(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('[name="identifier"], [name="username"], [name="email"]', 'staff@bloomington.gov');
  await page.fill('[name="password"]', 'Staff1234!secure');
  await page.click('button[type="submit"]');
  await page.waitForURL('/staff/tickets', { timeout: 10_000 });
}

test.describe('Reports Dashboard', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/staff/reports');
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard loads for staff user and shows summary cards', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/reports');

    // Wait for the page to be visible
    await expect(page.locator('h1')).toContainText('Reports');

    // Summary cards should exist (even if values are 0)
    await expect(page.locator('[data-testid="card-total"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="card-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-closed"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-avg-resolution"]')).toBeVisible();
  });

  test('preset "Last 7d" button updates URL and re-renders page', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/reports');

    // Default is 30d; click 7d
    await page.locator('[data-testid="preset-7d"]').click();
    await expect(page).toHaveURL(/preset=7d/, { timeout: 5_000 });

    // Summary cards still visible after navigation
    await expect(page.locator('[data-testid="card-total"]')).toBeVisible({ timeout: 10_000 });
  });

  test('VolumeChart renders (recharts container visible)', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/reports?preset=30d');

    // recharts renders a svg inside the container div
    await expect(page.locator('[data-testid="volume-chart"]')).toBeVisible({ timeout: 15_000 });
  });

  test('StatusBreakdown renders (recharts pie chart visible)', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/reports?preset=30d');

    await expect(page.locator('[data-testid="status-breakdown"]')).toBeVisible({ timeout: 15_000 });
  });

  test('ResolutionTimeChart renders', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/reports?preset=30d');

    await expect(page.locator('[data-testid="resolution-time-chart"]')).toBeVisible({ timeout: 15_000 });
  });

  test('DensityMap renders (Leaflet map container visible, no SSR error)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await loginAsStaff(page);
    await page.goto('/staff/reports?preset=30d');

    // Wait for map container
    await expect(page.locator('[data-testid="density-map"]')).toBeVisible({ timeout: 15_000 });

    // Leaflet tile layer (OSM tiles) container should be present
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 });

    // No window/document-related SSR errors
    const ssr_errors = errors.filter(e =>
      e.includes('window is not defined') ||
      e.includes('document is not defined') ||
      e.includes('Cannot read properties of undefined')
    );
    expect(ssr_errors).toHaveLength(0);
  });
});
