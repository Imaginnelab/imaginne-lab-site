// Maintenance curtain for the public pages. Loaded early, from <head>.
// This is presentation only: it decides what the page shows, it protects nothing. While the
// site is under maintenance the database itself stops returning products to non-administrators.
(function () {
  'use strict';

  var CACHE_KEY = 'imaginne-maintenance';
  var WAIT_MS = 1500;
  var HOMES = { en: '/', pt: '/pt/', es: '/es/' };
  var COPY = {
    pt: {
      eyebrow: 'Em manutenção', title: 'Voltamos já.',
      text: 'Estamos preparando novidades na loja. O site volta ao ar em breve — obrigado pela paciência.',
      login: 'Entrar como administrador', notAdmin: 'Esta conta não tem acesso durante a manutenção.',
      banner: 'Modo manutenção ligado: só administradores veem o site.', bannerLink: 'Abrir painel', bannerLabel: 'Aviso de manutenção',
    },
    en: {
      eyebrow: 'Under maintenance', title: 'Back in a moment.',
      text: 'We are getting something new ready in the shop. The site will be back soon — thank you for your patience.',
      login: 'Sign in as administrator', notAdmin: 'This account has no access during maintenance.',
      banner: 'Maintenance mode is on: only administrators can see the site.', bannerLink: 'Open dashboard', bannerLabel: 'Maintenance notice',
    },
    es: {
      eyebrow: 'En mantenimiento', title: 'Volvemos enseguida.',
      text: 'Estamos preparando novedades en la tienda. El sitio volverá pronto — gracias por la paciencia.',
      login: 'Entrar como administrador', notAdmin: 'Esta cuenta no tiene acceso durante el mantenimiento.',
      banner: 'Modo mantenimiento activado: solo los administradores ven el sitio.', bannerLink: 'Abrir panel', bannerLabel: 'Aviso de mantenimiento',
    },
  };

  // ---- Pure logic (covered by tests/maintenance.test.cjs) --------------------------------

  // Same rule the 404 page uses: the language is the first path segment.
  function langFromPath(path) {
    if (/^\/pt(\/|$)/.test(path)) return 'pt';
    if (/^\/es(\/|$)/.test(path)) return 'es';
    return 'en';
  }

  // What the settings request said: 'on', 'off', or 'failed' for anything unexpected.
  function parseState(ok, body) {
    if (!ok || !Array.isArray(body) || body.length !== 1) return 'failed';
    var value = body[0] && body[0].maintenance_mode;
    return value === true ? 'on' : value === false ? 'off' : 'failed';
  }

  // The stored Supabase session, if there is a usable one: { token } or null.
  // Only used to ask the database whether this visitor is an administrator.
  function readSession(storage, nowSeconds) {
    try {
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        if (!/^sb-.+-auth-token$/.test(key)) continue;
        var value = JSON.parse(storage.getItem(key));
        if (!value || typeof value.access_token !== 'string' || !value.access_token) continue;
        if (typeof value.expires_at === 'number' && value.expires_at <= nowSeconds) continue;
        return { token: value.access_token };
      }
    } catch (error) { /* unreadable storage means no session */ }
    return null;
  }

  // What to show before anything is known. Only a remembered "off" shows the site at once;
  // a first visit or a remembered "on" waits (briefly) for the real answer.
  function initialView(cached) {
    return cached === 'off' ? 'site' : 'pending';
  }

  // state: 'unknown' | 'on' | 'off' | 'failed'.  admin: true | false | 'unknown'.
  // Returns 'site', 'curtain', 'admin' (site plus the notice strip) or 'pending'.
  // A failed or slow settings request opens the site: the curtain must never be what takes
  // the site down. Once maintenance is confirmed, only a confirmed administrator gets in.
  function decide(input) {
    var state = input.state, admin = input.admin, timedOut = input.timedOut === true;
    if (state === 'off' || state === 'failed') return 'site';
    if (state === 'on') {
      if (admin === true) return 'admin';
      if (admin === false || timedOut) return 'curtain';
      return 'pending';
    }
    return timedOut ? 'site' : 'pending';
  }

  var api = { decide: decide, initialView: initialView, langFromPath: langFromPath, parseState: parseState, readSession: readSession, WAIT_MS: WAIT_MS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---- Page behaviour -------------------------------------------------------------------

  var root = document.documentElement;
  var lang = langFromPath(location.pathname);
  var t = COPY[lang];
  var state = 'unknown';
  var admin = 'unknown';
  var timedOut = false;
  var view = '';
  var check = 0;
  var curtain = null;
  var banner = null;
  var notice = null;
  var loginAttempted = false;

  function cache(value) {
    try {
      if (value === 'on' || value === 'off') localStorage.setItem(CACHE_KEY, value);
    } catch (error) { /* storage unavailable */ }
  }
  function cached() {
    try { return localStorage.getItem(CACHE_KEY); } catch (error) { return null; }
  }
  function session() {
    try { return readSession(localStorage, Date.now() / 1000); } catch (error) { return null; }
  }
  function config() {
    var value = window.IMAGINNE_AUTH;
    return value && value.url && value.publishableKey ? value : null;
  }
  function request(path, token, options) {
    var settings = config();
    var headers = { apikey: settings.publishableKey, Accept: 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options && options.body) headers['Content-Type'] = 'application/json';
    return fetch(settings.url.replace(/\/+$/, '') + path, {
      method: options && options.method || 'GET', headers: headers, body: options && options.body, cache: 'no-store', credentials: 'omit',
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildCurtain() {
    curtain = element('div', 'maintenance-curtain');
    curtain.setAttribute('role', 'dialog');
    curtain.setAttribute('aria-modal', 'true');
    curtain.setAttribute('aria-labelledby', 'maintenance-title');
    curtain.tabIndex = -1;
    curtain.lang = root.lang || lang;
    var card = element('div', 'maintenance-card');
    var logo = element('img', 'maintenance-logo');
    logo.src = '/assets/img/logo-icon.svg';
    logo.alt = 'Imaginne Lab';
    logo.width = 72;
    logo.height = 72;
    var title = element('h1', 'maintenance-title', t.title);
    title.id = 'maintenance-title';
    notice = element('p', 'maintenance-notice');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    var login = element('button', 'maintenance-login', t.login);
    login.type = 'button';
    login.addEventListener('click', openLogin);
    card.append(logo, element('p', 'maintenance-eyebrow', t.eyebrow), title, element('p', 'maintenance-text', t.text), notice, login);
    curtain.append(card);
  }

  function buildBanner() {
    banner = element('aside', 'maintenance-banner');
    banner.setAttribute('aria-label', t.bannerLabel);
    var link = element('a', '', t.bannerLink);
    link.href = '/admin/?lang=' + lang;
    banner.append(element('span', '', t.banner), link);
  }

  // The sign-in dialog belongs to auth.js; the curtain only presses its existing button.
  // Pages without it (the 404) send the visitor to the home page, where it exists.
  function openLogin() {
    var trigger = document.querySelector('[data-auth-open]');
    if (!trigger) { location.href = HOMES[lang]; return; }
    loginAttempted = true;
    notice.textContent = '';
    trigger.click();
    var dialog = document.getElementById('auth-dialog');
    if (dialog && !dialog.dataset.maintenance) {
      dialog.dataset.maintenance = 'watched';
      // auth.js returns focus to its own button, which is inert behind the curtain.
      dialog.addEventListener('close', function () { if (view === 'curtain' && curtain) (curtain.querySelector('button') || curtain).focus(); });
    }
  }

  // Everything except the curtain (and dialogs, which manage their own modality) becomes inert.
  function setInert(on) {
    if (!document.body) return;
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child === curtain || child === banner || child.tagName === 'DIALOG') return;
      if (on) {
        if (!child.hasAttribute('data-maintenance-inert')) {
          child.setAttribute('data-maintenance-inert', child.hasAttribute('aria-hidden') ? child.getAttribute('aria-hidden') : '');
        }
        child.inert = true;
        child.setAttribute('aria-hidden', 'true');
      } else if (child.hasAttribute('data-maintenance-inert')) {
        var previous = child.getAttribute('data-maintenance-inert');
        child.inert = false;
        if (previous) child.setAttribute('aria-hidden', previous); else child.removeAttribute('aria-hidden');
        child.removeAttribute('data-maintenance-inert');
      }
    });
  }

  // Someone signed in from the curtain and is still not let in: say why.
  function showNotice() {
    if (notice) notice.textContent = loginAttempted && admin === false && session() ? t.notAdmin : '';
  }
  // The strip wraps on narrow screens; the page keeps exactly that much room at the bottom.
  function fitBanner() {
    if (banner && banner.isConnected) root.style.setProperty('--maintenance-banner', banner.offsetHeight + 'px');
  }

  function render() {
    var next = decide({ state: state, admin: admin, timedOut: timedOut });
    if (next === view) {
      if (view === 'curtain') { setInert(true); showNotice(); }
      return;
    }
    // An administrator let in from the curtain: the page behind it loaded as a visitor (no
    // products), so load it again as them. The time stamp keeps a slow network from looping.
    if (view === 'curtain' && next === 'admin' && document.body) {
      try {
        var last = Number(sessionStorage.getItem(CACHE_KEY + '-reload')) || 0;
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(CACHE_KEY + '-reload', String(Date.now()));
          location.reload();
          return;
        }
      } catch (error) { /* storage unavailable: keep the page as it is */ }
    }
    view = next;
    root.setAttribute('data-maintenance', view);
    if (!document.body) return;
    if (view === 'curtain') {
      if (!curtain) buildCurtain();
      if (banner) banner.remove();
      document.body.append(curtain);
      setInert(true);
      showNotice();
      curtain.focus();
    } else {
      if (curtain) curtain.remove();
      setInert(false);
      if (view === 'admin') {
        if (!banner) buildBanner();
        document.body.append(banner);
        fitBanner();
      } else if (banner) banner.remove();
    }
  }

  function checkAdmin() {
    var current = ++check;
    var active = session();
    if (!active) { admin = false; render(); return; }
    admin = 'unknown';
    render();
    request('/rest/v1/rpc/is_admin', active.token, { method: 'POST', body: '{}' })
      .then(function (response) { return response.ok ? response.json() : false; })
      .then(function (value) { if (current === check) { admin = value === true; render(); } })
      .catch(function () { if (current === check) { admin = false; render(); } });
  }

  function refresh() {
    if (!config()) { state = 'failed'; render(); return; }
    request('/rest/v1/site_settings?select=maintenance_mode&id=eq.true', null)
      .then(function (response) { return response.ok ? response.json().then(function (body) { return parseState(true, body); }) : 'failed'; })
      .catch(function () { return 'failed'; })
      .then(function (next) {
        state = next;
        cache(next);
        if (state === 'on') checkAdmin(); else render();
      });
  }

  view = initialView(cached());
  root.setAttribute('data-maintenance', view);
  setTimeout(function () { timedOut = true; render(); }, WAIT_MS);
  refresh();

  function onReady() {
    // The view may have been decided before <body> existed.
    var decided = view;
    view = '';
    root.setAttribute('data-maintenance', decided);
    render();
    // auth.js flips this class whenever someone signs in or out (or a token is renewed).
    var trigger = document.querySelector('[data-auth-open]');
    if (trigger && window.MutationObserver) {
      new MutationObserver(function () { if (state === 'on') checkAdmin(); }).observe(trigger, { attributes: true, attributeFilter: ['class'] });
    }
  }
  window.addEventListener('resize', fitBanner);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
