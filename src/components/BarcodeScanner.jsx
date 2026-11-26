import { useEffect, useRef, useState } from 'react';
import { startScanner, decodeImageFile } from '../lib/barcode.js';
import { IconCamera, IconX } from './Icons.jsx';

export default function BarcodeScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | error | decoding
  const [error, setError] = useState('');
  const cb = useRef({ onCode, onClose });
  cb.current = { onCode, onClose };

  useEffect(() => {
    let stop = null;
    let cancelled = false;
    startScanner(videoRef.current, (code) => { navigator.vibrate?.(80); cb.current.onCode(code); })
      .then((s) => { if (cancelled) s(); else { stop = s; setStatus('scanning'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setStatus('error'); } });
    const onKey = (e) => e.key === 'Escape' && cb.current.onClose();
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; stop?.(); window.removeEventListener('keydown', onKey); };
  }, []);

  async function onPhoto(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setStatus('decoding'); setError('');
    const code = await decodeImageFile(f);
    if (code) onCode(code);
    else { setError('No se ha podido leer el código en esa foto. Acércate más y que salga nítido y recto.'); setStatus('error'); }
  }

  return (
    <div data-scanner className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label="Escanear código de barras">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        {/* Marco guía */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[78%] max-w-md aspect-[2/1] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 rounded-2xl border-4 border-pop" />
            {status === 'scanning' && (
              <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-pop-red shadow-[0_0_12px_2px_#ff3b5c] animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="font-display text-2xl tracking-wide text-pop">Escanear código</span>
          <button onClick={onClose} aria-label="Cerrar" className="p-2.5 rounded-full bg-black/60 text-white"><IconX /></button>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-5 text-center">
          {status === 'starting' && <p className="text-white/80">Abriendo la cámara…</p>}
          {status === 'scanning' && <p className="text-white/90 font-semibold">Apunta al código de barras de la contraportada</p>}
          {status === 'decoding' && <p className="text-white/80 animate-pulse">Leyendo la foto…</p>}
          {status === 'error' && <p className="text-pop font-semibold bg-black/70 rounded-xl px-4 py-3">{error}</p>}
        </div>
      </div>
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-panel border-t border-line flex gap-3">
        <button onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 font-semibold">
          <IconCamera className="w-5 h-5" /> Foto del código
        </button>
        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-pop text-ink font-bold">Cancelar</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      </div>
    </div>
  );
}
