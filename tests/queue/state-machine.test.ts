import { describe, expect, it } from "vitest";
import { QueueEntryStatus } from "@/types";
import {
  canTransition,
  canTransitionQueueStatus,
  validateEntryTransition,
} from "@/lib/queue/state-machine";

describe("canTransition", () => {
  const valid: [QueueEntryStatus, QueueEntryStatus][] = [
    ["REGISTERED", "WAITING"],
    ["WAITING", "CALLED"],
    ["WAITING", "CANCELLED"],
    ["WAITING", "NO_SHOW"],
    ["CALLED", "IN_CONSULTATION"],
    ["CALLED", "NO_SHOW"],
    ["IN_CONSULTATION", "COMPLETED"],
  ];

  valid.forEach(([from, to]) => {
    it(`allows ${from} -> ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  const invalid: [QueueEntryStatus, QueueEntryStatus][] = [
    ["COMPLETED", "WAITING"],
    ["CANCELLED", "CALLED"],
    ["NO_SHOW", "IN_CONSULTATION"],
    ["WAITING", "COMPLETED"],
    ["REGISTERED", "CALLED"],
    ["COMPLETED", "IN_CONSULTATION"],
    ["NO_SHOW", "WAITING"],
    ["CALLED", "WAITING"],
    ["CANCELLED", "WAITING"],
    ["IN_CONSULTATION", "WAITING"],
    ["CALLED", "COMPLETED"],
  ];

  invalid.forEach(([from, to]) => {
    it(`rejects ${from} -> ${to}`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  it("validateEntryTransition does not throw for valid transition", () => {
    expect(() => validateEntryTransition("CALLED", "IN_CONSULTATION")).not.toThrow();
  });

  it("validateEntryTransition throws for invalid transition", () => {
    expect(() => validateEntryTransition("COMPLETED", "WAITING")).toThrow(
      "Invalid transition"
    );
  });
});

describe("canTransitionQueueStatus", () => {
  it("allows ACTIVE -> PAUSED", () => {
    expect(canTransitionQueueStatus("ACTIVE", "PAUSED")).toBe(true);
  });

  it("allows PAUSED -> ACTIVE", () => {
    expect(canTransitionQueueStatus("PAUSED", "ACTIVE")).toBe(true);
  });

  it("allows ACTIVE -> COMPLETED", () => {
    expect(canTransitionQueueStatus("ACTIVE", "COMPLETED")).toBe(true);
  });

  it("rejects ACTIVE -> NOT_STARTED", () => {
    expect(canTransitionQueueStatus("ACTIVE", "NOT_STARTED")).toBe(false);
  });

  it("rejects COMPLETED -> ACTIVE", () => {
    expect(canTransitionQueueStatus("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("rejects PAUSED -> NOT_STARTED", () => {
    expect(canTransitionQueueStatus("PAUSED", "NOT_STARTED")).toBe(false);
  });
});
