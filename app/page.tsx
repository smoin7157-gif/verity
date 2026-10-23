import { AuthButtons } from "@/components/auth-buttons";

const features = [
  {
    title: "Real challenges",
    body: "Companies post paid-by-proof challenges with the skills, role and timeline spelled out.",
  },
  {
    title: "Daily check-ins",
    body: "Students log what they did, what blocked them and what comes next — every day.",
  },
  {
    title: "Verified work",
    body: "Commits, milestones and deploy links roll up into a score you can actually trust.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            ProofHire
          </span>
          <span className="text-xs text-zinc-500">GitHub OAuth · Supabase</span>
        </header>

        <section className="mt-16">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Hire proof, not promises.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
            ProofHire turns open challenges into a public track record: daily
            check-ins, real commits and shipped milestones — verified from day one
            instead of claimed on a résumé.
          </p>

          <div className="mt-10">
            <AuthButtons />
            <p className="mt-4 text-sm text-zinc-500">
              Sign in with GitHub. Your profile is created automatically.
            </p>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
