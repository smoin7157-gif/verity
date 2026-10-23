"use client";

import Link from "next/link";
import { useActionState, useState, type KeyboardEvent } from "react";
import type { Profile, ProfileAction, ProfileFormState } from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500";
const labelClass = "block text-sm font-medium text-zinc-300";

const SUGGESTED_SKILLS = [
  "Python",
  "React",
  "Node.js",
  "SQL",
  "Java",
  "ML",
  "Docker",
];

const YEARS = [1, 2, 3, 4, 5, 6];

export function ProfileForm({
  action,
  profile,
  mode,
}: {
  action: ProfileAction;
  profile: Profile;
  mode: "onboarding" | "edit";
}) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(action, { error: null });

  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [draft, setDraft] = useState("");
  const [bio, setBio] = useState(profile.bio ?? "");

  function addSkill(raw: string) {
    const value = raw.trim().replace(/,+$/, "").trim();
    if (!value) return;

    setSkills((current) =>
      current.some((skill) => skill.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value],
    );
    setDraft("");
  }

  function removeSkill(skill: string) {
    setSkills((current) => current.filter((item) => item !== skill));
  }

  function handleSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(draft);
    }
  }

  const suggestions = SUGGESTED_SKILLS.filter(
    (suggestion) =>
      !skills.some(
        (skill) => skill.toLowerCase() === suggestion.toLowerCase(),
      ),
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="github" className={labelClass}>
            GitHub
          </label>
          <input
            id="github"
            readOnly
            value={
              profile.github_username
                ? `@${profile.github_username}`
                : "Not linked"
            }
            className={`${inputClass} cursor-not-allowed text-zinc-400`}
            aria-describedby="github-hint"
          />
          <p id="github-hint" className="mt-1 text-xs text-zinc-500">
            From your GitHub login — this cannot be changed.
          </p>
        </div>
        <div>
          <label htmlFor="full_name" className={labelClass}>
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={profile.full_name ?? ""}
            placeholder="Sam Student"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="college" className={labelClass}>
            College
          </label>
          <input
            id="college"
            name="college"
            required
            defaultValue={profile.college ?? ""}
            placeholder="State University"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="branch" className={labelClass}>
            Branch
          </label>
          <input
            id="branch"
            name="branch"
            required
            defaultValue={profile.branch ?? ""}
            placeholder="Computer Science"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="year_of_study" className={labelClass}>
            Year of study
          </label>
          <select
            id="year_of_study"
            name="year_of_study"
            required
            defaultValue={profile.year_of_study ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select year
            </option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={profile.phone ?? ""}
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="skills-input" className={labelClass}>
          Skills
        </label>
        <div className="mt-1 rounded-lg border border-zinc-700 bg-zinc-950 p-2 transition-colors focus-within:border-emerald-500">
          {skills.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="text-zinc-500 transition-colors hover:text-red-400"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <input
            id="skills-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter"
            className="mt-2 w-full bg-transparent px-1 py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />

          {skills.map((skill) => (
            <input key={skill} type="hidden" name="skills" value={skill} />
          ))}
        </div>

        {suggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addSkill(suggestion)}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-emerald-500/60 hover:text-emerald-300"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {skills.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">Add at least one skill.</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="linkedin_url" className={labelClass}>
          LinkedIn URL <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          defaultValue={profile.linkedin_url ?? ""}
          placeholder="https://www.linkedin.com/in/your-handle"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>
          Short bio
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          rows={4}
          maxLength={300}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="What are you studying, what have you built, and what do you want to work on?"
          className={inputClass}
        />
        <p className="mt-1 text-right text-xs text-zinc-500">{bio.length}/300</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending
            ? "Saving…"
            : mode === "onboarding"
              ? "Complete onboarding"
              : "Save profile"}
        </button>
        {mode === "edit" ? (
          <Link
            href="/profile"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Cancel
          </Link>
        ) : (
          <span className="text-xs text-zinc-500">
            You can edit this later from your profile.
          </span>
        )}
      </div>
    </form>
  );
}
