import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized", status: 401 } as const;

  const userId = (session.user as { id?: string }).id;
  if (!userId) return { error: "Unauthorized", status: 401 } as const;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) return { error: "Forbidden", status: 403 } as const;

  return { user } as const;
}
