"use client";

import { StaffCurrentPatient } from "@/lib/queue/queue-service";
import { Badge } from "@/components/ui/badge";
import { formatQueueToken } from "@/lib/utils";
import type { DoctorQueueState } from "../get-doctor-data";

interface CurrentPatientProps {
  currentPatient: StaffCurrentPatient | null;
  queueStatus: DoctorQueueState;
}

function minutesAgo(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function formatElapsed(date: Date): string {
  const minutes = minutesAgo(date);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ${minutes % 60} min ago`;
}

export function CurrentPatientCard({
  currentPatient,
  queueStatus,
}: CurrentPatientProps) {
  if (!currentPatient) {
    return (
      <section
        className="rounded-xl border border-gray-200 bg-white shadow-sm"
        aria-labelledby="doctor-current-patient-heading"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2
            id="doctor-current-patient-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Current Patient
          </h2>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-base font-medium text-gray-700">
            No patient currently assigned.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Waiting for the next patient to be called.
          </p>
        </div>
      </section>
    );
  }

  const isCalled = currentPatient.status === "CALLED";
  const statusLabel = isCalled ? "Called" : "In consultation";
  const statusVariant = isCalled ? "warning" : "info";

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      aria-labelledby="doctor-current-patient-heading"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2
          id="doctor-current-patient-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Current Patient
        </h2>
      </div>
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold text-gray-900">
            {formatQueueToken(currentPatient.tokenNumber)}
          </span>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <p className="mt-2 text-base font-medium text-gray-700">
          {currentPatient.patientName}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {isCalled
            ? currentPatient.calledAt
              ? `Called ${formatElapsed(currentPatient.calledAt)}`
              : "Ready for consultation"
            : currentPatient.consultationStartedAt
              ? `Consultation started ${formatElapsed(currentPatient.consultationStartedAt)}`
              : "Consultation in progress"}
        </p>

        {queueStatus !== "ACTIVE" && queueStatus !== "PAUSED" && (
          <p className="mt-4 text-sm text-gray-500">
            This queue is no longer active. No consultation actions are
            available.
          </p>
        )}
      </div>
    </section>
  );
}