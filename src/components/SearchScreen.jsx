import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Cover from './Cover.jsx';
import BarcodeScanner from './BarcodeScanner.jsx';
import { IconBarcode, IconCheck, IconEdit, IconHeart, IconLibrary, IconSearch, IconX } from './Icons.jsx';
import { searchComics, isbn13, looksLikeIsbn, looksLikeBarcode } from '../lib/search.js';

const PREFS_KEY = 'comicpadin:search-prefs';
const loadPrefs = () => {
  try { return { comicsOnly: true, spanish: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return { comicsOnly: true, spanish: false }; }
};
const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const STATUS_LABEL = { owned: 'Lo tengo', wanted: 'Lo quiero', none: 'En tu colección' };

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors
        ${on ? 'bg-pop text-ink border-pop' : 'border-line text-white/60 hover:text-white hover:border-white/30'}`}>
      <span className={`grid place-items-center w-3.5 h-3.5 rounded-sm border ${on ? 'border-ink bg-ink text-pop' : 'border-white/40'}`}>
        {on && <IconCheck className="w-2.5 h-2.5" strokeWidth={4} />}
      </span>
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex gap-3 p-2">
          <div className="w-16 aspect-[2/3] rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
            <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse mt-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SearchScreen({ open, onClose, comics, onQuickAdd, onOpenResult, onManual }) {
  const [query, setQuery] = useState('');
  const [prefs, setPrefs] = useState(loadPrefs);
  const [state, setState] = useState({ status: 'idle', results: [], hidden: 0, error: '' });
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ } }, [prefs]);
  useEffect(() => {
    if (open) { setQuery(''); setScanNote(''); setState({ status: 'idle', results: [], hidden: 0, error: '' }); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  // Búsqueda mientras escribes (espera a que dejes de teclear)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setState((s) => ({ ...s, status: 'idle' })); return; }
    const ctrl = new AbortController();
    const delay = looksLikeIsbn(q) || looksLikeBarcode(q) ? 0 : 450;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading', error: '' }));
      try {
        const { results, hidden } = await searchComics(q, prefs, ctrl.signal);
        setState({ status: 'done', results, hidden, error: '' });
      } catch (e) {
        if (e.name !== 'AbortError') setState({ status: 'error', results: [], hidden: 0, error: e.message });
      }
    }, delay);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, prefs]);

  // Índice de lo que ya tienes, para marcarlo en los resultados
  const owned = useMemo(() => {
    const byIsbn = new Map(); const byTitle = new Map();
    comics.forEach((c) => {
      if (c.isbn) byIsbn.set(isbn13(c.isbn), c);
      if (c.title) byTitle.set(norm(c.title), c);
    });
    return (r) => (r.isbn && byIsbn.get(isbn13(r.isbn))) || byTitle.get(norm(r.title));
  }, [comics]);

  function handleCode(code) {
    setScanning(false);
    setQuery(code);
    setScanNote(looksLikeIsbn(code) ? ''
      : 'Ese código no es un ISBN (suele pasar en grapas americanas). Si no aparece, busca por título y número.');
  }

  const q = query.trim();

  return (
    <>
      <Modal open={open} onClose={onClose} wide title="Añadir cómic"
        footer={
          <button onClick={() => onManual(q)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5">
            <IconEdit className="w-4 h-4" /> ¿No lo encuentras? <span className="underline underline-offset-2">Añadir a mano</span>
          </button>
        }>
        {/* Barra de búsqueda */}
        <div className="sticky -top-4 z-10 -mx-5 px-5 -mt-4 pt-4 pb-3 bg-panel">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <IconSearch className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setScanNote(''); }}
                type="search" enterKeyHint="search" autoComplete="off"
                placeholder="Título, serie, autor o ISBN…"
                className="w-full rounded-xl bg-ink border-2 border-line pl-11 pr-10 py-3 text-base focus:outline-none focus:border-pop [&::-webkit-search-cancel-button]:hidden" />
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Borrar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10">
                  <IconX className="w-4 h-4" />
                </button>
              )}
            </div>
            <button onClick={() => setScanning(true)} aria-label="Escanear código de barras" title="Escanear código de barras"
              className="shrink-0 grid place-items-center w-[52px] rounded-xl bg-pop text-ink hover:brightness-110 border-2 border-black comic-shadow">
              <IconBarcode className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip on={prefs.comicsOnly} onClick={() => setPrefs((p) => ({ ...p, comicsOnly: !p.comicsOnly }))}>Solo cómics y manga</Chip>
            <Chip on={prefs.spanish} onClick={() => setPrefs((p) => ({ ...p, spanish: !p.spanish }))}>Ediciones en español</Chip>
          </div>
        </div>

        {scanNote && <p className="mb-3 text-sm text-pop bg-pop/10 rounded-xl px-3 py-2">{scanNote}</p>}

        {/* Estado inicial */}
        {q.length < 2 && (
          <div className="py-4 space-y-3">
            <button onClick={() => setScanning(true)}
              className="relative overflow-hidden w-full flex items-center gap-4 p-4 rounded-2xl bg-pop text-ink text-left border-2 border-black comic-shadow hover:-translate-y-0.5 transition-transform">
              <span className="absolute inset-y-0 right-0 w-1/3 halftone-fade opacity-20 pointer-events-none" />
              <span className="relative grid place-items-center w-14 h-14 shrink-0 rounded-xl bg-ink text-pop"><IconBarcode className="w-8 h-8" /></span>
              <span className="relative">
                <span className="block font-display text-2xl tracking-wide leading-none">Escanear código de barras</span>
                <span className="block text-sm text-ink/75 font-medium mt-1">Apunta a la contraportada y se rellena solo</span>
              </span>
            </button>
            <div className="text-sm text-white/50 px-1 space-y-1 pt-2">
              <p>💡 Prueba con <b className="text-white/80">título + número</b> («Saga 3»), con <b className="text-white/80">autor</b> («Alan Moore») o con el <b className="text-white/80">ISBN</b>.</p>
              <p>Los tomos, integrales, novelas gráficas y manga suelen aparecer; las grapas sueltas, no tanto.</p>
            </div>
          </div>
        )}

        {q.length >= 2 && state.status === 'loading' && <Skeleton />}

        {state.status === 'error' && q.length >= 2 && (
          <p className="py-8 text-center text-danger font-semibold">{state.error}</p>
        )}

        {state.status === 'done' && q.length >= 2 && state.results.length === 0 && (
          <div className="py-10 text-center animate-pop-in">
            <p className="font-display text-3xl tracking-wide">¡Nada por aquí!</p>
            <p className="text-white/50 mt-1 text-sm">No hemos encontrado «{q}».</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {prefs.spanish && (
                <button onClick={() => setPrefs((p) => ({ ...p, spanish: false }))} className="px-4 py-2 rounded-xl bg-white/10 text-sm font-semibold hover:bg-white/15">Buscar en todos los idiomas</button>
              )}
              {prefs.comicsOnly && (
                <button onClick={() => setPrefs((p) => ({ ...p, comicsOnly: false }))} className="px-4 py-2 rounded-xl bg-white/10 text-sm font-semibold hover:bg-white/15">Incluir otros libros</button>
              )}
              <button onClick={() => onManual(q)} className="px-4 py-2 rounded-xl bg-pop text-ink text-sm font-bold">Añadir a mano</button>
            </div>
          </div>
        )}

        {state.status === 'done' && state.results.length > 0 && (
          <>
            <ul className="space-y-1 -mx-2">
              {state.results.map((r, i) => {
                const mine = owned(r);
                return (
                  <li key={r.key} className="flex gap-3 p-2 rounded-xl hover:bg-white/[0.04] animate-pop-in" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                    <button onClick={() => onOpenResult(r)} aria-label={`Ver y editar ${r.title}`}
                      className="shrink-0 w-[72px] sm:w-20 aspect-[2/3] rounded-lg overflow-hidden border-2 border-black bg-panel-2 hover:ring-2 hover:ring-pop transition">
                      <Cover comic={{ id: r.key, title: r.title, cover: r.coverAlt || r.cover }} />
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <button onClick={() => onOpenResult(r)} className="text-left group">
                        <div className="font-semibold leading-snug line-clamp-2 group-hover:text-pop">{r.title}</div>
                        <div className="text-xs text-white/50 mt-0.5 line-clamp-1">
                          {[r.writer, r.publisher, r.year].filter(Boolean).join(' · ')}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.format && <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-white/10 text-white/70">{r.format}</span>}
                          {r.language === 'es' && <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-cream/15 text-cream">Español</span>}
                          {r.pages && <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-white/5 text-white/50">{r.pages} págs.</span>}
                        </div>
                      </button>
                      <div className="mt-auto pt-2 flex flex-wrap gap-2">
                        {mine ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-2.5 py-1.5 bg-cream/15 text-cream">
                            <IconCheck className="w-3.5 h-3.5" strokeWidth={3} /> Ya en tu colección · {STATUS_LABEL[mine.status]}
                          </span>
                        ) : (
                          <>
                            <button onClick={() => onQuickAdd(r, 'owned')}
                              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 bg-pop text-ink hover:brightness-110 active:scale-95 transition">
                              <IconLibrary className="w-3.5 h-3.5" /> Lo tengo
                            </button>
                            <button onClick={() => onQuickAdd(r, 'wanted')}
                              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5 border border-pop text-pop hover:bg-pop/10 active:scale-95 transition">
                              <IconHeart className="w-3.5 h-3.5" /> Lo quiero
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {state.hidden > 0 && (
              <button onClick={() => setPrefs((p) => ({ ...p, comicsOnly: false }))}
                className="w-full mt-3 py-2 text-xs text-white/40 hover:text-white/70">
                {state.hidden === 1 ? 'Se ocultó 1 resultado que no parece un cómic' : `Se ocultaron ${state.hidden} resultados que no parecen cómics`} · <span className="underline">{state.hidden === 1 ? 'mostrarlo' : 'mostrarlos'}</span>
              </button>
            )}
          </>
        )}
      </Modal>
      {scanning && <BarcodeScanner onCode={handleCode} onClose={() => setScanning(false)} />}
    </>
  );
}
