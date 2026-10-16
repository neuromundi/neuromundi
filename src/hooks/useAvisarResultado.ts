/**
 * useAvisarResultado — nunca se tira el resultado de una escritura.
 *
 * Por qué existe (15 oct 2026, auditoría, hallazgo A-13): veinticuatro botones
 * llamaban a una función que devuelve su error, y lo descartaban con `void`. El
 * prestador pulsaba «asignar» sobre un paciente de la lista de espera y, si
 * fallaba, el renglón no cambiaba y no había mensaje. La empresa creía que
 * había publicado una vacante y no pasó. Alguien quitaba un bloqueo de
 * vacaciones y se le seguían agendando citas encima.
 *
 * El patrón correcto ya existía en ConnectButton y en NetworkPanel; esto lo
 * saca a un solo sitio para poder usarlo en los veinticuatro.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';

/**
 * Lo que devuelven las funciones de escritura del proyecto.
 *
 * `void` incluido a propósito: algunos ganchos no devuelven nada todavía y
 * resuelven el error por dentro. Con esos no se inventa un mensaje —no hay
 * información que dar— pero quedan anotados como pendientes de que devuelvan
 * su resultado, para que su botón también pueda avisar.
 */
type Resultado =
  | { ok: boolean; error?: string }
  | boolean
  /** Algunas devuelven el mensaje de error, o null si fue bien. */
  | string
  | void
  | null
  | undefined;

export function useAvisarResultado() {
  const { t } = useTranslation();
  const toast = useToast();

  /**
   * Espera la escritura y avisa. `mensajeOk` es opcional: sin él sólo se avisa
   * cuando falla, que es el caso en el que hoy no se avisa de nada.
   */
  return useCallback(
    async (promesa: Promise<Resultado>, mensajeOk?: string): Promise<boolean> => {
      const r = await promesa;
      // Sin resultado no hay nada que afirmar: ni éxito ni fallo.
      if (r === undefined || r === null) return true;
      if (typeof r === 'string') { toast.error(r || t('common.errorGeneric')); return false; }
      const bien = typeof r === 'boolean' ? r : !!r.ok;
      if (bien) {
        if (mensajeOk) toast.success(mensajeOk);
      } else {
        const detalle = (typeof r === 'object' && r.error) || '';
        toast.error(detalle || t('common.errorGeneric'));
      }
      return bien;
    },
    [t, toast],
  );
}
