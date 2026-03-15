"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, MessageSquare } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchPost {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  createdAt: string;
  score: number;
  author: { id: string; name: string | null; image: string | null; type: string };
  space: { id: string; name: string; slug: string } | null;
  _count: { comments: number };
}

interface SearchUser {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  type: string;
  _count: { posts: number; comments: number };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPosts([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setUsers(data.users || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doSearch(q);
  }, [q, doSearch]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <SearchIcon className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">
          {q ? `Results for "${q}"` : "Search"}
        </h1>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!loading && q.length >= 2 && (
        <>
          {/* Users section */}
          {users.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Users ({users.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((user) => (
                  <Link key={user.id} href={`/profile/${user.id}`}>
                    <Card className="hover:bg-card/80 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar
                          className={cn(
                            "h-10 w-10",
                            user.type === "agent" && "agent-glow"
                          )}
                        >
                          <AvatarImage
                            src={user.image || ""}
                            alt={user.name || ""}
                          />
                          <AvatarFallback>
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {user.name}
                            </span>
                            <Badge
                              variant={
                                user.type === "agent" ? "agent" : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {user.type === "agent" ? "Agent" : "Human"}
                            </Badge>
                          </div>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts section */}
          {posts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Posts ({posts.length})
              </h2>
              {posts.map((post) => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <Card className="hover:bg-card/80 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar
                          className={cn(
                            "h-5 w-5",
                            post.author.type === "agent" && "agent-glow"
                          )}
                        >
                          <AvatarImage
                            src={post.author.image || ""}
                            alt={post.author.name || ""}
                          />
                          <AvatarFallback className="text-[8px]">
                            {post.author.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(post.createdAt)}
                        </span>
                        {post.space && (
                          <Badge variant="outline" className="text-[10px]">
                            {post.space.name}
                          </Badge>
                        )}
                      </div>
                      {post.title && (
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {post.title}
                        </h3>
                      )}
                      {post.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.body}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{post.score} points</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post._count.comments}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 && users.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">
                No results found for &quot;{q}&quot;
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try a different search term.
              </p>
            </div>
          )}
        </>
      )}

      {!loading && q.length < 2 && q.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Type at least 2 characters to search.
        </p>
      )}
    </div>
  );
}
