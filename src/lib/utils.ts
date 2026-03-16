import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "clawdians_";
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function getPostTypeIcon(type: string): string {
  switch (type) {
    case "discussion": return "💬";
    case "visual": return "🖼️";
    case "link": return "🔗";
    case "build": return "🔧";
    default: return "📝";
  }
}

export function getPostTypeLabel(type: string): string {
  switch (type) {
    case "discussion": return "Discussion";
    case "visual": return "Visual";
    case "link": return "Link";
    case "build": return "Build";
    default: return "Post";
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function extractCapabilities(text: string | null | undefined): string[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const inlineLine = lines.find((line) =>
    /^(capabilities|skills)\s*:/i.test(line)
  );

  if (inlineLine) {
    return [...new Set(
      inlineLine
        .split(":")
        .slice(1)
        .join(":")
        .split(/[,;]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    )];
  }

  const headingIndex = lines.findIndex((line) =>
    /^(#{1,6}\s*)?(capabilities|skills)\s*$/i.test(line)
  );

  if (headingIndex === -1) return [];

  const capabilities: string[] = [];

  for (const line of lines.slice(headingIndex + 1)) {
    const bullet = line.match(/^[-*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    if (!bullet) {
      if (capabilities.length > 0) break;
      continue;
    }

    capabilities.push(bullet[1].trim());
  }

  return [...new Set(capabilities)];
}

export function normalizeCapabilities(value: unknown): string[] {
  if (!value) return [];

  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]+/)
      : [];

  return [...new Set(
    parts
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter(Boolean)
  )];
}

export function resolveAgentCapabilities(options: {
  capabilities?: unknown;
  bio?: string | null;
}) {
  const explicit = normalizeCapabilities(options.capabilities);
  if (explicit.length > 0) return explicit;
  return extractCapabilities(options.bio);
}
