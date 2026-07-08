// lib/fts.ts
// Full-text search helpers for Postgres tsvector queries.
// TechArch §2.1: search_vector column populated by trigger on Ticket.
// FRD §F03: Staff queue FTS search via plainto_tsquery.

import { Prisma } from '@prisma/client';

/**
 * Escapes a user-supplied string for use with plainto_tsquery.
 * plainto_tsquery handles most cases but we strip raw SQL-dangerous chars
 * as defense-in-depth (T-05-02).
 */
export function buildFtsQuery(q: string): string {
  // Strip characters that could escape out of the parameterized query context
  return q.replace(/[\\';]/g, ' ').trim();
}

/**
 * Returns a Prisma.sql fragment: t.search_vector @@ plainto_tsquery('english', $q)
 * MUST be used with prisma.$queryRaw — prisma.$queryRawUnsafe is FORBIDDEN.
 *
 * The ${safe} value is passed as a parameterized bind variable by Prisma.sql,
 * so plainto_tsquery receives $1 (not a concatenated string). No SQL injection risk.
 */
export function ticketFtsWhere(q: string): Prisma.Sql {
  const safe = buildFtsQuery(q);
  return Prisma.sql`t.search_vector @@ plainto_tsquery('english', ${safe})`;
}
