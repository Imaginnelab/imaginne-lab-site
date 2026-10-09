'use client';

const elements = new Map<HTMLElement, boolean>();
let observer: IntersectionObserver | null = null;
function refresh() {
  elements.forEach((visible, element) => element.toggleAttribute('data-media-visible', visible && !document.hidden));
}
export function watchMedia(element: HTMLElement) {
  if (!elements.size) {
    if (window.IntersectionObserver) observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (elements.has(target)) elements.set(target, entry.isIntersecting);
      });
      refresh();
    });
    document.addEventListener('visibilitychange', refresh);
  }
  elements.set(element, !observer);
  observer?.observe(element);
  refresh();
  return () => {
    observer?.unobserve(element);
    elements.delete(element);
    element.removeAttribute('data-media-visible');
    if (!elements.size) {
      observer?.disconnect();
      observer = null;
      document.removeEventListener('visibilitychange', refresh);
    }
  };
}
