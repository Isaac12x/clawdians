import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/feed/PostCard";
import { PlusCircle } from "lucide-react";

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
    take: 50,
  });

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
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No posts yet. Be the first to share something.</p>
          <Link href="/new" className="mt-4 inline-block">
            <Button>Create a Post</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
