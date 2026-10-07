// Geometry is measured only on initialization/layout changes, never in the scroll update.
export function mountProcess(section) {
  const track = section.querySelector('[data-process-track]');
  const fill = section.querySelector('[data-process-fill]');
  const rows = [...section.querySelectorAll('[data-process-step]')];
  const points = rows.map(row => row.querySelector('[data-process-point]'));
  const stages = rows.map(row => row.querySelector('.journey-stage'));
  if (!track || !fill || !rows.length || points.some(point => !point) || stages.some(stage => !stage)) return null;
  const stageRows = new Map(stages.map((stage, i) => [stage, rows[i]]));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let dirty = true;
  let enhanced = false;
  let disposed = false;
  let timelineVisible = false;
  let listening = false;
  let viewport = 0;
  let railStart = 0;
  let railLength = 1;
  let pointPositions = [];
  let rowObserver;
  let sectionObserver;
  let layoutObserver;

  const detachScroll = () => {
    if (!listening) return;
    window.removeEventListener('scroll', schedule);
    listening = false;
  };
  const syncScroll = () => {
    if (!enhanced || !timelineVisible || document.hidden) { detachScroll(); return; }
    if (!listening) {
      window.addEventListener('scroll', schedule, { passive: true });
      listening = true;
    }
  };
  const measure = () => {
    const y = window.scrollY;
    viewport = window.innerHeight;
    const top = track.getBoundingClientRect().top + y;
    const positions = points.map(point => {
      const rect = point.getBoundingClientRect();
      return rect.top + y + rect.height / 2;
    });
    const entered = rows.map(row => row.getBoundingClientRect().top < viewport);
    railStart = positions[0];
    railLength = Math.max(1, positions.at(-1) - railStart);
    pointPositions = positions;
    // Finish the read phase before writing classes/custom properties.
    track.style.setProperty('--journey-rail-top', (railStart - top) + 'px');
    track.style.setProperty('--journey-rail-height', railLength + 'px');
    entered.forEach((value, i) => { if (value) rows[i].classList.add('journey-entered'); });
    dirty = false;
  };
  const update = () => {
    const cursor = window.scrollY + viewport * .6;
    const progress = Math.min(1, Math.max(0, (cursor - railStart) / railLength));
    fill.style.transform = 'scaleY(' + progress + ')';
    points.forEach((point, i) => point.classList.toggle('is-lit', cursor >= pointPositions[i]));
  };
  function schedule() {
    if (!enhanced || disposed || document.hidden || motion.matches || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!enhanced || disposed || document.hidden || motion.matches) return;
      if (dirty) measure();
      update();
    });
  }
  const invalidate = () => { dirty = true; schedule(); };
  const stop = () => {
    enhanced = false;
    cancelAnimationFrame(frame);
    frame = 0;
    detachScroll();
    rowObserver?.disconnect();
    sectionObserver?.disconnect();
    layoutObserver?.disconnect();
    window.removeEventListener('resize', invalidate);
    window.removeEventListener('load', invalidate);
    document.fonts?.removeEventListener?.('loadingdone', invalidate);
    section.classList.remove('journey-enhanced');
    section.removeAttribute('data-process-paused');
    rows.forEach(row => row.classList.remove('is-active'));
    points.forEach(point => point.classList.remove('is-lit'));
    fill.style.removeProperty('transform');
    track.style.removeProperty('--journey-rail-top');
    track.style.removeProperty('--journey-rail-height');
  };
  const start = () => {
    if (disposed || enhanced || motion.matches || document.hidden || !window.IntersectionObserver || !window.requestAnimationFrame) return;
    try {
      rowObserver = new IntersectionObserver(entries => {
        if (!enhanced) return;
        entries.forEach(entry => {
          const active = entry.isIntersecting && entry.intersectionRatio > 0;
          const row = stageRows.get(entry.target);
          if (row) {
            row.classList.toggle('is-active', active);
            if (active) row.classList.add('journey-entered');
          } else if (active) {
            entry.target.classList.add('journey-entered');
            rowObserver.unobserve(entry.target);
          }
        });
      }, { threshold: [0, .05] });
      sectionObserver = new IntersectionObserver(entries => {
        if (!enhanced) return;
        timelineVisible = entries.some(entry => entry.isIntersecting);
        if (timelineVisible) {
          stages.forEach(stage => rowObserver.observe(stage));
          rows.forEach(row => { if (!row.classList.contains('journey-entered')) rowObserver.observe(row); });
        } else {
          rowObserver.disconnect();
          rows.forEach(row => row.classList.remove('is-active'));
        }
        syncScroll();
        invalidate();
      });
      if (window.ResizeObserver) {
        layoutObserver = new ResizeObserver(invalidate);
        layoutObserver.observe(track);
        if (document.body) layoutObserver.observe(document.body);
      }
      dirty = true;
      measure();
      update();
      enhanced = true;
      section.classList.add('journey-enhanced');
      sectionObserver.observe(track);
      window.addEventListener('resize', invalidate, { passive: true });
      window.addEventListener('load', invalidate, { once: true });
      document.fonts?.addEventListener?.('loadingdone', invalidate);
      document.fonts?.ready?.then(() => { if (!disposed) invalidate(); }).catch(() => {});
    } catch {
      // Leave every step and final illustration readable when an API is unavailable.
      stop();
    }
  };
  const onMotion = () => { if (motion.matches) stop(); else start(); };
  const onVisibility = () => {
    if (document.hidden) {
      section.setAttribute('data-process-paused', '');
      detachScroll();
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      section.removeAttribute('data-process-paused');
      start();
      syncScroll();
      invalidate();
    }
  };
  const onPageHide = event => {
    stop();
    if (event.persisted) return;
    disposed = true;
    motion.removeEventListener?.('change', onMotion);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
  const onPageShow = () => { if (!disposed) { start(); invalidate(); } };
  motion.addEventListener?.('change', onMotion);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  start();
  return { refresh: invalidate };
}
document.querySelectorAll('[data-process]').forEach(mountProcess);
