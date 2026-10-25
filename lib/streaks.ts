import {
  addDays,
  elapsedDays,
  isDateOnly,
  todayInKolkata,
} from "@/lib/dates";

export type CheckinSummary = {
  current: number;
  longest: number;
  total: number;
  /** 0–1 ratio; format with `Math.round(rate * 100)` for display. */
  rate: number;
  elapsedDays: number;
};

function uniqueDates(dates: readonly string[]): string[] {
  return Array.from(new Set(dates.filter(isDateOnly))).sort();
}

/**
 * Consecutive check-in days ending today. When today has no check-in yet, the
 * streak is counted up to yesterday so it does not collapse to 0 during the day.
 */
export function currentStreak(
  checkinDates: readonly string[],
  today: string = todayInKolkata(),
): number {
  const dates = new Set(uniqueDates(checkinDates));

  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** Longest run of consecutive check-in days in the enrollment's history. */
export function longestStreak(checkinDates: readonly string[]): number {
  const dates = uniqueDates(checkinDates);

  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of dates) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return longest;
}

export function totalCheckins(checkinDates: readonly string[]): number {
  return uniqueDates(checkinDates).length;
}

/**
 * Check-ins divided by the challenge days elapsed so far (start day through
 * today, never past the end date). Returns 0 when the challenge has not started.
 */
export function checkinRate(
  checkinDates: readonly string[],
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string = todayInKolkata(),
): number {
  const days = elapsedDays(startDate, endDate, today);
  if (days <= 0) return 0;

  return Math.min(1, totalCheckins(checkinDates) / days);
}

/** Everything the workspace and admin tables show about one enrollment. */
export function checkinSummary(
  checkinDates: readonly string[],
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string = todayInKolkata(),
): CheckinSummary {
  return {
    current: currentStreak(checkinDates, today),
    longest: longestStreak(checkinDates),
    total: totalCheckins(checkinDates),
    rate: checkinRate(checkinDates, startDate, endDate, today),
    elapsedDays: elapsedDays(startDate, endDate, today),
  };
}
