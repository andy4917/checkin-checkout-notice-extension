import { createHash } from "node:crypto";

const EXTENSION_ID_ALPHABET = "abcdefghijklmnop";

export function getExtensionIdFromManifestKey(manifestKey: string): string {
  const publicKey = Buffer.from(manifestKey, "base64");
  const hash = createHash("sha256").update(publicKey).digest();

  return [...hash.subarray(0, 16)]
    .map((byte) => EXTENSION_ID_ALPHABET[byte >> 4] + EXTENSION_ID_ALPHABET[byte & 0x0f])
    .join("");
}
