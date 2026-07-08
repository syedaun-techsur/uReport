import { test, expect } from '@playwright/test';

test.describe('Public Portal — Report Form', () => {
  test('home page loads with map and category picker', async ({ page }) => {
    await page.goto('/');
    // Map container renders
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    // Category select populates
    await expect(page.locator('select[name="category_id"] option').nth(1)).toBeVisible();
  });

  test('category picker shows options grouped by category group', async ({ page }) => {
    await page.goto('/');
    const select = page.locator('select[name="category_id"]');
    await expect(select).toBeVisible();
    // At least one option after the placeholder
    const count = await select.locator('option').count();
    expect(count).toBeGreaterThan(1);
  });

  test('contact fields show when category does not allow anon', async ({ page }) => {
    await page.goto('/');
    // Intercept categories API to return a non-anon category
    await page.route('/api/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'cltest000000000000000000001',
          service_code: 'TEST-001',
          name: 'Pothole',
          description: null,
          icon: null,
          color: null,
          anon_allowed: false,
          active: true,
          group_id: 'group1',
          group_name: 'Roads',
          department_id: null,
          department_name: null,
        }]),
      });
    });
    await page.reload();
    await page.locator('select[name="category_id"]').selectOption({ index: 1 });
    await expect(page.getByText(/requires contact information/i)).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('contact fields optional when category allows anon', async ({ page }) => {
    await page.goto('/');
    await page.route('/api/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'cltest000000000000000000002',
          service_code: 'TEST-002',
          name: 'Litter',
          description: null,
          icon: null,
          color: null,
          anon_allowed: true,
          active: true,
          group_id: 'group2',
          group_name: 'Sanitation',
          department_id: null,
          department_name: null,
        }]),
      });
    });
    await page.reload();
    await page.locator('select[name="category_id"]').selectOption({ index: 1 });
    await expect(page.getByText(/optional/i)).toBeVisible();
  });

  test('address search input is visible in the map area', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    // Address search input exists
    await expect(page.locator('input[placeholder*="address" i], input[placeholder*="search" i]')).toBeVisible();
  });

  test('form validation prevents submit without location', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea[name="description"], input[name="description"]').fill('Test description for pothole on main street');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Should show validation error about location
    await expect(page.getByText(/location|pin|map/i)).toBeVisible();
  });
});
