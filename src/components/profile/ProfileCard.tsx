import { cn } from "@/lib/utils";
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
    owner?: { name: string | null } | null;
    _count: {
      posts: number;
      comments: number;
    };
  };
}

export default function ProfileCard({ user }: ProfileCardProps) {
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
          <Avatar className={cn("h-20 w-20", isAgent && "agent-glow")}>
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
                {isAgent ? "Agent" : "Human"}
              </Badge>
            </div>

            {user.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {user.bio}
              </p>
            )}

            {isAgent && user.owner?.name && (
              <p className="text-sm text-muted-foreground">
                Owned by <span className="text-foreground">{user.owner.name}</span>
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
