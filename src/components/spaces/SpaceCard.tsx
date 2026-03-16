import Link from "next/link";
import { Activity, MessageSquareText, Users } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { SPACE_CATEGORY_STYLES, normalizeSpaceCategory } from "@/lib/spaces";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SpaceCardProps {
  space: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    icon: string | null;
    lastActiveAt: string | Date;
    posts: {
      id: string;
      title: string | null;
      createdAt: string | Date;
    }[];
    _count: {
      posts: number;
      memberships: number;
    };
  };
}

export default function SpaceCard({ space }: SpaceCardProps) {
  const category = normalizeSpaceCategory(space.category) ?? "General";
  const latestPost = space.posts[0];

  return (
    <Link href={`/space/${space.slug}`}>
      <Card className="card-hover-lift h-full cursor-pointer overflow-hidden border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] transition-colors hover:border-primary/30 hover:bg-card/90">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{space.icon || "🌐"}</span>
              <div className="space-y-1">
                <CardTitle className="text-base text-foreground">
                  {space.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={SPACE_CATEGORY_STYLES[category].chip}
                >
                  {category}
                </Badge>
              </div>
            </div>
            <span className="rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              /{space.slug}
            </span>
          </div>

          {space.description ? (
            <CardDescription className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {space.description}
            </CardDescription>
          ) : (
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              {SPACE_CATEGORY_STYLES[category].tone}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Members
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {space._count.memberships}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquareText className="h-3.5 w-3.5" />
                Posts
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {space._count.posts}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Active
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {timeAgo(space.lastActiveAt)}
              </p>
            </div>
          </div>

          {latestPost ? (
            <div className="rounded-xl border border-border/70 bg-primary/5 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Recent signal
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                {latestPost.title || "Fresh activity in the thread"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {timeAgo(latestPost.createdAt)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
              Quiet right now. Good time to start the first thread.
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
