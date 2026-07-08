// lib/open311.ts
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import type { Open311Service, Open311ServiceRequest, Open311Status } from '@/types/open311';

// ─── Internal status mapping ──────────────────────────────────────────────────
// FRD §F07: open/in_progress → 'open'; closed/archived → 'closed'
function mapStatus(internalStatus: string): Open311Status {
  return internalStatus === 'closed' || internalStatus === 'archived' ? 'closed' : 'open';
}

// ─── Ticket → Open311 ServiceRequest ──────────────────────────────────────────
// All 18 GeoReport v2 response fields. From FRD §F07.3 field mapping table.
// IMPORTANT: 'long' not 'lng' — GeoReport v2 spec uses 'long' for longitude.
export function ticketToServiceRequest(ticket: {
  id: string;
  status: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;       // internal field name
  created_at: Date;
  updated_at: Date;
  category: { service_code: string; name: string };
  department?: { name: string } | null;
  responses?: Array<{ body: string; is_public: boolean; created_at: Date }>;
}): Open311ServiceRequest {
  // status_notes = most recent public Response.body, or null (FRD §F07 terminology)
  const publicResponses = (ticket.responses ?? [])
    .filter(r => r.is_public)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const status_notes = publicResponses.length > 0 ? publicResponses[0].body : null;

  return {
    service_request_id: ticket.id,
    status: mapStatus(ticket.status),
    status_notes,
    service_name: ticket.category.name,
    service_code: ticket.category.service_code,
    description: ticket.description,
    agency_responsible: ticket.department?.name ?? null,
    service_notice: null,
    requested_datetime: ticket.created_at.toISOString(),
    updated_datetime: ticket.updated_at.toISOString(),
    expected_datetime: null,
    address: ticket.address,
    address_id: null,
    zipcode: null,
    lat: ticket.lat,
    long: ticket.lng,         // Open311 uses 'long'; internal model uses 'lng'
    media_url: null,
  };
}

// ─── Category → Open311 Service ──────────────────────────────────────────────
// FRD §F07.1 field mapping table
export function categoryToService(category: {
  service_code: string;
  name: string;
  description: string | null;
  group?: { name: string } | null;
}): Open311Service {
  return {
    service_code: category.service_code,
    service_name: category.name,
    description: category.description ?? '',
    metadata: false,          // v1: no extended attributes
    type: 'realtime',
    keywords: '',             // reserved for future use
    group: category.group?.name ?? '',
  };
}

// ─── XML Serializer ──────────────────────────────────────────────────────────
// Lightweight template-literal XML — no external library needed.
// Root elements per FRD §F07 Content Negotiation:
//   services list → <services>/<service>
//   service requests list/detail → <service_requests>/<request>
//   errors → <errors>/<error>

function escapeXml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function objectToXmlElement(obj: Record<string, unknown>, elementName: string): string {
  const fields = Object.entries(obj)
    .map(([key, val]) => `  <${key}>${escapeXml(val)}</${key}>`)
    .join('\n');
  return `<${elementName}>\n${fields}\n</${elementName}>`;
}

/**
 * Convert data to well-formed XML string.
 * @param data - Array of objects or { errors: [...] } shape
 * @param rootElement - XML root element name: 'services' | 'service_requests' | 'errors'
 */
export function toXml(data: unknown, rootElement: 'services' | 'service_requests' | 'errors'): string {
  const childElement = rootElement === 'services' ? 'service'
    : rootElement === 'service_requests' ? 'request'
    : 'error';

  const items = Array.isArray(data) ? data : (data as { errors?: unknown[] }).errors ?? [data];

  const inner = items
    .map(item => objectToXmlElement(item as Record<string, unknown>, childElement))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n${inner}\n</${rootElement}>`;
}

// ─── API Key Helpers ──────────────────────────────────────────────────────────

/**
 * Extract raw API key from request.
 * Priority: X-Api-Key header first, then api_key query param.
 */
export function parseApiKey(req: NextRequest): string | null {
  const header = req.headers.get('x-api-key');
  if (header) return header;
  const param = new URL(req.url).searchParams.get('api_key');
  return param ?? null;
}

/**
 * Verify API key by SHA-256 hash lookup.
 * From TechArch §5.2 (exact implementation).
 * Updates last_used_at fire-and-forget on success.
 */
export async function verifyApiKey(
  prisma: PrismaClient,
  rawKey: string,
  requiredScope: 'read' | 'write'
): Promise<{ valid: boolean; error?: string }> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } });

  if (!apiKey) return { valid: false, error: 'key_not_found' };
  if (apiKey.revoked_at !== null) return { valid: false, error: 'key_not_found' };
  if (requiredScope === 'write' && apiKey.scope !== 'write') {
    return { valid: false, error: 'key_read_only' };
  }

  // Update last_used_at — fire-and-forget, don't await (from TechArch §5.2)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { last_used_at: new Date() },
  }).catch(() => {});

  return { valid: true };
}

// ─── Content Negotiation Helper ──────────────────────────────────────────────
/**
 * Determine if the request wants XML output.
 * FRD §F07 Content Negotiation: ?format=xml OR Accept: application/xml
 */
export function wantsXml(req: NextRequest): boolean {
  const formatParam = new URL(req.url).searchParams.get('format');
  if (formatParam === 'xml') return true;
  const accept = req.headers.get('accept') ?? '';
  return accept.includes('application/xml');
}
