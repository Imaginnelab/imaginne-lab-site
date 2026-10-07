const root = document.querySelector('[data-catalogue]');
const COPY = {
  en: { loading: 'Loading products…', empty: 'New pieces are on their way. Check back soon.', maintenance: 'Our catalogue is taking a short break. Please check back soon.', error: 'We could not load the products. Please try again.', retry: 'Try again', count: 'Products loaded' },
  pt: { loading: 'Carregando produtos…', empty: 'Novas peças estão a caminho. Volte em breve.', maintenance: 'Nosso catálogo está em uma breve pausa. Volte em breve.', error: 'Não foi possível carregar os produtos. Tente de novo.', retry: 'Tentar de novo', count: 'Produtos carregados' },
  es: { loading: 'Cargando productos…', empty: 'Nuevas piezas están en camino. Vuelve pronto.', maintenance: 'Nuestro catálogo está tomando una breve pausa. Vuelve pronto.', error: 'No pudimos cargar los productos. Inténtalo de nuevo.', retry: 'Intentar de nuevo', count: 'Productos cargados' },
};

export function mountCatalogue(root, api) {
  const copy = COPY[api.productLanguage] || COPY.en;
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
  const ids = new Set();
  const add = (product, highlighted = false) => {
    if (ids.has(product?.id)) return;
    const card = api.createProductCard(product, { featured: highlighted });
    if (card) { ids.add(product.id); grid.append(card); }
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadNext();
  }, { rootMargin: '160px 0px' }) : null;
  const loadNext = async () => {
    if (busy || done) return;
    busy = true;
    observer?.unobserve(sentinel);
    root.setAttribute('aria-busy', 'true');
    loading.hidden = false;
    loading.textContent = copy.loading;
    retry.hidden = true;
    message.textContent = '';
    try {
      if (!initialized) featured = await api.featuredProduct();
      const size = !initialized && featured ? 11 : 12;
      const options = { limit: String(size), offset: String(offset) };
      if (featured) options.id = 'neq.' + featured.id;
      const rows = await api.requestProducts(options);
      if (!initialized && featured) add(featured, true);
      rows.forEach(product => add(product));
      initialized = true;
      offset += rows.length;
      done = rows.length < size;
      if (grid.children.length === 0) message.textContent = await api.maintenanceMode() ? copy.maintenance : copy.empty;
      status.textContent = `${copy.count}: ${grid.children.length}`;
    } catch {
      message.textContent = copy.error;
      retry.textContent = copy.retry;
      retry.hidden = false;
    } finally {
      busy = false;
      root.removeAttribute('aria-busy');
      loading.hidden = true;
      sentinel.hidden = done;
      if (!done && retry.hidden) {
        if (observer) observer.observe(sentinel);
        else requestAnimationFrame(checkSentinel);
      }
    }
  };
  const checkSentinel = () => {
    if (!busy && !done && retry.hidden && sentinel.getBoundingClientRect().top < window.innerHeight + 160) loadNext();
  };
  retry.addEventListener('click', loadNext);
  if (!observer) window.addEventListener('scroll', checkSentinel, { passive: true });
  loadNext();
  return { loadNext };
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
    retry.addEventListener('click', () => location.reload(), { once: true });
  }
}
if (root) start();

