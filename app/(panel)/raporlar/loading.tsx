import { Skeleton } from "@/components/ui/skeleton";

export default function RaporlarLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </section>
  );
}
