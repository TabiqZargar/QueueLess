import { describe, expect, it } from "vitest";
import { QueueEntry } from "@/types";
import {
  calculateEstimatedWait,
  calculateQueuePosition,
  countPatientsAhead,
  getCurrentServingToken,
  countWaiting,
} from "@/lib/queue/calculations";

function makeEntry(
  id: string,
  tokenNumber: number,
  status: QueueEntry["status"]
): QueueEntry {
  return {
    id,
    queueId: "queue-1",
    patientId: `patient-${tokenNumber}`,
    tokenNumber,
    entryType: "APPOINTMENT",
    status,
    joinedAt: new Date(),
  };
}

describe("calculateEstimatedWait", () => {
  it("returns 0 for 0 patients ahead", () => {
    expect(calculateEstimatedWait(0, 7)).toBe(0);
  });

  it("returns consultation duration for 1 patient ahead", () => {
    expect(calculateEstimatedWait(1, 7)).toBe(7);
  });

  it("multiplies patients ahead by average consultation duration", () => {
    expect(calculateEstimatedWait(6, 7)).toBe(42);
  });

  it("returns 0 for zero consultation duration", () => {
    expect(calculateEstimatedWait(5, 0)).toBe(0);
  });

  it("handles negative patients ahead safely", () => {
    expect(calculateEstimatedWait(-1, 7)).toBe(0);
  });

  it("handles negative consultation duration safely", () => {
    expect(calculateEstimatedWait(3, -5)).toBe(0);
  });
});

describe("countPatientsAhead", () => {
  const entries = [
    makeEntry("a", 1, "COMPLETED"),
    makeEntry("b", 2, "COMPLETED"),
    makeEntry("c", 3, "IN_CONSULTATION"),
    makeEntry("d", 4, "WAITING"),
    makeEntry("e", 5, "WAITING"),
    makeEntry("f", 6, "CANCELLED"),
    makeEntry("g", 7, "WAITING"),
    makeEntry("h", 8, "NO_SHOW"),
  ];

  it("counts active patients ahead of target", () => {
    expect(countPatientsAhead(entries, "e")).toBe(1);
  });

  it("returns 0 for the first waiting patient", () => {
    expect(countPatientsAhead(entries, "d")).toBe(0);
  });

  it("excludes completed patients", () => {
    expect(countPatientsAhead(entries, "c")).toBe(0);
  });

  it("excludes cancelled patients", () => {
    expect(countPatientsAhead(entries, "g")).toBe(2);
  });

  it("excludes no-show patients", () => {
    const withNoShowAfter = [
      ...entries,
      makeEntry("i", 9, "WAITING"),
      makeEntry("j", 10, "NO_SHOW"),
    ];
    expect(countPatientsAhead(withNoShowAfter, "i")).toBe(3);
  });

  it("returns -1 for unknown entry", () => {
    expect(countPatientsAhead(entries, "zz")).toBe(-1);
  });
});

describe("calculateQueuePosition", () => {
  const entries = [
    makeEntry("a", 1, "COMPLETED"),
    makeEntry("b", 2, "WAITING"),
    makeEntry("c", 3, "WAITING"),
    makeEntry("d", 4, "NO_SHOW"),
    makeEntry("e", 5, "WAITING"),
  ];

  it("returns position 1 for first waiting patient", () => {
    expect(calculateQueuePosition(entries, "b")).toBe(1);
  });

  it("returns middle position", () => {
    expect(calculateQueuePosition(entries, "c")).toBe(2);
  });

  it("returns last position", () => {
    expect(calculateQueuePosition(entries, "e")).toBe(3);
  });
});

describe("getCurrentServingToken", () => {
  it("returns in-consultation token when present", () => {
    const entries = [
      makeEntry("a", 1, "COMPLETED"),
      makeEntry("b", 2, "IN_CONSULTATION"),
      makeEntry("c", 3, "WAITING"),
    ];
    expect(getCurrentServingToken(entries)).toBe(2);
  });

  it("returns called token when in consultation absent", () => {
    const entries = [
      makeEntry("a", 1, "COMPLETED"),
      makeEntry("b", 2, "CALLED"),
      makeEntry("c", 3, "WAITING"),
    ];
    expect(getCurrentServingToken(entries)).toBe(2);
  });

  it("returns last completed token when none called", () => {
    const entries = [
      makeEntry("a", 1, "COMPLETED"),
      makeEntry("b", 2, "COMPLETED"),
      makeEntry("c", 3, "WAITING"),
    ];
    expect(getCurrentServingToken(entries)).toBe(2);
  });

  it("returns null when no active or completed entries", () => {
    const entries = [makeEntry("a", 1, "CANCELLED")];
    expect(getCurrentServingToken(entries)).toBeNull();
  });
});

describe("countWaiting", () => {
  it("counts only WAITING entries", () => {
    const entries = [
      makeEntry("a", 1, "WAITING"),
      makeEntry("b", 2, "CALLED"),
      makeEntry("c", 3, "WAITING"),
      makeEntry("d", 4, "IN_CONSULTATION"),
      makeEntry("e", 5, "WAITING"),
    ];
    expect(countWaiting(entries)).toBe(3);
  });
});
