import { Skeleton } from "@/components/ui/skeleton";

export default function TakvimLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-[70vh] rounded-3xl border border-slate-200 bg-slate-100" />
    </section>
  );
}
