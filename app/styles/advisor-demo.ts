/**
 * Hoja de estilos compartida por las superficies publicas del asesor
 * (recorrido demo y prototipo de scan). Se inyecta con <style>{...}</style>
 * para no depender del shell del Admin.
 */
export const ADVISOR_DEMO_CSS = `
.sfa-page{--green:#2E7D6F;--green-soft:#E6F1EE;--ink:#1A1A1A;--muted:#616161;--line:#E3E3E3;--bg:#F7F7F5;background:var(--bg);min-height:100vh;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column}
.sfa-page *{box-sizing:border-box}
.sfa-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;max-width:820px;width:100%;margin:0 auto}
.sfa-brand{display:flex;align-items:center;gap:10px}
.sfa-mark{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--green);color:#fff;font-weight:700}
.sfa-brand strong{display:block;font-size:15px;line-height:18px}
.sfa-brand span:last-child{display:block;font-size:12px;color:var(--muted)}
.sfa-demo-pill{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:var(--muted)}
.sfa-main{flex:1;width:100%;max-width:820px;margin:0 auto;padding:4px 20px 40px;display:flex;flex-direction:column;gap:18px}
.sfa-hero{padding:18px 0 4px}
.sfa-hero h1{font-size:30px;line-height:36px;letter-spacing:-.6px;margin:0 0 10px}
.sfa-hero p{margin:0;color:var(--muted);font-size:15px;line-height:23px;max-width:60ch}
.sfa-hero-compact h1{font-size:24px;line-height:30px}
.sfa-kicker{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin:0 0 8px}
.sfa-context{margin-top:12px !important;font-size:13px;background:#fff;border:1px dashed var(--line);border-radius:10px;padding:8px 12px;display:inline-block}
.sfa-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.sfa-card h2{font-size:19px;line-height:25px;margin:0 0 8px}
.sfa-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.sfa-muted{color:var(--muted);font-size:14px;line-height:21px;margin:0 0 12px}
.sfa-note{font-size:12px;line-height:18px;color:var(--muted);margin:14px 0 0}
.sfa-check{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:12px;margin:10px 0;cursor:pointer}
.sfa-check input{width:18px;height:18px;margin-top:2px;accent-color:var(--green)}
.sfa-check label{display:flex;flex-direction:column;gap:2px;cursor:pointer}
.sfa-check strong{font-size:14px}
.sfa-check small{font-size:12px;line-height:17px;color:var(--muted)}
.sfa-actions{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.sfa-actions-row{display:flex;flex-direction:row;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-end}
.sfa-btn{appearance:none;border:1px solid transparent;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;font-family:inherit;transition:transform .06s ease,background .15s ease}
.sfa-btn:active{transform:translateY(1px)}
.sfa-btn:disabled{opacity:.45;cursor:not-allowed}
.sfa-btn-primary{background:var(--green);color:#fff}
.sfa-btn-primary:hover:not(:disabled){background:#266b5f}
.sfa-btn-secondary{background:var(--green-soft);color:var(--green);border-color:#cfe3dd}
.sfa-btn-ghost{background:#fff;border-color:var(--line);color:var(--ink)}
.sfa-link{background:none;border:none;color:var(--green);font-size:13px;font-weight:600;text-decoration:underline;cursor:pointer;text-align:center;padding:6px;font-family:inherit}
.sfa-link.as-button{text-decoration:underline;padding:0}
.sfa-progress{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.sfa-progress-head{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.sfa-progress-track{height:6px;border-radius:999px;background:#E9E9E6;overflow:hidden}
.sfa-progress-track span{display:block;height:100%;background:var(--green);border-radius:999px;transition:width .25s ease}
.sfa-fieldset{border:0;padding:0;margin:0 0 22px}
.sfa-fieldset:last-child{margin-bottom:0}
.sfa-fieldset legend{font-size:16px;font-weight:650;margin-bottom:10px;padding:0}
.sfa-options{display:flex;flex-direction:column;gap:8px}
.sfa-opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;cursor:pointer;font-size:14px}
.sfa-opt input{accent-color:var(--green);width:16px;height:16px}
.sfa-opt:has(input:checked){border-color:var(--green);background:var(--green-soft)}
.sfa-chips{display:flex;flex-wrap:wrap;gap:8px}
.sfa-chip{appearance:none;font-family:inherit;font-size:13px;padding:9px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--ink)}
.sfa-chip.is-on{background:var(--green-soft);border-color:var(--green);color:var(--green);font-weight:600}
.sfa-summary{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 8px}
.sfa-summary div{background:var(--bg);border-radius:10px;padding:10px 12px}
.sfa-summary dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.sfa-summary dd{margin:0;font-size:14px;font-weight:600}
.sfa-list{display:flex;flex-direction:column;gap:14px}
.sfa-product{display:grid;grid-template-columns:132px 1fr;gap:16px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;transition:border-color .15s ease}
.sfa-product.is-selected{border-color:var(--green);box-shadow:0 0 0 1px var(--green) inset}
.sfa-product-media img{width:100%;height:132px;object-fit:cover;border-radius:10px;display:block}
.sfa-product-placeholder{width:100%;height:132px;border-radius:10px;background:linear-gradient(135deg,#E6F1EE,#D3E6E1);display:flex;align-items:center;justify-content:center}
.sfa-product-placeholder span{font-size:38px;font-weight:700;color:var(--green)}
.sfa-product-body{display:flex;flex-direction:column;gap:10px;min-width:0}
.sfa-product-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.sfa-product-head h2{font-size:16px;line-height:21px;margin:0 0 2px}
.sfa-product-head p{margin:0;font-size:12px}
.sfa-price{font-size:15px;white-space:nowrap}
.sfa-reasons{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.sfa-reasons li{display:flex;flex-direction:column;gap:1px;font-size:13px;line-height:18px}
.sfa-reason-code{font-size:9px;font-weight:700;letter-spacing:.08em;color:var(--green);text-transform:uppercase}
.sfa-product-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto}
.sfa-pill-success{font-size:11px;font-weight:700;color:#1c5c50;background:var(--green-soft);border-radius:999px;padding:4px 10px}
.sfa-pill-muted{font-size:11px;font-weight:600;color:var(--muted);background:#F1F1EF;border-radius:999px;padding:4px 10px}
.sfa-note-box{display:flex;flex-direction:column;gap:3px;background:#fff;border:1px dashed var(--line);border-radius:12px;padding:12px 14px;font-size:12px;line-height:18px;color:var(--muted)}
.sfa-note-box strong{color:var(--ink);font-size:12px}
.sfa-routine{display:flex;flex-direction:column;gap:18px}
.sfa-streak-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.sfa-streak-head h2{margin:0 0 3px}
.sfa-streak-badge{background:var(--green-soft);color:var(--green);border-radius:14px;padding:10px 14px;text-align:center;min-width:88px}
.sfa-streak-badge strong{display:block;font-size:26px;line-height:28px}
.sfa-streak-badge span{font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.sfa-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.sfa-day{display:flex;flex-direction:column;align-items:center;gap:5px}
.sfa-day span{font-size:11px;color:var(--muted)}
.sfa-day i{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;max-width:38px;border-radius:50%;background:#EFEFEC;color:#fff;font-style:normal;font-size:13px;font-weight:700}
.sfa-day.is-done i{background:var(--green)}
.sfa-day.is-today span{color:var(--ink);font-weight:700}
.sfa-day.is-today i{outline:2px solid var(--green);outline-offset:2px}
.sfa-task,.sfa-benefit{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.sfa-task strong,.sfa-benefit strong{display:block;font-size:14px}
.sfa-task span,.sfa-benefit span{font-size:12px;color:var(--muted)}
.sfa-cart-list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column}
.sfa-cart-list li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.sfa-cart-list li:last-child{border-bottom:0}
.sfa-cart-list strong{display:block;font-size:14px}
.sfa-cart-list span{font-size:12px;color:var(--muted)}
.sfa-total{display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line);font-size:15px}
.sfa-total strong{font-size:19px}
.sfa-alert{background:#FFF4E5;border:1px solid #F1D8A8;color:#5c4413;border-radius:10px;padding:10px 12px;font-size:12px;line-height:18px;margin-top:12px}
.sfa-scan-chips{display:flex;flex-wrap:wrap;gap:6px}
.sfa-level-chip{font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;background:#F1F1EF;color:var(--muted)}
.sfa-level-chip.is-low{background:var(--green-soft);color:#1c5c50}
.sfa-level-chip.is-medium{background:#FFF4E5;color:#5c4413}
.sfa-level-chip.is-high{background:#FDECEC;color:#8a1f1f}
.sfa-level-chip.is-unknown{background:#F1F1EF;color:var(--muted)}
.sfa-foot{display:flex;justify-content:space-between;gap:10px;max-width:820px;width:100%;margin:0 auto;padding:18px 20px 28px;font-size:11px;color:var(--muted)}
@media (max-width:620px){
  .sfa-hero h1{font-size:25px;line-height:31px}
  .sfa-main{padding:0 14px 32px}
  .sfa-product{grid-template-columns:1fr}
  .sfa-product-media img,.sfa-product-placeholder{height:170px}
  .sfa-summary{grid-template-columns:1fr}
  .sfa-actions-row{justify-content:stretch}
  .sfa-actions-row .sfa-btn{flex:1}
  .sfa-foot{flex-direction:column}
}
`;
