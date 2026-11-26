import { useMemo, useRef, useState } from 'react';
import { useComics, emptyComic } from './lib/store.js';
import ComicCard from './components/ComicCard.jsx';
import ComicForm from './components/ComicForm.jsx';
import ComicDetail from './components/ComicDetail.jsx';
import BackupMenu from './components/BackupMenu.jsx';
import SearchScreen from './components/SearchScreen.jsx';
import { splitSeries, looksLikeIsbn, cleanIsbn } from './lib/search.js';
import { IconBook, IconHeart, IconLibrary, IconMore, IconPlus, IconSearch, IconX } from './components/Icons.jsx';

const TABS = [
  { id: 'owned', label: 'Lo tengo', Icon: IconLibrary, accent: 'bg-pop text-ink', match: (c) => c.status === 'owned',
    empty: ['Tu estantería está vacía', 'Añade el primer cómic de tu colección.'] },
  { id: 'wanted', label: 'Lo quiero', Icon: IconHeart, accent: 'bg-pop-red text-white', match: (c) => c.status === 'wanted',
    empty: ['Tu lista de deseos está vacía', 'Apunta aquí los cómics que quieres conseguir.'] },
  { id: 'read', label: 'Leídos', Icon: IconBook, accent: 'bg-pop-cyan text-ink', match: (c) => c.read,
    empty: ['Todavía no has marcado ninguno como leído', 'Abre un cómic y márcalo como leído.'] },
];

const SORTS = {
  recent: { label: 'Recientes', fn: (a, b) => b.createdAt - a.createdAt },
  title: { label: 'Título', fn: (a, b) => (a.series || a.title).localeCompare(b.series || b.title, 'es', { numeric: true })
    || String(a.number).localeCompare(String(b.number), 'es', { numeric: true }) },
  rating: { label: 'Puntuación', fn: (a, b) => b.rating - a.rating || b.createdAt - a.createdAt },
  year: { label: 'Año', fn: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) },
};

const money = (n) => n.toLocaleString('es', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const toNum = (v) => Number(String(v).replace(',', '.')) || 0;

export default function App() {
  const { comics, ready, save, update, remove, importMany } = useComics();
  const [tab, setTab] = useState('owned');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [publisher, setPublisher] = useState('');
  const [editing, setEditing] = useState(null); // { comic, isNew }
  const [viewingId, setViewingId] = useState(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null); // { text, undo }
  const toastTimer = useRef(null);

  const current = TABS.find((t) => t.id === tab);
  const viewing = comics.find((c) => c.id === viewingId) || null;

  const stats = useMemo(() => {
    const owned = comics.filter((c) => c.status === 'owned');
    const rated = comics.filter((c) => c.rating > 0);
    return {
      owned: owned.length,
      wanted: comics.filter((c) => c.status === 'wanted').length,
      read: comics.filter((c) => c.read).length,
      readPct: owned.length ? Math.round((owned.filter((c) => c.read).length / owned.length) * 100) : 0,
      value: owned.reduce((s, c) => s + toNum(c.price), 0),
      avg: rated.length ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) : '–',
    };
  }, [comics]);

  const counts = { owned: stats.owned, wanted: stats.wanted, read: stats.read };

  const publishers = useMemo(
    () => [...new Set(comics.map((c) => c.publisher.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [comics]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comics
      .filter(current.match)
      .filter((c) => !publisher || c.publisher.trim() === publisher)
      .filter((c) => !q || [c.title, c.series, c.writer, c.artist, c.publisher, c.isbn, c.notes]
        .some((f) => String(f).toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [comics, current, query, publisher, sort]);

  const defaults = () => ({ status: tab === 'wanted' ? 'wanted' : 'owned', read: tab === 'read' });
  const openNew = () => setSearchOpen(true);

  // Convierte un resultado del buscador en una ficha
  const resultToComic = (r, overrides = {}) => {
    const guess = splitSeries(r.title);
    return emptyComic({
      ...defaults(),
      title: r.title, series: guess.series, number: guess.number,
      publisher: r.publisher, year: r.year, writer: r.writer, artist: r.artist,
      isbn: r.isbn, pages: r.pages, format: r.format, cover: r.cover, coverAlt: r.coverAlt,
      ...overrides,
    });
  };

  function showToast(text, undo) {
    clearTimeout(toastTimer.current);
    setToast({ text, undo, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  function quickAdd(r, status) {
    const c = resultToComic(r, { status, read: false });
    save(c);
    showToast(`Añadido a «${status === 'wanted' ? 'Lo quiero' : 'Lo tengo'}»`, () => remove(c.id));
  }

  function openManual(q) {
    const isIsbn = looksLikeIsbn(q);
    setEditing({ isNew: true, comic: emptyComic({ ...defaults(), title: isIsbn ? '' : q, isbn: isIsbn ? cleanIsbn(q) : '' }) });
  }

  function handleSave(c) {
    const isNew = editing?.isNew;
    save(c); setEditing(null);
    if (isNew) showToast(`Añadido a «${c.status === 'wanted' ? 'Lo quiero' : c.status === 'owned' ? 'Lo tengo' : 'tu colección'}»`, () => remove(c.id));
  }
  function handleDelete(c) {
    if (window.confirm(`¿Eliminar "${c.title || c.series}" de tu colección?`)) {
      remove(c.id); setEditing(null); setViewingId(null);
    }
  }

  return (
    <div className="min-h-dvh halftone">
      {/* Cabecera */}
      <header className="relative overflow-hidden border-b-4 border-black bg-pop">
        <div className="absolute inset-0 halftone-pop" />
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-pop-red/90 border-4 border-black hidden sm:block" />
        <div className="relative max-w-6xl mx-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-white title-shadow [-webkit-text-stroke:2px_#000] leading-none -rotate-2">
              ComicPadin
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={openNew}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-ink text-pop border-2 border-black comic-shadow hover:-translate-y-0.5 transition-transform">
                <IconPlus /> Añadir cómic
              </button>
              <button onClick={() => setBackupOpen(true)} aria-label="Copia de seguridad"
                className="p-2.5 rounded-xl bg-white text-ink border-2 border-black comic-shadow hover:-translate-y-0.5 transition-transform">
                <IconMore />
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {[
              ['Cómics', stats.owned],
              ['Leído', `${stats.readPct}%`],
              ['Nota', stats.avg],
              ['Valor', money(stats.value)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-ink text-white border-2 border-black px-2 sm:px-4 py-2 comic-shadow">
                <div className="font-display text-2xl sm:text-3xl text-pop leading-none truncate">{value}</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/60 font-semibold mt-1 truncate">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Pestañas */}
      <nav className="sticky top-0 z-30 bg-ink/85 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-panel border border-line">
            {TABS.map(({ id, label, Icon, accent }) => (
              <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
                className={`relative flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 whitespace-nowrap rounded-xl text-sm sm:text-base font-bold transition-all duration-200
                  ${tab === id ? `${accent} shadow-lg scale-[1.02]` : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <Icon className="hidden min-[400px]:block w-4 h-4 sm:w-5 sm:h-5" />
                <span>{label}</span>
                <span className={`text-xs rounded-full px-1.5 min-w-5 ${tab === id ? 'bg-black/15' : 'bg-white/10'}`}>{counts[id]}</span>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="mt-3 flex flex-wrap sm:flex-nowrap gap-2">
            <div className="relative basis-full sm:basis-auto flex-1 min-w-0">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en tu colección…"
                className="w-full rounded-xl bg-panel border border-line pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-pop" />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white" aria-label="Limpiar">
                  <IconX className="w-4 h-4" />
                </button>
              )}
            </div>
            {publishers.length > 1 && (
              <select value={publisher} onChange={(e) => setPublisher(e.target.value)} aria-label="Editorial"
                className="flex-1 sm:flex-none sm:w-40 py-2 rounded-xl bg-panel border border-line px-2 text-sm focus:outline-none focus:border-pop">
                <option value="">Editorial</option>
                {publishers.map((p) => <option key={p}>{p}</option>)}
              </select>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar"
              className="flex-1 sm:flex-none sm:w-36 py-2 rounded-xl bg-panel border border-line px-2 text-sm focus:outline-none focus:border-pop">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </nav>

      {/* Rejilla */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-28">
        {!ready ? (
          <div className="text-center py-20 text-white/40 animate-pulse">Cargando tu colección…</div>
        ) : list.length ? (
          <div key={tab} className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {list.map((c, i) => <ComicCard key={c.id} comic={c} index={i} onOpen={(x) => setViewingId(x.id)} />)}
          </div>
        ) : (
          <div className="text-center py-16 animate-pop-in">
            <div className="inline-grid place-items-center w-24 h-24 rounded-full bg-panel border-4 border-black comic-shadow mb-5 -rotate-6">
              <current.Icon className="w-10 h-10 text-pop" />
            </div>
            {query || publisher ? (
              <>
                <h2 className="font-display text-3xl tracking-wide">¡Nada por aquí!</h2>
                <p className="text-white/50 mt-1">Ningún cómic coincide con tu búsqueda.</p>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl tracking-wide">{current.empty[0]}</h2>
                <p className="text-white/50 mt-1">{current.empty[1]}</p>
                <button onClick={openNew}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-pop text-ink border-2 border-black comic-shadow hover:-translate-y-0.5 transition-transform">
                  <IconPlus /> Añadir cómic
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* Botón flotante (móvil) */}
      <button onClick={openNew} aria-label="Añadir cómic"
        className="sm:hidden fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 grid place-items-center w-16 h-16 rounded-full bg-pop text-ink border-4 border-black comic-shadow active:scale-95 transition-transform">
        <IconPlus className="w-8 h-8" strokeWidth={3} />
      </button>

      <datalist id="publishers">{publishers.map((p) => <option key={p} value={p} />)}</datalist>

      <ComicDetail comic={viewing} onClose={() => setViewingId(null)} onUpdate={update}
        onEdit={(c) => { setViewingId(null); setEditing({ comic: c, isNew: false }); }} />
      <SearchScreen open={searchOpen} onClose={() => setSearchOpen(false)} comics={comics}
        onQuickAdd={quickAdd} onManual={openManual}
        onOpenResult={(r) => setEditing({ isNew: true, comic: resultToComic(r) })} />
      <ComicForm open={Boolean(editing)} initial={editing?.comic} isNew={editing?.isNew}
        onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />
      {toast && (
        <div key={toast.id} role="status"
          className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex items-center gap-4 pl-4 pr-2 py-2 rounded-xl bg-white text-ink font-semibold border-2 border-black comic-shadow animate-sheet-up max-w-[calc(100vw-2rem)]">
          <span className="truncate">✓ {toast.text}</span>
          {toast.undo && (
            <button onClick={() => { toast.undo(); setToast(null); }}
              className="shrink-0 px-3 py-1.5 rounded-lg font-bold text-pop-violet hover:bg-pop-violet/10">Deshacer</button>
          )}
        </div>
      )}
      <BackupMenu open={backupOpen} onClose={() => setBackupOpen(false)} comics={comics} onImport={importMany} />
    </div>
  );
}
