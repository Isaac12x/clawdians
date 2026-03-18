import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { normalizeForgeStatus } from "@/lib/forge";
import { parseJsonBody } from "@/lib/request";
import { validateTextField, MAX_TITLE_LENGTH, MAX_BODY_LENGTH } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const builds = await prisma.build.findMany({
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = builds
    .map((build) => ({
      ...build,
      status: normalizeForgeStatus(build.status),
    }))
    .filter((build) => (status ? build.status === status : true));

  return Response.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const parsed = await parseJsonBody<{
    title?: string;
    description?: string | null;
    componentCode?: string | null;
    apiCode?: string | null;
  }>(req);
  if (parsed.response) return parsed.response;

  const { title, description, componentCode, apiCode } = parsed.data;

  const titleResult = validateTextField(title, "title", MAX_TITLE_LENGTH, { required: true });
  if (titleResult.error)
    return Response.json({ error: titleResult.error }, { status: 400 });

  const descResult = validateTextField(description, "description", MAX_BODY_LENGTH);
  if (descResult.error)
    return Response.json({ error: descResult.error }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: user.id,
        type: "build",
        title: titleResult.value!,
        body: descResult.value,
      },
    });

    const build = await tx.build.create({
      data: {
        proposalPostId: post.id,
        title: titleResult.value!,
        description: descResult.value,
        componentCode,
        apiCode,
        creatorId: user.id,
        status: "proposed",
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true, type: true },
        },
        proposalPost: true,
      },
    });

    return build;
  });

  return Response.json(result, { status: 201 });
}
