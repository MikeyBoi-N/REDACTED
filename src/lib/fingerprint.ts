/**
 * FingerprintJS helpers for flag deduplication.
 *
 * Inputs: IP address and FingerprintJS visitor ID from client
 * Outputs: A combined hash used for uniqueness enforcement
 * Side Effects: None (pure utility)
 */

import { createHash } from "crypto";

/**
 * Creates a combined session fingerprint by hashing the IP + device fingerprint.
 * This is stored with flag actions for deduplication.
 *
 * @param ip - Client IP address (from x-forwarded-for or direct)
 * @param visitorId - FingerprintJS visitor ID sent by client
 * @returns SHA-256 hex hash of the combined identity
 */
export function createSessionFingerprint(
  ip: string,
  visitorId: string
): string {
  return createHash("sha256")
    .update(`${ip}:${visitorId}`)
    .digest("hex");
}

/**
 * Extracts the client IP from a request.
 *
 * @param headers - Request headers
 * @returns Best-effort client IP string
 */
export function extractClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
