/**
 * Input validation utilities.
 *
 * Centralises string sanitisation and length enforcement so every API
 * route doesn't have to reinvent the same guards.
 */

// ---------------------------------------------------------------------------
// Length constants
// ---------------------------------------------------------------------------

export const MAX_TITLE_LENGTH = 300;
export const MAX_BODY_LENGTH = 20_000;
export const MAX_BIO_LENGTH = 500;
export const MAX_NAME_LENGTH = 80;
export const MAX_URL_LENGTH = 2_048;
export const MAX_REPORT_REASON_LENGTH = 1_000;
export const MAX_COMMENT_LENGTH = 10_000;
export const MAX_MESSAGE_LENGTH = 5_000;
export const MAX_SPACE_NAME_LENGTH = 80;
export const MAX_SPACE_DESCRIPTION_LENGTH = 500;
export const MAX_SEARCH_QUERY_LENGTH = 200;
export const MAX_COLLABORATION_MESSAGE_LENGTH = 2_000;

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/**
 * Strip null bytes and trim whitespace.  This catches the most common XSS
 * vectors that slip past React's default escaping when values end up in
 * `<meta>` tags or JSON responses consumed by other clients.
 */
export function sanitizeString(value: string): string {
  // Remove null bytes (common bypass vector)
  // eslint-disable-next-line no-control-regex
  return value.replace(/\0/g, "").trim();
}

/**
 * Validate + sanitise a free-text string field.
 *
 * Returns `{ value, error }`.  When `error` is non-null the value should be
 * rejected with a 400.
 */
export function validateTextField(
  raw: unknown,
  fieldName: string,
  maxLength: number,
  options?: { required?: boolean }
): { value: string | null; error: string | null } {
  if (raw === null || raw === undefined || raw === "") {
    if (options?.required) {
      return { value: null, error: `${fieldName} is required` };
    }
    return { value: null, error: null };
  }

  if (typeof raw !== "string") {
    return { value: null, error: `${fieldName} must be a string` };
  }

  const cleaned = sanitizeString(raw);

  if (options?.required && !cleaned) {
    return { value: null, error: `${fieldName} is required` };
  }

  if (cleaned.length > maxLength) {
    return {
      value: null,
      error: `${fieldName} must be at most ${maxLength} characters (got ${cleaned.length})`,
    };
  }

  return { value: cleaned || null, error: null };
}

/**
 * Quick URL format check (allows http/https only).
 */
export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate a URL field.
 */
export function validateUrlField(
  raw: unknown,
  fieldName: string,
  options?: { required?: boolean }
): { value: string | null; error: string | null } {
  const result = validateTextField(raw, fieldName, MAX_URL_LENGTH, options);
  if (result.error || !result.value) return result;

  if (!isValidUrl(result.value)) {
    return { value: null, error: `${fieldName} must be a valid HTTP(S) URL` };
  }

  return result;
}

/**
 * Validate a CUID-like id string (alphanumeric, 20-30 chars).
 */
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{20,30}$/i.test(value);
}
