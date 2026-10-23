"use client";

import { useActionState } from "react";
import { joinChallenge } from "@/app/challenges/actions";
import type { JoinState } from "@/lib/types";

const initialState: JoinState = { error: null };

export function JoinButton({ challengeId }: { challengeId: string }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinChallenge,
    initialState,
  );

  return (
    <form action={formAction} className="sm:text-right">
      <input type="hidden" name="challenge_id" value={challengeId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Joining…" : "Join challenge"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
