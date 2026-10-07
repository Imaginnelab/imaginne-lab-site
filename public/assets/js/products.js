const section = document.querySelector('[data-products-section]');

function hideCatalogue() {
  section.hidden = true;
  section.removeAttribute('aria-busy');
  document.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href') === '#' + section.id) link.hidden = true;
  });
}

function showEmptyCatalogue(copy) {
  const message = document.createElement('p');
  message.className = 'products-empty';
  message.setAttribute('role', 'status');
  message.textContent = copy.empty;
  section.querySelector('.products-carousel').replaceChildren(message);
  section.removeAttribute('aria-busy');
  section.classList.remove('products-loading');
}

export function enableCarousel(track, previous, next, status, copy) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let updateFrame = 0;
  let pointer = null;
  let suppressClick = false;
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
    next.disabled = track.scrollLeft >= maximum() - 2;
  };
  const schedule = () => { if (!updateFrame) updateFrame = requestAnimationFrame(update); };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    track.classList.remove('products-interacting');
  };
  const announce = () => {
    const index = Math.min(track.children.length, Math.round(track.scrollLeft / step()) + 1);
    status.textContent = `${copy.position}: ${index} / ${track.children.length}`;
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
    const size = step();
    animateTo((Math.round(track.scrollLeft / size) + direction * pageSize) * size);
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
  track.addEventListener('wheel', stop, { passive: true });
  track.addEventListener('touchstart', stop, { passive: true });
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
}

async function loadCatalogue() {
  try {
    const { featuredProduct, requestProducts, createProductCard, productCopy } = await import('/assets/js/product-card.js');
    const featured = await featuredProduct();
    const options = { limit: featured ? '23' : '24' };
    if (featured) options.id = 'neq.' + featured.id;
    const products = await requestProducts(options);
    if (!featured && products.length === 0) { showEmptyCatalogue(productCopy); return; }
    const cards = document.createDocumentFragment();
    for (const product of [...(featured ? [featured] : []), ...products]) {
      const card = createProductCard(product, { featured: product.id === featured?.id });
      if (card) cards.append(card);
    }
    if (!cards.childNodes.length) { hideCatalogue(); return; }
    const track = section.querySelector('[data-products-track]');
    track.replaceChildren(cards);
    track.removeAttribute('aria-hidden');
    track.tabIndex = 0;
    section.removeAttribute('aria-busy');
    section.classList.remove('products-loading');
    const status = section.querySelector('[data-products-status]');
    status.textContent = `${productCopy.position}: ${track.children.length}`;
    enableCarousel(track, section.querySelector('[data-products-previous]'), section.querySelector('[data-products-next]'), status, productCopy);
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
