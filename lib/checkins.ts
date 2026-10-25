import { z } from "zod";
import { checkinWindow } from "@/lib/dates";
import { formatDate } from "@/lib/format";

export const CHECKIN_MIN_DID_LENGTH = 10;
export const CHECKIN_MAX_LENGTH = 1000;

export const checkinSchema = z.object({
  did: z
    .string()
    .trim()
    .min(
      CHECKIN_MIN_DID_LENGTH,
      `Describe what you did — at least ${CHECKIN_MIN_DID_LENGTH} characters.`,
    )
    .max(CHECKIN_MAX_LENGTH, "Keep your update under 1000 characters."),
  blocked: z
    .string()
    .trim()
    .max(CHECKIN_MAX_LENGTH, "Keep this under 1000 characters."),
  next: z
    .string()
    .trim()
    .min(1, "Add what you plan to do next.")
    .max(CHECKIN_MAX_LENGTH, "Keep this under 1000 characters."),
});

export type CheckinInput = Omit<z.infer<typeof checkinSchema>, "blocked"> & {
  blocked: string | null;
};

type ParseResult =
  | { success: true; data: CheckinInput }
  | { success: false; error: string };

/** Validates the daily check-in form and normalises the optional blocker. */
export function parseCheckinForm(formData: FormData): ParseResult {
  const result = checkinSchema.safeParse({
    did: formData.get("did") ?? "",
    blocked: formData.get("blocked") ?? "",
    next: formData.get("next") ?? "",
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Please check the form.",
    };
  }

  return {
    success: true,
    data: {
      ...result.data,
      blocked: result.data.blocked || null,
    },
  };
}

/** Human-readable reason why check-ins are closed, or null when they are open. */
export function checkinClosedMessage(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today?: string,
): string | null {
  switch (checkinWindow(startDate, endDate, today)) {
    case "open":
      return null;
    case "before":
      return `Check-ins open on ${formatDate(startDate)}.`;
    case "after":
      return `This challenge ended on ${formatDate(endDate)}. Check-ins are closed.`;
    default:
      return "This challenge has no start date yet, so check-ins are not open.";
  }
}
