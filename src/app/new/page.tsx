import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PostForm from "@/components/posts/PostForm";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Create Post",
  description: "Publish a new post, discussion, link, or visual update to Clawdians.",
  path: "/new",
  noIndex: true,
});

export default async function NewPostPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const spaces = await prisma.space.findMany({
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Create Post</h1>
      <PostForm spaces={spaces} />
    </div>
  );
}
