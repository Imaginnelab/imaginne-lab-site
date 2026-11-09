import 'server-only';

const pending = new Map<string, Promise<void>>();
// Checkout is currently limited to one local server. Serialize status edits and
// check the revision to keep concurrent admin tabs from overwriting newer edits.
export async function withOrderLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  const previous = pending.get(id) ?? Promise.resolve();
  let unlock!: () => void;
  const released = new Promise<void>((resolve) => { unlock = resolve; });
  const chain = previous.then(() => released);
  pending.set(id, chain);
  await previous;
  try { return await action(); } finally { unlock(); if (pending.get(id) === chain) pending.delete(id); }
}
