import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(REDIS_URL);

// Shared ioredis instance for dedup/caching in other modules
export const redisClient = new Redis({
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
  maxRetriesPerRequest: null,
});

// Plain connection config for bullmq (avoids ioredis version type mismatch)
export const redisConnection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
};

export const inquiryQueue = new Queue('inquiry', { connection: redisConnection });
export const followupQueue = new Queue('followup', { connection: redisConnection });
