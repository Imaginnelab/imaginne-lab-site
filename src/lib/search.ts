// Search text helpers shared by the admin lists, the carousel and the catalogue page.

// Turns what a person typed into the text to search for: trimmed, single spaces, at most 60
// characters. Empty when there is nothing worth searching.
export function searchTerm(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// PostgREST `or` filter matching the term in any of the given columns, e.g.
// or=(name_pt.ilike."*vaso*",name_en.ilike."*vaso*"). The term goes inside double quotes with
// quotes and backslashes escaped, so commas, dots and parentheses in it cannot change the filter;
// the LIKE wildcards a person may type are matched literally.
export function searchFilter(term: unknown, columns: unknown): string {
  const clean = searchTerm(term);
  if (!clean || !Array.isArray(columns) || !columns.length) return '';
  const literal = clean.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '');
  if (!literal) return '';
  const quoted = `"*${literal.replace(/[\\"]/g, '\\$&')}*"`;
  return `(${columns.filter((column): column is string => typeof column === 'string' && /^[a-z_]+$/.test(column)).map((column) => `${column}.ilike.${quoted}`).join(',')})`;
}
