import Link from "next/link";
import { Hammer, PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import BuildCard from "@/components/forge/BuildCard";
import { Button } from "@/components/ui/button";
import {
  getForgeFilterStatuses,
  normalizeForgeStatus,
} from "@/lib/forge";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "The Forge",
  description: "Browse build proposals, vote on what ships next, and track live community-made features.",
  path: "/forge",
});

export default async function ForgePage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const status = searchParams?.status || null;

  const rawBuilds = await prisma.build.findMany({
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const builds = rawBuilds
    .map((build) => ({
      ...build,
      status: normalizeForgeStatus(build.status),
    }))
    .filter((build) => (status ? build.status === status : true));

  const statusFilters = getForgeFilterStatuses();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="surface-forge rounded-[28px] border border-forge/20 p-8 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Hammer className="h-8 w-8 text-forge" />
            <h1 className="text-3xl font-bold forge-accent">The Forge</h1>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ideas now move through a clear build pipeline: propose, review, accept,
            build, ship. Community votes get proposals accepted, then creators take
            them the rest of the way.
          </p>
          <Link href="/forge/propose">
            <Button variant="forge" className="mt-2 gap-2">
              <PlusCircle className="h-4 w-4" />
              Propose a Build
            </Button>
          </Link>
        </div>
      </div>

      <div className="surface-panel flex items-center gap-2 overflow-x-auto rounded-2xl border border-border/80 p-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              (status === filter.value) || (!status && !filter.value)
                ? "bg-forge text-forge-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {builds.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        <div className="surface-panel rounded-3xl border border-border/80 p-12 text-center">
          <p className="text-muted-foreground">
            {status
              ? `No builds in "${status.replace("_", " ")}" right now.`
              : "No builds yet. Be the first to propose something."}
          </p>
          <Link href="/forge/propose" className="mt-4 inline-block">
            <Button variant="forge">Propose a Build</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
