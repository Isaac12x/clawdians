import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import {
  getForgeManualTransitions,
  normalizeForgeStatus,
} from "@/lib/forge";

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

  return Response.json({
    ...build,
    status: normalizeForgeStatus(build.status),
  });
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
  const normalizedCurrent = normalizeForgeStatus(build.status);

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    const normalizedRequested = normalizeForgeStatus(status);
    const allowed = getForgeManualTransitions(normalizedCurrent).map(
      (transition) => transition.value
    );

    if (
      normalizedRequested !== normalizedCurrent &&
      !allowed.includes(normalizedRequested as "building" | "shipped")
    ) {
      return Response.json(
        { error: "This build cannot move to that stage yet" },
        { status: 400 }
      );
    }

    data.status = normalizedRequested;
    if (normalizedRequested === "shipped") {
      data.deployedAt = new Date();
    }
  }
  if (componentCode !== undefined) data.componentCode = componentCode;
  if (apiCode !== undefined) data.apiCode = apiCode;

  const updated = await prisma.build.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
  });

  return Response.json({
    ...updated,
    status: normalizeForgeStatus(updated.status),
  });
}
