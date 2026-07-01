// Dual-backend pad store, max 20 pads (LRU by last write):
//   - Redis when env vars are present (Vercel / any serverless). Shared across
//     all instances. Reads UPSTASH_REDIS_REST_* or Vercel KV's KV_REST_API_*.
//   - JSON file otherwise (LAN / single always-on host), persisted to disk.
// Same behavior either way; the runtime picks the backend automatically.
import { Redis } from '@upstash/redis';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const MAX = 20;
const INDEX = 'lanpad:index';
const key = (slug: string) => `lanpad:${slug}`;

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// ---- file fallback (single process) ----
const FILE = process.env.PAD_DATA_FILE || '.data/pads.json';
const g = globalThis as unknown as { __lanpad?: Map<string, string> };
const mem: Map<string, string> = g.__lanpad ?? (g.__lanpad = loadFile());

function loadFile(): Map<string, string> {
  try {
    return new Map(
      Object.entries(JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>)
    );
  } catch {
    return new Map();
  }
}

function persist(): void {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(mem)));
  } catch {
    // best-effort; state stays in memory even if the write fails
  }
}

export async function getText(slug: string): Promise<string> {
  if (redis) return (await redis.get<string>(key(slug))) ?? '';
  return mem.get(slug) ?? '';
}

export async function setText(slug: string, text: string): Promise<void> {
  if (redis) {
    await redis.set(key(slug), text);
    await redis.zadd(INDEX, { score: Date.now(), member: slug }); // touch = newest
    const count = await redis.zcard(INDEX);
    if (count > MAX) {
      const stale = await redis.zrange<string[]>(INDEX, 0, count - MAX - 1);
      if (stale.length) {
        await redis.del(...stale.map(key));
        await redis.zrem(INDEX, ...stale);
      }
    }
    return;
  }
  mem.delete(slug); // re-insert so this pad becomes the newest
  mem.set(slug, text);
  while (mem.size > MAX) {
    const oldest = mem.keys().next().value as string;
    mem.delete(oldest);
  }
  persist();
}
