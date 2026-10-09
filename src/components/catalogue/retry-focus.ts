'use client';

export async function retryWithFocus(retry: () => Promise<boolean>, button: HTMLButtonElement, fallback: () => HTMLElement | null) {
  const ownedFocus = document.activeElement === button;
  await retry();
  if (!ownedFocus) return;
  requestAnimationFrame(() => {
    if (document.activeElement !== document.body && document.activeElement !== button) return;
    const target = button.isConnected && !button.closest('[hidden]') ? button : fallback();
    if (target?.isConnected) target.focus({ preventScroll: true });
  });
}
