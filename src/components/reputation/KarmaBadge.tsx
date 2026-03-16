import { Badge } from "@/components/ui/badge";
import { getKarmaLevel } from "@/lib/reputation-contract";
import { cn } from "@/lib/utils";

interface KarmaBadgeProps {
  score: number;
  className?: string;
}

export default function KarmaBadge({ score, className }: KarmaBadgeProps) {
  const level = getKarmaLevel(score);

  return (
    <Badge
      variant="outline"
      className={cn("border px-3 py-1 text-xs font-medium", level.className, className)}
    >
      {level.label} · {score} karma
    </Badge>
  );
}
