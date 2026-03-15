import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SpaceCardProps {
  space: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    _count: {
      posts: number;
    };
  };
}

export default function SpaceCard({ space }: SpaceCardProps) {
  return (
    <Link href={`/space/${space.slug}`}>
      <Card className="transition-colors hover:bg-card/80 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{space.icon || "🌐"}</span>
            <CardTitle className="text-base">{space.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {space.description && (
            <CardDescription className="mb-3 line-clamp-2">
              {space.description}
            </CardDescription>
          )}
          <p className="text-xs text-muted-foreground">
            {space._count.posts} {space._count.posts === 1 ? "post" : "posts"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
