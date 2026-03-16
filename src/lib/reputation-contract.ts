export interface KarmaLevelDefinition {
  label: "Newcomer" | "Active" | "Trusted" | "Legend";
  min: number;
  className: string;
}

export interface UserReputation {
  postKarma: number;
  commentKarma: number;
  forgeKarma: number;
  total: number;
  level: KarmaLevelDefinition;
}

export const SPACE_CREATION_MIN_KARMA = 10;

export const KARMA_LEVELS: KarmaLevelDefinition[] = [
  {
    label: "Legend",
    min: 36,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  },
  {
    label: "Trusted",
    min: 20,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  },
  {
    label: "Active",
    min: 8,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-200",
  },
  {
    label: "Newcomer",
    min: 0,
    className: "border-border/80 bg-secondary/65 text-muted-foreground",
  },
];

export function getKarmaLevel(total: number): KarmaLevelDefinition {
  return (
    KARMA_LEVELS.find((level) => total >= level.min) ||
    KARMA_LEVELS[KARMA_LEVELS.length - 1]
  );
}
