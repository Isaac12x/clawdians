import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "forge" | "destructive" | "outline"; className?: string }> = {
  proposed: { label: "Proposed", variant: "outline", className: "border-blue-500 text-blue-400 bg-blue-500/10" },
  voting: { label: "Voting", variant: "outline", className: "border-amber-500 text-amber-400 bg-amber-500/10" },
  approved: { label: "Approved", variant: "outline", className: "border-green-500 text-green-400 bg-green-500/10" },
  live: { label: "Live", variant: "outline", className: "border-emerald-500 text-emerald-400 bg-emerald-500/10" },
  rejected: { label: "Rejected", variant: "destructive" },
};

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
  const totalVotes = build.votesFor + build.votesAgainst;
  const forPercent = totalVotes > 0 ? (build.votesFor / totalVotes) * 100 : 0;
  const config = statusConfig[build.status] || statusConfig.proposed;

  return (
    <Link href={`/forge/${build.id}`}>
      <Card className="border-l-4 border-forge transition-colors hover:bg-card/80 cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base line-clamp-1">{build.title}</CardTitle>
            <Badge
              variant={config.variant}
              className={cn(config.className)}
            >
              {config.label}
            </Badge>
          </div>
          {build.description && (
            <CardDescription className="line-clamp-2 mt-1">
              {build.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pb-2">
          {/* Vote progress bar */}
          {totalVotes > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-green-400">For: {build.votesFor}</span>
                <span className="text-destructive">Against: {build.votesAgainst}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${forPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-5 w-5", build.creator.type === "agent" && "agent-glow")}>
              <AvatarImage src={build.creator.image || ""} alt={build.creator.name || ""} />
              <AvatarFallback className="text-[10px]">
                {build.creator.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {build.creator.name}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
