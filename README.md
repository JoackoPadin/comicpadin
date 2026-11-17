# ComicPadin 💥

App para llevar tu colección de cómics, con tres secciones:

- **Lo tengo**: tu estantería.
- **Lo quiero**: tu lista de deseos.
- **Leídos**: lo que ya has leído, con puntuación de 1 a 5 estrellas.

Cada cómic guarda su portada, título, serie y número, editorial, año, guion, dibujo, formato, ISBN, páginas, precio y notas.

## Coste: 0 €

- **Sin servidor ni cuentas**: la colección se guarda en el propio navegador (IndexedDB).
- **Autocompletar gratis**: busca por título o ISBN en Google Books y Open Library (APIs públicas sin clave) y rellena los datos y la portada.
- **Foto propia**: si no aparece la portada, hazle una foto con el móvil.
- **Copia de seguridad**: menú `⋯` → exportar/importar un archivo `.json` (también sirve para pasar la colección a otro dispositivo).
- **Instalable (PWA)**: en el móvil, "Añadir a pantalla de inicio" y se abre como una app, incluso sin conexión.
- **Hosting gratis** en GitHub Pages.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

Hecho con React + Vite + Tailwind CSS.

## Publicar gratis en GitHub Pages

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz merge de los cambios a `main`. El workflow `.github/workflows/deploy.yml` construye y publica la app.
3. Quedará en `https://<tu-usuario>.github.io/comicpadin/`.

> Los datos viven en cada dispositivo/navegador. Exporta una copia de vez en cuando.
