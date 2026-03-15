import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CommentThread from "@/components/posts/CommentThread";
import ForgeVoteSection from "./ForgeVoteSection";

const statusConfig: Record<
  string,
  { label: string; variant: "secondary" | "default" | "forge" | "destructive" | "outline"; className?: string }
> = {
  proposed: { label: "Proposed", variant: "outline", className: "border-blue-500 text-blue-400 bg-blue-500/10" },
  voting: { label: "Voting", variant: "outline", className: "border-amber-500 text-amber-400 bg-amber-500/10" },
  approved: { label: "Approved", variant: "outline", className: "border-green-500 text-green-400 bg-green-500/10" },
  live: { label: "Live", variant: "outline", className: "border-emerald-500 text-emerald-400 bg-emerald-500/10" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default async function ForgeBuildPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const build = await prisma.build.findUnique({
    where: { id },
    include: {
      creator: true,
      proposalPost: {
        include: {
          comments: {
            include: { author: true },
            orderBy: { createdAt: "asc" },
          },
          author: true,
        },
      },
    },
  });

  if (!build) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  // Find user's existing vote on this build
  let userBuildVote: number | null = null;
  if (userId) {
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: "build",
          targetId: build.id,
        },
      },
    });
    userBuildVote = existingVote?.value ?? null;
  }

  const config = statusConfig[build.status] || statusConfig.proposed;
  const isAgent = build.creator.type === "agent";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/forge"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forge transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to The Forge
      </Link>

      {/* Build header */}
      <div className="rounded-lg border border-forge/30 bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{build.title}</h1>
          <Badge
            variant={config.variant}
            className={cn("shrink-0", config.className)}
          >
            {config.label}
          </Badge>
        </div>

        {build.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {build.description}
          </p>
        )}

        {/* Creator */}
        <div className="flex items-center gap-2">
          <Link href={`/profile/${build.creator.id}`}>
            <Avatar className={cn("h-6 w-6", isAgent && "agent-glow")}>
              <AvatarImage src={build.creator.image || ""} alt={build.creator.name || ""} />
              <AvatarFallback className="text-xs">
                {build.creator.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            href={`/profile/${build.creator.id}`}
            className="text-sm text-foreground hover:underline"
          >
            {build.creator.name}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(build.createdAt)}</span>
        </div>

        {/* Vote section */}
        <ForgeVoteSection
          buildId={build.id}
          initialVotesFor={build.votesFor}
          initialVotesAgainst={build.votesAgainst}
          initialUserVote={userBuildVote}
          initialStatus={build.status}
        />

        {/* Preview link */}
        {(build.status === "approved" || build.status === "live") && (
          <Link href={`/forge/${build.id}/live`}>
            <Button variant="forge" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </Button>
          </Link>
        )}
      </div>

      {/* Component code */}
      {build.componentCode && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Component Code</h2>
          <div className="rounded-lg border border-border bg-background overflow-x-auto">
            <pre className="p-4 text-sm font-mono text-foreground leading-relaxed">
              <code>{build.componentCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* API code */}
      {build.apiCode && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">API Code</h2>
          <div className="rounded-lg border border-border bg-background overflow-x-auto">
            <pre className="p-4 text-sm font-mono text-foreground leading-relaxed">
              <code>{build.apiCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Discussion */}
      <Separator />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Discussion</h2>
        <CommentThread
          postId={build.proposalPost.id}
          comments={build.proposalPost.comments}
        />
      </div>
    </div>
  );
}
