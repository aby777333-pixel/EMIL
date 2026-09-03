// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Idempotency Key Handler
// Prevents duplicate financial mutations
// ═══════════════════════════════════════════════════════════

const idempotencyCache = new Map<string, { response: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get('Idempotency-Key') ?? request.headers.get('X-Idempotency-Key');
}

/**
 * Check if this idempotency key has already been processed.
 * Returns the cached response if it exists.
 */
export function checkIdempotency(key: string): unknown | null {
  const cached = idempotencyCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    idempotencyCache.delete(key);
    return null;
  }
  return cached.response;
}

/**
 * Store a response for an idempotency key
 */
export function storeIdempotency(key: string, response: unknown): void {
  // Clean expired entries periodically
  if (idempotencyCache.size > 10000) {
    const now = Date.now();
    for (const [k, v] of idempotencyCache) {
      if (now > v.expiresAt) idempotencyCache.delete(k);
    }
  }
  idempotencyCache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Middleware wrapper for idempotent financial endpoints
 */
export function withIdempotency<T>(
  handler: (req: Request) => Promise<T>,
): (req: Request) => Promise<T> {
  return async (req: Request) => {
    const key = getIdempotencyKey(req);
    if (key) {
      const cached = checkIdempotency(key);
      if (cached !== null) return cached as T;
    }

    const response = await handler(req);

    if (key) {
      storeIdempotency(key, response);
    }

    return response;
  };
}
