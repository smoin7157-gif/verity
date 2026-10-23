"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type {
  ChallengeAction,
  ChallengeDefaults,
  ChallengeFormState,
  CompanyOption,
} from "@/lib/types";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export function ChallengeForm({
  action,
  companies,
  challenge,
  submitLabel,
}: {
  action: ChallengeAction;
  companies: CompanyOption[];
  challenge?: ChallengeDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    ChallengeFormState,
    FormData
  >(action, { error: null });

  const [companyId, setCompanyId] = useState(
    challenge?.company_id ?? companies[0]?.id ?? "new",
  );
  const creatingCompany = companyId === "new";

  return (
    <form action={formAction} className="space-y-6">
      {challenge ? <input type="hidden" name="id" value={challenge.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="company_id" className={labelClass}>
            Company
          </label>
          {companies.length > 0 ? (
            <select
              id="company_id"
              name="company_id"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className={inputClass}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
              <option value="new">+ Create new company</option>
            </select>
          ) : (
            <>
              <input type="hidden" name="company_id" value="new" />
              <p className="mt-1 text-sm text-zinc-500">
                No companies yet — add the first one.
              </p>
            </>
          )}
        </div>

        {creatingCompany ? (
          <div>
            <label htmlFor="new_company_name" className={labelClass}>
              New company name
            </label>
            <input
              id="new_company_name"
              name="new_company_name"
              required
              placeholder="Acme Labs"
              className={inputClass}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={challenge?.title ?? ""}
            placeholder="Backend Intern"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="role" className={labelClass}>
            Role
          </label>
          <input
            id="role"
            name="role"
            required
            defaultValue={challenge?.role ?? ""}
            placeholder="Backend Engineer"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="required_skills" className={labelClass}>
          Required skills
        </label>
        <input
          id="required_skills"
          name="required_skills"
          defaultValue={(challenge?.required_skills ?? []).join(", ")}
          placeholder="TypeScript, Node.js, PostgreSQL"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Separate skills with commas — they are saved as a text array.
        </p>
      </div>

      <div>
        <label htmlFor="problem_statement" className={labelClass}>
          Problem statement
        </label>
        <textarea
          id="problem_statement"
          name="problem_statement"
          rows={6}
          defaultValue={challenge?.problem_statement ?? ""}
          placeholder="What should the student build, and how will it be evaluated?"
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="start_date" className={labelClass}>
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={challenge?.start_date ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="end_date" className={labelClass}>
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={challenge?.end_date ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={challenge?.status ?? "open"}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
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
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/challenges"
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
