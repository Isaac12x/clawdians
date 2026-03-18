const shimmerSvg = `
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="12" fill="#101B31"/>
    <rect x="-32" width="24" height="64" fill="url(#g)">
      <animate attributeName="x" from="-32" to="72" dur="1.4s" repeatCount="indefinite" />
    </rect>
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#101B31" stop-opacity="0" />
        <stop offset="0.5" stop-color="#4F8DF5" stop-opacity="0.22" />
        <stop offset="1" stop-color="#101B31" stop-opacity="0" />
      </linearGradient>
    </defs>
  </svg>
`;

const OPTIMIZED_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "oaidalleapiprodscus.blob.core.windows.net",
  "placehold.co",
]);
const OPTIMIZED_IMAGE_SUFFIXES = [".githubusercontent.com"];
const INLINE_IMAGE_PREFIX = "data:image/";
const MAX_INLINE_MEDIA_LENGTH = 2_500_000;

function toBase64(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value).toString("base64");
  }

  return window.btoa(value);
}

export const DEFAULT_IMAGE_BLUR = `data:image/svg+xml;base64,${toBase64(shimmerSvg)}`;
export const MAX_MEDIA_ITEMS = 4;

export function isDataUrl(value: string) {
  return value.startsWith(INLINE_IMAGE_PREFIX);
}

export function isValidMediaUrl(value: string) {
  if (isDataUrl(value)) {
    return value.length <= MAX_INLINE_MEDIA_LENGTH;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function canUseNextImage(value: string) {
  if (isDataUrl(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    return (
      OPTIMIZED_IMAGE_HOSTS.has(hostname) ||
      OPTIMIZED_IMAGE_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}

export function getImagePlaceholder(value: string) {
  return isDataUrl(value) ? "empty" : "blur";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeMediaUrlsInput(value: unknown): string[] {
  const strings = Array.isArray(value)
    ? value.filter(isNonEmptyString)
    : typeof value === "string"
      ? normalizeMediaString(value)
      : [];

  return [...new Set(strings.map((item) => item.trim()).filter(Boolean))];
}

function normalizeMediaString(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(isNonEmptyString);
    }

    if (typeof parsed === "string") {
      return normalizeMediaString(parsed);
    }
  } catch {
    return [trimmed];
  }

  return [];
}

export function validateMediaUrlsInput(
  value: unknown,
  options?: { required?: boolean; maxItems?: number }
): { value: string[]; error: string | null } {
  const maxItems = options?.maxItems ?? MAX_MEDIA_ITEMS;
  const urls = normalizeMediaUrlsInput(value);

  if (options?.required && urls.length === 0) {
    return { value: [], error: "mediaUrls is required" };
  }

  if (urls.length > maxItems) {
    return {
      value: [],
      error: `mediaUrls must contain at most ${maxItems} items`,
    };
  }

  for (const url of urls) {
    if (!isValidMediaUrl(url)) {
      return {
        value: [],
        error:
          "mediaUrls must use HTTPS URLs or inline image data URLs smaller than 2.5 MB",
      };
    }
  }

  return { value: urls, error: null };
}

export function parseStoredMediaUrls(value: string | null | undefined): string[] {
  return normalizeMediaUrlsInput(value ?? "");
}
