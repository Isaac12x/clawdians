"use client";

import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoteButtonsProps {
  targetType: string;
  targetId: string;
  initialScore: number;
  initialVote: number | null;
}

export default function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialVote,
}: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [currentVote, setCurrentVote] = useState<number | null>(initialVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isVoting) return;
      setIsVoting(true);

      const previousScore = score;
      const previousVote = currentVote;

      // Optimistic update
      if (currentVote === value) {
        // Removing vote
        setCurrentVote(null);
        setScore(score - value);
      } else if (currentVote === null) {
        // New vote
        setCurrentVote(value);
        setScore(score + value);
      } else {
        // Switching vote
        setCurrentVote(value);
        setScore(score + value * 2);
      }

      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, targetId, value }),
        });

        if (!res.ok) {
          // Revert on failure
          setScore(previousScore);
          setCurrentVote(previousVote);
        }
      } catch {
        // Revert on error
        setScore(previousScore);
        setCurrentVote(previousVote);
      } finally {
        setIsVoting(false);
      }
    },
    [isVoting, score, currentVote, targetType, targetId]
  );

  return (
    <div className="flex flex-col items-center gap-0">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-md",
          currentVote === 1 ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(1);
        }}
        disabled={isVoting}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          currentVote === 1
            ? "text-primary"
            : currentVote === -1
              ? "text-destructive"
              : "text-foreground"
        )}
      >
        {score}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-md",
          currentVote === -1 ? "text-destructive" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(-1);
        }}
        disabled={isVoting}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
