"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, XCircle, Ban } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

// ── Report Action Buttons ──────────────────────────────────────────

interface ReportActionsProps {
  reportId: string;
  targetType: string;
  targetId: string;
  postId?: string;
  contentExists: boolean;
}

export function ReportActions({
  reportId,
  targetType,
  targetId,
  postId,
  contentExists,
}: ReportActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const { toast } = useToast();

  if (resolved) {
    return (
      <p className="text-xs text-muted-foreground italic">Resolved</p>
    );
  }

  async function deleteContent() {
    setLoading("delete");
    try {
      const endpoint =
        targetType === "post"
          ? `/api/admin/posts/${targetId}/delete`
          : `/api/admin/comments/${targetId}/delete`;
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        // Also mark report reviewed
        await fetch(`/api/admin/reports/${reportId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "reviewed" }),
        });
        toast("Content deleted and report resolved.", "success");
        setResolved(true);
      } else {
        toast("Failed to delete content.", "error");
      }
    } catch {
      toast("Failed to delete content.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function dismissReport() {
    setLoading("dismiss");
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (res.ok) {
        toast("Report dismissed.", "success");
        setResolved(true);
      } else {
        toast("Failed to dismiss report.", "error");
      }
    } catch {
      toast("Failed to dismiss report.", "error");
    } finally {
      setLoading(null);
    }
  }

  const viewUrl =
    targetType === "post"
      ? `/post/${targetId}`
      : `/post/${postId}#comment-${targetId}`;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={viewUrl} target="_blank" rel="noopener noreferrer">
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          View
        </a>
      </Button>
      {contentExists && (
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteContent}
          disabled={loading !== null}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          {loading === "delete" ? "Deleting..." : "Delete Content"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={dismissReport}
        disabled={loading !== null}
        className="text-muted-foreground"
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" />
        {loading === "dismiss" ? "Dismissing..." : "Dismiss"}
      </Button>
    </div>
  );
}

// ── User Ban Button ────────────────────────────────────────────────

interface UserBanButtonProps {
  userId: string;
  isAdmin: boolean;
}

export function UserBanButton({ userId, isAdmin }: UserBanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [banned, setBanned] = useState(false);
  const { toast } = useToast();

  if (isAdmin) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }

  if (banned) {
    return (
      <span className="text-xs text-destructive font-medium">Banned</span>
    );
  }

  async function handleBan() {
    if (!confirm("Ban this user? This will delete all their posts and comments."))
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
      });
      if (res.ok) {
        toast("User banned.", "success");
        setBanned(true);
      } else {
        toast("Failed to ban user.", "error");
      }
    } catch {
      toast("Failed to ban user.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBan}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Ban className="h-3.5 w-3.5 mr-1.5" />
      {loading ? "Banning..." : "Ban"}
    </Button>
  );
}
