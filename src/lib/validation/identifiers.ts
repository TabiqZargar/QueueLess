import { z } from "zod";

/**
 * Shared identifier schemas for the server boundary.
 *
 * Identifiers coming from the client (form fields, query parameters, route
 * params, hidden fields, cookies) are never trusted. They are trimmed,
 * required and length-bounded. No database-specific format (e.g. UUID) is
 * enforced so the current mock ids (`queue-1`, `entry-4`) keep working and a
 * future Prisma-backed id format can be adopted without a contract change.
 */
export const queueIdSchema = z
  .string()
  .trim()
  .min(1, "A queue must be selected")
  .max(100, "Invalid queue identifier");

export const entryIdSchema = z
  .string()
  .trim()
  .min(1, "A queue entry identifier is required")
  .max(100, "Invalid queue entry identifier");

export type QueueId = z.infer<typeof queueIdSchema>;
export type EntryId = z.infer<typeof entryIdSchema>;