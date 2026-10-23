import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileForm } from "@/components/profile-form";
import { completeOnboarding } from "@/app/onboarding/actions";
import { requireProfile } from "@/lib/auth";

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <header className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            ProofHire
          </span>
          <SignOutButton />
        </header>

        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading onboarding…</p>}
        >
          <OnboardingContent />
        </Suspense>
      </div>
    </main>
  );
}

async function OnboardingContent() {
  const { profile } = await requireProfile();

  // Only students onboard, and only once.
  if (profile.role !== "student") redirect("/challenges");
  if (profile.onboarding_completed) redirect("/challenges");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
          Student onboarding
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Set up your profile
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Companies see this when you join challenges. It takes about a minute.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <ProfileForm
          action={completeOnboarding}
          profile={profile}
          mode="onboarding"
        />
      </div>
    </div>
  );
}
