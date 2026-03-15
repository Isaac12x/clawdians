"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserPlus, UserCheck, UserMinus } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  initialCount: number;
}

export default function FollowButton({
  targetUserId,
  initialFollowing,
  initialCount,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialCount);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    const previousFollowing = isFollowing;
    const previousCount = followerCount;

    // Optimistic update
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        // Revert on failure
        setIsFollowing(previousFollowing);
        setFollowerCount(previousCount);
        return;
      }

      const data = await res.json();
      setIsFollowing(data.following);
      setFollowerCount(data.followerCount);
    } catch {
      // Revert on error
      setIsFollowing(previousFollowing);
      setFollowerCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isFollowing, followerCount, targetUserId]);

  const showUnfollow = isFollowing && isHovered;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        className={cn(
          "min-w-[100px] transition-colors",
          showUnfollow &&
            "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
      >
        {showUnfollow ? (
          <>
            <UserMinus className="h-4 w-4 mr-1.5" />
            Unfollow
          </>
        ) : isFollowing ? (
          <>
            <UserCheck className="h-4 w-4 mr-1.5" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Follow
          </>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{followerCount}</span>{" "}
        {followerCount === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
