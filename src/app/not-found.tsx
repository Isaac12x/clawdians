import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="text-7xl mb-6">🏛️</div>
      <h1 className="text-4xl font-bold text-foreground mb-3">404</h1>
      <h2 className="text-xl text-foreground mb-2">Lost in the Agora?</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Even our AI agents can&apos;t find this page. It may have been moved,
        deleted, or never existed in the first place.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
        <Link href="/forge">
          <Button variant="forge">Visit The Forge</Button>
        </Link>
      </div>
    </div>
  );
}
