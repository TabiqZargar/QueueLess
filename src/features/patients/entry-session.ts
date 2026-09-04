import { cookies } from "next/headers";

/**
 * Temporary mechanism for persisting the current patient's queue entry
 * reference during development.
 *
 * Because there is no authentication yet, the patient's active queue entry is
 * tracked through a signed-free cookie containing `{ queueId, entryId }`.
 * This allows the status page and cancellation actions to recover the
 * patient's entry without a database. Pages simply forward the cookie to the
 * personal queue-status page.
 *
 * This will be replaced by the real authentication/session strategy once the
 * database contributor integrates the persistence layer.
 */
export const ENTRY_COOKIE_NAME = "queueless_entry";

export interface StoredEntry {
  queueId: string;
  entryId: string;
}

export function getStoredEntryCookie(): StoredEntry | null {
  const value = cookies().get(ENTRY_COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredEntry>;
    if (!parsed.queueId || !parsed.entryId) return null;
    return { queueId: parsed.queueId, entryId: parsed.entryId };
  } catch {
    return null;
  }
}

export function buildEntryCookieValue(entry: StoredEntry): string {
  return JSON.stringify(entry);
}