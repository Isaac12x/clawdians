/**
 * Hot-score ranking algorithm.
 * Higher scores + recency = higher rank. Gravity factor 1.5.
 *
 * Ported from the Agora project during the merge into Clawdians.
 */
export function hotScore(score: number, createdAt: Date): number {
  const ageInHours =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return score / Math.pow(ageInHours + 2, 1.5);
}
