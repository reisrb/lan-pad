'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function Pad({ slug }: { slug: string }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('connecting…');
  const editing = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // subscribe to realtime updates via SSE
  useEffect(() => {
    const es = new EventSource(`/api/pad/${slug}/stream`);
    es.onopen = () => setStatus('live');
    es.onmessage = (e) => {
      const { text: incoming } = JSON.parse(e.data) as { text: string };
      // don't clobber what you're typing right now
      if (!editing.current) setText(incoming);
    };
    es.onerror = () => setStatus('offline — retrying…');
    return () => es.close();
  }, [slug]);

  // push local edits (debounced), server broadcasts to everyone else
  const push = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/pad/${slug}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: value }),
        }).catch(() => {});
      }, 250);
    },
    [slug]
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
