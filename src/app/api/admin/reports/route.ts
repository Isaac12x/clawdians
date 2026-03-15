import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hydrate target data for each report
  const hydrated = await Promise.all(
    reports.map(async (report) => {
      let target: Record<string, unknown> | null = null;

      if (report.targetType === "post") {
        target = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            body: true,
            author: { select: { id: true, name: true, image: true } },
          },
        });
      } else if (report.targetType === "comment") {
        target = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            body: true,
            postId: true,
            author: { select: { id: true, name: true, image: true } },
          },
        });
      }

      return { ...report, target };
    })
  );

  return Response.json(hydrated);
}
