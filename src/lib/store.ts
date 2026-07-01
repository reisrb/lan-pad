// Pad state. Two backends, picked at runtime:
//   - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set — works on
//     multi-instance serverless (Vercel), shared across all instances.
//   - In-memory fallback otherwise — single process, perfect for LAN `next start`.
// No SSE: clients poll, so it behaves identically on both backends.
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const key = (slug: string) => `lanpad:${slug}`;

// in-memory fallback (survives dev HMR)
const g = globalThis as unknown as { __lanpad?: Map<string, string> };
const mem: Map<string, string> = g.__lanpad ?? (g.__lanpad = new Map());

export async function getText(slug: string): Promise<string> {
  if (redis) return (await redis.get<string>(key(slug))) ?? '';
  return mem.get(slug) ?? '';
}

export async function setText(slug: string, text: string): Promise<void> {
  if (redis) await redis.set(key(slug), text);
  else mem.set(slug, text);
}

export const usingRedis = redis !== null;
