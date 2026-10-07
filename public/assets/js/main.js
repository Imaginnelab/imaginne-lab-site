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
    // The state starts from what the <head> script predicted and already painted (data-nav), so
    // nothing moves when this file runs. Hysteresis: becomes a pill past 24px, goes back under 8px.
    const predicted = root.getAttribute('data-nav') === 'scrolled';
    let scrolled = predicted;
    nav.classList.toggle('is-scrolled', scrolled);
    // Until the browser restores the scroll position (reload, #hash) scrollY still reads 0, so it
    // is not trusted to turn a predicted pill back into the wide header.
    let settled = !predicted || window.scrollY > 0;
    const syncNav = () => {
      const y = window.scrollY;
      const next = scrolled ? y >= 8 || !settled : y > 24;
      if (next === scrolled) return;
      scrolled = next;
      nav.classList.toggle('is-scrolled', next);
    };
    const settleNav = () => {
      settled = true;
      syncNav();
    };
    syncNav();
    window.addEventListener('scroll', settleNav, { passive: true });

    // Saves the visual state itself, so the <head> script predicts with the same rule on reload.
    const saveNav = () => {
      // Scroll events can lag behind (background tabs), so read the position once more first.
      if (settled) syncNav();
      try { sessionStorage.setItem('imaginne-nav-scrolled:' + location.pathname, scrolled ? '1' : '0'); } catch { /* storage unavailable */ }
    };
    window.addEventListener('pagehide', saveNav);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNav(); });

    // Enables transitions, once. The is-scrolled class already mirrors the painted state, so arming
    // never changes how the header looks. Runs on whichever comes first: the page finishing loading,
    // the user's first attempt to scroll (so that scroll animates), or a time cap, since load waits
    // for the 3D model and can be slow.
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
    const INTENT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    const INTENT_OPTIONS = { passive: true, capture: true };
    let armed = false;
    let capTimer;
    const armNav = () => {
      if (armed) return;
      armed = true;
      clearTimeout(capTimer);
      INTENT_EVENTS.forEach((type) => window.removeEventListener(type, onIntent, INTENT_OPTIONS));
      nav.classList.add('is-synced');
      root.removeAttribute('data-nav');
      void nav.offsetWidth;
      nav.classList.add('is-ready');
    };
    const onIntent = (e) => {
      if (e.type !== 'keydown' || SCROLL_KEYS.has(e.key)) armNav();
    };
    // By load the scroll position is final: reconcile with it. Not animated unless already armed.
    const finishNav = () => {
      settleNav();
      armNav();
    };
    const onLoad = () => requestAnimationFrame(() => requestAnimationFrame(finishNav));
    const startTimers = () => {
      capTimer = setTimeout(armNav, 1500);
      // Last resort if load never comes (or the tab is in the background and rAF is paused).
      setTimeout(finishNav, 6000);
    };
    INTENT_EVENTS.forEach((type) => window.addEventListener(type, onIntent, INTENT_OPTIONS));
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startTimers, { once: true });
    else startTimers();

    // If auth.js never resolves (or never loads), do not keep the predicted avatar forever.
    setTimeout(() => root.removeAttribute('data-auth'), 8000);
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
