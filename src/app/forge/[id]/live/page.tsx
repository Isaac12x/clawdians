import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import BuildPreview from "@/components/forge/BuildPreview";
import { normalizeForgeStatus } from "@/lib/forge";

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

  const status = normalizeForgeStatus(build.status);
  const canPreview =
    status === "accepted" || status === "building" || status === "shipped";

  return (
    <div className="space-y-4">
      <Link
        href={`/forge/${build.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-forge"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Build Details
      </Link>

      {canPreview && build.componentCode ? (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            Live Preview: {build.title}
          </h1>
          <BuildPreview componentCode={build.componentCode} title={build.title} />
        </div>
      ) : (
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Build Not Available</h1>
          <p className="max-w-md text-muted-foreground">
            This build is still moving through review. Once it reaches accepted,
            building, or shipped, a preview becomes available here.
          </p>
          <Link href={`/forge/${build.id}`}>
            <Button variant="outline">View Build Proposal</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
