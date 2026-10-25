import type { NextRequest } from "next/server";
import { syncAllEnrollments } from "@/lib/github-sync";

export const maxDuration = 60;

/**
 * Syncs every active enrollment that has a repository linked.
 *
 * Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically; manual calls can use `x-cron-secret`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (headerSecret !== secret && bearer !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncAllEnrollments();
    return Response.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron sync failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
