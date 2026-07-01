// In-memory only. No DB. Each pad = last text + a set of live SSE subscribers.
// State lives in one Node process, so this works under `next start` on a LAN,
// not on multi-instance serverless. Restart = wiped. That's by design.

type Subscriber = (text: string) => void;

interface Pad {
  text: string;
  subs: Set<Subscriber>;
}

// survive dev HMR module reloads
const g = globalThis as unknown as { __lanpad?: Map<string, Pad> };
const pads: Map<string, Pad> = g.__lanpad ?? (g.__lanpad = new Map());

function pad(slug: string): Pad {
  let p = pads.get(slug);
  if (!p) {
    p = { text: '', subs: new Set() };
    pads.set(slug, p);
  }
  return p;
}

export function getText(slug: string): string {
  return pad(slug).text;
}

export function setText(slug: string, text: string): void {
  const p = pad(slug);
  p.text = text;
  for (const sub of p.subs) sub(text);
}

export function subscribe(slug: string, cb: Subscriber): () => void {
  const p = pad(slug);
  p.subs.add(cb);
  return () => {
    p.subs.delete(cb);
  };
}
