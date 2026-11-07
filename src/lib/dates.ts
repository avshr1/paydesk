// Invoice dates are calendar days, stored as midnight UTC.

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

// For moments in time, like when an email was sent. Labelled UTC, because the
// server doesn't know the viewer's time zone.
export function formatTimestamp(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}
