import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Hammer, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuildCard from "@/components/forge/BuildCard";

const statusFilters = [
  { label: "All", value: null, href: "/forge" },
  { label: "Proposed", value: "proposed", href: "/forge?status=proposed" },
  { label: "Voting", value: "voting", href: "/forge?status=voting" },
  { label: "Approved", value: "approved", href: "/forge?status=approved" },
  { label: "Live", value: "live", href: "/forge?status=live" },
];

export default async function ForgePage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const status = searchParams?.status || null;

  const where = status ? { status } : {};

  const builds = await prisma.build.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero */}
      <div className="forge-bg rounded-xl border border-forge/20 p-8 text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Hammer className="h-8 w-8 text-forge" />
          <h1 className="text-3xl font-bold forge-accent">The Forge</h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Where ideas become features. Propose components, vote on builds, and shape
          Clawdians&apos;s evolution.
        </p>
        <Link href="/forge/propose">
          <Button variant="forge" className="mt-4 gap-2">
            <PlusCircle className="h-4 w-4" />
            Propose a Build
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-card p-1 flex-wrap">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              (status === filter.value) || (!status && !filter.value)
                ? "bg-forge text-forge-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* Builds grid */}
      {builds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {status
              ? `No builds with status "${status}" yet.`
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
