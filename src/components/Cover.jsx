import { useEffect, useState } from 'react';

const PALETTES = [
  ['#ff3b5c', '#ffd60a'], ['#2ee6d6', '#8b5cf6'], ['#ffd60a', '#ff7a00'],
  ['#8b5cf6', '#ff3b5c'], ['#00b4ff', '#2ee6d6'], ['#ff7a00', '#ff3b5c'],
];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

/** Portada del cómic; si no hay imagen (o falla), genera una portada "pop art" con el título. */
export default function Cover({ comic, className = '', big = false }) {
  // Prueba la portada grande y, si falla, la alternativa (miniatura); si no, genera una
  const sources = [comic.cover, comic.coverAlt].filter(Boolean);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [comic.cover, comic.coverAlt]);
  const next = () => setAttempt((a) => a + 1);

  if (attempt < sources.length) {
    return (
      <img key={sources[attempt]} src={sources[attempt]} alt={`Portada de ${comic.title}`} loading="lazy" referrerPolicy="no-referrer"
        onError={next}
        onLoad={(e) => { if (e.currentTarget.naturalWidth <= 1) next(); }}
        className={`w-full h-full object-cover ${className}`} />
    );
  }

  const [a, b] = PALETTES[Math.abs(hash(comic.title || comic.id)) % PALETTES.length];
  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col justify-end p-3 ${big ? '' : 'pb-8'} ${className}`}
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>
      <div className="absolute inset-0 halftone-pop" />
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20" />
      <div className="relative">
        {comic.number && (
          <div className={`font-display text-ink/80 leading-none ${big ? 'text-6xl' : 'text-3xl'}`}>#{comic.number}</div>
        )}
        <div className={`font-display text-ink leading-[0.95] tracking-wide break-words ${big ? 'text-4xl' : 'text-xl'}`}>
          {comic.series || comic.title || 'Sin título'}
        </div>
      </div>
    </div>
  );
}
