import { useEffect, useState } from 'react';

// Portadas generadas en amarillo y negro: [fondo1, fondo2, texto, trama]
const PALETTES = [
  ['#ffd60a', '#f5b700', '#0b0b0b', 'halftone-pop'],
  ['#1c1c1c', '#050505', '#ffd60a', 'halftone'],
  ['#f6f1e3', '#e8e0c9', '#0b0b0b', 'halftone-pop'],
  ['#0b0b0b', '#262626', '#f6f1e3', 'halftone'],
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

  const [a, b, fg, dots] = PALETTES[Math.abs(hash(comic.title || comic.id)) % PALETTES.length];
  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col justify-end p-3 ${big ? '' : 'pb-8'} ${className}`}
      style={{ background: `linear-gradient(160deg, ${a}, ${b})`, color: fg }}>
      <div className={`absolute inset-0 ${dots}`} />
      <div className="absolute top-0 inset-x-0 h-[18%] speed-lines opacity-[0.12]" style={{ filter: fg === '#0b0b0b' ? 'none' : 'invert(1)' }} />
      <div className="relative">
        {comic.number && (
          <div className={`font-display opacity-80 leading-none ${big ? 'text-6xl' : 'text-3xl'}`}>#{comic.number}</div>
        )}
        <div className={`font-display leading-[0.95] tracking-wide break-words ${big ? 'text-4xl' : 'text-xl'}`}>
          {comic.series || comic.title || 'Sin título'}
        </div>
      </div>
    </div>
  );
}
