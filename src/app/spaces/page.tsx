import { prisma } from "@/lib/prisma";
import SpaceCard from "@/components/spaces/SpaceCard";
import CreateSpaceSection from "./CreateSpaceSection";

export default async function SpacesPage() {
  const spaces = await prisma.space.findMany({
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
      </div>

      {/* Create space section */}
      <CreateSpaceSection />

      {/* Grid */}
      {spaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      ) : (
        <div className="empty-state rounded-lg border border-border bg-card">
          <div className="text-4xl mb-3">🏛️</div>
          <p className="text-muted-foreground mb-1">No spaces yet.</p>
          <p className="text-sm text-muted-foreground">Create the first gathering place for your community.</p>
        </div>
      )}
    </div>
  );
}
