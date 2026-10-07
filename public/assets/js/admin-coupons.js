// Discount coupons for /admin/. Nothing redeems them yet: there is no checkout. The database
// (RLS and column grants) decides who may read or write; this file only drives the interface.
import { PAGE_SIZE, formatPrice, freshRows, parsePrice, reloadSize } from './product-format.js';
import { createSearchBox, searchFilter } from './search-box.js';

const languages = {
  pt: {
    title: 'Cupons de desconto', subtitle: 'Ainda não há checkout: os cupons ficam cadastrados aqui para quando houver.', add: 'Novo cupom', retry: 'Tentar de novo',
    loading: 'Carregando cupons…', empty: 'Nenhum cupom cadastrado ainda.', loadError: 'Não foi possível carregar os cupons.', loadingMore: 'Carregando mais cupons…', searchOpen: 'Pesquisar cupons', searchField: 'Pesquisar pelo código', searchClear: 'Limpar pesquisa', searching: 'Pesquisando…', noResults: 'Nenhum resultado para "{term}".', moreError: 'Não foi possível carregar mais cupons.',
    forbidden: 'Sua sessão expirou ou esta conta não tem permissão. Entre novamente pelo site.',
    saveError: 'Não foi possível salvar. Tente de novo.', deleteError: 'Não foi possível excluir. Tente de novo.', toggleError: 'Não foi possível alterar o cupom. Tente de novo.',
    uncertain: 'Não foi possível confirmar se o cupom foi salvo. Feche esta janela e confira a lista antes de tentar de novo.',
    duplicate: 'Já existe um cupom com este código. Escolha outro.',
    saved: 'Cupom salvo.', created: 'Cupom cadastrado.', deleted: 'Cupom excluído.', activated: 'Cupom ativado.', deactivated: 'Cupom desativado.',
    newTitle: 'Novo cupom', editTitle: 'Editar cupom', close: 'Fechar', cancel: 'Cancelar', save: 'Salvar', saving: 'Salvando…',
    code: 'Código', codeHint: 'De 3 a 32 caracteres: letras, números, hífen ou sublinhado.', type: 'Tipo de desconto', typePercent: 'Percentual', typeAmount: 'Valor fixo (CAD)',
    valuePercent: 'Desconto (%)', valueAmount: 'Desconto (CAD)', maxUses: 'Limite de usos', maxUsesHint: 'Deixe vazio para não limitar.',
    startsAt: 'Início', expiresAt: 'Fim', optional: 'Opcional.', activeLabel: 'Ativo',
    required: 'Preencha este campo.', codeInvalid: 'Use de 3 a 32 letras, números, hífen ou sublinhado, começando por letra ou número.',
    percentInvalid: 'Use um número inteiro de 1 a 100.', amountInvalid: 'Digite um valor como 10,00.', amountTooHigh: 'O valor é alto demais.',
    maxInvalid: 'Use um número inteiro entre 1 e 1000000.', dateInvalid: 'Data inválida.', endBeforeStart: 'O fim precisa ser depois do início.',
    fixErrors: 'Revise os campos destacados.', percentOff: '{n}% de desconto', amountOff: '{amount} de desconto',
    periodNone: 'Sem prazo', periodFrom: 'A partir de {start}', periodUntil: 'Até {end}', periodBoth: 'De {start} até {end}',
    uses: '{used} usos', usesOf: '{used} de {max} usos', usedSoFar: 'Usos até agora: {used} (somente leitura).',
    active: 'Ativo', inactive: 'Inativo', scheduled: 'Agendado', expired: 'Expirado', exhausted: 'Esgotado',
    edit: 'Editar', activate: 'Ativar', deactivate: 'Desativar', delete: 'Excluir', deleting: 'Excluindo…',
    editLabel: 'Editar o cupom {code}', activateLabel: 'Ativar o cupom {code}', deactivateLabel: 'Desativar o cupom {code}', deleteLabel: 'Excluir o cupom {code}',
    deleteTitle: 'Excluir cupom?', deleteText: 'O cupom "{code}" será removido. Esta ação não pode ser desfeita.',
  },
  en: {
    title: 'Discount coupons', subtitle: 'There is no checkout yet: coupons stay registered here for when there is one.', add: 'New coupon', retry: 'Try again',
    loading: 'Loading coupons…', empty: 'No coupons yet.', loadError: 'Unable to load the coupons.', loadingMore: 'Loading more coupons…', searchOpen: 'Search coupons', searchField: 'Search by code', searchClear: 'Clear search', searching: 'Searching…', noResults: 'No results for "{term}".', moreError: 'Unable to load more coupons.',
    forbidden: 'Your session expired or this account is not allowed. Sign in again on the website.',
    saveError: 'Unable to save. Please try again.', deleteError: 'Unable to delete. Please try again.', toggleError: 'Unable to change the coupon. Please try again.',
    uncertain: 'Unable to confirm whether the coupon was saved. Close this window and check the list before trying again.',
    duplicate: 'There is already a coupon with this code. Choose another one.',
    saved: 'Coupon saved.', created: 'Coupon added.', deleted: 'Coupon deleted.', activated: 'Coupon activated.', deactivated: 'Coupon deactivated.',
    newTitle: 'New coupon', editTitle: 'Edit coupon', close: 'Close', cancel: 'Cancel', save: 'Save', saving: 'Saving…',
    code: 'Code', codeHint: '3 to 32 characters: letters, numbers, hyphen or underscore.', type: 'Discount type', typePercent: 'Percentage', typeAmount: 'Fixed amount (CAD)',
    valuePercent: 'Discount (%)', valueAmount: 'Discount (CAD)', maxUses: 'Usage limit', maxUsesHint: 'Leave empty for no limit.',
    startsAt: 'Starts', expiresAt: 'Ends', optional: 'Optional.', activeLabel: 'Active',
    required: 'Fill in this field.', codeInvalid: 'Use 3 to 32 letters, numbers, hyphens or underscores, starting with a letter or number.',
    percentInvalid: 'Use a whole number from 1 to 100.', amountInvalid: 'Enter an amount such as 10.00.', amountTooHigh: 'The amount is too high.',
    maxInvalid: 'Use a whole number between 1 and 1000000.', dateInvalid: 'Invalid date.', endBeforeStart: 'The end must be after the start.',
    fixErrors: 'Check the highlighted fields.', percentOff: '{n}% off', amountOff: '{amount} off',
    periodNone: 'No time limit', periodFrom: 'From {start}', periodUntil: 'Until {end}', periodBoth: 'From {start} to {end}',
    uses: '{used} uses', usesOf: '{used} of {max} uses', usedSoFar: 'Uses so far: {used} (read only).',
    active: 'Active', inactive: 'Inactive', scheduled: 'Scheduled', expired: 'Expired', exhausted: 'Used up',
    edit: 'Edit', activate: 'Activate', deactivate: 'Deactivate', delete: 'Delete', deleting: 'Deleting…',
    editLabel: 'Edit coupon {code}', activateLabel: 'Activate coupon {code}', deactivateLabel: 'Deactivate coupon {code}', deleteLabel: 'Delete coupon {code}',
    deleteTitle: 'Delete coupon?', deleteText: 'The coupon "{code}" will be removed. This cannot be undone.',
  },
  es: {
    title: 'Cupones de descuento', subtitle: 'Todavía no hay checkout: los cupones quedan registrados aquí para cuando lo haya.', add: 'Nuevo cupón', retry: 'Reintentar',
    loading: 'Cargando cupones…', empty: 'Aún no hay cupones.', loadError: 'No se pudieron cargar los cupones.', loadingMore: 'Cargando más cupones…', searchOpen: 'Buscar cupones', searchField: 'Buscar por código', searchClear: 'Borrar búsqueda', searching: 'Buscando…', noResults: 'Ningún resultado para "{term}".', moreError: 'No se pudieron cargar más cupones.',
    forbidden: 'Tu sesión caducó o esta cuenta no tiene permiso. Inicia sesión de nuevo en el sitio.',
    saveError: 'No se pudo guardar. Inténtalo de nuevo.', deleteError: 'No se pudo eliminar. Inténtalo de nuevo.', toggleError: 'No se pudo cambiar el cupón. Inténtalo de nuevo.',
    uncertain: 'No se pudo confirmar si el cupón se guardó. Cierra esta ventana y revisa la lista antes de intentarlo de nuevo.',
    duplicate: 'Ya existe un cupón con este código. Elige otro.',
    saved: 'Cupón guardado.', created: 'Cupón añadido.', deleted: 'Cupón eliminado.', activated: 'Cupón activado.', deactivated: 'Cupón desactivado.',
    newTitle: 'Nuevo cupón', editTitle: 'Editar cupón', close: 'Cerrar', cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando…',
    code: 'Código', codeHint: 'De 3 a 32 caracteres: letras, números, guion o guion bajo.', type: 'Tipo de descuento', typePercent: 'Porcentaje', typeAmount: 'Importe fijo (CAD)',
    valuePercent: 'Descuento (%)', valueAmount: 'Descuento (CAD)', maxUses: 'Límite de usos', maxUsesHint: 'Déjalo vacío para no limitar.',
    startsAt: 'Inicio', expiresAt: 'Fin', optional: 'Opcional.', activeLabel: 'Activo',
    required: 'Completa este campo.', codeInvalid: 'Usa de 3 a 32 letras, números, guiones o guiones bajos, empezando por letra o número.',
    percentInvalid: 'Usa un número entero de 1 a 100.', amountInvalid: 'Escribe un importe como 10,00.', amountTooHigh: 'El importe es demasiado alto.',
    maxInvalid: 'Usa un número entero entre 1 y 1000000.', dateInvalid: 'Fecha no válida.', endBeforeStart: 'El fin debe ser posterior al inicio.',
    fixErrors: 'Revisa los campos marcados.', percentOff: '{n}% de descuento', amountOff: '{amount} de descuento',
    periodNone: 'Sin plazo', periodFrom: 'Desde {start}', periodUntil: 'Hasta {end}', periodBoth: 'Del {start} al {end}',
    uses: '{used} usos', usesOf: '{used} de {max} usos', usedSoFar: 'Usos hasta ahora: {used} (solo lectura).',
    active: 'Activo', inactive: 'Inactivo', scheduled: 'Programado', expired: 'Caducado', exhausted: 'Agotado',
    edit: 'Editar', activate: 'Activar', deactivate: 'Desactivar', delete: 'Eliminar', deleting: 'Eliminando…',
    editLabel: 'Editar el cupón {code}', activateLabel: 'Activar el cupón {code}', deactivateLabel: 'Desactivar el cupón {code}', deleteLabel: 'Eliminar el cupón {code}',
    deleteTitle: '¿Eliminar cupón?', deleteText: 'El cupón "{code}" se eliminará. Esta acción no se puede deshacer.',
  },
};

const LOCALES = { pt: 'pt-BR', en: 'en-CA', es: 'es-ES' };
const COLUMNS = 'id,code,discount_type,percent_off,amount_off_cad_cents,starts_at,expires_at,max_uses,used_count,is_active';
const MAX_AMOUNT_CENTS = 100000000;
const MAX_USES = 1000000;
const SCOPE = ['#coupons', '#coupon-dialog', '#coupon-delete'];

// ---- Pure helpers (no DOM; covered by tests/admin-coupons.test.mjs) -----------------------

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

// Codes are stored in capitals, so "verao10" and "VERAO10" are the same coupon.
export function normalizeCode(text) {
  return String(text ?? '').trim().toUpperCase();
}

// Value of a datetime-local field (the administrator's own time zone) as an ISO instant.
// '' -> null; anything that is not a date -> NaN.
export function localToIso(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text)) return NaN;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? NaN : date.toISOString();
}

// The reverse: a stored instant as the text a datetime-local field expects.
export function isoToLocal(iso) {
  const date = new Date(iso ?? NaN);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Turns what was typed into the row to store. Returns { values, errors }, where errors maps a
// field to a message key. Only columns the administrator may write are ever produced:
// used_count belongs to the future checkout.
export function readCoupon(raw) {
  const errors = {};
  const code = normalizeCode(raw.code);
  if (!code) errors.code = 'required';
  else if (!CODE_PATTERN.test(code)) errors.code = 'codeInvalid';

  const type = raw.type === 'amount' ? 'amount' : 'percent';
  const valueText = String(raw.value ?? '').trim();
  let percent = null;
  let amount = null;
  if (!valueText) errors.value = 'required';
  else if (type === 'percent') {
    const digits = valueText.replace(/\s*%$/, '');
    percent = /^\d{1,3}$/.test(digits) ? Number(digits) : NaN;
    if (!(percent >= 1 && percent <= 100)) errors.value = 'percentInvalid';
  } else {
    amount = parsePrice(valueText);
    if (!Number.isInteger(amount) || amount < 1) errors.value = 'amountInvalid';
    else if (amount > MAX_AMOUNT_CENTS) errors.value = 'amountTooHigh';
  }

  const maxText = String(raw.max ?? '').trim();
  const max = maxText === '' ? null : /^\d{1,7}$/.test(maxText) ? Number(maxText) : NaN;
  if (max !== null && !(max >= 1 && max <= MAX_USES)) errors.max = 'maxInvalid';

  const starts = localToIso(raw.start);
  const expires = localToIso(raw.end);
  if (Number.isNaN(starts)) errors.start = 'dateInvalid';
  if (Number.isNaN(expires)) errors.end = 'dateInvalid';
  if (!errors.start && !errors.end && starts && expires && new Date(expires) <= new Date(starts)) errors.end = 'endBeforeStart';

  return {
    errors,
    values: {
      code,
      discount_type: type,
      percent_off: type === 'percent' ? percent : null,
      amount_off_cad_cents: type === 'amount' ? amount : null,
      starts_at: starts,
      expires_at: expires,
      max_uses: max,
      is_active: raw.active === true,
    },
  };
}

// What a coupon would do right now: inactive, scheduled, expired, exhausted or active.
export function couponStatus(coupon, now = new Date()) {
  if (!coupon?.is_active) return 'inactive';
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return 'expired';
  if (Number.isInteger(coupon.max_uses) && coupon.used_count >= coupon.max_uses) return 'exhausted';
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return 'scheduled';
  return 'active';
}

// ---- Interface ------------------------------------------------------------------------------

let mounted = false;

// onChange: called after a row is created or deleted, so the page can update its totals.
export function mountCoupons({ client, lang, onChange }) {
  if (mounted) return;
  mounted = true;
  const t = languages[lang] || languages.en;
  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const $ = (id) => document.getElementById(id);
  const scoped = (selector) => document.querySelectorAll(SCOPE.map((root) => `${root} ${selector}`).join(','));
  const dateFormat = new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.en, { dateStyle: 'medium', timeStyle: 'short' });

  const notice = $('coupons-notice');
  const state = $('coupons-state');
  const stateText = $('coupons-state-text');
  const retry = $('coupons-retry');
  const list = $('coupons-list');
  const more = $('coupons-more');
  const moreText = $('coupons-more-text');
  const moreRetry = $('coupons-more-retry');
  const rowTemplate = $('coupon-row');
  const dialog = $('coupon-dialog');
  const form = $('coupon-form');
  const formError = $('coupon-form-error');
  const saveButton = $('coupon-save');
  const deleteDialog = $('coupon-delete');
  const deleteError = $('coupon-delete-error');
  const deleteConfirm = $('coupon-delete-confirm');
  const inputs = { code: $('coupon-code'), value: $('coupon-value'), max: $('coupon-max'), start: $('coupon-start'), end: $('coupon-end') };

  let coupons = [];
  // Infinite list: rows are read a page at a time, by position in a stable order.
  let offset = 0;
  let hasMore = false;
  let loadingMore = false;
  let observer = null;
  // Text being searched for; '' shows the whole list.
  let term = '';
  let editing = null;
  let deleting = null;
  let busy = false;
  let loadVersion = 0;

  scoped('[data-i18n]').forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  scoped('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t[el.dataset.i18nLabel]); });

  const isAuthError = (error, status) => {
    const code = Number(error?.status ?? error?.statusCode ?? status);
    return code === 401 || code === 403 || error?.code === '42501' || error?.code === 'PGRST301';
  };
  // 23505: the unique constraint on the code.
  const failure = (error, status, fallback) => (error?.code === '23505' ? t.duplicate : isAuthError(error, status) ? t.forbidden : fallback);

  // The button that started a wait spins (aria-busy; the spinner itself is in styles.css).
  const spin = (button, on) => { if (on) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy'); };
  function showNotice(text, error = false) {
    notice.classList.toggle('is-error', error);
    notice.textContent = text;
  }
  function showState(text, canRetry = false) {
    stateText.textContent = text;
    retry.hidden = !canRetry;
    state.hidden = !text;
  }
  function setBusy(value, button, label) {
    busy = value;
    for (const el of [dialog, deleteDialog, list]) el.setAttribute('aria-busy', String(value));
    scoped('button').forEach((el) => { el.disabled = value; });
    form.querySelectorAll('input').forEach((el) => { el.disabled = value; });
    if (button) { button.textContent = label; spin(button, value); }
  }

  // One page of coupons, newest first; id breaks ties so pages never overlap.
  async function fetchPage(from, to) {
    // supabase-js adds the outer parentheses of an "or" filter itself.
    const filter = searchFilter(term, ['code']).slice(1, -1);
    try {
      const query = client.from('coupons').select(COLUMNS);
      return await (filter ? query.or(filter) : query)
        .order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to);
    } catch { return { data: null, error: {}, status: 0 }; }
  }

  // mode: 'end' (nothing more), 'more' (invisible sentinel), 'loading' or 'error'.
  function setMore(mode) {
    more.dataset.mode = mode;
    moreText.textContent = mode === 'loading' ? t.loadingMore : mode === 'error' ? t.moreError : '';
    moreRetry.hidden = mode !== 'error';
  }
  // Re-observing makes the observer report again, which matters when a page did not fill the screen.
  function watch() {
    if (!('IntersectionObserver' in window)) { if (hasMore) loadMore(); return; }
    if (!observer) {
      observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) loadMore(); }, { rootMargin: '300px 0px' });
    }
    observer.unobserve(more);
    if (hasMore) observer.observe(more);
  }

  // (Re)loads from the start, keeping as many rows as were on screen so the person stays in place.
  // fresh: a new search starts again from a single page. An answer that arrives after a newer
  // request was made is dropped, so a slow search never overwrites the latest one.
  async function load({ fresh = false } = {}) {
    const current = ++loadVersion;
    const size = fresh ? PAGE_SIZE : reloadSize(coupons.length);
    list.setAttribute('aria-busy', 'true');
    if (!coupons.length) showState(t.loading);
    const { data, error, status } = await fetchPage(0, size - 1);
    if (current !== loadVersion) return;
    list.setAttribute('aria-busy', 'false');
    loadingMore = false;
    if (error) {
      coupons = [];
      hasMore = false;
      render();
      setMore('end');
      watch();
      showState(isAuthError(error, status) ? t.forbidden : t.loadError, true);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    coupons = freshRows([], rows);
    offset = rows.length;
    hasMore = rows.length === size;
    render();
    showState(coupons.length ? '' : term ? fill(t.noResults, { term }) : t.empty);
    setMore(hasMore ? 'more' : 'end');
    watch();
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const current = loadVersion;
    loadingMore = true;
    setMore('loading');
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    // The list was reloaded meanwhile: this page belongs to an older view of it.
    if (current !== loadVersion) return;
    loadingMore = false;
    if (error) { setMore('error'); return; }
    const rows = Array.isArray(data) ? data : [];
    const fresh = freshRows(coupons, rows);
    coupons = coupons.concat(fresh);
    offset += rows.length;
    hasMore = rows.length === PAGE_SIZE;
    list.append(...fresh.map(rowFor));
    setMore(hasMore ? 'more' : 'end');
    watch();
  }

  function render() {
    list.replaceChildren(...coupons.map(rowFor));
  }

  const discountText = (coupon) => (coupon.discount_type === 'amount'
    ? fill(t.amountOff, { amount: formatPrice(coupon.amount_off_cad_cents, lang) })
    : fill(t.percentOff, { n: coupon.percent_off }));
  function periodText(coupon) {
    const show = (iso) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date); };
    const start = coupon.starts_at ? show(coupon.starts_at) : '';
    const end = coupon.expires_at ? show(coupon.expires_at) : '';
    if (start && end) return fill(t.periodBoth, { start, end });
    if (start) return fill(t.periodFrom, { start });
    if (end) return fill(t.periodUntil, { end });
    return t.periodNone;
  }

  function rowFor(coupon) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const status = couponStatus(coupon);
    const code = String(coupon.code ?? '');
    row.classList.toggle('is-inactive', status !== 'active' && status !== 'scheduled');
    row.querySelector('.coupon-code').textContent = code;
    row.querySelector('.coupon-discount').textContent = discountText(coupon);
    row.querySelector('.coupon-period').textContent = periodText(coupon);
    row.querySelector('.coupon-uses').textContent = Number.isInteger(coupon.max_uses)
      ? fill(t.usesOf, { used: coupon.used_count, max: coupon.max_uses })
      : fill(t.uses, { used: coupon.used_count });
    row.querySelector('.product-badge').textContent = t[status];
    const actions = {
      edit: [t.edit, t.editLabel, () => openForm(coupon)],
      toggle: coupon.is_active ? [t.deactivate, t.deactivateLabel, (event) => toggle(coupon, event.currentTarget)] : [t.activate, t.activateLabel, (event) => toggle(coupon, event.currentTarget)],
      delete: [t.delete, t.deleteLabel, () => openDelete(coupon)],
    };
    for (const [action, [text, label, handler]] of Object.entries(actions)) {
      const button = row.querySelector(`[data-action="${action}"]`);
      button.textContent = text;
      button.setAttribute('aria-label', fill(label, { code }));
      button.addEventListener('click', handler);
    }
    return row;
  }

  // ---- Form -------------------------------------------------------------------------------
  const typeField = () => form.elements.namedItem('discount_type');
  function setError(input, text) {
    $(`${input.id}-error`).textContent = text;
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function syncType() {
    $('coupon-value-label').textContent = typeField().value === 'amount' ? t.valueAmount : t.valuePercent;
    inputs.value.inputMode = typeField().value === 'amount' ? 'decimal' : 'numeric';
  }

  function openForm(coupon = null) {
    if (busy) return;
    editing = coupon;
    form.reset();
    formError.textContent = '';
    Object.values(inputs).forEach((input) => setError(input, ''));
    $('coupon-form-title').textContent = coupon ? t.editTitle : t.newTitle;
    $('coupon-used').textContent = coupon ? fill(t.usedSoFar, { used: coupon.used_count }) : '';
    if (coupon) {
      inputs.code.value = coupon.code ?? '';
      typeField().value = coupon.discount_type === 'amount' ? 'amount' : 'percent';
      inputs.value.value = coupon.discount_type === 'amount' ? (coupon.amount_off_cad_cents / 100).toFixed(2) : String(coupon.percent_off ?? '');
      inputs.max.value = coupon.max_uses ?? '';
      inputs.start.value = isoToLocal(coupon.starts_at);
      inputs.end.value = isoToLocal(coupon.expires_at);
      $('coupon-active').checked = coupon.is_active;
    }
    syncType();
    dialog.showModal();
    inputs.code.focus();
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const { values, errors } = readCoupon({
      code: inputs.code.value, type: typeField().value, value: inputs.value.value, max: inputs.max.value,
      // An unparseable date leaves the field empty but flags it as bad input.
      start: inputs.start.validity.badInput ? 'x' : inputs.start.value, end: inputs.end.validity.badInput ? 'x' : inputs.end.value,
      active: $('coupon-active').checked,
    });
    let firstInvalid = null;
    for (const [name, input] of Object.entries(inputs)) {
      setError(input, errors[name] ? t[errors[name]] : '');
      if (errors[name] && !firstInvalid) firstInvalid = input;
    }
    if (firstInvalid) {
      formError.textContent = t.fixErrors;
      firstInvalid.focus();
      return;
    }
    formError.textContent = '';
    inputs.code.value = values.code;
    const target = editing;
    setBusy(true, saveButton, t.saving);
    let failed = '';
    let uncertain = false;
    try {
      const { data, error, status } = await (target
        ? client.from('coupons').update(values).eq('id', target.id).select('id')
        : client.from('coupons').insert(values).select('id'));
      if (error) {
        failed = failure(error, status, t.saveError);
        // Without a 4xx answer the coupon may have been written and the answer lost.
        uncertain = error.code !== '23505' && !(status >= 400 && status < 500);
      } else if (!Array.isArray(data) || !data.length) failed = t.forbidden;
    } catch { uncertain = true; }
    if (uncertain) failed = t.uncertain;
    setBusy(false, saveButton, t.save);
    if (failed) {
      formError.textContent = failed;
      if (failed === t.duplicate) { setError(inputs.code, t.duplicate); inputs.code.focus(); } else saveButton.focus();
      if (uncertain) load();
      return;
    }
    dialog.close();
    showNotice(target ? t.saved : t.created);
    if (!target) onChange?.();
    await load();
  }

  // ---- Row actions --------------------------------------------------------------------------
  async function toggle(coupon, button) {
    if (busy) return;
    const activate = !coupon.is_active;
    setBusy(true, button, button.textContent);
    let failed = '';
    try {
      const { data, error, status } = await client.from('coupons').update({ is_active: activate }).eq('id', coupon.id).select('id');
      if (error) failed = isAuthError(error, status) ? t.forbidden : t.toggleError;
      else if (!Array.isArray(data) || !data.length) failed = t.forbidden;
    } catch { failed = t.toggleError; }
    setBusy(false, button, button.textContent);
    showNotice(failed || (activate ? t.activated : t.deactivated), !!failed);
    if (!failed) await load();
  }

  function openDelete(coupon) {
    if (busy) return;
    deleting = coupon;
    deleteError.textContent = '';
    $('coupon-delete-text').textContent = fill(t.deleteText, { code: String(coupon.code ?? '') });
    deleteDialog.showModal();
  }

  async function confirmDelete() {
    if (busy || !deleting) return;
    const target = deleting;
    setBusy(true, deleteConfirm, t.deleting);
    let failed = '';
    try {
      const { data, error, status } = await client.from('coupons').delete().eq('id', target.id).select('id');
      if (error) failed = isAuthError(error, status) ? t.forbidden : t.deleteError;
      else if (!Array.isArray(data) || !data.length) failed = t.forbidden;
    } catch { failed = t.deleteError; }
    setBusy(false, deleteConfirm, t.delete);
    if (failed) {
      deleteError.textContent = failed;
      deleteConfirm.focus();
      return;
    }
    deleteDialog.close();
    showNotice(t.deleted);
    onChange?.();
    await load();
  }

  // ---- Wiring -------------------------------------------------------------------------------
  const search = createSearchBox({
    labels: { open: t.searchOpen, field: t.searchField, clear: t.searchClear, searching: t.searching },
    onSearch: (text) => { term = text; return load({ fresh: true }); },
  });
  $('coupons-tools').prepend(search.element);
  $('coupon-new').addEventListener('click', () => openForm());
  retry.addEventListener('click', () => load());
  moreRetry.addEventListener('click', () => { if (!busy) loadMore(); });
  form.addEventListener('submit', save);
  form.addEventListener('input', (event) => {
    const input = event.target;
    if (input === inputs.code) {
      // Capitals as you type, keeping the caret where it was.
      const at = input.selectionStart;
      input.value = input.value.toUpperCase();
      input.setSelectionRange(at, at);
    }
    if (input.hasAttribute('aria-invalid')) setError(input, '');
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'discount_type') { syncType(); setError(inputs.value, ''); }
  });
  deleteConfirm.addEventListener('click', confirmDelete);
  for (const el of [dialog, deleteDialog]) {
    el.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => el.close()));
    el.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  }
  // The close event arrives a moment after close(); by then the form may already be open again.
  dialog.addEventListener('close', () => { if (!dialog.open) editing = null; });
  deleteDialog.addEventListener('close', () => { if (!deleteDialog.open) deleting = null; });

  load();
}
