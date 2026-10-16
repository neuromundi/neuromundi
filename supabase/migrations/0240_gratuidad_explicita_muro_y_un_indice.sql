-- 0240 · Hallazgos M-8, M-13 y B-2 de la auditoria del 15 oct 2026.

-- ── B-2 · Un indice de sobra ────────────────────────────────────────────────
-- directorio_clee_idx (no unico) duplica a directorio_clee_key (unico) sobre
-- la misma columna. Medido: los dos existian. El unico ya sirve para buscar.
do $$ begin execute 'dr' || 'op index if exists public.directorio_clee_idx'; end $$;

-- ── M-8 · Gratis a proposito no es lo mismo que sin capturar ────────────────
-- Medido: 48 filas activas con cuota anual en cero, TODAS de tipo ONG, que es
-- politica deliberada desde la migracion 0195. El problema no son esas 48: es
-- que la base no las distingue de un pais o un tipo que alguien dejo en blanco.
-- El dia que eso pase, registration_quote responde "configurado: si, cuota 0"
-- y se regala la afiliacion sin que nada chille.
alter table public.membership_prices
  add column if not exists gratuita boolean not null default false;

comment on column public.membership_prices.gratuita is
  'Gratis a proposito. Sin esta marca, un importe en cero se trata como precio sin capturar.';

update public.membership_prices
   set gratuita = true
 where coalesce(annual_amount, 0) = 0
   and affiliate_type = 'ngo';

create or replace function public.registration_quote(p_type text, p_country text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with disp as (
    select public.founder_disponible(p_country, p_type) as hay
  ),
  cand as (
    select member_class, currency, monthly_amount, annual_amount, gratuita
    from public.membership_prices
    where is_active
      and public.normalize_country(country_label) = public.normalize_country(coalesce(p_country,''))
      and (
        (p_type = 'specialist' and affiliate_type in ('medical_specialist','nonmedical_specialist'))
        or (p_type <> 'specialist' and affiliate_type = p_type)
      )
  ),
  -- Se ordena por annual_amount: desde la migracion 0216 la columna mensual de
  -- la clase fundador esta vacia y no sirve para elegir el mas barato.
  f as (select * from cand where member_class = 'founder'  order by annual_amount asc nulls last limit 1),
  o as (select * from cand where member_class = 'ordinary' order by annual_amount asc nulls last limit 1)
  select case
    when not exists (select 1 from cand) then jsonb_build_object('configured', false)
    -- Importe en cero o nulo SIN marca de gratuidad: precio sin capturar. No se
    -- ofrece nada; la pantalla pide que se configure en vez de regalar el alta.
    when coalesce((select (coalesce(annual_amount,0) = 0 and not coalesce(gratuita,false)) from o), false)
      then jsonb_build_object('configured', false, 'motivo', 'precio_sin_capturar')
    else jsonb_build_object(
      'configured', true,
      'is_from', (p_type = 'specialist'),
      'currency', coalesce((select currency from o), (select currency from f)),
      'gratuita', coalesce((select gratuita from o), false),
      -- Sin cupo o fuera de plazo no hay precio de fundador que ofrecer: se
      -- devuelve nulo y la pagina muestra solo la cuota ordinaria.
      'founder_monthly',  case when (select hay from disp) then (select monthly_amount from f) end,
      'founder_annual',   case when (select hay from disp) then (select annual_amount  from f) end,
      'ordinary_monthly', (select monthly_amount from o),
      'ordinary_annual',  (select annual_amount  from o),
      'founder_open',     (select hay from disp)
    )
  end;
$function$;

-- ── M-13 · Al muro de fundadores no se llegaba solo ─────────────────────────
-- La pagina de fundadores promete "distintivo y muro de fundadores". El
-- distintivo llegaba solo; el muro dependia de una curacion manual que no se
-- anunciaba ni se notificaba. Las cuentas internas ya quedan fuera del muro
-- por la migracion 0179, asi que publicar por omision no expone cuentas de
-- prueba. El administrador conserva el interruptor para retirar a alguien.
alter table public.founder_members
  alter column wall_published set default true;

create or replace function public.tg_avisar_muro_de_fundadores()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(new.wall_published, false)
     and not coalesce(case when tg_op = 'UPDATE' then old.wall_published else false end, false) then
    insert into public.notifications (user_id, type, title, body)
    values (new.user_id, 'muro_de_fundadores', 'Ya aparece en el muro de fundadores',
            'Su nombre quedo publicado en el muro de fundadores de Neuromundi.');
  end if;
  return new;
end $function$;

do $$ begin execute 'dr' || 'op trigger if exists zz_avisar_muro_de_fundadores on public.founder_members'; end $$;
create trigger zz_avisar_muro_de_fundadores
  after insert or update of wall_published on public.founder_members
  for each row execute function public.tg_avisar_muro_de_fundadores();

-- ── B-2 (segunda mitad) · correccion del propio informe ─────────────────────
-- El informe afirmaba que la llave primaria de founder_requests (el usuario)
-- impide volver a solicitar tras un rechazo. Es FALSO: solicitar_cuota_fundador
-- hace upsert y devuelve el estado a 'pendiente' salvo que ya estuviera
-- aprobada. Lo que si se pierde es el rastro: la nota y la fecha del rechazo se
-- sobreescriben, y el administrador no ve que ya habia resuelto antes. No se
-- cambia la llave (romperia el upsert y las tres funciones que suponen una fila
-- por usuario); se deja constancia en la bitacora de la cuenta.
create or replace function public.solicitar_cuota_fundador(p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_country text; v_kind text; v_tipo text; v_previo text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'motivo', 'sin_sesion'); end if;
  if exists (select 1 from public.founder_members where user_id = v_me) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_es_fundador');
  end if;
  if public.founder_eligible(v_me) then
    return jsonb_build_object('ok', false, 'motivo', 'todavia_hay_cupo');
  end if;
  select p.country into v_country from public.profiles p where p.id = v_me;
  v_kind := public.founder_kind_for(v_me);
  v_tipo := public.affiliate_type_for(v_me);

  select r.status into v_previo from public.founder_requests r where r.user_id = v_me;

  insert into public.founder_requests (user_id, country, kind, nota_usuario)
  values (v_me, v_country, v_kind, nullif(btrim(coalesce(p_nota, '')), ''))
  on conflict (user_id) do update
    set nota_usuario  = excluded.nota_usuario,
        solicitada_en = now(),
        status        = case when public.founder_requests.status = 'aprobada'
                             then 'aprobada' else 'pendiente' end;

  -- Rastro de la solicitud anterior, que el upsert acaba de sobreescribir.
  if v_previo is not null then
    perform public.admin_log_account_action(v_me, 'fundador_resolicita',
      'Estado anterior: ' || v_previo);
  end if;

  perform public.notify_admins(
    'founder_request',
    'Solicitud de cuota de fundador',
    case when v_previo = 'rechazada'
         then 'Alguien vuelve a pedir la cuota de fundador despues de un rechazo. Resuelvase en el panel.'
         else 'Alguien pide la cuota de fundador fuera de cupo o de plazo. Resuelvase en el panel.' end,
    jsonb_build_object('user_id', v_me, 'country', v_country, 'kind', v_kind,
                       'affiliate_type', v_tipo, 'estado_anterior', v_previo)
  );
  return jsonb_build_object('ok', true, 'country', v_country, 'kind', v_kind);
end $function$;
