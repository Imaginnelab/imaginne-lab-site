// Constant first-party bootstrap; storage values are never interpolated into executable code.
(function () {
  var root = document.documentElement;
  var theme = 'light';
  try { if (localStorage.getItem('imaginne-theme') === 'dark') theme = 'dark'; } catch (_) {}
  root.setAttribute('data-theme', theme);

  var path = location.pathname.replace(/^\/(?:pt|en|es)(?=\/|$)/, '');
  if (path && path !== '/' && !/^\/products(?:\/|$)/.test(path)) return;
  try {
    var navigation = performance.getEntriesByType('navigation')[0];
    var type = navigation && navigation.type;
    var hash = location.hash;
    var scrolled = type === 'reload' || type === 'back_forward' ? sessionStorage.getItem('imaginne-nav-scrolled:' + location.pathname) : null;
    if (scrolled ? scrolled === '1' : hash && hash !== '#' && hash !== '#top' && hash !== '#inicio') root.setAttribute('data-nav', 'scrolled');
  } catch (_) {}
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('imaginne-transition') === 'out') root.classList.add('incoming-transition');
    else if (!localStorage.getItem('imaginne-intro-seen')) root.classList.add('pending-intro');
  } catch (_) {}
})();
