# Scanify

Demo de asesor de piel con escaneo facial en el navegador: consentimiento,
cuestionario, escaneo guiado (MediaPipe Face Landmarker), perfil,
recomendaciones, rutina y carrito.

- `/` — página de producto simulada de la tienda (PDP) con el bloque de Streakify.
- `/asesor` — recorrido completo (`?step=<pantalla>`, `?seed=1` precarga respuestas).
- `/scan` — escaneo guiado de tres capturas; la imagen no sale del navegador.

## Desarrollo

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # métricas del escaneo y contornos de zonas
npm run typecheck
npm run build
```

La cámara requiere `localhost` o HTTPS.

## Despliegue en Vercel

Importa el repo en Vercel; detecta React Router y usa `@vercel/react-router`
(configurado en `react-router.config.ts`). No requiere variables de entorno.

## Notas

- El catálogo es una fotografía en `app/data/demo-catalog.json`; los enlaces de
  carrito apuntan a la tienda definida en `shopDomain`.
- Las observaciones del escaneo son cosméticas y orientativas: no son un
  diagnóstico.
