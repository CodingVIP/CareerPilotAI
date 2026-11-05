import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextFunction, Request, Response } from 'express';

type LocalBucket = { startedAt: number; count: number };

const localBuckets = new Map<string, LocalBucket>();
const distributedLimiters = new Map<string, Ratelimit>();
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
let warnedAboutFallback = false;

function localRateLimit(key: string, limit: number, windowMs: number): { success: boolean; reset: number; remaining: number } {
  const now = Date.now();
  for (const [bucketKey, bucket] of localBuckets) {
    if (now - bucket.startedAt >= windowMs) localBuckets.delete(bucketKey);
  }
  const bucket = localBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    localBuckets.set(key, { startedAt: now, count: 1 });
    return { success: true, reset: now + windowMs, remaining: limit - 1 };
  }
  bucket.count++;
  return {
    success: bucket.count <= limit,
    reset: bucket.startedAt + windowMs,
    remaining: Math.max(0, limit - bucket.count),
  };
}

function getDistributedLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  const existing = distributedLimiters.get(key);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.ceil(windowMs / 1000))} s`),
    prefix: 'careerpilot:ratelimit',
    timeout: 1500,
    ephemeralCache: new Map(),
  });
  distributedLimiters.set(key, limiter);
  return limiter;
}

export function rateLimit(limit: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = String(res.locals.userId || req.ip || req.socket.remoteAddress || 'unknown');
    const key = `${req.path}:${identity}`;
    try {
      const result = hasUpstash
        ? await getDistributedLimiter(limit, windowMs).limit(key)
        : localRateLimit(key, limit, windowMs);
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
      if (!result.success) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))));
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
      }
      next();
    } catch (error) {
      if (!warnedAboutFallback) {
        warnedAboutFallback = true;
        console.error('Upstash rate limiting unavailable; using process-local limits.', error);
      }
      const fallback = localRateLimit(key, limit, windowMs);
      if (!fallback.success) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((fallback.reset - Date.now()) / 1000))));
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
      }
      next();
    }
  };
}

export function isDistributedRateLimitingConfigured(): boolean {
  return hasUpstash;
}
