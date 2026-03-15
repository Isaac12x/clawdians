"use client";

import { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ForgeVoteSectionProps {
  buildId: string;
  initialVotesFor: number;
  initialVotesAgainst: number;
  initialUserVote: number | null;
  initialStatus: string;
}

export default function ForgeVoteSection({
  buildId,
  initialVotesFor,
  initialVotesAgainst,
  initialUserVote,
  initialStatus,
}: ForgeVoteSectionProps) {
  const [votesFor, setVotesFor] = useState(initialVotesFor);
  const [votesAgainst, setVotesAgainst] = useState(initialVotesAgainst);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [status, setStatus] = useState(initialStatus);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isVoting) return;
      setIsVoting(true);

      const prevFor = votesFor;
      const prevAgainst = votesAgainst;
      const prevVote = userVote;
      const prevStatus = status;

      // Optimistic update
      if (userVote === value) {
        // Toggle off
        setUserVote(null);
        if (value === 1) setVotesFor(votesFor - 1);
        else setVotesAgainst(votesAgainst - 1);
      } else if (userVote === null) {
        // New vote
        setUserVote(value);
        if (value === 1) setVotesFor(votesFor + 1);
        else setVotesAgainst(votesAgainst + 1);
      } else {
        // Switch vote
        setUserVote(value);
        if (value === 1) {
          setVotesFor(votesFor + 1);
          setVotesAgainst(votesAgainst - 1);
        } else {
          setVotesFor(votesFor - 1);
          setVotesAgainst(votesAgainst + 1);
        }
      }

      try {
        const res = await fetch(`/api/forge/${buildId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (res.ok) {
          const data = await res.json();
          setVotesFor(data.votesFor);
          setVotesAgainst(data.votesAgainst);
          setStatus(data.status);
          setUserVote(data.userVote?.value ?? null);
        } else {
          // Revert
          setVotesFor(prevFor);
          setVotesAgainst(prevAgainst);
          setUserVote(prevVote);
          setStatus(prevStatus);
        }
      } catch {
        setVotesFor(prevFor);
        setVotesAgainst(prevAgainst);
        setUserVote(prevVote);
        setStatus(prevStatus);
      } finally {
        setIsVoting(false);
      }
    },
    [isVoting, votesFor, votesAgainst, userVote, status, buildId]
  );

  return (
    <div className="space-y-3 p-4 rounded-lg bg-background border border-border">
      {/* Vote buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className={cn(
            "gap-2",
            userVote === 1 && "border-green-500 text-green-400 bg-green-500/10"
          )}
        >
          <ThumbsUp className="h-4 w-4" />
          For ({votesFor})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className={cn(
            "gap-2",
            userVote === -1 && "border-destructive text-destructive bg-destructive/10"
          )}
        >
          <ThumbsDown className="h-4 w-4" />
          Against ({votesAgainst})
        </Button>
      </div>

      {/* Progress bar */}
      {totalVotes > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-green-400">{Math.round(forPercent)}% approval</span>
            <span>{totalVotes} total votes</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${forPercent}%` }}
            />
          </div>
          {totalVotes < 10 && (
            <p className="text-xs text-muted-foreground">
              {10 - totalVotes} more votes needed for auto-approval threshold
            </p>
          )}
        </div>
      )}

      {status === "approved" && (
        <p className="text-xs text-forge font-medium">
          This build has been approved by the community.
        </p>
      )}
    </div>
  );
}
