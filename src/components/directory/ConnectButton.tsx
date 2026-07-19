/**
 * ConnectButton — solicitar/gestionar conexión de red con otro proveedor.
 *
 * Solo se renderiza para proveedores (lo decide quien lo monta). Refleja el
 * estado: conectar, solicitud enviada, aceptar/rechazar (entrante) o quitar.
 */
import { UserPlus, Check, Clock, UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, useToast } from '@/components/ui';
import { useConnections } from '@/hooks/useConnections';

export function ConnectButton({ providerId }: { providerId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { stateWith, sendRequest, accept, remove, loading } = useConnections();
  const state = stateWith(providerId);

  const run = async (p: Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    const res = await p;
    toast[res.ok ? 'success' : 'error'](res.ok ? okMsg : res.error ?? '');
  };

  if (loading) return null;

  if (state.kind === 'connected') {
    return (
      <Button variant="secondary" size="sm" leadingIcon={<UserMinus className="h-4 w-4" />}
        onClick={() => run(remove(state.id), t('network.removed'))}>
        {t('network.connected')}
      </Button>
    );
  }

  if (state.kind === 'pending' && state.direction === 'outgoing') {
    return (
      <Button variant="ghost" size="sm" leadingIcon={<Clock className="h-4 w-4" />}
        onClick={() => run(remove(state.id), t('network.removed'))}>
        {t('network.pending')}
      </Button>
    );
  }

  if (state.kind === 'pending' && state.direction === 'incoming') {
    return (
      <div className="flex gap-2">
        <Button size="sm" leadingIcon={<Check className="h-4 w-4" />}
          onClick={() => run(accept(state.id), t('network.accepted'))}>
          {t('network.accept')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => run(remove(state.id), t('network.removed'))}>
          {t('network.decline')}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" leadingIcon={<UserPlus className="h-4 w-4" />}
      onClick={() => run(sendRequest(providerId), t('network.sent'))}>
      {t('network.connect')}
    </Button>
  );
}
