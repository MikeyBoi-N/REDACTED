/**
 * Admin authentication middleware.
 *
 * Security model: IP allowlist + secret token header. Both must pass.
 * Non-whitelisted IPs receive a generic 404 (no signal that admin exists).
 *
 * Inputs: Request headers and IP address
 * Outputs: Authentication result (pass/fail)
 * Side Effects: Tracks failed auth attempts for rate limiting
 */

import { NextRequest } from "next/server";

/** In-memory rate limiter for failed auth attempts. */
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_FAILURES = 3;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface AdminAuthResult {
  readonly authorized: boolean;
  readonly statusCode: number; // 404 for non-allowed IP, 429 for rate limited, 401 for bad token
}

/**
 * Validates admin request against IP allowlist and secret token.
 *
 * @param request - The incoming Next.js request
 * @returns AdminAuthResult with authorization status and appropriate HTTP code
 */
export function authenticateAdmin(request: NextRequest): AdminAuthResult {
  const allowedIp = process.env.ADMIN_ALLOWED_IP;
  const secretToken = process.env.ADMIN_SECRET_TOKEN;

  if (!allowedIp || !secretToken) {
    return { authorized: false, statusCode: 404 };
  }

  // Extract client IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // IP check first — generic 404 for non-allowed IPs
  if (clientIp !== allowedIp) {
    return { authorized: false, statusCode: 404 };
  }

  // Rate limiting check
  const attempts = failedAttempts.get(clientIp);
  if (attempts && attempts.count >= MAX_FAILURES) {
    if (Date.now() < attempts.blockedUntil) {
      return { authorized: false, statusCode: 429 };
    }
    // Block expired, reset
    failedAttempts.delete(clientIp);
  }

  // Token check
  const providedToken = request.headers.get("x-admin-token");
  if (providedToken !== secretToken) {
    // Track failure
    const current = failedAttempts.get(clientIp) ?? { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILURES) {
      current.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    }
    failedAttempts.set(clientIp, current);
    return { authorized: false, statusCode: 404 }; // Still 404, not 401
  }

  // Both checks passed
  return { authorized: true, statusCode: 200 };
}
