import { useCallback, useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';

const KEY = 'comicpadin:comics:v1';

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export const STATUS = { OWNED: 'owned', WANTED: 'wanted', NONE: 'none' };

export const FORMATS = ['Grapa', 'Tomo', 'Integral', 'Omnibus', 'Novela gráfica', 'Manga', 'Digital'];

export function emptyComic(overrides = {}) {
  return {
    id: uid(),
    title: '',
    series: '',
    number: '',
    publisher: '',
    year: '',
    writer: '',
    artist: '',
    format: '',
    isbn: '',
    pages: '',
    price: '',
    cover: '',
    coverAlt: '',
    status: STATUS.OWNED,
    read: false,
    rating: 0,
    notes: '',
    createdAt: Date.now(),
    readAt: null,
    ...overrides,
  };
}

/** Normaliza un registro (por si viene de una importación antigua o incompleta). */
export function normalize(c) {
  const base = emptyComic();
  const out = { ...base, ...c };
  if (!out.id) out.id = base.id;
  if (![STATUS.OWNED, STATUS.WANTED, STATUS.NONE].includes(out.status)) out.status = STATUS.OWNED;
  out.rating = Math.max(0, Math.min(5, Number(out.rating) || 0));
  out.read = Boolean(out.read);
  return out;
}

/** Colección guardada en IndexedDB del navegador: sin servidor, sin cuentas, sin coste. */
export function useComics() {
  const [comics, setComics] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    get(KEY)
      .then((v) => setComics(Array.isArray(v) ? v.map(normalize) : []))
      .catch((e) => console.error('No se pudo leer la colección', e))
      .finally(() => setReady(true));
    // Pide al navegador que no borre los datos si falta espacio
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) set(KEY, comics).catch((e) => console.error('No se pudo guardar', e));
  }, [comics, ready]);

  const save = useCallback((comic) => {
    setComics((prev) => {
      const i = prev.findIndex((c) => c.id === comic.id);
      if (i === -1) return [comic, ...prev];
      const next = [...prev];
      next[i] = comic;
      return next;
    });
  }, []);

  const update = useCallback((id, patch) => {
    setComics((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const remove = useCallback((id) => setComics((prev) => prev.filter((c) => c.id !== id)), []);

  const importMany = useCallback((list, mode = 'merge') => {
    const clean = list.map(normalize);
    setComics((prev) => {
      if (mode === 'replace') return clean;
      const byId = new Map(prev.map((c) => [c.id, c]));
      clean.forEach((c) => byId.set(c.id, c));
      return [...byId.values()];
    });
  }, []);

  return { comics, ready, save, update, remove, importMany };
}
