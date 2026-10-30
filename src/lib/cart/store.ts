'use client';

import { addLine, CART_KEY, parseCart, setLineQuantity, type CartLine } from './state';

const empty: CartLine[] = [];
let lines: CartLine[] = empty;
let memoryOnly = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function read() {
  if (memoryOnly) return;
  try {
    const next = parseCart(localStorage.getItem(CART_KEY));
    if (JSON.stringify(next) !== JSON.stringify(lines)) { lines = next; notify(); }
  } catch { /* Storage may be blocked; the in-memory cart remains usable. */ }
}
function onStorage(event: StorageEvent) {
  if (event.key === CART_KEY || event.key === null) read();
}
export function subscribeCart(listener: () => void) {
  if (!listeners.size) { window.addEventListener('storage', onStorage); read(); }
  listeners.add(listener);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage); };
}
export const cartSnapshot = () => lines;
export const serverCartSnapshot = () => empty;

function save(next: CartLine[]) {
  lines = next;
  try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { memoryOnly = true; }
  notify();
}
export function addToCart(id: string, quantity: number, colorId: string | null = null): boolean {
  read();
  const next = addLine(lines, id, quantity, colorId);
  if (next === lines) return false;
  save(next);
  return true;
}
export function updateCartQuantity(id: string, quantity: number, colorId: string | null = null) {
  read();
  save(setLineQuantity(lines, id, quantity, colorId));
}
