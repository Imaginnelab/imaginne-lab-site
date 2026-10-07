(() => {
  const root = document.documentElement;

  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('imaginne-theme', next);
  });

  const burger = document.querySelector('.nav-burger');
  const setNavOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    burger?.setAttribute('aria-expanded', String(open));
  };
  burger?.addEventListener('click', () => {
    setNavOpen(!document.body.classList.contains('nav-open'));
  });
  document.querySelectorAll('.mobile-panel a').forEach((link) => {
    link.addEventListener('click', () => setNavOpen(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setNavOpen(false);
      burger?.focus();
    }
  });

  const nav = document.querySelector('.nav');
  if (nav) {
    const syncNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 16);
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });

    // Enable transitions only once the initial scroll position (reload, #hash) has settled.
    const armNav = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      syncNav();
      nav.classList.add('is-ready');
    }));
    if (document.readyState === 'complete') armNav();
    else window.addEventListener('load', armNav, { once: true });
  }

  const langSwitch = document.querySelector('details.lang-switch');
  if (langSwitch) {
    const langToggle = langSwitch.querySelector('summary');
    const closeLang = () => { langSwitch.open = false; };
    const syncLang = () => langToggle.setAttribute('aria-expanded', String(langSwitch.open));
    syncLang();
    langSwitch.addEventListener('toggle', syncLang);
    langSwitch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && langSwitch.open) {
        closeLang();
        langToggle.focus();
      }
    });
    langSwitch.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !langSwitch.contains(e.relatedTarget)) closeLang();
    });
    langSwitch.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeLang));
    document.addEventListener('click', (e) => {
      if (langSwitch.open && !langSwitch.contains(e.target)) closeLang();
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        child.style.setProperty('--i', i);
        child.setAttribute('data-reveal', '');
      });
    });

    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
  } else {
    document.querySelectorAll('[data-reveal-group] > *').forEach((el) => el.classList.add('is-visible'));
  }
})();
