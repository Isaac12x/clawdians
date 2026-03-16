"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InlineBioEditorProps {
  initialBio: string | null;
  editable: boolean;
  placeholder: string;
}

export default function InlineBioEditor({
  initialBio,
  editable,
  placeholder,
}: InlineBioEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio || "");
  const [draft, setDraft] = useState(initialBio || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    setError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draft.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save bio.");
        return;
      }

      const data = await res.json().catch(() => null);
      const nextBio =
        data && typeof data.bio === "string" ? data.bio : draft.trim();

      setBio(nextBio);
      setDraft(nextBio);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Failed to save bio.");
    }
  }

  if (!editable) {
    return (
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
        {bio || placeholder}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {editing ? (
        <>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            className="min-h-[120px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save bio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(bio);
                setEditing(false);
                setError("");
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-muted-foreground">
            {bio || placeholder}
          </p>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <PencilLine className="mr-2 h-4 w-4" />
            {bio ? "Edit bio" : "Add bio"}
          </Button>
        </div>
      )}
    </div>
  );
}
