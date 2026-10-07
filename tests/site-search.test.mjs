import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sources = Object.fromEntries(['search-box', 'product-search', 'products', 'catalogue'].map(name => [name, readFileSync(new URL(`../public/assets/js/${name}.js`, import.meta.url), 'utf8')]));
const stripModule = source => source.replace(/^import .*;\r?\n/gm, '').replace(/^export \{.*\};\r?\n/gm, '').replace(/\bexport (?=(?:async )?function|const)/g, '');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
class FakeEvent {
  constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
  preventDefault() {}
  stopPropagation() {}
}

// Small DOM substitute for loading/search state, not rendering or animation assertions.
class Element {
  constructor(tag = 'div', document) {
    this.tagName = tag.toUpperCase(); this.document = document;
    this.children = []; this.attributes = new Map(); this.listeners = new Map();
    this.className = ''; this.textContent = ''; this.value = ''; this.scrollLeft = 0;
    this.hidden = false; this.disabled = false;
    this.classList = {
      contains: value => this.className.split(/\s+/).includes(value),
      add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
      remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(' '); },
    };
  }
  get firstElementChild() { return this.children[0] || null; }
  get clientWidth() { return this.hidden ? 0 : 400; }
  get scrollWidth() { return this.hidden ? 0 : this.children.length * 100; }
  get isConnected() { return !!this.parent || !!this.connected; }
  append(...nodes) {
    for (const node of nodes) {
      if (node.tagName === '#FRAGMENT') { this.append(...[...node.children]); continue; }
      node.remove(); node.parent = this; this.children.push(node);
    }
  }
  replaceChildren(...nodes) { this.children.forEach(node => { node.parent = null; }); this.children = []; this.append(...nodes); }
  before(node) { node.parent = this.parent; this.parent?.children.splice(this.parent.children.indexOf(this), 0, node); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, callback) { const callbacks = this.listeners.get(name) || []; callbacks.push(callback); this.listeners.set(name, callbacks); }
  dispatchEvent(event) { event.target ||= this; for (const callback of this.listeners.get(event.type) || []) callback(event); }
  click() { this.dispatchEvent(new FakeEvent('click')); }
  focus() { this.document.activeElement = this; }
  hasPointerCapture() { return false; }
  getBoundingClientRect() { return { width: 100, height: 100, top: 100000 }; }
  querySelector(selector) {
    if (this.selectors?.has(selector)) return this.selectors.get(selector);
    const match = node => selector.startsWith('.') ? node.classList.contains(selector.slice(1)) : node.tagName === selector.toUpperCase();
    for (const child of this.children) { if (match(child)) return child; const found = child.querySelector(selector); if (found) return found; }
    return null;
  }
}

function fixture(surface, href = 'https://site.example.invalid/products/?keep=1#catalogue', withObserver = true) {
  const document = { querySelector: () => null, readyState: 'complete', activeElement: null };
  document.createElement = tag => new Element(tag, document);
  document.createElementNS = (_, tag) => document.createElement(tag);
  document.createDocumentFragment = () => document.createElement('#fragment');
  document.body = document.createElement('body');
  const listeners = new Map();
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name), innerHeight: 800,
  };
  const Observer = class { observe() {} unobserve() {} disconnect() {} };
  if (withObserver) window.IntersectionObserver = Observer;
  const location = { href };
  const history = { state: { preserved: true }, replaceState: (_, __, url) => { location.href = String(url); } };
  const run = (name, exports, extra = {}) => {
    const values = { document, window, location, history, IntersectionObserver: Observer, Event: FakeEvent, KeyboardEvent: FakeEvent,
      requestAnimationFrame: () => 1, cancelAnimationFrame() {}, getComputedStyle: () => ({ columnGap: '0' }), ...extra };
    return new Function(...Object.keys(values), stripModule(sources[name]) + `\nreturn { ${exports} };`)(...Object.values(values));
  };
  const component = run('search-box', 'createSearchBox, searchFilter, searchTerm');
  const helpers = run('product-search', 'mountProductSearch, productSearchCopy, productSearchFilter, searchTerm', component);
  const module = run(surface === 'carousel' ? 'products' : 'catalogue', surface === 'carousel' ? 'mountProductCarousel' : 'mountCatalogue', helpers);
  const root = document.createElement('section'); root.connected = true; root.selectors = new Map();
  const keys = surface === 'carousel' ? ['track', 'status', 'previous', 'next', 'search'] : ['grid', 'sentinel', 'loading', 'message', 'retry', 'status', 'search'];
  const nodes = Object.fromEntries(keys.map(key => [key, document.createElement(key === 'track' || key === 'grid' ? 'ul' : 'div')]));
  for (const [key, node] of Object.entries(nodes)) {
    root.selectors.set(`[data-${surface === 'carousel' ? 'products' : 'catalogue'}-${key}]`, node);
    root.append(node);
  }
  const calls = []; let featuredCalls = 0;
  const handlers = {
    productLanguage: 'en', productCopy: { retry: 'Try again', loadingProducts: 'Loading more…', retryProducts: 'Could not load more.', empty: 'New pieces soon.', position: 'Products' },
    featuredProduct: async () => { featuredCalls++; return { id: 'featured' }; },
    requestProducts: async options => { calls.push({ ...options }); return [{ id: 'normal' }]; },
    maintenanceMode: async () => false,
    createProductCard: (product, options) => { const card = document.createElement('li'); card.product = product; card.highlighted = options.featured; return card; },
  };
  // Preserve captured function references while allowing each test to replace its response.
  const api = new Proxy(handlers, {
    get: (target, key) => typeof target[key] === 'function' ? (...args) => target[key](...args) : target[key],
  });
  const mount = () => surface === 'carousel' ? module.mountProductCarousel(root, api) : module.mountCatalogue(root, api);
  return { root, nodes, api, calls, mount, helpers, location, listeners, featuredCalls: () => featuredCalls };
}

for (const surface of ['carousel', 'catalogue']) {
  test(`${surface}: searching paginates only matches, clearing restores the featured normal list`, async () => {
    const f = fixture(surface); const view = await f.mount(); await view.loadNext?.();
    const normalFeaturedCalls = f.featuredCalls();
    const calls = [];
    f.api.requestProducts = async query => { calls.push({ ...query }); return query.offset === '0' ? Array.from({ length: 12 }, (_, i) => ({ id: 'match-' + i })) : [{ id: 'match-last' }]; };
    await view.search('vaso');
    await (surface === 'carousel' ? view.loadMore(true) : view.loadNext());
    assert.equal(f.featuredCalls(), normalFeaturedCalls);
    assert.deepEqual(calls.map(query => query.offset), ['0', '12']);
    assert.ok(calls.every(query => !query.id && query.or.includes('description_es.ilike') && query.or.includes('name_pt.ilike')));
    const cards = f.nodes.track || f.nodes.grid;
    assert.equal(cards.children.length, 13);
    assert.ok(cards.children.every(card => !card.highlighted));
    f.api.requestProducts = async query => { calls.push({ ...query }); return [{ id: 'restored' }]; };
    await view.search('');
    assert.equal(f.featuredCalls(), normalFeaturedCalls + 1);
    assert.equal(calls.at(-1).offset, '0'); assert.equal(calls.at(-1).id, 'neq.featured');
    assert.equal(calls.at(-1).or, undefined);
    assert.equal(cards.children[0].product.id, 'featured');
  });

  test(`${surface}: stale success, stale rejection and stale page cannot mutate the newest search`, async () => {
    const f = fixture(surface); const view = await f.mount(); await view.loadNext?.();
    const old = deferred(), latest = deferred();
    f.api.requestProducts = query => query.or.includes('*old*') ? old.promise : latest.promise;
    const olderRun = view.search('old'); const latestRun = view.search('latest');
    old.resolve([{ id: 'obsolete' }]); await olderRun;
    assert.equal((f.nodes.track || f.nodes.grid).children.length, 0);
    assert.equal((surface === 'carousel' ? f.nodes.track : f.root).getAttribute('aria-busy'), 'true');
    latest.resolve([{ id: 'current' }]); await latestRun;
    assert.equal((f.nodes.track || f.nodes.grid).children[0].product.id, 'current');
    const error = deferred();
    f.api.requestProducts = query => query.or.includes('*error*') ? error.promise : Promise.resolve([{ id: 'newest' }]);
    const rejectedRun = view.search('error'); await view.search('newest');
    error.reject(new Error('synthetic backend details')); await rejectedRun;
    assert.equal((f.nodes.track || f.nodes.grid).children[0].product.id, 'newest');
    const page = deferred();
    f.api.requestProducts = async () => Array.from({ length: 12 }, (_, i) => ({ id: 'page-' + i }));
    await view.search('paged');
    f.api.requestProducts = query => query.offset === '12' ? page.promise : Promise.resolve([{ id: 'replacement' }]);
    const oldPage = surface === 'carousel' ? view.loadMore(true) : view.loadNext();
    await view.search('replacement'); page.resolve([{ id: 'late-page' }]); await oldPage;
    assert.deepEqual((f.nodes.track || f.nodes.grid).children.map(card => card.product.id), ['replacement']);
  });

  test(`${surface}: an obsolete featured lookup cannot start an unfiltered request`, async () => {
    const f = fixture(surface); const view = await f.mount(); await view.loadNext?.();
    const featured = deferred(); const queries = [];
    f.api.featuredProduct = () => featured.promise;
    f.api.requestProducts = async query => { queries.push(query); return [{ id: 'filtered' }]; };
    const normal = view.search(''); await view.search('latest');
    featured.resolve({ id: 'obsolete-featured' }); await normal;
    assert.equal(queries.length, 1); assert.ok(queries[0].or.includes('*latest*'));
  });

  test(`${surface}: empty results retain search and errors offer retry without backend details`, async () => {
    const f = fixture(surface); const view = await f.mount(); await view.loadNext?.();
    f.api.requestProducts = async () => [];
    await view.search('<img onerror=1>');
    const message = surface === 'carousel' ? f.nodes.track.parent.children.find(node => node.classList.contains('products-search-feedback')).children[0] : f.nodes.message;
    assert.match(message.textContent, /<img onerror=1>/); assert.equal(message.children.length, 0);
    if (surface === 'carousel') { assert.equal(f.nodes.previous.disabled, true); assert.equal(f.nodes.next.disabled, true); }
    f.api.requestProducts = async () => { throw new Error('private SQL detail'); };
    await view.search('retry-term');
    assert.ok(!message.textContent.includes('private SQL detail'));
    const button = surface === 'carousel' ? message.parent.children[1] : f.nodes.retry;
    assert.equal(button.hidden, false);
    let retried;
    f.api.requestProducts = async query => { retried = query; return [{ id: 'retried' }]; };
    button.focus(); button.click(); await flush();
    assert.ok(retried.or.includes('*retry-term*'));
    assert.equal((f.nodes.track || f.nodes.grid).children[0].product.id, 'retried');
    if (surface === 'carousel') assert.equal(f.nodes.track.document.activeElement, f.nodes.track);
  });
}

test('catalogue: URL search is restored through the real component and the first clear restores normal results', async () => {
  const f = fixture('catalogue', 'https://site.example.invalid/pt/products/?q=vaso&keep=1#catalogue');
  const view = f.mount(); await flush();
  assert.equal(f.featuredCalls(), 0);
  assert.ok(f.calls[0].or.includes('*vaso*'));
  const input = f.nodes.search.querySelector('input'); assert.equal(input.value, 'vaso');
  input.value = ''; input.dispatchEvent(new FakeEvent('input')); await flush();
  assert.equal(f.featuredCalls(), 1);
  const url = new URL(f.location.href); assert.equal(url.searchParams.has('q'), false);
  assert.equal(url.searchParams.get('keep'), '1'); assert.equal(url.hash, '#catalogue');
  assert.equal(f.nodes.grid.children[0].product.id, 'featured');
  await view.search('quotes " & (a)');
  assert.equal(new URL(f.location.href).searchParams.get('q'), 'quotes " & (a)');
});

test('catalogue: fallback infinite scroll stays available after an exhausted search is cleared', async () => {
  const f = fixture('catalogue', undefined, false); const view = f.mount(); await view.loadNext();
  f.api.requestProducts = async () => [];
  await view.search('empty'); assert.equal(f.nodes.sentinel.hidden, true);
  f.api.requestProducts = async () => Array.from({ length: 12 }, (_, i) => ({ id: 'fresh-' + i }));
  await view.search('more');
  assert.equal(f.nodes.sentinel.hidden, false); assert.ok(f.listeners.has('scroll'));
});
