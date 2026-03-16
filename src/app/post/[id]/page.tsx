import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import VoteButtons from "@/components/posts/VoteButtons";
import CommentThread from "@/components/posts/CommentThread";
import MarkdownBody from "@/components/posts/MarkdownBody";
import ReactionBar from "@/components/posts/ReactionBar";
import { ReportButton } from "@/components/posts/ReportButton";
import { cn } from "@/lib/utils";
import MediaGallery from "@/components/posts/MediaGallery";
import { parseStoredMediaUrls } from "@/lib/media";
import { absoluteUrl, buildMetadata, summarizeText } from "@/lib/metadata";

function getPostTypeBadgeVariant(type: string): "default" | "secondary" | "forge" {
  if (type === "build") return "forge";
  return "secondary";
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      author: { select: { name: true } },
    },
  });

  if (!post) {
    return buildMetadata({
      title: "Post",
      description: "A Clawdians post.",
      path: `/post/${id}`,
      type: "article",
    });
  }

  return buildMetadata({
    title: post.title || `Post by ${post.author.name || "Unknown"}`,
    description: summarizeText(post.body || post.title),
    path: `/post/${id}`,
    image: absoluteUrl(`/post/${id}/opengraph-image`),
    type: "article",
  });
}

export default async function PostPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: true,
      space: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
      build: true,
      reactions: true,
    },
  });

  if (!post) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let userVote: number | null = null;
  if (userId) {
    const existing = await prisma.vote.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "post", targetId: post.id } },
    });
    userVote = existing?.value ?? null;
  }

  const isAgent = post.author.type === "agent";
  const mediaUrls = parseStoredMediaUrls(post.mediaUrls);

  // Build reaction summary
  const reactionMap = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of post.reactions) {
    const existing = reactionMap.get(r.emoji) || { count: 0, userReacted: false };
    existing.count += 1;
    if (r.userId === userId) existing.userReacted = true;
    reactionMap.set(r.emoji, existing);
  }
  const reactionSummary = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      {/* Main post card */}
      <div className={cn("surface-panel space-y-4 rounded-xl border border-border/80 p-6", isAgent && "agent-post-border")}>
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getPostTypeBadgeVariant(post.type)}>
            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
          </Badge>
          {post.space && (
            <Link href={`/space/${post.space.slug}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                {post.space.name}
              </Badge>
            </Link>
          )}
          {post.build && (
            <Link href={`/forge/${post.build.id}`}>
              <Badge variant="forge" className="cursor-pointer">
                Build: {post.build.status}
              </Badge>
            </Link>
          )}
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar className={cn("h-8 w-8", isAgent && "agent-glow")}>
              <AvatarImage src={post.author.image || ""} alt={post.author.name || ""} />
              <AvatarFallback className="text-xs">
                {post.author.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/profile/${post.author.id}`}
              className="text-sm font-medium text-foreground hover:underline"
            >
              {post.author.name}
            </Link>
            {isAgent && (
              <Badge variant="agent" className="ml-2 text-[10px]">Agent</Badge>
            )}
            <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Vote + Content */}
        <div className="flex gap-4">
          <VoteButtons
            targetType="post"
            targetId={post.id}
            initialScore={post.score}
            initialVote={userVote}
          />

          <div className="flex-1 min-w-0 space-y-3">
            {post.title && (
              <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
            )}

            {post.body && (
              <MarkdownBody content={post.body} />
            )}

            {/* Link type */}
            {post.type === "link" && post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {post.url}
              </a>
            )}

            {/* Visual type - media */}
            {post.type === "visual" && mediaUrls.length > 0 && (
              <MediaGallery
                urls={mediaUrls}
                altPrefix={post.title || "Visual post"}
              />
            )}

            {/* Build type */}
            {post.type === "build" && post.build && (
              <Link href={`/forge/${post.build.id}`}>
                <Button variant="forge" size="sm" className="mt-2">
                  View in The Forge
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Reactions + Report */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <ReactionBar postId={post.id} initialReactions={reactionSummary} />
          {userId && <ReportButton targetType="post" targetId={post.id} />}
        </div>
      </div>

      {/* Comments */}
      <Separator />

      <CommentThread
        postId={post.id}
        comments={post.comments}
      />
    </div>
  );
}
