// Búsqueda de datos y portadas en APIs públicas y gratuitas (sin clave):
//  - Google Books  (https://developers.google.com/books)
//  - Open Library  (https://openlibrary.org/developers/api)

const cleanIsbn = (s) => s.replace(/[^0-9Xx]/g, '').toUpperCase();
export const looksLikeIsbn = (s) => /^(\d{9}[\dX]|\d{13})$/.test(cleanIsbn(s));

/** Intenta separar "Batman Vol. 3" / "Saga #12" / "One Piece nº 4" en serie + número */
export function splitSeries(title = '') {
  const m = title.match(/^(.*?)[\s,:-]*(?:#|n[º°o.]\s*|vol(?:ume|umen)?\.?\s*|tomo\s*|issue\s*)(\d+)\b/i);
  if (m && m[1].trim()) return { series: m[1].trim(), number: m[2] };
  return { series: '', number: '' };
}

async function googleBooks(query, signal) {
  const q = looksLikeIsbn(query) ? `isbn:${cleanIsbn(query)}` : query;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=15&printType=books`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Google Books no responde');
  const data = await res.json();
  return (data.items || []).map(({ volumeInfo: v = {} }) => {
    const ids = v.industryIdentifiers || [];
    const isbn = (ids.find((i) => i.type === 'ISBN_13') || ids.find((i) => i.type === 'ISBN_10') || {}).identifier || '';
    let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
    cover = cover.replace(/^http:/, 'https:').replace('&edge=curl', '');
    const title = [v.title, v.subtitle].filter(Boolean).join(': ');
    return {
      source: 'Google Books',
      title,
      publisher: v.publisher || '',
      year: (v.publishedDate || '').slice(0, 4),
      writer: (v.authors || [])[0] || '',
      artist: (v.authors || [])[1] || '',
      isbn,
      pages: v.pageCount ? String(v.pageCount) : '',
      cover,
    };
  });
}

async function openLibrary(query, signal) {
  const isIsbn = looksLikeIsbn(query);
  const q = isIsbn ? `isbn:${cleanIsbn(query)}` : query;
  const fields = 'title,subtitle,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=15&fields=${fields}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Open Library no responde');
  const data = await res.json();
  return (data.docs || []).map((d) => {
    const isbn = isIsbn ? cleanIsbn(query) : (d.isbn || []).find((i) => i.length === 13) || (d.isbn || [])[0] || '';
    return {
      source: 'Open Library',
      title: [d.title, d.subtitle].filter(Boolean).join(': '),
      publisher: (d.publisher || [])[0] || '',
      year: d.first_publish_year ? String(d.first_publish_year) : '',
      writer: (d.author_name || [])[0] || '',
      artist: (d.author_name || [])[1] || '',
      isbn,
      pages: d.number_of_pages_median ? String(d.number_of_pages_median) : '',
      cover: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
        : isIsbn
          ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn(query)}-L.jpg?default=false`
          : '',
    };
  });
}

export async function searchComics(query, signal) {
  const q = query.trim();
  if (!q) return [];
  const results = await Promise.allSettled([googleBooks(q, signal), openLibrary(q, signal)]);
  if (signal?.aborted) return [];
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (!all.length && results.every((r) => r.status === 'rejected')) {
    throw new Error('No se pudo conectar con los buscadores. Revisa tu conexión.');
  }
  // Quita duplicados (mismo ISBN o mismo título) y prioriza los que tienen portada
  const seen = new Set();
  const unique = [];
  for (const r of all) {
    const key = r.isbn || r.title.toLowerCase();
    if (!r.title || seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }
  return unique.sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)));
}
