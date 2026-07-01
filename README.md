# lan-pad

A shared **realtime** text pad over your LAN, built with Next.js. Type on one device, everyone on the same link sees it live. One click copies everything. **No database** — text lives in server memory and is broadcast over Server-Sent Events.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript
- Realtime via **SSE** (`EventSource`), no polling, no external service
- **In-memory only** — a pad's text is held in one Node process and relayed to live subscribers

## Run

```bash
npm install
npm run build
npm start          # serves on 0.0.0.0:3000 (reachable across the LAN)
```

Dev mode:

```bash
npm run dev
```

Find your LAN IP and share it:

```bash
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
```

Open `http://YOUR_IP:3000/` from any device on the network. Each path is its own pad: `/`, `/meeting`, `/notes`, …

## How it works

- `src/lib/store.ts` — in-memory `Map<slug, { text, subscribers }>`.
- `POST /api/pad/[slug]` — save text, broadcast to every live subscriber.
- `GET /api/pad/[slug]/stream` — SSE stream: current text on connect, then every change.
- `src/components/Pad.tsx` — client component: subscribes via `EventSource`, pushes debounced edits, copies with a plain-HTTP fallback.

## Limitations

- **No persistence** — restart the server and pads reset. By design (realtime relay, not storage).
- **Single process** — works under `next start` on a LAN. **Not** suited to multi-instance serverless (e.g. Vercel), where memory isn't shared across instances and SSE is constrained. Add a shared store (Redis/KV) if you need that.
- **No auth / no TLS** — trusted LAN only.
- **Last-write-wins** — not a collaborative CRDT editor; great for moving text between devices.

## License

MIT
