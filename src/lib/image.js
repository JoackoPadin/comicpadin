/** Reduce una foto (p. ej. de la cámara del móvil) para que ocupe poco al guardarla. */
export async function fileToCoverDataUrl(file, maxHeight = 720) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxHeight / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}
