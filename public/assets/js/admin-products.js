// Product manager for /admin/. The database (RLS) decides who may read or write; this file only
// drives the interface. Everything that comes from the database reaches the page as text.
import {
  MAX_PHOTOS, MAX_PHOTO_SIDE, PAGE_SIZE, chooseUpload, copyName, fitWithin, formatFileSize, formatPrice, freshRows, imagePaths, imageUrl, localized, modelUrl, parsePrice, priceCents,
  reloadSize, viewCount,
} from './product-format.js';

const languages = {
  pt: {
    title: 'Produtos', subtitle: 'Produtos ativos aparecem no carrossel da página inicial.', add: 'Novo produto', retry: 'Tentar de novo',
    loading: 'Carregando produtos…', empty: 'Nenhum produto cadastrado ainda. Comece por "Novo produto".',
    loadError: 'Não foi possível carregar os produtos.', loadingMore: 'Carregando mais produtos…', moreError: 'Não foi possível carregar mais produtos.',
    viewsOne: '1 visualização', viewsMany: '{n} visualizações', mostViewed: 'Mais visto', forbidden: 'Sua sessão expirou ou esta conta não tem permissão. Entre novamente pelo site.',
    saveError: 'Não foi possível salvar. Tente de novo.', deleteError: 'Não foi possível excluir. Tente de novo.', toggleError: 'Não foi possível alterar o produto. Tente de novo.',
    photoUploadError: 'Não foi possível enviar as fotos. Tente de novo.', copyError: 'Não foi possível copiar os arquivos do produto original. Nada foi salvo.',
    model: 'Modelo 3D (.glb)', addModel: 'Escolher modelo 3D', replaceModel: 'Trocar modelo 3D', modelHint: 'Opcional. GLB de até 15 MB. Ele vira o primeiro item do produto no site e pode ser girado.',
    modelExt: '{name}: use um arquivo .glb.', modelSize: '{name}: o modelo precisa ter até 15 MB.', modelInvalid: '{name}: este arquivo não é um GLB válido.', modelUploadError: 'Não foi possível enviar o modelo 3D. Tente de novo.',
    savedModel: 'Modelo já salvo', copiedModel: 'Cópia do modelo original', removeModel: 'Remover o modelo 3D', modelAlt: 'Pré-visualização do modelo 3D', has3d: 'Tem modelo 3D',
    uncertain: 'Não foi possível confirmar se o produto foi salvo. Feche esta janela e confira a lista antes de tentar de novo.',
    saved: 'Produto salvo.', created: 'Produto cadastrado.', deleted: 'Produto excluído.', activated: 'Produto ativado.', deactivated: 'Produto desativado.',
    newTitle: 'Novo produto', editTitle: 'Editar produto', copyTitle: 'Duplicar produto', close: 'Fechar', cancel: 'Cancelar', save: 'Salvar', saving: 'Salvando…',
    name: 'Nome', description: 'Descrição', price: 'Preço (CAD)', priceHint: 'Deixe vazio para "sob consulta".',
    photos: 'Fotos', addPhotos: 'Adicionar fotos', photoHint: 'JPEG, PNG ou WebP. As fotos são reduzidas e comprimidas antes do envio. Até 6 fotos; a primeira é a capa.',
    optimizing: 'otimizando…', photoSource: '{name}: a foto original passa de 25 MB.',
    order: 'Ordem', orderHint: 'Números menores aparecem primeiro.', activeLabel: 'Ativo (visível no site)',
    required: 'Preencha este campo.', tooLong: 'Use no máximo {max} caracteres.', priceInvalid: 'Digite um valor como 49,90.', priceTooHigh: 'O valor é alto demais.',
    orderInvalid: 'Use um número inteiro entre -100000 e 100000.', photoRequired: 'Adicione pelo menos uma foto.',
    photoType: '{name}: use uma imagem JPEG, PNG ou WebP.', photoSize: '{name}: a foto precisa ter até 5 MB.', photoMax: 'O limite é de 6 fotos; as demais não foram adicionadas.',
    fixErrors: 'Revise os campos destacados.', onRequest: 'Sob consulta', active: 'Ativo', inactive: 'Inativo', orderShort: 'Ordem {n}', photoCount: '{n} fotos',
    edit: 'Editar', duplicate: 'Duplicar', activate: 'Ativar', deactivate: 'Desativar', delete: 'Excluir', deleting: 'Excluindo…',
    editLabel: 'Editar {name}', duplicateLabel: 'Duplicar {name}', activateLabel: 'Ativar {name}', deactivateLabel: 'Desativar {name}', deleteLabel: 'Excluir {name}',
    deleteTitle: 'Excluir produto?', deleteText: '"{name}" e as fotos dele serão removidos. Esta ação não pode ser desfeita.', photoAlt: 'Foto de {name}',
    cover: 'Capa', makeCover: 'Usar como capa', savedPhoto: 'Foto já salva', copiedPhoto: 'Cópia da foto original', photoThumbAlt: 'Foto {n}',
    makeCoverLabel: 'Usar a foto {n} como capa', moveUpLabel: 'Mover a foto {n} para antes', moveDownLabel: 'Mover a foto {n} para depois', removeLabel: 'Remover a foto {n}',
  },
  en: {
    title: 'Products', subtitle: 'Active products appear in the home page carousel.', add: 'New product', retry: 'Try again',
    loading: 'Loading products…', empty: 'No products yet. Start with "New product".',
    loadError: 'Unable to load the products.', loadingMore: 'Loading more products…', moreError: 'Unable to load more products.',
    viewsOne: '1 view', viewsMany: '{n} views', mostViewed: 'Most viewed', forbidden: 'Your session expired or this account is not allowed. Sign in again on the website.',
    saveError: 'Unable to save. Please try again.', deleteError: 'Unable to delete. Please try again.', toggleError: 'Unable to change the product. Please try again.',
    photoUploadError: 'Unable to upload the photos. Please try again.', copyError: 'Unable to copy the files of the original product. Nothing was saved.',
    model: '3D model (.glb)', addModel: 'Choose 3D model', replaceModel: 'Replace 3D model', modelHint: 'Optional. GLB up to 15 MB. It becomes the first item of the product on the site and can be rotated.',
    modelExt: '{name}: use a .glb file.', modelSize: '{name}: the model must be 15 MB or smaller.', modelInvalid: '{name}: this file is not a valid GLB.', modelUploadError: 'Unable to upload the 3D model. Please try again.',
    savedModel: 'Model already saved', copiedModel: 'Copy of the original model', removeModel: 'Remove the 3D model', modelAlt: '3D model preview', has3d: 'Has a 3D model',
    uncertain: 'Unable to confirm whether the product was saved. Close this window and check the list before trying again.',
    saved: 'Product saved.', created: 'Product added.', deleted: 'Product deleted.', activated: 'Product activated.', deactivated: 'Product deactivated.',
    newTitle: 'New product', editTitle: 'Edit product', copyTitle: 'Duplicate product', close: 'Close', cancel: 'Cancel', save: 'Save', saving: 'Saving…',
    name: 'Name', description: 'Description', price: 'Price (CAD)', priceHint: 'Leave empty for "price on request".',
    photos: 'Photos', addPhotos: 'Add photos', photoHint: 'JPEG, PNG or WebP. Photos are resized and compressed before upload. Up to 6 photos; the first one is the cover.',
    optimizing: 'optimizing…', photoSource: '{name}: the original photo is over 25 MB.',
    order: 'Order', orderHint: 'Lower numbers come first.', activeLabel: 'Active (visible on the site)',
    required: 'Fill in this field.', tooLong: 'Use at most {max} characters.', priceInvalid: 'Enter an amount such as 49.90.', priceTooHigh: 'The amount is too high.',
    orderInvalid: 'Use a whole number between -100000 and 100000.', photoRequired: 'Add at least one photo.',
    photoType: '{name}: use a JPEG, PNG or WebP image.', photoSize: '{name}: the photo must be 5 MB or smaller.', photoMax: 'The limit is 6 photos; the others were not added.',
    fixErrors: 'Check the highlighted fields.', onRequest: 'Price on request', active: 'Active', inactive: 'Inactive', orderShort: 'Order {n}', photoCount: '{n} photos',
    edit: 'Edit', duplicate: 'Duplicate', activate: 'Activate', deactivate: 'Deactivate', delete: 'Delete', deleting: 'Deleting…',
    editLabel: 'Edit {name}', duplicateLabel: 'Duplicate {name}', activateLabel: 'Activate {name}', deactivateLabel: 'Deactivate {name}', deleteLabel: 'Delete {name}',
    deleteTitle: 'Delete product?', deleteText: '"{name}" and its photos will be removed. This cannot be undone.', photoAlt: 'Photo of {name}',
    cover: 'Cover', makeCover: 'Use as cover', savedPhoto: 'Photo already saved', copiedPhoto: 'Copy of the original photo', photoThumbAlt: 'Photo {n}',
    makeCoverLabel: 'Use photo {n} as the cover', moveUpLabel: 'Move photo {n} earlier', moveDownLabel: 'Move photo {n} later', removeLabel: 'Remove photo {n}',
  },
  es: {
    title: 'Productos', subtitle: 'Los productos activos aparecen en el carrusel de la página de inicio.', add: 'Nuevo producto', retry: 'Reintentar',
    loading: 'Cargando productos…', empty: 'Aún no hay productos. Empieza con "Nuevo producto".',
    loadError: 'No se pudieron cargar los productos.', loadingMore: 'Cargando más productos…', moreError: 'No se pudieron cargar más productos.',
    viewsOne: '1 visualización', viewsMany: '{n} visualizaciones', mostViewed: 'Más visto', forbidden: 'Tu sesión caducó o esta cuenta no tiene permiso. Inicia sesión de nuevo en el sitio.',
    saveError: 'No se pudo guardar. Inténtalo de nuevo.', deleteError: 'No se pudo eliminar. Inténtalo de nuevo.', toggleError: 'No se pudo cambiar el producto. Inténtalo de nuevo.',
    photoUploadError: 'No se pudieron subir las fotos. Inténtalo de nuevo.', copyError: 'No se pudieron copiar los archivos del producto original. No se guardó nada.',
    model: 'Modelo 3D (.glb)', addModel: 'Elegir modelo 3D', replaceModel: 'Cambiar modelo 3D', modelHint: 'Opcional. GLB de hasta 15 MB. Será el primer elemento del producto en el sitio y se puede girar.',
    modelExt: '{name}: usa un archivo .glb.', modelSize: '{name}: el modelo debe pesar 15 MB como máximo.', modelInvalid: '{name}: este archivo no es un GLB válido.', modelUploadError: 'No se pudo subir el modelo 3D. Inténtalo de nuevo.',
    savedModel: 'Modelo ya guardado', copiedModel: 'Copia del modelo original', removeModel: 'Quitar el modelo 3D', modelAlt: 'Vista previa del modelo 3D', has3d: 'Tiene modelo 3D',
    uncertain: 'No se pudo confirmar si el producto se guardó. Cierra esta ventana y revisa la lista antes de intentarlo de nuevo.',
    saved: 'Producto guardado.', created: 'Producto añadido.', deleted: 'Producto eliminado.', activated: 'Producto activado.', deactivated: 'Producto desactivado.',
    newTitle: 'Nuevo producto', editTitle: 'Editar producto', copyTitle: 'Duplicar producto', close: 'Cerrar', cancel: 'Cancelar', save: 'Guardar', saving: 'Guardando…',
    name: 'Nombre', description: 'Descripción', price: 'Precio (CAD)', priceHint: 'Déjalo vacío para "precio a consultar".',
    photos: 'Fotos', addPhotos: 'Añadir fotos', photoHint: 'JPEG, PNG o WebP. Las fotos se reducen y comprimen antes de subirlas. Hasta 6 fotos; la primera es la portada.',
    optimizing: 'optimizando…', photoSource: '{name}: la foto original supera los 25 MB.',
    order: 'Orden', orderHint: 'Los números menores aparecen primero.', activeLabel: 'Activo (visible en el sitio)',
    required: 'Completa este campo.', tooLong: 'Usa como máximo {max} caracteres.', priceInvalid: 'Escribe un importe como 49,90.', priceTooHigh: 'El importe es demasiado alto.',
    orderInvalid: 'Usa un número entero entre -100000 y 100000.', photoRequired: 'Añade al menos una foto.',
    photoType: '{name}: usa una imagen JPEG, PNG o WebP.', photoSize: '{name}: la foto debe pesar 5 MB como máximo.', photoMax: 'El límite es de 6 fotos; las demás no se añadieron.',
    fixErrors: 'Revisa los campos marcados.', onRequest: 'Precio a consultar', active: 'Activo', inactive: 'Inactivo', orderShort: 'Orden {n}', photoCount: '{n} fotos',
    edit: 'Editar', duplicate: 'Duplicar', activate: 'Activar', deactivate: 'Desactivar', delete: 'Eliminar', deleting: 'Eliminando…',
    editLabel: 'Editar {name}', duplicateLabel: 'Duplicar {name}', activateLabel: 'Activar {name}', deactivateLabel: 'Desactivar {name}', deleteLabel: 'Eliminar {name}',
    deleteTitle: '¿Eliminar producto?', deleteText: '"{name}" y sus fotos se eliminarán. Esta acción no se puede deshacer.', photoAlt: 'Foto de {name}',
    cover: 'Portada', makeCover: 'Usar como portada', savedPhoto: 'Foto ya guardada', copiedPhoto: 'Copia de la foto original', photoThumbAlt: 'Foto {n}',
    makeCoverLabel: 'Usar la foto {n} como portada', moveUpLabel: 'Mover la foto {n} antes', moveDownLabel: 'Mover la foto {n} después', removeLabel: 'Quitar la foto {n}',
  },
};

const BUCKET = 'product-images';
const MODEL_BUCKET = 'product-models';
const COLUMNS = 'id,name_pt,name_en,name_es,description_pt,description_en,description_es,price_cad_cents,image_path,extra_image_paths,model_path,is_active,sort_order';
const LANGS = ['pt', 'en', 'es'];
// The extension comes from the validated MIME type, never from the original file name.
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
// What may be picked; the 5 MB limit applies to the file that is actually uploaded.
const MAX_PHOTO_SOURCE_BYTES = 25 * 1024 * 1024;
const PHOTO_QUALITY = 0.82;
const MAX_MODEL_BYTES = 15 * 1024 * 1024;
const MODEL_TYPE = 'model/gltf-binary';
// A GLB file starts with the ASCII bytes "glTF". Browsers rarely report a type for .glb files,
// so the content is what gets checked.
const GLB_MAGIC = [0x67, 0x6c, 0x54, 0x46];
const VIEWER_SCRIPT = '/assets/js/model-viewer.min.js';
const MAX_PRICE_CENTS = 100000000;
const LIMITS = { name: 120, description: 600 };
// Each language keeps its own wording, whatever language the dashboard is in.
const COPY_SUFFIX = { pt: ' (cópia)', en: ' (copy)', es: ' (copia)' };
const SCOPE = ['#products', '#product-dialog', '#product-delete'];

let mounted = false;

export function mountProducts({ client, lang }) {
  if (mounted) return;
  mounted = true;
  const t = languages[lang] || languages.en;
  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const $ = (id) => document.getElementById(id);
  const scoped = (selector) => document.querySelectorAll(SCOPE.map((root) => `${root} ${selector}`).join(','));
  const publicUrl = (path) => imageUrl(window.IMAGINNE_AUTH.url, path);
  const publicModelUrl = (path) => modelUrl(window.IMAGINNE_AUTH.url, path);

  const notice = $('products-notice');
  const state = $('products-state');
  const stateText = $('products-state-text');
  const retry = $('products-retry');
  const list = $('products-list');
  const more = $('products-more');
  const moreText = $('products-more-text');
  const moreRetry = $('products-more-retry');
  const rowTemplate = $('product-row');
  const dialog = $('product-dialog');
  const form = $('product-form');
  const formError = $('product-form-error');
  const saveButton = $('product-save');
  const photoInput = $('product-photo');
  const photoList = $('product-photos');
  const photoTemplate = $('photo-item');
  const modelInput = $('product-model');
  const modelItem = $('product-model-item');
  const modelPreview = $('product-model-preview');
  const modelRemove = $('product-model-remove');
  const deleteDialog = $('product-delete');
  const deleteError = $('product-delete-error');
  const deleteConfirm = $('product-delete-confirm');

  let products = [];
  // Infinite list: rows are read a page at a time, by position in a stable order.
  let offset = 0;
  let hasMore = false;
  let loadingMore = false;
  let observer = null;
  // view_count arrives with a later migration; without it the list simply shows no views.
  let withViews = true;
  let mostViewedId = null;
  let editing = null;
  let deleting = null;
  let busy = false;
  let loadVersion = 0;
  // Photos of the form, in display order (the first is the cover). Each one is either already
  // stored ("saved"), a file just picked ("new"), or a stored photo to be re-uploaded ("copy").
  let photos = [];
  let photoSeq = 0;
  // Optional 3D model of the form: null, or one item with the same three kinds as the photos.
  let model = null;
  let modelCheck = 0;
  let viewerRequested = false;

  scoped('[data-i18n]').forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  scoped('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t[el.dataset.i18nLabel]); });

  // 401/403 and the PostgREST/Postgres codes for an expired token or a refused policy.
  const isAuthError = (error, status) => {
    const code = Number(error?.status ?? error?.statusCode ?? status);
    return code === 401 || code === 403 || error?.code === '42501' || error?.code === 'PGRST301';
  };
  const failure = (error, status, fallback) => (isAuthError(error, status) ? t.forbidden : fallback);

  function showNotice(text, error = false) {
    notice.classList.toggle('is-error', error);
    notice.textContent = text;
  }
  function showState(text, canRetry = false) {
    stateText.textContent = text;
    retry.hidden = !canRetry;
    state.hidden = !text;
  }
  function setBusy(value, button, label) {
    busy = value;
    for (const el of [dialog, deleteDialog, list]) el.setAttribute('aria-busy', String(value));
    scoped('button').forEach((el) => { el.disabled = value; });
    form.querySelectorAll('input, textarea').forEach((el) => { el.disabled = value; });
    if (button) button.textContent = label;
    // Re-enabling everything would also re-enable "move up" on the first photo, and so on.
    if (!value) renderPhotos();
    modelRemove.disabled = value;
  }

  // One page of products. The order is total (id breaks every tie), so pages never overlap
  // unless something changed in between.
  async function fetchPage(from, to) {
    const run = () => client.from('products').select(withViews ? `${COLUMNS},view_count` : COLUMNS)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: true })
      .range(from, to);
    try {
      let result = await run();
      // 42703: the column does not exist yet. Read the list without it instead of failing.
      if (result.error && withViews && (result.error.code === '42703' || result.status === 400)) {
        withViews = false;
        result = await run();
      }
      return result;
    } catch { return { data: null, error: {}, status: 0 }; }
  }
  // The star goes to the active product with the most views, wherever it is in the list.
  async function fetchMostViewed() {
    if (!withViews) return null;
    try {
      const { data, error } = await client.from('products').select('id,view_count').eq('is_active', true).gt('view_count', 0)
        .order('view_count', { ascending: false }).order('id', { ascending: true }).limit(1);
      return !error && Array.isArray(data) && data.length ? data[0].id : null;
    } catch { return null; }
  }

  // mode: 'end' (nothing more), 'more' (invisible sentinel), 'loading' or 'error'.
  function setMore(mode) {
    more.dataset.mode = mode;
    moreText.textContent = mode === 'loading' ? t.loadingMore : mode === 'error' ? t.moreError : '';
    moreRetry.hidden = mode !== 'error';
  }
  // Re-observing makes the observer report again, which matters when a page did not fill the screen.
  function watch() {
    if (!('IntersectionObserver' in window)) { if (hasMore) loadMore(); return; }
    if (!observer) {
      observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) loadMore(); }, { rootMargin: '300px 0px' });
    }
    observer.unobserve(more);
    if (hasMore) observer.observe(more);
  }

  // (Re)loads from the start, keeping as many rows as were on screen so the person stays in place.
  async function load() {
    const current = ++loadVersion;
    const size = reloadSize(products.length);
    list.setAttribute('aria-busy', 'true');
    if (!products.length) showState(t.loading);
    const { data, error, status } = await fetchPage(0, size - 1);
    const top = error ? null : await fetchMostViewed();
    if (current !== loadVersion) return;
    list.setAttribute('aria-busy', 'false');
    loadingMore = false;
    if (error) {
      products = [];
      hasMore = false;
      render();
      setMore('end');
      watch();
      showState(failure(error, status, t.loadError), true);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    products = freshRows([], rows);
    offset = rows.length;
    hasMore = rows.length === size;
    mostViewedId = top;
    render();
    showState(products.length ? '' : t.empty);
    setMore(hasMore ? 'more' : 'end');
    watch();
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const current = loadVersion;
    loadingMore = true;
    setMore('loading');
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    // The list was reloaded meanwhile: this page belongs to an older view of it.
    if (current !== loadVersion) return;
    loadingMore = false;
    if (error) { setMore('error'); return; }
    const rows = Array.isArray(data) ? data : [];
    const fresh = freshRows(products, rows);
    products = products.concat(fresh);
    offset += rows.length;
    hasMore = rows.length === PAGE_SIZE;
    list.append(...fresh.map(rowFor));
    setMore(hasMore ? 'more' : 'end');
    watch();
  }

  function render() {
    list.replaceChildren(...products.map(rowFor));
  }

  function rowFor(product) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const name = localized(product, 'name', lang);
    const cents = priceCents(product);
    const count = imagePaths(product).length;
    row.classList.toggle('is-inactive', !product.is_active);
    const thumb = row.querySelector('.product-thumb');
    thumb.src = publicUrl(product.image_path);
    thumb.alt = fill(t.photoAlt, { name });
    row.querySelector('.product-name-text').textContent = name;
    const star = row.querySelector('.product-star');
    star.hidden = !(product.is_active && product.id === mostViewedId);
    star.setAttribute('aria-label', t.mostViewed);
    star.title = t.mostViewed;
    const views = viewCount(product);
    row.querySelector('.product-views').textContent = !withViews ? '' : views === 1 ? t.viewsOne : fill(t.viewsMany, { n: new Intl.NumberFormat(lang).format(views) });
    row.querySelector('.product-price').textContent = cents === null ? t.onRequest : formatPrice(cents, lang);
    row.querySelector('.product-photos-count').textContent = count > 1 ? fill(t.photoCount, { n: count }) : '';
    row.querySelector('.product-badge').textContent = product.is_active ? t.active : t.inactive;
    const badge3d = row.querySelector('.product-3d');
    badge3d.hidden = !publicModelUrl(product.model_path);
    badge3d.title = t.has3d;
    badge3d.setAttribute('aria-label', t.has3d);
    row.querySelector('.product-order').textContent = fill(t.orderShort, { n: product.sort_order });
    const actions = {
      edit: [t.edit, t.editLabel, () => openForm(product)],
      duplicate: [t.duplicate, t.duplicateLabel, () => openForm(null, product)],
      toggle: product.is_active ? [t.deactivate, t.deactivateLabel, () => toggle(product)] : [t.activate, t.activateLabel, () => toggle(product)],
      delete: [t.delete, t.deleteLabel, () => openDelete(product)],
    };
    for (const [action, [text, label, handler]] of Object.entries(actions)) {
      const button = row.querySelector(`[data-action="${action}"]`);
      button.textContent = text;
      button.setAttribute('aria-label', fill(label, { name }));
      button.addEventListener('click', handler);
    }
    return row;
  }

  // ---- Form -------------------------------------------------------------
  const field = (name) => form.elements.namedItem(name);
  function setError(input, text) {
    const error = $(`${input.id}-error`);
    error.textContent = text;
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function updateCount(input) {
    const counter = form.querySelector(`[data-count-for="${input.id}"]`);
    if (counter) counter.textContent = `${input.value.length}/${input.maxLength}`;
  }

  // ---- Photos of the form ---------------------------------------------------
  function clearPhotos() {
    for (const photo of photos) if (photo.url) URL.revokeObjectURL(photo.url);
    photos = [];
  }
  // "Cover · 1,2 MB → 180 KB": what was picked and what will actually be uploaded.
  function photoMeta(photo, index) {
    let size = '';
    if (photo.kind === 'new') {
      const original = formatFileSize(photo.file.size, lang);
      size = photo.optimizing ? `${original} · ${t.optimizing}`
        : photo.upload !== photo.file ? `${original} → ${formatFileSize(photo.upload.size, lang)}` : original;
    }
    return [index === 0 ? t.cover : '', size].filter(Boolean).join(' · ');
  }
  function renderPhotos(focus = null) {
    const items = photos.map((photo, index) => {
      const item = photoTemplate.content.firstElementChild.cloneNode(true);
      const n = index + 1;
      const thumb = item.querySelector('.photo-thumb');
      thumb.src = photo.url || publicUrl(photo.path);
      thumb.alt = fill(t.photoThumbAlt, { n });
      // File names are free text typed by someone: they only ever land in textContent.
      item.querySelector('.photo-name').textContent = photo.kind === 'new' ? photo.file.name : photo.kind === 'copy' ? t.copiedPhoto : t.savedPhoto;
      item.dataset.photoId = photo.id;
      item.querySelector('.photo-meta').textContent = photoMeta(photo, index);
      item.classList.toggle('is-cover', index === 0);
      const buttons = {
        cover: [t.makeCoverLabel, index === 0, () => movePhoto(photo, 0, 'cover')],
        up: [t.moveUpLabel, index === 0, () => movePhoto(photo, index - 1, 'up')],
        down: [t.moveDownLabel, index === photos.length - 1, () => movePhoto(photo, index + 1, 'down')],
        remove: [t.removeLabel, false, () => removeFormPhoto(photo)],
      };
      for (const [action, [label, unavailable, handler]] of Object.entries(buttons)) {
        const button = item.querySelector(`[data-photo="${action}"]`);
        if (action === 'cover') { button.textContent = t.makeCover; button.hidden = unavailable; }
        button.setAttribute('aria-label', fill(label, { n }));
        button.disabled = unavailable || busy;
        button.addEventListener('click', handler);
        if (focus && focus.id === photo.id && focus.action === action) item.dataset.focus = action;
      }
      return item;
    });
    photoList.replaceChildren(...items);
    photoList.hidden = !items.length;
    if (!focus) return;
    // Keep the keyboard where it was: same action on the same photo, or the nearest thing left.
    const wanted = photoList.querySelector('[data-focus]');
    const target = wanted && wanted.querySelector(`[data-photo="${wanted.dataset.focus}"]:not(:disabled):not([hidden])`);
    (target || (wanted || photoList).querySelector('button:not(:disabled):not([hidden])') || photoInput).focus();
  }
  function movePhoto(photo, to, action) {
    photos.splice(photos.indexOf(photo), 1);
    photos.splice(to, 0, photo);
    renderPhotos({ id: photo.id, action });
  }
  function removeFormPhoto(photo) {
    const index = photos.indexOf(photo);
    if (photo.url) URL.revokeObjectURL(photo.url);
    photos.splice(index, 1);
    const next = photos[Math.min(index, photos.length - 1)];
    setError(photoInput, '');
    renderPhotos(next ? { id: next.id, action: 'remove' } : { id: -1 });
  }
  function addFiles(files) {
    const problems = [];
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) { problems.push(t.photoMax); break; }
      if (!Object.hasOwn(EXTENSIONS, file.type)) { problems.push(fill(t.photoType, { name: file.name })); continue; }
      if (file.size > MAX_PHOTO_SOURCE_BYTES) { problems.push(fill(t.photoSource, { name: file.name })); continue; }
      const photo = { id: ++photoSeq, kind: 'new', file, url: URL.createObjectURL(file), upload: file, optimizing: true };
      photo.ready = preparePhoto(photo);
      photos.push(photo);
    }
    setError(photoInput, problems.join(' '));
    renderPhotos();
  }

  // Resizes to at most MAX_PHOTO_SIDE and re-encodes as WebP, in the browser. Null whenever
  // that is not possible, and the caller then keeps the original file.
  async function optimizePhoto(file) {
    try {
      // 'from-image' applies the EXIF orientation, so phone photos are not stored sideways.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      // The canvas keeps the alpha channel, so transparent PNGs stay transparent in WebP.
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', PHOTO_QUALITY));
      canvas.width = 0;
      canvas.height = 0;
      // Browsers that cannot encode WebP answer with a PNG instead.
      return blob && blob.type === 'image/webp' ? blob : null;
    } catch { return null; }
  }
  // Decides what will be uploaded for a picked photo and shows the result in its row.
  async function preparePhoto(photo) {
    const optimized = await optimizePhoto(photo.file);
    photo.upload = chooseUpload(photo.file, optimized) === 'optimized' ? optimized : photo.file;
    photo.optimizing = false;
    // Removed, or the form was closed, while it was being processed.
    if (!photos.includes(photo)) return;
    if (!Object.hasOwn(EXTENSIONS, photo.upload.type) || photo.upload.size > MAX_PHOTO_BYTES) {
      // The limits apply to the file that would be stored.
      URL.revokeObjectURL(photo.url);
      photos.splice(photos.indexOf(photo), 1);
      setError(photoInput, fill(t.photoSize, { name: photo.file.name }));
      renderPhotos();
      return;
    }
    // Only the text changes, so whatever has the keyboard focus in the list keeps it.
    const row = photoList.querySelector(`[data-photo-id="${photo.id}"]`);
    if (row) row.querySelector('.photo-meta').textContent = photoMeta(photo, photos.indexOf(photo));
  }

  // ---- 3D model of the form --------------------------------------------------
  async function isGlb(blob) {
    try {
      const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      return head.length === 4 && GLB_MAGIC.every((byte, index) => head[index] === byte);
    } catch { return false; }
  }
  // The viewer is a large script: it is fetched only when a model is actually shown.
  function loadViewer() {
    if (viewerRequested || window.customElements?.get('model-viewer')) return;
    viewerRequested = true;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    document.head.append(script);
  }
  function setModel(next) {
    if (model?.url) URL.revokeObjectURL(model.url);
    model = next;
    renderModel();
  }
  function renderModel() {
    $('product-model-button').textContent = model ? t.replaceModel : t.addModel;
    modelRemove.setAttribute('aria-label', t.removeModel);
    modelRemove.disabled = busy;
    modelItem.hidden = !model;
    const src = model ? model.url || publicModelUrl(model.path) : '';
    const current = modelPreview.firstElementChild;
    if (!src) { modelPreview.replaceChildren(); return; }
    $('product-model-name').textContent = model.kind === 'new' ? model.file.name : model.kind === 'copy' ? t.copiedModel : t.savedModel;
    $('product-model-meta').textContent = model.kind === 'new' ? formatFileSize(model.file.size, lang) : '';
    if (current && current.getAttribute('src') === src) return;
    loadViewer();
    // Same interaction as the lion on the home page: drag to rotate, no pan or zoom.
    const viewer = document.createElement('model-viewer');
    const attributes = {
      src, alt: t.modelAlt, 'camera-controls': '', 'disable-pan': '', 'disable-zoom': '', 'interaction-prompt': 'none',
      'auto-rotate': '', 'auto-rotate-delay': '1500', 'rotation-per-second': '18deg', 'shadow-intensity': '0', exposure: '1', 'environment-image': 'neutral',
    };
    for (const [name, value] of Object.entries(attributes)) viewer.setAttribute(name, value);
    modelPreview.replaceChildren(viewer);
  }
  async function chooseModel(file) {
    const current = ++modelCheck;
    let problem = '';
    if (!/\.glb$/i.test(file.name)) problem = t.modelExt;
    else if (file.size > MAX_MODEL_BYTES) problem = t.modelSize;
    else if (!(await isGlb(file))) problem = t.modelInvalid;
    // The form was closed or another file was picked while this one was being read.
    if (current !== modelCheck || !dialog.open) return;
    setError(modelInput, problem ? fill(problem, { name: file.name }) : '');
    if (!problem) setModel({ kind: 'new', file, url: URL.createObjectURL(file) });
  }

  // Frees what the closed form was holding: photo previews and, above all, the 3D viewer,
  // which must not keep rendering behind a closed dialog.
  function releaseForm() {
    clearPhotos();
    renderPhotos();
    ++modelCheck;
    setModel(null);
    editing = null;
  }

  // source: a product to duplicate (a new product pre-filled from it).
  function openForm(product = null, source = null) {
    if (busy) return;
    editing = product;
    const from = product || source;
    form.reset();
    formError.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
    $('product-form-title').textContent = product ? t.editTitle : source ? t.copyTitle : t.newTitle;
    clearPhotos();
    ++modelCheck;
    setModel(null);
    if (from) {
      for (const code of LANGS) {
        const name = from[`name_${code}`] ?? '';
        field(`name_${code}`).value = source ? copyName(name, COPY_SUFFIX[code], LIMITS.name) : name;
        field(`description_${code}`).value = from[`description_${code}`] ?? '';
      }
      const cents = priceCents(from);
      field('price').value = cents === null ? '' : (cents / 100).toFixed(2);
      field('sort_order').value = from.sort_order;
      // A copy starts hidden, so it never shows up on the site by accident.
      field('is_active').checked = source ? false : from.is_active;
      photos = imagePaths(from).map((path) => ({ id: ++photoSeq, kind: source ? 'copy' : 'saved', path }));
      if (publicModelUrl(from.model_path)) setModel({ kind: source ? 'copy' : 'saved', path: from.model_path });
    }
    renderPhotos();
    form.querySelectorAll('[maxlength]').forEach(updateCount);
    dialog.showModal();
    field('name_pt').focus();
  }

  // Returns the values to store, or null after marking every invalid field.
  function validate() {
    let firstInvalid = null;
    const check = (input, message) => {
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    };
    const values = {};
    for (const code of LANGS) {
      for (const kind of ['name', 'description']) {
        const input = field(`${kind}_${code}`);
        const value = input.value.trim();
        values[`${kind}_${code}`] = value;
        check(input, !value ? t.required : value.length > LIMITS[kind] ? fill(t.tooLong, { max: LIMITS[kind] }) : '');
      }
    }
    const cents = parsePrice(field('price').value);
    values.price_cad_cents = cents;
    check(field('price'), Number.isNaN(cents) ? t.priceInvalid : cents !== null && cents > MAX_PRICE_CENTS ? t.priceTooHigh : '');
    const order = field('sort_order').value.trim() === '' ? 0 : Number(field('sort_order').value);
    values.sort_order = order;
    check(field('sort_order'), Number.isInteger(order) && Math.abs(order) <= 100000 ? '' : t.orderInvalid);
    values.is_active = field('is_active').checked;
    check(photoInput, photos.length ? '' : t.photoRequired);
    if (firstInvalid) {
      formError.textContent = t.fixErrors;
      firstInvalid.focus();
      return null;
    }
    formError.textContent = '';
    return values;
  }

  // Downloads a stored photo so a duplicated product gets files of its own. Null on any problem.
  async function fetchPhoto(path) {
    try {
      const response = await fetch(publicUrl(path), { credentials: 'omit' });
      if (!response.ok) return null;
      const blob = await response.blob();
      const type = blob.type.split(';')[0].trim().toLowerCase();
      if (!Object.hasOwn(EXTENSIONS, type) || !blob.size || blob.size > MAX_PHOTO_BYTES) return null;
      return { blob, type };
    } catch { return null; }
  }

  // Same for the 3D model of a duplicated product.
  async function fetchModel(path) {
    try {
      const response = await fetch(publicModelUrl(path), { credentials: 'omit' });
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_MODEL_BYTES || !(await isGlb(blob))) return null;
      return blob;
    } catch { return null; }
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const values = validate();
    if (!values) return;
    const modelItemToSave = model;
    const target = editing;
    const oldPaths = target ? imagePaths(target) : [];
    const oldModel = target && publicModelUrl(target.model_path) ? target.model_path : '';
    setBusy(true, saveButton, t.saving);
    // Photos picked a moment ago may still be being optimised.
    await Promise.all(photos.map((photo) => photo.ready));
    const items = photos.slice();
    if (!items.length) {
      setBusy(false, saveButton, t.save);
      if (!photoInput.hasAttribute('aria-invalid')) setError(photoInput, t.photoRequired);
      formError.textContent = t.fixErrors;
      return;
    }
    const uploaded = [];
    let failed = '';
    let uncertain = false;
    let writing = false;
    try {
      const paths = [];
      for (const item of items) {
        if (item.kind === 'saved') { paths.push(item.path); continue; }
        // For a picked photo this is the optimised WebP, or the original when that was not better.
        let body = item.upload;
        let type = item.upload?.type;
        if (item.kind === 'copy') {
          const copy = await fetchPhoto(item.path);
          if (!copy) { failed = t.copyError; break; }
          ({ blob: body, type } = copy);
        }
        const path = `${crypto.randomUUID()}.${EXTENSIONS[type]}`;
        const { error } = await client.storage.from(BUCKET).upload(path, body, { contentType: type, cacheControl: '31536000', upsert: false });
        if (error) { failed = failure(error, null, t.photoUploadError); break; }
        uploaded.push({ bucket: BUCKET, path });
        paths.push(path);
      }
      let modelPath = null;
      if (!failed && modelItemToSave) {
        if (modelItemToSave.kind === 'saved') modelPath = modelItemToSave.path;
        else {
          const body = modelItemToSave.kind === 'copy' ? await fetchModel(modelItemToSave.path) : modelItemToSave.file;
          if (!body) failed = t.copyError;
          else {
            const path = `${crypto.randomUUID()}.glb`;
            // Browsers report no type for .glb files, and the upload sends the Blob's own type
            // (not the contentType option), which the bucket would refuse as octet-stream.
            const typed = new Blob([body], { type: MODEL_TYPE });
            const { error } = await client.storage.from(MODEL_BUCKET).upload(path, typed, { contentType: MODEL_TYPE, cacheControl: '31536000', upsert: false });
            if (error) failed = failure(error, null, t.modelUploadError);
            else { uploaded.push({ bucket: MODEL_BUCKET, path }); modelPath = path; }
          }
        }
      }
      if (!failed) {
        const row = { ...values, image_path: paths[0], extra_image_paths: paths.slice(1), model_path: modelPath };
        writing = true;
        let result;
        try {
          result = await (target
            ? client.from('products').update(row).eq('id', target.id).select('id')
            : client.from('products').insert(row).select('id'));
        } catch { result = { error: {}, status: 0 }; }
        const { data, error, status } = result;
        if (error || !Array.isArray(data) || !data.length) {
          // A write refused by a policy can come back as "no rows" instead of an error.
          failed = error ? failure(error, status, t.saveError) : t.forbidden;
          // Only a 4xx answer proves nothing was written. Otherwise the product may have been
          // saved and the answer lost, so check what the database holds before touching files.
          if (!(status >= 400 && status < 500)) {
            const written = uploaded.length ? await isReferenced(uploaded[0].path) : (error ? null : false);
            if (written === true) failed = '';
            else if (written === null) uncertain = true;
          }
        }
        if (!failed && !uncertain) {
          // Confirmed written: files the product no longer points at can go.
          await removeFiles(BUCKET, oldPaths.filter((path) => !paths.includes(path)));
          if (oldModel && oldModel !== modelPath) await removeFiles(MODEL_BUCKET, [oldModel]);
        }
      }
      if (uncertain) {
        // Unknown outcome: keep every photo rather than risk a product without images.
        failed = t.uncertain;
      } else if (failed) {
        // Confirmed not written: do not leave the new files behind.
        await removeUploads(uploaded);
      }
    } catch {
      if (writing) {
        uncertain = true;
        failed = t.uncertain;
      } else {
        // Nothing was sent to the database yet, so the uploads are certainly unused.
        await removeUploads(uploaded);
        failed = t.photoUploadError;
      }
    }
    setBusy(false, saveButton, t.save);
    if (failed) {
      formError.textContent = failed;
      saveButton.focus();
      if (uncertain) load();
      return;
    }
    dialog.close();
    // Do not wait for the close event to let go of the previews and the 3D viewer.
    releaseForm();
    showNotice(target ? t.saved : t.created);
    await load();
  }

  // Whether any product points at this file, as cover, extra photo or 3D model: true, false, or
  // null when it cannot be checked. The path is one this page generated (UUID plus extension).
  async function isReferenced(path) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path)) return null;
    try {
      const { data, error } = await client.from('products').select('id')
        .or(`image_path.eq.${path},extra_image_paths.cs.{${path}},model_path.eq.${path}`).limit(1);
      return error || !Array.isArray(data) ? null : data.length > 0;
    } catch { return null; }
  }

  // Best effort: a leftover file is harmless, and a failed cleanup must not undo a saved product.
  // Reports whether the files are really gone, so nothing claims a cleanup that did not happen.
  async function removeFiles(bucket, paths) {
    if (!paths.length) return true;
    try {
      const { data, error } = await client.storage.from(bucket).remove(paths);
      if (!error && Array.isArray(data) && data.length === paths.length) return true;
    } catch { /* reported below */ }
    console.warn('Imaginne admin: some product files could not be removed from storage.');
    return false;
  }
  // Uploads of one save, which may span the photo and the model buckets.
  async function removeUploads(uploads) {
    for (const bucket of [BUCKET, MODEL_BUCKET]) {
      await removeFiles(bucket, uploads.filter((item) => item.bucket === bucket).map((item) => item.path));
    }
  }

  // ---- Row actions --------------------------------------------------------
  async function toggle(product) {
    if (busy) return;
    const activate = !product.is_active;
    setBusy(true);
    let failed = '';
    try {
      const { data, error, status } = await client.from('products').update({ is_active: activate }).eq('id', product.id).select('id');
      if (error) failed = failure(error, status, t.toggleError);
      else if (!Array.isArray(data) || !data.length) failed = t.forbidden;
    } catch { failed = t.toggleError; }
    setBusy(false);
    showNotice(failed || (activate ? t.activated : t.deactivated), !!failed);
    if (!failed) await load();
  }

  function openDelete(product) {
    if (busy) return;
    deleting = product;
    deleteError.textContent = '';
    $('product-delete-text').textContent = fill(t.deleteText, { name: localized(product, 'name', lang) });
    deleteDialog.showModal();
  }

  async function confirmDelete() {
    if (busy || !deleting) return;
    const target = deleting;
    setBusy(true, deleteConfirm, t.deleting);
    let failed = '';
    try {
      const { data, error, status } = await client.from('products').delete().eq('id', target.id).select('id');
      if (error) failed = failure(error, status, t.deleteError);
      else if (!Array.isArray(data) || !data.length) failed = t.forbidden;
      // Only after the row is gone, so a refused delete never loses the files.
      else {
        await removeFiles(BUCKET, imagePaths(target));
        if (publicModelUrl(target.model_path)) await removeFiles(MODEL_BUCKET, [target.model_path]);
      }
    } catch { failed = t.deleteError; }
    setBusy(false, deleteConfirm, t.delete);
    if (failed) {
      deleteError.textContent = failed;
      deleteConfirm.focus();
      return;
    }
    deleteDialog.close();
    showNotice(t.deleted);
    await load();
  }

  // ---- Wiring -------------------------------------------------------------
  $('product-new').addEventListener('click', () => openForm());
  retry.addEventListener('click', load);
  moreRetry.addEventListener('click', () => { if (!busy) loadMore(); });
  form.addEventListener('submit', save);
  form.addEventListener('input', (event) => {
    const input = event.target;
    if (input.maxLength > 0) updateCount(input);
    if (input.hasAttribute('aria-invalid') && input !== photoInput && input !== modelInput) setError(input, '');
  });
  photoInput.addEventListener('change', () => {
    const files = [...photoInput.files];
    // The picker is only a way in: the chosen files live in the list, so the same file can be
    // picked again and the browser's own "no file chosen" text never has anything to say.
    photoInput.value = '';
    if (files.length) addFiles(files);
  });
  modelInput.addEventListener('change', () => {
    const file = modelInput.files[0];
    modelInput.value = '';
    if (file) chooseModel(file);
  });
  modelRemove.addEventListener('click', () => {
    ++modelCheck;
    setError(modelInput, '');
    setModel(null);
    modelInput.focus();
  });
  deleteConfirm.addEventListener('click', confirmDelete);
  for (const el of [dialog, deleteDialog]) {
    el.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => el.close()));
    // Esc must not discard the dialog in the middle of a request.
    el.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  }
  // The close event arrives a moment after close(); by then the form may already be open again.
  dialog.addEventListener('close', () => { if (!dialog.open) releaseForm(); });
  deleteDialog.addEventListener('close', () => { if (!deleteDialog.open) deleting = null; });

  load();
}
