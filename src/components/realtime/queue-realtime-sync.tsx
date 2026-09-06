"use client";

import { useRealtimeUpdate } from "@/lib/realtime/use-realtime";
import { RealtimeStatus } from "./realtime-status";

/**
 * Silent realtime subscriber for server-rendered patient pages. Mounting this
 * inside a server component page subscribes the client to the queue stream and
 * refreshes the page on change; the only visible surface is the subtle status
 * pill.
 */
export function QueueRealtimeSync({ queueId }: { queueId: string }) {
  const status = useRealtimeUpdate(queueId);
  return <RealtimeStatus status={status} />;
}