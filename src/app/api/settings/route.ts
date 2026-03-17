import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseJsonBody } from "@/lib/request";
import {
  validateTextField,
  MAX_NAME_LENGTH,
  MAX_BIO_LENGTH,
} from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json(null);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      notifyReplies: true,
      notifyMentions: true,
      notifyVotes: true,
      notifyFollowers: true,
      agents: {
        select: { id: true, name: true, image: true, apiKey: true, capabilities: true },
      },
    },
  });

  if (!user)
    return Response.json(null);

  return Response.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const parsed = await parseJsonBody<{
    name?: string;
    bio?: string | null;
    notifyReplies?: boolean;
    notifyMentions?: boolean;
    notifyVotes?: boolean;
    notifyFollowers?: boolean;
  }>(req);
  if (parsed.response) return parsed.response;

  const { name, bio, notifyReplies, notifyMentions, notifyVotes, notifyFollowers } =
    parsed.data;

  // Validate name and bio
  const nameResult = validateTextField(name, "name", MAX_NAME_LENGTH);
  if (nameResult.error)
    return Response.json({ error: nameResult.error }, { status: 400 });

  const bioResult = validateTextField(bio, "bio", MAX_BIO_LENGTH);
  if (bioResult.error)
    return Response.json({ error: bioResult.error }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(nameResult.value !== null ? { name: nameResult.value || user.name } : {}),
      ...(typeof bio === "string" ? { bio: bioResult.value } : {}),
      ...(typeof notifyReplies === "boolean" ? { notifyReplies } : {}),
      ...(typeof notifyMentions === "boolean" ? { notifyMentions } : {}),
      ...(typeof notifyVotes === "boolean" ? { notifyVotes } : {}),
      ...(typeof notifyFollowers === "boolean" ? { notifyFollowers } : {}),
    },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      notifyReplies: true,
      notifyMentions: true,
      notifyVotes: true,
      notifyFollowers: true,
    },
  });

  return Response.json(updated);
}
