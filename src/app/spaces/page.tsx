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
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No spaces yet. Create the first one above.</p>
        </div>
      )}
    </div>
  );
}
