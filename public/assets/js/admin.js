const languages = {
  pt: { back: 'Voltar ao site', checking: 'Verificando acesso…', denied: 'Acesso restrito a administradores. Entre com uma conta autorizada pelo site.', error: 'Não foi possível verificar seu acesso. Tente atualizar a página.', recheck: 'Não foi possível reconfirmar seu acesso agora. Verifique sua conexão; o painel continua aberto.', welcome: 'Bem-vindo ao painel administrativo.', profile: 'Sua conta', access: 'Permissão de acesso', role: 'Administrador', maintenance: 'Modo manutenção', maintenanceHelp: 'Ligado, só administradores veem o site; o público vê uma tela de manutenção e nenhum produto.', maintenanceOn: 'Ligado', maintenanceOff: 'Desligado', maintenanceChecking: 'Verificando…', maintenanceSaving: 'Salvando…', maintenanceLoadError: 'Não foi possível ler o modo manutenção.', maintenanceSaveError: 'Não foi possível alterar o modo manutenção. Tente de novo.', maintenanceForbidden: 'Sua sessão expirou ou esta conta não tem permissão. Entre novamente pelo site.', maintenanceRetry: 'Tentar de novo', maintenanceConfirmTitle: 'Ligar o modo manutenção?', maintenanceConfirmText: 'O público deixa de ver o site e os produtos até você desligar. Administradores continuam com acesso.', maintenanceConfirmYes: 'Ligar manutenção', maintenanceCancel: 'Cancelar', tabs: 'Seções do painel', tabProducts: 'Produtos', tabCoupons: 'Cupons', tabCount: '{label}, {n} no total' },
  en: { back: 'Back to site', checking: 'Checking access…', denied: 'Administrators only. Sign in with an authorized account on the website.', error: 'Unable to verify your access. Try refreshing the page.', recheck: 'Unable to re-confirm your access right now. Check your connection; the dashboard stays open.', welcome: 'Welcome to your admin dashboard.', profile: 'Your account', access: 'Access permission', role: 'Administrator', maintenance: 'Maintenance mode', maintenanceHelp: 'When on, only administrators see the site; the public sees a maintenance screen and no products.', maintenanceOn: 'On', maintenanceOff: 'Off', maintenanceChecking: 'Checking…', maintenanceSaving: 'Saving…', maintenanceLoadError: 'Unable to read the maintenance mode.', maintenanceSaveError: 'Unable to change the maintenance mode. Please try again.', maintenanceForbidden: 'Your session expired or this account is not allowed. Sign in again on the website.', maintenanceRetry: 'Try again', maintenanceConfirmTitle: 'Turn maintenance mode on?', maintenanceConfirmText: 'The public stops seeing the site and the products until you turn it off. Administrators keep their access.', maintenanceConfirmYes: 'Turn maintenance on', maintenanceCancel: 'Cancel', tabs: 'Dashboard sections', tabProducts: 'Products', tabCoupons: 'Coupons', tabCount: '{label}, {n} in total' },
  es: { back: 'Volver al sitio', checking: 'Verificando acceso…', denied: 'Acceso exclusivo para administradores. Inicia sesión con una cuenta autorizada en el sitio.', error: 'No se pudo verificar tu acceso. Intenta actualizar la página.', recheck: 'No se pudo reconfirmar tu acceso ahora. Revisa tu conexión; el panel sigue abierto.', welcome: 'Bienvenido al panel de administración.', profile: 'Tu cuenta', access: 'Permiso de acceso', role: 'Administrador', maintenance: 'Modo mantenimiento', maintenanceHelp: 'Activado, solo los administradores ven el sitio; el público ve una pantalla de mantenimiento y ningún producto.', maintenanceOn: 'Activado', maintenanceOff: 'Desactivado', maintenanceChecking: 'Verificando…', maintenanceSaving: 'Guardando…', maintenanceLoadError: 'No se pudo leer el modo mantenimiento.', maintenanceSaveError: 'No se pudo cambiar el modo mantenimiento. Inténtalo de nuevo.', maintenanceForbidden: 'Tu sesión caducó o esta cuenta no tiene permiso. Inicia sesión de nuevo en el sitio.', maintenanceRetry: 'Reintentar', maintenanceConfirmTitle: '¿Activar el modo mantenimiento?', maintenanceConfirmText: 'El público dejará de ver el sitio y los productos hasta que lo desactives. Los administradores mantienen su acceso.', maintenanceConfirmYes: 'Activar mantenimiento', maintenanceCancel: 'Cancelar', tabs: 'Secciones del panel', tabProducts: 'Productos', tabCoupons: 'Cupones', tabCount: '{label}, {n} en total' },
};
const requested = new URLSearchParams(location.search).get('lang');
const lang = Object.hasOwn(languages, requested) ? requested : 'en';
const t = languages[lang];
document.documentElement.lang = lang;
document.querySelectorAll('[data-home]').forEach(link => { link.href = lang === 'en' ? '/' : `/${lang}/`; });
document.querySelector('[data-back]').textContent = t.back;
const status = document.querySelector('#admin-status');
const content = document.querySelector('#admin-content');
let version = 0;
let client;
// ID of the user whose access is confirmed and whose dashboard is on screen. While it is set,
// re-checks run in the background: the form in progress stays visible and keeps its state.
let granted = null;
function block() {
  granted = null;
  content.hidden = true;
  status.textContent = t.checking;
}
async function checkAccess() {
  const current = ++version;
  if (granted === null) block();
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (current !== version) return;
    // Once the dashboard is open, a failed session read is treated as a passing network problem.
    if (error && granted !== null) throw error;
    if (error || !session) { denyAccess(); return; }
    if (granted !== null && session.user.id !== granted) block();
    const response = await fetch('/api/admin-dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });
    if (current !== version) return;
    if (response.status === 401 || response.status === 403) { denyAccess(); return; }
    if (!response.ok) throw new Error('access_check_failed');
    const { profile } = await response.json();
    if (current !== version) return;
    const values = {
      'admin-welcome': t.welcome, 'profile-heading': t.profile,
      'access-heading': t.access, 'admin-role': t.role,
      'admin-name': profile.full_name, 'admin-email': profile.email,
    };
    for (const [id, value] of Object.entries(values)) document.getElementById(id).textContent = value;
    status.textContent = '';
    content.hidden = false;
    granted = session.user.id;
    showProducts();
  } catch {
    // A transient failure never closes a dashboard that was already confirmed; it only warns.
    if (current === version) status.textContent = granted === null ? t.error : t.recheck;
  }
}
// Loaded only after access is confirmed. A failure here must not look like an access problem,
// and one section failing to load must not take the other one down.
function showProducts() {
  mountMaintenance();
  mountTabs();
}
// Products and coupons share the page as tabs: only the chosen list is on screen (and only it
// keeps loading as you scroll), and the other one is fetched the first time it is opened.
let tabsMounted = false;
function mountTabs() {
  if (tabsMounted) return;
  tabsMounted = true;
  const sections = {
    products: { label: t.tabProducts, table: 'products', mount: (onChange) => import('/assets/js/admin-products.js').then(({ mountProducts }) => mountProducts({ client, lang, onChange })) },
    coupons: { label: t.tabCoupons, table: 'coupons', mount: (onChange) => import('/assets/js/admin-coupons.js').then(({ mountCoupons }) => mountCoupons({ client, lang, onChange })) },
  };
  const names = Object.keys(sections);
  const tabs = Object.fromEntries(names.map(name => [name, document.getElementById(`tab-${name}`)]));
  const mounted = new Set();
  document.getElementById('admin-tabs').setAttribute('aria-label', t.tabs);
  for (const name of names) {
    const label = tabs[name].querySelector('.admin-tab-label');
    const text = document.createElement('span');
    text.textContent = sections[name].label;
    label.dataset.label = sections[name].label;
    label.replaceChildren(text);
  }
  // Total of a list, shown next to its name. Hidden whenever it cannot be read.
  async function count(name) {
    let total = null;
    try {
      const { count: rows, error } = await client.from(sections[name].table).select('id', { count: 'exact', head: true });
      if (!error && Number.isInteger(rows)) total = rows;
    } catch { /* the tab simply shows no number */ }
    const badge = tabs[name].querySelector('.admin-tab-count');
    badge.hidden = total === null;
    badge.textContent = total === null ? '' : new Intl.NumberFormat(lang).format(total);
    if (total === null) tabs[name].removeAttribute('aria-label');
    else tabs[name].setAttribute('aria-label', t.tabCount.replace('{label}', sections[name].label).replace('{n}', badge.textContent));
  }
  function select(name, { focus = false, remember = true } = {}) {
    for (const other of names) {
      const active = other === name;
      tabs[other].setAttribute('aria-selected', String(active));
      // Roving tabindex: Tab leaves the bar and goes into the panel; the arrows move between tabs.
      tabs[other].tabIndex = active ? 0 : -1;
      document.getElementById(other).hidden = !active;
    }
    if (focus) tabs[name].focus();
    // replaceState: the choice survives a reload without piling up history entries or jumping the page.
    if (remember && location.hash !== `#${name}`) history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
    if (!mounted.has(name)) {
      mounted.add(name);
      // A failed download is tried again the next time the tab is opened.
      sections[name].mount(() => count(name)).catch(() => mounted.delete(name));
    }
  }
  const fromHash = () => names.find(name => location.hash === `#${name}`);
  document.getElementById('admin-tabs').addEventListener('keydown', event => {
    const current = names.indexOf(event.target.closest('[role="tab"]')?.dataset.tab);
    if (current < 0) return;
    const next = { ArrowRight: (current + 1) % names.length, ArrowLeft: (current - 1 + names.length) % names.length, Home: 0, End: names.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(names[next], { focus: true });
  });
  for (const name of names) tabs[name].addEventListener('click', () => select(name));
  window.addEventListener('hashchange', () => { const name = fromHash(); if (name) select(name, { remember: false }); });
  select(fromHash() || names[0], { remember: false });
  for (const name of names) count(name);
}
// Maintenance mode switch. It only asks the database to change one flag; whether this account
// may change it is decided there (RLS), and the public pages read the same flag.
let maintenanceMounted = false;
function mountMaintenance() {
  if (maintenanceMounted) return;
  maintenanceMounted = true;
  const $ = id => document.getElementById(id);
  const card = $('maintenance-card');
  const toggle = $('maintenance-switch');
  const stateText = $('maintenance-state');
  const retry = $('maintenance-retry');
  const error = $('maintenance-error');
  const confirmDialog = $('maintenance-confirm');
  const texts = {
    'maintenance-heading': t.maintenance, 'maintenance-help': t.maintenanceHelp, 'maintenance-retry': t.maintenanceRetry,
    'maintenance-confirm-title': t.maintenanceConfirmTitle, 'maintenance-confirm-text': t.maintenanceConfirmText,
    'maintenance-confirm-yes': t.maintenanceConfirmYes, 'maintenance-confirm-cancel': t.maintenanceCancel,
  };
  for (const [id, text] of Object.entries(texts)) $(id).textContent = text;
  // null while the real value is unknown: the switch stays off limits rather than guessing.
  let on = null;
  let busy = '';
  function show() {
    toggle.setAttribute('aria-checked', String(on === true));
    toggle.disabled = !!busy || on === null;
    // The switch is what was pressed, so it is what spins while the answer is awaited.
    if (busy) toggle.setAttribute('aria-busy', 'true'); else toggle.removeAttribute('aria-busy');
    card.setAttribute('aria-busy', String(!!busy));
    stateText.textContent = busy || (on === null ? '' : on ? t.maintenanceOn : t.maintenanceOff);
    retry.hidden = !!busy || on !== null;
  }
  function remember() {
    // Only a hint for the public pages to decide faster; they always ask the database again.
    try { localStorage.setItem('imaginne-maintenance', on ? 'on' : 'off'); } catch { /* storage unavailable */ }
  }
  async function read() {
    busy = t.maintenanceChecking;
    show();
    let value = null;
    try {
      const { data, error: failure } = await client.from('site_settings').select('maintenance_mode').eq('id', true).maybeSingle();
      if (!failure && typeof data?.maintenance_mode === 'boolean') value = data.maintenance_mode;
    } catch { /* reported below */ }
    busy = '';
    on = value;
    if (value !== null) remember();
    show();
    return value !== null;
  }
  async function write(next) {
    busy = t.maintenanceSaving;
    error.textContent = '';
    show();
    let failed = '';
    let uncertain = false;
    try {
      // Only this column: the grants are per column.
      const { data, error: failure, status } = await client.from('site_settings').update({ maintenance_mode: next }).eq('id', true).select('id');
      if (failure) {
        const code = Number(failure.status ?? status);
        if (code === 401 || code === 403 || failure.code === '42501' || failure.code === 'PGRST301') failed = t.maintenanceForbidden;
        else if (status >= 400 && status < 500) failed = t.maintenanceSaveError;
        else uncertain = true;
      } else if (!Array.isArray(data) || !data.length) failed = t.maintenanceForbidden;
    } catch { uncertain = true; }
    busy = '';
    if (uncertain) {
      // The answer was lost: show what the database really holds instead of assuming.
      const known = await read();
      failed = known && on === next ? '' : known ? t.maintenanceSaveError : t.maintenanceLoadError;
    } else if (!failed) {
      on = next;
      remember();
    }
    show();
    error.textContent = failed;
    if (!toggle.disabled) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    if (busy || on === null) return;
    // Turning it on closes the site to the public, so that direction asks first.
    if (on) write(false); else confirmDialog.showModal();
  });
  $('maintenance-confirm-cancel').addEventListener('click', () => confirmDialog.close());
  $('maintenance-confirm-yes').addEventListener('click', () => { confirmDialog.close(); write(true); });
  retry.addEventListener('click', async () => {
    error.textContent = '';
    if (!(await read())) error.textContent = t.maintenanceLoadError;
  });
  read().then(known => { if (!known) error.textContent = t.maintenanceLoadError; });
}
function denyAccess() {
  granted = null;
  content.hidden = true;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  status.textContent = t.denied;
  location.replace(lang === 'en' ? '/' : `/${lang}/`);
}
status.textContent = t.checking;
try {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  client = createClient(window.IMAGINNE_AUTH.url, window.IMAGINNE_AUTH.publishableKey);
  client.auth.onAuthStateChange((_event, session) => {
    ++version;
    // Same user (token refresh, tab refocus): verify quietly. Anyone else, or nobody: block first.
    if (granted === null || session?.user?.id !== granted) block();
    setTimeout(checkAccess, 0);
  });
  window.addEventListener('focus', checkAccess);
  await checkAccess();
} catch { status.textContent = t.error; }
