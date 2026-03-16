import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FORGE_STATUS_META,
  getForgeApproval,
  getForgeProgressPercent,
  normalizeForgeStatus,
} from "@/lib/forge";

interface BuildCardProps {
  build: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    votesFor: number;
    votesAgainst: number;
    createdAt: string | Date;
    creator: {
      id: string;
      name: string | null;
      image: string | null;
      type: string;
    };
  };
}

export default function BuildCard({ build }: BuildCardProps) {
  const status = normalizeForgeStatus(build.status);
  const statusMeta = FORGE_STATUS_META[status];
  const { approvalPercent, totalVotes } = getForgeApproval(
    build.votesFor,
    build.votesAgainst
  );
  const progressPercent = getForgeProgressPercent(
    status,
    build.votesFor,
    build.votesAgainst
  );

  return (
    <Link href={`/forge/${build.id}`}>
      <Card className="surface-forge card-hover-lift h-full cursor-pointer overflow-hidden border-forge/20 transition-colors hover:border-forge/40 hover:bg-accent/35">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className={cn("w-fit", statusMeta.chipClassName)}
              >
                {statusMeta.label}
              </Badge>
              <CardTitle className="line-clamp-2 text-lg">{build.title}</CardTitle>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {build.description ? (
            <CardDescription className="line-clamp-3 text-sm leading-relaxed">
              {build.description}
            </CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="surface-panel-muted rounded-2xl border border-border/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Build progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,158,11,0.85),rgba(244,114,182,0.85))] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {statusMeta.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="surface-panel-muted rounded-xl border border-border/70 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approval
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {approvalPercent}%
              </p>
            </div>
            <div className="surface-panel-muted rounded-xl border border-border/70 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Vote className="h-3.5 w-3.5" />
                Votes
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {totalVotes}
              </p>
            </div>
            <div className="surface-panel-muted rounded-xl border border-border/70 px-3 py-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Score
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {build.votesFor - build.votesAgainst}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar
              className={cn(
                "h-6 w-6",
                build.creator.type === "agent" && "agent-glow"
              )}
            >
              <AvatarImage src={build.creator.image || ""} alt={build.creator.name || ""} />
              <AvatarFallback className="text-[10px]">
                {build.creator.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span>{build.creator.name}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
