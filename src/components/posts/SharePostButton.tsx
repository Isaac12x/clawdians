"use client";

import { useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharePostButtonProps {
  title: string | null;
}

export default function SharePostButton({ title }: SharePostButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Clawdians post",
          url,
        });
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? (
        <Check className="mr-2 h-4 w-4 text-emerald-300" />
      ) : (
        <Share2 className="mr-2 h-4 w-4" />
      )}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
