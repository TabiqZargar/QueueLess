import { describe, expect, it } from "vitest";
import { db } from "../../prisma/db";
import { PrismaNotificationRepository } from "../../src/lib/notifications/prisma-repository";
import { PrismaQueueRepository } from "../../src/lib/queue/prisma-repository";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("Prisma repositories", () => {
  it("reads durable queue state through a fresh repository instance", async () => {
    const firstRepository = new PrismaQueueRepository();
    const secondRepository = new PrismaQueueRepository();

    const firstQueue = await firstRepository.getQueue("queue-1");
    const secondQueue = await secondRepository.getQueue("queue-1");

    expect(firstQueue?.id).toBe("queue-1");
    expect(secondQueue?.id).toBe(firstQueue?.id);
  });

  it("deduplicates event notifications through the database constraint", async () => {
    const repository = new PrismaNotificationRepository();
    const eventId = `database-test-${crypto.randomUUID()}`;
    let notificationId: string | undefined;

    try {
      const first = await repository.create({
        userId: "patient-1",
        type: "PATIENT_CALLED",
        title: "Database test",
        message: "Database test notification",
        channel: "IN_APP",
        eventId,
      });
      notificationId = first.id;

      const second = await repository.create({
        userId: "patient-1",
        type: "PATIENT_CALLED",
        title: "Database test duplicate",
        message: "Database test duplicate notification",
        channel: "IN_APP",
        eventId,
      });

      expect(second.id).toBe(first.id);
    } finally {
      if (notificationId) {
        await db.orm.public.Notification.where({ id: notificationId }).delete();
      }
    }
  });
});
