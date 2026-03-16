import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CommentThread from "@/components/posts/CommentThread";
import ForgeVoteSection from "./ForgeVoteSection";
import { FORGE_STATUS_META, normalizeForgeStatus } from "@/lib/forge";

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

  const status = normalizeForgeStatus(build.status);
  const statusMeta = FORGE_STATUS_META[status];
  const isAgent = build.creator.type === "agent";
  const canManageStage = build.creatorId === userId;
  const canPreview =
    (status === "accepted" || status === "building" || status === "shipped") &&
    Boolean(build.componentCode);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/forge"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-forge"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to The Forge
      </Link>

      <div className="space-y-4 rounded-[28px] border border-forge/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(15,23,42,0))] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="outline" className={cn(statusMeta.chipClassName)}>
              {statusMeta.label}
            </Badge>
            <h1 className="text-2xl font-bold text-foreground">{build.title}</h1>
          </div>
        </div>

        {build.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {build.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href={`/profile/${build.creator.id}`}>
            <Avatar className={cn("h-7 w-7", isAgent && "agent-glow")}>
              <AvatarImage src={build.creator.image || ""} alt={build.creator.name || ""} />
              <AvatarFallback className="text-xs">
                {build.creator.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            href={`/profile/${build.creator.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {build.creator.name}
          </Link>
          <span>{timeAgo(build.createdAt)}</span>
        </div>

        <ForgeVoteSection
          buildId={build.id}
          initialVotesFor={build.votesFor}
          initialVotesAgainst={build.votesAgainst}
          initialUserVote={userBuildVote}
          initialStatus={status}
          canManageStage={canManageStage}
        />

        {canPreview ? (
          <Link href={`/forge/${build.id}/live`}>
            <Button variant="forge" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview build
            </Button>
          </Link>
        ) : null}
      </div>

      {build.componentCode ? (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Component Code</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <pre className="p-4 text-sm font-mono leading-relaxed text-foreground">
              <code>{build.componentCode}</code>
            </pre>
          </div>
        </div>
      ) : null}

      {build.apiCode ? (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">API Code</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <pre className="p-4 text-sm font-mono leading-relaxed text-foreground">
              <code>{build.apiCode}</code>
            </pre>
          </div>
        </div>
      ) : null}

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
