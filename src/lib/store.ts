// File-backed pad store. Single process (LAN / one always-on host).
// Holds at most MAX pads, evicting the least-recently-written (LRU).
// Persisted to a JSON file so it survives restarts. NOT for multi-instance
// serverless (Vercel): there the disk is per-instance and ephemeral.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const FILE = process.env.PAD_DATA_FILE || '.data/pads.json';
const MAX = 20;

// Map insertion order = LRU order (oldest first, newest last).
type Pads = Map<string, string>;

const g = globalThis as unknown as { __lanpad?: Pads };
const pads: Pads = g.__lanpad ?? (g.__lanpad = load());

function load(): Pads {
  try {
    const obj = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function persist(): void {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(pads)));
  } catch {
    // best-effort; state stays in memory even if the write fails
  }
}

export function getText(slug: string): string {
  return pads.get(slug) ?? '';
}

export function setText(slug: string, text: string): void {
  pads.delete(slug); // re-insert so this pad becomes the newest
  pads.set(slug, text);
  while (pads.size > MAX) {
    const oldest = pads.keys().next().value as string;
    pads.delete(oldest);
  }
  persist();
}
