-- RECLAMAR DENTRO DEL PLAZO ASEGURA EL PRECIO DE FUNDADOR (21 oct 2026).
--
-- El correo dice "active su perfil y asegure su cuota de Miembro Fundador",
-- pero founder_eligible() medía el plazo en el MOMENTO DEL PAGO, no en el del
-- reclamo, y create-membership-checkout decide la tarifa con esa funcion
-- (linea 163). Con el periodo de prueba de 30 dias de la migracion 0323 eso
-- rompia la promesa: en Mexico el plazo de fundador cierra el 23 de noviembre,
-- asi que quien reclamara a partir del 24 de octubre y pagara al terminar su
-- mes —lo natural— pagaria precio ordinario. Exactamente lo que se siente
-- como engaño.
--
-- Desde aqui, el plazo vencido NO descalifica mientras la persona siga dentro
-- de su periodo de prueba Y haya entrado antes del cierre. No hace falta
-- columna nueva ni reserva que mantener: el perfil ya trae cuando entro
-- (created_at) y hasta cuando dura su prueba (membership_due_at).
--
-- Queda ajustado y acotado:
--  · si deja vencer la prueba sin pagar, membership_due_at ya paso y pierde el
--    precio de fundador, como antes;
--  · si se registro DESPUES del cierre, no lo recupera por estar en prueba;
--  · el cupo por pais y tipo se sigue comprobando igual, al final: esto mueve
--    la FECHA, nunca el cupo.
--
-- Aplica por igual a quien reclama una ficha y a quien se registra por su
-- cuenta: el agravio seria el mismo y la regla no distingue.
create or replace function public.founder_eligible(p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_kind text; v_country text; v_wants boolean; v_usados int;
        v_limite timestamptz; v_auth boolean; v_propio timestamptz; v_pais_lim timestamptz;
        v_en_prueba boolean; v_prueba_hasta timestamptz; v_entro timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  select p.country, p.wants_founder, coalesce(p.fundador_autorizado, false), p.fundador_hasta,
         p.membership_status = 'pending', p.membership_due_at, p.created_at
    into v_country, v_wants, v_auth, v_propio,
         v_en_prueba, v_prueba_hasta, v_entro
  from public.profiles p where p.id = p_id;
  if coalesce(v_auth, false) then return true; end if;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;

  -- 0262: manda el MENOR entre el plazo sellado y el cierre del pais.
  v_pais_lim := public.founder_country_deadline(v_country);
  v_limite := least(coalesce(v_propio, v_pais_lim), coalesce(v_pais_lim, v_propio));

  -- 0325: el plazo vencido no descalifica a quien entro en tiempo y sigue
  -- dentro de su periodo de prueba.
  if v_limite is not null and now() >= v_limite
     and not (coalesce(v_en_prueba, false)
              and v_prueba_hasta is not null and v_prueba_hasta > now()
              and v_entro is not null and v_entro < v_limite)
  then
    return false;
  end if;

  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  return v_usados < public.founder_cap_for(v_country, v_kind);
end $function$;
