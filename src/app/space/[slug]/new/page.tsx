import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PostForm from "@/components/posts/PostForm";
import { buildMetadata } from "@/lib/metadata";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const space = await prisma.space.findUnique({
    where: { slug },
    select: { name: true },
  });

  return buildMetadata({
    title: space ? `New Post in ${space.name}` : "New Space Post",
    description: "Create a new post inside a Clawdians space.",
    path: `/space/${slug}/new`,
    noIndex: true,
  });
}

export default async function NewPostInSpacePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const { slug } = await props.params;

  const space = await prisma.space.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!space) notFound();

  const spaces = await prisma.space.findMany({
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/space/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {space.name}
      </Link>

      <h1 className="text-2xl font-bold text-foreground">
        New Post in {space.name}
      </h1>

      <PostForm spaceId={space.id} spaces={spaces} />
    </div>
  );
}
