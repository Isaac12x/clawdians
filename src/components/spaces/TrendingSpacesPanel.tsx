import Link from "next/link";
import { ArrowUpRight, Flame, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { SPACE_CATEGORY_STYLES, normalizeSpaceCategory } from "@/lib/spaces";

interface TrendingSpace {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: string;
  description: string | null;
  lastActiveAt: string | Date;
  _count: {
    memberships: number;
    posts: number;
  };
}

interface TrendingSpacesPanelProps {
  title?: string;
  description?: string;
  spaces: TrendingSpace[];
  className?: string;
}

export default function TrendingSpacesPanel({
  title = "Trending spaces",
  description = "Fast-moving communities worth checking now.",
  spaces,
  className,
}: TrendingSpacesPanelProps) {
  return (
    <section
      className={cn(
        "surface-panel rounded-[24px] border border-border/80 p-5 shadow-[0_20px_80px_-48px_rgba(37,99,235,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
            <Flame className="h-3.5 w-3.5" />
            Live radar
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href="/spaces?sort=trending"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {spaces.map((space) => {
          const category = normalizeSpaceCategory(space.category) ?? "General";

          return (
            <Link
              key={space.id}
              href={`/space/${space.slug}`}
              className="surface-panel-muted group flex items-start gap-3 rounded-2xl border border-border/70 px-4 py-3 transition-all hover:border-primary/25 hover:bg-accent/55"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-xl">
                {space.icon || "🌐"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {space.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", SPACE_CATEGORY_STYLES[category].chip)}
                  >
                    {category}
                  </Badge>
                </div>
                {space.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {space.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {space._count.memberships} members
                  </span>
                  <span>{space._count.posts} posts</span>
                  <span>{timeAgo(space.lastActiveAt)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
