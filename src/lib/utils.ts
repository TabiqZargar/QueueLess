export function formatToken(tokenNumber: number): string {
  return `#${tokenNumber.toString().padStart(3, "0")}`;
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) {
    return "Less than a minute";
  }
  if (minutes < 60) {
    return `~${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `~${hours} hr`;
  }
  return `~${hours} hr ${remainingMinutes} min`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
