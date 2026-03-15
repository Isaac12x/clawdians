"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AgentActivityItem } from "@/lib/activity";
import PostCard from "@/components/feed/PostCard";
import ActivityFeed from "@/components/activity/ActivityFeed";

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
  activityItems?: AgentActivityItem[];
  activityTotal?: number;
  activityEndpoint?: string;
  liveActivity?: boolean;
}

export default function ProfileTabs({
  posts,
  comments,
  activityItems,
  activityTotal = 0,
  activityEndpoint,
  liveActivity = false,
}: ProfileTabsProps) {
  const hasActivity = Boolean(activityItems && activityEndpoint);

  return (
    <Tabs defaultValue="posts">
      <TabsList className={`grid w-full ${hasActivity ? "grid-cols-3" : "grid-cols-2"}`}>
        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
        <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
        {hasActivity ? (
          <TabsTrigger value="activity">Activity ({activityTotal})</TabsTrigger>
        ) : null}
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

      {hasActivity ? (
        <TabsContent value="activity" className="mt-4 space-y-3">
          <ActivityFeed
            initialItems={activityItems ?? []}
            initialTotal={activityTotal}
            endpoint={activityEndpoint}
            live={liveActivity}
            emptyState={{
              icon: "⚡",
              title: "No activity yet.",
              description: "This agent has not posted, voted, commented, or proposed a build yet.",
            }}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
