import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { IconDownload, IconUpload } from './Icons.jsx';

export default function BackupMenu({ open, onClose, comics, onImport, installer }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');

  function exportJson() {
    const blob = new Blob([JSON.stringify({ app: 'coleccion-comics', version: 1, exportedAt: new Date().toISOString(), comics }, null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coleccion-comics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg(`Copia descargada con ${comics.length} cómics.`);
  }

  async function importJson(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list = Array.isArray(data) ? data : data.comics;
      if (!Array.isArray(list)) throw new Error();
      const replace = comics.length > 0 && window.confirm(
        `El archivo tiene ${list.length} cómics.\n\nAceptar = REEMPLAZAR tu colección actual\nCancelar = AÑADIRLOS a la actual`);
      onImport(list, replace ? 'replace' : 'merge');
      setMsg(`Importados ${list.length} cómics.`);
    } catch {
      setMsg('Ese archivo no parece una copia de Colección Cómics.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Menú">
      {/* Instalar */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Instalar la app</h3>
        {installer?.installed ? (
          <p className="text-sm text-cream">✓ Ya estás usando la app instalada.</p>
        ) : installer?.canInstall ? (
          <button onClick={installer.install}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-pop text-ink border-2 border-black comic-shadow text-left">
            <IconDownload className="w-6 h-6" />
            <span><span className="block font-bold">Instalar Colección Cómics</span>
              <span className="text-xs text-ink/70">Con icono propio, en su ventana y sin conexión</span></span>
          </button>
        ) : (
          <div className="text-sm text-white/60 space-y-1.5 rounded-xl bg-panel-2 border border-line p-4">
            <p><b className="text-white">Android (Chrome):</b> menú <b className="text-white">⋮</b> → <b className="text-white">Instalar app</b> (o «Añadir a pantalla de inicio»).</p>
            <p><b className="text-white">Ordenador (Chrome/Edge):</b> icono de instalar <b className="text-white">⊕</b> a la derecha de la barra de direcciones.</p>
            <p><b className="text-white">iPhone (Safari):</b> Compartir → «Añadir a pantalla de inicio».</p>
          </div>
        )}
      </section>

      <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Copia de seguridad</h3>
      <p className="text-sm text-white/60 mb-4">
        Tu colección se guarda <strong className="text-white">solo en este dispositivo</strong>, sin coste ni cuentas.
        Descarga una copia de vez en cuando y úsala para pasar tus cómics a otro móvil u ordenador.
      </p>
      <div className="grid gap-3">
        <button onClick={exportJson}
          className="flex items-center gap-3 p-4 rounded-xl bg-panel-2 border border-line hover:border-pop text-left transition-colors">
          <IconDownload className="w-6 h-6 text-pop" />
          <span><span className="block font-bold">Exportar colección</span>
            <span className="text-xs text-white/50">Descarga un archivo .json</span></span>
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 p-4 rounded-xl bg-panel-2 border border-line hover:border-pop text-left transition-colors">
          <IconUpload className="w-6 h-6 text-cream" />
          <span><span className="block font-bold">Importar colección</span>
            <span className="text-xs text-white/50">Desde un archivo .json exportado antes</span></span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
      </div>
      {msg && <p className="mt-4 text-sm font-semibold text-pop">{msg}</p>}
    </Modal>
  );
}
