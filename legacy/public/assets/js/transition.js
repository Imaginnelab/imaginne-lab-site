(() => {
  const TRANSITION_KEY = 'imaginne-transition';
  const overlay = document.getElementById('page-transition');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!overlay || reduceMotion) {
    sessionStorage.removeItem(TRANSITION_KEY);
    return;
  }

  const isHandoff = sessionStorage.getItem(TRANSITION_KEY) === 'out';

  if (isHandoff) {
    sessionStorage.removeItem(TRANSITION_KEY);
    overlay.classList.add('is-visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('is-fading');
        document.documentElement.classList.remove('incoming-transition');
      });
    });
    setTimeout(() => overlay.classList.remove('is-visible', 'is-fading'), 500);
  } else if (document.documentElement.classList.contains('pending-intro')) {
    localStorage.setItem('imaginne-intro-seen', '1');
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible', 'is-writing');
    });
    setTimeout(() => {
      overlay.classList.remove('is-writing');
      overlay.classList.add('is-fading');
      document.documentElement.classList.remove('pending-intro');
    }, 1250);
    setTimeout(() => overlay.classList.remove('is-visible', 'is-fading'), 1700);
  }

  document.querySelectorAll('a[data-transition]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      overlay.classList.add('is-visible', 'is-writing');
      sessionStorage.setItem(TRANSITION_KEY, 'out');
      setTimeout(() => { window.location.href = href; }, 1250);
    });
  });
})();
