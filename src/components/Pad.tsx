'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVE_MS = 2000; // poll interval while the pad is active
const IDLE_MS = 15000; // poll interval once idle (still catches remote edits)
const IDLE_AFTER = 10000; // go idle after this long with no activity

export function Pad({ slug }: { slug: string }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('connecting…');
  const editing = useRef(false);
  const dirty = useRef(false);
  const lastActivity = useRef(0);
  const lastSeen = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Adaptive polling: fast (2s) while active, slow (15s) once idle. Activity =
  // local typing OR a remote change picked up by a poll. A hidden tab makes no
  // requests. Keeps Redis command usage low without ever going fully blind.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (!alive) return;
      const active = Date.now() - lastActivity.current < IDLE_AFTER;
      timer = setTimeout(loop, active ? ACTIVE_MS : IDLE_MS);
    };

    const loop = async () => {
      if (!alive) return;
      if (!document.hidden) {
        try {
          const r = await fetch(`/api/pad/${slug}`, { cache: 'no-store' });
          const { text: incoming } = (await r.json()) as { text: string };
          if (!alive) return;
          // a change from someone else counts as activity -> speed back up
          if (lastSeen.current !== null && incoming !== lastSeen.current) {
            lastActivity.current = Date.now();
          }
          lastSeen.current = incoming;
          setStatus('live');
          // don't clobber your own unsaved typing
          if (!(editing.current && dirty.current)) setText(incoming);
        } catch {
          if (alive) setStatus('offline — retrying…');
        }
      }
      schedule();
    };

    loop();
    const onVisible = () => {
      if (!document.hidden) {
        lastActivity.current = Date.now(); // refocus = active
        if (timer) clearTimeout(timer);
        loop();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [slug]);

  // push local edits (debounced)
  const push = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/pad/${slug}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: value }),
        })
          .then(() => {
            dirty.current = false;
          })
          .catch(() => {});
      }, 250);
    },
    [slug]
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dirty.current = true;
    lastActivity.current = Date.now(); // typing keeps the fast poll alive
    setText(e.target.value);
    push(e.target.value);
  };

  const copyAll = async () => {
    const value = taRef.current?.value ?? text;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        setStatus('copied ✓');
        return;
      } catch {
        // fall through
      }
    }
    // legacy fallback for plain HTTP over IP
    const tmp = document.createElement('textarea');
    tmp.value = value;
    tmp.style.position = 'fixed';
    tmp.style.top = '-1000px';
    document.body.appendChild(tmp);
    tmp.focus();
    tmp.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(tmp);
    setStatus(ok ? 'copied ✓' : 'could not copy — select and Ctrl/Cmd+C');
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-700 bg-neutral-800 px-3 py-2">
        <b className="text-teal-400">pad</b>
        <span className="text-neutral-400">/{slug}</span>
        <button
          onClick={copyAll}
          className="rounded bg-sky-700 px-3 py-1 text-sm text-white hover:bg-sky-600"
        >
          Copy all
        </button>
        <span className="ml-auto text-xs text-neutral-500">{status}</span>
      </header>
      <textarea
        ref={taRef}
        value={text}
        onChange={onChange}
        onFocus={() => (editing.current = true)}
        onBlur={() => (editing.current = false)}
        placeholder="Type here… auto-saves and shows up in real time for anyone on the same link."
        className="flex-1 resize-none bg-neutral-900 p-4 font-mono text-sm text-neutral-200 outline-none"
      />
    </div>
  );
}
