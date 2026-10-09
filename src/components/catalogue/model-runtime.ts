'use client';

export type ModelState = {
  phase: 'idle' | 'queued' | 'loading' | 'preparing' | 'ready' | 'error' | 'unsupported';
  progress: number | null;
  manual: boolean;
  explicit: boolean;
};
export type ModelOptions = {
  photo: HTMLElement; host: HTMLElement; url: string; poster: string; name: string; alt: string;
  bytes: number | null; interest: () => void; notify: (state: ModelState) => void;
};
export type ModelController = { select: (selected: boolean) => void; open: () => void; dispose: () => void };
type Connection = EventTarget & { saveData?: boolean };
type Job = {
  selected: boolean; visible: boolean; wellVisible: boolean; visibleSince: number; selectedSince: number;
  loaded: boolean; explicit: boolean; autoFailed: boolean; disposed: boolean; phase: ModelState['phase'];
  progress: number | null; abort: AbortController | null; viewer: HTMLElement | null; blobUrl: string | null;
  timer: ReturnType<typeof setTimeout> | undefined; observer?: IntersectionObserver;
  arm: () => void; notify: () => void; rotate: () => void; eligible: () => boolean;
  reset: () => void; evict: () => void; load: (signal: AbortSignal) => Promise<void>;
  visibility: () => void;
};
const MAX_BYTES = 15 * 1024 * 1024;
const DWELL = 1300;
const jobs = new Set<Job>();
const queue: Job[] = [];
const live: Job[] = [];
let active: Job | null = null;
let lastMotion = 0;
let fallbackFrame = 0;
let disconnect: (() => void) | null = null;
let library: Promise<unknown> | null = null;
let supported: boolean | undefined;
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
const limit = () => document.querySelector('[data-hero-model]') ? 1 : 2;
const automatic = () => !document.hidden && !connection()?.saveData && Boolean(window.IntersectionObserver);
const poolBlocked = () => live.length >= limit() && !live.some((job) => !job.visible || !job.selected);
function supportsModel() {
  if (supported !== undefined) return supported;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    supported = Boolean(gl) && Boolean(window.customElements);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { supported = false; }
  return supported;
}
function cancelQueued(job: Job) {
  const index = queue.indexOf(job);
  if (index !== -1) { queue.splice(index, 1); job.reset(); }
}
async function ensureViewer() {
  if (customElements.get('model-viewer')) return;
  if (!library) library = import('@google/model-viewer').catch((error: unknown) => { library = null; throw error; });
  await library;
}
async function fetchBlob(url: string, signal: AbortSignal, hint: number | null, progress: (value: number | null) => void) {
  const response = await fetch(url, { signal, credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) { await response.body?.cancel(); throw new Error('Model unavailable'); }
  const header = Number(response.headers.get('content-length'));
  if (header > MAX_BYTES) { await response.body?.cancel(); throw new Error('Model too large'); }
  const total = header > 0 ? header : hint ?? 0;
  if (!response.body) {
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_BYTES) throw new Error('Model unavailable');
    progress(100);
    return blob;
  }
  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Model too large'); }
      // Copy into owned ArrayBuffers so Blob does not retain a shared/oversized stream buffer.
      chunks.push(new Uint8Array(value).buffer);
      progress(total > 0 ? Math.min(99, Math.floor(size / total * 100)) : null);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new Error('Model unavailable');
  progress(100);
  return new Blob(chunks, { type: 'model/gltf-binary' });
}
async function pump() {
  if (active) return;
  const job = queue.shift();
  if (!job) return;
  if (!job.eligible() || (!job.explicit && !automatic())) { job.reset(); void pump(); return; }
  if (live.length >= limit()) {
    const victim = live.find((item) => !item.visible || !item.selected) ?? (job.explicit ? live[0] : undefined);
    if (!victim) { job.reset(); job.arm(); void pump(); return; }
    victim.evict();
  }
  active = job;
  const abort = new AbortController();
  job.abort = abort;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 60_000);
  try {
    await job.load(abort.signal);
    if (!job.disposed) live.push(job);
  } catch (error) {
    job.evict();
    if (!job.disposed && (timedOut || !(error instanceof DOMException && error.name === 'AbortError'))) {
      job.autoFailed = true; job.phase = 'error'; job.notify();
    }
  } finally {
    clearTimeout(timer);
    job.abort = null;
    active = null;
    void pump();
    jobs.forEach((item) => item.arm());
  }
}
function enqueue(job: Job, explicit: boolean) {
  if (job.disposed || job.loaded || active === job || queue.includes(job)) return;
  job.explicit = explicit; job.phase = 'queued'; job.progress = null;
  clearTimeout(job.timer);
  job.notify();
  queue.push(job);
  void pump();
}
function connectRuntime() {
  if (disconnect) return;
  const fallback = () => {
    if (window.IntersectionObserver || fallbackFrame) return;
    fallbackFrame = requestAnimationFrame(() => {
      fallbackFrame = 0;
      jobs.forEach((job) => { job.visibility(); job.rotate(); });
    });
  };
  const onScroll = () => { lastMotion = performance.now(); fallback(); };
  const suspend = () => {
    active?.abort?.abort();
    queue.splice(0).forEach((job) => job.reset());
    jobs.forEach((job) => { clearTimeout(job.timer); job.viewer?.removeAttribute('auto-rotate'); });
  };
  const visibility = () => {
    if (document.hidden) suspend();
    jobs.forEach((job) => { job.rotate(); job.arm(); });
    if (!document.hidden) void pump();
  };
  const onConnection = () => {
    if (connection()?.saveData) {
      if (active && !active.explicit) active.abort?.abort();
      queue.filter((job) => !job.explicit).forEach(cancelQueued);
    }
    jobs.forEach((job) => job.arm());
  };
  const onHide = () => suspend();
  const onShow = () => jobs.forEach((job) => { job.visibility(); job.rotate(); job.arm(); });
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', fallback, { passive: true });
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);
  document.addEventListener('visibilitychange', visibility);
  connection()?.addEventListener('change', onConnection);
  disconnect = () => {
    cancelAnimationFrame(fallbackFrame); fallbackFrame = 0;
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', fallback);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('visibilitychange', visibility);
    connection()?.removeEventListener('change', onConnection);
    disconnect = null;
  };
}

export function mountProductModel(options: ModelOptions): ModelController {
  if (!supportsModel()) {
    options.notify({ phase: 'unsupported', progress: null, manual: true, explicit: false });
    return { select: () => {}, open: () => {}, dispose: () => {} };
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const job: Job = {
    selected: true, visible: false, wellVisible: false, visibleSince: 0, selectedSince: performance.now(),
    loaded: false, explicit: false, autoFailed: false, disposed: false, phase: 'idle', progress: null,
    abort: null, viewer: null, blobUrl: null, timer: undefined,
    notify() {
      if (!job.disposed) options.notify({
        phase: job.phase, progress: job.progress, explicit: job.explicit,
        manual: Boolean(connection()?.saveData || !window.IntersectionObserver || job.autoFailed || poolBlocked()),
      });
    },
    rotate() {
      if (!job.viewer) return;
      job.viewer.hidden = !job.selected || !job.visible || document.hidden;
      if (!job.viewer.hidden && job.loaded && !motion.matches) job.viewer.setAttribute('auto-rotate', '');
      else job.viewer.removeAttribute('auto-rotate');
    },
    visibility() {
      if (window.IntersectionObserver) return;
      const rect = options.photo.getBoundingClientRect();
      job.visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      if (!job.visible) cancelQueued(job);
    },
    eligible() {
      job.visibility();
      return !job.disposed && options.photo.isConnected && job.visible && job.selected && !document.hidden &&
        (job.explicit || (job.wellVisible && performance.now() - Math.max(lastMotion, job.visibleSince, job.selectedSince) >= DWELL));
    },
    arm() {
      clearTimeout(job.timer);
      job.notify();
      if (job.disposed || job.loaded || job.autoFailed || active === job || queue.includes(job) || !job.wellVisible || !job.selected || !automatic() || poolBlocked()) return;
      job.timer = setTimeout(() => {
        if (performance.now() - Math.max(lastMotion, job.visibleSince, job.selectedSince) < DWELL) { job.arm(); return; }
        if (job.eligible() && automatic()) enqueue(job, false);
        else job.arm();
      }, DWELL);
    },
    reset() { job.phase = 'idle'; job.progress = null; job.notify(); },
    evict() {
      const index = live.indexOf(job);
      if (index !== -1) live.splice(index, 1);
      const focused = job.viewer && (document.activeElement === job.viewer || job.viewer.contains(document.activeElement));
      if (job.viewer) { job.viewer.removeAttribute('auto-rotate'); job.viewer.removeAttribute('src'); job.viewer.remove(); }
      job.viewer = null; job.loaded = false;
      if (job.blobUrl) URL.revokeObjectURL(job.blobUrl);
      job.blobUrl = null;
      job.reset();
      if (focused && !job.disposed) options.photo.focus({ preventScroll: true });
    },
    async load(signal) {
      const restoreFocus = options.photo.contains(document.activeElement);
      job.phase = 'loading'; job.notify();
      await ensureViewer();
      if (signal.aborted || !job.eligible()) throw new DOMException('Cancelled', 'AbortError');
      const Viewer = customElements.get('model-viewer') as (CustomElementConstructor & { modelCacheSize?: number }) | undefined;
      if (Viewer) Viewer.modelCacheSize = 0;
      const blob = await fetchBlob(options.url, signal, options.bytes, (value) => {
        if (value !== job.progress) { job.progress = value; job.notify(); }
      });
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      job.phase = 'preparing'; job.notify();
      job.blobUrl = URL.createObjectURL(blob);
      const viewer = document.createElement('model-viewer');
      job.viewer = viewer;
      viewer.className = 'products-model';
      const attrs = {
        alt: options.alt + ': ' + options.name, tabindex: '0',
        'camera-controls': '', 'disable-pan': '', 'disable-zoom': '', 'interaction-prompt': 'none',
        'touch-action': 'none', 'auto-rotate-delay': '1500', 'rotation-per-second': '18deg',
        'shadow-intensity': '0', exposure: '1', 'environment-image': 'neutral',
        'camera-orbit': '0deg 90deg 105%', 'min-camera-orbit': 'auto 55deg auto', 'max-camera-orbit': 'auto 105deg auto',
        loading: 'eager', reveal: 'auto', poster: options.poster,
      };
      Object.entries(attrs).forEach(([name, value]) => viewer.setAttribute(name, value));
      viewer.addEventListener('camera-change', (event) => {
        if ((event as CustomEvent<{ source?: string }>).detail?.source === 'user-interaction') options.interest();
      });
      ['pointerdown', 'pointermove', 'pointerup', 'keydown'].forEach((type) => viewer.addEventListener(type, (event) => event.stopPropagation()));
      await new Promise<void>((resolve, reject) => {
        const clean = () => { signal.removeEventListener('abort', abort); viewer.removeEventListener('load', loaded); viewer.removeEventListener('error', failed); };
        const abort = () => { clean(); reject(new DOMException('Cancelled', 'AbortError')); };
        const loaded = () => { clean(); resolve(); };
        const failed = () => { clean(); reject(new Error('Model unavailable')); };
        signal.addEventListener('abort', abort, { once: true });
        viewer.addEventListener('load', loaded, { once: true });
        viewer.addEventListener('error', failed, { once: true });
        viewer.setAttribute('src', job.blobUrl!);
        options.host.append(viewer);
        job.rotate();
      });
      if (signal.aborted || job.disposed || !options.photo.isConnected) throw new DOMException('Cancelled', 'AbortError');
      job.loaded = true; job.autoFailed = false; job.phase = 'ready'; job.notify(); job.rotate();
      viewer.addEventListener('error', () => { if (!job.disposed) { job.evict(); job.autoFailed = true; job.phase = 'error'; job.notify(); } });
      if (restoreFocus && job.selected && job.visible) viewer.focus({ preventScroll: true });
    },
  };
  jobs.add(job);
  connectRuntime();
  job.observer = window.IntersectionObserver ? new IntersectionObserver((entries) => {
    const entry = entries[0];
    job.visible = entry.isIntersecting && entry.intersectionRatio > 0;
    const well = job.visible && entry.intersectionRatio >= 0.75;
    if (well && !job.wellVisible) job.visibleSince = performance.now();
    job.wellVisible = well;
    if (!job.visible) { cancelQueued(job); if (active === job && !job.explicit) job.abort?.abort(); }
    job.rotate(); job.arm();
    if (!job.visible) jobs.forEach((other) => { if (other !== job) other.arm(); });
  }, { threshold: [0, 0.01, 0.75, 1] }) : undefined;
  job.observer?.observe(options.photo);
  motion.addEventListener('change', job.rotate);
  job.visibility(); job.arm();
  return {
    select(selected) {
      if (selected !== job.selected) job.selectedSince = performance.now();
      job.selected = selected;
      if (!selected) { cancelQueued(job); if (active === job && !job.explicit) job.abort?.abort(); }
      job.rotate(); job.arm();
      jobs.forEach((other) => { if (other !== job) other.arm(); });
    },
    open() { job.visible = true; enqueue(job, true); },
    dispose() {
      job.disposed = true; clearTimeout(job.timer);
      cancelQueued(job); job.abort?.abort(); job.observer?.disconnect();
      motion.removeEventListener('change', job.rotate);
      job.evict(); jobs.delete(job);
      if (!jobs.size) disconnect?.();
      else jobs.forEach((other) => other.arm());
    },
  };
}
