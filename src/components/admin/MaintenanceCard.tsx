'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import { setMaintenance } from '@/lib/admin/actions';
import { readMaintenance } from '@/lib/admin/client/read-actions';
import { ConfirmDialog } from './ConfirmDialog';
type Copy = Pick<AdminDictionary['interface'],
  'maintenance' | 'maintenanceHelp' | 'maintenanceOn' | 'maintenanceOff' | 'maintenanceChecking' | 'maintenanceSaving' |
  'maintenanceLoadError' | 'maintenanceSaveError' | 'maintenanceForbidden' | 'maintenanceRetry' | 'maintenanceConfirmTitle' |
  'maintenanceConfirmText' | 'maintenanceConfirmYes' | 'maintenanceCancel'>;
export function MaintenanceCard({ initial, copy }: { initial: boolean | null; copy: Copy }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState(initial === null ? copy.maintenanceLoadError : '');
  const [confirm, setConfirm] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();
  const locked = useRef(false);
  const router = useRouter();
  const busy = pending || confirmBusy;
  return <article className="admin-card maintenance-card" id="maintenance-card" aria-labelledby="maintenance-heading" aria-busy={busy}>
    <h2 id="maintenance-heading">{copy.maintenance}</h2><p id="maintenance-help" className="maintenance-help">{copy.maintenanceHelp}</p>
    <div className="maintenance-row">
      <button className="switch is-icon" id="maintenance-switch" type="button" role="switch" aria-checked={on === true}
        aria-labelledby="maintenance-heading" aria-describedby="maintenance-help" disabled={busy || on === null} aria-busy={busy ? 'true' : undefined}
        onClick={() => {
          if (busy || on === null || locked.current) return;
          if (!on) { setConfirm(true); return; }
          locked.current = true; setError(''); start(async () => {
            try { const result = await setMaintenance(false); if (result.ok) { setOn(false); router.refresh(); } else setError(result.code === 'unauthorized' ? copy.maintenanceForbidden : copy.maintenanceSaveError); }
            catch {
              const result = await readMaintenance().catch(() => null);
              if (result?.ok) { setOn(result.on); setError(result.on ? copy.maintenanceSaveError : ''); }
              else { setOn(null); setError(copy.maintenanceLoadError); }
            } finally { locked.current = false; }
          });
        }}><span className="switch-thumb" /></button>
      <span className="maintenance-state" id="maintenance-state" aria-live="polite">{busy ? reading ? copy.maintenanceChecking : copy.maintenanceSaving : on === null ? '' : on ? copy.maintenanceOn : copy.maintenanceOff}</span>
      <button className="btn btn-ghost btn-sm" id="maintenance-retry" type="button" hidden={on !== null} disabled={busy}
        aria-busy={busy && reading ? 'true' : undefined} onClick={() => {
          if (locked.current) return; locked.current = true; setReading(true); setError('');
          start(async () => {
            try { const result = await readMaintenance(); if (result.ok) setOn(result.on); else setError(result.code === 'unauthorized' ? copy.maintenanceForbidden : copy.maintenanceLoadError); }
            catch { setError(copy.maintenanceLoadError); }
            finally { locked.current = false; setReading(false); }
          });
        }}>{copy.maintenanceRetry}</button>
    </div>
    <p className="form-error" id="maintenance-error" role="alert">{error}</p>
    {confirm ? <ConfirmDialog id="maintenance-confirm" title={copy.maintenanceConfirmTitle} text={copy.maintenanceConfirmText} cancel={copy.maintenanceCancel} confirm={copy.maintenanceConfirmYes} waiting={copy.maintenanceSaving}
      action={async () => {
        setConfirmBusy(true);
        try { return await setMaintenance(true); }
        catch {
          const result = await readMaintenance().catch(() => null);
          if (result?.ok) { setOn(result.on); if (result.on) return { ok: true }; }
          else { setOn(null); setError(copy.maintenanceLoadError); }
          return { ok: false, code: 'failed' };
        }
        finally { setConfirmBusy(false); }
      }} message={(result) => result.code === 'unauthorized' ? copy.maintenanceForbidden : copy.maintenanceSaveError}
      close={() => setConfirm(false)} done={() => { setOn(true); setError(''); setConfirm(false); router.refresh(); }} /> : null}
  </article>;
}
