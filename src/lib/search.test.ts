import { test } from 'vitest';
import assert from 'node:assert/strict';
import { searchFilter, searchTerm } from './search';

test('searchTerm trims, collapses spaces and caps the length', () => {
  assert.equal(searchTerm('  vaso   azul \n'), 'vaso azul');
  assert.equal(searchTerm(null), '');
  assert.equal(searchTerm('x'.repeat(200)).length, 60);
});

test('searchFilter matches the term in every column', () => {
  assert.equal(searchFilter('vaso', ['name_pt', 'name_en']), '(name_pt.ilike."*vaso*",name_en.ilike."*vaso*")');
  assert.equal(searchFilter('   ', ['name_pt']), '');
  assert.equal(searchFilter('vaso', []), '');
});

test('searchFilter keeps what is typed from changing the filter', () => {
  // Commas, dots and parentheses stay inside the quoted value.
  assert.equal(searchFilter('a,b).c(', ['name_pt']), '(name_pt.ilike."*a,b).c(*")');
  // Quotes and backslashes are escaped; LIKE wildcards are literal; * cannot widen the match.
  assert.equal(searchFilter('5" x', ['name_pt']), '(name_pt.ilike."*5\\" x*")');
  assert.equal(searchFilter('100%_*', ['name_pt']), '(name_pt.ilike."*100\\\\%\\\\_*")');
  assert.equal(searchFilter('***', ['name_pt']), '');
  // Column names that are not plain identifiers are dropped.
  assert.equal(searchFilter('x', ['name_pt', 'id);drop', 'Name']), '(name_pt.ilike."*x*")');
});
