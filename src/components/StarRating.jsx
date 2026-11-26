import { useState } from 'react';
import { IconStar } from './Icons.jsx';

export default function StarRating({ value = 0, onChange, size = 'w-6 h-6', className = '' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const readOnly = !onChange;
  return (
    <div className={`flex items-center gap-0.5 ${className}`} onMouseLeave={() => setHover(0)}
      role={readOnly ? 'img' : 'radiogroup'} aria-label={`Puntuación: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        readOnly ? (
          <span key={n} className={n <= shown ? 'text-pop' : 'text-white/25'}>
            <IconStar filled={n <= shown} className={size} />
          </span>
        ) : (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={(e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
            className={`p-0.5 transition-transform hover:scale-125 active:scale-95 ${n <= shown ? 'text-pop' : 'text-white/25 hover:text-white/50'}`}>
            <IconStar filled={n <= shown} className={size} />
          </button>
        )
      ))}
    </div>
  );
}
