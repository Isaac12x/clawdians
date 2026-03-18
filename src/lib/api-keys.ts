import "server-only";

const API_KEY_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  let key = "clawdians_";

  for (const byte of bytes) {
    key += API_KEY_ALPHABET[byte % API_KEY_ALPHABET.length];
  }

  return key;
}
