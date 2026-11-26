import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Cover from './Cover.jsx';
import StarRating from './StarRating.jsx';
import { StatusPicker, ReadToggle } from './StatusPicker.jsx';
import { IconCamera, IconTrash } from './Icons.jsx';
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
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { setC(initial); setError(''); }, [initial]);

  if (!open || !c) return null;
  const set = (k) => (e) => setC((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const url = await fileToCoverDataUrl(f); setC((p) => ({ ...p, cover: url, coverAlt: '' })); }
    catch { setError('No se pudo leer la imagen.'); }
  }

  function submit(e) {
    e?.preventDefault();
    if (!c.title.trim() && !c.series.trim()) { setError('Ponle al menos un título o una serie.'); return; }
    onSave({ ...c, title: c.title.trim() || `${c.series}${c.number ? ` #${c.number}` : ''}`,
      readAt: c.read ? c.readAt || Date.now() : null });
  }

  return (
    <Modal open={open} onClose={onClose} wide title={isNew ? 'Revisa y guarda' : 'Editar cómic'}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" onClick={() => onDelete(c)}
              className="p-2.5 rounded-xl text-danger hover:bg-danger/10" aria-label="Eliminar">
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
          <input value={c.cover?.startsWith('data:') ? '' : c.cover} onChange={(e) => setC((p) => ({ ...p, cover: e.target.value, coverAlt: '' }))}
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
          {error && <div className="text-sm text-danger font-semibold">{error}</div>}
        </div>
      </form>
    </Modal>
  );
}
