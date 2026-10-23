/** Formats a Postgres `date` (YYYY-MM-DD) without timezone drift. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "TBD";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return "Dates TBD";
  if (!start) return `Ends ${formatDate(end)}`;
  if (!end) return `Starts ${formatDate(start)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}
