// types/domain.ts

export type TicketStatus = 'open' | 'in_progress' | 'closed' | 'archived';
export type UserRole = 'staff' | 'admin';
export type ApiScope = 'read' | 'write';
export type TicketPerson_Role = 'submitter' | 'contact';

export interface TicketSummary {
  ticket_id: string;
  reference_id: string;
  category_name: string;
  department_name: string | null;
  status: TicketStatus;
  substatus_label: string | null;
  assignee_name: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface TicketDetail extends TicketSummary {
  service_code: string;
  description: string;
  category_id: string;
  department_id: string | null;
  substatus_id: string | null;
  assignee_id: string | null;
  history: TicketHistoryEntry[];
  responses: ResponseRecord[];
  media: MediaRecord[];
  persons: TicketPersonRecord[];
}

export interface TicketHistoryEntry {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface ResponseRecord {
  id: string;
  body: string;
  is_public: boolean;
  author_name: string | null;
  template_id: string | null;
  created_at: string;
}

export interface MediaRecord {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TicketPersonRecord {
  person_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: TicketPerson_Role;
}

export interface PersonRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  preferred_contact: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonDetail extends PersonRecord {
  linked_tickets: TicketSummary[];
}

export interface CategoryRecord {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  anon_allowed: boolean;
  active: boolean;
  group_id: string | null;
  department_id: string | null;
  department_name: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    field_errors?: Record<string, string>;
  };
}
