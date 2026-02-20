import { Skeleton } from "@/components/ui/skeleton";

export default function OgrencilerLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-11 w-40 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </section>
  );
}
