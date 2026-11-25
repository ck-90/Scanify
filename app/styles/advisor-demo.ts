/**
 * Hoja de estilos de las superficies publicas del asesor (recorrido demo y
 * prototipo de scan). Se inyecta con <style>{...}</style>.
 *
 * Todos los valores salen de los tokens globales de `streakify.css`
 * (Figma «Streakify · Identidad y App»). No agregar colores, radios ni
 * tamanos sueltos aqui: si falta uno, se agrega primero como token.
 */

/** Iconos Phosphor (Regular) exportados de Figma a /public/icons; se usan como mascara para heredar color. */
const CHECK_MASK = 'url("/icons/check.svg")';
const TAG_MASK = 'url("/icons/tag.svg")';
const INFO_MASK = 'url("/icons/info.svg")';

export const ADVISOR_DEMO_CSS = `
/* ── Pantalla ── */
.sfa-page{min-height:100vh;display:flex;flex-direction:column;background:var(--gradient-dawn);background-color:var(--color-bg-dawn);background-repeat:no-repeat;color:var(--color-text);font-family:var(--font-sans)}
.sfa-page *{box-sizing:border-box}

/* ── Barra superior ── */
.sfa-top{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;max-width:var(--screen-max);margin:0 auto;padding:20px 16px 12px}
.sfa-brand{display:flex;align-items:center;gap:10px}
.sfa-mark{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--gradient-night);color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.03em}
.sfa-brand strong{display:block;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em}
.sfa-brand span:last-child{display:block;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-demo-pill{font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;background:var(--color-bg-alt);border-radius:var(--radius-xs);padding:3px 8px;color:var(--color-text-muted)}

/* ── Contenido ── */
.sfa-main{flex:1;width:100%;max-width:var(--screen-max);margin:0 auto;padding:8px var(--gutter) 24px;display:flex;flex-direction:column;gap:16px}
.sfa-hero{display:flex;flex-direction:column;gap:16px}
.sfa-hero h1{font-size:30px;line-height:35px;font-weight:700;letter-spacing:-0.025em;margin:0}
.sfa-hero p{margin:0;color:var(--color-text-muted);font-size:16px;line-height:23px;letter-spacing:-0.011em}
.sfa-hero-compact h1{font-size:30px;line-height:35px}
.sfa-hero p.sfa-kicker{margin:0 0 -8px;font-size:11px;line-height:14px;letter-spacing:0.06em;color:var(--color-primary)}
.sfa-kicker{font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-primary);margin:0 0 4px}
.sfa-context{display:flex !important;gap:10px;align-items:flex-start;margin:0 !important;font-size:13px !important;line-height:18px !important;font-weight:500;letter-spacing:-0.003em !important;color:var(--color-text-muted) !important;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:12px 14px}
.sfa-context strong{color:var(--color-text);font-weight:600}

/* ── Tarjeta ── */
.sfa-card{background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow-md)}
.sfa-card h1{font-size:30px;line-height:35px;font-weight:700;letter-spacing:-0.025em;margin:0}
.sfa-card h2{font-size:20px;line-height:25px;font-weight:600;letter-spacing:-0.015em;margin:0 0 14px}
.sfa-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.sfa-card-head h2{margin-bottom:4px}
.sfa-muted{color:var(--color-text-muted);font-size:14px;line-height:20px;letter-spacing:-0.006em;margin:0 0 12px}
.sfa-note{font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted);margin:14px 0 0}

/* ── Consentimiento (casilla) ── */
.sfa-check{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:var(--color-bg-alt);border-radius:var(--radius-md);margin:10px 0;cursor:pointer}
.sfa-check input,.sfa-scan-check input{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:20px;height:20px;margin:0;border:1.5px solid var(--color-border-strong);border-radius:var(--radius-xs);background:var(--color-bg);cursor:pointer;display:inline-grid;place-content:center}
.sfa-check input::before,.sfa-scan-check input::before{content:"";width:14px;height:14px;background:#fff;-webkit-mask:${CHECK_MASK} center/contain no-repeat;mask:${CHECK_MASK} center/contain no-repeat;transform:scale(0)}
.sfa-check input:checked,.sfa-scan-check input:checked{background:var(--color-primary);border-color:var(--color-primary)}
.sfa-check input:checked::before,.sfa-scan-check input:checked::before{transform:scale(1)}
.sfa-check label{display:flex;flex-direction:column;gap:2px;cursor:pointer}
.sfa-check strong{font-size:14px;line-height:20px;font-weight:600;letter-spacing:-0.006em}
.sfa-check small{font-size:14px;line-height:20px;letter-spacing:-0.006em;color:var(--color-text-muted)}

/* ── Botones (Alto 48, radio 12; en movil ocupa todo el ancho) ── */
.sfa-actions{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.sfa-actions-row{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-items:center}
.sfa-actions-row>.sfa-btn{flex:1 1 auto;white-space:nowrap}
.sfa-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:1.5px solid transparent;border-radius:var(--radius-md);font-family:inherit;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;text-align:center;text-decoration:none;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,transform .06s ease}
.sfa-btn:active:not(:disabled){transform:translateY(1px)}
.sfa-btn-primary{background:var(--color-primary);color:#fff}
.sfa-btn-primary:hover:not(:disabled){background:var(--color-primary-hover)}
.sfa-btn-ghost{background:var(--color-bg);border-color:var(--color-primary);color:var(--color-primary-hover)}
.sfa-btn-ghost:hover:not(:disabled){background:var(--color-primary-light)}
.sfa-btn-secondary{background:var(--color-primary-light);border-color:var(--color-primary);color:var(--color-primary-hover)}
.sfa-btn-dark{background:#fff;color:var(--color-primary-dark)}
.sfa-btn:disabled,.sfa-btn[aria-disabled="true"]{background:var(--color-border);border-color:var(--color-border);color:var(--color-text-muted);cursor:not-allowed}
.sfa-link{background:none;border:none;padding:6px;color:var(--color-primary-hover);font-family:inherit;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;text-decoration:none;text-align:center;cursor:pointer}
.sfa-link:hover{text-decoration:underline}
.sfa-link.as-button{padding:0}

/* ── Barra de pasos ── */
.sfa-progress{display:flex;flex-direction:column;gap:8px}
.sfa-progress-head{display:flex;justify-content:space-between;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-progress-track{height:6px;border-radius:var(--radius-pill);background:var(--color-rail);overflow:hidden}
.sfa-progress-track span{display:block;height:100%;background:var(--gradient-progress);border-radius:var(--radius-pill);transition:width .25s ease}

/* ── Pregunta + Respuesta ── */
.sfa-fieldset{border:0;padding:0;margin:0 0 24px;min-width:0}
.sfa-fieldset:last-child{margin-bottom:0}
.sfa-fieldset legend{font-size:20px;line-height:25px;font-weight:600;letter-spacing:-0.015em;margin:0 0 14px;padding:0}
.sfa-options{display:flex;flex-direction:column;gap:16px}
.sfa-opt{display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:14px 16px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;transition:background-color .15s ease,border-color .15s ease}
.sfa-opt input{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:20px;height:20px;margin:0;border:1.5px solid var(--color-border-strong);border-radius:50%;background:var(--color-bg);cursor:pointer}
.sfa-opt input:checked{border-color:var(--color-primary);background:radial-gradient(circle,var(--color-primary) 0 5.5px,var(--color-bg) 6px)}
.sfa-opt:has(input:checked){background:var(--color-primary-light);border-color:var(--color-primary);box-shadow:inset 0 0 0 1px var(--color-primary)}

/* ── Chip de opcion ── */
.sfa-chips{display:flex;flex-wrap:wrap;gap:8px}
.sfa-chip{appearance:none;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border-radius:var(--radius-pill);border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);font-family:inherit;font-size:14px;line-height:20px;font-weight:400;letter-spacing:-0.006em;cursor:pointer}
.sfa-chip.is-on{background:var(--color-primary-light);border:1.5px solid var(--color-primary);padding:0 15.5px;color:var(--color-primary-hover);font-weight:600}
.sfa-chip.is-on::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:${CHECK_MASK} center/contain no-repeat;mask:${CHECK_MASK} center/contain no-repeat}

/* ── Perfil (lista de datos) ── */
.sfa-summary{display:flex;flex-direction:column;margin:0 0 8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden}
.sfa-summary div{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-bottom:1px solid var(--color-border)}
.sfa-summary div:last-child{border-bottom:0}
.sfa-summary dt{font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-summary dd{margin:0;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em}
.sfa-card:has(.sfa-summary){background:var(--gradient-porcelain-light),linear-gradient(25deg,var(--gradient-porcelain-stops));border:0;box-shadow:none}
.sfa-card:has(.sfa-summary) .sfa-summary{border:0}

/* ── Tarjeta de producto recomendado ── */
.sfa-list{display:flex;flex-direction:column;gap:16px}
.sfa-product{display:grid;grid-template-columns:88px minmax(0,1fr);column-gap:14px;row-gap:14px;align-items:start;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:16px;box-shadow:var(--shadow-md);transition:border-color .15s ease}
.sfa-product.is-selected{border-color:var(--color-primary);box-shadow:var(--shadow-md),inset 0 0 0 0.5px var(--color-primary)}
.sfa-product-media img{width:88px;height:88px;object-fit:cover;object-position:50% 68%;border-radius:var(--radius-md);display:block;background:var(--color-primary-light)}
.sfa-product-placeholder{width:88px;height:88px;border-radius:var(--radius-md);background:linear-gradient(160deg,#f2f6ff,var(--color-primary-light));display:flex;align-items:center;justify-content:center}
.sfa-product-placeholder span{font-size:30px;font-weight:700;color:var(--color-primary)}
.sfa-product-body{display:contents}
.sfa-product-head{display:flex;flex-direction:column;gap:4px;min-width:0}
.sfa-product-head h2{font-size:17px;line-height:22px;font-weight:600;letter-spacing:-0.012em;margin:0}
.sfa-product-head p{margin:0;font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-primary)}
.sfa-product-head>div{display:flex;flex-direction:column-reverse;gap:4px}
.sfa-price{font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;white-space:nowrap}
.sfa-reasons{grid-column:1 / -1;list-style:none;margin:0;padding:12px 14px;background:var(--color-bg-alt);border-radius:var(--radius-md);display:flex;flex-direction:column;gap:8px}
.sfa-reasons::before{content:"Por qué te lo recomendamos";font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em}
.sfa-reasons li{display:flex;gap:10px;align-items:baseline;font-size:14px;line-height:20px;letter-spacing:-0.006em}
.sfa-reasons li::before{content:"";flex:0 0 6px;width:6px;height:6px;border-radius:50%;background:var(--color-primary);transform:translateY(-2px)}
.sfa-reason-code{font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.06em;color:var(--color-primary);text-transform:uppercase}
.sfa-product-foot{grid-column:1 / -1;display:flex;flex-direction:row-reverse;justify-content:flex-end;align-items:center;gap:12px}
.sfa-product-foot .sfa-btn{min-height:40px;min-width:120px;padding:0 16px;border-radius:var(--radius-pill);font-size:14px;line-height:20px;letter-spacing:-0.006em;gap:6px}
.sfa-product-foot .sfa-btn-ghost{border-width:1px;border-color:var(--color-border);color:var(--color-text);font-weight:400}
.sfa-product-foot .sfa-btn-secondary::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:${CHECK_MASK} center/contain no-repeat;mask:${CHECK_MASK} center/contain no-repeat}
.sfa-product-foot .sfa-pill-success,.sfa-product-foot .sfa-pill-muted{background:none;padding:0;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}

/* ── Insignias ── */
.sfa-pill-success,.sfa-pill-muted{display:inline-flex;align-items:center;gap:6px;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;border-radius:var(--radius-xs);padding:4px 10px;white-space:nowrap}
.sfa-pill-success{color:var(--color-success);background:var(--color-success-bg)}
.sfa-pill-success::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.sfa-pill-muted{color:var(--color-text-muted);background:var(--color-bg-alt)}
.sfa-product-foot .sfa-pill-success::before{display:none}

/* ── Aviso / como elegimos ── */
.sfa-note-box{display:grid;grid-template-columns:20px 1fr;column-gap:10px;row-gap:2px;background:var(--color-bg);border-radius:var(--radius-md);padding:12px 14px;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-note-box::before{content:"";grid-row:1 / span 2;width:20px;height:20px;background:var(--color-text-muted);-webkit-mask:${INFO_MASK} center/contain no-repeat;mask:${INFO_MASK} center/contain no-repeat}
.sfa-note-box strong{color:var(--color-text);font-size:13px;font-weight:600}

/* ── Mi rutina · Medidor de racha ── */
.sfa-routine{display:flex;flex-direction:column;gap:16px}
.sfa-card.sfa-routine{background:var(--color-surface-warm);box-shadow:none}
.sfa-streak-head{display:flex;flex-direction:row-reverse;justify-content:space-between;gap:14px;align-items:flex-start}
.sfa-streak-head h2{margin:0 0 3px;font-size:17px;line-height:22px;letter-spacing:-0.012em}
.sfa-streak-head .sfa-muted{margin:0}
.sfa-streak-badge{display:flex;flex-direction:column;gap:2px;text-align:left;min-width:0}
.sfa-streak-badge strong{display:block;font-size:72px;line-height:72px;font-weight:700;letter-spacing:-0.045em;color:var(--color-primary-dark)}
.sfa-streak-badge span{font-size:14px;line-height:20px;letter-spacing:-0.006em;color:var(--color-text-muted)}

/* Trama de dias: cumplido azul noche, hoy durazno, pendiente contorno */
.sfa-week{display:flex;gap:10px}
.sfa-day{display:flex;flex-direction:column-reverse;align-items:center;gap:6px}
.sfa-day span{font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-day i{display:block;width:14px;height:14px;border-radius:50%;border:1.5px solid var(--color-border);background:transparent;font-size:0;font-style:normal}
.sfa-day.is-done i{background:var(--color-primary-dark);border-color:var(--color-primary-dark)}
.sfa-day.is-today i{background:var(--color-peach);border-color:var(--color-peach)}
.sfa-day.is-today span{color:var(--color-warm-text)}

/* Tarea del dia y premio */
.sfa-task{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:14px}
.sfa-task strong{display:block;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em}
.sfa-task span{display:block;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-task .sfa-btn{flex:0 0 auto}
.sfa-task:has(.sfa-btn:disabled){border-color:var(--color-success)}
.sfa-benefit{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--color-warm-bg);border-radius:var(--radius-md);padding:10px 12px}
.sfa-benefit>div{display:grid;grid-template-columns:18px 1fr;column-gap:8px;align-items:center}
.sfa-benefit>div::before{content:"";grid-row:1 / span 2;width:18px;height:18px;background:var(--color-warm-text);-webkit-mask:${TAG_MASK} center/contain no-repeat;mask:${TAG_MASK} center/contain no-repeat}
.sfa-benefit strong{display:block;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;color:var(--color-warm-text)}
.sfa-benefit span{font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text)}

/* ── Carrito ── */
.sfa-cart-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:16px}
.sfa-cart-list li{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:4px 0 12px;border-bottom:1px solid var(--color-border)}
.sfa-cart-list strong{display:block;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em}
.sfa-cart-list li>div span{display:block;margin-top:2px;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-cart-list li>span{font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em;white-space:nowrap}
.sfa-total{display:flex;justify-content:space-between;align-items:center;font-size:16px;line-height:23px;font-weight:600;letter-spacing:-0.011em}
.sfa-total strong{font-size:16px;font-weight:600}

/* ── Alertas y niveles ── */
.sfa-alert{background:var(--color-warning-bg);color:var(--color-warning);border-radius:var(--radius-md);padding:12px 14px;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;margin-top:12px}
.sfa-scan-chips{display:flex;flex-wrap:wrap;gap:8px}
.sfa-level-chip{font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;padding:4px 10px;border-radius:var(--radius-xs);background:var(--color-bg-alt);color:var(--color-text-muted)}
.sfa-level-chip.is-low{background:var(--color-success-bg);color:var(--color-success)}
.sfa-level-chip.is-medium{background:var(--color-warning-bg);color:var(--color-warning)}
.sfa-level-chip.is-high{background:var(--color-error-bg);color:var(--color-error)}
.sfa-level-chip.is-unknown{background:var(--color-bg-alt);color:var(--color-text-muted)}

/* ── Pie ── */
.sfa-foot{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 12px;width:100%;max-width:var(--screen-max);margin:0 auto;padding:8px var(--gutter) 24px;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted);text-align:center}

/* ════════════════ Pulido visual ════════════════
 * Capa de refinamiento: solo estilos. No cambia estructura, contenido ni
 * tokens de identidad (colores, tipografía, marca) de streakify.css.
 * Bordes en tinta translúcida, sombras teñidas, profundidad en el CTA,
 * ritmo vertical y estados más claros. */
.sfa-page{-webkit-tap-highlight-color:transparent;font-feature-settings:"cv11","ss01"}
.sfa-page h1,.sfa-page h2,.sfa-page legend{text-wrap:balance}
.sfa-page p,.sfa-page li,.sfa-page small{text-wrap:pretty}
.sfa-price,.sfa-total,.sfa-cart-list li>span,.sfa-progress-head,.sfa-streak-badge strong{font-variant-numeric:tabular-nums}

/* Barra superior: fija, translúcida, con el isotipo real */
.sfa-top{position:sticky;top:0;z-index:20;padding:14px var(--gutter) 12px;background:linear-gradient(180deg,rgba(247,249,253,.92),rgba(247,249,253,.72));-webkit-backdrop-filter:saturate(1.6) blur(14px);backdrop-filter:saturate(1.6) blur(14px);box-shadow:0 1px 0 rgba(20,33,61,.06)}
.sfa-mark{width:32px;height:32px;border-radius:0;background:url("/brand/isotipo-contenedor.svg") center/contain no-repeat;font-size:0;color:transparent;filter:drop-shadow(0 4px 8px rgba(35,72,196,.28))}
.sfa-brand{gap:11px}
.sfa-brand strong{letter-spacing:-0.02em}
.sfa-demo-pill{background:transparent;box-shadow:inset 0 0 0 1px rgba(20,33,61,.12);border-radius:var(--radius-pill);padding:3px 10px;font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.02em}

/* Ritmo del contenido */
.sfa-main{padding-top:20px;gap:20px}
.sfa-hero{gap:12px}
.sfa-hero p.sfa-kicker{margin:0 0 -2px;display:inline-flex;align-items:center;gap:8px}
.sfa-hero p.sfa-kicker::before{content:"";width:16px;height:2px;border-radius:2px;background:currentColor;opacity:.55}
.sfa-hero p{max-width:36ch}

/* Tarjetas: borde en tinta translúcida y sombra teñida en dos capas */
.sfa-card,.sfa-product{border-color:rgba(20,33,61,.08);border-radius:20px;box-shadow:0 1px 2px rgba(20,33,61,.04),0 12px 28px -12px rgba(20,33,61,.16)}
.sfa-card{padding:22px 20px}
.sfa-card h2{letter-spacing:-0.02em}
.sfa-card-head{margin-bottom:18px}
.sfa-context,.sfa-note-box{border:1px solid rgba(20,33,61,.07);box-shadow:0 1px 2px rgba(20,33,61,.03)}
.sfa-note-box{background:rgba(255,255,255,.7)}

/* Botones: el primario con luz y profundidad, el fantasma más ligero */
.sfa-btn{min-height:50px;border-radius:14px;transition:background-color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .08s ease}
.sfa-btn-primary{background:linear-gradient(180deg,#3a68ee 0%,var(--color-primary) 55%,#2a55d8 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(27,58,158,.25),0 10px 22px -10px rgba(45,91,227,.7)}
.sfa-btn-primary:hover:not(:disabled){background:linear-gradient(180deg,#3360e6 0%,var(--color-primary-hover) 100%)}
.sfa-btn-primary:active:not(:disabled){box-shadow:inset 0 1px 2px rgba(20,33,61,.25)}
.sfa-btn-ghost{border-width:1px;border-color:rgba(45,91,227,.38);background:rgba(255,255,255,.85)}
.sfa-btn-ghost:hover:not(:disabled){border-color:var(--color-primary)}
.sfa-btn-secondary{border-width:1px}
.sfa-btn:disabled,.sfa-btn[aria-disabled="true"]{background:#e8ecf4;border-color:transparent;color:#8b95ab;box-shadow:none}
.sfa-link{text-underline-offset:4px;text-decoration-thickness:1px}
.sfa-actions-row{gap:10px}

/* Barra de pasos */
.sfa-progress-head{font-weight:600;color:var(--color-text-muted)}
.sfa-progress-track{height:6px;background:rgba(20,33,61,.07)}
.sfa-progress-track span{box-shadow:0 0 10px rgba(45,91,227,.35)}

/* Preguntas: opciones más compactas y selección con peso */
.sfa-fieldset{margin-bottom:28px}
.sfa-fieldset legend{margin-bottom:12px}
.sfa-options{gap:10px}
.sfa-opt{min-height:54px;padding:13px 16px;border-color:rgba(20,33,61,.1);border-radius:14px;box-shadow:0 1px 2px rgba(20,33,61,.03)}
.sfa-opt:hover{border-color:rgba(45,91,227,.45)}
.sfa-opt input{transition:border-color .15s ease,background .15s ease}
.sfa-opt:has(input:checked){border-color:var(--color-primary);box-shadow:0 0 0 1px var(--color-primary),0 8px 18px -12px rgba(45,91,227,.6)}
.sfa-chip{border-color:rgba(20,33,61,.12)}
.sfa-check{border:1px solid rgba(20,33,61,.06)}

/* Perfil */
.sfa-summary{box-shadow:0 1px 2px rgba(20,33,61,.04),0 10px 24px -16px rgba(164,71,31,.35)}
.sfa-summary div{border-bottom-color:rgba(20,33,61,.07);padding:13px 16px}

/* Recomendaciones */
.sfa-list{gap:14px}
.sfa-product{padding:16px 16px 14px;transition:border-color .18s ease,box-shadow .18s ease}
.sfa-product.is-selected{border-color:var(--color-primary);box-shadow:0 0 0 1px var(--color-primary),0 14px 30px -14px rgba(45,91,227,.45)}
.sfa-product-media img,.sfa-product-placeholder{border-radius:14px;box-shadow:inset 0 0 0 1px rgba(20,33,61,.06)}
.sfa-reasons{background:var(--color-bg-alt);border:1px solid rgba(20,33,61,.05);border-radius:14px;padding:13px 14px}
.sfa-reasons::before{font-size:11px;line-height:14px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-muted)}
.sfa-reasons li::before{transform:translateY(-1px);box-shadow:0 0 0 3px rgba(45,91,227,.14)}
.sfa-product-foot .sfa-btn{min-height:40px;border-radius:var(--radius-pill);box-shadow:none}
.sfa-product-foot .sfa-btn-ghost{border-color:rgba(20,33,61,.14)}

/* Mi rutina: la tarea del día respira y el botón no aprieta el texto */
.sfa-card.sfa-routine{border-color:rgba(164,71,31,.1);box-shadow:0 1px 2px rgba(20,33,61,.04),0 14px 30px -16px rgba(164,71,31,.3)}
.sfa-streak-badge strong{background:linear-gradient(180deg,var(--color-primary) 0%,var(--color-primary-dark) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sfa-day i{width:16px;height:16px}
.sfa-day.is-done i{box-shadow:0 2px 6px -2px rgba(27,58,158,.6)}
.sfa-day.is-today i{box-shadow:0 0 0 4px rgba(224,112,63,.18)}
.sfa-task{flex-wrap:wrap;border-color:rgba(20,33,61,.08);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,33,61,.04)}
.sfa-task>div{flex:1 1 180px;min-width:0}
.sfa-task .sfa-btn{flex:1 1 140px}
.sfa-benefit{border:1px solid rgba(164,71,31,.12);border-radius:14px;padding:12px 14px}

/* Carrito */
.sfa-cart-list li{border-bottom-color:rgba(20,33,61,.08);padding-bottom:14px}
.sfa-total{padding-top:4px;font-size:17px}
.sfa-total strong{font-size:20px;letter-spacing:-0.02em}

/* Escaneo · consejos como lista con filetes, no azulejos */
.sfa-page .sfa-scan-tips{gap:0;border-top:1px solid rgba(20,33,61,.07)}
.sfa-page .sfa-scan-tip{background:transparent;border-radius:0;padding:14px 2px;gap:14px;border-bottom:1px solid rgba(20,33,61,.07)}
.sfa-page .sfa-scan-tip{position:relative}
.sfa-page .sfa-scan-tip::before{content:"";position:absolute;left:2px;top:50%;width:36px;height:36px;margin-top:-18px;border-radius:12px;background:var(--color-primary-light)}
.sfa-page .sfa-scan-tip .icon{position:relative;margin:0 8px;color:var(--color-primary)}
.sfa-page .sfa-scan-badge{border-radius:var(--radius-pill);background:var(--color-primary-light);color:var(--color-primary-hover)}

/* Pie */
.sfa-foot{opacity:.8;padding-top:24px}
/* Pulido visual v2 · presentación en pantallas grandes */
@media (min-width:600px){
  body{background:radial-gradient(900px 500px at 15% 0,#dfe7ff 0%,rgba(223,231,255,0) 70%),radial-gradient(700px 500px at 100% 100%,#e6ecff 0%,rgba(230,236,255,0) 70%),#f3f6fc}
  .sfa-page{max-width:420px;margin:28px auto;min-height:calc(100vh - 56px);border-radius:36px;overflow:clip;box-shadow:0 0 0 10px #fff,0 0 0 11px rgba(20,33,61,.08),0 40px 80px -30px rgba(20,33,61,.45)}
  .sfa-page-scanner{border-radius:36px}
}
.sfa-hero h1{font-size:32px;line-height:36px;letter-spacing:-0.03em}
.sfa-card h2{font-size:21px}
/* Pulido visual v3 · cabecera de marca en todas las pantallas del asesor
 * La barra superior y el primer bloque de cada pantalla forman una banda
 * Azul noche continua; la tarjeta siguiente se monta sobre su borde. */
.sfa-top{background:#2b55da;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.sfa-brand strong{color:#fff}
.sfa-brand span:last-child{color:#c9d6fb}
.sfa-demo-pill{color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.sfa-mark{filter:drop-shadow(0 6px 12px rgba(5,12,40,.45))}
.sfa-main{padding-top:0}
.sfa-main>:first-child{position:relative;overflow:hidden;margin:0 calc(-1 * var(--gutter));padding:10px var(--gutter) 30px;border-radius:0 0 30px 30px;color:#fff;background:radial-gradient(360px 220px at 108% 95%,rgba(127,160,255,.42) 0%,rgba(127,160,255,0) 70%),radial-gradient(300px 180px at -10% 110%,rgba(20,40,122,.55) 0%,rgba(20,40,122,0) 70%),linear-gradient(180deg,#2b55da 0%,#2348c4 55%,#1b3a9e 100%);box-shadow:0 18px 36px -24px rgba(27,58,158,.8)}
.sfa-main>:first-child::after{content:"";position:absolute;right:-110px;top:12px;width:260px;height:260px;border-radius:50%;border:1.5px solid rgba(201,214,251,.22);pointer-events:none}
.sfa-main>:first-child:has(+ .sfa-card),.sfa-main>:first-child:has(+ .sfa-list){padding-bottom:64px}
.sfa-main>:first-child + .sfa-card,.sfa-main>:first-child + .sfa-list{position:relative;z-index:1;margin-top:-56px}
.sfa-main>.sfa-hero:first-child h1{color:#fff}
.sfa-main>.sfa-hero:first-child p{color:#dbe5ff}
.sfa-main>.sfa-hero:first-child p.sfa-kicker{color:#9db4f5}
.sfa-main>.sfa-hero:first-child .sfa-context{color:#dbe5ff !important;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);box-shadow:none}
.sfa-main>.sfa-hero:first-child .sfa-context strong{color:#fff}
.sfa-main>.sfa-progress:first-child{padding-top:14px}
.sfa-main>.sfa-progress:first-child .sfa-progress-head{color:#dbe5ff}
.sfa-main>.sfa-progress:first-child .sfa-progress-track{background:rgba(255,255,255,.18)}
.sfa-main>.sfa-progress:first-child .sfa-progress-track span{background:linear-gradient(90deg,#c9d6fb 0%,#ffffff 100%);box-shadow:0 0 12px rgba(255,255,255,.5)}
.sfa-main>:first-child + .sfa-progress{margin-top:4px}
`;
