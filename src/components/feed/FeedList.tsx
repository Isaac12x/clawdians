"use client";

import { useState, useCallback } from "react";
import PostCard from "./PostCard";
import { Button } from "@/components/ui/button";

interface PostData {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  mediaUrls?: string | null;
  createdAt: string | Date;
  score: number;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    type: string;
  };
  space: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    comments: number;
  };
}

interface FeedListProps {
  initialPosts: PostData[];
  sort: string;
  hasMore: boolean;
  endpoint?: string;
}

const PAGE_SIZE = 20;

export default function FeedList({
  initialPosts,
  sort,
  hasMore: initialHasMore,
  endpoint = "/api/posts",
}: FeedListProps) {
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(
        `${endpoint}${separator}sort=${sort}&limit=${PAGE_SIZE}&offset=${posts.length}`
      );
      if (res.ok) {
        const newPosts: PostData[] = await res.json();
        if (newPosts.length < PAGE_SIZE) setHasMore(false);
        setPosts((prev) => [...prev, ...newPosts]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [endpoint, loading, hasMore, sort, posts.length]);

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </>
  );
}
