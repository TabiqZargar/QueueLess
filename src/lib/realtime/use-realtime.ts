"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QueueRealtimeEvent } from "./events";
import {
  createRealtimePoller,
  DEFAULT_REALTIME_POLL_INTERVAL_MS,
  RealtimeConnectionState,
  RealtimePollResult,
} from "./polling-client";

const REFRESH_DEBOUNCE_MS = 250;

type RealtimePollResponse =
  | {
      success: true;
      data: { events: QueueRealtimeEvent[]; latestSequence: number };
    }
  | { success: false; error: { code: string; message: string } };

/**
 * Calls the polling endpoint. `fetchFn` is parameterized so tests can stub the
 * network without a real HTTP stack.
 */
export async function pollQueueEvents(
  queueId: string,
  after: number,
  fetchFn: typeof fetch = fetch
): Promise<RealtimePollResult> {
  const url = `/api/realtime/events?queue=${encodeURIComponent(queueId)}&after=${after}`;
  const response = await fetchFn(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`realtime poll failed with status ${response.status}`);
  }
  const body = (await response.json()) as RealtimePollResponse;
  if (!body.success) {
    throw new Error(body.error?.message ?? "realtime poll failed");
  }
  return {
    events: body.data.events,
    latestSequence: body.data.latestSequence,
  };
}

export interface UseRealtimeUpdateOptions {
  intervalMs?: number;
}

/**
 * Polls a queue's realtime stream and triggers one coalesced router.refresh()
 * per burst of events, so the page re-reads authoritative data from
 * QueueService. Returns the connection state for status UI.
 *
 * Only one subscription should exist per page/feature boundary; pass the
 * queue id at the dashboard/sync-component level.
 */
export function useRealtimeUpdate(
  queueId: string | null | undefined,
  options?: UseRealtimeUpdateOptions
): RealtimeConnectionState {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeConnectionState>("connecting");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalMs = options?.intervalMs ?? DEFAULT_REALTIME_POLL_INTERVAL_MS;

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!queueId) {
      setStatus("unavailable");
      return;
    }

    const poller = createRealtimePoller({
      queueId,
      intervalMs,
      fetchEvents: (after) => pollQueueEvents(queueId, after),
      onEvents: () => scheduleRefresh(),
      onStatus: setStatus,
    });

    poller.start();
    return () => poller.stop();
  }, [queueId, intervalMs, scheduleRefresh]);

  return status;
}