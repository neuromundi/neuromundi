/**
 * aliadoCertificate — reconocimiento "Aliado Destacado" descargable en PDF
 * tamaño carta. Se genera SIN dependencias: se abre un documento HTML con
 * `@page { size: letter }` y se lanza el diálogo de impresión, desde el que la
 * persona guarda como PDF. Todo el texto llega ya localizado desde la UI.
 */

export interface CertificateData {
  memberNo: string; // ya formateado, p. ej. "NM-000123"
  name: string;
  specialty: string;
  dateStr: string;
}

export interface CertificateLabels {
  brand: string; // "Neuromundi"
  heading: string; // "Reconocimiento"
  award: string; // "Aliado Destacado"
  awardedTo: string; // "Se otorga este reconocimiento a"
  memberLabel: string; // "Afiliado"
  specialtyLabel: string; // "Especialidad / Rubro"
  justification: string; // texto de justificación
  dateLabel: string; // "Fecha de emisión"
  fileTitle: string; // título de la ventana / documento
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function openAliadoCertificate(data: CertificateData, l: CertificateLabels): void {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(l.fileTitle)}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 8.5in; height: 11in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 8.5in; height: 11in; padding: 0.9in 0.85in; display: flex; }
  .frame { flex: 1; border: 3px solid #0ea5e9; border-radius: 10px; padding: 0.55in 0.6in; display: flex; flex-direction: column; text-align: center; position: relative; }
  .frame::after { content: ''; position: absolute; inset: 10px; border: 1px solid #bae6fd; border-radius: 6px; pointer-events: none; }
  .brand { letter-spacing: .28em; font-family: Arial, Helvetica, sans-serif; font-weight: 700; color: #0369a1; font-size: 15px; text-transform: uppercase; }
  .heading { margin-top: .55in; font-size: 34px; letter-spacing: .04em; color: #0f172a; }
  .rule { width: 90px; height: 3px; background: #0ea5e9; margin: 14px auto 0; border-radius: 3px; }
  .award { margin-top: .5in; font-size: 46px; font-weight: 700; color: #0369a1; }
  .awardedTo { margin-top: .55in; font-size: 15px; color: #475569; font-style: italic; }
  .name { margin-top: 10px; font-size: 30px; font-weight: 700; }
  .meta { margin-top: 6px; font-size: 15px; color: #334155; }
  .just { margin-top: .5in; font-size: 14px; line-height: 1.6; color: #334155; max-width: 5.6in; margin-left: auto; margin-right: auto; }
  .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #475569; }
  .footer .date { text-align: left; }
  .footer .member { text-align: right; font-family: Arial, Helvetica, sans-serif; font-weight: 700; letter-spacing: .05em; color: #0f172a; }
  .sig { margin-top: 34px; border-top: 1px solid #94a3b8; width: 2.2in; padding-top: 6px; font-family: Arial, Helvetica, sans-serif; }
</style></head>
<body>
  <div class="page"><div class="frame">
    <div class="brand">${esc(l.brand)}</div>
    <div class="heading">${esc(l.heading)}</div>
    <div class="rule"></div>
    <div class="award">${esc(l.award)}</div>
    <div class="awardedTo">${esc(l.awardedTo)}</div>
    <div class="name">${esc(data.name)}</div>
    <div class="meta">${esc(l.specialtyLabel)}: ${esc(data.specialty)}</div>
    <div class="just">${esc(l.justification)}</div>
    <div class="footer">
      <div class="date">
        <div class="sig">${esc(l.brand)}</div>
        <div>${esc(l.dateLabel)}: ${esc(data.dateStr)}</div>
      </div>
      <div class="member">${esc(l.memberLabel)}: ${esc(data.memberNo)}</div>
    </div>
  </div></div>
  <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
