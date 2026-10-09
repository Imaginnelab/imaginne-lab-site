// Search box shared by the admin lists, the home carousel and the catalogue page.
// It starts as a magnifier button; pressing it opens the field (already focused) with a clear
// button at the end, which turns into a spinner while a search is running.

const ICON_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  clear: 'M6 6l12 12M18 6 6 18',
};

function icon(name) {
  const svg = document.createElementNS(ICON_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ICON_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

// Turns what a person typed into the text to search for: trimmed, single spaces, at most 60
// characters. Empty when there is nothing worth searching.
export function searchTerm(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// PostgREST `or` filter matching the term in any of the given columns, e.g.
// or=(name_pt.ilike."*vaso*",name_en.ilike."*vaso*"). The term goes inside double quotes with
// quotes and backslashes escaped, so commas, dots and parentheses in it cannot change the filter;
// the LIKE wildcards a person may type are matched literally.
export function searchFilter(term, columns) {
  const clean = searchTerm(term);
  if (!clean || !Array.isArray(columns) || !columns.length) return '';
  const literal = clean.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '');
  if (!literal) return '';
  const quoted = `"*${literal.replace(/[\\"]/g, '\\$&')}*"`;
  return `(${columns.filter(column => /^[a-z_]+$/.test(column)).map(column => `${column}.ilike.${quoted}`).join(',')})`;
}

// labels: { open, field, clear, searching }. onSearch(term) runs 300 ms after the last key
// (at once when the field is cleared) and may return a promise; the spinner stays until the
// most recent search settles. Returns the element plus reset() to empty and close it.
export function createSearchBox({ labels, onSearch }) {
  const box = document.createElement('div');
  box.className = 'search-box';
  box.setAttribute('role', 'search');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'search-toggle';
  toggle.setAttribute('aria-label', labels.open);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.append(icon('search'));

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = labels.field;
  input.setAttribute('aria-label', labels.field);
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 60;
  input.enterKeyHint = 'search';
  input.tabIndex = -1;

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'search-clear is-icon';
  clear.setAttribute('aria-label', labels.clear);
  clear.hidden = true;
  clear.append(icon('clear'));

  const status = document.createElement('span');
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  box.append(toggle, input, clear, status);

  let timer = 0;
  let run = 0;
  let pending = 0;
  let last = '';

  const setBusy = (busy) => {
    if (busy) clear.setAttribute('aria-busy', 'true');
    else clear.removeAttribute('aria-busy');
    clear.disabled = busy;
    clear.hidden = !busy && !input.value;
    status.textContent = busy ? labels.searching : '';
  };

  const search = () => {
    clearTimeout(timer);
    const term = searchTerm(input.value);
    if (term === last) { setBusy(pending > 0); return; }
    last = term;
    const current = ++run;
    pending++;
    setBusy(true);
    Promise.resolve().then(() => onSearch(term)).catch(() => {}).finally(() => {
      pending--;
      if (current === run) setBusy(false);
    });
  };

  const open = () => {
    if (box.classList.contains('is-open')) return;
    box.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    input.tabIndex = 0;
    input.focus({ preventScroll: true });
  };
  const close = () => {
    box.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    input.tabIndex = -1;
  };

  toggle.addEventListener('click', () => {
    if (!box.classList.contains('is-open')) open();
    else if (input.value) input.focus();
    else close();
  });
  input.addEventListener('input', () => {
    clear.hidden = !input.value && pending === 0;
    clearTimeout(timer);
    // Emptying the field restores the full list right away.
    if (!searchTerm(input.value)) search();
    else timer = setTimeout(search, 300);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); search(); }
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (input.value) { input.value = ''; search(); } else { close(); toggle.focus(); }
    }
  });
  clear.addEventListener('click', () => {
    input.value = '';
    search();
    input.focus();
  });
  // An empty field closes again when the person moves on.
  box.addEventListener('focusout', (event) => {
    if (!box.contains(event.relatedTarget) && !input.value && pending === 0) close();
  });

  return {
    element: box,
    reset() {
      clearTimeout(timer);
      input.value = '';
      last = '';
      run++;
      setBusy(false);
      close();
    },
  };
}
