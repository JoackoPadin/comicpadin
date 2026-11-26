// Búsqueda de datos y portadas en APIs públicas y gratuitas (sin clave):
//  - Google Books  (https://developers.google.com/books)
//  - Open Library  (https://openlibrary.org/developers/api)

export const cleanIsbn = (s = '') => String(s).replace(/[^0-9Xx]/g, '').toUpperCase();
export const looksLikeIsbn = (s) => /^(\d{9}[\dX]|\d{13})$/.test(cleanIsbn(s));
/** ¿Es un código de barras numérico (EAN/UPC) aunque no sea un ISBN? */
export const looksLikeBarcode = (s) => /^\d{8,14}$/.test(String(s).replace(/[\s-]/g, ''));

/** Convierte un ISBN-10 a ISBN-13 para poder comparar ediciones iguales. */
export function isbn13(s) {
  const d = cleanIsbn(s);
  if (d.length === 13) return d;
  if (d.length !== 10) return d;
  const core = `978${d.slice(0, 9)}`;
  const sum = [...core].reduce((acc, c, i) => acc + Number(c) * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}

/** Intenta separar "Batman Vol. 3" / "Saga #12" / "One Piece nº 4" en serie + número */
export function splitSeries(title = '') {
  const m = title.match(/^(.*?)[\s,:-]*(?:#|n[º°o.]\s*|vol(?:ume|umen)?\.?\s*|tomo\s*|issue\s*)(\d+)\b/i);
  if (m && m[1].trim()) return { series: m[1].trim(), number: m[2] };
  return { series: '', number: '' };
}

const COMIC_RE = /comic|cómic|graphic novel|novela gr[aá]fica|manga|manhwa|historiet|tebeo|bande dessin|fumett|superhero|superh[ée]roe|cartoons? and comics/i;
const MANGA_RE = /manga|manhwa/i;

/** 'comic' si las categorías lo indican, 'other' si dicen otra cosa, 'unknown' si no hay datos. */
function classify(categories = [], title = '') {
  if (COMIC_RE.test(title)) return 'comic';
  if (!categories.length) return 'unknown';
  return categories.some((c) => COMIC_RE.test(c)) ? 'comic' : 'other';
}

function guessFormat(categories = [], pages) {
  if (categories.some((c) => MANGA_RE.test(c))) return 'Manga';
  if (categories.some((c) => /graphic novel|novela gr/i.test(c))) return 'Novela gráfica';
  if (Number(pages) > 0 && Number(pages) <= 48) return 'Grapa';
  return '';
}

async function googleBooks(query, { spanish }, signal) {
  const isIsbn = looksLikeIsbn(query);
  const q = isIsbn ? `isbn:${cleanIsbn(query)}` : query;
  const params = new URLSearchParams({ q, maxResults: '40', printType: 'books' });
  if (spanish && !isIsbn) params.set('langRestrict', 'es');
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal });
  if (!res.ok) throw new Error('Google Books no responde');
  const data = await res.json();
  return (data.items || []).map(({ id, volumeInfo: v = {} }) => {
    const ids = v.industryIdentifiers || [];
    const isbn = (ids.find((i) => i.type === 'ISBN_13') || ids.find((i) => i.type === 'ISBN_10') || {}).identifier || '';
    const thumb = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '')
      .replace(/^http:/, 'https:').replace('&edge=curl', '');
    // Versión grande de la portada (si falla, la app vuelve a la miniatura)
    const cover = thumb ? `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&fife=w600` : '';
    const categories = v.categories || [];
    const title = [v.title, v.subtitle].filter(Boolean).join(': ');
    const pages = v.pageCount ? String(v.pageCount) : '';
    return {
      key: `g-${id}`,
      source: 'Google Books',
      kind: classify(categories, title),
      language: v.language || '',
      title,
      publisher: v.publisher || '',
      year: (v.publishedDate || '').slice(0, 4),
      writer: (v.authors || [])[0] || '',
      artist: (v.authors || [])[1] || '',
      isbn,
      pages,
      format: guessFormat(categories, pages),
      cover,
      coverAlt: thumb,
    };
  });
}

async function openLibrary(query, { spanish }, signal) {
  const isIsbn = looksLikeIsbn(query);
  let q = isIsbn ? `isbn:${cleanIsbn(query)}` : query;
  if (spanish && !isIsbn) q += ' language:spa';
  const fields = 'key,title,subtitle,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median,subject,language';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=30&fields=${fields}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Open Library no responde');
  const data = await res.json();
  return (data.docs || []).map((d) => {
    const isbn = isIsbn ? cleanIsbn(query) : (d.isbn || []).find((i) => i.length === 13) || (d.isbn || [])[0] || '';
    const subjects = (d.subject || []).slice(0, 40);
    const title = [d.title, d.subtitle].filter(Boolean).join(': ');
    const pages = d.number_of_pages_median ? String(d.number_of_pages_median) : '';
    const cover = d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
      : isIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn(query)}-L.jpg?default=false` : '';
    return {
      key: `o-${d.key || title}`,
      source: 'Open Library',
      kind: classify(subjects, title),
      language: (d.language || []).includes('spa') ? 'es' : (d.language || [])[0] || '',
      title,
      publisher: (d.publisher || [])[0] || '',
      year: d.first_publish_year ? String(d.first_publish_year) : '',
      writer: (d.author_name || [])[0] || '',
      artist: (d.author_name || [])[1] || '',
      isbn,
      pages,
      format: guessFormat(subjects, pages),
      cover,
      coverAlt: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
    };
  });
}

const cache = new Map();

/**
 * Busca en las dos fuentes a la vez.
 * @param {string} query  título, autor, serie, ISBN o código de barras
 * @param {{comicsOnly?: boolean, spanish?: boolean}} opts
 * @returns {Promise<{results: object[], hidden: number}>} hidden = resultados descartados por no ser cómics
 */
export async function searchComics(query, opts = {}, signal) {
  const q = query.trim();
  if (!q) return { results: [], hidden: 0 };
  const { comicsOnly = true, spanish = false } = opts;
  const cacheKey = JSON.stringify([q.toLowerCase(), comicsOnly, spanish]);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const settled = await Promise.allSettled([googleBooks(q, { spanish }, signal), openLibrary(q, { spanish }, signal)]);
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  const all = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (!all.length && settled.every((r) => r.status === 'rejected')) {
    throw new Error('No se pudo conectar con los buscadores. Revisa tu conexión.');
  }

  // Quita duplicados (mismo ISBN, o mismo título+editorial) quedándose con el más completo
  const byKey = new Map();
  for (const r of all) {
    if (!r.title) continue;
    const k = r.isbn ? isbn13(r.isbn) : `${r.title.toLowerCase()}|${r.publisher.toLowerCase()}`;
    const prev = byKey.get(k);
    if (!prev) { byKey.set(k, r); continue; }
    // Combina: rellena huecos del primero con datos del segundo
    for (const f of ['publisher', 'year', 'writer', 'artist', 'pages', 'format', 'cover', 'coverAlt']) {
      if (!prev[f] && r[f]) prev[f] = r[f];
    }
    if (prev.kind !== 'comic' && r.kind === 'comic') prev.kind = 'comic';
  }
  let list = [...byKey.values()];

  // Una búsqueda por ISBN/código de barras es exacta: no se filtra
  const exact = looksLikeIsbn(q) || looksLikeBarcode(q);
  const before = list.length;
  if (comicsOnly && !exact) list = list.filter((r) => r.kind !== 'other');
  const hidden = before - list.length;

  const score = (r) =>
    (r.kind === 'comic' ? 4 : 0) + (r.cover ? 2 : 0) + (r.language === 'es' ? (spanish ? 2 : 1) : 0) + (r.isbn ? 0.5 : 0);
  list.sort((a, b) => score(b) - score(a));

  const out = { results: list.slice(0, 40), hidden };
  cache.set(cacheKey, out);
  return out;
}
