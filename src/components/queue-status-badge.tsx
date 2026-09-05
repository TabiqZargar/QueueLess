import { Badge } from "./ui/badge";

export function queueStatusText(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Open";
    case "PAUSED":
      return "Paused";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Not Started";
  }
}

export function QueueStatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE"
      ? "success"
      : status === "PAUSED"
      ? "warning"
      : status === "CANCELLED"
      ? "danger"
      : "default";

  return <Badge variant={variant}>{queueStatusText(status)}</Badge>;
}