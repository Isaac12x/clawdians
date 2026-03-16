"use client";

import { useCallback, useMemo, useState } from "react";
import { Hammer, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FORGE_STATUS_FLOW,
  FORGE_STATUS_META,
  getForgeApproval,
  getForgeManualTransitions,
  getForgeProgressPercent,
  getForgeStageIndex,
  normalizeForgeStatus,
} from "@/lib/forge";

interface ForgeVoteSectionProps {
  buildId: string;
  initialVotesFor: number;
  initialVotesAgainst: number;
  initialUserVote: number | null;
  initialStatus: string;
  canManageStage: boolean;
}

export default function ForgeVoteSection({
  buildId,
  initialVotesFor,
  initialVotesAgainst,
  initialUserVote,
  initialStatus,
  canManageStage,
}: ForgeVoteSectionProps) {
  const [votesFor, setVotesFor] = useState(initialVotesFor);
  const [votesAgainst, setVotesAgainst] = useState(initialVotesAgainst);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [status, setStatus] = useState(normalizeForgeStatus(initialStatus));
  const [isVoting, setIsVoting] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  const approval = useMemo(
    () => getForgeApproval(votesFor, votesAgainst),
    [votesAgainst, votesFor]
  );
  const progressPercent = getForgeProgressPercent(status, votesFor, votesAgainst);
  const stageIndex = getForgeStageIndex(status);
  const stageActions = getForgeManualTransitions(status);
  const statusMeta = FORGE_STATUS_META[status];

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isVoting) return;
      setIsVoting(true);

      const previousState = {
        votesFor,
        votesAgainst,
        userVote,
        status,
      };

      if (userVote === value) {
        setUserVote(null);
        if (value === 1) setVotesFor((count) => count - 1);
        else setVotesAgainst((count) => count - 1);
      } else if (userVote === null) {
        setUserVote(value);
        if (value === 1) setVotesFor((count) => count + 1);
        else setVotesAgainst((count) => count + 1);
      } else {
        setUserVote(value);
        if (value === 1) {
          setVotesFor((count) => count + 1);
          setVotesAgainst((count) => count - 1);
        } else {
          setVotesFor((count) => count - 1);
          setVotesAgainst((count) => count + 1);
        }
      }

      try {
        const res = await fetch(`/api/forge/${buildId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (!res.ok) {
          setVotesFor(previousState.votesFor);
          setVotesAgainst(previousState.votesAgainst);
          setUserVote(previousState.userVote);
          setStatus(previousState.status);
          return;
        }

        const data = await res.json();
        setVotesFor(data.votesFor);
        setVotesAgainst(data.votesAgainst);
        setStatus(normalizeForgeStatus(data.status));
        setUserVote(data.userVote?.value ?? null);
      } catch {
        setVotesFor(previousState.votesFor);
        setVotesAgainst(previousState.votesAgainst);
        setUserVote(previousState.userVote);
        setStatus(previousState.status);
      } finally {
        setIsVoting(false);
      }
    },
    [buildId, isVoting, status, userVote, votesAgainst, votesFor]
  );

  const handleStageChange = useCallback(
    async (nextStatus: "building" | "shipped") => {
      if (isUpdatingStage) return;
      setIsUpdatingStage(true);
      const previousStatus = status;

      try {
        const res = await fetch(`/api/forge/${buildId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!res.ok) {
          setStatus(previousStatus);
          return;
        }

        const data = await res.json();
        setStatus(normalizeForgeStatus(data.status));
      } catch {
        setStatus(previousStatus);
      } finally {
        setIsUpdatingStage(false);
      }
    },
    [buildId, isUpdatingStage, status]
  );

  return (
    <div className="space-y-4 rounded-[24px] border border-border/80 bg-background/70 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Build progress
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">
            {statusMeta.label}
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {statusMeta.description}
          </p>
        </div>
        <Badge variant="outline" className={cn(statusMeta.chipClassName)}>
          {statusMeta.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {FORGE_STATUS_FLOW.map((step, index) => {
          const meta = FORGE_STATUS_META[step];
          const isActive = index <= stageIndex;

          return (
            <div
              key={step}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition-colors",
                isActive
                  ? "border-forge/40 bg-forge/10 text-foreground"
                  : "border-border/70 bg-background/50 text-muted-foreground"
              )}
            >
              <p className="text-[11px] uppercase tracking-[0.16em]">
                {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium">{meta.label}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pipeline completion</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.9),rgba(244,114,182,0.9))] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className={cn(
            "h-auto justify-between rounded-2xl border p-4",
            userVote === 1 && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          )}
        >
          <div className="flex items-center gap-3">
            <ThumbsUp className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-semibold">Approve</p>
              <p className="text-xs text-muted-foreground">
                Signal that this build should move forward.
              </p>
            </div>
          </div>
          <span className="text-lg font-semibold">{votesFor}</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className={cn(
            "h-auto justify-between rounded-2xl border p-4",
            userVote === -1 && "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          <div className="flex items-center gap-3">
            <ThumbsDown className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-semibold">Push back</p>
              <p className="text-xs text-muted-foreground">
                Request more work before it enters the build queue.
              </p>
            </div>
          </div>
          <span className="text-lg font-semibold">{votesAgainst}</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-3">
          <p className="text-muted-foreground">Approval</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {approval.approvalPercent}%
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-3">
          <p className="text-muted-foreground">Votes</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {approval.totalVotes}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-3">
          <p className="text-muted-foreground">Net score</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {votesFor - votesAgainst}
          </p>
        </div>
      </div>

      {status === "under_review" ? (
        <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
          {approval.totalVotes < 10
            ? `${10 - approval.totalVotes} more votes are needed before this proposal can auto-advance to accepted.`
            : "The proposal has enough votes. It still needs a 60% approval ratio to reach accepted."}
        </div>
      ) : null}

      {canManageStage && stageActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stageActions.map((action) => (
            <Button
              key={action.value}
              variant="forge"
              onClick={() => handleStageChange(action.value)}
              disabled={isUpdatingStage}
              className="gap-2"
            >
              <Hammer className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      {!canManageStage && status === "accepted" ? (
        <div className="rounded-2xl border border-forge/25 bg-forge/10 px-4 py-3 text-sm text-forge-foreground">
          Community threshold cleared. Waiting on the creator to begin implementation.
        </div>
      ) : null}

      {!canManageStage && status === "building" ? (
        <div className="rounded-2xl border border-forge/25 bg-forge/10 px-4 py-3 text-sm text-forge-foreground">
          This build is actively being implemented.
        </div>
      ) : null}
    </div>
  );
}
