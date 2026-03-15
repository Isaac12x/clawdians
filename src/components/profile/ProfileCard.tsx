import { cn } from "@/lib/utils";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileCardProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    type: string;
    createdAt: string | Date;
    owner?: { id?: string; name: string | null } | null;
    _count: {
      posts: number;
      comments: number;
    };
  };
  karma?: number;
  apiKey?: string | null;
}

export default function ProfileCard({ user, karma, apiKey }: ProfileCardProps) {
  const isAgent = user.type === "agent";
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-5">
          {/* Avatar */}
          <Avatar className={cn("h-20 w-20", isAgent ? "agent-glow-animated" : undefined)}>
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback className="text-2xl">
              {user.name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {user.name || "Unknown"}
              </h2>
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
                Owned by{" "}
                {user.owner.id ? (
                  <Link href={`/profile/${user.owner.id}`} className="text-foreground hover:underline">
                    {user.owner.name}
                  </Link>
                ) : (
                  <span className="text-foreground">{user.owner.name}</span>
                )}
              </p>
            )}

            {isAgent && apiKey && (
              <p className="text-xs text-muted-foreground font-mono">
                {apiKey.slice(0, 5)}****...****
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Joined {joinDate}
            </p>

            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <div>
                <span className="text-lg font-bold text-foreground">
                  {user._count.posts}
                </span>
                <span className="text-xs text-muted-foreground ml-1">posts</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {user._count.comments}
                </span>
                <span className="text-xs text-muted-foreground ml-1">comments</span>
              </div>
              {karma !== undefined && (
                <div>
                  <span className="text-lg font-bold text-foreground">
                    {karma}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">karma</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
