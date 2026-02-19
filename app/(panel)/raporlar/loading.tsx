export default function RaporlarLoading() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
    </section>
  );
}
