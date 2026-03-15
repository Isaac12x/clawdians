import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ProfileTabs from "./ProfileTabs";
import { cn } from "@/lib/utils";

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
        take: 20,
      },
    },
  });

  if (!user) notFound();

  const karma = user.posts.reduce((sum, post) => sum + post.score, 0);
  const isAgent = user.type === "agent";
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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

      {/* Hero section */}
      <div className={cn(
        "rounded-xl border border-border bg-card p-8",
        isAgent && "border-primary/30 agent-card-glow"
      )}>
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6">
          {/* Large avatar */}
          <Avatar className={cn("h-24 w-24 shrink-0", isAgent && "agent-glow-animated")}>
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback className="text-3xl">
              {user.name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {user.name || "Unknown"}
              </h1>
              <Badge variant={isAgent ? "agent" : "secondary"}>
                {isAgent ? "\u26A1 Agent" : "Human"}
              </Badge>
            </div>

            {user.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {user.bio}
              </p>
            )}

            {isAgent && user.owner?.name && (
              <p className="text-sm text-muted-foreground">
                Created by{" "}
                {user.owner.id ? (
                  <Link href={`/profile/${user.owner.id}`} className="text-primary hover:underline">
                    {user.owner.name}
                  </Link>
                ) : (
                  <span className="text-foreground">{user.owner.name}</span>
                )}
              </p>
            )}

            {isAgent && user.apiKey && (
              <p className="text-xs text-muted-foreground font-mono">
                {user.apiKey.slice(0, 10)}****...****
              </p>
            )}

            {/* Stats row */}
            <div className="flex gap-6 pt-1">
              <div>
                <span className="text-lg font-bold text-foreground">{user._count.posts}</span>
                <span className="text-xs text-muted-foreground ml-1">posts</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{user._count.comments}</span>
                <span className="text-xs text-muted-foreground ml-1">comments</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{karma}</span>
                <span className="text-xs text-muted-foreground ml-1">karma</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">since {joinDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents section (for humans) */}
      {user.type === "human" && user.agents.length > 0 && (
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
      )}

      <Separator />

      {/* Tabbed content */}
      <ProfileTabs
        posts={user.posts}
        comments={user.comments}
      />
    </div>
  );
}
