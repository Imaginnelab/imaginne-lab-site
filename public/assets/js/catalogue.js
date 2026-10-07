import { mountProductSearch, productSearchCopy, productSearchFilter, searchTerm } from '/assets/js/product-search.js';

const root = document.querySelector('[data-catalogue]');
const COPY = {
  en: { loading: 'Loading products…', empty: 'New pieces are on their way. Check back soon.', maintenance: 'Our catalogue is taking a short break. Please check back soon.', error: 'We could not load the products. Please try again.', retry: 'Try again', count: 'Products loaded' },
  pt: { loading: 'Carregando produtos…', empty: 'Novas peças estão a caminho. Volte em breve.', maintenance: 'Nosso catálogo está em uma breve pausa. Volte em breve.', error: 'Não foi possível carregar os produtos. Tente de novo.', retry: 'Tentar de novo', count: 'Produtos carregados' },
  es: { loading: 'Cargando productos…', empty: 'Nuevas piezas están en camino. Vuelve pronto.', maintenance: 'Nuestro catálogo está tomando una breve pausa. Vuelve pronto.', error: 'No pudimos cargar los productos. Inténtalo de nuevo.', retry: 'Intentar de nuevo', count: 'Productos cargados' },
};

export function mountCatalogue(root, api) {
  const copy = COPY[api.productLanguage] || COPY.en;
  const searchCopy = productSearchCopy(api.productLanguage);
  const grid = root.querySelector('[data-catalogue-grid]');
  const sentinel = root.querySelector('[data-catalogue-sentinel]');
  const loading = root.querySelector('[data-catalogue-loading]');
  const message = root.querySelector('[data-catalogue-message]');
  const retry = root.querySelector('[data-catalogue-retry]');
  const status = root.querySelector('[data-catalogue-status]');
  let offset = 0;
  let busy = false;
  let done = false;
  let initialized = false;
  let featured = null;
  let generation = 0;
  let term = '';
  let failed = false;
  let inFlight;
  let sentinelFrame = 0;
  const ids = new Set();
  const add = (product, highlighted = false) => {
    if (ids.has(product?.id)) return;
    const card = api.createProductCard(product, { featured: highlighted, priority: grid.children.length === 0 ? 'high' : 'auto' });
    if (card) { ids.add(product.id); grid.append(card); }
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadNext();
  }, { rootMargin: '160px 0px' }) : null;
  const loadNext = (fromRetry = false) => {
    if (busy) return inFlight;
    if (done || (failed && !fromRetry)) return Promise.resolve(false);
    const current = generation;
    const queryTerm = term;
    const firstPage = !initialized;
    busy = true;
    failed = false;
    observer?.unobserve(sentinel);
    root.setAttribute('aria-busy', 'true');
    loading.hidden = false;
    loading.textContent = copy.loading;
    retry.hidden = !fromRetry;
    if (fromRetry) {
      retry.setAttribute('aria-busy', 'true');
      retry.disabled = true;
    }
    message.textContent = '';
    inFlight = (async () => {
      try {
        const selectedFeatured = firstPage ? (queryTerm ? null : await api.featuredProduct()) : featured;
        if (current !== generation) return false;
        const size = firstPage && selectedFeatured ? 11 : 12;
        const options = { limit: String(size), offset: String(offset) };
        if (selectedFeatured) options.id = 'neq.' + selectedFeatured.id;
        const filter = productSearchFilter(queryTerm);
        // The shared REST helper encodes query parameters through URLSearchParams.
        if (filter) options.or = filter;
        const rows = await api.requestProducts(options);
        if (current !== generation) return false;
        featured = selectedFeatured;
        if (firstPage && featured) add(featured, true);
        rows.forEach(product => add(product));
        initialized = true;
        offset += rows.length;
        done = rows.length < size;
        if (grid.children.length === 0) {
          if (queryTerm) message.textContent = searchCopy.noResults(queryTerm);
          else {
            const maintenance = await api.maintenanceMode();
            if (current !== generation) return false;
            message.textContent = maintenance ? copy.maintenance : copy.empty;
          }
        }
        status.textContent = `${copy.count}: ${grid.children.length}`;
        retry.hidden = true;
        return rows.length > 0 || !!featured;
      } catch {
        if (current !== generation) return false;
        failed = true;
        message.textContent = copy.error;
        retry.textContent = copy.retry;
        retry.hidden = false;
        return false;
      } finally {
        if (current === generation) {
          busy = false;
          retry.removeAttribute('aria-busy');
          retry.disabled = false;
          root.removeAttribute('aria-busy');
          loading.hidden = true;
          sentinel.hidden = done;
          if (!done && !failed) {
            if (observer) observer.observe(sentinel);
            else scheduleSentinel();
          }
        }
      }
    })();
    return inFlight;
  };
  const checkSentinel = () => {
    sentinelFrame = 0;
    if (!busy && !done && retry.hidden && sentinel.getBoundingClientRect().top < window.innerHeight + 160) loadNext();
  };
  const scheduleSentinel = () => {
    if (!sentinelFrame) sentinelFrame = requestAnimationFrame(checkSentinel);
  };
  const search = value => {
    generation++;
    term = searchTerm(value);
    observer?.unobserve(sentinel);
    cancelAnimationFrame(sentinelFrame);
    sentinelFrame = 0;
    offset = 0;
    busy = false;
    done = false;
    failed = false;
    initialized = false;
    featured = null;
    inFlight = null;
    ids.clear();
    grid.replaceChildren();
    status.textContent = '';
    const url = new URL(location.href);
    if (term) url.searchParams.set('q', term);
    else url.searchParams.delete('q');
    try { history.replaceState(history.state, '', url); } catch { /* Search also works without history access. */ }
    return loadNext();
  };
  retry.addEventListener('click', () => loadNext(true));
  if (!observer) window.addEventListener('scroll', scheduleSentinel, { passive: true });
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(sentinelFrame);
    sentinelFrame = 0;
    if (event.persisted) return;
    observer?.disconnect();
    window.removeEventListener('scroll', scheduleSentinel);
  });
  const initialTerm = searchTerm(new URL(location.href).searchParams.get('q'));
  const searchHost = root.querySelector('[data-catalogue-search]');
  if (searchHost) mountProductSearch(searchHost, api.productLanguage, search, initialTerm);
  // A restored term is submitted by the shared component; do not briefly load the full list.
  if (!initialTerm || !searchHost) search(initialTerm);
  return { loadNext, search };
}

async function start() {
  try {
    const api = await import('/assets/js/product-card.js');
    mountCatalogue(root, api);
  } catch {
    const language = document.documentElement.lang.split('-')[0];
    const copy = COPY[language] || COPY.en;
    root.querySelector('[data-catalogue-loading]').hidden = true;
    root.removeAttribute('aria-busy');
    root.querySelector('[data-catalogue-message]').textContent = copy.error;
    const retry = root.querySelector('[data-catalogue-retry]');
    retry.textContent = copy.retry;
    retry.hidden = false;
    retry.addEventListener('click', () => {
      retry.setAttribute('aria-busy', 'true');
      retry.disabled = true;
      try { location.reload(); }
      catch {
        retry.removeAttribute('aria-busy');
        retry.disabled = false;
      }
    });
  }
}
if (root) start();
