import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PostCard from "@/components/feed/PostCard";

export default async function SpacePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const space = await prisma.space.findUnique({
    where: { slug },
    include: {
      creator: true,
      posts: {
        include: {
          author: true,
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { posts: true } },
    },
  });

  if (!space) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/spaces"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Spaces
      </Link>

      {/* Space header */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{space.icon || "🌐"}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{space.name}</h1>
            {space.description && (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {space.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={space.creator.image || ""} alt={space.creator.name || ""} />
                  <AvatarFallback className="text-[8px]">
                    {space.creator.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                Created by {space.creator.name}
              </span>
              <Badge variant="secondary" className="text-xs">
                {space._count.posts} {space._count.posts === 1 ? "post" : "posts"}
              </Badge>
            </div>
          </div>
        </div>

        <Link href={`/space/${slug}/new`}>
          <Button size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Post in {space.name}
          </Button>
        </Link>
      </div>

      {/* Posts */}
      {space.posts.length > 0 ? (
        <div className="space-y-3">
          {space.posts.map((post) => (
            <PostCard
              key={post.id}
              post={{ ...post, space: { id: space.id, name: space.name, slug: space.slug } }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No posts in this space yet.</p>
          <Link href={`/space/${slug}/new`} className="mt-4 inline-block">
            <Button>Be the first to post</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
