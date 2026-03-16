import { prisma } from "@/lib/prisma";
import { getUserReputation } from "@/lib/reputation";

type ModerationSeverity = "standard" | "elevated" | "critical";

const AUTO_FLAG_RULES: Array<{
  reason: string;
  severity: ModerationSeverity;
  score: number;
  pattern: RegExp;
}> = [
  {
    reason: "Harassment or self-harm prompting language",
    severity: "critical",
    score: 8,
    pattern: /\b(kill yourself|kys)\b/i,
  },
  {
    reason: "Spam or scam phrasing",
    severity: "elevated",
    score: 5,
    pattern: /\b(buy now|guaranteed income|crypto giveaway|double your money)\b/i,
  },
  {
    reason: "Repeated outbound links",
    severity: "elevated",
    score: 4,
    pattern: /(?:https?:\/\/\S+\s*){2,}/i,
  },
  {
    reason: "Off-platform solicitation",
    severity: "elevated",
    score: 4,
    pattern: /\b(telegram|whatsapp|signal)\b.*\b(dm|contact|message)\b/i,
  },
];

function getAutoFlagThreshold(karma: number) {
  if (karma < 8) return 4;
  if (karma < 20) return 6;
  return 8;
}

function getHighestSeverity(
  severities: ModerationSeverity[]
): ModerationSeverity {
  if (severities.includes("critical")) return "critical";
  if (severities.includes("elevated")) return "elevated";
  return "standard";
}

export async function logModerationAction(options: {
  actorUserId?: string | null;
  targetType: string;
  targetId: string;
  actionType: string;
  reason?: string | null;
  details?: string | null;
}) {
  return prisma.moderationAction.create({
    data: {
      actorUserId: options.actorUserId || null,
      targetType: options.targetType,
      targetId: options.targetId,
      actionType: options.actionType,
      reason: options.reason || null,
      details: options.details || null,
    },
  });
}

export async function autoFlagContent(options: {
  authorId: string;
  targetType: "post" | "comment";
  targetId: string;
  text: string;
}) {
  const normalizedText = options.text.trim();
  if (!normalizedText) return null;

  const reputation = await getUserReputation(options.authorId);
  const threshold = getAutoFlagThreshold(reputation.total);
  const matches = AUTO_FLAG_RULES.filter((rule) => rule.pattern.test(normalizedText));
  const score = matches.reduce((sum, match) => sum + match.score, 0);

  if (score < threshold || matches.length === 0) {
    return null;
  }

  const severity = getHighestSeverity(matches.map((match) => match.severity));
  const autoFlagReason = matches.map((match) => match.reason).join("; ");
  const existing = await prisma.report.findFirst({
    where: {
      targetType: options.targetType,
      targetId: options.targetId,
      status: "pending",
      autoFlagged: true,
    },
    select: { id: true },
  });

  if (existing) return existing;

  const report = await prisma.report.create({
    data: {
      targetType: options.targetType,
      targetId: options.targetId,
      reason: "Auto-flagged for moderation review",
      severity,
      autoFlagged: true,
      autoFlagReason,
      reviewNotes: `Author karma ${reputation.total}; auto-flag threshold ${threshold}; score ${score}.`,
    },
  });

  await logModerationAction({
    targetType: options.targetType,
    targetId: options.targetId,
    actionType: "auto_flag",
    reason: autoFlagReason,
    details: `severity=${severity}; karma=${reputation.total}; threshold=${threshold}; score=${score}`,
  });

  return report;
}
