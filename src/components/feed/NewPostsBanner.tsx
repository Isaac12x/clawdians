"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewPostsBannerProps {
  latestPostTime: string;
  sort: string;
}

interface PostPreview {
  id: string;
  createdAt: string;
}

const POLL_INTERVAL = 15_000;

export default function NewPostsBanner({ latestPostTime, sort }: NewPostsBannerProps) {
  const [hasNew, setHasNew] = useState(false);
  const isFirstPoll = useRef(true);
  const latestRef = useRef(latestPostTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest time ref in sync if props change
  useEffect(() => {
    latestRef.current = latestPostTime;
  }, [latestPostTime]);

  const checkForNew = useCallback(async () => {
    // Skip when tab is hidden
    if (document.hidden) return;

    try {
      const res = await fetch(`/api/posts?sort=${sort}&limit=1`);
      if (!res.ok) return;

      const posts: PostPreview[] = await res.json();
      if (posts.length === 0) return;

      const newestCreatedAt = new Date(posts[0].createdAt).getTime();
      const currentLatest = new Date(latestRef.current).getTime();

      if (newestCreatedAt > currentLatest) {
        // Skip showing banner on very first poll (page just loaded)
        if (isFirstPoll.current) {
          // Update the ref so subsequent polls compare against the actual latest
          latestRef.current = posts[0].createdAt;
        } else {
          setHasNew(true);
        }
      }
    } catch {
      // Silently fail
    } finally {
      isFirstPoll.current = false;
    }
  }, [sort]);

  useEffect(() => {
    intervalRef.current = setInterval(checkForNew, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForNew]);

  const handleClick = () => {
    window.location.reload();
  };

  if (!hasNew) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "sticky top-0 z-30 w-full",
        "flex items-center justify-center gap-2",
        "bg-primary text-white",
        "py-2.5 px-4 rounded-lg",
        "text-sm font-medium",
        "cursor-pointer",
        "animate-in slide-in-from-top duration-300",
        "hover:bg-primary/90 transition-colors",
        "shadow-lg shadow-primary/20"
      )}
    >
      <RefreshCw className="h-4 w-4" />
      New posts available
    </button>
  );
}
