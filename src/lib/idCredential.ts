/**
 * idCredential — descarga la "Neuromundi ID" como PDF (vía impresión), SIN
 * dependencias: abre un documento HTML con la credencial (anverso) y el QR
 * embebido como imagen, y lanza el diálogo de imprimir → "Guardar como PDF".
 * Mismo patrón que `aliadoCertificate`. El QR llega ya renderizado (dataURL del
 * canvas de qrcode.react), así que funciona aunque no haya red.
 */
export interface IdCredentialData {
  qrDataUrl: string;
  brand: string;
  name: string;
  role: string;
  folio: string;
  issued: string; // ya con su etiqueta, o '' si no hay
  valid: string;
  scanTitle: string;
  steps: string[];
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function downloadIdCredential(d: IdCredentialData): void {
  const steps = d.steps.filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(d.brand)} — ${esc(d.name)}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card { width: 3.6in; border: 2px solid #0ea5e9; border-radius: 16px; overflow: hidden; margin: 0 auto; }
  .head { background: linear-gradient(90deg,#0ea5e9,#0369a1); color:#fff; padding: 10px 16px; }
  .head .b { font-weight: 800; letter-spacing: .18em; font-size: 12px; text-transform: uppercase; }
  .body { padding: 16px; display:flex; gap:14px; align-items:flex-start; }
  .info { flex:1; min-width:0; }
  .role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#64748b; }
  .name { font-size:18px; font-weight:800; margin-top:2px; }
  .folio { font-family:'Courier New', monospace; color:#0369a1; margin-top:4px; font-size:13px; }
  .meta { color:#64748b; font-size:11px; margin-top:6px; }
  .qr { width:1.15in; height:1.15in; border:1px solid #e2e8f0; border-radius:8px; padding:4px; }
  .qr img { width:100%; height:100%; }
  .how { padding: 0 16px 16px; }
  .how h4 { font-size:11px; margin-bottom:4px; }
  .how ol { padding-left:16px; color:#475569; font-size:11px; line-height:1.5; }
</style></head>
<body>
  <div class="card">
    <div class="head"><span class="b">${esc(d.brand)}</span></div>
    <div class="body">
      <div class="info">
        <div class="role">${esc(d.role)}</div>
        <div class="name">${esc(d.name)}</div>
        <div class="folio">${esc(d.folio)}</div>
        ${d.issued ? `<div class="meta">${esc(d.issued)}</div>` : ''}
        <div class="meta">${esc(d.valid)}</div>
      </div>
      ${d.qrDataUrl ? `<div class="qr"><img src="${d.qrDataUrl}" alt="QR"></div>` : ''}
    </div>
    <div class="how">
      <h4>${esc(d.scanTitle)}</h4>
      <ol>${steps}</ol>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
