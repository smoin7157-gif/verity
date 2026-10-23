import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Returns the Supabase client and the signed-in user, or redirects home. */
export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}

/** Returns the signed-in user's profile, or redirects to login. */
export async function requireProfile() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("profiles")
    .select("id, github_username, full_name, college, skills, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;

  if (!profile) {
    redirect("/");
  }

  return { supabase, user, profile };
}

/** Admin-only guard used by /admin routes. Non-admins go to the dashboard. */
export async function requireAdmin() {
  const context = await requireProfile();

  if (context.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return context;
}
