import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  CURRENCY, MAX_PHOTOS, MAX_PHOTO_SIDE, PAGE_SIZE, chooseUpload, copyName, fitWithin, freshRows, reloadSize, viewCount, formatFileSize, formatPrice, imagePaths, imageUrl, localized, modelUrl, parsePrice, priceCents,
} from './format';

// Intl separates the symbol with a no-break space in some locales.
const plain = (text: string) => text.replace(/[  ]/g, ' ');

test('parsePrice reads comma and dot decimals as cents', () => {
  assert.equal(parsePrice('49,90'), 4990);
  assert.equal(parsePrice('49.90'), 4990);
  assert.equal(parsePrice('49,9'), 4990);
  assert.equal(parsePrice('49'), 4900);
  assert.equal(parsePrice('0,05'), 5);
  assert.equal(parsePrice('0'), 0);
  assert.equal(parsePrice(' 12,50 '), 1250);
  assert.equal(parsePrice('19.99'), 1999);
});

test('parsePrice understands thousands separators in both styles', () => {
  assert.equal(parsePrice('1.234,56'), 123456);
  assert.equal(parsePrice('1,234.56'), 123456);
  assert.equal(parsePrice('1.234.567,89'), 123456789);
  assert.equal(parsePrice('1.234'), 123400);
  assert.equal(parsePrice('1,234'), 123400);
  assert.equal(parsePrice('1 234,56'), 123456);
  // A single mark followed by exactly three digits is read as thousands, not as decimals.
  assert.equal(parsePrice('12,345'), 1234500);
});

test('parsePrice accepts an optional Canadian dollar marker', () => {
  assert.equal(parsePrice('CA$ 49,90'), 4990);
  assert.equal(parsePrice('$49.90'), 4990);
  assert.equal(parsePrice('49.90 CAD'), 4990);
});

test('parsePrice returns null for an empty value', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('   '), null);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice(undefined), null);
});

test('parsePrice returns NaN for invalid or negative amounts', () => {
  for (const text of ['abc', '-5', '-49,90', '12,3456', '1.23.4', '1,2,3', '49,90,1', '4 9x', '1e3',
    '49.9012', ',50', '.', '1..2', '12.34,567', '1,23.45', '+5', '99999999999999999999']) {
    assert.ok(Number.isNaN(parsePrice(text)), `expected NaN for "${text}"`);
  }
});

test('formatPrice always names the Canadian dollar, in every language', () => {
  assert.equal(CURRENCY, 'CAD');
  assert.equal(plain(formatPrice(4990, 'pt')), 'CA$ 49,90');
  assert.equal(plain(formatPrice(4990, 'en')), '$49.90 CAD');
  // Spanish data spells the currency as a code or a symbol depending on the ICU version.
  assert.match(plain(formatPrice(4990, 'es')), /^49,90 (CAD|CA\$)$/);
  for (const lang of ['pt', 'en', 'es', 'xx']) {
    assert.match(formatPrice(123456, lang), /CA\$|CAD/, `currency missing for ${lang}`);
  }
  assert.equal(plain(formatPrice(123456, 'pt')), 'CA$ 1.234,56');
  assert.equal(plain(formatPrice(123456, 'en')), '$1,234.56 CAD');
  assert.equal(plain(formatPrice(0, 'en')), '$0.00 CAD');
});

test('formatPrice returns an empty string when there is no price', () => {
  assert.equal(formatPrice(null, 'pt'), '');
  assert.equal(formatPrice(undefined, 'en'), '');
  assert.equal(formatPrice(NaN, 'es'), '');
});

test('priceCents returns the single CAD price or null', () => {
  assert.equal(priceCents({ price_cad_cents: 4990 }), 4990);
  assert.equal(priceCents({ price_cad_cents: 0 }), 0);
  assert.equal(priceCents({ price_cad_cents: null }), null);
  assert.equal(priceCents({}), null);
  assert.equal(priceCents({ price_cad_cents: '4990' }), null);
  assert.equal(priceCents(null), null);
  // The price never depends on the language.
  // @ts-expect-error -- a second argument is ignored: the price never depends on the language.
  assert.equal(priceCents({ price_cad_cents: 4990, price_brl_cents: 1 }, 'pt'), 4990);
});

test('localized picks the language and falls back to Portuguese', () => {
  const product = {
    name_pt: 'Vaso', name_en: 'Vase', name_es: '',
    description_pt: 'Feito sob encomenda', description_en: '   ', description_es: 'Hecho a pedido',
  };
  assert.equal(localized(product, 'name', 'en'), 'Vase');
  assert.equal(localized(product, 'name', 'pt'), 'Vaso');
  assert.equal(localized(product, 'name', 'es'), 'Vaso');
  assert.equal(localized(product, 'description', 'es'), 'Hecho a pedido');
  assert.equal(localized(product, 'description', 'en'), 'Feito sob encomenda');
  assert.equal(localized(product, 'name', 'fr'), 'Vaso');
  assert.equal(localized(product, 'image_path', 'pt'), '');
  assert.equal(localized(null, 'name', 'pt'), '');
  assert.equal(localized({ name_en: 'Only English' }, 'name', 'es'), '');
});

test('imageUrl builds the public bucket URL and encodes each segment', () => {
  const base = 'https://example.supabase.co';
  const prefix = `${base}/storage/v1/object/public/product-images/`;
  assert.equal(imageUrl(base, 'abc.webp'), `${prefix}abc.webp`);
  assert.equal(imageUrl(`${base}/`, 'folder/abc.png'), `${prefix}folder/abc.png`);
  assert.equal(imageUrl(base, 'a b/c#d?.jpg'), `${prefix}a%20b/c%23d%3F.jpg`);
  assert.equal(imageUrl(base, 'x"><script>.png'), `${prefix}x%22%3E%3Cscript%3E.png`);
  assert.equal(imageUrl(base, 'ação/ñ.png'), `${prefix}a%C3%A7%C3%A3o/%C3%B1.png`);
  assert.equal(imageUrl(base, ''), '');
  assert.equal(imageUrl(base, null), '');
  assert.equal(imageUrl(undefined, 'abc.webp'), '');
});

test('imagePaths lists the cover first, then the extras, up to six', () => {
  assert.equal(MAX_PHOTOS, 6);
  assert.deepEqual(imagePaths({ image_path: 'a.png', extra_image_paths: ['b.png', 'c.webp'] }), ['a.png', 'b.png', 'c.webp']);
  assert.deepEqual(imagePaths({ image_path: 'a.png' }), ['a.png']);
  assert.deepEqual(imagePaths({ image_path: 'a.png', extra_image_paths: null }), ['a.png']);
  assert.deepEqual(imagePaths({ image_path: 'a.png', extra_image_paths: ['', null, 7, 'b.png'] }), ['a.png', 'b.png']);
  assert.deepEqual(imagePaths({ image_path: 'a', extra_image_paths: ['b', 'c', 'd', 'e', 'f', 'g', 'h'] }), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(imagePaths(null), []);
  assert.deepEqual(imagePaths({}), []);
});

test('formatFileSize uses the number style of the language', () => {
  assert.equal(formatFileSize(1258291, 'pt'), '1,2 MB');
  assert.equal(formatFileSize(1258291, 'en'), '1.2 MB');
  assert.equal(formatFileSize(1258291, 'es'), '1,2 MB');
  assert.equal(formatFileSize(5 * 1024 * 1024, 'pt'), '5 MB');
  assert.equal(formatFileSize(348160, 'en'), '340 KB');
  assert.equal(formatFileSize(512, 'pt'), '512 B');
  assert.equal(formatFileSize(0, 'en'), '0 B');
  assert.equal(formatFileSize(-1, 'en'), '');
  assert.equal(formatFileSize(NaN, 'en'), '');
});

test('copyName adds the suffix without passing the limit', () => {
  assert.equal(copyName('Vaso', ' (cópia)'), 'Vaso (cópia)');
  assert.equal(copyName('  Vase  ', ' (copy)'), 'Vase (copy)');
  const long = 'x'.repeat(120);
  const copy = copyName(long, ' (copy)');
  assert.equal(copy.length, 120);
  assert.ok(copy.endsWith(' (copy)'));
  assert.equal(copyName('y'.repeat(115), ' (cópia)').length, 120);
  // Cut on whole characters, never in the middle of an emoji.
  const emoji = copyName('🦁'.repeat(120), ' (copy)');
  assert.equal(Array.from(emoji).length, 120);
  assert.ok(!/\uFFFD/.test(emoji) && emoji.endsWith(' (copy)'));
  assert.equal(copyName('', ' (copy)'), '(copy)');
  assert.equal(copyName('Vaso', ' (cópia)', 8), ' (cópia)'.trim());
});

test('modelUrl builds the public URL in the product-models bucket, only for .glb paths', () => {
  const base = 'https://example.supabase.co';
  const prefix = `${base}/storage/v1/object/public/product-models/`;
  assert.equal(modelUrl(base, 'abc.glb'), `${prefix}abc.glb`);
  assert.equal(modelUrl(`${base}/`, 'folder/abc.glb'), `${prefix}folder/abc.glb`);
  // Anything the database would refuse as a model path yields nothing, so it never reaches
  // the 3D viewer.
  for (const path of ['abc.png', 'abc.gltf', 'abc.glb.exe', 'abc', 'glb', '', null, undefined, 42,
    'ABC.GLB', 'a b/c#d.glb', 'x"><script>.glb', '../a.glb', 'a/../b.glb', 'https://example.invalid/a.glb', '/a.glb']) {
    assert.equal(modelUrl(base, path), '', String(path));
  }
  assert.equal(modelUrl(undefined, 'abc.glb'), '');
  // imageUrl keeps pointing at the photo bucket.
  assert.equal(imageUrl(base, 'abc.png'), `${base}/storage/v1/object/public/product-images/abc.png`);
});

test('reloadSize asks for whole pages covering what was on screen', () => {
  assert.equal(PAGE_SIZE, 12);
  assert.equal(reloadSize(0), 12);
  assert.equal(reloadSize(1), 12);
  assert.equal(reloadSize(12), 12);
  assert.equal(reloadSize(13), 24);
  assert.equal(reloadSize(36), 36);
  assert.equal(reloadSize(37), 48);
  assert.equal(reloadSize(5, 4), 8);
  for (const bad of [-3, 2.5, NaN, null, undefined, '12']) assert.equal(reloadSize(bad), 12, String(bad));
});

test('freshRows keeps only rows that are not on screen yet, in order', () => {
  const shown = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(freshRows(shown, [{ id: 'b' }, { id: 'c' }, { id: 'd' }]), [{ id: 'c' }, { id: 'd' }]);
  assert.deepEqual(freshRows(shown, [{ id: 'a' }, { id: 'b' }]), []);
  assert.deepEqual(freshRows([], [{ id: 'x' }, { id: 'y' }]), [{ id: 'x' }, { id: 'y' }]);
  // A page that repeats a row within itself, or carries rows without an id, is cleaned too.
  assert.deepEqual(freshRows(shown, [{ id: 'c' }, { id: 'c' }, {}, null, { id: null }, { id: 'e' }]), [{ id: 'c' }, { id: 'e' }]);
  assert.deepEqual(freshRows(null, null), []);
  assert.deepEqual(freshRows(shown, 'nope'), []);
  // The lists on screen are never changed in place.
  assert.deepEqual(shown, [{ id: 'a' }, { id: 'b' }]);
});

test('viewCount reads the counter and tolerates a missing column', () => {
  assert.equal(viewCount({ view_count: 42 }), 42);
  assert.equal(viewCount({ view_count: '1500' }), 1500);
  assert.equal(viewCount({ view_count: 0 }), 0);
  for (const product of [{}, { view_count: null }, { view_count: -4 }, { view_count: 'abc' }, { view_count: NaN }, null, undefined]) {
    assert.equal(viewCount(product), 0);
  }
  assert.equal(viewCount({ view_count: 7.9 }), 7);
});

test('fitWithin shrinks to the longest side, keeps the proportion and never enlarges', () => {
  assert.equal(MAX_PHOTO_SIDE, 1400);
  assert.deepEqual(fitWithin(4000, 3000), { width: 1400, height: 1050 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 1050, height: 1400 });
  assert.deepEqual(fitWithin(2800, 2800), { width: 1400, height: 1400 });
  assert.deepEqual(fitWithin(1400, 900), { width: 1400, height: 900 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(1401, 1), { width: 1400, height: 1 });
  assert.deepEqual(fitWithin(6000, 10), { width: 1400, height: 2 });
  assert.deepEqual(fitWithin(1000, 500, 100), { width: 100, height: 50 });
  // The proportion survives within a pixel of rounding.
  for (const [w, h] of [[4032, 3024], [5184, 3456], [1920, 1080], [3000, 2001], [7, 4999]]) {
    const out = fitWithin(w, h);
    assert.ok(Math.max(out.width, out.height) <= 1400);
    assert.ok(Math.abs(out.width / out.height - w / h) <= (w / h) * (1 / Math.min(out.width, out.height)), `${w}x${h}`);
  }
  for (const [w, h] of [[0, 100], [100, 0], [-5, 10], [NaN, 10], ['x', 10], [10, undefined]]) {
    assert.deepEqual(fitWithin(w, h), { width: 0, height: 0 });
  }
});

test('chooseUpload takes the optimised file only when it is a smaller WebP', () => {
  const original = { size: 1200000, type: 'image/jpeg' };
  assert.equal(chooseUpload(original, { size: 180000, type: 'image/webp' }), 'optimized');
  // Not smaller, not WebP (the browser fell back to PNG), empty, or missing: keep the original.
  assert.equal(chooseUpload(original, { size: 1200000, type: 'image/webp' }), 'original');
  assert.equal(chooseUpload(original, { size: 1500000, type: 'image/webp' }), 'original');
  assert.equal(chooseUpload(original, { size: 90000, type: 'image/png' }), 'original');
  assert.equal(chooseUpload(original, { size: 0, type: 'image/webp' }), 'original');
  assert.equal(chooseUpload(original, null), 'original');
  assert.equal(chooseUpload(original, undefined), 'original');
  assert.equal(chooseUpload(null, { size: 10, type: 'image/webp' }), 'original');
  // A WebP original is still replaced when the new one is smaller.
  assert.equal(chooseUpload({ size: 900000, type: 'image/webp' }, { size: 200000, type: 'image/webp' }), 'optimized');
});
