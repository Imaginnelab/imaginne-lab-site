import * as format from '/assets/js/product-format.js';
const { priceCents, formatPrice, localized, imageUrl, modelUrl } = format;

const COPY = {
  en: {
    openModel: 'View in 3D', loadingModel: 'Loading 3D…', queuedModel: 'Waiting to load 3D…',
    preparingModel: 'Preparing 3D…', readyModel: '3D ready', errorModel: 'Could not load 3D. Try again.',
    empty: 'New pieces are on their way. Check back soon.',
    request: 'Price on request', order: 'Order Now', position: 'Products', mostViewed: 'Most viewed',
    photos: 'Product photos', photo: 'Photo', previousPhoto: 'Previous photo', nextPhoto: 'Next photo',
    photoHelp: 'Use Left and Right arrow keys, Home or End, or tap the photo buttons. Swipe horizontally to browse products.',
    views: 'Product views', view: 'View', previousView: 'Previous view', nextView: 'Next view',
    modelAlt: 'Interactive 3D model of the product',
    modelHelp: 'Drag the 3D model or use its arrow keys to rotate. Use the view buttons to switch between 3D and photos. Swipe on photos to browse products.',
  },
  pt: {
    openModel: 'Ver em 3D', loadingModel: 'Carregando 3D…', queuedModel: 'Aguardando para carregar 3D…',
    preparingModel: 'Preparando 3D…', readyModel: '3D pronto', errorModel: 'Não foi possível carregar o 3D. Tente de novo.',
    empty: 'Novas peças estão a caminho. Volte em breve.',
    request: 'Sob consulta', order: 'Fazer Pedido', position: 'Produtos', mostViewed: 'Mais visto',
    photos: 'Fotos do produto', photo: 'Foto', previousPhoto: 'Foto anterior', nextPhoto: 'Próxima foto',
    photoHelp: 'Use as setas esquerda e direita, Home ou End, ou toque nos botões de foto. Deslize na horizontal para navegar pelos produtos.',
    views: 'Vistas do produto', view: 'Vista', previousView: 'Vista anterior', nextView: 'Próxima vista',
    modelAlt: 'Modelo 3D interativo do produto',
    modelHelp: 'Arraste o modelo 3D ou use suas setas para girar. Use os botões de vista para alternar entre 3D e fotos. Deslize nas fotos para navegar pelos produtos.',
  },
  es: {
    openModel: 'Ver en 3D', loadingModel: 'Cargando 3D…', queuedModel: 'Esperando para cargar 3D…',
    preparingModel: 'Preparando 3D…', readyModel: '3D listo', errorModel: 'No pudimos cargar el 3D. Inténtalo de nuevo.',
    empty: 'Nuevas piezas están en camino. Vuelve pronto.',
    request: 'Precio a consultar', order: 'Hacer Pedido', position: 'Productos', mostViewed: 'Más visto',
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

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function photoImage(name, src, priority = 'auto') {
  const image = element('img', 'products-image');
  image.alt = name;
  image.width = 640;
  image.height = 480;
  image.loading = priority === 'high' ? 'eager' : 'lazy';
  image.fetchPriority = priority;
  image.decoding = 'async';
  image.draggable = false;
  // Only the shared imageUrl helper supplies image URLs.
  image.src = src;
  image.addEventListener('error', () => {
    image.dataset.productsFailed = 'true';
    image.hidden = true;
  }, { once: true });
  return image;
}

let viewerPromise;
export function ensureModelViewer() {
  if (window.customElements?.get('model-viewer')) return Promise.resolve();
  if (!viewerPromise) {
    viewerPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Model unavailable')), 12000);
      import('/assets/js/model-viewer.min.js')
        .then(() => window.customElements.whenDefined('model-viewer'))
        .then(resolve, reject)
        .finally(() => clearTimeout(timeout));
    }).catch(error => { viewerPromise = null; throw error; });
  }
  return viewerPromise;
}

export async function mountHeroModel() {
  const viewer = document.querySelector('[data-hero-model]');
  if (!viewer || !viewer.dataset.modelSrc) return;
  let visible = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rotate = () => {
    if (visible && !document.hidden && !motion.matches) viewer.setAttribute('auto-rotate', '');
    else viewer.removeAttribute('auto-rotate');
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    rotate();
  }, { threshold: .01 }) : null;
  try {
    await ensureModelViewer();
    viewer.setAttribute('src', viewer.dataset.modelSrc);
    observer?.observe(viewer);
    motion.addEventListener?.('change', rotate);
    document.addEventListener('visibilitychange', rotate);
    const cleanup = () => {
      observer?.disconnect();
      motion.removeEventListener?.('change', rotate);
      document.removeEventListener('visibilitychange', rotate);
      viewer.removeAttribute('auto-rotate');
    };
    viewer.addEventListener('error', cleanup, { once: true });
    window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); });
  } catch { observer?.disconnect(); /* Preserve the existing frame if 3D is unavailable. */ }
}

function validExtraPath(path) {
  return typeof path === 'string' && path.length <= 200
    && /^[A-Za-z0-9]/.test(path) && !/[^A-Za-z0-9._/-]/.test(path) && !path.includes('..');
}

let webGLSupported;
function supportsProductModel() {
  if (!window.customElements || !window.IntersectionObserver) return false;
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

const MAX_MODEL_BYTES = 15 * 1024 * 1024;
const AUTO_MODEL_BYTES = 2_000_000;
const modelQueue = [];
const liveModels = [];
const modelCards = new Set();
let activeModel = null;
let lastModelMotion = 0;
const modelLimit = () => document.querySelector('[data-hero-model]') ? 1 : 2;

function automaticConnection() {
  const connection = navigator.connection;
  return !document.hidden
    && !(typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2)
    && !connection?.saveData
    && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType)
    && !(typeof connection?.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1);
}
function cancelQueuedModel(job) {
  const index = modelQueue.indexOf(job);
  if (index !== -1) { modelQueue.splice(index, 1); job.reset(); }
}
async function pumpModels() {
  if (activeModel) return;
  const job = modelQueue.shift();
  if (!job) return;
  if (!job.eligible() || (!job.explicit && !automaticConnection())) {
    job.reset();
    pumpModels();
    return;
  }
  if (liveModels.length >= modelLimit()) {
    const victim = liveModels.find(item => !item.visible()) || (job.explicit ? liveModels[0] : null);
    if (!victim) { job.reset(); pumpModels(); return; }
    victim.dispose();
  }
  activeModel = job;
  job.abort = new AbortController();
  const timeout = setTimeout(() => job.abort?.abort(), 60000);
  try {
    await job.load(job.abort.signal);
    liveModels.push(job);
  } catch (error) {
    job.dispose();
    if (error?.name !== 'AbortError') job.failed();
  } finally {
    clearTimeout(timeout);
    job.abort = null;
    activeModel = null;
    pumpModels();
    modelCards.forEach(item => item.arm());
  }
}
function queueModel(job, explicit) {
  if (job.loaded || activeModel === job || modelQueue.includes(job)) return;
  job.explicit = explicit;
  if (!explicit) job.autoAttempted = true;
  job.waiting();
  modelQueue.push(job);
  pumpModels();
}
async function fetchModelBlob(src, signal, hint, progress) {
  const response = await fetch(src, { signal, credentials: 'omit', cache: 'force-cache' });
  if (!response.ok) {
    await response.body?.cancel?.();
    throw new Error('Model unavailable');
  }
  const header = Number(response.headers.get('content-length'));
  if (header > MAX_MODEL_BYTES) {
    await response.body?.cancel?.();
    throw new Error('Model too large');
  }
  const total = header > 0 ? header : hint;
  if (!response.body?.getReader) {
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_MODEL_BYTES) throw new Error('Model unavailable');
    progress(100);
    return blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MODEL_BYTES) { await reader.cancel(); throw new Error('Model too large'); }
      chunks.push(value);
      progress(total > 0 ? Math.min(99, Math.floor(size / total * 100)) : null);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new Error('Model unavailable');
  progress(100);
  return new Blob(chunks, { type: 'model/gltf-binary' });
}
window.addEventListener('scroll', () => { lastModelMotion = performance.now(); }, { passive: true, capture: true });
window.addEventListener('pagehide', event => {
  activeModel?.abort?.abort();
  modelQueue.splice(0).forEach(job => job.reset());
  modelCards.forEach(job => job.suspend());
  if (!event.persisted) {
    [...liveModels].forEach(job => job.dispose());
    modelCards.forEach(job => job.cleanup());
    modelCards.clear();
  }
});
document.addEventListener('visibilitychange', () => {
  modelCards.forEach(job => { job.rotation(); job.arm(); });
  if (!document.hidden) pumpModels();
});
window.addEventListener('pageshow', () => modelCards.forEach(job => job.arm()));

let gallerySequence = 0;
function productPhoto(product, name, baseUrl, imageUrl, coverUrl, modelUrl, interest, priority) {
  const photo = element('div', 'products-photo');
  const cover = photoImage(name, coverUrl, priority);
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
    } catch { /* Invalid optional models retain their photos. */ }
  }
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
  const bytes = Number.isInteger(product.model_bytes) && product.model_bytes > 0 && product.model_bytes <= MAX_MODEL_BYTES ? product.model_bytes : null;
  const sizeText = bytes ? ` · ${new Intl.NumberFormat({ pt: 'pt-BR', en: 'en-CA', es: 'es-ES' }[lang], { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB` : '';
  const prompt = modelEntry ? element('div', 'products-model-prompt') : null;
  const open = modelEntry ? element('button', 'products-model-open', copy.openModel + sizeText) : null;
  const message = modelEntry ? element('span', 'products-model-message') : null;
  const progress = modelEntry ? element('progress', 'products-model-progress') : null;
  const ready = modelEntry ? element('span', 'products-status') : null;
  if (prompt) {
    open.type = 'button';
    open.setAttribute('aria-label', `${copy.openModel}: ${name}${sizeText}`);
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    progress.max = 100;
    progress.hidden = true;
    progress.setAttribute('aria-label', copy.loadingModel);
    prompt.append(open, progress, message);
    photo.append(prompt);
    ready.setAttribute('role', 'status');
    ready.setAttribute('aria-live', 'polite');
    photo.append(ready);
  }
  const motion = modelEntry ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let current = 0;
  let visible = false;
  let wellVisible = false;
  let observer;
  let automaticTimer;
  let blobUrl;
  let lastProgress = -1;
  let lastAnnouncement = -1;
  let restoreFocus = false;
  const selectedModel = () => entries[current] === modelEntry;
  const rotation = () => {
    const viewer = modelEntry?.node;
    if (!viewer) return;
    viewer.hidden = !selectedModel() || !visible || document.hidden;
    if (!viewer.hidden && job.loaded && !motion.matches) viewer.setAttribute('auto-rotate', '');
    else viewer.removeAttribute('auto-rotate');
  };
  const show = (index, force = false) => {
    const target = (index + entries.length) % entries.length;
    if (target === current && !force) return;
    entries.forEach(entry => { if (entry.node) entry.node.hidden = true; });
    current = target;
    const selected = entries[current];
    if (selected.kind === 'photo' && !selected.node) {
      selected.node = photoImage(name, selected.src);
      photo.append(selected.node);
    }
    if (selected.kind === 'photo') selected.node.hidden = selected.node.dataset.productsFailed === 'true';
    if (selected.kind === 'model') cover.hidden = job.loaded || cover.dataset.productsFailed === 'true';
    photo.classList.toggle('products-model-active', selected.kind === 'model');
    if (prompt) prompt.hidden = selected.kind !== 'model' || job.loaded;
    if (selected.kind !== 'model' && job) {
      cancelQueuedModel(job);
      if (activeModel === job && !job.explicit) job.abort?.abort();
    }
    rotation();
    job?.arm();
    status.textContent = `${selected.kind === 'model' ? '3D' : modelEntry ? copy.view : copy.photo} ${current + 1} / ${entries.length}`;
  };
  const reportProgress = value => {
    if (!progress || value === lastProgress) return;
    lastProgress = value;
    if (value == null) progress.removeAttribute('value');
    else progress.value = value;
    const announcement = value == null ? -1 : Math.floor(value / 10);
    if (announcement !== lastAnnouncement) {
      lastAnnouncement = announcement;
      message.textContent = copy.loadingModel + (value == null ? '' : ` ${value}%`);
    }
  };
  const reset = () => {
    if (!prompt) return;
    open.disabled = false;
    open.textContent = copy.openModel + sizeText;
    progress.hidden = true;
    message.textContent = '';
    ready.textContent = '';
    photo.removeAttribute('aria-busy');
    if (selectedModel()) { cover.hidden = cover.dataset.productsFailed === 'true'; prompt.hidden = false; }
  };
  const dispose = () => {
    const index = liveModels.indexOf(job);
    if (index !== -1) liveModels.splice(index, 1);
    const viewer = modelEntry.node;
    const focused = viewer && (document.activeElement === viewer || viewer.contains(document.activeElement));
    if (viewer) { viewer.removeAttribute('auto-rotate'); viewer.removeAttribute('src'); viewer.remove(); }
    modelEntry.node = null;
    job.loaded = false;
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    reset();
    if (focused) open.focus({ preventScroll: true });
  };
  const arm = () => {
    clearTimeout(automaticTimer);
    if (!job || job.loaded || job.autoAttempted || activeModel === job || modelQueue.includes(job) || !wellVisible || !selectedModel()
      || !bytes || bytes > AUTO_MODEL_BYTES || !automaticConnection() || activeModel) return;
    automaticTimer = setTimeout(() => {
      if (performance.now() - lastModelMotion < 600) { arm(); return; }
      if (wellVisible && selectedModel() && automaticConnection() && !activeModel) queueModel(job, false);
    }, 600);
  };
  const job = modelEntry ? {
    loaded: false, explicit: false, autoAttempted: false, abort: null,
    visible: () => visible && selectedModel(),
    eligible: () => photo.isConnected && visible && selectedModel() && !document.hidden,
    arm, rotation, reset, dispose,
    suspend: () => { clearTimeout(automaticTimer); modelEntry.node?.removeAttribute('auto-rotate'); },
    cleanup: () => { clearTimeout(automaticTimer); observer?.disconnect(); motion.removeEventListener?.('change', rotation); },
    waiting: () => {
      clearTimeout(automaticTimer);
      restoreFocus = document.activeElement === open;
      open.disabled = true;
      open.textContent = copy.loadingModel;
      message.textContent = copy.queuedModel;
      progress.hidden = false;
      progress.removeAttribute('value');
      photo.setAttribute('aria-busy', 'true');
      lastProgress = -1;
      lastAnnouncement = -1;
    },
    failed: () => { message.textContent = copy.errorModel; },
    load: async signal => {
      message.textContent = copy.loadingModel;
      await ensureModelViewer();
      if (signal.aborted || !job.eligible()) throw new DOMException('Cancelled', 'AbortError');
      const Viewer = window.customElements.get('model-viewer');
      // Do not retain unused parsed geometry/textures after an element is evicted.
      Viewer.modelCacheSize = 0;
      const blob = await fetchModelBlob(modelEntry.src, signal, bytes, reportProgress);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      message.textContent = copy.preparingModel;
      blobUrl = URL.createObjectURL(blob);
      const viewer = element('model-viewer', 'products-model');
      modelEntry.node = viewer;
      const attributes = {
        alt: `${copy.modelAlt}: ${name}`,
        tabindex: '0',
        'camera-controls': '', 'disable-pan': '', 'disable-zoom': '',
        'interaction-prompt': 'none', 'touch-action': 'none',
        'auto-rotate-delay': '1500', 'rotation-per-second': '18deg',
        'shadow-intensity': '0', exposure: '1', 'environment-image': 'neutral',
        'camera-orbit': '0deg 90deg 105%',
        'min-camera-orbit': 'auto 55deg auto', 'max-camera-orbit': 'auto 105deg auto',
        loading: 'eager', reveal: 'auto', poster: coverUrl,
      };
      Object.entries(attributes).forEach(([key, value]) => viewer.setAttribute(key, value));
      viewer.addEventListener('camera-change', event => { if (event.detail?.source === 'user-interaction') interest(); });
      viewer.addEventListener('error', () => { if (modelEntry.node === viewer && job.loaded) { dispose(); job.failed(); } });
      ['pointerdown', 'pointermove', 'pointerup', 'keydown'].forEach(type => viewer.addEventListener(type, event => event.stopPropagation()));
      await new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException('Cancelled', 'AbortError'));
        const finish = callback => () => { signal.removeEventListener('abort', abort); callback(); };
        signal.addEventListener('abort', abort, { once: true });
        viewer.addEventListener('load', finish(resolve), { once: true });
        viewer.addEventListener('error', finish(() => reject(new Error('Model unavailable'))), { once: true });
        viewer.setAttribute('src', blobUrl);
        photo.append(viewer);
        rotation();
      });
      if (signal.aborted || !photo.isConnected) throw new DOMException('Cancelled', 'AbortError');
      job.loaded = true;
      photo.removeAttribute('aria-busy');
      message.textContent = copy.readyModel;
      ready.textContent = copy.readyModel;
      if (restoreFocus && selectedModel() && visible) viewer.focus({ preventScroll: true });
      show(current, true);
    },
  } : null;
  if (job) {
    modelCards.add(job);
    open.addEventListener('click', event => {
      event.stopPropagation();
      interest();
      visible = true; // An actual click/keyboard activation is explicit intent even before the first IO callback.
      queueModel(job, true);
    });
    observer = new IntersectionObserver(observations => {
      const entry = observations[0];
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      wellVisible = visible && entry.intersectionRatio >= .75;
      if (!visible) {
        cancelQueuedModel(job);
        if (activeModel === job && !job.explicit) job.abort?.abort();
      }
      rotation();
      arm();
    }, { threshold: [0, .01, .75, 1] });
    observer.observe(photo);
    motion.addEventListener?.('change', rotation);
  }
  previous.addEventListener('click', () => { interest(); show(current - 1); });
  next.addEventListener('click', () => { interest(); show(current + 1); });
  photo.addEventListener('keydown', event => {
    if (modelEntry?.node && event.composedPath().includes(modelEntry.node)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    interest();
    if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(entries.length - 1);
    else show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  show(0, true);
  return photo;
}

export const PRODUCT_FIELDS = 'id,name_pt,name_en,name_es,description_pt,description_en,description_es,price_cad_cents,image_path,extra_image_paths,model_path,model_bytes,sort_order,view_count';
export const NORMAL_ORDER = 'sort_order.asc,created_at.desc,id.asc';
export const productLanguage = lang;
export const productCopy = copy;

function config() {
  const value = window.IMAGINNE_AUTH;
  if (!value?.url || !value?.publishableKey) throw new Error('Catalogue unavailable');
  return value;
}

export function sessionToken() {
  try {
    const settings = config();
    const project = new URL(settings.url).hostname.split('.')[0];
    const value = JSON.parse(localStorage.getItem(`sb-${project}-auth-token`));
    if (typeof value?.access_token !== 'string' || !value.access_token) return '';
    if (typeof value.expires_at === 'number' && value.expires_at <= Date.now() / 1000) return '';
    return value.access_token;
  } catch { return ''; }
}

async function request(path) {
  const settings = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const fetchWith = token => fetch(settings.url.replace(/\/+$/, '') + path, {
    headers: { apikey: settings.publishableKey, Authorization: `Bearer ${token}` },
    credentials: 'omit', cache: 'no-store', signal: controller.signal,
  });
  try {
    const token = sessionToken();
    let response = await fetchWith(token || settings.publishableKey);
    if (token && (response.status === 401 || response.status === 403)) response = await fetchWith(settings.publishableKey);
    if (!response.ok) throw new Error('Catalogue unavailable');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export async function requestProducts(options = {}) {
  const query = new URLSearchParams({ select: PRODUCT_FIELDS, is_active: 'eq.true', order: NORMAL_ORDER, ...options });
  const result = await request('/rest/v1/products?' + query);
  if (!Array.isArray(result)) throw new Error('Catalogue unavailable');
  return result;
}

export async function featuredProduct() {
  const rows = await requestProducts({ view_count: 'gt.0', order: 'view_count.desc,id.asc', limit: '1' });
  return rows.find(row => validProductId(row?.id) && Number(row.view_count) > 0) || null;
}

export async function maintenanceMode() {
  try {
    const result = await request('/rest/v1/site_settings?select=maintenance_mode&id=eq.true');
    return result?.[0]?.maintenance_mode === true;
  } catch { return document.documentElement.getAttribute('data-maintenance') === 'curtain'; }
}

function validProductId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
const seen = new Set();
export function trackView(id) {
  if (!validProductId(id) || seen.has(id)) return;
  const key = 'imaginne-product-view:' + id;
  try { if (sessionStorage.getItem(key)) { seen.add(id); return; } } catch { /* memory fallback */ }
  seen.add(id);
  try { sessionStorage.setItem(key, '1'); } catch { /* memory fallback */ }
  try {
    const settings = config();
    // No fallback on rejected JWT: an expired admin must not be recounted as an anonymous visit.
    const token = sessionToken() || settings.publishableKey;
    fetch(settings.url.replace(/\/+$/, '') + '/rest/v1/rpc/track_product_view', {
      method: 'POST', headers: { apikey: settings.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: id }), credentials: 'omit', keepalive: true,
    }).catch(() => {});
  } catch { /* Statistics never affect the interface. */ }
}

export function createProductCard(product, { featured = false, priority = 'auto' } = {}) {
  const name = localized(product, 'name', lang);
  const description = localized(product, 'description', lang);
  const src = imageUrl(config().url, product?.image_path);
  if (!name?.trim() || !description || !src || !validProductId(product?.id)) return null;
  const item = element('li', 'products-card');
  const interest = () => trackView(product.id);
  const photo = productPhoto(product, name, config().url, imageUrl, src, modelUrl, interest, priority);
  const content = element('div', 'products-content');
  const title = element('h3', 'products-name', name);
  const details = element('p', 'products-description', description);
  const cents = priceCents(product);
  const formatted = formatPrice(cents, lang);
  const price = element('p', 'products-price', cents == null ? copy.request : /CAD|CA\$/.test(formatted) ? formatted : `${formatted} CAD`);
  const order = element('a', 'products-order', copy.order);
  order.href = 'https://www.instagram.com/imaginne.lab/';
  order.target = '_blank';
  order.rel = 'noopener';
  order.setAttribute('aria-label', `${copy.order}: ${name}`);
  content.append(title, details, price, order);
  item.append(photo, content);
  item.addEventListener('click', interest);
  if (featured) {
    item.classList.add('products-featured');
    const badge = element('span', 'products-featured-badge');
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', copy.mostViewed);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z');
    svg.append(path);
    badge.append(svg);
    title.append(badge);
  }
  return item;
}
