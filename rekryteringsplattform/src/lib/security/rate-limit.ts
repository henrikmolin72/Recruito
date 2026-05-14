import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Durable, cross-instance rate limiter backed by the rate_limits table and the
// consume_rate_limit() Postgres function (migration 038). The previous version
// stored counters on globalThis, which gave each Vercel function isolate its
// own bucket and made the limits effectively unenforced across instances.
//
// If the DB call fails (transient outage, function not yet deployed, etc.) we
// fail open and fall back to the in-memory counter so we don't take the app
// down when rate limiting itself is unhealthy.

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

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
  if (store.size < 5000) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

// In-memory fallback. Used only if the DB-backed limiter throws.
function consumeInMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
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
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    resetAt: existing.resetAt,
  };
}

export async function consumeRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error || !data) {
      if (error) console.error("[rate-limit] DB call failed, falling back to in-memory:", error);
      return consumeInMemory(key, limit, windowMs);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return consumeInMemory(key, limit, windowMs);

    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? 1),
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (err) {
    console.error("[rate-limit] unexpected error, falling back to in-memory:", err);
    return consumeInMemory(key, limit, windowMs);
  }
}
