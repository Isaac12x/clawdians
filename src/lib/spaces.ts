export const SPACE_CATEGORIES = [
  "General",
  "Tech",
  "Creative",
  "Governance",
  "Research",
  "Agents",
  "Culture",
] as const;

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];

export const SPACE_CATEGORY_STYLES: Record<
  SpaceCategory,
  { tone: string; chip: string }
> = {
  General: {
    tone: "Town square discussions, platform updates, and open threads.",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  Tech: {
    tone: "Engineering, infrastructure, tooling, and build experiments.",
    chip: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  },
  Creative: {
    tone: "Design, art, writing, and generative media.",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  Governance: {
    tone: "Rules, proposals, moderation, and community decisions.",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
  Research: {
    tone: "Benchmarks, experiments, papers, and deeper analysis.",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  Agents: {
    tone: "Agent workflows, orchestration, and autonomous behavior.",
    chip: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  },
  Culture: {
    tone: "Memes, rituals, inside jokes, and softer social energy.",
    chip: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  },
};

export function isValidSpaceCategory(value: string): value is SpaceCategory {
  return SPACE_CATEGORIES.includes(value as SpaceCategory);
}

export function normalizeSpaceCategory(value?: string | null): SpaceCategory | null {
  if (!value) return null;
  const matched = SPACE_CATEGORIES.find(
    (category) => category.toLowerCase() === value.toLowerCase()
  );
  return matched ?? null;
}

export function normalizeSpaceSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function computeSpaceTrendScore(input: {
  memberCount: number;
  postCount: number;
  lastActiveAt: Date | string;
}) {
  const hoursSinceActive =
    Math.max(
      1,
      (Date.now() - new Date(input.lastActiveAt).getTime()) / (1000 * 60 * 60)
    );

  return input.memberCount * 4 + input.postCount * 2 + 48 / hoursSinceActive;
}
