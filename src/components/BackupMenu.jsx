import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { IconDownload, IconUpload } from './Icons.jsx';

export default function BackupMenu({ open, onClose, comics, onImport }) {
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
    <Modal open={open} onClose={onClose} title="Copia de seguridad">
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
