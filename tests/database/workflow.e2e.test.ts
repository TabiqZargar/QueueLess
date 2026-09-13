import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPostgresStack, createIsolatedQueue } from "./test-context";
import { getPatientStatus } from "@/features/patients/get-patient-status";
import { queueTopic } from "@/lib/realtime/topics";
import { QueueRealtimeEvent } from "@/lib/realtime/events";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("End-to-end queue workflow over PostgreSQL", () => {
  it("runs the full patient → staff → doctor lifecycle and persists every artifact", async () => {
    const {
      queueService,
      notificationRepository,
      notificationService,
      transport,
    } = buildPostgresStack();

    const patientA = `flow-a-${randomUUID()}`;
    const patientB = `flow-b-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      patientIds: [patientA, patientB],
      averageConsultationMinutes: 7,
    });

    const realtime: QueueRealtimeEvent[] = [];
    const subscription = transport.subscribe(queueTopic(queue.queueId), (e) =>
      realtime.push(e)
    );

    try {
      // --- Patient A joins an empty active queue -------------------------
      const joinedA = await queueService.joinQueue({
        queueId: queue.queueId,
        patientId: patientA,
      });
      expect(joinedA.entry.tokenNumber).toBe(1);
      expect(joinedA.position).toBe(1);
      expect(joinedA.estimatedWaitMinutes).toBe(0);

      // --- Patient B joins, shifting the wait metrics ---------------------
      const joinedB = await queueService.joinQueue({
        queueId: queue.queueId,
        patientId: patientB,
      });
      expect(joinedB.entry.tokenNumber).toBe(2);
      expect(joinedB.position).toBe(2);
      expect(joinedB.estimatedWaitMinutes).toBe(7);

      const positionA = await queueService.getQueuePosition(joinedA.entry.id);
      expect(positionA).toMatchObject({
        patientsAhead: 0,
        position: 1,
        totalInQueue: 2,
        estimatedWaitMinutes: 0,
      });

      // --- Staff sees the wait list in token order ------------------------
      const waitList = await queueService.getWaitList(queue.queueId);
      expect(waitList.map((w) => w.tokenNumber)).toEqual([1, 2]);
      expect(waitList[0]).toMatchObject({ position: 1, patientsAhead: 0 });
      expect(waitList[1]).toMatchObject({ position: 2, patientsAhead: 1 });

      // --- Staff calls the next patient ------------------------------------
      const calledA = await queueService.callNextPatient(queue.queueId);
      expect(calledA.id).toBe(joinedA.entry.id);
      expect(calledA.status).toBe("CALLED");
      expect(calledA.calledAt).toBeInstanceOf(Date);

      const remaining = await queueService.getWaitList(queue.queueId);
      expect(remaining.map((w) => w.tokenNumber)).toEqual([2]);

      const viewAfterCall = await getPatientStatus(
        joinedA.entry.id,
        queueService
      );
      expect(viewAfterCall.entryStatus).toBe("CALLED");
      expect(viewAfterCall.currentServingToken).toBe(1);
      expect(viewAfterCall.queueStatus).toBe("ACTIVE");

      // --- Doctor starts the consultation ----------------------------------
      const started = await queueService.startConsultation(joinedA.entry.id);
      expect(started.status).toBe("IN_CONSULTATION");
      expect(started.consultationStartedAt).toBeInstanceOf(Date);

      const positionB = await queueService.getQueuePosition(joinedB.entry.id);
      expect(positionB).toMatchObject({
        patientsAhead: 0,
        position: 1,
        totalInQueue: 1,
        currentServingToken: 1,
      });

      // --- Doctor completes the consultation -------------------------------
      const completed = await queueService.completeConsultation(joinedA.entry.id);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completedAt).toBeInstanceOf(Date);

      // --- Staff calls the next patient ------------------------------------
      const calledB = await queueService.callNextPatient(queue.queueId);
      expect(calledB.id).toBe(joinedB.entry.id);
      expect(calledB.status).toBe("CALLED");

      const statusB = await getPatientStatus(joinedB.entry.id, queueService);
      expect(statusB.entryStatus).toBe("CALLED");
      expect(statusB.currentServingToken).toBe(2);

      // --- Domain events: exactly one per successful mutation --------------
      const eventTypes = (await queueService.getQueueEvents(queue.queueId)).map(
        (e) => e.eventType
      );
      expect(eventTypes.filter((t) => t === "QUEUE_JOINED")).toHaveLength(2);
      expect(eventTypes.filter((t) => t === "PATIENT_CALLED")).toHaveLength(2);
      expect(eventTypes.filter((t) => t === "CONSULTATION_STARTED")).toHaveLength(1);
      expect(eventTypes.filter((t) => t === "CONSULTATION_COMPLETED")).toHaveLength(1);

      // --- Realtime stream: one coarse event per mutation -------------------
      expect(realtime.map((e) => e.type)).toEqual([
        "QUEUE_UPDATED",
        "QUEUE_UPDATED",
        "QUEUE_UPDATED",
        "QUEUE_ENTRY_UPDATED",
        "QUEUE_ENTRY_UPDATED",
        "QUEUE_UPDATED",
      ]);

      // --- Notifications: patient A received exactly the three expected -----
      const notificationsA = await notificationRepository.listByUser(patientA);
      expect(notificationsA.map((n) => n.type).sort()).toEqual([
        "CONSULTATION_STARTED",
        "PATIENT_CALLED",
        "QUEUE_JOINED",
      ]);
      expect(
        notificationsA.every(
          (n) =>
            n.channel === "IN_APP" &&
            n.queueId === queue.queueId &&
            n.entryId === joinedA.entry.id &&
            n.eventId !== undefined &&
            n.dedupeKey == null
        )
      ).toBe(true);

      const joinedMessageA = notificationsA.find(
        (n) => n.type === "QUEUE_JOINED"
      )!.message;
      // The Prisma repository does not populate the doctor, so the join
      // message falls back to the clinic phrasing.
      expect(joinedMessageA).toBe(
        "You have joined the clinic queue. Your token is A-1."
      );
      const calledMessageA = notificationsA.find(
        (n) => n.type === "PATIENT_CALLED"
      )!.message;
      expect(calledMessageA).toContain("A-1 is being called");

      // --- Notifications: patient B saw the join plus the call --------------
      const notificationsB = await notificationRepository.listByUser(patientB);
      const joinedBMessage = notificationsB.find(
        (n) => n.type === "QUEUE_JOINED"
      )!.message;
      expect(joinedBMessage).toContain("A-2");
      expect(
        notificationsB.some((n) => n.type === "PATIENT_CALLED")
      ).toBe(true);
      expect(
        notificationsB.some(
          (n) => n.type === "TURN_APPROACHING" && n.message.includes("1 patient ahead")
        )
      ).toBe(true);

      // --- No completion notification exists for a completed consultation ---
      const allTypes = [...notificationsA, ...notificationsB].map(
        (n) => n.type
      );
      expect(allTypes).toContain("CONSULTATION_STARTED");
      expect(allTypes).not.toContain("QUEUE_COMPLETED");
      expect(allTypes).not.toContain("QUEUE_CANCELLED");

      // --- Mark-as-read scoping ---------------------------------------------
      expect(await notificationService.getUnreadCount(patientA)).toBe(3);
      const joinedIdA = notificationsA.find(
        (n) => n.type === "QUEUE_JOINED"
      )!.id;
      expect(await notificationService.markAsRead(joinedIdA, patientB)).toBe(false);
      expect(
        (await notificationRepository.listByUser(patientA)).find(
          (n) => n.type === "QUEUE_JOINED"
        )!.readAt
      ).toBeNull();
      expect(await notificationService.markAsRead(joinedIdA, patientA)).toBe(true);
      expect(
        (await notificationRepository.listByUser(patientA)).find(
          (n) => n.type === "QUEUE_JOINED"
        )!.readAt
      ).not.toBeNull();
      expect(await notificationService.getUnreadCount(patientA)).toBe(2);

      // --- Final queue statistics -------------------------------------------
      const counts = await queueService.getQueueStatusCounts(queue.queueId);
      expect(counts).toMatchObject({
        waiting: 0,
        called: 1,
        inConsultation: 0,
        completed: 1,
        noShow: 0,
        cancelled: 0,
      });
    } finally {
      subscription.unsubscribe();
      await queue.cleanup();
    }
  }, 30_000);

  it("handles a no-show and rejects joins into a paused queue", async () => {
    const { queueService, notificationRepository } = buildPostgresStack();
    const patientC = `flow-c-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      patientIds: [patientC],
      averageConsultationMinutes: 7,
    });

    try {
      const joined = await queueService.joinQueue({
        queueId: queue.queueId,
        patientId: patientC,
      });

      await queueService.callNextPatient(queue.queueId);
      const marked = await queueService.markNoShow(joined.entry.id);
      expect(marked.status).toBe("NO_SHOW");

      await expect(
        queueService.callNextPatient(queue.queueId)
      ).rejects.toThrow();

      const notifications = await notificationRepository.listByUser(patientC);
      const noShow = notifications.find((n) => n.type === "NO_SHOW");
      expect(noShow).toBeDefined();
      expect(noShow!.message).toContain("no-show");
      expect(noShow!.title).toBe("Missed your turn");

      const eventTypes = (await queueService.getQueueEvents(queue.queueId)).map(
        (e) => e.eventType
      );
      expect(eventTypes.filter((t) => t === "PATIENT_NO_SHOW")).toHaveLength(1);

      // A paused queue refuses new joins at the service layer.
      await queueService.pauseQueue(queue.queueId);
      await expect(
        queueService.joinQueue({
          queueId: queue.queueId,
          patientId: `flow-d-${randomUUID()}`,
        })
      ).rejects.toThrow();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);
});