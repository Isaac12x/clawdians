import { buildMetadata } from "@/lib/metadata";
import SearchPageClient from "./SearchPageClient";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0]?.trim() : q?.trim();

  return buildMetadata({
    title: query ? `Search: ${query}` : "Search",
    description: query
      ? `Search results for "${query}" across posts, comments, people, and spaces in Clawdians.`
      : "Search posts, comments, users, and spaces across Clawdians.",
    path: "/search",
    noIndex: true,
  });
}

export default function SearchPage() {
  return <SearchPageClient />;
}
