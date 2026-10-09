'use client';

type Pagination = { hasMore: () => boolean; count: () => number; loadMore: (explicit?: boolean) => Promise<boolean>; near: (near: boolean) => void; busy?: () => boolean };

export function enableCarousel(track: HTMLUListElement, previous: HTMLButtonElement, next: HTMLButtonElement, status: HTMLElement, copy: { position: string }, pagination: Pagination) {
  let disposed = false;
  const disposers: Array<() => void> = [];
  function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, callback: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions | boolean) {
    target.addEventListener(type, callback, options);
    disposers.push(() => target.removeEventListener(type, callback, options));
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let updateFrame = 0;
  let pointer: { id: number; x: number; y: number; start: number; last: number; time: number; velocity: number; dragging: boolean } | null = null;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClick = false;
  let navigationIntent = 0;
  let pendingNext = 0;
  previous.classList.add('is-icon');
  next.classList.add('is-icon');
  let maxScroll = 0;
  let cardStep = 1;
  let pageSize = 1;
  const maximum = () => maxScroll;
  const clamp = (value: number) => Math.min(maximum(), Math.max(0, value));
  const step = () => cardStep;
  const measure = () => {
    const width = track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const first = track.firstElementChild;
    maxScroll = Math.max(0, track.scrollWidth - width);
    cardStep = Math.max(1, first ? first.getBoundingClientRect().width + gap : width);
    pageSize = Math.max(1, Math.floor((width + gap) / cardStep));
  };
  const update = () => {
    updateFrame = 0;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = Boolean(pagination.busy?.()) || (track.scrollLeft >= maximum() - 2 && !pagination.hasMore?.());
    if (pagination.busy?.() || pendingNext) next.setAttribute('aria-busy', 'true');
    else next.removeAttribute('aria-busy');
    pagination.near?.(maximum() - track.scrollLeft <= step() * pageSize * 1.5);
  };
  const schedule = () => { if (!updateFrame) updateFrame = requestAnimationFrame(update); };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    track.classList.remove('products-interacting');
  };
  const announce = () => {
    const count = pagination.count?.() ?? track.children.length;
    const index = Math.min(count, Math.round(track.scrollLeft / step()) + 1);
    status.textContent = `${copy.position}: ${index} / ${count}`;
    update();
  };
  const animateTo = (target: number, duration = 500) => {
    stop();
    const start = track.scrollLeft;
    const end = clamp(target);
    if (motion.matches || Math.abs(end - start) < 1) { track.scrollLeft = end; announce(); return; }
    track.classList.add('products-interacting');
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      track.scrollLeft = start + (end - start) * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { stop(); announce(); }
    };
    frame = requestAnimationFrame(tick);
  };
  const move = (direction: number) => {
    const intent = ++navigationIntent;
    const size = step();
    const target = (Math.round(track.scrollLeft / size) + direction * pageSize) * size;
    const oldEnd = maximum();
    animateTo(target);
    if (direction > 0 && target >= oldEnd - 2 && pagination.hasMore?.()) {
      pendingNext++;
      next.setAttribute('aria-busy', 'true');
      (async () => {
        try {
          const loaded = await pagination.loadMore?.(true);
          if (!disposed && loaded && intent === navigationIntent && !pointer && track.scrollLeft >= oldEnd - size) animateTo(target);
        } catch {
          // The page loader owns the translated retry state.
        } finally {
          if (--pendingNext === 0 && !disposed && !pagination.busy?.()) next.removeAttribute('aria-busy');
        }
      })();
    }
  };
  listen(previous, 'click', () => move(-1));
  listen(next, 'click', () => move(1));
  listen(track, 'keydown', event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') animateTo(0);
    else if (event.key === 'End') animateTo(maximum());
    else move(event.key === 'ArrowRight' ? 1 : -1);
  });
  listen(track, 'pointerdown', event => {
    navigationIntent++;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    if ((event.target instanceof Element && event.target.closest('button, a, model-viewer, input, textarea, select'))) return;
    stop();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: track.scrollLeft, last: track.scrollLeft, time: performance.now(), velocity: 0, dragging: false };
  });
  listen(track, 'pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      pointer.dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('products-dragging', 'products-interacting');
    }
    event.preventDefault();
    const now = performance.now();
    track.scrollLeft = clamp(pointer.start - dx);
    const elapsed = Math.max(1, now - pointer.time);
    const velocity = (track.scrollLeft - pointer.last) / elapsed;
    pointer.velocity = velocity * .65 + pointer.velocity * .35;
    pointer.last = track.scrollLeft;
    pointer.time = now;
  });
  const release = (event: PointerEvent) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const drag = pointer;
    pointer = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('products-dragging');
    if (!drag.dragging) return;
    suppressClick = true;
    clickTimer = setTimeout(() => { suppressClick = false; }, 0);
    const velocity = performance.now() - drag.time > 100 ? 0 : Math.max(-2.5, Math.min(2.5, drag.velocity));
    if (motion.matches || event.type === 'pointercancel') { stop(); announce(); return; }
    const target = Math.round(clamp(track.scrollLeft + velocity * 160) / step()) * step();
    animateTo(target, 480);
  };
  listen(track, 'pointerup', release);
  listen(track, 'pointercancel', release);
  listen(track, 'lostpointercapture', release);
  listen(track, 'pointerleave', () => { if (pointer && !pointer.dragging) pointer = null; });
  listen(track, 'click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  listen(track, 'dragstart', event => event.preventDefault());
  const interrupt = () => { navigationIntent++; stop(); };
  listen(track, 'wheel', interrupt, { passive: true });
  listen(track, 'touchstart', interrupt, { passive: true });
  listen(track, 'scroll', schedule, { passive: true });
  const resize = () => { measure(); schedule(); };
  const reduce = () => { if (motion.matches) stop(); };
  window.addEventListener('resize', resize, { passive: true });
  motion.addEventListener?.('change', reduce);
  const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  observer?.observe(track);
  if (track.firstElementChild) observer?.observe(track.firstElementChild);
  const onHide = (event: PageTransitionEvent) => {
    stop();
    cancelAnimationFrame(updateFrame);
    updateFrame = 0;
    if (event.persisted) return;
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    motion.removeEventListener?.('change', reduce);
  };
  window.addEventListener('pagehide', onHide);
  measure();
  update();
  return {
    dispose() {
      disposed = true; stop(); cancelAnimationFrame(updateFrame); clearTimeout(clickTimer);
      const captured = pointer;
      pointer = null;
      if (captured && track.hasPointerCapture(captured.id)) track.releasePointerCapture(captured.id);
      track.classList.remove('products-dragging');
      disposers.forEach((dispose) => dispose());
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pagehide', onHide);
      motion.removeEventListener('change', reduce);
    },
    refresh: resize,
    reset() {
      navigationIntent++;
      stop();
      const captured = pointer;
      pointer = null;
      if (captured && track.hasPointerCapture(captured.id)) track.releasePointerCapture(captured.id);
      track.classList.remove('products-dragging');
      track.scrollLeft = 0;
      resize();
    },
  };
}
