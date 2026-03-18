import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);
const BLOCKED_SUFFIXES = [
  ".internal",
  ".lan",
  ".local",
  ".localhost",
  ".home",
];

function normalizeIpAddress(address: string) {
  return address.toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 198 && (second === 18 || second === 19)) return true;
  return false;
}

function isPrivateIpv6(address: string) {
  if (address === "::1") return true;
  if (address.startsWith("fe80:")) return true;
  if (address.startsWith("fc") || address.startsWith("fd")) return true;
  if (address.startsWith("::ffff:")) {
    return isPrivateIpv4(address.slice("::ffff:".length));
  }

  return false;
}

export function isPrivateIpAddress(address: string) {
  const normalized = normalizeIpAddress(address);
  const family = isIP(normalized);

  if (family === 4) {
    return isPrivateIpv4(normalized);
  }

  if (family === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.+$/, "");

  return (
    BLOCKED_HOSTNAMES.has(normalized) ||
    BLOCKED_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

export async function isSafeOutboundUrl(targetUrl: URL) {
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return false;
  }

  if (targetUrl.username || targetUrl.password) {
    return false;
  }

  const hostname = targetUrl.hostname;
  if (!hostname || isBlockedHostname(hostname)) {
    return false;
  }

  if (isIP(hostname) && isPrivateIpAddress(hostname)) {
    return false;
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.every(({ address }) => !isPrivateIpAddress(address));
  } catch {
    return false;
  }
}
