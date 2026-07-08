// lib/open311.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ticketToServiceRequest, categoryToService, toXml, parseApiKey, wantsXml } from './open311';

// ─── ticketToServiceRequest ───────────────────────────────────────────────────
describe('ticketToServiceRequest', () => {
  const baseTicket = {
    id: 'ticket-abc-123',
    status: 'open',
    description: 'Large pothole on Main St',
    address: '123 Main St',
    lat: 39.165,
    lng: -86.526,
    created_at: new Date('2026-07-01T10:00:00Z'),
    updated_at: new Date('2026-07-02T12:00:00Z'),
    category: { service_code: 'POTHOLE', name: 'Pothole Repair' },
    department: { name: 'Public Works' },
    responses: [],
  };

  it('maps service_request_id from ticket.id', () => {
    const result = ticketToServiceRequest(baseTicket);
    expect(result.service_request_id).toBe('ticket-abc-123');
  });

  it('maps long (not lng) from ticket.lng', () => {
    const result = ticketToServiceRequest(baseTicket);
    expect(result.long).toBe(-86.526);
    // 'lng' must NOT appear as a key in the output
    expect('lng' in result).toBe(false);
  });

  it('maps open status → open', () => {
    expect(ticketToServiceRequest({ ...baseTicket, status: 'open' }).status).toBe('open');
  });

  it('maps in_progress status → open', () => {
    expect(ticketToServiceRequest({ ...baseTicket, status: 'in_progress' }).status).toBe('open');
  });

  it('maps closed status → closed', () => {
    expect(ticketToServiceRequest({ ...baseTicket, status: 'closed' }).status).toBe('closed');
  });

  it('maps archived status → closed', () => {
    expect(ticketToServiceRequest({ ...baseTicket, status: 'archived' }).status).toBe('closed');
  });

  it('sets status_notes to most recent public response body', () => {
    const ticket = {
      ...baseTicket,
      responses: [
        { body: 'First note', is_public: true, created_at: new Date('2026-07-01T11:00:00Z') },
        { body: 'Latest note', is_public: true, created_at: new Date('2026-07-02T11:00:00Z') },
        { body: 'Internal note', is_public: false, created_at: new Date('2026-07-03T11:00:00Z') },
      ],
    };
    expect(ticketToServiceRequest(ticket).status_notes).toBe('Latest note');
  });

  it('sets status_notes to null when no public responses', () => {
    const ticket = {
      ...baseTicket,
      responses: [{ body: 'Internal', is_public: false, created_at: new Date() }],
    };
    expect(ticketToServiceRequest(ticket).status_notes).toBeNull();
  });

  it('sets fixed null fields (service_notice, expected_datetime, address_id, zipcode, media_url)', () => {
    const result = ticketToServiceRequest(baseTicket);
    expect(result.service_notice).toBeNull();
    expect(result.expected_datetime).toBeNull();
    expect(result.address_id).toBeNull();
    expect(result.zipcode).toBeNull();
    expect(result.media_url).toBeNull();
  });

  it('maps requested_datetime from created_at ISO8601', () => {
    const result = ticketToServiceRequest(baseTicket);
    expect(result.requested_datetime).toBe('2026-07-01T10:00:00.000Z');
  });

  it('maps agency_responsible from department.name', () => {
    expect(ticketToServiceRequest(baseTicket).agency_responsible).toBe('Public Works');
  });

  it('sets agency_responsible to null when no department', () => {
    const ticket = { ...baseTicket, department: null };
    expect(ticketToServiceRequest(ticket).agency_responsible).toBeNull();
  });
});

// ─── categoryToService ────────────────────────────────────────────────────────
describe('categoryToService', () => {
  it('maps all 7 GeoReport v2 service fields', () => {
    const cat = {
      service_code: 'POTHOLE',
      name: 'Pothole Repair',
      description: 'Report potholes',
      group: { name: 'Streets & Transportation' },
    };
    const result = categoryToService(cat);
    expect(result.service_code).toBe('POTHOLE');
    expect(result.service_name).toBe('Pothole Repair');
    expect(result.description).toBe('Report potholes');
    expect(result.metadata).toBe(false);
    expect(result.type).toBe('realtime');
    expect(result.keywords).toBe('');
    expect(result.group).toBe('Streets & Transportation');
  });

  it('uses empty string for description when null', () => {
    const result = categoryToService({ service_code: 'X', name: 'X', description: null });
    expect(result.description).toBe('');
  });

  it('uses empty string for group when no group', () => {
    const result = categoryToService({ service_code: 'X', name: 'X', description: null });
    expect(result.group).toBe('');
  });
});

// ─── toXml ────────────────────────────────────────────────────────────────────
describe('toXml', () => {
  it('produces valid XML declaration', () => {
    const xml = toXml([], 'services');
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('uses <services>/<service> for services root', () => {
    const xml = toXml([{ service_code: 'POTHOLE', service_name: 'Pothole' }], 'services');
    expect(xml).toContain('<services>');
    expect(xml).toContain('<service>');
    expect(xml).toContain('</service>');
    expect(xml).toContain('</services>');
  });

  it('uses <service_requests>/<request> for service_requests root', () => {
    const xml = toXml([{ service_request_id: 'abc', status: 'open' }], 'service_requests');
    expect(xml).toContain('<service_requests>');
    expect(xml).toContain('<request>');
  });

  it('uses <errors>/<error> for errors root', () => {
    const xml = toXml({ errors: [{ code: 'key_not_found', description: 'API key was not found' }] }, 'errors');
    expect(xml).toContain('<errors>');
    expect(xml).toContain('<error>');
    expect(xml).toContain('<code>key_not_found</code>');
  });

  it('escapes XML special characters', () => {
    const xml = toXml([{ description: 'Pothole & crack <severe>' }], 'service_requests');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
  });

  it('renders null values as empty elements', () => {
    const xml = toXml([{ agency_responsible: null }], 'service_requests');
    expect(xml).toContain('<agency_responsible></agency_responsible>');
  });
});

// ─── parseApiKey ─────────────────────────────────────────────────────────────
describe('parseApiKey', () => {
  function makeReq(opts: { header?: string; param?: string }): Request {
    const url = opts.param
      ? `http://localhost/api/open311/requests?api_key=${opts.param}`
      : 'http://localhost/api/open311/requests';
    const headers: Record<string, string> = {};
    if (opts.header) headers['x-api-key'] = opts.header;
    return new Request(url, { headers });
  }

  it('extracts key from X-Api-Key header', () => {
    const req = makeReq({ header: 'my-secret-key' }) as any;
    expect(parseApiKey(req)).toBe('my-secret-key');
  });

  it('extracts key from api_key query param', () => {
    const req = makeReq({ param: 'my-param-key' }) as any;
    expect(parseApiKey(req)).toBe('my-param-key');
  });

  it('prefers header over query param', () => {
    const req = new Request('http://localhost/api/open311/requests?api_key=param-key', {
      headers: { 'x-api-key': 'header-key' },
    }) as any;
    expect(parseApiKey(req)).toBe('header-key');
  });

  it('returns null when no key provided', () => {
    const req = makeReq({}) as any;
    expect(parseApiKey(req)).toBeNull();
  });
});

// ─── wantsXml ────────────────────────────────────────────────────────────────
describe('wantsXml', () => {
  it('returns true for ?format=xml', () => {
    const req = new Request('http://localhost/api/open311/services?format=xml') as any;
    expect(wantsXml(req)).toBe(true);
  });

  it('returns true for Accept: application/xml', () => {
    const req = new Request('http://localhost/api/open311/services', {
      headers: { accept: 'application/xml' },
    }) as any;
    expect(wantsXml(req)).toBe(true);
  });

  it('returns false by default', () => {
    const req = new Request('http://localhost/api/open311/services') as any;
    expect(wantsXml(req)).toBe(false);
  });
});
