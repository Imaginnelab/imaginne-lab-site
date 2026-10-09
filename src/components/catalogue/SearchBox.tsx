'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { searchTerm } from '@/lib/search';
import type { Dictionary } from '@/i18n/dictionaries';

export function SearchBox({ copy, onSearch, initialTerm = '' }: {
  copy: Dictionary['store']['search']; onSearch: (term: string) => Promise<unknown>; initialTerm?: string;
}) {
  const [value, setValue] = useState(initialTerm);
  const [open, setOpen] = useState(Boolean(initialTerm));
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const last = useRef(initialTerm);
  const sequence = useRef(0);
  const alive = useRef(true);
  const id = useId();
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; sequence.current++; clearTimeout(timer.current); };
  }, []);
  async function run(next: string) {
    clearTimeout(timer.current);
    const term = searchTerm(next);
    if (term === last.current) return;
    last.current = term;
    const current = ++sequence.current;
    setBusy(true);
    try { await onSearch(term); } catch { /* The list owns translated errors/retry. */ }
    finally { if (alive.current && current === sequence.current) setBusy(false); }
  }
  function focus() { input.current?.focus({ preventScroll: true }); }
  function change(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    if (!searchTerm(next)) void run('');
    else timer.current = setTimeout(() => { void run(next); }, 300);
  }
  return (
    <div className={'search-box' + (open ? ' is-open' : '')} role="search"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !value && !busy) setOpen(false); }}>
      <button ref={toggle} className="search-toggle" type="button" aria-label={copy.open} aria-expanded={open} aria-controls={id}
        onClick={() => { if (!open) { setOpen(true); focus(); } else if (value) focus(); else setOpen(false); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4" /></svg>
      </button>
      <input id={id} ref={input} className="search-input" type="search" placeholder={copy.field} aria-label={copy.field}
        autoComplete="off" spellCheck={false} maxLength={60} enterKeyHint="search" tabIndex={open ? 0 : -1} value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); void run(value); }
          if (event.key === 'Escape') {
            event.stopPropagation();
            if (value) { setValue(''); void run(''); }
            else { setOpen(false); toggle.current?.focus(); }
          }
        }} />
      <button className="search-clear is-icon" type="button" aria-label={copy.clear} aria-busy={busy ? 'true' : undefined}
        disabled={busy} hidden={!busy && !value} onClick={() => { setValue(''); void run(''); focus(); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <span className="search-status" role="status" aria-live="polite">{busy ? copy.searching : ''}</span>
    </div>
  );
}
