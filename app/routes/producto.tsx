import { useState } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { catalog } from "../services/demo-catalog";

/**
 * Simulacion de una pagina de producto (PDP) de la tienda con el bloque de
 * Streakify incrustado. Figma: «01 · Página de producto (tienda)» (6:2).
 *
 * El boton del bloque abre el asesor: bienvenida → cuestionario → oferta de
 * escaneo facial → perfil → recomendaciones.
 */

/** Producto del catalogo demo que corresponde al serum del Figma. */
const PRODUCT_HANDLE = "serum-acido-hialuronico-multimolecular-2-b5";

const GALLERY_LABELS = ["Producto", "En ambiente", "En uso"];

export const meta: MetaFunction = () => [
  { title: "Sérum hidratante con ácido hialurónico · Piel Bella" },
  { name: "robots", content: "noindex" },
];

export default function ProductPage() {
  const [inCart, setInCart] = useState(0);
  const [photo, setPhoto] = useState(0);
  const product = catalog.products.find((p) => p.handle === PRODUCT_HANDLE);
  const photos = product?.images?.length
    ? product.images
    : ["/products/serum.svg"];

  return (
    <div className="pdp-page">
      <style>{PDP_CSS}</style>

      <header className="pdp-header">
        <span className="pdp-store">Piel Bella</span>
        <span className="pdp-bag" aria-label={`Carrito: ${inCart} productos`}>
          <i className="icon icon-shopping-bag" aria-hidden />
          {inCart > 0 && <span className="pdp-bag-count">{inCart}</span>}
        </span>
      </header>

      <div className="pdp-gallery">
        <div className="pdp-photo">
          <img
            key={photos[photo]}
            src={photos[photo]}
            alt={`Sérum hidratante con ácido hialurónico · ${GALLERY_LABELS[photo] ?? ""}`}
            width={768}
            height={1344}
          />
        </div>
        {photos.length > 1 && (
          <div className="pdp-thumbs" role="tablist" aria-label="Fotos del producto">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === photo}
                aria-label={GALLERY_LABELS[i] ?? `Foto ${i + 1}`}
                className={`pdp-thumb${i === photo ? " is-active" : ""}`}
                onClick={() => setPhoto(i)}
              >
                <img src={src} alt="" width={56} height={56} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="pdp-content">
        <h1 className="t-h2">Sérum hidratante con ácido hialurónico</h1>
        <p className="t-body-strong">$349.00 MXN</p>

        <section className="pdp-block" aria-label="Asesor de piel Streakify">
          <div className="pdp-block-brand">
            <img
              src="/brand/isotipo-contenedor.svg"
              width={28}
              height={28}
              alt=""
            />
            <h2 className="t-body-strong">¿No sabes si es para tu piel?</h2>
          </div>
          <p className="t-body-sm t-muted">
            Haz un escaneo guiado y responde unas preguntas. Te decimos qué
            productos encajan con tu rutina.
          </p>
          <Link
            className="pdp-btn pdp-btn-primary"
            to={`/scan?product=${PRODUCT_HANDLE}`}
          >
            Descubre si es para tu piel · 3 min
          </Link>
          <p className="seal-privacy">
            <i className="icon icon-sm icon-shield-check" aria-hidden />
            Tu foto no se guarda ni la ve la tienda
          </p>
        </section>

        <button
          type="button"
          className="pdp-btn pdp-btn-secondary"
          onClick={() => setInCart((count) => count + 1)}
        >
          {inCart > 0 ? "Agregado · agregar otro" : "Agregar al carrito"}
        </button>
      </main>
    </div>
  );
}

const PDP_CSS = `
.pdp-page{min-height:100vh;max-width:var(--screen-max);margin:0 auto;background:var(--color-bg);color:var(--color-text);font-family:var(--font-sans);box-shadow:var(--shadow-lg);padding-bottom:32px}
.pdp-header{display:flex;align-items:center;justify-content:space-between;padding:20px 16px 14px;border-bottom:1px solid var(--color-border)}
.pdp-store{font-size:17px;line-height:22px;font-weight:600;letter-spacing:-0.012em}
.pdp-bag{position:relative;display:inline-flex}
.pdp-bag .icon{width:24px;height:24px;color:var(--color-text)}
.pdp-bag-count{position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 5px;border-radius:var(--radius-pill);background:var(--color-primary);color:#fff;font-size:11px;line-height:18px;font-weight:600;text-align:center}
.pdp-gallery{position:relative;background:var(--gradient-ice)}
.pdp-photo{height:340px;overflow:hidden}
.pdp-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 66%}
.pdp-thumbs{position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:8px}
.pdp-thumb{width:48px;height:48px;padding:0;border:2px solid #fff;border-radius:var(--radius-sm,8px);overflow:hidden;background:#fff;cursor:pointer;opacity:.85;box-shadow:var(--shadow-lg)}
.pdp-thumb.is-active{border-color:var(--color-primary);opacity:1}
.pdp-thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 66%}
.pdp-content{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:20px var(--gutter) 0}
.pdp-content h1{margin:0}
.pdp-block{align-self:stretch;display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:radial-gradient(205px 59px at 95% 0,#e9efff 0%,rgba(233,239,255,0) 100%),radial-gradient(291px 76px at 15% -12px,rgba(214,226,255,.95) 0%,rgba(214,226,255,0) 100%),var(--color-bg-dawn)}
.pdp-block-brand{display:flex;align-items:center;gap:10px}
.pdp-block-brand img{display:block;width:28px;height:28px}
.pdp-block-brand h2{margin:0}
.pdp-block p{margin:0}
.pdp-btn{align-self:stretch;display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:1.5px solid transparent;border-radius:var(--radius-md);font-family:inherit;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;text-decoration:none;cursor:pointer;transition:background-color .15s ease}
.pdp-btn-primary{background:var(--color-primary);color:#fff}
.pdp-btn-primary:hover{background:var(--color-primary-hover)}
.pdp-btn-secondary{background:var(--color-bg);border-color:var(--color-primary);color:var(--color-primary-hover)}
.pdp-btn-secondary:hover{background:var(--color-primary-light)}
`;
