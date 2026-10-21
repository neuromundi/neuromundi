/**
 * AvisoDeSeccion — "avísame cuando abra". Vive en el estado vacío de la Tienda
 * y de Academy, que el 21 de octubre de 2026 no tenían ni un producto ni un
 * curso.
 *
 * No es sólo cortesía con quien llega temprano: es la PRIMERA señal medida de
 * demanda por país que tiene la plataforma. Hasta ahora, de una sección vacía
 * no quedaba rastro de quién la buscó.
 *
 * Escribe por la RPC `pedir_aviso_de_seccion` (SECURITY DEFINER): el correo se
 * normaliza en la base y el user_id lo toma de auth.uid(), no del cliente.
 * Repetir la petición no duplica (único por sección + correo) y responde lo
 * mismo que la primera vez, para no revelar si un correo ajeno ya está en la
 * lista.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, Check } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface AvisoDeSeccionProps {
  seccion: 'tienda' | 'academy';
  /** País activo: segmenta la demanda. */
  pais?: string | null;
}

export function AvisoDeSeccion({ seccion, pais = null }: AvisoDeSeccionProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { email: emailSesion } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState(emailSesion ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);

  if (listo) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-evs-5">
        <Check className="h-4 w-4" aria-hidden="true" /> {t('avisoSeccion.hecho')}
      </p>
    );
  }

  // A quien ya tiene sesión no se le pide el correo: ya lo conocemos.
  const pedir = async (valor: string) => {
    const limpio = valor.trim();
    if (limpio.length === 0) return;
    setOcupado(true);
    const { data, error } = await supabase.rpc('pedir_aviso_de_seccion', {
      p_seccion: seccion,
      p_correo: limpio,
      p_pais: pais,
    });
    setOcupado(false);
    const resultado = data as { ok?: boolean; motivo?: string } | null;
    if (error || !resultado?.ok) {
      toast.error(
        resultado?.motivo === 'correo invalido'
          ? t('avisoSeccion.correoInvalido')
          : error?.message || t('common.errorGeneric'),
      );
      return;
    }
    setListo(true);
  };

  if (!abierto) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          if (emailSesion) {
            void pedir(emailSesion);
            return;
          }
          setAbierto(true);
        }}
        disabled={ocupado}
      >
        <BellRing className="mr-1.5 h-4 w-4" aria-hidden="true" /> {t('avisoSeccion.cta')}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col items-center gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        void pedir(correo);
      }}
    >
      <label className="sr-only" htmlFor={`aviso-${seccion}`}>
        {t('avisoSeccion.correoLabel')}
      </label>
      <input
        id={`aviso-${seccion}`}
        type="email"
        required
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder={t('avisoSeccion.correoLabel')}
        className="w-full rounded-xl border border-slate-200 p-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:w-64"
      />
      <Button type="submit" disabled={ocupado || correo.trim().length === 0}>
        {ocupado ? t('avisoSeccion.enviando') : t('avisoSeccion.enviar')}
      </Button>
    </form>
  );
}
