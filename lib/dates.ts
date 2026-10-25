/**
 * Date helpers for the whole app.
 *
 * ProofHire runs on India time: "today" means today in Asia/Kolkata, not UTC.
 * Postgres uses the same definition in `public.kolkata_today()` (0007).
 */

export const APP_TIME_ZONE = "Asia/Kolkata";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in Asia/Kolkata as `YYYY-MM-DD`. */
export function todayInKolkata(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Adds (or subtracts) calendar days to a `YYYY-MM-DD` date. */
export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  return Math.round((end - start) / 86_400_000);
}

/**
 * Days of the challenge that have elapsed, counting the start day and today.
 * The count stops at `end_date`, is 0 before the challenge starts, and ignores
 * challenges without a start date.
 */
export function elapsedDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string = todayInKolkata(),
): number {
  if (!startDate || !isDateOnly(startDate)) return 0;

  const lastDay = endDate && isDateOnly(endDate) && endDate < today ? endDate : today;
  if (diffDays(startDate, lastDay) < 0) return 0;

  return diffDays(startDate, lastDay) + 1;
}

export type CheckinWindow = "open" | "before" | "after" | "undated";

/**
 * Whether a challenge accepts check-ins today: between `start_date` and
 * `end_date` inclusive. `undated` means the challenge has no start date, which
 * the app treats as not started yet.
 */
export function checkinWindow(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string = todayInKolkata(),
): CheckinWindow {
  if (!startDate || !isDateOnly(startDate)) return "undated";
  if (endDate && isDateOnly(endDate) && today > endDate) return "after";
  if (today < startDate) return "before";
  return "open";
}
