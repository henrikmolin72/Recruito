import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimitStore = globalThis as typeof globalThis & {
  __recruitoRateLimitStore?: RateLimitStore;
};

function getStore(): RateLimitStore {
  if (!globalRateLimitStore.__recruitoRateLimitStore) {
    globalRateLimitStore.__recruitoRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalRateLimitStore.__recruitoRateLimitStore;
}

function cleanupExpiredEntries(store: RateLimitStore, now: number) {
  // Keep the in-memory store bounded in long-running dev/prod processes.
  if (store.size < 5000) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  cleanupExpiredEntries(store, now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      resetAt,
    } as const;
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    } as const;
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    resetAt: existing.resetAt,
  } as const;
}
