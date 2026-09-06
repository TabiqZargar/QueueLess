import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { queueService } from "@/lib/queue/instance";
import { canSubscribeToQueue } from "@/lib/realtime/authorization";
import { realtimeTransport } from "@/lib/realtime/instance";
import { queueTopic } from "@/lib/realtime/topics";
import { queueIdSchema } from "@/lib/validation/identifiers";

/**
 * Polling endpoint for realtime queue notifications.
 *
 * The browser channel is short-polling (no WebSocket/SSE infrastructure in the
 * project). A subscriber passes the queue id and the last sequence it saw; the
 * server authorizes the session against the queue, then returns any events
 * published after that cursor. The client advances `after` to `latestSequence`
 * and reaches the live tail.
 *
 * Envelope and error codes follow the Phase 7 API contract:
 * `{ success, data }` / `{ success: false, error: { code, message } }`.
 */
export const dynamic = "force-dynamic";

const afterCursorSchema = z.coerce
  .number()
  .int("after must be a whole number")
  .nonnegative("after must not be negative")
  .default(0);

export async function GET(request: NextRequest) {
  const queueResult = queueIdSchema.safeParse(
    request.nextUrl.searchParams.get("queue")
  );
  if (!queueResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "A queue must be selected." },
      },
      { status: 400 }
    );
  }

  const afterResult = afterCursorSchema.safeParse(
    request.nextUrl.searchParams.get("after") ?? "0"
  );
  if (!afterResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "The after cursor is invalid." },
      },
      { status: 400 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." },
      },
      { status: 401 }
    );
  }

  const queueId = queueResult.data;

  const allowed = await canSubscribeToQueue(session.user, queueId, {
    getQueueWithDetails: (id) => queueService.getQueue(id),
    getQueueEntries: (id) => queueService.getQueueEntries(id),
  });

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to subscribe to this queue.",
        },
      },
      { status: 403 }
    );
  }

  const events = await realtimeTransport.readEvents(
    queueTopic(queueId),
    afterResult.data
  );

  return NextResponse.json({
    success: true,
    data: {
      events,
      latestSequence:
        events.length > 0 ? events[events.length - 1].sequence : afterResult.data,
    },
  });
}