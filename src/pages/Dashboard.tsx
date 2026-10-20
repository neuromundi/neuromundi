/**
 * Dashboard — enruta al panel correcto segun el rol del usuario.
 *
 * Mientras el rol no llega se muestra un esqueleto. Antes ese esqueleto NO
 * tenia salida: si el perfil no cargaba —sin red, un token recien vencido, una
 * pestana que estuvo horas abierta— la persona se quedaba mirando un armazon
 * gris para siempre, sin una palabra y sin nada que pulsar. Lo vi yo mismo el
 * 19 de octubre de 2026: siete segundos y medio de "Cargando" en el panel, que
 * entonces atribui a una pestana vieja. La pestana vieja era el sintoma; esto
 * era la causa. (Repaso adversario, modo "ceros y vacios".)
 *
 * Ahora, pasado un plazo, el esqueleto se convierte en un mensaje que dice lo
 * que pasa y ofrece volver a intentarlo.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Button, SkeletonCard } from '@/components/ui';
import { ParentDashboard } from '@/components/parent';
import { ProviderDashboard } from '@/components/provider';
import { AdminDashboard } from '@/components/admin';

/** Lo que se espera antes de admitir que algo no va. Generoso a proposito: una
 *  conexion lenta no es un error, y asustar a nadie por tres segundos seria
 *  peor que esperar. */
const PACIENCIA_MS = 9000;

export function Dashboard() {
  const { t } = useTranslation();
  const { role, isAdvisor } = useAuth();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [seAgotoLaPaciencia, setSeAgotoLaPaciencia] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    if (role) return;
    const reloj = setTimeout(() => setSeAgotoLaPaciencia(true), PACIENCIA_MS);
    return () => clearTimeout(reloj);
  }, [role]);

  if (!role) {
    if (!seAgotoLaPaciencia) {
      return (
        <div className="mx-auto max-w-2xl p-4" aria-busy="true">
          <SkeletonCard rows={2} />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{t('panel.noCargoTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('panel.noCargoBody')}</p>
          <Button
            className="mt-4"
            loading={reintentando}
            onClick={async () => {
              setReintentando(true);
              setSeAgotoLaPaciencia(false);
              await refreshProfile();
              setReintentando(false);
            }}
          >
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (role === 'admin') return <AdminDashboard />;
  // Asesor (explorador + moderador de Neurocamps): panel limitado a metricas y foros.
  if (isAdvisor) return <AdminDashboard advisor />;
  if (role === 'provider') return <ProviderDashboard />;
  return <ParentDashboard />;
}
