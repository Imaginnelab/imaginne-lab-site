import { createSearchBox, searchFilter, searchTerm } from '/assets/js/search-box.js';

const COLUMNS = ['name_pt', 'name_en', 'name_es', 'description_pt', 'description_en', 'description_es'];
const COPY = {
  en: { open: 'Search products', field: 'Search products', clear: 'Clear search', searching: 'Searching products…', loading: 'Loading products…', error: 'We could not load the products. Please try again.', noResults: term => `No products found for “${term}”. Try another search.` },
  pt: { open: 'Pesquisar produtos', field: 'Pesquisar produtos', clear: 'Limpar busca', searching: 'Pesquisando produtos…', loading: 'Carregando produtos…', error: 'Não foi possível carregar os produtos. Tente de novo.', noResults: term => `Nenhum produto encontrado para “${term}”. Tente outra busca.` },
  es: { open: 'Buscar productos', field: 'Buscar productos', clear: 'Limpiar búsqueda', searching: 'Buscando productos…', loading: 'Cargando productos…', error: 'No pudimos cargar los productos. Inténtalo de nuevo.', noResults: term => `No encontramos productos para “${term}”. Prueba otra búsqueda.` },
};

export const productSearchCopy = language => COPY[language] || COPY.en;
export const productSearchFilter = term => searchFilter(term, COLUMNS);
export { searchTerm };

// Seed the manager's component through its own events, so its remembered search also matches
// the URL. Setting just input.value would make the first clear look like an unchanged term.
export function mountProductSearch(host, language, onSearch, initialTerm = '') {
  const search = createSearchBox({ labels: productSearchCopy(language), onSearch });
  host.append(search.element);
  const term = searchTerm(initialTerm);
  if (term) {
    const input = search.element.querySelector('input');
    search.element.querySelector('.search-toggle').click();
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }
  return search;
}
