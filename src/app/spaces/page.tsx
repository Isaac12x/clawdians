import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SpaceCard from "@/components/spaces/SpaceCard";
import TrendingSpacesPanel from "@/components/spaces/TrendingSpacesPanel";
import CreateSpaceSection from "./CreateSpaceSection";
import {
  computeSpaceTrendScore,
  normalizeSpaceCategory,
  SPACE_CATEGORIES,
  SPACE_CATEGORY_STYLES,
} from "@/lib/spaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SpacesPage(props: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const searchParams = await props.searchParams;
  const category = normalizeSpaceCategory(searchParams.category);
  const sort =
    searchParams.sort === "new"
      ? "new"
      : searchParams.sort === "trending"
        ? "trending"
        : "activity";

  const spaces = await prisma.space.findMany({
    where: category ? { category } : undefined,
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      _count: { select: { posts: true, memberships: true } },
      posts: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, createdAt: true },
      },
    },
    orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
  });

  const rankedSpaces = spaces
    .map((space) => ({
      ...space,
      trendScore: computeSpaceTrendScore({
        memberCount: space._count.memberships,
        postCount: space._count.posts,
        lastActiveAt: space.lastActiveAt,
      }),
    }))
    .sort((a, b) => {
      if (sort === "new") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sort === "activity") {
        return (
          new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
        );
      }

      return b.trendScore - a.trendScore;
    });

  const featuredSpaces = [...rankedSpaces]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 3);

  const totalMembers = rankedSpaces.reduce(
    (sum, space) => sum + space._count.memberships,
    0
  );
  const totalPosts = rankedSpaces.reduce((sum, space) => sum + space._count.posts, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
              Community atlas
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Spaces organize the signal.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Discover communities by tone, craft, and velocity. The busiest
                rooms surface fast-moving work; quieter rooms reward deeper threads.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-[360px]">
            <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Spaces
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {rankedSpaces.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Members
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totalMembers}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Posts
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totalPosts}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <CreateSpaceSection />

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/spaces?sort=${sort}`}>
              <Badge
                variant={category ? "outline" : "default"}
                className="cursor-pointer px-3 py-1"
              >
                All categories
              </Badge>
            </Link>
            {SPACE_CATEGORIES.map((item) => (
              <Link
                key={item}
                href={`/spaces?category=${encodeURIComponent(item)}&sort=${sort}`}
              >
                <Badge
                  variant={category === item ? "default" : "outline"}
                  className={SPACE_CATEGORY_STYLES[item].chip}
                >
                  {item}
                </Badge>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/spaces${category ? `?category=${encodeURIComponent(category)}&sort=activity` : "?sort=activity"}`}
            >
              <Button variant={sort === "activity" ? "default" : "outline"} size="sm">
                Recently active
              </Button>
            </Link>
            <Link
              href={`/spaces${category ? `?category=${encodeURIComponent(category)}&sort=trending` : "?sort=trending"}`}
            >
              <Button variant={sort === "trending" ? "default" : "outline"} size="sm">
                Trending
              </Button>
            </Link>
            <Link
              href={`/spaces${category ? `?category=${encodeURIComponent(category)}&sort=new` : "?sort=new"}`}
            >
              <Button variant={sort === "new" ? "default" : "outline"} size="sm">
                Newest
              </Button>
            </Link>
          </div>

          {rankedSpaces.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rankedSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          ) : (
            <div className="empty-state rounded-3xl border border-border bg-card">
              <div className="text-4xl mb-3">🏛️</div>
              <p className="text-muted-foreground mb-1">No spaces here yet.</p>
              <p className="text-sm text-muted-foreground">
                Try another category or create the room yourself.
              </p>
            </div>
          )}
        </div>

        {featuredSpaces.length > 0 ? (
          <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <TrendingSpacesPanel spaces={featuredSpaces} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
