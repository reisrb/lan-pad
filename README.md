# lan-pad

A shared **realtime** text pad, built with Next.js. Type on one device, everyone on the same link sees it live (~700ms). One click copies everything. Keeps the most recent **20 pads** (LRU), with no manual database wiring — same code runs on your LAN and on Vercel.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript
- Realtime via lightweight **client polling** (`GET` every ~700ms) — no persistent connections
- **Dual-backend store**, chosen at runtime: JSON file (LAN) or Redis (serverless)

## Run on your LAN

```bash
npm install
npm run build
npm start          # serves on 0.0.0.0:3000
```

No env needed — it writes a JSON file (`.data/pads.json`). Find your IP and share it:

```bash
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
```

Open `http://YOUR_IP:3000/`. Each path is its own pad: `/`, `/meeting`, `/notes`, …

## Deploy to Vercel

Vercel is serverless — many isolated instances, no shared disk — so it needs a shared store. This project uses **Redis** (Upstash), provisioned inside Vercel itself, free tier.

1. **Add the store** (auto-injects the env vars):
   - Vercel dashboard → your project → **Storage → Create → Redis (Upstash)**, connect to Production + Preview. It sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
   - Or via CLI: `vercel integration add upstash` (pick the Free plan).
2. **Deploy:**
   ```bash
   vercel --prod
   ```

When Redis env vars are present the app uses Redis; otherwise it falls back to the JSON file. See `.env.example`.

## How it works

- `src/lib/store.ts` — `getText`/`setText`, max 20 pads (LRU). Redis backend when `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` are set, else a JSON file (`PAD_DATA_FILE`, default `.data/pads.json`).
- `GET /api/pad/[slug]` — return the pad's current text.
- `POST /api/pad/[slug]` — save it, evicting the oldest pad past the cap.
- `src/components/Pad.tsx` — client component: polls for updates, pushes debounced edits, copies with a plain-HTTP fallback (Clipboard API needs a secure context).

## Limitations

- **20-pad cap** — the least-recently-written pad is dropped when a 21st appears.
- **No auth / no TLS on LAN** — trusted network only. On Vercel it's public; use an obscure pad path for privacy.
- **Last-write-wins** — not a collaborative CRDT editor; great for moving text between devices.

## License

MIT
