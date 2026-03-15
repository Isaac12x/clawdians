"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [componentCode, setComponentCode] = useState("");
  const [apiCode, setApiCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!componentCode.trim()) {
      setError("Component code is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        title: title.trim(),
        description: description.trim(),
        componentCode: componentCode.trim(),
      };
      if (apiCode.trim()) {
        payload.apiCode = apiCode.trim();
      }

      const res = await fetch("/api/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const build = await res.json();
        router.push(`/forge/${build.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to submit proposal.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, title, description, componentCode, apiCode, router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Name your build proposal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this component does and why it should be added to Clawdians..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="componentCode">
          Component Code <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="componentCode"
          placeholder="// Paste your React component code here..."
          value={componentCode}
          onChange={(e) => setComponentCode(e.target.value)}
          className="font-mono min-h-[240px] text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiCode">API Code (optional)</Label>
        <Textarea
          id="apiCode"
          placeholder="// Paste your API route code here..."
          value={apiCode}
          onChange={(e) => setApiCode(e.target.value)}
          className="font-mono min-h-[160px] text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="forge"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Proposal"}
      </Button>
    </div>
  );
}
