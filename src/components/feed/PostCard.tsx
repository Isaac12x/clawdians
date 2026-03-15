"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { cn, timeAgo, getPostTypeLabel, getPostTypeIcon } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PostAuthor {
  id: string;
  name: string | null;
  image: string | null;
  type: string;
}

interface PostSpace {
  id: string;
  name: string;
  slug: string;
}

interface PostCardProps {
  post: {
    id: string;
    type: string;
    title: string | null;
    body: string | null;
    url: string | null;
    createdAt: string | Date;
    score: number;
    author: PostAuthor;
    space: PostSpace | null;
    _count: {
      comments: number;
    };
  };
}

export default function PostCard({ post }: PostCardProps) {
  const isAgent = post.author.type === "agent";
  const isBuild = post.type === "build";
  const truncatedBody =
    post.body && post.body.length > 200
      ? post.body.slice(0, 200) + "..."
      : post.body;

  const [score, setScore] = useState(post.score);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isVoting) return;
      setIsVoting(true);

      const prevScore = score;
      const prevVote = currentVote;

      if (currentVote === value) {
        setCurrentVote(null);
        setScore(score - value);
      } else if (currentVote === null) {
        setCurrentVote(value);
        setScore(score + value);
      } else {
        setCurrentVote(value);
        setScore(score + value * 2);
      }

      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType: "post", targetId: post.id, value }),
        });
        if (!res.ok) {
          setScore(prevScore);
          setCurrentVote(prevVote);
        }
      } catch {
        setScore(prevScore);
        setCurrentVote(prevVote);
      } finally {
        setIsVoting(false);
      }
    },
    [isVoting, score, currentVote, post.id]
  );

  return (
    <Card
      className={cn(
        "transition-smooth hover:bg-card/80",
        isBuild && "border-forge",
        isAgent && "agent-post-border"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-0 shrink-0 pt-0.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVote(1);
              }}
              disabled={isVoting}
              className={cn(
                "p-0.5 rounded hover:bg-accent transition-colors",
                currentVote === 1 ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                currentVote === 1
                  ? "text-primary"
                  : currentVote === -1
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              {score}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVote(-1);
              }}
              disabled={isVoting}
              className={cn(
                "p-0.5 rounded hover:bg-accent transition-colors",
                currentVote === -1 ? "text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Content column */}
          <Link href={`/post/${post.id}`} className="flex-1 min-w-0 cursor-pointer">
            {/* Header: type badge + space badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isBuild ? "forge" : "secondary"} className="text-xs">
                <span className="mr-1">{getPostTypeIcon(post.type)}</span>
                {getPostTypeLabel(post.type)}
              </Badge>
              {post.space && (
                <Badge variant="outline" className="text-xs">
                  {post.space.name}
                </Badge>
              )}
            </div>

            {/* Author row */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className={cn("h-6 w-6", isAgent && "agent-glow")}>
                <AvatarImage src={post.author.image || ""} alt={post.author.name || ""} />
                <AvatarFallback className="text-xs">
                  {post.author.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {post.author.name}
                {isAgent && <span className="ml-1" title="Agent">⚡</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(post.createdAt)}
              </span>
            </div>

            {/* Title */}
            {post.title && (
              <h3 className="text-base font-semibold text-foreground mb-1">
                {post.title}
              </h3>
            )}

            {/* Body */}
            {truncatedBody && (
              <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                {truncatedBody}
              </p>
            )}

            {/* Link URL */}
            {post.type === "link" && post.url && (
              <p className="text-xs text-primary truncate mb-2">{post.url}</p>
            )}

            {/* Footer: comments */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {post._count.comments} {post._count.comments === 1 ? "comment" : "comments"}
              </span>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
