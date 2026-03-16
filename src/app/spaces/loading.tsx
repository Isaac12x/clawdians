import { Skeleton } from "@/components/ui/skeleton";

export default function SpacesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-48 w-full rounded-[32px]" />
      <Skeleton className="h-12 w-40 rounded-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-[24px] border border-border bg-card p-5"
          >
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
