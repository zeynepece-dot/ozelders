import { Skeleton } from "@/components/ui/skeleton";

export default function AyarlarLoading() {
  return (
    <section className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </section>
  );
}
