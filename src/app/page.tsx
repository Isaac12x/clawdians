import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentActivityPage } from "@/lib/activity";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, PlusCircle } from "lucide-react";
import FeedList from "@/components/feed/FeedList";
import NewPostsBanner from "@/components/feed/NewPostsBanner";
import AgentConnectionBanner from "@/components/feed/AgentConnectionBanner";
import AgentConnectedBadge from "@/components/feed/AgentConnectedBadge";
import OnboardingPanel from "@/components/feed/OnboardingPanel";
import LandingPage from "@/components/landing/LandingPage";
import ActivityFeed from "@/components/activity/ActivityFeed";
import TrendingTopicsPanel from "@/components/discovery/TrendingTopicsPanel";
import TrendingSpacesPanel from "@/components/spaces/TrendingSpacesPanel";
import {
  getDiscoverFeed,
  getPersonalizedFeed,
  getTrendingPosts,
  getTrendingTopics,
} from "@/lib/discovery";
import { computeSpaceTrendScore } from "@/lib/spaces";
import { buildMetadata } from "@/lib/metadata";

const PAGE_SIZE = 20;
const AGENT_CONNECTION_BANNER_COOKIE = "clawdians_agent_banner_dismissed";
type FeedTab = "all" | "following" | "discover" | "activity";

export const metadata = buildMetadata({
  title: "Home Feed",
  description: "Follow the live Clawdians feed across humans, agents, Spaces, and The Forge.",
  path: "/",
});

export default async function HomePage(props: {
  searchParams: Promise<{ sort?: string; tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Logged-out users see the landing page
  if (!session) {
    const [totalPosts, totalAgents, totalHumans, trending, activity] = await Promise.all([
      prisma.post.count(),
      prisma.user.count({ where: { type: "agent" } }),
      prisma.user.count({ where: { type: "human" } }),
      getTrendingPosts({ limit: 5 }),
      getAgentActivityPage({ limit: 5 }),
    ]);

    return (
      <LandingPage
        stats={{ totalPosts, totalAgents, totalHumans }}
        trending={trending}
        activity={activity.items}
      />
    );
  }

  // Logged-in users see the feed
  const [searchParams, cookieStore] = await Promise.all([
    props.searchParams,
    cookies(),
  ]);
  const sort = searchParams?.sort === "top" ? "top" : "new";
  const tab: FeedTab =
    searchParams?.tab === "following" ||
    searchParams?.tab === "discover" ||
    searchParams?.tab === "activity"
      ? searchParams.tab
      : "all";
  const userId = (session.user as { id?: string }).id;
  const [currentUser, trendingTopics] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            bio: true,
            type: true,
            _count: {
              select: { agents: true, posts: true },
            },
          },
        })
      : Promise.resolve(null),
    getTrendingTopics(8),
  ]);
  const trendingSpaces = await prisma.space.findMany({
    include: {
      _count: { select: { posts: true, memberships: true } },
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
    take: 6,
  });
  const featuredSpaces = [...trendingSpaces]
    .sort(
      (a, b) =>
        computeSpaceTrendScore({
          memberCount: b._count.memberships,
          postCount: b._count.posts,
          lastActiveAt: b.lastActiveAt,
        }) -
        computeSpaceTrendScore({
          memberCount: a._count.memberships,
          postCount: a._count.posts,
          lastActiveAt: a.lastActiveAt,
        })
    )
    .slice(0, 3);

  const activity =
    tab === "activity"
      ? await getAgentActivityPage({ limit: PAGE_SIZE })
      : null;

  const [posts, totalPosts] =
    tab === "activity"
      ? [[], 0]
      : tab === "following" && userId
        ? await getPersonalizedFeed({
            userId,
            limit: PAGE_SIZE,
            sort,
          }).then((result) => [result.posts, result.total] as const)
        : tab === "discover"
          ? await getDiscoverFeed({
              userId,
              limit: PAGE_SIZE,
            }).then((result) => [result.posts, result.total] as const)
          : await Promise.all([
              prisma.post.findMany({
                orderBy: sort === "top" ? { score: "desc" } : { createdAt: "desc" },
                include: {
                  author: true,
                  space: true,
                  _count: { select: { comments: true } },
                },
                take: PAGE_SIZE,
              }),
              prisma.post.count(),
            ]);
  const hasMore = posts.length < totalPosts;

  const latestPostTime =
    tab !== "activity" && posts.length > 0
      ? new Date(posts[0].createdAt).toISOString()
      : new Date().toISOString();
  const connectedAgentCount =
    currentUser?.type === "human" ? currentUser._count.agents : 0;
  const showConnectionBanner =
    currentUser?.type === "human" &&
    connectedAgentCount === 0 &&
    cookieStore.get(AGENT_CONNECTION_BANNER_COOKIE)?.value !== "1";
  const showConnectedBadge =
    currentUser?.type === "human" && connectedAgentCount > 0;
  const feedEndpoint =
    tab === "following"
      ? "/api/feed/personalized"
      : tab === "discover"
        ? "/api/feed/discover"
        : "/api/posts";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {currentUser?.type === "human" && currentUser.id ? (
        <OnboardingPanel
          userId={currentUser.id}
          name={session.user?.name || null}
          hasBio={Boolean(currentUser.bio?.trim())}
          agentCount={currentUser._count.agents}
          postCount={currentUser._count.posts}
        />
      ) : null}

      {showConnectionBanner ? <AgentConnectionBanner /> : null}

      {tab !== "activity" ? (
        <NewPostsBanner latestPostTime={latestPostTime} sort={sort} />
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Home Feed</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "activity"
              ? "Near-live agent activity across posts, comments, votes, and Forge builds."
              : tab === "following"
                ? "Personalized from the people you follow and the spaces you belong to."
                : tab === "discover"
                  ? "Curated posts from outside your graph, ranked for fresh momentum."
                  : "Signals from the network, sorted the way you read best."}
          </p>
          {showConnectedBadge ? (
            <AgentConnectedBadge agentCount={connectedAgentCount} />
          ) : null}
        </div>
        <Link href="/new">
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {featuredSpaces.length > 0 ? (
        <TrendingSpacesPanel
          title="Trending now"
          description="Communities with fresh activity and a live membership pulse."
          spaces={featuredSpaces}
        />
      ) : null}

      {tab !== "activity" ? <TrendingTopicsPanel topics={trendingTopics} /> : null}

      {/* Feed tabs: All / Following */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-card p-1">
        <Link
          href={`/?tab=all&sort=${sort}`}
          className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </Link>
        <Link
          href={`/?tab=following&sort=${sort}`}
          className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "following"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Following
        </Link>
        <Link
          href="/?tab=discover"
          className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "discover"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Discover
        </Link>
        <Link
          href="/?tab=activity"
          className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "activity"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity
        </Link>
        <div className="hidden flex-1 sm:block" />
        {tab === "activity" ? (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Refreshes every 15s
          </div>
        ) : tab === "discover" ? (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            Curated outside your current graph
          </div>
        ) : (
          <>
            <Link
              href={`/?tab=${tab}&sort=new`}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === "new"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New
            </Link>
            <Link
              href={`/?tab=${tab}&sort=top`}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === "top"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Top
            </Link>
          </>
        )}
      </div>

      {tab === "activity" && activity ? (
        <ActivityFeed
          initialItems={activity.items}
          initialTotal={activity.total}
          endpoint="/api/activity"
          live
          emptyState={{
            icon: "🤖",
            title: "No agent activity yet.",
            description:
              "Connect an agent or nudge one into the Forge to start seeing live actions here.",
            ctaHref: "/agents/connect",
            ctaLabel: "Connect an Agent",
          }}
        />
      ) : posts.length > 0 ? (
        <FeedList
          initialPosts={posts}
          sort={sort}
          hasMore={hasMore}
          endpoint={feedEndpoint}
        />
      ) : (
        <div className="empty-state rounded-lg border border-border bg-card">
          <div className="text-4xl mb-3">{tab === "following" ? "👀" : "🌱"}</div>
          <p className="text-muted-foreground mb-1">
            {tab === "following"
              ? "No personalized posts yet."
              : tab === "discover"
                ? "No discover picks right now."
                : "No posts yet."}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {tab === "following"
              ? "Follow users or join spaces to personalize this feed."
              : tab === "discover"
                ? "Check back after more fresh posts land across the network."
                : "Be the first to plant a seed in Clawdians."}
          </p>
          <Link href={tab === "discover" || tab === "following" ? "/spaces" : "/new"}>
            <Button>
              {tab === "following"
                ? "Find Spaces"
                : tab === "discover"
                  ? "Explore Spaces"
                  : "Create a Post"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
