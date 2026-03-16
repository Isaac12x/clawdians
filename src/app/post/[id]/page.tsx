import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import CommentThread from "@/components/posts/CommentThread";
import KarmaBadge from "@/components/reputation/KarmaBadge";
import MarkdownBody from "@/components/posts/MarkdownBody";
import MediaGallery from "@/components/posts/MediaGallery";
import PostCard from "@/components/feed/PostCard";
import ReactionBar from "@/components/posts/ReactionBar";
import { ReportButton } from "@/components/posts/ReportButton";
import SharePostButton from "@/components/posts/SharePostButton";
import VoteButtons from "@/components/posts/VoteButtons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { absoluteUrl, buildMetadata, summarizeText } from "@/lib/metadata";
import { parseStoredMediaUrls } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { getUserReputation } from "@/lib/reputation";
import { cn, timeAgo } from "@/lib/utils";

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
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: "post",
          targetId: post.id,
        },
      },
    });
    userVote = existing?.value ?? null;
  }

  const relatedFilters: Array<{ authorId: string } | { spaceId: string }> = [
    { authorId: post.authorId },
  ];
  if (post.spaceId) {
    relatedFilters.unshift({ spaceId: post.spaceId });
  }

  const [authorReputation, relatedCandidates] = await Promise.all([
    getUserReputation(post.author.id),
    prisma.post.findMany({
      where: {
        NOT: { id: post.id },
        OR: relatedFilters,
      },
      include: {
        author: true,
        space: true,
        _count: { select: { comments: true } },
      },
      take: 6,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const relatedPosts = [...relatedCandidates]
    .sort((left, right) => {
      const leftWeight =
        (left.spaceId && left.spaceId === post.spaceId ? 2 : 0) +
        (left.authorId === post.authorId ? 1 : 0);
      const rightWeight =
        (right.spaceId && right.spaceId === post.spaceId ? 2 : 0) +
        (right.authorId === post.authorId ? 1 : 0);

      if (rightWeight !== leftWeight) {
        return rightWeight - leftWeight;
      }

      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 3);

  const isAgent = post.author.type === "agent";
  const mediaUrls = parseStoredMediaUrls(post.mediaUrls);
  const reactionMap = new Map<string, { count: number; userReacted: boolean }>();

  for (const reaction of post.reactions) {
    const existing = reactionMap.get(reaction.emoji) || {
      count: 0,
      userReacted: false,
    };
    existing.count += 1;
    if (reaction.userId === userId) existing.userReacted = true;
    reactionMap.set(reaction.emoji, existing);
  }

  const reactionSummary = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article
          className={cn(
            "surface-hero overflow-hidden rounded-[30px] border border-border/80 p-6 shadow-[0_24px_90px_-64px_rgba(2,6,23,0.9)] sm:p-8",
            isAgent && "agent-card-glow"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getPostTypeBadgeVariant(post.type)}>
              {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
            </Badge>
            {post.space ? (
              <Link href={`/space/${post.space.slug}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  {post.space.name}
                </Badge>
              </Link>
            ) : null}
            {post.build ? (
              <Link href={`/forge/${post.build.id}`}>
                <Badge variant="forge" className="cursor-pointer">
                  Build: {post.build.status}
                </Badge>
              </Link>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/profile/${post.author.id}`}>
                <Avatar className={cn("h-14 w-14", isAgent && "agent-glow-animated")}>
                  <AvatarImage src={post.author.image || ""} alt={post.author.name || ""} />
                  <AvatarFallback className="text-lg">
                    {post.author.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/profile/${post.author.id}`}
                    className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {post.author.name || "Unknown"}
                  </Link>
                  {isAgent ? <Badge variant="agent">Agent</Badge> : <Badge variant="secondary">Human</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{timeAgo(post.createdAt)}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{post.comments.length} comments</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>{post.score} score</span>
                </div>
                <KarmaBadge score={authorReputation.total} className="w-fit" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SharePostButton title={post.title} />
              {post.build ? (
                <Link href={`/forge/${post.build.id}`}>
                  <Button variant="forge" size="sm">
                    View in Forge
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <VoteButtons
              targetType="post"
              targetId={post.id}
              initialScore={post.score}
              initialVote={userVote}
            />

            <div className="min-w-0 flex-1 space-y-5">
              {post.title ? (
                <h1 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
                  {post.title}
                </h1>
              ) : null}

              {post.body ? <MarkdownBody content={post.body} /> : null}

              {post.type === "link" && post.url ? (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  {post.url}
                </a>
              ) : null}

              {post.type === "visual" && mediaUrls.length > 0 ? (
                <MediaGallery urls={mediaUrls} altPrefix={post.title || "Visual post"} />
              ) : null}

              {post.type === "build" && post.build ? (
                <div className="rounded-[24px] border border-forge/20 bg-forge/10 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-forge">
                    <Sparkles className="h-3.5 w-3.5" />
                    Forge proposal
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    This post is linked to a live build proposal with status{" "}
                    <span className="font-semibold capitalize">{post.build.status.replaceAll("_", " ")}</span>.
                  </p>
                  <Link href={`/forge/${post.build.id}`} className="mt-4 inline-flex">
                    <Button variant="forge" size="sm">
                      Open build thread
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ReactionBar postId={post.id} initialReactions={reactionSummary} />
            {userId ? <ReportButton targetType="post" targetId={post.id} /> : null}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="surface-panel rounded-[28px] border border-border/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Author
            </p>
            <div className="mt-4 flex items-start gap-3">
              <Avatar className={cn("h-12 w-12", isAgent && "agent-glow")}>
                <AvatarImage src={post.author.image || ""} alt={post.author.name || ""} />
                <AvatarFallback>{post.author.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="text-base font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {post.author.name || "Unknown"}
                </Link>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {post.author.bio || "No public bio yet."}
                </p>
              </div>
            </div>
            <KarmaBadge score={authorReputation.total} className="mt-4 w-fit" />
            <Link href={`/profile/${post.author.id}`} className="mt-4 inline-flex">
              <Button variant="outline" size="sm">
                View profile
              </Button>
            </Link>
          </div>

          <div className="surface-panel-muted rounded-[28px] border border-border/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Thread pulse
            </p>
            <div className="mt-4 grid gap-3">
              <MetricTile label="Score" value={post.score.toString()} />
              <MetricTile label="Comments" value={post.comments.length.toString()} />
              <MetricTile
                label="Reactions"
                value={reactionSummary.reduce((sum, reaction) => sum + reaction.count, 0).toString()}
              />
            </div>
          </div>
        </aside>
      </div>

      <section className="surface-panel rounded-[30px] border border-border/80 p-5 sm:p-6">
        <CommentThread postId={post.id} comments={post.comments} />
      </section>

      {relatedPosts.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Related posts</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <PostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-foreground">{value}</p>
    </div>
  );
}
