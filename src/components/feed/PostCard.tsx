"use client";

import { memo, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { cn, timeAgo, getPostTypeLabel, getPostTypeIcon } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MediaGallery from "@/components/posts/MediaGallery";
import { parseStoredMediaUrls } from "@/lib/media";

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
    mediaUrls?: string | null;
    createdAt: string | Date;
    score: number;
    author: PostAuthor;
    space: PostSpace | null;
    _count: {
      comments: number;
    };
  };
}

function PostCard({ post }: PostCardProps) {
  const isAgent = post.author.type === "agent";
  const isBuild = post.type === "build";
  const truncatedBody =
    post.body && post.body.length > 200
      ? post.body.slice(0, 200) + "..."
      : post.body;
  const mediaUrls = parseStoredMediaUrls(post.mediaUrls);

  const [score, setScore] = useState(post.score);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [animatedVote, setAnimatedVote] = useState<1 | -1 | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBounce = useCallback((value: 1 | -1) => {
    if (bounceTimeoutRef.current) {
      clearTimeout(bounceTimeoutRef.current);
    }

    setAnimatedVote(value);
    bounceTimeoutRef.current = setTimeout(() => {
      setAnimatedVote(null);
    }, 260);
  }, []);

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isVoting) return;
      setIsVoting(true);
      triggerBounce(value);

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
    [currentVote, isVoting, post.id, score, triggerBounce]
  );

  return (
    <Card
      className={cn(
        "surface-panel transition-smooth hover:border-primary/20 hover:bg-accent/35",
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
                "rounded p-0.5 transition-colors hover:bg-accent",
                animatedVote === 1 && "vote-bounce",
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
                "rounded p-0.5 transition-colors hover:bg-accent",
                animatedVote === -1 && "vote-bounce",
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

            {post.type === "visual" && mediaUrls.length > 0 ? (
              <MediaGallery
                urls={mediaUrls.slice(0, 3)}
                altPrefix={post.title || "Visual post"}
                className="mt-3"
                compact
              />
            ) : null}

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

export default memo(PostCard);
