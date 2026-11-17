import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Cover from './Cover.jsx';
import StarRating from './StarRating.jsx';
import { StatusPicker, ReadToggle } from './StatusPicker.jsx';
import { IconCamera, IconSearch, IconTrash } from './Icons.jsx';
import { searchComics, splitSeries } from '../lib/search.js';
import { fileToCoverDataUrl } from '../lib/image.js';
import { FORMATS } from '../lib/store.js';

const Field = ({ label, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">{label}</span>
    <input {...props}
      className="w-full rounded-lg bg-ink border border-line px-3 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-pop focus:ring-2 focus:ring-pop/30" />
  </label>
);

export default function ComicForm({ open, initial, isNew, onSave, onDelete, onClose }) {
  const [c, setC] = useState(initial);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setC(initial); setQuery(''); setResults(null); setError('');
  }, [initial]);

  if (!open || !c) return null;
  const set = (k) => (e) => setC((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  async function runSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(''); setResults(null);
    try {
      const r = await searchComics(query, ctrl.signal);
      if (!ctrl.signal.aborted) setResults(r);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  function pick(r) {
    const guess = splitSeries(r.title);
    setC((p) => ({
      ...p,
      title: r.title || p.title,
      series: p.series || guess.series,
      number: p.number || guess.number,
      publisher: r.publisher || p.publisher,
      year: r.year || p.year,
      writer: r.writer || p.writer,
      artist: r.artist || p.artist,
      isbn: r.isbn || p.isbn,
      pages: r.pages || p.pages,
      cover: r.cover || p.cover,
    }));
    setResults(null);
  }

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setC((p) => ({ ...p, cover: '' })); const url = await fileToCoverDataUrl(f); setC((p) => ({ ...p, cover: url })); }
    catch { setError('No se pudo leer la imagen.'); }
  }

  function submit(e) {
    e?.preventDefault();
    if (!c.title.trim() && !c.series.trim()) { setError('Ponle al menos un título o una serie.'); return; }
    onSave({ ...c, title: c.title.trim() || `${c.series}${c.number ? ` #${c.number}` : ''}`,
      readAt: c.read ? c.readAt || Date.now() : null });
  }

  return (
    <Modal open={open} onClose={onClose} wide title={isNew ? 'Nuevo cómic' : 'Editar cómic'}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" onClick={() => onDelete(c)}
              className="p-2.5 rounded-xl text-pop-red hover:bg-pop-red/10" aria-label="Eliminar">
              <IconTrash />
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl font-semibold text-white/70 hover:bg-white/5">Cancelar</button>
          <button type="submit" form="comic-form"
            className="px-5 py-2.5 rounded-xl font-bold bg-pop text-ink border-2 border-black comic-shadow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
            Guardar
          </button>
        </div>
      }>
      {/* Buscador */}
      <form onSubmit={runSearch} className="mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={isNew}
              placeholder="Busca por título o ISBN para autocompletar…"
              className="w-full rounded-xl bg-ink border-2 border-line pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-pop" />
          </div>
          <button type="submit" disabled={loading}
            className="px-4 rounded-xl font-bold bg-pop-violet text-white hover:brightness-110 disabled:opacity-60">
            {loading ? '…' : 'Buscar'}
          </button>
        </div>
        {loading && <div className="mt-3 text-sm text-white/50 animate-pulse">Buscando en Google Books y Open Library…</div>}
        {results && results.length === 0 && (
          <div className="mt-3 text-sm text-white/50">Sin resultados. Prueba con otro título, o rellénalo a mano.</div>
        )}
        {results && results.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 snap-x">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => pick(r)}
                className="snap-start shrink-0 w-28 text-left group animate-pop-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-line group-hover:border-pop transition-colors bg-panel-2">
                  <Cover comic={{ id: r.title, title: r.title, cover: r.cover }} />
                </div>
                <div className="mt-1 text-xs font-semibold line-clamp-2 group-hover:text-pop">{r.title}</div>
                <div className="text-[10px] text-white/40 truncate">{[r.publisher, r.year].filter(Boolean).join(' · ') || r.source}</div>
              </button>
            ))}
          </div>
        )}
      </form>

      <form id="comic-form" onSubmit={submit} className="grid sm:grid-cols-[180px_1fr] gap-5">
        {/* Portada */}
        <div className="space-y-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative block w-40 sm:w-full mx-auto aspect-[2/3] rounded-xl overflow-hidden border-2 border-black comic-shadow group">
            <Cover comic={c} />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold">
              <IconCamera className="w-7 h-7" /> Subir foto
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          <input value={c.cover?.startsWith('data:') ? '' : c.cover} onChange={set('cover')}
            placeholder={c.cover?.startsWith('data:') ? 'Foto propia ✓' : 'o pega URL de portada'}
            className="w-full rounded-lg bg-ink border border-line px-2.5 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-pop" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="sm:hidden w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-sm font-semibold">
            <IconCamera className="w-4 h-4" /> Foto con la cámara
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Título" value={c.title} onChange={set('title')} placeholder="Batman: Año Uno" />
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <Field label="Serie / colección" value={c.series} onChange={set('series')} placeholder="Batman" />
            <Field label="Número" value={c.number} onChange={set('number')} placeholder="1" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <Field label="Editorial" value={c.publisher} onChange={set('publisher')} placeholder="ECC, Panini, Norma…" list="publishers" />
            <Field label="Año" value={c.year} onChange={set('year')} placeholder="2024" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guion" value={c.writer} onChange={set('writer')} placeholder="Frank Miller" />
            <Field label="Dibujo" value={c.artist} onChange={set('artist')} placeholder="David Mazzucchelli" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block col-span-2 sm:col-span-1">
              <span className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Formato</span>
              <select value={c.format} onChange={set('format')}
                className="w-full rounded-lg bg-ink border border-line px-2 py-2 text-sm focus:outline-none focus:border-pop">
                <option value="">—</option>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <Field label="ISBN" value={c.isbn} onChange={set('isbn')} inputMode="numeric" className="col-span-2 sm:col-span-1" />
            <Field label="Páginas" value={c.pages} onChange={set('pages')} inputMode="numeric" />
            <Field label="Precio €" value={c.price} onChange={set('price')} inputMode="decimal" placeholder="0,00" />
          </div>

          <div className="pt-2 space-y-3">
            <StatusPicker value={c.status} onChange={set('status')} />
            <ReadToggle value={c.read} onChange={set('read')} />
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
              <span className="text-sm font-semibold text-white/70">Puntuación</span>
              <StarRating value={c.rating} onChange={set('rating')} size="w-7 h-7" />
            </div>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Notas</span>
            <textarea value={c.notes} onChange={set('notes')} rows={3} placeholder="Estado, dónde lo compré, a quién se lo presté…"
              className="w-full rounded-lg bg-ink border border-line px-3 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-pop resize-y" />
          </label>
          {error && <div className="text-sm text-pop-red font-semibold">{error}</div>}
        </div>
      </form>
    </Modal>
  );
}
