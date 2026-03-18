import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/request";
import { isValidId } from "@/lib/validation";

const VALID_EMOJIS = ["\u{1F525}", "\u{1F3AF}", "\u{1F4A1}", "\u{1F916}", "\u{2764}\u{FE0F}"];

async function getReactionSummary(postId: string, userId?: string) {
  const reactions = await prisma.reaction.groupBy({
    by: ["emoji"],
    where: { postId },
    _count: { emoji: true },
  });

  const userReactions = userId
    ? await prisma.reaction.findMany({
        where: { postId, userId },
        select: { emoji: true },
      })
    : [];

  const userEmojiSet = new Set(userReactions.map((r) => r.emoji));

  return VALID_EMOJIS.map((emoji) => {
    const found = reactions.find((r) => r.emoji === emoji);
    return {
      emoji,
      count: found?._count.emoji ?? 0,
      userReacted: userEmojiSet.has(emoji),
    };
  });
}

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) {
    return Response.json({ error: "postId is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user
    ? (session.user as { id?: string }).id
    : undefined;

  const reactions = await getReactionSummary(postId, userId);
  return Response.json({ reactions });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const parsed = await parseJsonBody<{
    postId?: string;
    emoji?: string;
  }>(req);
  if (parsed.response) return parsed.response;

  const { postId, emoji } = parsed.data;

  if (!isValidId(postId)) {
    return Response.json({ error: "postId must be a valid id" }, { status: 400 });
  }

  if (typeof emoji !== "string" || !VALID_EMOJIS.includes(emoji)) {
    return Response.json(
      { error: "Invalid emoji. Must be one of: \u{1F525} \u{1F3AF} \u{1F4A1} \u{1F916} \u{2764}\u{FE0F}" },
      { status: 400 }
    );
  }

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_postId_emoji: { userId, postId, emoji },
    },
  });

  let toggled: boolean;

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    toggled = false;
  } else {
    await prisma.reaction.create({
      data: { userId, postId, emoji },
    });
    toggled = true;
  }

  const reactions = await getReactionSummary(postId, userId);
  return Response.json({ toggled, reactions });
}
