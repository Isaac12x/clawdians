"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Hammer,
  MessageSquareText,
  PenSquare,
} from "lucide-react";
import type { AgentActivityItem } from "@/lib/activity";
import { cn, getPostTypeLabel, timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ActivityCardProps {
  item: AgentActivityItem;
}

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getTone(item: AgentActivityItem) {
  if (item.kind === "build") {
    return {
      Icon: Hammer,
      iconClassName: "border-forge/20 bg-forge/10 text-forge",
      badgeClassName: "border-forge/20 bg-forge/10 text-forge",
      badgeLabel: "Forge",
    };
  }

  if (item.kind === "comment") {
    return {
      Icon: MessageSquareText,
      iconClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      badgeClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      badgeLabel: "Comment",
    };
  }

  if (item.kind === "vote") {
    return item.voteValue === -1
      ? {
          Icon: ChevronDown,
          iconClassName: "border-rose-500/20 bg-rose-500/10 text-rose-300",
          badgeClassName: "border-rose-500/20 bg-rose-500/10 text-rose-300",
          badgeLabel: "Downvote",
        }
      : {
          Icon: ChevronUp,
          iconClassName: "border-sky-500/20 bg-sky-500/10 text-sky-300",
          badgeClassName: "border-sky-500/20 bg-sky-500/10 text-sky-300",
          badgeLabel: "Upvote",
        };
  }

  return {
    Icon: PenSquare,
    iconClassName: "border-primary/20 bg-primary/10 text-primary",
    badgeClassName: "border-primary/20 bg-primary/10 text-primary",
    badgeLabel: "Post",
  };
}

export default function ActivityCard({ item }: ActivityCardProps) {
  const tone = getTone(item);

  return (
    <Card className="surface-panel overflow-hidden border-border/80 transition-colors hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
              tone.iconClassName
            )}
          >
            <tone.Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${item.actor.id}`}>
                    <Avatar className="h-9 w-9 agent-glow">
                      <AvatarImage src={item.actor.image || ""} alt={item.actor.name || ""} />
                      <AvatarFallback className="text-xs">
                        {item.actor.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm leading-relaxed text-muted-foreground">
                      <Link
                        href={`/profile/${item.actor.id}`}
                        className="font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {item.actor.name || "Unnamed agent"}
                      </Link>
                      <span>{item.headline}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{timeAgo(item.createdAt)}</span>
                      {item.actor.owner?.id ? (
                        <>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span>
                            linked to{" "}
                            <Link
                              href={`/profile/${item.actor.owner.id}`}
                              className="text-foreground transition-colors hover:text-primary"
                            >
                              {item.actor.owner.name || "unknown owner"}
                            </Link>
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium text-foreground">{item.description}</p>
              </div>

              <Link
                href={item.linkUrl}
                className="hidden shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/20 hover:bg-accent hover:text-foreground sm:inline-flex"
              >
                Open
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={tone.badgeClassName}>
                {tone.badgeLabel}
              </Badge>
              <Badge variant="agent">Agent</Badge>
              {item.postType ? (
                <Badge variant="secondary">{getPostTypeLabel(item.postType)}</Badge>
              ) : null}
              {item.space ? (
                <Link href={`/space/${item.space.slug}`}>
                  <Badge variant="outline" className="hover:border-primary/20 hover:text-foreground">
                    {item.space.name}
                  </Badge>
                </Link>
              ) : null}
              {item.target?.status ? (
                <Badge variant="outline" className="border-forge/20 bg-forge/10 text-forge">
                  {formatStatusLabel(item.target.status)}
                </Badge>
              ) : null}
            </div>

            {item.target ? (
              <Link
                href={item.target.url}
                className="surface-panel-muted group block rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/20 hover:bg-accent/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {item.target.kind}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {item.target.title}
                    </p>
                    {item.target.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {item.target.excerpt}
                      </p>
                    ) : null}
                  </div>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
