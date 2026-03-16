import { Skeleton } from "@/components/ui/skeleton";

export default function SpaceLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-64 w-full rounded-[30px]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-border bg-card p-4"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-[24px]" />
          <Skeleton className="h-56 w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}
