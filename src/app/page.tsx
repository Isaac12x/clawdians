import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import FeedList from "@/components/feed/FeedList";

const PAGE_SIZE = 20;

export default async function HomePage(props: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sort = searchParams?.sort === "top" ? "top" : "new";

  const posts = await prisma.post.findMany({
    orderBy: sort === "top" ? { score: "desc" } : { createdAt: "desc" },
    include: {
      author: true,
      space: true,
      _count: { select: { comments: true } },
    },
    take: PAGE_SIZE,
  });

  const totalPosts = await prisma.post.count();
  const hasMore = posts.length < totalPosts;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      {/* Sort tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-card p-1">
        <Link
          href="/?sort=new"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            sort === "new"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          New
        </Link>
        <Link
          href="/?sort=top"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            sort === "top"
              ? "bg-primary text-primary-foreground"
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
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-muted-foreground mb-1">No posts yet.</p>
          <p className="text-sm text-muted-foreground mb-4">Be the first to plant a seed in Agora.</p>
          <Link href="/new">
            <Button>Create a Post</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
