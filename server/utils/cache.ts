import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  const config = useRuntimeConfig()
  if (!config.upstashRedisUrl || !config.upstashRedisToken) return null
  _redis = new Redis({
    url: config.upstashRedisUrl,
    token: config.upstashRedisToken,
  })
  return _redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  return redis.get<T>(key)
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.set(key, value, { ex: ttlSeconds })
}
