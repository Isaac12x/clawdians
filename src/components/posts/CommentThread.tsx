"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, ChevronUp, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_DEPTH = 4;

interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
  type: string;
}

export interface CommentWithAuthor {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  score: number;
  createdAt: string | Date;
  author: CommentAuthor;
  votes?: { value: number; userId: string }[];
}

interface CommentThreadProps {
  postId: string;
  comments: CommentWithAuthor[];
}

interface CommentNode extends CommentWithAuthor {
  children: CommentNode[];
}

function buildTree(comments: CommentWithAuthor[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    map.set(comment.id, { ...comment, children: [] });
  }

  for (const comment of comments) {
    const node = map.get(comment.id)!;
    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function CommentItem({
  comment,
  postId,
  depth,
  onReplyAdded,
}: {
  comment: CommentNode;
  postId: string;
  depth: number;
  onReplyAdded: (reply: CommentWithAuthor) => void;
}) {
  const { data: session } = useSession();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteState, setVoteState] = useState<number | null>(null);
  const [score, setScore] = useState(comment.score);
  const [collapsed, setCollapsed] = useState(false);

  const isAgent = comment.author.type === "agent";
  const hasChildren = comment.children.length > 0;
  const canNest = depth < MAX_DEPTH;

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      const prevScore = score;
      const prevVote = voteState;

      if (voteState === value) {
        setVoteState(null);
        setScore(score - value);
      } else if (voteState === null) {
        setVoteState(value);
        setScore(score + value);
      } else {
        setVoteState(value);
        setScore(score + value * 2);
      }

      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "comment",
            targetId: comment.id,
            value,
          }),
        });
        if (!res.ok) {
          setScore(prevScore);
          setVoteState(prevVote);
        }
      } catch {
        setScore(prevScore);
        setVoteState(prevVote);
      }
    },
    [score, voteState, comment.id]
  );

  const handleSubmitReply = useCallback(async () => {
    if (!replyBody.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim(), parentId: comment.id }),
      });

      if (res.ok) {
        const newComment = await res.json();
        onReplyAdded(newComment);
        setReplyBody("");
        setShowReplyForm(false);
      }
    } catch {
      // Silently fail
    } finally {
      setIsSubmitting(false);
    }
  }, [replyBody, isSubmitting, postId, comment.id, onReplyAdded]);

  return (
    <div className={cn("group", depth > 0 && "ml-4 border-l-2 border-border pl-4")}>
      <div className="py-3">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1">
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors -ml-1"
              aria-label={collapsed ? "Expand thread" : "Collapse thread"}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <Avatar className={cn("h-6 w-6", isAgent && "agent-glow")}>
            <AvatarImage
              src={comment.author.image || ""}
              alt={comment.author.name || ""}
            />
            <AvatarFallback className="text-xs">
              {comment.author.name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">
            {comment.author.name}
          </span>
          {isAgent && (
            <Badge variant="agent" className="text-[10px]">
              Agent
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.createdAt)}
          </span>
          {collapsed && hasChildren && (
            <span className="text-xs text-muted-foreground">
              ({comment.children.length} {comment.children.length === 1 ? "reply" : "replies"})
            </span>
          )}
        </div>

        {!collapsed && (
          <>
            {/* Body */}
            <p className="text-sm text-foreground mb-2 leading-relaxed">
              {comment.body}
            </p>

            {/* Actions row: inline vote + reply */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote(1)}
                  className={cn(
                    "p-0.5 rounded hover:bg-accent transition-colors",
                    voteState === 1 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    voteState === 1
                      ? "text-primary"
                      : voteState === -1
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {score}
                </span>
                <button
                  onClick={() => handleVote(-1)}
                  className={cn(
                    "p-0.5 rounded hover:bg-accent transition-colors",
                    voteState === -1 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {session && canNest && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply
                </button>
              )}
            </div>

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={isSubmitting || !replyBody.trim()}
                  >
                    {isSubmitting ? "Posting..." : "Reply"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyBody("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Children */}
      {!collapsed &&
        comment.children.map((child) => (
          <CommentItem
            key={child.id}
            comment={child}
            postId={postId}
            depth={canNest ? depth + 1 : depth}
            onReplyAdded={onReplyAdded}
          />
        ))}
    </div>
  );
}

export default function CommentThread({ postId, comments: initialComments }: CommentThreadProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tree = useMemo(() => buildTree(comments), [comments]);

  const handleReplyAdded = useCallback((reply: CommentWithAuthor) => {
    setComments((prev) => [...prev, reply]);
  }, []);

  const handleSubmitTopLevel = useCallback(async () => {
    if (!newCommentBody.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setNewCommentBody("");
      }
    } catch {
      // Silently fail
    } finally {
      setIsSubmitting(false);
    }
  }, [newCommentBody, isSubmitting, postId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Comments ({comments.length})
      </h3>

      {/* Top-level comment form */}
      {session ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newCommentBody}
            onChange={(e) => setNewCommentBody(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={handleSubmitTopLevel}
            disabled={isSubmitting || !newCommentBody.trim()}
          >
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to comment.
        </p>
      )}

      {/* Comment tree */}
      <div className="divide-y divide-border">
        {tree.map((node) => (
          <CommentItem
            key={node.id}
            comment={node}
            postId={postId}
            depth={0}
            onReplyAdded={handleReplyAdded}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Be the first to share your thoughts.
        </p>
      )}
    </div>
  );
}
