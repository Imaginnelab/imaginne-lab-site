import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sessionIdSchema } from '@/lib/checkout/schema';

const key = (secret: string) => createHash('sha256').update('imaginne-order-pagination-v1:' + secret).digest();

// Scanning Stripe may pass another customer's Session ID. Encrypt the cursor and
// bind it to the verified caller so no such IDs are disclosed or accepted as authority.
export function encodeOrderCursor(id: string, scope: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ id, scope }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function decodeOrderCursor(input: unknown, scope: string, secret: string): string | null {
  if (typeof input !== 'string' || !/^[A-Za-z0-9_-]{40,700}$/.test(input)) return null;
  try {
    const bytes = Buffer.from(input, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    const parsed = sessionIdSchema.safeParse(data.id);
    return data.scope === scope && parsed.success ? parsed.data : null;
  } catch { return null; }
}
