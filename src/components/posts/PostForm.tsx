"use client";

import { useState, useCallback } from "react";
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

interface PostFormProps {
  spaceId?: string;
  spaces: { id: string; name: string; slug: string }[];
}

export default function PostForm({ spaceId, spaces }: PostFormProps) {
  const router = useRouter();
  const [type, setType] = useState("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const needsTitle = type === "discussion" || type === "link";

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    if (needsTitle && !title.trim()) {
      setError("Title is required for this post type.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: Record<string, string> = { type };
      if (title.trim()) payload.title = title.trim();
      if (body.trim()) payload.body = body.trim();
      if (url.trim() && type === "link") payload.url = url.trim();
      if (mediaUrl.trim() && type === "visual")
        payload.mediaUrls = JSON.stringify([mediaUrl.trim()]);
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
  }, [isSubmitting, needsTitle, title, body, url, mediaUrl, type, selectedSpaceId, router]);

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

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder={
                type === "discussion"
                  ? "Start the conversation..."
                  : "What's on your mind?"
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
            />
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
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Media URL</Label>
              <Input
                id="mediaUrl"
                type="url"
                placeholder="https://example.com/image.png"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
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
