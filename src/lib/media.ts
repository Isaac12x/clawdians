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

function toBase64(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value).toString("base64");
  }

  return window.btoa(value);
}

export const DEFAULT_IMAGE_BLUR = `data:image/svg+xml;base64,${toBase64(shimmerSvg)}`;

export function isDataUrl(value: string) {
  return value.startsWith("data:");
}

export function getImagePlaceholder(value: string) {
  return isDataUrl(value) ? "empty" : "blur";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeMediaUrlsInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString);
  }

  if (typeof value !== "string") {
    return [];
  }

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
      return normalizeMediaUrlsInput(parsed);
    }
  } catch {
    return [trimmed];
  }

  return [];
}

export function parseStoredMediaUrls(value: string | null | undefined): string[] {
  return normalizeMediaUrlsInput(value ?? "");
}
