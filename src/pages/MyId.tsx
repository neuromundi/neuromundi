/**
 * MyId — pantalla dedicada de la Neuromundi ID (ruta `/mi-id`, también el destino
 * del shortcut del PWA). Muestra la credencial a pantalla completa y funciona
 * OFFLINE: el QR se dibuja en el cliente (qrcode.react) y aquí cacheamos los datos
 * mínimos del ID en el dispositivo, así que la tarjeta abre aunque no haya red.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { NeuromundiIdCard } from '@/components/parent/NeuromundiIdCard';
import type { Profile } from '@/types/app';

const CACHE_KEY = 'neuro.id.card';

function readCache(): Profile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function MyId() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  // Cacheamos solo los campos que la tarjeta necesita (nada sensible más allá del
  // propio folio/QR del usuario, que ya es suyo).
  useEffect(() => {
    if (!profile) return;
    const slim = {
      id: profile.id,
      role: profile.role,
      provider_type: profile.provider_type,
      full_name: profile.full_name,
      business_name: profile.business_name,
      member_no: profile.member_no,
      created_at: profile.created_at,
      qr_token: profile.qr_token,
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    } catch {
      /* almacenamiento no disponible: seguimos con lo que haya en memoria */
    }
  }, [profile]);

  const effective = (profile ?? readCache()) as Profile | null;

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-4 text-center text-2xl font-bold text-slate-900">{t('nid.pageTitle')}</h1>
      {effective ? (
        <NeuromundiIdCard profile={effective} />
      ) : (
        <p className="text-center text-sm text-muted">{t('nid.needLogin')}</p>
      )}
    </div>
  );
}
