// Lectura de códigos de barras (EAN-13/ISBN, UPC) con la cámara o desde una foto.
// Usa el lector nativo del navegador si existe (Chrome Android/Mac) y, si no, ZXing (gratis, se carga solo al usarlo).

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new window.BarcodeDetector({ formats }) : null;
  } catch { return null; }
}

async function zxingReader() {
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
}

/**
 * Arranca la cámara en `video` y llama a onCode(texto) al leer un código.
 * Devuelve una función para parar.
 */
export async function startScanner(video, onCode) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Este navegador no permite usar la cámara. Prueba con "Foto del código".');
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    if (e.name === 'NotAllowedError') throw new Error('No hay permiso para usar la cámara. Actívalo en el candado de la barra de direcciones.');
    if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') throw new Error('No se encontró ninguna cámara.');
    throw new Error('No se pudo abrir la cámara.');
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => {});

  let stopped = false;
  let timer = null;
  let controls = null;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    controls?.stop();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
  const found = (text) => { if (!stopped && text) { stop(); onCode(text); } };

  const detector = await nativeDetector();
  if (detector) {
    const tick = async () => {
      if (stopped) return;
      try {
        if (video.readyState >= 2) {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) return found(codes[0].rawValue);
        }
      } catch { /* sigue intentando */ }
      timer = setTimeout(tick, 200);
    };
    tick();
  } else {
    const reader = await zxingReader();
    if (stopped) return stop;
    controls = await reader.decodeFromVideoElement(video, (result) => { if (result) found(result.getText()); });
  }
  return stop;
}

/** Lee el código de barras de una foto. Devuelve el texto o null. */
export async function decodeImageFile(file) {
  const detector = await nativeDetector();
  if (detector) {
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close?.();
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch { /* prueba con ZXing */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const reader = await zxingReader();
    const result = await reader.decodeFromImageUrl(url);
    return result.getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
