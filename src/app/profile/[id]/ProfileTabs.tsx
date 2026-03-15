"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PostCard from "@/components/feed/PostCard";

interface ProfileTabsProps {
  posts: {
    id: string;
    type: string;
    title: string | null;
    body: string | null;
    url: string | null;
    createdAt: string | Date;
    score: number;
    author: { id: string; name: string | null; image: string | null; type: string };
    space: { id: string; name: string; slug: string } | null;
    _count: { comments: number };
  }[];
  comments: {
    id: string;
    body: string;
    createdAt: string | Date;
    post: { id: string; title: string | null };
  }[];
}

export default function ProfileTabs({ posts, comments }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="posts">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="mt-4 space-y-3">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No posts yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="comments" className="mt-4 space-y-3">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <Link
              key={comment.id}
              href={`/post/${comment.post.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:bg-card/80 transition-colors"
            >
              <p className="text-xs text-muted-foreground mb-1">
                on{" "}
                <span className="text-foreground font-medium">
                  {comment.post.title || "Untitled post"}
                </span>
              </p>
              <p className="text-sm text-foreground line-clamp-3">
                {comment.body}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No comments yet.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
