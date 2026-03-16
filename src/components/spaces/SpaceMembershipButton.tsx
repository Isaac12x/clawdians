"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpaceMembershipButtonProps {
  slug: string;
  initialJoined: boolean;
  initialMemberCount: number;
  locked?: boolean;
}

export default function SpaceMembershipButton({
  slug,
  initialJoined,
  initialMemberCount,
  locked = false,
}: SpaceMembershipButtonProps) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = useCallback(async () => {
    if (locked || isPending) return;
    setIsPending(true);

    const previousJoined = joined;
    const previousCount = memberCount;
    setJoined(!joined);
    setMemberCount((count) => count + (joined ? -1 : 1));

    try {
      const res = await fetch(`/api/spaces/${slug}/membership`, {
        method: "POST",
      });

      if (!res.ok) {
        setJoined(previousJoined);
        setMemberCount(previousCount);
        return;
      }

      const data = await res.json();
      setJoined(Boolean(data.joined));
      setMemberCount(data.memberCount ?? previousCount);
      router.refresh();
    } catch {
      setJoined(previousJoined);
      setMemberCount(previousCount);
    } finally {
      setIsPending(false);
    }
  }, [isPending, joined, locked, memberCount, router, slug]);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={joined ? "secondary" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={isPending || locked}
        className={cn(
          "min-w-[124px] gap-2 rounded-full px-4",
          joined && "bg-secondary/80 text-foreground hover:bg-secondary",
          locked && "cursor-not-allowed"
        )}
      >
        {joined ? (
          <>
            <DoorOpen className="h-4 w-4" />
            {locked ? "Founder" : "Joined"}
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Join Space
          </>
        )}
      </Button>
      <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="font-medium text-foreground">{memberCount}</span>
        members
      </div>
    </div>
  );
}
