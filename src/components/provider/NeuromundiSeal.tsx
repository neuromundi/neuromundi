/**
 * NeuromundiSeal — sello digital autocontenido (SVG) para que los prestadores lo
 * pongan en su web, redes o la puerta de su consultorio. Dos variantes:
 *  · 'accepts' → "Aceptamos Neuromundi ID"
 *  · 'ally'    → "Especialista Aliado Neuromundi"
 * Se descarga como PNG (rasterizado desde el SVG en un canvas) o como SVG. No
 * depende de imágenes ni fuentes externas para que el PNG salga fiel.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileImage } from 'lucide-react';
import { Button, useToast } from '@/components/ui';

export type SealVariant = 'accepts' | 'ally';

const COLORS: Record<SealVariant, { a: string; b: string }> = {
  accepts: { a: '#0ea5e9', b: '#0369a1' },
  ally: { a: '#7c3aed', b: '#4338ca' },
};

export function NeuromundiSeal({ variant }: { variant: SealVariant }) {
  const { t } = useTranslation();
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const c = COLORS[variant];
  const topLine = variant === 'accepts' ? t('nid.seal.acceptsTop') : t('nid.seal.allyTop');

  const serialize = () => {
    const el = svgRef.current;
    if (!el) return null;
    return new XMLSerializer().serializeToString(el);
  };

  const downloadSvg = () => {
    const s = serialize();
    if (!s) return;
    const blob = new Blob([s], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `neuromundi-sello-${variant}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const s = serialize();
    if (!s) { toast.error(t('qr.downloadError')); return; }
    const size = 720;
    const img = new Image();
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { toast.error(t('qr.downloadError')); return; }
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `neuromundi-sello-${variant}.png`;
      a.click();
    };
    img.onerror = () => toast.error(t('qr.downloadError'));
    img.src = svgUrl;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg ref={svgRef} viewBox="0 0 360 360" width="180" height="180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={topLine + ' Neuromundi ID'}>
        <defs>
          <linearGradient id={`g-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.a} />
            <stop offset="1" stopColor={c.b} />
          </linearGradient>
        </defs>
        <circle cx="180" cy="180" r="176" fill={`url(#g-${variant})`} />
        <circle cx="180" cy="180" r="150" fill="#ffffff" />
        <circle cx="180" cy="180" r="150" fill="none" stroke={c.a} strokeWidth="3" />
        {/* Emblema: círculo con check */}
        <circle cx="180" cy="118" r="34" fill={c.a} />
        <path d="M165 118 l10 11 l22 -24" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        {/* Texto */}
        <text x="180" y="182" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="700" fill="#0f172a" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>{topLine}</text>
        <text x="180" y="222" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="30" fontWeight="800" fill={c.b}>NEUROMUNDI ID</text>
        <text x="180" y="286" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="600" fill="#64748b">neuromundi.com</text>
      </svg>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={downloadPng}>PNG</Button>
        <Button size="sm" variant="ghost" leadingIcon={<FileImage className="h-4 w-4" />} onClick={downloadSvg}>SVG</Button>
      </div>
    </div>
  );
}
