import { Skeleton } from "@/components/ui/skeleton";

export default function PanelLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </section>
  );
}
