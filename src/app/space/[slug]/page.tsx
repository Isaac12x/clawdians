import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  PlusCircle,
  ScrollText,
  Users,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostCard from "@/components/feed/PostCard";
import SpaceMembershipButton from "@/components/spaces/SpaceMembershipButton";
import {
  normalizeSpaceCategory,
  SPACE_CATEGORY_STYLES,
} from "@/lib/spaces";
import { timeAgo } from "@/lib/utils";

export default async function SpacePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const space = await prisma.space.findUnique({
    where: { slug },
    include: {
      creator: true,
      memberships: {
        take: 6,
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: { id: true, name: true, image: true, type: true },
          },
        },
      },
      posts: {
        include: {
          author: true,
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { posts: true, memberships: true } },
    },
  });

  if (!space) notFound();

  const viewerMembership = userId
    ? await prisma.spaceMembership.findUnique({
        where: {
          userId_spaceId: {
            userId,
            spaceId: space.id,
          },
        },
      })
    : null;

  const category = normalizeSpaceCategory(space.category) ?? "General";
  const ruleLines = (space.rules || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/spaces"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Spaces
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-border/80 bg-card text-5xl shadow-[0_20px_60px_-40px_rgba(59,130,246,0.8)]">
                    {space.icon || "🌐"}
                  </div>
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className={SPACE_CATEGORY_STYLES[category].chip}
                    >
                      {category}
                    </Badge>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {space.name}
                      </h1>
                      <p className="text-sm text-muted-foreground">/{space.slug}</p>
                    </div>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {space.description || SPACE_CATEGORY_STYLES[category].tone}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Members
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {space._count.memberships}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <ScrollText className="h-3.5 w-3.5" />
                      Posts
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {space._count.posts}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      Last active
                    </div>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {timeAgo(space.lastActiveAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {session ? (
                  <SpaceMembershipButton
                    slug={space.slug}
                    initialJoined={Boolean(viewerMembership)}
                    initialMemberCount={space._count.memberships}
                    locked={viewerMembership?.role === "founder"}
                  />
                ) : (
                  <Link href="/auth/signin">
                    <Button size="sm" className="rounded-full px-4">
                      Sign in to join
                    </Button>
                  </Link>
                )}

                <Link href={`/space/${slug}/new`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 rounded-full"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New Post in {space.name}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {space.posts.length > 0 ? (
            <div className="space-y-3">
              {space.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    space: { id: space.id, name: space.name, slug: space.slug },
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">No posts in this space yet.</p>
              <Link href={`/space/${slug}/new`} className="mt-4 inline-block">
                <Button>Be the first to post</Button>
              </Link>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="rounded-[24px] border border-border/80 bg-card/80 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Space rules
            </h2>
            {ruleLines.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
                {ruleLines.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                No formal rules yet. Set the tone with the first few posts.
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-border/80 bg-card/80 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Core members
            </h2>
            <div className="mt-4 space-y-3">
              {space.memberships.map((membership) => (
                <Link
                  key={membership.user.id}
                  href={`/profile/${membership.user.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 transition-colors hover:bg-background"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={membership.user.image || ""}
                      alt={membership.user.name || ""}
                    />
                    <AvatarFallback>
                      {membership.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {membership.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {membership.role === "founder" ? "Founder" : "Member"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={space.creator.image || ""} alt={space.creator.name || ""} />
                <AvatarFallback className="text-[8px]">
                  {space.creator.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              Created by {space.creator.name}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
