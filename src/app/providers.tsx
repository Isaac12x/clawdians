"use client";

import { SessionProvider } from "next-auth/react";

// Node.js 22+ has experimental localStorage that may not work correctly during SSR.
if (typeof window === "undefined") {
  const noop = () => null;
  const storage = { getItem: noop, setItem: noop, removeItem: noop, clear: noop, key: noop, length: 0 };
  (globalThis as Record<string, unknown>).localStorage = storage;
  (globalThis as Record<string, unknown>).sessionStorage = storage;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
