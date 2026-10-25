"use client";

import { useActionState } from "react";
import { syncNow } from "@/app/challenges/[id]/workspace/actions";
import type { SyncState } from "@/lib/types";

const initialState: SyncState = { error: null, success: null };

export function SyncButton({
  challengeId,
  cooldownRemainingMs,
}: {
  challengeId: string;
  cooldownRemainingMs: number;
}) {
  const [state, formAction, pending] = useActionState<SyncState, FormData>(
    syncNow,
    initialState,
  );

  const cooldownMinutes = Math.max(1, Math.ceil(cooldownRemainingMs / 60_000));
  const coolingDown = cooldownRemainingMs > 0;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="challenge_id" value={challengeId} />
      <button
        type="submit"
        disabled={pending || coolingDown}
        className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Syncing…" : coolingDown ? "Sync again soon" : "Sync now"}
      </button>

      {coolingDown ? (
        <p className="text-xs text-zinc-500">
          Manual sync is limited to once every 10 minutes. Try again in about{" "}
          {cooldownMinutes} minute{cooldownMinutes === 1 ? "" : "s"}.
        </p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-emerald-300">{state.success}</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
