import { test, expect } from '@playwright/test';

test.describe('Ticket Submission — POST /api/tickets', () => {
  test('POST /api/tickets returns 400 without required fields', async ({ request }) => {
    const res = await request.post('/api/tickets', {
      multipart: {
        description: 'too short',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/tickets returns 201 with valid data', async ({ request }) => {
    // First get a valid category ID from the categories API
    const catRes = await request.get('/api/categories');
    expect(catRes.status()).toBe(200);
    const categories = await catRes.json() as Array<{ id: string; anon_allowed: boolean }>;
    const anonCat = categories.find((c) => c.anon_allowed);
    if (!anonCat) {
      test.skip(true, 'No anon-allowed category in seed data');
      return;
    }

    const res = await request.post('/api/tickets', {
      multipart: {
        lat: '39.165325',
        lng: '-86.526384',
        address: '100 S College Ave, Bloomington, IN 47403',
        category_id: anonCat.id,
        description: 'Large pothole near the intersection causing vehicle damage',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('ticket_id');
    expect(body).toHaveProperty('reference_id');
    expect(body).toHaveProperty('status', 'open');
    expect(body).toHaveProperty('category_name');
    expect(body).toHaveProperty('created_at');
  });

  test('POST /api/tickets with contact info creates person', async ({ request }) => {
    const catRes = await request.get('/api/categories');
    const categories = await catRes.json() as Array<{ id: string; anon_allowed: boolean }>;
    const cat = categories[0];

    const res = await request.post('/api/tickets', {
      multipart: {
        lat: '39.165325',
        lng: '-86.526384',
        address: '200 E Kirkwood Ave, Bloomington, IN 47408',
        category_id: cat.id,
        description: 'Broken street light has been out for several weeks near the intersection',
        name: 'Jane Doe',
        email: 'jane.doe.test@example.com',
        phone: '812-555-0100',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('ticket_id');
  });

  test('POST /api/tickets returns 400 when contact required but missing', async ({ request }) => {
    // Find or mock a non-anon category
    const catRes = await request.get('/api/categories');
    const categories = await catRes.json() as Array<{ id: string; anon_allowed: boolean }>;
    const nonAnonCat = categories.find((c) => !c.anon_allowed);
    if (!nonAnonCat) {
      test.skip(true, 'No non-anon category in seed data');
      return;
    }

    const res = await request.post('/api/tickets', {
      multipart: {
        lat: '39.165325',
        lng: '-86.526384',
        address: '300 N Walnut St, Bloomington, IN 47404',
        category_id: nonAnonCat.id,
        description: 'Graffiti on public building wall needs removal and cleanup soon',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/contact/i);
  });

  test('GET /api/media/[id] returns 404 for unknown ID', async ({ request }) => {
    const res = await request.get('/api/media/nonexistent-id-00000000000');
    expect(res.status()).toBe(404);
  });

  test('Confirmation page renders with ticket ID', async ({ page }) => {
    await page.goto('/tickets/cltest000000000001/confirm?reference_id=REF-0001&category_name=Pothole');
    await expect(page.getByText('Report Submitted!')).toBeVisible();
    await expect(page.getByText('REF-0001')).toBeVisible();
    await expect(page.getByRole('link', { name: /view ticket status/i })).toHaveAttribute('href', '/tickets/cltest000000000001');
    await expect(page.getByRole('link', { name: /report another/i })).toHaveAttribute('href', '/');
  });
});
