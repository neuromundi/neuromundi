/**
 * PasswordStrength — medidor visual de fuerza de contraseña. NO impone reglas
 * absurdas: la única regla dura es el mínimo de 8 (en el esquema). Esto solo
 * orienta al usuario hacia una clave más robusta premiando longitud y variedad.
 */
import { useTranslation } from 'react-i18next';

/** Devuelve un puntaje 0..4 según longitud y variedad de caracteres. */
function score(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (variety >= 2) s++;
  if (variety >= 3) s++;
  return Math.min(s, 4);
}

const COLORS = ['bg-slate-200', 'bg-evs-1', 'bg-evs-2', 'bg-evs-4', 'bg-evs-5'];

export function PasswordStrength({ value }: { value: string }) {
  const { t } = useTranslation();
  if (!value) return null;
  const s = score(value);
  const labelKey = s <= 1 ? 'pwd.weak' : s <= 2 ? 'pwd.fair' : s <= 3 ? 'pwd.good' : 'pwd.strong';

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= s ? COLORS[s] : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {t('pwd.label')}: <span className="font-medium text-slate-700">{t(labelKey)}</span>
      </p>
    </div>
  );
}
