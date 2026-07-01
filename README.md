# lan-pad

A tiny **shared text pad over your LAN** — like Dontpad, but self-hosted in a single Python file with **zero dependencies**. Start it on your machine, share your IP, and anyone on the same network can open the same link, type, and see the text update in real time. One click copies everything.

Built for the simplest case: quickly move a snippet, link, or note from one device to another on the same Wi-Fi, without cloud, accounts, or install.

## Features

- **Zero dependencies** — pure Python standard library. No `pip install`.
- **Single file** — `lan_pad.py`, ~180 lines.
- **Real-time sync** — everyone on the same pad sees changes within ~600ms (poll-based).
- **Copy all** — one button, works even over plain HTTP via IP (clipboard API + legacy fallback).
- **Multiple pads** — every URL path is its own pad: `/`, `/meeting`, `/notes`, …
- **Dark UI**, mobile friendly.

## Requirements

Python 3.7+ (uses `ThreadingHTTPServer`). Nothing else.

## Usage

```bash
python3 lan_pad.py            # port 8000
python3 lan_pad.py 9000       # custom port
```

Find your machine's LAN IP:

```bash
# macOS
ipconfig getifaddr en0
# Linux
hostname -I
```

Then, from any device on the same network, open:

```
http://YOUR_IP:8000/
```

Everyone on that URL shares the same pad. Use different paths for different pads:

```
http://YOUR_IP:8000/meeting
http://YOUR_IP:8000/notes
```

## How it works

- The server keeps each pad's text in memory, keyed by URL path, with a version counter.
- The browser **pushes** what you type via `POST /api<path>` and **pulls** updates via `GET /api<path>` every 600ms.
- While you're actively typing, incoming updates don't overwrite your text — so two people editing won't clobber mid-keystroke (last save wins per field, though; see limitations).
- The "Copy all" button uses the async Clipboard API on HTTPS/localhost and falls back to a legacy off-screen-textarea `execCommand('copy')` over plain HTTP, since the Clipboard API only works in a secure context.

## Limitations

- **In-memory only** — pads reset when you stop the server. No persistence.
- **No auth, no TLS** — anyone who can reach the port can read and write. Use on a trusted LAN only.
- **Last-write-wins** — this is not a CRDT/OT collaborative editor. Great for handing text between devices, not for simultaneous heavy co-editing.
- **Polling** — ~600ms latency by design; not WebSocket.

## Firewall note (macOS)

If other devices can't reach the port, allow incoming connections for Python in **System Settings → Network → Firewall**, or temporarily disable the firewall on a trusted network.

## License

MIT — see [LICENSE](LICENSE).
