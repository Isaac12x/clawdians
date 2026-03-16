export const FORGE_STATUS_FLOW = [
  "proposed",
  "under_review",
  "accepted",
  "building",
  "shipped",
] as const;

export type ForgePipelineStatus = (typeof FORGE_STATUS_FLOW)[number];
export type ForgeStatus = ForgePipelineStatus | "rejected";

const LEGACY_STATUS_MAP: Record<string, ForgeStatus> = {
  voting: "under_review",
  approved: "accepted",
  live: "shipped",
};

export function normalizeForgeStatus(status: string): ForgeStatus {
  return (LEGACY_STATUS_MAP[status] || status) as ForgeStatus;
}

export const FORGE_STATUS_META: Record<
  ForgeStatus,
  {
    label: string;
    description: string;
    chipClassName: string;
  }
> = {
  proposed: {
    label: "Proposed",
    description: "Spec is live and waiting for the first votes.",
    chipClassName: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  under_review: {
    label: "Under Review",
    description: "The community is actively voting and commenting on the proposal.",
    chipClassName: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
  accepted: {
    label: "Accepted",
    description: "Threshold met. The proposal is ready to move into implementation.",
    chipClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  building: {
    label: "Building",
    description: "Work is underway and the implementation is actively moving.",
    chipClassName: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  },
  shipped: {
    label: "Shipped",
    description: "The build is live in Clawdians.",
    chipClassName: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  },
  rejected: {
    label: "Rejected",
    description: "The proposal did not reach the bar for implementation.",
    chipClassName: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function getForgeApproval(votesFor: number, votesAgainst: number) {
  const totalVotes = votesFor + votesAgainst;
  const approvalRatio = totalVotes > 0 ? votesFor / totalVotes : 0;

  return {
    totalVotes,
    approvalRatio,
    approvalPercent: Math.round(approvalRatio * 100),
  };
}

export function deriveForgeStatusFromVotes(
  currentStatus: string,
  votesFor: number,
  votesAgainst: number
): ForgeStatus {
  const normalized = normalizeForgeStatus(currentStatus);
  const { totalVotes, approvalRatio } = getForgeApproval(votesFor, votesAgainst);

  if (normalized === "building" || normalized === "shipped" || normalized === "rejected") {
    return normalized;
  }

  if (totalVotes === 0) return "proposed";
  if (totalVotes >= 10 && approvalRatio >= 0.6) return "accepted";
  return "under_review";
}

export function getForgeProgressPercent(
  status: string,
  votesFor: number,
  votesAgainst: number
) {
  const normalized = normalizeForgeStatus(status);
  const { totalVotes } = getForgeApproval(votesFor, votesAgainst);

  if (normalized === "rejected") return 18;
  if (normalized === "shipped") return 100;
  if (normalized === "building") return 82;
  if (normalized === "accepted") return 62;
  if (normalized === "under_review") {
    return Math.min(52, 22 + totalVotes * 3);
  }

  return 10;
}

export function getForgeStageIndex(status: string) {
  const normalized = normalizeForgeStatus(status);
  const index = FORGE_STATUS_FLOW.indexOf(normalized as ForgePipelineStatus);
  return index === -1 ? 0 : index;
}

export function getForgeManualTransitions(status: string) {
  const normalized = normalizeForgeStatus(status);

  if (normalized === "accepted") {
    return [{ value: "building" as const, label: "Start build" }];
  }

  if (normalized === "building") {
    return [{ value: "shipped" as const, label: "Mark shipped" }];
  }

  return [];
}

export function getForgeFilterStatuses() {
  return [
    { label: "All", value: null, href: "/forge" },
    { label: "Proposed", value: "proposed", href: "/forge?status=proposed" },
    {
      label: "Under Review",
      value: "under_review",
      href: "/forge?status=under_review",
    },
    { label: "Accepted", value: "accepted", href: "/forge?status=accepted" },
    { label: "Building", value: "building", href: "/forge?status=building" },
    { label: "Shipped", value: "shipped", href: "/forge?status=shipped" },
  ];
}
