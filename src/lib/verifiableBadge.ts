/**
 * verifiableBadge — descarga del distintivo VERIFICABLE del miembro, sin
 * dependencias (patrón print→PDF, igual que idCredential/aliadoCertificate).
 *
 * La clave anticlonación: el distintivo es PERSONALIZADO (nombre + folio) e
 * incluye un QR a /verificar/:folio. La imagen es ilustrativa; la autoridad es
 * esa página pública, que lee el estado real y vigente de la BD. El QR llega ya
 * renderizado (dataURL del canvas de qrcode.react), así funciona sin red.
 */
export interface VerifiableBadgeData {
  title: string;        // "Aliado Neuromundi" | "Empresa Inclusiva" | "Miembro verificado"
  name: string;         // nombre del miembro / organización
  folio: string;        // "NM-000123"
  qrDataUrl: string;    // QR a la URL de verificación
  verifyUrl: string;    // texto legible de la URL
  labels: { verify: string; folio: string };
}

export function downloadVerifiableBadge(d: VerifiableBadgeData): void {
  const w = window.open('', '_blank');
  if (!w) return;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${d.title} — ${d.name}</title>
<style>
  @page { size: 1080px 1080px; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seal { width: 1080px; height: 1080px; position: relative;
    background: radial-gradient(circle at 50% 38%, #20409a, #142a63);
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ring { position: absolute; inset: 40px; border: 14px solid #C9A227; border-radius: 50%; }
  .title { color: #fff; font-weight: 800; font-size: 76px; margin: 0 40px; line-height: 1.05; }
  .band { margin-top: 26px; background: #C9A227; color: #142a63; font-weight: 800;
    letter-spacing: 3px; font-size: 38px; padding: 12px 40px; border-radius: 40px; }
  .name { color: #fff; font-weight: 700; font-size: 44px; margin: 30px 60px 6px; }
  .folio { color: #C9A227; font-weight: 800; font-size: 30px; letter-spacing: 2px; }
  .qrbox { margin-top: 24px; background: #fff; padding: 14px; border-radius: 16px; }
  .qrbox img { width: 190px; height: 190px; display: block; }
  .verify { color: #e7ecff; font-size: 24px; margin-top: 14px; }
</style></head><body>
  <div class="seal">
    <div class="ring"></div>
    <div class="title">${d.title}</div>
    <div class="band">NEUROMUNDI</div>
    <div class="name">${d.name}</div>
    <div class="folio">${d.labels.folio}: ${d.folio}</div>
    ${d.qrDataUrl ? `<div class="qrbox"><img src="${d.qrDataUrl}" alt="QR"></div>` : ''}
    <div class="verify">${d.labels.verify}: ${d.verifyUrl}</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
