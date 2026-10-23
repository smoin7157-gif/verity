const styles: Record<string, string> = {
  open: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  draft: "border-zinc-600 bg-zinc-800 text-zinc-300",
  closed: "border-red-500/30 bg-red-500/10 text-red-300",
  active: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  dropped: "border-zinc-600 bg-zinc-800 text-zinc-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? "border-zinc-700 bg-zinc-800 text-zinc-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}
