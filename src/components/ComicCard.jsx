import Cover from './Cover.jsx';
import { IconCheck, IconStar } from './Icons.jsx';

export default function ComicCard({ comic, onOpen, index = 0 }) {
  const subtitle = [comic.series && comic.number ? `#${comic.number}` : comic.number && `#${comic.number}`, comic.publisher, comic.year]
    .filter(Boolean).join(' · ');
  return (
    <button onClick={() => onOpen(comic)}
      style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
      className="group text-left animate-pop-in focus:outline-none">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-panel-2 border-2 border-black comic-shadow
        transition-all duration-200 group-hover:-translate-y-1 group-hover:rotate-[-1deg] group-hover:shadow-[6px_6px_0_0_#ffd60a]
        group-focus-visible:ring-4 group-focus-visible:ring-pop">
        <Cover comic={comic} />
        {comic.read && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-cream text-ink text-[11px] font-bold px-2 py-0.5 shadow border border-black">
            <IconCheck className="w-3 h-3" strokeWidth={3} /> LEÍDO
          </span>
        )}
        {comic.status === 'wanted' && (
          <span className="absolute top-2 left-2 rounded-full bg-ink text-pop text-[11px] font-bold px-2 py-0.5 shadow border border-pop">LO QUIERO</span>
        )}
        {comic.rating > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 text-pop bg-ink/85 rounded-full px-1.5 py-1 border border-black">
            {Array.from({ length: comic.rating }, (_, i) => <IconStar key={i} filled className="w-3.5 h-3.5 drop-shadow" />)}
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-pop transition-colors">
          {comic.title || comic.series || 'Sin título'}
        </div>
        {subtitle && <div className="text-xs text-white/50 mt-0.5 truncate">{subtitle}</div>}
      </div>
    </button>
  );
}
