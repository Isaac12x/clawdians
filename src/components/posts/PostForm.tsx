"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import MarkdownBody from "./MarkdownBody";
import MediaGallery from "./MediaGallery";

interface PostFormProps {
  spaceId?: string;
  spaces: { id: string; name: string; slug: string }[];
}

const MAX_BODY = 10000;
const MAX_MEDIA_ITEMS = 4;

export default function PostForm({ spaceId, spaces }: PostFormProps) {
  const router = useRouter();
  const [type, setType] = useState("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaUrlDraft, setMediaUrlDraft] = useState("");
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const needsTitle = type === "discussion" || type === "link";
  const previewMediaItems = mediaUrlDraft.trim()
    ? [...mediaItems, mediaUrlDraft.trim()]
    : mediaItems;

  const appendMediaItems = useCallback((items: string[]) => {
    const sanitized = items.map((item) => item.trim()).filter(Boolean);
    if (sanitized.length === 0) return;

    setMediaItems((current) => {
      const merged = [...current];

      sanitized.forEach((item) => {
        if (!merged.includes(item) && merged.length < MAX_MEDIA_ITEMS) {
          merged.push(item);
        }
      });

      return merged;
    });
  }, []);

  const handleAddMediaUrl = useCallback(() => {
    if (!mediaUrlDraft.trim()) return;
    appendMediaItems([mediaUrlDraft]);
    setMediaUrlDraft("");
  }, [appendMediaItems, mediaUrlDraft]);

  const handleUploadMedia = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      );

      if (files.length === 0) {
        return;
      }

      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                typeof reader.result === "string"
                  ? resolve(reader.result)
                  : reject(new Error("Invalid file result"));
              reader.onerror = () => reject(new Error("File read failed"));
              reader.readAsDataURL(file);
            })
        )
      ).catch(() => [] as string[]);

      appendMediaItems(results);
      event.target.value = "";
    },
    [appendMediaItems]
  );

  const removeMediaItem = useCallback((value: string) => {
    setMediaItems((current) => current.filter((item) => item !== value));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (needsTitle && !title.trim()) {
      setError("Title is required for this post type.");
      return;
    }

    const finalMediaItems = Array.from(
      new Set(previewMediaItems.map((item) => item.trim()).filter(Boolean))
    ).slice(0, MAX_MEDIA_ITEMS);

    if (type === "visual" && finalMediaItems.length === 0) {
      setError("Add at least one image for a visual post.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: Record<string, string | string[]> = { type };
      if (title.trim()) payload.title = title.trim();
      if (body.trim()) payload.body = body.trim();
      if (url.trim() && type === "link") payload.url = url.trim();
      if (type === "visual" && finalMediaItems.length > 0) {
        payload.mediaUrls = finalMediaItems;
      }
      if (selectedSpaceId) payload.spaceId = selectedSpaceId;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const post = await res.json();
        router.push(`/post/${post.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create post.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    body,
    isSubmitting,
    needsTitle,
    previewMediaItems,
    router,
    selectedSpaceId,
    title,
    type,
    url,
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <Tabs value={type} onValueChange={setType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
        </TabsList>

        {/* All types share the same form, just different visible fields */}
        <TabsContent value={type} className="space-y-4 mt-4">
          {/* Title - always shown, required for discussion/link */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title{needsTitle && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id="title"
              placeholder={
                type === "discussion"
                  ? "What do you want to discuss?"
                  : type === "link"
                    ? "Link title"
                    : "Title (optional)"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body with preview toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {body.length}/{MAX_BODY}
                </span>
                {body.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                )}
              </div>
            </div>
            {showPreview ? (
              <div className="min-h-[120px] rounded-md border border-border bg-background p-3">
                <MarkdownBody content={body} />
              </div>
            ) : (
              <Textarea
                id="body"
                placeholder={
                  type === "discussion"
                    ? "Start the conversation... (Markdown supported)"
                    : "What's on your mind? (Markdown supported)"
                }
                value={body}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_BODY) setBody(e.target.value);
                }}
                className="min-h-[120px]"
              />
            )}
          </div>

          {/* URL input for link type */}
          {type === "link" && (
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Media URL for visual type */}
          {type === "visual" && (
            <div className="space-y-3">
              <Label htmlFor="mediaUrl">Images</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder="https://example.com/image.png"
                  value={mediaUrlDraft}
                  onChange={(e) => setMediaUrlDraft(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMediaUrl}
                >
                  Add URL
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={handleUploadMedia}
                  type="file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload image
                </Button>
                <p className="text-xs text-muted-foreground">
                  Up to {MAX_MEDIA_ITEMS} images. Local uploads are stored inline for now.
                </p>
              </div>

              {previewMediaItems.length > 0 ? (
                <div className="surface-panel-muted space-y-3 rounded-2xl border border-border/80 p-3">
                  <MediaGallery
                    urls={previewMediaItems.slice(0, MAX_MEDIA_ITEMS)}
                    altPrefix="New post image"
                    compact
                  />
                  <div className="flex flex-wrap gap-2">
                    {mediaItems.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        className="rounded-full border border-border/80 bg-background/45 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onClick={() => removeMediaItem(item)}
                        type="button"
                      >
                        Remove image {index + 1}
                      </button>
                    ))}
                    {mediaUrlDraft.trim() ? (
                      <button
                        className="rounded-full border border-dashed border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
                        onClick={handleAddMediaUrl}
                        type="button"
                      >
                        Add draft image
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Space selector */}
          <div className="space-y-2">
            <Label>Space (optional)</Label>
            <Select
              value={selectedSpaceId}
              onValueChange={setSelectedSpaceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
