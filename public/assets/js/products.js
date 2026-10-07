import { mountProductSearch, productSearchCopy, productSearchFilter, searchTerm } from '/assets/js/product-search.js';

const section = document.querySelector('[data-products-section]');

function hideCatalogue() {
  section.hidden = true;
  section.removeAttribute('aria-busy');
  document.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href') === '#' + section.id) link.hidden = true;
  });
}

export function enableCarousel(track, previous, next, status, copy, pagination = {}) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let updateFrame = 0;
  let pointer = null;
  let suppressClick = false;
  let navigationIntent = 0;
  let pendingNext = 0;
  previous.classList.add('is-icon');
  next.classList.add('is-icon');
  let maxScroll = 0;
  let cardStep = 1;
  let pageSize = 1;
  const maximum = () => maxScroll;
  const clamp = value => Math.min(maximum(), Math.max(0, value));
  const step = () => cardStep;
  const measure = () => {
    const width = track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const first = track.firstElementChild;
    maxScroll = Math.max(0, track.scrollWidth - width);
    cardStep = Math.max(1, first ? first.getBoundingClientRect().width + gap : width);
    pageSize = Math.max(1, Math.floor((width + gap) / cardStep));
  };
  const update = () => {
    updateFrame = 0;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maximum() - 2 && !pagination.hasMore?.();
    pagination.near?.(maximum() - track.scrollLeft <= step() * pageSize * 1.5);
  };
  const schedule = () => { if (!updateFrame) updateFrame = requestAnimationFrame(update); };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    track.classList.remove('products-interacting');
  };
  const announce = () => {
    const count = pagination.count?.() ?? track.children.length;
    const index = Math.min(count, Math.round(track.scrollLeft / step()) + 1);
    status.textContent = `${copy.position}: ${index} / ${count}`;
    update();
  };
  const animateTo = (target, duration = 500) => {
    stop();
    const start = track.scrollLeft;
    const end = clamp(target);
    if (motion.matches || Math.abs(end - start) < 1) { track.scrollLeft = end; announce(); return; }
    track.classList.add('products-interacting');
    const started = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - started) / duration);
      track.scrollLeft = start + (end - start) * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { stop(); announce(); }
    };
    frame = requestAnimationFrame(tick);
  };
  const move = direction => {
    const intent = ++navigationIntent;
    const size = step();
    const target = (Math.round(track.scrollLeft / size) + direction * pageSize) * size;
    const oldEnd = maximum();
    animateTo(target);
    if (direction > 0 && target >= oldEnd - 2 && pagination.hasMore?.()) {
      pendingNext++;
      next.setAttribute('aria-busy', 'true');
      (async () => {
        try {
          const loaded = await pagination.loadMore?.(true);
          if (loaded && intent === navigationIntent && !pointer && track.scrollLeft >= oldEnd - size) animateTo(target);
        } catch {
          // The page loader owns the translated retry state.
        } finally {
          if (--pendingNext === 0) next.removeAttribute('aria-busy');
        }
      })();
    }
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') animateTo(0);
    else if (event.key === 'End') animateTo(maximum());
    else move(event.key === 'ArrowRight' ? 1 : -1);
  });
  track.addEventListener('pointerdown', event => {
    navigationIntent++;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    if (event.target.closest('button, a, model-viewer, input, textarea, select')) return;
    stop();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, start: track.scrollLeft, last: track.scrollLeft, time: performance.now(), velocity: 0, dragging: false };
  });
  track.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      pointer.dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('products-dragging', 'products-interacting');
    }
    event.preventDefault();
    const now = performance.now();
    track.scrollLeft = clamp(pointer.start - dx);
    const elapsed = Math.max(1, now - pointer.time);
    const velocity = (track.scrollLeft - pointer.last) / elapsed;
    pointer.velocity = velocity * .65 + pointer.velocity * .35;
    pointer.last = track.scrollLeft;
    pointer.time = now;
  });
  const release = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const drag = pointer;
    pointer = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('products-dragging');
    if (!drag.dragging) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const velocity = performance.now() - drag.time > 100 ? 0 : Math.max(-2.5, Math.min(2.5, drag.velocity));
    if (motion.matches || event.type === 'pointercancel') { stop(); announce(); return; }
    const target = Math.round(clamp(track.scrollLeft + velocity * 160) / step()) * step();
    animateTo(target, 480);
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('lostpointercapture', release);
  track.addEventListener('pointerleave', event => { if (pointer && !pointer.dragging) pointer = null; });
  track.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  const interrupt = () => { navigationIntent++; stop(); };
  track.addEventListener('wheel', interrupt, { passive: true });
  track.addEventListener('touchstart', interrupt, { passive: true });
  track.addEventListener('scroll', schedule, { passive: true });
  const resize = () => { measure(); schedule(); };
  const reduce = () => { if (motion.matches) stop(); };
  window.addEventListener('resize', resize, { passive: true });
  motion.addEventListener?.('change', reduce);
  const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  observer?.observe(track);
  if (track.firstElementChild) observer?.observe(track.firstElementChild);
  window.addEventListener('pagehide', event => {
    stop();
    cancelAnimationFrame(updateFrame);
    updateFrame = 0;
    if (event.persisted) return;
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    motion.removeEventListener?.('change', reduce);
  });
  measure();
  update();
  return {
    refresh: resize,
    reset() {
      navigationIntent++;
      stop();
      const captured = pointer;
      pointer = null;
      if (captured && track.hasPointerCapture(captured.id)) track.releasePointerCapture(captured.id);
      track.classList.remove('products-dragging');
      track.scrollLeft = 0;
      resize();
    },
  };
}

export async function mountProductCarousel(section, api) {
  const { featuredProduct, requestProducts, createProductCard, productCopy } = api;
  const copy = productSearchCopy(api.productLanguage);
  const track = section.querySelector('[data-products-track]');
  const status = section.querySelector('[data-products-status]');
  const previous = section.querySelector('[data-products-previous]');
  const nextButton = section.querySelector('[data-products-next]');
  const feedback = document.createElement('div');
  feedback.className = 'products-empty products-search-feedback';
  feedback.hidden = true;
  const feedbackText = document.createElement('p');
  feedbackText.setAttribute('role', 'status');
  const feedbackRetry = document.createElement('button');
  feedbackRetry.type = 'button';
  feedbackRetry.className = 'products-page-retry';
  feedbackRetry.textContent = productCopy.retry;
  feedbackRetry.hidden = true;
  feedback.append(feedbackText, feedbackRetry);
  track.before(feedback);
  const ids = new Set();
  let generation = 0;
  let term = '';
  let featured = null;
  let initialized = false;
  let offset = 0;
  let done = false;
  let busy = false;
  let failed = false;
  let retryOnReturn = false;
  let inFlight;
  let controls;
  const buildCards = rows => {
    const fragment = document.createDocumentFragment();
    const added = new Set();
    for (const product of rows) {
      if (ids.has(product?.id) || added.has(product?.id)) continue;
      const card = createProductCard(product, { featured: product.id === featured?.id });
      if (card) { fragment.append(card); added.add(product.id); }
    }
    return { fragment, added };
  };
  const options = (size, selectedFeatured = featured) => {
    const query = { limit: String(size), offset: String(offset) };
    if (selectedFeatured) query.id = 'neq.' + selectedFeatured.id;
    const filter = productSearchFilter(term);
    // requestProducts uses URLSearchParams: it URL-encodes this value once, including quotes.
    if (filter) query.or = filter;
    return query;
  };

  const indicator = document.createElement('li');
  indicator.className = 'products-card products-page-loader';
  const spinner = document.createElement('span');
  spinner.className = 'products-media-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'products-page-retry';
  retry.textContent = productCopy.retry;
  retry.hidden = true;
  indicator.append(spinner, message, retry);

  const loadMore = (explicit = false, fromRetry = false) => {
    if (done) return Promise.resolve(false);
    if (busy) return inFlight;
    if (failed && !explicit && !retryOnReturn) return Promise.resolve(false);
    const current = generation;
    const queryTerm = term;
    const firstPage = !initialized;
    busy = true;
    failed = false;
    retryOnReturn = false;
    spinner.hidden = false;
    const retryFocused = document.activeElement === retry;
    const feedbackRetryFocused = firstPage && document.activeElement === feedbackRetry;
    retry.hidden = !fromRetry;
    if (fromRetry) {
      retry.setAttribute('aria-busy', 'true');
      retry.disabled = true;
    }
    if (firstPage) {
      feedback.hidden = false;
      feedbackText.textContent = copy.loading;
      feedbackRetry.hidden = !fromRetry;
      feedbackRetry.disabled = fromRetry;
      if (fromRetry) feedbackRetry.setAttribute('aria-busy', 'true');
      previous.disabled = true;
      nextButton.disabled = true;
    } else {
      message.textContent = productCopy.loadingProducts;
      if (!indicator.isConnected) track.append(indicator);
    }
    track.setAttribute('aria-busy', 'true');
    controls?.refresh();
    inFlight = (async () => {
      let loaded = false;
      try {
        const selectedFeatured = firstPage ? (queryTerm ? null : await featuredProduct()) : featured;
        if (current !== generation) return false;
        const size = firstPage && selectedFeatured ? 11 : 12;
        const nextRows = await requestProducts(options(size, selectedFeatured));
        if (current !== generation) return false;
        featured = selectedFeatured;
        const rows = firstPage && featured ? [featured, ...nextRows] : nextRows;
        const next = buildCards(rows);
        const restoreFocus = retryFocused && (document.activeElement === retry || document.activeElement === document.body);
        indicator.remove();
        track.append(next.fragment);
        next.added.forEach(id => ids.add(id));
        offset += nextRows.length;
        done = nextRows.length < size;
        initialized = true;
        loaded = next.added.size > 0;
        status.textContent = `${productCopy.position}: ${ids.size}`;
        track.hidden = ids.size === 0;
        track.removeAttribute('aria-hidden');
        track.tabIndex = ids.size ? 0 : -1;
        feedback.hidden = ids.size > 0;
        feedbackText.textContent = ids.size ? '' : queryTerm ? copy.noResults(queryTerm) : productCopy.empty;
        feedbackRetry.hidden = true;
        if (restoreFocus) track.focus({ preventScroll: true });
        if (feedbackRetryFocused && (document.activeElement === feedbackRetry || document.activeElement === document.body)) {
          if (ids.size) track.focus({ preventScroll: true });
          else section.querySelector('[data-products-search] input')?.focus({ preventScroll: true });
        }
      } catch {
        if (current !== generation) return false;
        failed = true;
        if (firstPage) {
          done = true;
          feedbackText.textContent = copy.error;
          feedbackRetry.hidden = false;
        } else {
          spinner.hidden = true;
          retry.hidden = false;
          message.textContent = productCopy.retryProducts;
        }
      } finally {
        if (current === generation) {
          busy = false;
          retry.removeAttribute('aria-busy');
          retry.disabled = false;
          retry.hidden = !failed;
          feedbackRetry.removeAttribute('aria-busy');
          feedbackRetry.disabled = false;
          track.removeAttribute('aria-busy');
          section.removeAttribute('aria-busy');
          section.classList.remove('products-loading');
          controls?.refresh();
        }
      }
      return loaded;
    })();
    return inFlight;
  };
  retry.addEventListener('click', () => loadMore(true, true));
  const search = value => {
    generation++;
    term = searchTerm(value);
    initialized = false;
    featured = null;
    offset = 0;
    done = false;
    busy = false;
    failed = false;
    retryOnReturn = false;
    inFlight = null;
    ids.clear();
    indicator.remove();
    track.replaceChildren();
    track.hidden = true;
    status.textContent = '';
    // Reset before enabling pagination, so near-end callbacks cannot start a second first page.
    controls?.reset();
    return loadMore(true);
  };
  feedbackRetry.addEventListener('click', () => {
    done = false;
    return loadMore(true, true);
  });
  const searchHost = section.querySelector('[data-products-search]');
  if (searchHost) mountProductSearch(searchHost, api.productLanguage, search);
  controls = enableCarousel(track, previous, nextButton, status, productCopy, {
    hasMore: () => initialized && !done,
    count: () => ids.size,
    loadMore,
    near: near => {
      if (!initialized) return;
      if (!near) { retryOnReturn = true; return; }
      loadMore(false);
    },
  });
  await search('');
  return { loadMore, search, count: () => ids.size, hasMore: () => initialized && !done };
}

async function loadCatalogue() {
  try {
    const api = await import('/assets/js/product-card.js');
    await mountProductCarousel(section, api);
  } catch { hideCatalogue(); }
}
if (section) loadCatalogue();

function scheduleHero() {
  if (!document.querySelector('[data-hero-model]')) return;
  const start = () => import('/assets/js/product-card.js').then(api => api.mountHeroModel()).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 0);
}
if (document.readyState === 'complete') scheduleHero();
else window.addEventListener('load', scheduleHero, { once: true });
