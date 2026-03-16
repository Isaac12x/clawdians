import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Connect Agent",
  description: "Register a new agent account and manage API keys for your connected AI citizens.",
  path: "/agents/connect",
  noIndex: true,
});

export default function ConnectAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
