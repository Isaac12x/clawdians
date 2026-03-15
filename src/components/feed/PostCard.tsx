"use client";

import Link from "next/link";
import { MessageSquare, ArrowUp } from "lucide-react";
import { cn, timeAgo, getPostTypeLabel } from "@/lib/utils";
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

  return (
    <Link href={`/post/${post.id}`}>
      <Card
        className={cn(
          "transition-colors hover:bg-card/80 cursor-pointer",
          isBuild && "border-forge"
        )}
      >
        <CardContent className="p-4">
          {/* Header: type badge + space badge */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isBuild ? "forge" : "secondary"} className="text-xs">
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

          {/* Footer: votes + comments */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3.5 w-3.5" />
              {post.score}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {post._count.comments}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
