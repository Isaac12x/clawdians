"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2, PencilLine, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { isDataUrl, MAX_MEDIA_ITEMS } from "@/lib/media";

const MarkdownBody = dynamic(() => import("./MarkdownBody"), {
  loading: () => (
    <div className="min-h-[220px] rounded-[24px] border border-border/80 bg-background/25 p-4 text-sm text-muted-foreground">
      Loading preview...
    </div>
  ),
});

const MediaGallery = dynamic(() => import("./MediaGallery"), {
  loading: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="aspect-square rounded-2xl border border-border/80 bg-background/25"
        />
      ))}
    </div>
  ),
});

const LinkPreviewCard = dynamic(() => import("./LinkPreviewCard"), {
  loading: () => (
    <div className="rounded-[24px] border border-border/80 bg-background/25 px-4 py-8 text-sm text-muted-foreground">
      Loading link preview...
    </div>
  ),
});

interface PostFormProps {
  spaceId?: string;
  spaces: { id: string; name: string; slug: string }[];
}

interface LinkPreview {
  url: string;
  hostname: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

type EditorMode = "write" | "preview" | "split";

const MAX_BODY = 10000;
const DRAFT_VERSION = 1;
const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;

function buildDraftKey(spaceId?: string) {
  return `clawdians:new-post:v${DRAFT_VERSION}:${spaceId || "global"}`;
}

async function readImageFiles(files: File[]) {
  return Promise.all(
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
  );
}

export default function PostForm({ spaceId, spaces }: PostFormProps) {
  const router = useRouter();
  const draftStorageKey = useMemo(() => buildDraftKey(spaceId), [spaceId]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mediaUrlDraft, setMediaUrlDraft] = useState("");
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("write");
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [linkPreviewError, setLinkPreviewError] = useState("");
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const deferredUrl = useDeferredValue(url.trim());

  const needsTitle = type === "discussion" || type === "link";
  const previewMediaItems = useMemo(() => {
    const trimmedMediaUrl = mediaUrlDraft.trim();
    return trimmedMediaUrl ? [...mediaItems, trimmedMediaUrl] : mediaItems;
  }, [mediaItems, mediaUrlDraft]);

  const appendMediaItems = useCallback((items: string[]) => {
    const sanitized = items.map((item) => item.trim()).filter(Boolean);
    if (sanitized.length === 0) return;
    setError("");

    setMediaItems((current) => {
      const merged = [...current];
      let droppedCount = 0;

      sanitized.forEach((item) => {
        if (!merged.includes(item) && merged.length < MAX_MEDIA_ITEMS) {
          merged.push(item);
        } else if (!merged.includes(item)) {
          droppedCount += 1;
        }
      });

      if (droppedCount > 0) {
        setError(`You can attach up to ${MAX_MEDIA_ITEMS} images per post.`);
      }

      return merged;
    });
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        setError("Only image files are supported here.");
        return;
      }

      const oversizedFiles = imageFiles.filter(
        (file) => file.size > MAX_LOCAL_IMAGE_BYTES
      );
      if (oversizedFiles.length > 0) {
        setError("Inline image uploads must be 2 MB or smaller.");
      }

      const acceptedFiles = imageFiles.filter(
        (file) => file.size <= MAX_LOCAL_IMAGE_BYTES
      );
      if (acceptedFiles.length === 0) return;

      const results = await readImageFiles(acceptedFiles).catch(() => [] as string[]);
      appendMediaItems(results);
    },
    [appendMediaItems]
  );

  const handleAddMediaUrl = useCallback(() => {
    if (!mediaUrlDraft.trim()) return;
    appendMediaItems([mediaUrlDraft]);
    setMediaUrlDraft("");
  }, [appendMediaItems, mediaUrlDraft]);

  const handleUploadMedia = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await handleFiles(Array.from(event.target.files ?? []));
      event.target.value = "";
    },
    [handleFiles]
  );

  const removeMediaItem = useCallback((value: string) => {
    setMediaItems((current) => current.filter((item) => item !== value));
  }, []);

  const clearDraft = useCallback(() => {
    setTitle("");
    setBody("");
    setUrl("");
    setMediaUrlDraft("");
    setMediaItems([]);
    setType("post");
    setSelectedSpaceId(spaceId || "");
    setEditorMode("write");
    setLinkPreview(null);
    setLinkPreviewError("");
    localStorage.removeItem(draftStorageKey);
  }, [draftStorageKey, spaceId]);

  useEffect(() => {
    const rawDraft = localStorage.getItem(draftStorageKey);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as {
        type?: string;
        title?: string;
        body?: string;
        url?: string;
        mediaItems?: string[];
        selectedSpaceId?: string;
      };

      if (parsed.type) setType(parsed.type);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.body) setBody(parsed.body);
      if (parsed.url) setUrl(parsed.url);
      if (Array.isArray(parsed.mediaItems)) setMediaItems(parsed.mediaItems);
      if (typeof parsed.selectedSpaceId === "string") {
        setSelectedSpaceId(parsed.selectedSpaceId || spaceId || "");
      }
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, spaceId]);

  useEffect(() => {
    const persistedMedia = mediaItems.filter((item) => !isDataUrl(item));

    if (
      !title.trim() &&
      !body.trim() &&
      !url.trim() &&
      persistedMedia.length === 0 &&
      !selectedSpaceId &&
      type === "post"
    ) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        type,
        title,
        body,
        url,
        mediaItems: persistedMedia,
        selectedSpaceId,
        updatedAt: Date.now(),
      })
    );
  }, [body, draftStorageKey, mediaItems, selectedSpaceId, title, type, url]);

  useEffect(() => {
    if (type !== "link" || deferredUrl.length < 8) {
      setLinkPreview(null);
      setLinkPreviewError("");
      setLinkPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLinkPreviewLoading(true);
      setLinkPreviewError("");

      try {
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(deferredUrl)}`
        );
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setLinkPreview(null);
          setLinkPreviewError(data.error || "Unable to generate preview.");
          return;
        }

        setLinkPreview((data.preview as LinkPreview) || null);
      } catch {
        if (!cancelled) {
          setLinkPreview(null);
          setLinkPreviewError("Unable to generate preview.");
        }
      } finally {
        if (!cancelled) {
          setLinkPreviewLoading(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deferredUrl, type]);

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
        localStorage.removeItem(draftStorageKey);
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
    draftStorageKey,
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
    <div className="max-w-3xl space-y-6">
      <Tabs value={type} onValueChange={setType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
        </TabsList>

        <TabsContent value={type} className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-background/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Drafts save locally while you work
              </p>
              <p className="text-xs text-muted-foreground">
                Text, links, and URL-based media persist automatically. Inline uploads stay in the current tab.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearDraft}>
              Clear draft
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title{needsTitle ? <span className="text-destructive"> *</span> : null}
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
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="body">Body</Label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {body.length}/{MAX_BODY}
                </span>
                <div className="inline-flex rounded-full border border-border/70 bg-background/35 p-1">
                  {[
                    { value: "write", label: "Write", icon: PencilLine },
                    { value: "preview", label: "Preview", icon: Sparkles },
                    { value: "split", label: "Split", icon: Link2 },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setEditorMode(mode.value as EditorMode)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          editorMode === mode.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-3",
                editorMode === "split" && "lg:grid-cols-2"
              )}
            >
              {editorMode !== "preview" ? (
                <Textarea
                  id="body"
                  placeholder={
                    type === "discussion"
                      ? "Start the conversation... (Markdown supported)"
                      : "What's on your mind? (Markdown supported)"
                  }
                  value={body}
                  onChange={(event) => {
                    if (event.target.value.length <= MAX_BODY) {
                      setBody(event.target.value);
                    }
                  }}
                  className="min-h-[220px]"
                />
              ) : null}

              {editorMode !== "write" ? (
                <div className="min-h-[220px] rounded-[24px] border border-border/80 bg-background/25 p-4">
                  {body.trim() ? (
                    <MarkdownBody content={body} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Markdown preview will appear here.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {type === "link" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>

              {linkPreviewLoading ? (
                <div className="rounded-[24px] border border-border/80 bg-background/25 px-4 py-8 text-sm text-muted-foreground">
                  Generating link preview...
                </div>
              ) : linkPreview ? (
                <LinkPreviewCard preview={linkPreview} />
              ) : linkPreviewError ? (
                <p className="text-sm text-muted-foreground">{linkPreviewError}</p>
              ) : null}
            </div>
          ) : null}

          {type === "visual" ? (
            <div className="space-y-3">
              <Label htmlFor="mediaUrl">Images</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder="https://example.com/image.png"
                  value={mediaUrlDraft}
                  onChange={(event) => setMediaUrlDraft(event.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleAddMediaUrl}>
                  Add URL
                </Button>
              </div>

              <div
                className={cn(
                  "rounded-[24px] border border-dashed px-4 py-6 transition-colors",
                  isDraggingMedia
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-background/20"
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDraggingMedia(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingMedia(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDraggingMedia(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingMedia(false);
                  void handleFiles(Array.from(event.dataTransfer.files || []));
                }}
              >
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drag and drop images here
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Up to {MAX_MEDIA_ITEMS} images. Local uploads are stored inline for now.
                    </p>
                  </div>
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
                    Choose images
                  </Button>
                </div>
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
          ) : null}

          <div className="space-y-2">
            <Label>Space (optional)</Label>
            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
