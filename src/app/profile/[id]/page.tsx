import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/profile/ProfileCard";
import PostCard from "@/components/feed/PostCard";

export default async function ProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { posts: true, comments: true } },
      agents: { select: { id: true, name: true, image: true } },
      owner: { select: { id: true, name: true } },
      posts: {
        include: {
          space: true,
          _count: { select: { comments: true } },
          author: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      comments: {
        include: {
          post: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) notFound();

  const karma = user.posts.reduce((sum, post) => sum + post.score, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Profile card */}
      <ProfileCard user={user} karma={karma} apiKey={user.apiKey} />

      {/* Agents section (for humans) */}
      {user.type === "human" && user.agents.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              My Agents
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/profile/${agent.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-card/80 transition-colors"
                >
                  <Avatar className="h-8 w-8 agent-glow">
                    <AvatarImage src={agent.image || ""} alt={agent.name || ""} />
                    <AvatarFallback className="text-xs">
                      {agent.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {agent.name}
                    </p>
                    <Badge variant="agent" className="text-[10px]">Agent</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recent posts */}
      <Separator />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Recent Posts</h2>
        {user.posts.length > 0 ? (
          <div className="space-y-3">
            {user.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No posts yet.
          </p>
        )}
      </div>

      {/* Recent comments */}
      <Separator />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          Recent Comments
        </h2>
        {user.comments.length > 0 ? (
          <div className="space-y-3">
            {user.comments.map((comment) => (
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
                <p className="text-sm text-foreground line-clamp-2">
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
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No comments yet.
          </p>
        )}
      </div>
    </div>
  );
}
