import Modal from './Modal.jsx';
import Cover from './Cover.jsx';
import StarRating from './StarRating.jsx';
import { StatusPicker, ReadToggle } from './StatusPicker.jsx';
import { IconEdit } from './Icons.jsx';

const Meta = ({ label, value }) => value ? (
  <div>
    <dt className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{label}</dt>
    <dd className="text-sm font-medium">{value}</dd>
  </div>
) : null;

export default function ComicDetail({ comic, onClose, onUpdate, onEdit }) {
  if (!comic) return null;
  const patch = (p) => onUpdate(comic.id, p);
  const price = comic.price && `${String(comic.price).replace('.', ',')} €`;
  return (
    <Modal open onClose={onClose} wide title={comic.series ? `${comic.series}${comic.number ? ` #${comic.number}` : ''}` : 'Ficha'}
      footer={
        <div className="flex justify-end">
          <button onClick={() => onEdit(comic)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-pop text-ink border-2 border-black comic-shadow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
            <IconEdit className="w-4 h-4" /> Editar ficha
          </button>
        </div>
      }>
      <div className="grid sm:grid-cols-[220px_1fr] gap-6">
        <div className="relative w-48 sm:w-full mx-auto">
          {comic.cover && (
            <img src={comic.cover} alt="" aria-hidden referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110" />
          )}
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-black comic-shadow rotate-[-1.5deg]">
            <Cover comic={comic} big />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-2xl font-extrabold leading-tight">{comic.title}</h3>
            {(comic.writer || comic.artist) && (
              <p className="text-white/60 mt-1">{[comic.writer, comic.artist].filter(Boolean).join(' · ')}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <StarRating value={comic.rating} onChange={(rating) => patch({ rating })} size="w-8 h-8" />
            {comic.rating > 0 && <span className="font-display text-2xl text-pop">{comic.rating}/5</span>}
          </div>

          <div className="space-y-3">
            <StatusPicker value={comic.status} onChange={(status) => patch({ status })} />
            <ReadToggle value={comic.read} onChange={(read) => patch({ read, readAt: read ? Date.now() : null })} />
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-xl bg-ink/60 border border-line p-4">
            <Meta label="Editorial" value={comic.publisher} />
            <Meta label="Año" value={comic.year} />
            <Meta label="Formato" value={comic.format} />
            <Meta label="Páginas" value={comic.pages} />
            <Meta label="Precio" value={price} />
            <Meta label="ISBN" value={comic.isbn} />
            <Meta label="Leído el" value={comic.readAt && new Date(comic.readAt).toLocaleDateString('es')} />
            <Meta label="Añadido" value={new Date(comic.createdAt).toLocaleDateString('es')} />
          </dl>

          {comic.notes && (
            <div className="rounded-xl bg-pop/10 border-l-4 border-pop px-4 py-3 text-sm whitespace-pre-wrap">{comic.notes}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
