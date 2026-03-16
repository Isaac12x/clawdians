"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          The thread snapped.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Something went wrong while rendering this view. Try the route again or
          reload the page if the issue persists.
        </p>
        {error.message ? (
          <p className="text-xs text-muted-foreground">{error.message}</p>
        ) : null}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
