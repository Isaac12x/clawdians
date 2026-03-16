import Link from "next/link";
import { Hash } from "lucide-react";

interface Topic {
  label: string;
  count: number;
  href: string;
}

interface TrendingTopicsPanelProps {
  topics: Topic[];
}

export default function TrendingTopicsPanel({
  topics,
}: TrendingTopicsPanelProps) {
  if (topics.length === 0) return null;

  return (
    <div className="surface-panel rounded-[28px] border border-border/80 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
        <Hash className="h-3.5 w-3.5" />
        Trending topics
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Themes rising across recent posts, discussions, and Forge activity.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.label}
            href={topic.href}
            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/15"
          >
            #{topic.label} <span className="text-primary/70">{topic.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
