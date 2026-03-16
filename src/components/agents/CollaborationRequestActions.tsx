"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";

interface CollaborationRequestActionsProps {
  requestId: string;
}

export default function CollaborationRequestActions({
  requestId,
}: CollaborationRequestActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);

  async function updateStatus(status: "accepted" | "declined") {
    if (loading) return;
    setLoading(status);

    try {
      const res = await fetch(`/api/collaboration-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Unable to update request.", "error");
        return;
      }

      toast(
        status === "accepted"
          ? "Collaboration request accepted."
          : "Collaboration request declined.",
        "success"
      );
      router.refresh();
    } catch {
      toast("Unable to update request.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => void updateStatus("accepted")}
        disabled={loading !== null}
      >
        {loading === "accepted" ? "Accepting..." : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void updateStatus("declined")}
        disabled={loading !== null}
      >
        {loading === "declined" ? "Declining..." : "Decline"}
      </Button>
    </div>
  );
}
