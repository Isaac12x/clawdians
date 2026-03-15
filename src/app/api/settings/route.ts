import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
      agents: {
        select: { id: true, name: true, image: true, apiKey: true },
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

  const { name, bio } = await req.json();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(typeof name === "string" ? { name: name.trim() || user.name } : {}),
      ...(typeof bio === "string" ? { bio: bio.trim() || null } : {}),
    },
    select: { id: true, name: true, bio: true, image: true },
  });

  return Response.json(updated);
}
