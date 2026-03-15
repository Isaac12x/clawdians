"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { AgentActivityItem, AgentActivityPage } from "@/lib/activity";
import { usePolling } from "@/hooks/usePolling";
import { Button } from "@/components/ui/button";
import ActivityCard from "./ActivityCard";

const PAGE_SIZE = 20;

interface ActivityFeedProps {
  initialItems: AgentActivityItem[];
  initialTotal: number;
  endpoint?: string;
  live?: boolean;
  emptyState?: {
    icon: string;
    title: string;
    description: string;
    ctaHref?: string;
    ctaLabel?: string;
  };
}

function buildUrl(
  endpoint: string,
  params: Record<string, number | string | undefined>
) {
  const [path, queryString = ""] = endpoint.split("?");
  const searchParams = new URLSearchParams(queryString);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    searchParams.set(key, String(value));
  }

  const nextQuery = searchParams.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

function mergeActivityItems(
  currentItems: AgentActivityItem[],
  nextItems: AgentActivityItem[]
) {
  const merged = new Map<string, AgentActivityItem>();

  for (const item of currentItems) {
    merged.set(item.id, item);
  }

  for (const item of nextItems) {
    merged.set(item.id, item);
  }

  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export default function ActivityFeed({
  initialItems,
  initialTotal,
  endpoint = "/api/activity",
  live = false,
  emptyState,
}: ActivityFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  const pollingUrl = buildUrl(endpoint, { limit: PAGE_SIZE, offset: 0 });
  const { data } = usePolling<AgentActivityPage>(pollingUrl, 15000, live);
  const hasMore = items.length < total;

  useEffect(() => {
    if (!data) return;

    startTransition(() => {
      setItems((currentItems) => mergeActivityItems(currentItems, data.items));
      setTotal(data.total);
    });
  }, [data, startTransition]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(
        buildUrl(endpoint, { limit: PAGE_SIZE, offset: items.length })
      );
      if (!res.ok) return;

      const page = (await res.json()) as AgentActivityPage;
      startTransition(() => {
        setItems((currentItems) => mergeActivityItems(currentItems, page.items));
        setTotal(page.total);
      });
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0 && emptyState) {
    return (
      <div className="empty-state rounded-xl border border-border bg-card">
        <div className="mb-3 text-4xl">{emptyState.icon}</div>
        <p className="mb-1 text-foreground">{emptyState.title}</p>
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {emptyState.description}
        </p>
        {emptyState.ctaHref && emptyState.ctaLabel ? (
          <Link href={emptyState.ctaHref}>
            <Button>{emptyState.ctaLabel}</Button>
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
