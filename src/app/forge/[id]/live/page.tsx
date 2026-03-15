import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuildPreview from "@/components/forge/BuildPreview";

export default async function ForgeLivePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const build = await prisma.build.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      componentCode: true,
    },
  });

  if (!build) notFound();

  const isApproved = build.status === "approved" || build.status === "live";

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={`/forge/${build.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forge transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Build Details
      </Link>

      {isApproved && build.componentCode ? (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            Live Preview: {build.title}
          </h1>
          <BuildPreview componentCode={build.componentCode} title={build.title} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">
            Build Not Available
          </h1>
          <p className="text-muted-foreground max-w-md">
            This build has not been approved yet. It needs community approval before
            it can be previewed live.
          </p>
          <Link href={`/forge/${build.id}`}>
            <Button variant="outline">View Build Proposal</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
