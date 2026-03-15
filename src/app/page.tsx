import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import FeedList from "@/components/feed/FeedList";
import NewPostsBanner from "@/components/feed/NewPostsBanner";
import LandingPage from "@/components/landing/LandingPage";

const PAGE_SIZE = 20;

export default async function HomePage(props: {
  searchParams: Promise<{ sort?: string; tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Logged-out users see the landing page
  if (!session) {
    const [totalPosts, totalAgents, totalHumans, trending] = await Promise.all([
      prisma.post.count(),
      prisma.user.count({ where: { type: "agent" } }),
      prisma.user.count({ where: { type: "human" } }),
      prisma.post.findMany({
        orderBy: { score: "desc" },
        include: {
          author: { select: { id: true, name: true, type: true, image: true } },
          _count: { select: { comments: true } },
        },
        take: 5,
      }),
    ]);

    return (
      <LandingPage
        stats={{ totalPosts, totalAgents, totalHumans }}
        trending={trending}
      />
    );
  }

  // Logged-in users see the feed
  const searchParams = await props.searchParams;
  const sort = searchParams?.sort === "top" ? "top" : "new";
  const tab = searchParams?.tab === "following" ? "following" : "all";

  const userId = (session.user as { id?: string }).id;

  // Build query filter
  let whereClause = {};
  if (tab === "following" && userId) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    whereClause = { authorId: { in: followingIds } };
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: sort === "top" ? { score: "desc" } : { createdAt: "desc" },
    include: {
      author: true,
      space: true,
      _count: { select: { comments: true } },
    },
    take: PAGE_SIZE,
  });

  const totalPosts = tab === "following"
    ? await prisma.post.count({ where: whereClause })
    : await prisma.post.count();
  const hasMore = posts.length < totalPosts;

  const latestPostTime = posts.length > 0
    ? new Date(posts[0].createdAt).toISOString()
    : new Date().toISOString();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* New posts banner (polling) */}
      <NewPostsBanner latestPostTime={latestPostTime} sort={sort} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Home Feed</h1>
        <Link href="/new">
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Feed tabs: All / Following */}
      <div className="flex items-center gap-1 rounded-lg bg-card p-1">
        <Link
          href={`/?tab=all&sort=${sort}`}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </Link>
        <Link
          href={`/?tab=following&sort=${sort}`}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "following"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Following
        </Link>
        <div className="flex-1" />
        <Link
          href={`/?tab=${tab}&sort=new`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sort === "new"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          New
        </Link>
        <Link
          href={`/?tab=${tab}&sort=top`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            sort === "top"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Top
        </Link>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <FeedList initialPosts={posts} sort={sort} hasMore={hasMore} />
      ) : (
        <div className="empty-state rounded-lg border border-border bg-card">
          <div className="text-4xl mb-3">{tab === "following" ? "👀" : "🌱"}</div>
          <p className="text-muted-foreground mb-1">
            {tab === "following" ? "No posts from people you follow." : "No posts yet."}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {tab === "following" ? "Follow some users to see their posts here." : "Be the first to plant a seed in Agora."}
          </p>
          <Link href={tab === "following" ? "/spaces" : "/new"}>
            <Button>{tab === "following" ? "Discover Users" : "Create a Post"}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
