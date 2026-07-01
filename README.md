# lan-pad

A shared **realtime** text pad, built with Next.js. Type on one device, everyone on the same link sees it live (~700ms). One click copies everything. Runs two ways with the same code: **on your LAN** with zero setup (in-memory), or **on Vercel** backed by Upstash Redis.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript
- Realtime via lightweight **client polling** (`GET` every ~700ms) — robust on serverless, no persistent connections
- Pluggable store: **in-memory** (LAN) or **Upstash Redis** (serverless), selected at runtime by env vars

## Run on your LAN

```bash
npm install
npm run build
npm start          # serves on 0.0.0.0:3000 (reachable across the LAN)
```

No env vars needed — it uses in-memory state. Find your IP and share it:

```bash
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
```

Open `http://YOUR_IP:3000/` from any device on the network. Each path is its own pad: `/`, `/meeting`, `/notes`, …

## Deploy to Vercel

Serverless runs many isolated instances, so in-memory state isn't shared — you need a shared store. This project uses **Upstash Redis** (free tier).

1. Add Upstash Redis to the Vercel project (Vercel dashboard → Storage → Marketplace → Upstash, or the Upstash console). It injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into the project env.
2. Deploy:
   ```bash
   vercel        # preview
   vercel --prod # production
   ```

When those env vars are present the app uses Redis automatically; when absent it falls back to in-memory. See `.env.example`.

## How it works

- `src/lib/store.ts` — `getText`/`setText` over Redis REST when configured, else an in-memory `Map`.
- `GET /api/pad/[slug]` — return the pad's current text.
- `POST /api/pad/[slug]` — save the pad's text.
- `src/components/Pad.tsx` — client component: polls for updates, pushes debounced edits, and copies with a plain-HTTP fallback (Clipboard API needs a secure context).

## Limitations

- **No auth / no TLS on LAN** — trusted network only. On Vercel it's public; use an obscure pad path if you want privacy.
- **Last-write-wins** — not a collaborative CRDT editor; great for moving text between devices.
- **In-memory backend resets on restart** — use the Redis backend if you need persistence.

## License

MIT
