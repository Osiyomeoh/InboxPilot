import { createHash } from 'crypto';
import { Redis } from 'ioredis';

let redis: Redis | null = null;

function getRedis() {
  if (!redis) redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return redis;
}

export async function isDedup(messageId: string): Promise<boolean> {
  const key = `dedup:${createHash('sha256').update(messageId).digest('hex')}`;
  const result = await getRedis().set(key, '1', 'EX', 86400 * 7, 'NX');
  return result === null; // null means key already existed → duplicate
}
