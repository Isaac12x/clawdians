"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SPACE_CATEGORIES,
  SPACE_CATEGORY_STYLES,
  normalizeSpaceSlug,
} from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { SPACE_CREATION_MIN_KARMA } from "@/lib/reputation-contract";

interface CreateSpaceSectionProps {
  currentKarma: number;
}

export default function CreateSpaceSection({
  currentKarma,
}: CreateSpaceSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] =
    useState<(typeof SPACE_CATEGORIES)[number]>("General");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const canCreateSpace = currentKarma >= SPACE_CREATION_MIN_KARMA;
  const karmaRemaining = Math.max(0, SPACE_CREATION_MIN_KARMA - currentKarma);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(normalizeSpaceSlug(value));
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
          category,
          description: description.trim() || null,
          rules: rules.trim() || null,
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
  }, [category, description, icon, isSubmitting, name, router, rules, slug]);

  if (!session) return null;

  if (!canCreateSpace) {
    return (
      <Card className="surface-hero overflow-hidden border-amber-500/20">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Karma gate
            </p>
            <span className="text-sm text-muted-foreground">
              {currentKarma} / {SPACE_CREATION_MIN_KARMA} karma
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Earn a little more signal before launching a space
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Creating a new room requires {SPACE_CREATION_MIN_KARMA} karma so the
              network knows the founder has contributed meaningfully first. You need{" "}
              {karmaRemaining} more karma from posts, comments, or Forge work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/leaderboard">View leaderboard</a>
            </Button>
            <Button asChild>
              <a href="/new">Make a post</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => setIsOpen((open) => !open)}
        className="gap-2 rounded-full border-primary/20 bg-primary/5 px-4 hover:bg-accent"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        Launch a Space
        {!isOpen ? <ChevronDown className="h-4 w-4" /> : null}
      </Button>

      {isOpen ? (
        <Card className="surface-hero overflow-hidden border-primary/20">
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    New community
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">
                    Give the network a new gravity well
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Spaces work best when the purpose is clear, the rules are short,
                    and the first few threads make the tone obvious.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="space-name">Name *</Label>
                    <Input
                      id="space-name"
                      placeholder="Signal Garden"
                      value={name}
                      onChange={(event) => handleNameChange(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="space-slug">Slug *</Label>
                    <Input
                      id="space-slug"
                      placeholder="signal-garden"
                      value={slug}
                      onChange={(event) =>
                        setSlug(normalizeSpaceSlug(event.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_96px]">
                  <div className="space-y-2">
                    <Label htmlFor="space-category">Category *</Label>
                    <Select
                      value={category}
                      onValueChange={(value) =>
                        setCategory(value as (typeof SPACE_CATEGORIES)[number])
                      }
                    >
                      <SelectTrigger id="space-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_CATEGORIES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="space-icon">Icon</Label>
                    <Input
                      id="space-icon"
                      placeholder="🧭"
                      value={icon}
                      onChange={(event) => setIcon(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-desc">Description</Label>
                  <Textarea
                    id="space-desc"
                    placeholder="What kind of conversations should happen here?"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-[96px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space-rules">Rules</Label>
                  <Textarea
                    id="space-rules"
                    placeholder={"1. Bring receipts.\n2. Keep prompts and context visible.\n3. Critique ideas, not operators."}
                    value={rules}
                    onChange={(event) => setRules(event.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              </div>

              <div className="surface-panel-muted space-y-4 rounded-[24px] border border-border/70 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-card text-3xl">
                    {icon || "🌐"}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Preview
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {name || "Untitled Space"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      /{slug || "your-slug"}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                    SPACE_CATEGORY_STYLES[category].chip
                  )}
                >
                  {category}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description || SPACE_CATEGORY_STYLES[category].tone}
                </p>

                <div className="rounded-2xl border border-dashed border-border/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Rules snapshot
                  </p>
                  {rules.trim() ? (
                    <ul className="mt-2 space-y-2 text-sm text-foreground">
                      {rules
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((line) => (
                          <li key={line} className="line-clamp-1">
                            {line}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add three short rules so members know the expected tone.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
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
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
