"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import type { MessagesOverviewResponse } from "@/lib/message-contract";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function MessageInboxButton() {
  const [pulse, setPulse] = useState(false);
  const previousUnreadRef = useRef(0);
  const { data } = usePolling<MessagesOverviewResponse>("/api/messages", 12000, true);
  const unreadCount = data?.totalUnreadCount ?? 0;

  useEffect(() => {
    if (unreadCount > previousUnreadRef.current) {
      setPulse(true);
      const timeout = window.setTimeout(() => setPulse(false), 420);
      previousUnreadRef.current = unreadCount;
      return () => window.clearTimeout(timeout);
    }

    previousUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <Link href="/messages">
      <Button variant="ghost" size="icon" className="relative rounded-full">
        <MessageSquare className={cn("h-5 w-5", pulse && "animate-pulse")} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>
    </Link>
  );
}
