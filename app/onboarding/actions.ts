"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseProfileForm } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { ProfileFormState } from "@/lib/types";

export async function completeOnboarding(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const parsed = parseProfileForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, onboarding_completed: true })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/challenges");
  redirect("/challenges");
}
