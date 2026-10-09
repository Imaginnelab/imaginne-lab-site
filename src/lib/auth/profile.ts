// What the account button and dialog show about the signed-in person. Only these fields ever
// cross to the browser: never the session, the user row or anything else from the server.
export type AccountView = { name: string; email: string; initials: string; isAdmin: boolean };

// Two letters for the avatar: first and last name, or the first two letters of a single name.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const letters = Array.from(parts[0]);
  return (parts.length > 1
    ? letters[0] + Array.from(parts[parts.length - 1])[0]
    : letters.slice(0, 2).join('')).toLocaleUpperCase();
}

export function accountView(user: { email: string | null; fullName: string | null; isAdmin: boolean } | null): AccountView | null {
  if (!user) return null;
  const name = user.fullName?.trim() ?? '';
  return { name, email: user.email ?? '', initials: initials(name), isAdmin: user.isAdmin };
}
