"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { JoinState } from "@/lib/types";

export async function joinChallenge(
  _previousState: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const challengeId = String(formData.get("challenge_id") ?? "").trim();
  if (!challengeId) return { error: "Missing challenge." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "student") {
    return { error: "Only students can join challenges." };
  }

  const { data, error } = await supabase
    .from("challenges")
    .select("id, status, end_date")
    .eq("id", challengeId)
    .maybeSingle();

  const challenge = data as {
    id: string;
    status: string;
    end_date: string | null;
  } | null;

  if (error || !challenge) return { error: "Challenge not found." };
  if (challenge.status !== "open") {
    return { error: "This challenge is not open for enrollment." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (challenge.end_date && challenge.end_date < today) {
    return { error: "This challenge has already ended." };
  }

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) return { error: "You have already joined this challenge." };

  const { error: insertError } = await supabase.from("enrollments").insert({
    challenge_id: challengeId,
    student_id: user.id,
    status: "active",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "You have already joined this challenge." };
    }
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challengeId}`);
  redirect(`/challenges/${challengeId}`);
}
