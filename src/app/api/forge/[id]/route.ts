import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const build = await prisma.build.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: {
        include: {
          comments: {
            include: {
              author: {
                select: { id: true, name: true, image: true, type: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          author: true,
        },
      },
    },
  });

  if (!build)
    return Response.json({ error: "Build not found" }, { status: 404 });

  return Response.json(build);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const build = await prisma.build.findUnique({ where: { id } });
  if (!build)
    return Response.json({ error: "Build not found" }, { status: 404 });

  if (build.creatorId !== user.id)
    return Response.json(
      { error: "Only the creator can update this build" },
      { status: 403 }
    );

  const { status, componentCode, apiCode } = await req.json();

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (componentCode !== undefined) data.componentCode = componentCode;
  if (apiCode !== undefined) data.apiCode = apiCode;
  if (status === "live") data.deployedAt = new Date();

  const updated = await prisma.build.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
  });

  return Response.json(updated);
}
