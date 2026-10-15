/**
 * CuentaDeCobroCard — dónde quiere cobrar sus comisiones el referidor.
 *
 * Por qué existe (15 oct 2026): el libro de comisiones sabía decir "sin cuenta
 * de cobro", pero no había ningún lugar donde el referidor declarara a dónde
 * mandarle el dinero si no usa Stripe. Sin este dato, la primera comisión de un
 * referidor externo no se puede liquidar.
 *
 * Quien ya cobra con Stripe (consultas, productos) no ve el formulario: sus
 * comisiones salen por la cuenta que ya tiene conectada.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, Check, Lock } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type Metodo = 'stripe' | 'transferencia' | 'paypal' | 'otro';

interface CuentaDeCobro {
  metodo: Metodo;
  titular: string | null;
  pais: string | null;
  moneda: string | null;
  banco: string | null;
  identificador: string | null;
  notas: string | null;
}

const campo =
  'w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function CuentaDeCobroCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);

  const [metodo, setMetodo] = useState<Metodo>('transferencia');
  const [titular, setTitular] = useState('');
  const [pais, setPais] = useState('');
  const [moneda, setMoneda] = useState('');
  const [banco, setBanco] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    void supabase.rpc('mi_cuenta_de_cobro').then(({ data }) => {
      if (!vivo || !data) return;
      const c = data as CuentaDeCobro;
      setMetodo(c.metodo ?? 'transferencia');
      setTitular(c.titular ?? '');
      setPais(c.pais ?? '');
      setMoneda(c.moneda ?? '');
      setBanco(c.banco ?? '');
      setIdentificador(c.identificador ?? '');
      setNotas(c.notas ?? '');
      setListo(true);
    });
    return () => { vivo = false; };
  }, []);

  // Prellenado con lo que ya sabemos del perfil, sin pisar lo que él escribió.
  useEffect(() => {
    if (!profile) return;
    setTitular((v) => v || profile.business_name || profile.full_name || '');
    setPais((v) => v || profile.country || '');
  }, [profile]);

  const guardar = useCallback(async () => {
    if (!titular.trim() || !identificador.trim()) {
      toast.error(t('recommend.payout.required'));
      return;
    }
    setGuardando(true);
    const { error } = await supabase.rpc('guardar_cuenta_de_cobro', {
      p_metodo: metodo,
      p_titular: titular,
      p_pais: pais,
      p_moneda: moneda,
      p_banco: banco,
      p_identificador: identificador,
      p_notas: notas,
    });
    setGuardando(false);
    if (error) {
      toast.error(t('recommend.payout.saveFail'));
      return;
    }
    setListo(true);
    toast.success(t('recommend.payout.saved'));
  }, [metodo, titular, pais, moneda, banco, identificador, notas, t, toast]);

  if (!profile) return null;

  // Ya tiene Stripe conectado: sus comisiones salen por ahí.
  if (profile.stripe_connect_id) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-sage-200 bg-sage-50 p-4">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-sage-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-sage-900">{t('recommend.payout.title')}</p>
          <p className="mt-1 text-sm text-sage-800">{t('recommend.payout.stripeNote')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Banknote className="h-5 w-5 text-brand-700" aria-hidden="true" />
        <h3 className="text-sm font-bold text-slate-900">{t('recommend.payout.title')}</h3>
        {listo && <Check className="h-4 w-4 text-sage-600" aria-hidden="true" />}
      </div>
      <p className="mb-4 text-sm text-slate-600">{t('recommend.payout.help')}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.method')}</span>
          <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            <option value="transferencia">{t('recommend.payout.mTransfer')}</option>
            <option value="paypal">{t('recommend.payout.mPaypal')}</option>
            <option value="otro">{t('recommend.payout.mOther')}</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.holder')}</span>
          <input className={campo} value={titular} onChange={(e) => setTitular(e.target.value)} autoComplete="name" />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.identifier')}</span>
          <input className={campo} value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
        </label>

        {metodo !== 'paypal' && (
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.bank')}</span>
            <input className={campo} value={banco} onChange={(e) => setBanco(e.target.value)} />
          </label>
        )}

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.country')}</span>
          <input className={campo} value={pais} onChange={(e) => setPais(e.target.value)} autoComplete="country-name" />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.currency')}</span>
          <input
            className={campo}
            value={moneda}
            maxLength={3}
            onChange={(e) => setMoneda(e.target.value.toUpperCase())}
            placeholder="MXN"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-700">{t('recommend.payout.notes')}</span>
          <input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('recommend.payout.privacy')}</span>
      </div>

      <Button className="mt-3" onClick={() => void guardar()} disabled={guardando}>
        {t('recommend.payout.save')}
      </Button>
    </div>
  );
}
