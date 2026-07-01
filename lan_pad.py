#!/usr/bin/env python3
"""lan-pad — a shared text pad over your LAN. Pure stdlib, zero deps.

Usage:
    python3 lan_pad.py            # port 8000
    python3 lan_pad.py 9000       # custom port

Open http://YOUR_IP:8000/ from any machine on the network.
Each path (/, /meeting, /notes) is a separate pad.
"""
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PADS = {}                    # path -> text
VERSIONS = {}                # path -> int (bumped on every save)
LOCK = threading.Lock()

PAGE = """<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pad {path}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font: 15px/1.4 -apple-system, system-ui, sans-serif; background: #1e1e1e; color: #ddd; }}
  header {{ padding: 8px 12px; background: #252526; display: flex; gap: 12px; align-items: center; border-bottom: 1px solid #333; }}
  header b {{ color: #4ec9b0; }}
  #status {{ margin-left: auto; font-size: 12px; color: #888; }}
  button {{ background: #0e639c; color: #fff; border: 0; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }}
  button:hover {{ background: #1177bb; }}
  textarea {{ width: 100%; height: calc(100vh - 42px); border: 0; padding: 14px; background: #1e1e1e; color: #ddd;
             font: 14px/1.5 ui-monospace, Menlo, monospace; resize: none; outline: none; }}
</style>
<header>
  <b>pad</b> <span>{path}</span>
  <button onclick="copyAll()">Copy all</button>
  <span id="status">connecting…</span>
</header>
<textarea id="pad" placeholder="Type here… it auto-saves and shows up in real time for anyone on the same link."></textarea>
<script>
const path = {path_json};
const ta = document.getElementById('pad');
const status = document.getElementById('status');
let version = -1;        // last known version
let dirty = false;       // user typed, needs saving
let editing = false;     // focused -> don't overwrite while typing

ta.addEventListener('input', () => {{ dirty = true; }});
ta.addEventListener('focus', () => {{ editing = true; }});
ta.addEventListener('blur',  () => {{ editing = false; }});

function legacyCopy(text) {{
  // off-screen temp textarea; works over plain HTTP (no clipboard API)
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.setAttribute('readonly', '');
  tmp.style.position = 'fixed';
  tmp.style.top = '-1000px';
  tmp.style.opacity = '0';
  document.body.appendChild(tmp);
  tmp.focus();
  tmp.select();
  tmp.setSelectionRange(0, text.length);   // iOS
  let ok = false;
  try {{ ok = document.execCommand('copy'); }} catch (e) {{ ok = false; }}
  document.body.removeChild(tmp);
  ta.focus();
  return ok;
}}

async function copyAll() {{
  const text = ta.value;
  // 1) try clipboard API (HTTPS/localhost only)
  if (navigator.clipboard && window.isSecureContext) {{
    try {{
      await navigator.clipboard.writeText(text);
      status.textContent = 'copied ✓';
      return;
    }} catch (e) {{}}
  }}
  // 2) legacy fallback (plain HTTP over IP)
  if (legacyCopy(text)) {{
    status.textContent = 'copied ✓';
  }} else {{
    status.textContent = 'could not copy — select and Ctrl/Cmd+C';
  }}
}}

// push what was typed (every 600ms if dirty)
async function push() {{
  if (!dirty) return;
  dirty = false;
  try {{
    const r = await fetch('/api' + path, {{
      method: 'POST',
      headers: {{'content-type': 'application/json'}},
      body: JSON.stringify({{text: ta.value}})
    }});
    const j = await r.json();
    version = j.version;
  }} catch (e) {{ dirty = true; }}
}}

// pull other people's updates (every 600ms) — never overwrite while you type
async function pull() {{
  try {{
    const r = await fetch('/api' + path + '?v=' + version);
    const j = await r.json();
    status.textContent = 'live · ' + new Date().toLocaleTimeString();
    if (j.version !== version && !(editing && dirty)) {{
      const pos = ta.selectionStart;
      ta.value = j.text;
      version = j.version;
      try {{ ta.setSelectionRange(pos, pos); }} catch (e) {{}}
    }}
  }} catch (e) {{ status.textContent = 'offline — retrying…'; }}
}}

setInterval(push, 600);
setInterval(pull, 600);
pull();
</script>
"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path.startswith("/api"):
            pad = path[4:] or "/"
            with LOCK:
                self._send(200, json.dumps({
                    "text": PADS.get(pad, ""),
                    "version": VERSIONS.get(pad, 0),
                }), "application/json")
            return
        # any other path is a pad
        pad = path
        self._send(200, PAGE.format(path=pad, path_json=json.dumps(pad)))

    def do_POST(self):
        path = self.path.split("?")[0]
        if not path.startswith("/api"):
            self._send(404, "not found")
            return
        pad = path[4:] or "/"
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        with LOCK:
            PADS[pad] = body.get("text", "")
            VERSIONS[pad] = VERSIONS.get(pad, 0) + 1
            v = VERSIONS[pad]
        self._send(200, json.dumps({"version": v}), "application/json")

    def log_message(self, *args):
        pass  # silence per-request logging


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"lan-pad running at http://0.0.0.0:{port}/  (Ctrl+C to stop)")
    print("Find your IP:  ipconfig getifaddr en0   (Linux: hostname -I)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopping…")
        srv.shutdown()


if __name__ == "__main__":
    main()
