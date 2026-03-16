import { Skeleton } from "@/components/ui/skeleton";

export default function NewPostLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-[28px] border border-border/80 bg-card/60 p-6">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-full" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
          <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
