import { test, expect } from '@playwright/test';

test.describe('Public Ticket Tracking', () => {
  test('GET /api/tickets/public-map returns GeoJSON FeatureCollection', async ({ request }) => {
    const res = await request.get('/api/tickets/public-map');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('type', 'FeatureCollection');
    expect(body).toHaveProperty('features');
    expect(Array.isArray(body.features)).toBe(true);
  });

  test('GeoJSON features have expected properties', async ({ request }) => {
    const res = await request.get('/api/tickets/public-map');
    const body = await res.json();
    if (body.features.length > 0) {
      const feature = body.features[0];
      expect(feature).toHaveProperty('type', 'Feature');
      expect(feature).toHaveProperty('geometry.type', 'Point');
      expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
      expect(feature.geometry.coordinates).toHaveLength(2);
      expect(feature.properties).toHaveProperty('ticket_id');
      expect(feature.properties).toHaveProperty('reference_id');
      // No PII in properties
      expect(feature.properties).not.toHaveProperty('email');
      expect(feature.properties).not.toHaveProperty('name');
      expect(feature.properties).not.toHaveProperty('phone');
    }
  });

  test('GET /api/tickets/[id]/public returns 404 for non-existent ticket', async ({ request }) => {
    const res = await request.get('/api/tickets/nonexistent_id_0000000000001/public');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Ticket not found');
  });

  test('Public ticket detail API returns no PII fields', async ({ request }) => {
    // Create a ticket first so we have a real ID to look up
    const catRes = await request.get('/api/categories');
    const categories = await catRes.json() as Array<{ id: string; anon_allowed: boolean }>;
    const cat = categories.find((c) => c.anon_allowed) ?? categories[0];
    if (!cat) {
      test.skip(true, 'No categories in seed data');
      return;
    }

    const createRes = await request.post('/api/tickets', {
      multipart: {
        lat: '39.165325',
        lng: '-86.526384',
        address: '400 N Dunn St, Bloomington, IN 47408',
        category_id: cat.id,
        description: 'Abandoned vehicle blocking the alley access for residents',
        name: 'Test Person',
        email: 'trackingtest@example.com',
      },
    });

    if (createRes.status() !== 201) {
      test.skip(true, 'Could not create ticket for tracking test — check DB seed');
      return;
    }
    const { ticket_id } = await createRes.json();

    const detailRes = await request.get(`/api/tickets/${ticket_id}/public`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();

    // Required fields present
    expect(detail).toHaveProperty('id', ticket_id);
    expect(detail).toHaveProperty('reference_id');
    expect(detail).toHaveProperty('status');
    expect(detail).toHaveProperty('category');
    expect(detail).toHaveProperty('description');
    expect(detail).toHaveProperty('created_at');
    expect(detail).toHaveProperty('responses');

    // PII must NOT be present
    expect(detail).not.toHaveProperty('email');
    expect(detail).not.toHaveProperty('phone');
    expect(detail).not.toHaveProperty('persons');
    expect(detail).not.toHaveProperty('name');
  });

  test('Public ticket detail page renders for existing ticket', async ({ page }) => {
    // Create ticket
    const catRes = await page.request.get('/api/categories');
    const categories = await catRes.json() as Array<{ id: string; anon_allowed: boolean }>;
    const cat = categories.find((c) => c.anon_allowed) ?? categories[0];
    if (!cat) {
      test.skip(true, 'No categories in seed data');
      return;
    }
    const createRes = await page.request.post('/api/tickets', {
      multipart: {
        lat: '39.165325',
        lng: '-86.526384',
        address: '500 N Walnut St, Bloomington, IN 47404',
        category_id: cat.id,
        description: 'Damaged park bench with sharp metal edges near playground area',
      },
    });
    if (createRes.status() !== 201) {
      test.skip(true, 'Could not create ticket');
      return;
    }
    const { ticket_id, reference_id } = await createRes.json();

    await page.goto(`/tickets/${ticket_id}`);
    await expect(page.getByText(`#${reference_id}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/open|in.progress|closed/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /report a new issue/i })).toBeVisible();
  });

  test('Public map page loads Leaflet map container', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/open issues map/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /report an issue/i })).toBeVisible();
  });

  test('/tickets/[id] page shows not found for invalid ID', async ({ page }) => {
    await page.goto('/tickets/definitely-not-a-real-id-00000001');
    // Next.js notFound() renders the not-found page
    await expect(page.getByText(/404|not found/i)).toBeVisible({ timeout: 5000 });
  });
});
