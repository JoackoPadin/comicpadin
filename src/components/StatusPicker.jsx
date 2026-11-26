import { IconBag, IconCheck, IconHeart, IconLibrary } from './Icons.jsx';

const OPTIONS = [
  { id: 'owned', label: 'Lo tengo', Icon: IconLibrary, on: 'bg-pop text-ink' },
  { id: 'wanted', label: 'Lo quiero', Icon: IconHeart, on: 'bg-pop text-ink' },
  { id: 'none', label: 'Ninguno', Icon: IconBag, on: 'bg-cream text-ink' },
];

export function StatusPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-ink border border-line">
      {OPTIONS.map(({ id, label, Icon, on }) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all
            ${value === id ? `${on} shadow` : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
          <Icon className="w-4 h-4" /> {label}
        </button>
      ))}
    </div>
  );
}

export function ReadToggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)} aria-pressed={value}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all
        ${value ? 'border-cream bg-cream/10' : 'border-line hover:border-white/30'}`}>
      <span className="flex items-center gap-2 font-semibold">
        <span className={`grid place-items-center w-6 h-6 rounded-md border-2 transition-all
          ${value ? 'bg-cream border-cream text-ink' : 'border-white/30'}`}>
          {value && <IconCheck className="w-4 h-4" strokeWidth={3} />}
        </span>
        {value ? '¡Leído!' : 'Aún no lo he leído'}
      </span>
      <span className="text-xs text-white/40">{value ? 'Toca para desmarcar' : 'Toca para marcar'}</span>
    </button>
  );
}
