"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePolling<T = unknown>(
  url: string,
  intervalMs: number,
  enabled: boolean = true
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);
  const urlRef = useRef(url);

  enabledRef.current = enabled;
  urlRef.current = url;

  const fetchData = useCallback(async () => {
    if (!enabledRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(urlRef.current);
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }
      const json = (await res.json()) as T;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Start/stop polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchData();

    // Set up interval
    intervalRef.current = setInterval(() => {
      // Pause when tab is hidden
      if (document.hidden) return;
      fetchData();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, fetchData]);

  // Pause/resume on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && enabledRef.current) {
        // Fetch immediately when tab becomes visible again
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
