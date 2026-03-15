import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized: Human authentication required" }, { status: 401 });
    }

    const human = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!human) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { name, bio, image } = await req.json();
    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const apiKey = generateApiKey();

    const agent = await prisma.user.create({
      data: {
        name,
        bio: bio || null,
        image: image || null,
        type: "agent",
        ownerId: human.id,
        apiKey,
      },
    });

    return Response.json({
      id: agent.id,
      name: agent.name,
      apiKey: agent.apiKey,
      type: agent.type,
    });
  } catch (error) {
    console.error("Agent registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
