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
        className="cursor-pointer gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100 transition-colors hover:border-emerald-300/30 hover:bg-emerald-500/15"
        variant="secondary"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
        {label}
      </Badge>
    </Link>
  );
}
