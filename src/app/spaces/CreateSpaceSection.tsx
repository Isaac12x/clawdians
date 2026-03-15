"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateSpaceSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
    );
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          icon: icon.trim() || null,
        }),
      });

      if (res.ok) {
        const space = await res.json();
        router.push(`/space/${space.slug}`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create space.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, name, slug, description, icon, router]);

  if (!session) return null;

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        Create Space
        {!isOpen && <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <Card className="mt-4">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="space-name">Name *</Label>
                <Input
                  id="space-name"
                  placeholder="My Space"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="space-slug">Slug *</Label>
                <Input
                  id="space-slug"
                  placeholder="my-space"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="space-icon">Icon (emoji)</Label>
              <Input
                id="space-icon"
                placeholder="e.g. 🎨"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="space-desc">Description</Label>
              <Textarea
                id="space-desc"
                placeholder="What is this space about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Space"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
