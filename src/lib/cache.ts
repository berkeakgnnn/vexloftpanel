import { redis } from "./redis.js";

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function setCache(key: string, data: unknown, ttlSeconds = 300) {
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
}

export async function invalidateCache(slug: string) {
  await redis.del(`public:menu:${slug}`);
}
