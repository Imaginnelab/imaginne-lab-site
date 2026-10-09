'use client';
import { useRef, useState, useTransition } from 'react';
import type { AdminResult } from '@/lib/admin/schemas';
import { Dialog } from './Dialog';
export function ConfirmDialog({ id, title, text, cancel, confirm, waiting, action, message, done, close }: {
  id: string; title: string; text: string; cancel: string; confirm: string; waiting: string;
  action: () => Promise<AdminResult>; message: (result: Extract<AdminResult, { ok: false }>) => string;
  done: () => void; close: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const lock = useRef(false);
  return <Dialog id={id} title={title} description={text} busy={pending} close={close} size="admin-dialog-small">
    <p className="form-error" role="alert">{error}</p>
    <div className="admin-dialog-actions">
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={close}>{cancel}</button>
      <button type="button" className="btn btn-danger btn-sm" disabled={pending} aria-busy={pending ? 'true' : undefined}
        onClick={() => {
          if (lock.current) return; lock.current = true; setError('');
          start(async () => {
            try { const result = await action(); if (result.ok) done(); else setError(message(result)); }
            catch { setError(message({ ok: false, code: 'failed' })); }
            finally { lock.current = false; }
          });
        }}>{pending ? waiting : confirm}</button>
    </div>
  </Dialog>;
}

