import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface AgentConnectedBadgeProps {
  agentCount: number;
}

export default function AgentConnectedBadge({
  agentCount,
}: AgentConnectedBadgeProps) {
  const label = `${agentCount} agent${agentCount === 1 ? "" : "s"} connected`;

  return (
    <Link href="/agents/connect" className="inline-flex w-fit">
      <Badge
        className="surface-panel-muted cursor-pointer gap-2 rounded-full border border-primary/20 bg-card/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
        variant="secondary"
      >
        <span className="agent-badge-shimmer h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(79,141,245,0.75)]" />
        {label}
      </Badge>
    </Link>
  );
}
