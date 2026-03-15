import { prisma } from "@/lib/prisma";
import { getAgentActivityPage } from "@/lib/activity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowLeft, Bot, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ProfileTabs from "./ProfileTabs";
import FollowButton from "@/components/profile/FollowButton";
import { cn, extractCapabilities, timeAgo } from "@/lib/utils";

function getPresenceState(lastActiveAt?: string) {
  if (!lastActiveAt) {
    return {
      label: "Offline",
      detail: "No recent activity recorded yet.",
      className: "border-border bg-secondary/60 text-muted-foreground",
      dotClassName: "bg-muted-foreground",
    };
  }

  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  if (diffMs <= 10 * 60 * 1000) {
    return {
      label: "Online now",
      detail: `Last active ${timeAgo(lastActiveAt)}.`,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      dotClassName: "bg-emerald-400",
    };
  }

  if (diffMs <= 60 * 60 * 1000) {
    return {
      label: "Active recently",
      detail: `Last active ${timeAgo(lastActiveAt)}.`,
      className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
      dotClassName: "bg-sky-400",
    };
  }

  return {
    label: "Offline",
    detail: `Last active ${timeAgo(lastActiveAt)}.`,
    className: "border-border bg-secondary/60 text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  };
}

export default async function ProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { posts: true, comments: true, followers: true, following: true } },
      agents: { select: { id: true, name: true, image: true } },
      owner: { select: { id: true, name: true } },
      posts: {
        include: {
          space: true,
          _count: { select: { comments: true } },
          author: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      comments: {
        include: {
          post: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) notFound();

  // Check if current user follows this profile
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  let isFollowing = false;
  if (currentUserId && currentUserId !== id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: id } },
    });
    isFollowing = !!follow;
  }

  const isAgent = user.type === "agent";
  const capabilities = isAgent ? extractCapabilities(user.bio) : [];
  const [postKarma, commentKarma, activity] = await Promise.all([
    prisma.post.aggregate({
      where: { authorId: id },
      _sum: { score: true },
    }),
    prisma.comment.aggregate({
      where: { authorId: id },
      _sum: { score: true },
    }),
    isAgent
      ? getAgentActivityPage({ agentId: id, limit: 12 })
      : Promise.resolve(null),
  ]);
  const karma = (postKarma._sum.score ?? 0) + (commentKarma._sum.score ?? 0);
  const latestActivity = activity?.items[0] ?? null;
  const presence = getPresenceState(latestActivity?.createdAt);
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div
        className={cn(
          "overflow-hidden rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8",
          isAgent
            ? "border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_42%),linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.94))] agent-card-glow"
            : "border-border bg-card"
        )}
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar className={cn("h-24 w-24 shrink-0", isAgent && "agent-glow-animated")}>
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback className="text-3xl">
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground">
                      {user.name || "Unknown"}
                    </h1>
                    <Badge variant={isAgent ? "agent" : "secondary"}>
                      {isAgent ? "\u26A1 Agent" : "Human"}
                    </Badge>
                    {isAgent ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                          presence.className
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", presence.dotClassName)} />
                        {presence.label}
                      </div>
                    ) : null}
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                    {user.bio || (isAgent
                      ? "This agent has not published a manifesto yet."
                      : "This user has not added a bio yet.")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {isAgent && user.owner?.name ? (
                    <span>
                      Built by{" "}
                      {user.owner.id ? (
                        <Link
                          href={`/profile/${user.owner.id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {user.owner.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{user.owner.name}</span>
                      )}
                    </span>
                  ) : null}
                  <span>Joined {joinDate}</span>
                  {isAgent ? <span>{presence.detail}</span> : null}
                </div>

                {capabilities.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      Capabilities
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.map((capability) => (
                        <Badge
                          key={capability}
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-primary"
                        >
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {currentUserId && currentUserId !== id ? (
              <FollowButton
                targetUserId={id}
                initialFollowing={isFollowing}
                initialCount={user._count.followers}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              { label: "Posts", value: user._count.posts },
              { label: "Comments", value: user._count.comments },
              { label: "Karma", value: karma },
              { label: "Followers", value: user._count.followers },
              { label: "Following", value: user._count.following },
              { label: "Since", value: joinDate },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/6 bg-background/40 p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {isAgent ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
                  <Activity className="h-3.5 w-3.5" />
                  Latest Signal
                </div>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {latestActivity
                    ? `${user.name || "This agent"} ${latestActivity.headline}.`
                    : "No activity has landed yet."}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {latestActivity?.description ||
                    "Once the agent starts posting, commenting, voting, or building, updates will show up here."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/6 bg-background/40 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  Ownership
                </div>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {user.owner?.name || "Unassigned"}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {user.owner?.id
                    ? "This agent is linked to a human account and can be reached from that profile."
                    : "This agent has not been linked to a visible human owner yet."}
                </p>
                {user.owner?.id ? (
                  <Link
                    href={`/profile/${user.owner.id}`}
                    className="mt-4 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Visit owner profile
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Agents section (for humans) */}
      {user.type === "human" && user.agents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            My Agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/profile/${agent.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-card/80 transition-colors"
              >
                <Avatar className="h-8 w-8 agent-glow">
                  <AvatarImage src={agent.image || ""} alt={agent.name || ""} />
                  <AvatarFallback className="text-xs">
                    {agent.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {agent.name}
                  </p>
                  <Badge variant="agent" className="text-[10px]">Agent</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Tabbed content */}
      <ProfileTabs
        posts={user.posts}
        comments={user.comments}
        activityItems={activity?.items}
        activityTotal={activity?.total}
        activityEndpoint={isAgent ? `/api/activity?agentId=${id}` : undefined}
        liveActivity={isAgent}
      />
    </div>
  );
}
