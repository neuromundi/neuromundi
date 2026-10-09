/**
 * orgLetterTemplate — plantilla descargable de la "Carta de manifestación como
 * organización de hecho" para las ONG que no cuentan con acta constitutiva.
 *
 * Se genera SIN dependencias (igual que aliadoCertificate/idCredential): abre un
 * HTML tamaño carta con `@page` y lanza el diálogo de impresión, desde el que la
 * persona la guarda como PDF. Lleva campos con líneas para llenar a mano o, si
 * prefieren, pueden escribir sobre el PDF. Todo el texto llega localizado.
 */

export interface OrgLetterLabels {
  brand: string;        // "Neuromundi"
  fileTitle: string;    // título de la ventana/documento
  heading: string;      // "Carta de manifestación como organización de hecho"
  placeDate: string;    // "Lugar y fecha"
  to: string;           // "A quien corresponda — Equipo de Neuromundi:"
  intro: string;        // párrafo de manifestación bajo protesta de decir verdad
  fOrg: string;         // "Nombre de la organización"
  fRep: string;         // "Representante / persona de contacto"
  fPhone: string;       // "Teléfono"
  fEmail: string;       // "Correo electrónico"
  fCity: string;        // "Localidad / ciudad"
  fCountry: string;     // "País"
  fPurpose: string;     // "Objeto / actividad en beneficio de la comunidad"
  declare: string;      // declaración de veracidad + autorización de verificación
  signature: string;    // "Nombre y firma del representante"
  note: string;         // nota al pie (esta carta sustituye al acta para verificación)
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RTL = new Set(['ar', 'he']);

export function openOrgLetterTemplate(l: OrgLetterLabels, lang = 'es'): void {
  const dir = RTL.has(lang.slice(0, 2)) ? 'rtl' : 'ltr';
  const line = '<span class="fill"></span>';
  const field = (label: string) =>
    `<div class="field"><span class="lbl">${esc(label)}:</span> ${line}</div>`;

  const html = `<!doctype html>
<html lang="${esc(lang)}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(l.fileTitle)}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 8.5in; min-height: 11in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 8.5in; min-height: 11in; padding: 0.9in 0.9in 0.8in; display: flex; flex-direction: column; }
  .brand { letter-spacing: .26em; font-family: Arial, Helvetica, sans-serif; font-weight: 700; color: #0369a1; font-size: 13px; text-transform: uppercase; }
  .rule { width: 100%; height: 2px; background: #0ea5e9; margin: 10px 0 24px; }
  h1 { font-size: 20px; line-height: 1.3; margin-bottom: 18px; }
  .placedate { font-size: 13px; color: #334155; margin-bottom: 20px; }
  .placedate .fill { min-width: 3.4in; }
  .to { font-size: 14px; font-weight: 700; margin-bottom: 14px; }
  p.intro, p.declare { font-size: 13.5px; line-height: 1.75; margin-bottom: 20px; text-align: justify; }
  .fields { margin: 6px 0 22px; }
  .field { font-size: 13.5px; line-height: 2.5; }
  .lbl { font-weight: 700; color: #0f172a; }
  .fill { display: inline-block; border-bottom: 1px solid #0f172a; min-width: 2.6in; height: 1em; vertical-align: baseline; }
  .sigbox { margin-top: 0.7in; text-align: center; }
  .sigline { border-top: 1px solid #0f172a; width: 3.2in; margin: 0 auto 6px; }
  .sigcap { font-size: 12.5px; color: #334155; }
  .note { margin-top: auto; padding-top: 22px; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="page">
    <div class="brand">${esc(l.brand)}</div>
    <div class="rule"></div>
    <h1>${esc(l.heading)}</h1>
    <div class="placedate">${esc(l.placeDate)}: ${line}</div>
    <div class="to">${esc(l.to)}</div>
    <p class="intro">${esc(l.intro)}</p>
    <div class="fields">
      ${field(l.fOrg)}
      ${field(l.fRep)}
      ${field(l.fPhone)}
      ${field(l.fEmail)}
      ${field(l.fCity)}
      ${field(l.fCountry)}
      ${field(l.fPurpose)}
    </div>
    <p class="declare">${esc(l.declare)}</p>
    <div class="sigbox">
      <div class="sigline"></div>
      <div class="sigcap">${esc(l.signature)}</div>
    </div>
    <div class="note">${esc(l.note)}</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
