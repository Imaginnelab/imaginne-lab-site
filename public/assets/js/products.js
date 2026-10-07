const section = document.querySelector('[data-products-section]');

const COPY = {
  en: {
    request: 'Price on request', order: 'Order Now', position: 'Products',
    photos: 'Product photos', photo: 'Photo', previousPhoto: 'Previous photo', nextPhoto: 'Next photo',
    photoHelp: 'Use Left and Right arrow keys, Home or End, or tap the photo buttons. Swipe horizontally to browse products.',
    views: 'Product views', view: 'View', previousView: 'Previous view', nextView: 'Next view',
    modelAlt: 'Interactive 3D model of the product',
    modelHelp: 'Drag the 3D model or use its arrow keys to rotate. Use the view buttons to switch between 3D and photos. Swipe on photos to browse products.',
  },
  pt: {
    request: 'Sob consulta', order: 'Fazer Pedido', position: 'Produtos',
    photos: 'Fotos do produto', photo: 'Foto', previousPhoto: 'Foto anterior', nextPhoto: 'Próxima foto',
    photoHelp: 'Use as setas esquerda e direita, Home ou End, ou toque nos botões de foto. Deslize na horizontal para navegar pelos produtos.',
    views: 'Vistas do produto', view: 'Vista', previousView: 'Vista anterior', nextView: 'Próxima vista',
    modelAlt: 'Modelo 3D interativo do produto',
    modelHelp: 'Arraste o modelo 3D ou use suas setas para girar. Use os botões de vista para alternar entre 3D e fotos. Deslize nas fotos para navegar pelos produtos.',
  },
  es: {
    request: 'Precio a consultar', order: 'Hacer Pedido', position: 'Productos',
    photos: 'Fotos del producto', photo: 'Foto', previousPhoto: 'Foto anterior', nextPhoto: 'Foto siguiente',
    photoHelp: 'Usa las flechas izquierda y derecha, Home o End, o toca los botones de foto. Desliza horizontalmente para recorrer los productos.',
    views: 'Vistas del producto', view: 'Vista', previousView: 'Vista anterior', nextView: 'Vista siguiente',
    modelAlt: 'Modelo 3D interactivo del producto',
    modelHelp: 'Arrastra el modelo 3D o usa sus flechas para girar. Usa los botones de vista para alternar entre 3D y fotos. Desliza sobre las fotos para recorrer los productos.',
  },
};
const language = document.documentElement.lang.split('-')[0];
const lang = Object.hasOwn(COPY, language) ? language : 'en';
const copy = COPY[lang];

function hideCatalogue() {
  section.hidden = true;
  section.removeAttribute('aria-busy');
  // Also remove the hero/footer shortcuts, so no link targets a hidden section.
  document.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href') === '#' + section.id) link.hidden = true;
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function photoImage(name, src) {
  const image = element('img', 'products-image');
  image.alt = name;
  image.width = 640;
  image.height = 480;
  image.loading = 'lazy';
  image.decoding = 'async';
  // Only the shared imageUrl helper supplies image URLs.
  image.src = src;
  image.addEventListener('error', () => {
    image.dataset.productsFailed = 'true';
    image.hidden = true;
  }, { once: true });
  return image;
}

function validExtraPath(path) {
  return typeof path === 'string' && path.length <= 200
    && /^[A-Za-z0-9]/.test(path) && !/[^A-Za-z0-9._/-]/.test(path) && !path.includes('..');
}

let webGLSupported;
function supportsProductModel() {
  if (!window.customElements) return false;
  if (webGLSupported !== undefined) return webGLSupported;
  try {
    // The bundled viewer's renderer requires WebGL2. Probe once, then release that context.
    const gl = document.createElement('canvas').getContext('webgl2');
    webGLSupported = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webGLSupported = false;
  }
  return webGLSupported;
}

let gallerySequence = 0;
function productPhoto(product, name, baseUrl, imageUrl, coverUrl, modelUrl) {
  const photo = element('div', 'products-photo');
  const cover = photoImage(name, coverUrl);
  photo.append(cover);
  const paths = [product.image_path];
  const entries = [{ src: coverUrl, node: cover, kind: 'photo' }];
  if (Array.isArray(product.extra_image_paths)) {
    product.extra_image_paths.slice(0, 5).forEach(path => {
      if (!validExtraPath(path) || paths.includes(path)) return;
      const src = imageUrl(baseUrl, path);
      if (!src) return;
      paths.push(path);
      entries.push({ src, kind: 'photo' });
    });
  }
  let modelEntry = null;
  if (validExtraPath(product.model_path) && product.model_path.endsWith('.glb') && typeof modelUrl === 'function') {
    try {
      const src = modelUrl(baseUrl, product.model_path);
      if (src && supportsProductModel()) {
        modelEntry = { src, kind: 'model' };
        entries.unshift(modelEntry);
      }
    } catch { /* An invalid optional model must not hide the catalogue. */ }
  }
  // Cards without a usable model retain the existing photo-only behavior.
  if (entries.length === 1) return photo;

  photo.classList.add('products-gallery');
  photo.tabIndex = 0;
  photo.setAttribute('role', 'group');
  photo.setAttribute('aria-label', `${modelEntry ? copy.views : copy.photos}: ${name}`);
  const help = element('span', 'products-status', modelEntry ? copy.modelHelp : copy.photoHelp);
  help.id = `products-gallery-help-${++gallerySequence}`;
  photo.setAttribute('aria-describedby', help.id);
  const controls = element('div', 'products-gallery-controls');
  const previous = element('button', 'products-gallery-arrow', '‹');
  const next = element('button', 'products-gallery-arrow', '›');
  previous.type = next.type = 'button';
  previous.setAttribute('aria-label', `${modelEntry ? copy.previousView : copy.previousPhoto}: ${name}`);
  next.setAttribute('aria-label', `${modelEntry ? copy.nextView : copy.nextPhoto}: ${name}`);
  const status = element('span', 'products-gallery-count');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  controls.append(previous, status, next);
  photo.append(help, controls);
  const badge = modelEntry ? element('span', 'products-model-badge', '3D') : null;
  if (badge) { badge.setAttribute('aria-hidden', 'true'); photo.append(badge); }
  const motion = modelEntry ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let modelLoaded = false;
  let registrationTimeout;
  let current = 0;
  const updateRotation = () => {
    const viewer = modelEntry?.node;
    if (!viewer) return;
    if (entries[current] === modelEntry && !motion.matches) viewer.setAttribute('auto-rotate', '');
    else viewer.removeAttribute('auto-rotate');
  };
  const fallback = () => {
    if (!modelEntry) return;
    const selected = entries[current];
    const hadFocus = document.activeElement === modelEntry.node;
    modelEntry.node?.remove();
    entries.shift();
    modelEntry = null;
    clearTimeout(registrationTimeout);
    motion.removeEventListener?.('change', updateRotation);
    badge.remove();
    help.textContent = copy.photoHelp;
    photo.setAttribute('aria-label', `${copy.photos}: ${name}`);
    previous.setAttribute('aria-label', `${copy.previousPhoto}: ${name}`);
    next.setAttribute('aria-label', `${copy.nextPhoto}: ${name}`);
    controls.hidden = entries.length === 1;
    // A late failure must not interrupt somebody already viewing an extra photo.
    show(Math.max(0, entries.indexOf(selected)), true);
    if (hadFocus) photo.focus({ preventScroll: true });
  };
  const createModel = entry => {
    const viewer = element('model-viewer', 'products-model');
    entry.node = viewer;
    const attributes = {
      alt: `${copy.modelAlt}: ${name}`,
      'camera-controls': '', 'disable-pan': '', 'disable-zoom': '',
      'interaction-prompt': 'none', 'touch-action': 'none',
      'auto-rotate-delay': '1500', 'rotation-per-second': '18deg',
      'shadow-intensity': '0', exposure: '1', 'environment-image': 'neutral',
      'camera-orbit': '0deg 90deg 105%',
      'min-camera-orbit': 'auto 55deg auto', 'max-camera-orbit': 'auto 105deg auto',
      loading: 'lazy', reveal: 'auto', poster: coverUrl,
    };
    Object.entries(attributes).forEach(([key, value]) => viewer.setAttribute(key, value));
    viewer.addEventListener('error', fallback, { once: true });
    viewer.addEventListener('load', () => {
      if (!modelEntry) return;
      modelLoaded = true;
      if (entries[current] === modelEntry) show(current, true);
    }, { once: true });
    // Shadow DOM camera handlers run first; only their bubbling events are isolated.
    ['pointerdown', 'pointermove', 'pointerup', 'keydown'].forEach(type => {
      viewer.addEventListener(type, event => event.stopPropagation());
    });
    // Assign the model URL exactly once; retain this element across all view changes.
    viewer.setAttribute('src', entry.src);
    photo.append(viewer);
    if (!window.customElements.get('model-viewer')) {
      registrationTimeout = setTimeout(fallback, 8000);
      window.customElements.whenDefined('model-viewer').then(() => {
        clearTimeout(registrationTimeout);
      }).catch(fallback);
    }
    return viewer;
  };
  const show = (index, force = false) => {
    const target = (index + entries.length) % entries.length;
    if (target === current && !force) return;
    entries.forEach(entry => { if (entry.node) entry.node.hidden = true; });
    current = target;
    const selected = entries[current];
    if (selected.kind === 'model' && !selected.node) createModel(selected);
    // Extras have no img/src until their first explicit selection: no background downloads.
    if (!selected.node) {
      selected.node = photoImage(name, selected.src);
      photo.append(selected.node);
    }
    selected.node.hidden = selected.node.dataset.productsFailed === 'true';
    photo.classList.toggle('products-model-active', selected.kind === 'model');
    // The real img also provides a cover while the custom element is being registered/loading.
    if (selected.kind === 'model' && !modelLoaded) cover.hidden = cover.dataset.productsFailed === 'true';
    updateRotation();
    status.textContent = `${selected.kind === 'model' ? '3D' : modelEntry ? copy.view : copy.photo} ${current + 1} / ${entries.length}`;
  };
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  photo.addEventListener('keydown', event => {
    if (modelEntry?.node && event.composedPath().includes(modelEntry.node)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(entries.length - 1);
    else show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  motion?.addEventListener?.('change', updateRotation);
  show(0, true);
  // Touch uses the 44px buttons; horizontal swipes stay with the outer scroll-snap rail.
  return photo;
}

function enableCarousel(track, previous, next, status) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  const step = () => {
    const first = track.firstElementChild;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const move = direction => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const target = Math.min(max, Math.max(0, track.scrollLeft + direction * step()));
    track.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    const index = Math.min(track.children.length, Math.round(target / step()) + 1);
    status.textContent = `${copy.position}: ${index} / ${track.children.length}`;
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    // Arrow keys on a card link keep their normal browser behavior.
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  track.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleUpdate).observe(track);
  update();
}

// Access token of the stored Supabase session, or '' when there is none that is still valid.
function sessionToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!/^sb-.+-auth-token$/.test(key)) continue;
      const value = JSON.parse(localStorage.getItem(key));
      if (typeof value?.access_token !== 'string' || !value.access_token) continue;
      if (typeof value.expires_at === 'number' && value.expires_at <= Date.now() / 1000) continue;
      return value.access_token;
    }
  } catch { /* unreadable storage means no session */ }
  return '';
}

async function loadCatalogue() {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
    hideCatalogue();
  }, 12000);
  try {
    const config = window.IMAGINNE_AUTH;
    if (!config?.url || !config?.publishableKey) { hideCatalogue(); return; }
    // Catch module-loading failures as well as missing tables/network failures.
    const { priceCents, formatPrice, localized, imageUrl, modelUrl } = await import('/assets/js/product-format.js');
    const fields = 'id,name_pt,name_en,name_es,description_pt,description_en,description_es,price_cad_cents,image_path,extra_image_paths,model_path,sort_order';
    const endpoint = `${config.url.replace(/\/$/, '')}/rest/v1/products?select=${fields}&is_active=eq.true&order=sort_order.asc,created_at.desc&limit=24`;
    const request = bearer => fetch(endpoint, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${bearer}` },
      signal: controller.signal,
      credentials: 'omit',
    });
    // A signed-in visitor asks as themselves: under maintenance the database only returns
    // products to administrators. A refused session falls back to the public request.
    const token = sessionToken();
    let response = await request(token || config.publishableKey);
    if (token && (response.status === 401 || response.status === 403)) response = await request(config.publishableKey);
    if (!response.ok) { hideCatalogue(); return; }
    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) { hideCatalogue(); return; }
    const cards = document.createDocumentFragment();
    products.slice(0, 24).forEach(product => {
      const name = localized(product, 'name', lang);
      const description = localized(product, 'description', lang);
      const src = imageUrl(config.url, product.image_path);
      if (typeof name !== 'string' || !name.trim() || typeof description !== 'string' || !src) {
        throw new Error('Invalid catalogue');
      }
      const item = element('li', 'products-card');
      const photo = productPhoto(product, name, config.url, imageUrl, src, modelUrl);
      const content = element('div', 'products-content');
      const title = element('h3', 'products-name', name);
      const details = element('p', 'products-description', description);
      const cents = priceCents(product);
      const formatted = formatPrice(cents, lang);
      const price = element('p', 'products-price', cents == null ? copy.request
        : /CAD|CA\$/.test(formatted) ? formatted : `${formatted} CAD`);
      const order = element('a', 'products-order', copy.order);
      order.href = 'https://www.instagram.com/imaginne.lab/';
      order.target = '_blank';
      order.rel = 'noopener';
      order.setAttribute('aria-label', `${copy.order}: ${name}`);
      content.append(title, details, price, order);
      item.append(photo, content);
      cards.append(item);
    });
    const track = section.querySelector('[data-products-track]');
    track.replaceChildren(cards);
    track.removeAttribute('aria-hidden');
    track.tabIndex = 0;
    section.removeAttribute('aria-busy');
    section.classList.remove('products-loading');
    const previous = section.querySelector('[data-products-previous]');
    const next = section.querySelector('[data-products-next]');
    const status = section.querySelector('[data-products-status]');
    status.textContent = `${copy.position}: ${track.children.length}`;
    enableCarousel(track, previous, next, status);
  } catch {
    // Catalogue availability must not expose internal API errors to visitors.
    hideCatalogue();
  } finally {
    clearTimeout(timeout);
  }
}

if (section) loadCatalogue();
