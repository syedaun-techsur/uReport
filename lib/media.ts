// lib/media.ts
// Postgres bytea / Large Object media helpers (TechArch §2.2)
//
// Responsibilities:
//   storeMedia(prisma, ticketId, file) — decides bytea vs. LO based on
//     MEDIA_LO_THRESHOLD_KB; creates Media record; no filesystem writes
//   readMedia(prisma, mediaId) — returns { buffer, mimeType, filename }
//     from bytea or LO
//   deleteMedia(prisma, mediaId) — removes LO OID if applicable, deletes
//     Media record

import { PrismaClient } from '@prisma/client';

// ─── storeMedia ────────────────────────────────────────────────────────────

export async function storeMedia(
  prisma: PrismaClient,
  ticketId: string,
  file: File,
): Promise<{ id: string; filename: string; mime_type: string; size_bytes: number; created_at: string }> {
  const maxBytes =
    parseInt(process.env.MEDIA_MAX_SIZE_MB ?? '10', 10) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `File exceeds maximum size of ${process.env.MEDIA_MAX_SIZE_MB ?? 10}MB`,
    );
  }

  const thresholdBytes =
    parseInt(process.env.MEDIA_LO_THRESHOLD_KB ?? '8', 10) * 1024;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length <= thresholdBytes) {
    // ── bytea path ─────────────────────────────────────────────────────────
    const media = await prisma.media.create({
      data: {
        ticket_id: ticketId,
        mime_type: file.type || 'application/octet-stream',
        filename: file.name,
        data: buffer,
        lo_oid: null,
        size_bytes: buffer.length,
      },
    });
    return {
      id: media.id,
      filename: media.filename,
      mime_type: media.mime_type,
      size_bytes: media.size_bytes,
      created_at: media.created_at.toISOString(),
    };
  } else {
    // ── Large Object path ───────────────────────────────────────────────────
    // lo_create(0) returns the new OID
    const result = await prisma.$queryRaw<[{ lo_oid: number }]>`
      SELECT lo_create(0) AS lo_oid
    `;
    const loOid = result[0].lo_oid;

    // Write data via lo_put(oid, offset, data)
    await prisma.$executeRaw`SELECT lo_put(${loOid}::oid, 0, ${buffer}::bytea)`;

    const media = await prisma.media.create({
      data: {
        ticket_id: ticketId,
        mime_type: file.type || 'application/octet-stream',
        filename: file.name,
        data: null,
        lo_oid: loOid,
        size_bytes: buffer.length,
      },
    });
    return {
      id: media.id,
      filename: media.filename,
      mime_type: media.mime_type,
      size_bytes: media.size_bytes,
      created_at: media.created_at.toISOString(),
    };
  }
}

// ─── readMedia ─────────────────────────────────────────────────────────────

export async function readMedia(
  prisma: PrismaClient,
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });

  if (media.data) {
    return {
      buffer: Buffer.isBuffer(media.data) ? media.data : Buffer.from(media.data),
      mimeType: media.mime_type,
      filename: media.filename,
    };
  }

  if (media.lo_oid) {
    const result = await prisma.$queryRaw<[{ data: Buffer | Uint8Array }]>`
      SELECT lo_get(${media.lo_oid}::oid) AS data
    `;
    const raw = result[0].data;
    return {
      buffer: Buffer.isBuffer(raw) ? raw : Buffer.from(raw),
      mimeType: media.mime_type,
      filename: media.filename,
    };
  }

  throw new Error(`Media ${mediaId} has neither bytea nor Large Object data`);
}

// ─── deleteMedia ───────────────────────────────────────────────────────────

export async function deleteMedia(
  prisma: PrismaClient,
  mediaId: string,
): Promise<void> {
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });

  if (media.lo_oid) {
    await prisma.$executeRaw`SELECT lo_unlink(${media.lo_oid}::oid)`;
  }

  await prisma.media.delete({ where: { id: mediaId } });
}
