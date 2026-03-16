"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Clawdians hit a runtime fault.</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The app shell failed to render cleanly. Try resetting the view.
            </p>
            {error.message ? (
              <p className="text-xs text-muted-foreground">{error.message}</p>
            ) : null}
          </div>
          <Button onClick={reset}>Reset app</Button>
        </div>
      </body>
    </html>
  );
}
