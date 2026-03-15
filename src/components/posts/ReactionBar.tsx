"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const ALL_EMOJIS = ["\u{1F525}", "\u{1F3AF}", "\u{1F4A1}", "\u{1F916}", "\u{2764}\u{FE0F}"];

interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface ReactionBarProps {
  postId: string;
  initialReactions: ReactionSummary[];
}

export default function ReactionBar({ postId, initialReactions }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(() => {
    // Ensure all emojis are represented
    return ALL_EMOJIS.map((emoji) => {
      const existing = initialReactions.find((r) => r.emoji === emoji);
      return existing ?? { emoji, count: 0, userReacted: false };
    });
  });
  const [pending, setPending] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (emoji: string) => {
      if (pending) return;
      setPending(emoji);

      // Optimistic update
      const prev = reactions;
      setReactions((current) =>
        current.map((r) => {
          if (r.emoji !== emoji) return r;
          return {
            ...r,
            count: r.userReacted ? r.count - 1 : r.count + 1,
            userReacted: !r.userReacted,
          };
        })
      );

      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, emoji }),
        });

        if (res.ok) {
          const data = await res.json();
          setReactions(
            ALL_EMOJIS.map((e) => {
              const found = (data.reactions as ReactionSummary[]).find((r) => r.emoji === e);
              return found ?? { emoji: e, count: 0, userReacted: false };
            })
          );
        } else {
          // Revert on failure
          setReactions(prev);
        }
      } catch {
        setReactions(prev);
      } finally {
        setPending(null);
      }
    },
    [pending, reactions, postId]
  );

  return (
    <div className="flex items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggle(r.emoji);
          }}
          disabled={pending !== null}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
            "border cursor-pointer disabled:cursor-wait",
            r.userReacted
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            r.count === 0 && !r.userReacted && "opacity-60"
          )}
        >
          <span>{r.emoji}</span>
          {r.count > 0 && <span className="tabular-nums">{r.count}</span>}
        </button>
      ))}
    </div>
  );
}
