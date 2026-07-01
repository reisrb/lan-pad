# lan-pad

A shared **realtime** text pad, built with Next.js. Type on one device, everyone on the same link sees it live (~700ms). One click copies everything. State is kept on the server in a small JSON file — the most recent **20 pads**, no external database.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript
- Realtime via lightweight **client polling** (`GET` every ~700ms) — no persistent connections
- **File-backed store** — a JSON file holding the last 20 pads (LRU eviction), survives restarts

## Run

```bash
npm install
npm run build
npm start          # serves on 0.0.0.0:3000 (reachable across the LAN)
```

Dev mode: `npm run dev`. Find your IP and share it:

```bash
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
```

Open `http://YOUR_IP:3000/` from any device on the network. Each path is its own pad: `/`, `/meeting`, `/notes`, …

## How it works

- `src/lib/store.ts` — an in-memory `Map` (max 20 pads, LRU) persisted to `.data/pads.json`. Configure the path with `PAD_DATA_FILE`.
- `GET /api/pad/[slug]` — return the pad's current text.
- `POST /api/pad/[slug]` — save the pad's text, evicting the oldest pad past the cap.
- `src/components/Pad.tsx` — client component: polls for updates, pushes debounced edits, copies with a plain-HTTP fallback (the Clipboard API needs a secure context).

## Where it runs

- **LAN (`next start`)** or **any single always-on host** (VPS, Render, Railway, Fly) — the file store works: one process, one disk.
- **Not for multi-instance serverless (e.g. Vercel)** — there the filesystem is per-instance and ephemeral (`/tmp`), so instances wouldn't share state. That would need a shared store (Redis/KV) instead.

## Limitations

- **20-pad cap** — the least-recently-written pad is dropped when a 21st appears.
- **No auth / no TLS** — trusted network only.
- **Last-write-wins** — not a collaborative CRDT editor; great for moving text between devices.

## License

MIT
