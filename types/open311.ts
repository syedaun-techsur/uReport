// types/open311.ts

export interface Open311Service {
  service_code: string;
  service_name: string;
  description: string;
  metadata: false;
  type: 'realtime';
  keywords: string;
  group: string;
}

export interface Open311ServiceRequest {
  service_request_id: string;
  status: 'open' | 'closed';
  status_notes: string | null;
  service_name: string;
  service_code: string;
  description: string;
  agency_responsible: string | null;
  service_notice: null;
  requested_datetime: string;   // ISO8601 UTC
  updated_datetime: string;     // ISO8601 UTC
  expected_datetime: null;
  address: string;
  address_id: null;
  zipcode: null;
  lat: number | null;
  long: number | null;          // NOTE: Open311 uses 'long', not 'lng'
  media_url: null;
}

export interface Open311Error {
  errors: Array<{
    code: string;
    description: string;
  }>;
}

// Internal → Open311 status mapping:
// 'open'        → 'open'
// 'in_progress' → 'open'
// 'closed'      → 'closed'
// 'archived'    → 'closed'
export type Open311Status = 'open' | 'closed';
