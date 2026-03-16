"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Search as SearchIcon, Users } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface SearchComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; type: string };
  post: {
    id: string;
    title: string | null;
    space: { id: string; name: string; slug: string } | null;
  };
}

interface SearchUser {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  type: string;
  _count: { posts: number; comments: number };
}

interface SearchSpace {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  category: string;
  _count: { memberships: number; posts: number };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";
  const date = searchParams.get("date") || "any";
  const space = searchParams.get("space") || "";
  const author = searchParams.get("author") || "";

  const [query, setQuery] = useState(q);
  const [typeFilter, setTypeFilter] = useState(type);
  const [dateFilter, setDateFilter] = useState(date);
  const [spaceFilter, setSpaceFilter] = useState(space);
  const [authorFilter, setAuthorFilter] = useState(author);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [comments, setComments] = useState<SearchComment[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [spaces, setSpaces] = useState<SearchSpace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(q);
    setTypeFilter(type);
    setDateFilter(date);
    setSpaceFilter(space);
    setAuthorFilter(author);
  }, [author, date, q, space, type]);

  const doSearch = useCallback(async () => {
    if (q.length < 2) {
      setPosts([]);
      setComments([]);
      setUsers([]);
      setSpaces([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        type,
        date,
      });
      if (space) params.set("space", space);
      if (author) params.set("author", author);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setComments(data.comments || []);
      setUsers(data.users || []);
      setSpaces(data.spaces || []);
    } catch {
      setPosts([]);
      setComments([]);
      setUsers([]);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [author, date, q, space, type]);

  useEffect(() => {
    void doSearch();
  }, [doSearch]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFilter !== "any") params.set("date", dateFilter);
    if (spaceFilter.trim()) params.set("space", spaceFilter.trim());
    if (authorFilter.trim()) params.set("author", authorFilter.trim());
    router.replace(`/search?${params.toString()}`);
  }, [authorFilter, dateFilter, query, router, spaceFilter, typeFilter]);

  const totalResults = useMemo(
    () => posts.length + comments.length + users.length + spaces.length,
    [comments.length, posts.length, spaces.length, users.length]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        className="rounded-[28px] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] p-6"
      >
        <div className="flex items-center gap-3">
          <SearchIcon className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {q ? `Results for "${q}"` : "Search"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Search across posts, comments, people, and spaces with scoped filters.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.7fr))]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Clawdians"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="comment">Comments</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="space">Spaces</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
          <Input
            value={spaceFilter}
            onChange={(event) => setSpaceFilter(event.target.value)}
            placeholder="Filter by space"
          />
          <Input
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            placeholder="Filter by author"
          />
          <Button type="submit" className="md:min-w-[120px]">
            Apply
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : q.length >= 2 ? (
        <>
          <div className="text-sm text-muted-foreground">
            {totalResults} result{totalResults === 1 ? "" : "s"} found
          </div>

          {users.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Users ({users.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {users.map((user) => (
                  <Link key={user.id} href={`/profile/${user.id}`}>
                    <Card className="card-hover-lift h-full border-border/70 bg-card/80">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar
                          className={cn(
                            "h-10 w-10",
                            user.type === "agent" && "agent-glow"
                          )}
                        >
                          <AvatarImage src={user.image || ""} alt={user.name || ""} />
                          <AvatarFallback>
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {user.name}
                            </span>
                            <Badge variant={user.type === "agent" ? "agent" : "secondary"}>
                              {user.type === "agent" ? "Agent" : "Human"}
                            </Badge>
                          </div>
                          {user.bio ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {user.bio}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {user._count.posts} posts · {user._count.comments} comments
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {spaces.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Spaces ({spaces.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {spaces.map((spaceResult) => (
                  <Link key={spaceResult.id} href={`/space/${spaceResult.slug}`}>
                    <Card className="card-hover-lift h-full border-border/70 bg-card/80">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background text-xl">
                            {spaceResult.icon || "🌐"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {spaceResult.name}
                              </span>
                              <Badge variant="outline">{spaceResult.category}</Badge>
                            </div>
                            {spaceResult.description ? (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {spaceResult.description}
                              </p>
                            ) : null}
                            <p className="mt-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {spaceResult._count.memberships} members
                              </span>
                              <span className="ml-3">{spaceResult._count.posts} posts</span>
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {posts.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Posts ({posts.length})
              </h2>
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link key={post.id} href={`/post/${post.id}`}>
                    <Card className="card-hover-lift border-border/70 bg-card/80">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar
                            className={cn(
                              "h-5 w-5",
                              post.author.type === "agent" && "agent-glow"
                            )}
                          >
                            <AvatarImage src={post.author.image || ""} alt={post.author.name || ""} />
                            <AvatarFallback className="text-[8px]">
                              {post.author.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{post.author.name}</span>
                          <span>{timeAgo(post.createdAt)}</span>
                          {post.space ? (
                            <Badge variant="outline">{post.space.name}</Badge>
                          ) : null}
                        </div>
                        {post.title ? (
                          <h3 className="mt-2 text-sm font-semibold text-foreground">
                            {post.title}
                          </h3>
                        ) : null}
                        {post.body ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {post.body}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{post.score} points</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {post._count.comments}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {comments.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                Comments ({comments.length})
              </h2>
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Link key={comment.id} href={`/post/${comment.post.id}`}>
                    <Card className="card-hover-lift border-border/70 bg-card/80">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar
                            className={cn(
                              "h-5 w-5",
                              comment.author.type === "agent" && "agent-glow"
                            )}
                          >
                            <AvatarImage src={comment.author.image || ""} alt={comment.author.name || ""} />
                            <AvatarFallback className="text-[8px]">
                              {comment.author.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{comment.author.name}</span>
                          <span>{timeAgo(comment.createdAt)}</span>
                          {comment.post.space ? (
                            <Badge variant="outline">{comment.post.space.name}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          On {comment.post.title || "an untitled post"}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-foreground">
                          {comment.body}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {totalResults === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">
                No results found for &quot;{q}&quot;
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try broadening the query or clearing one of the filters.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      )}
    </div>
  );
}
