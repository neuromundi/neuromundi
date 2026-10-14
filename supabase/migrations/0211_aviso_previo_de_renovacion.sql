-- ===========================================================================
-- 0211 · Aviso previo a la renovacion automatica.
--
-- La membresia es una suscripcion anual que Stripe cobra sola. Entre un cobro y
-- el siguiente pasan doce meses: mucha gente no recuerda que se suscribio, ve el
-- cargo y lo disputa por reflejo. "Suscripcion cancelada y cobrada igual" es uno
-- de los motivos de contracargo mas comunes, y cada disputa cuesta una comision
-- que Stripe no devuelve, se gane o se pierda.
--
-- Avisar antes convierte un cargo sorpresa en un cargo esperado.
--
-- Esta tabla solo evita el doble aviso. El envio lo hace la funcion de borde
-- avisar-renovacion, que corre por tarea programada.
-- ===========================================================================

create table if not exists public.renewal_notices (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  periodo    date not null,          -- fecha de renovacion que se avisó
  etapa      text not null,          -- 'd7' | 'd1'
  enviado_en timestamptz not null default now(),
  primary key (user_id, periodo, etapa),
  constraint renewal_notices_etapa_ok check (etapa in ('d7', 'd1'))
);

comment on table public.renewal_notices is
  'Constancia de los avisos previos a la renovacion, para no mandar dos veces el mismo.';

alter table public.renewal_notices enable row level security;


-- A quien hay que avisarle hoy. Devuelve solo lo que falta por avisar.
create or replace function public.renovaciones_por_avisar(p_dias int default 7)
returns table (
  user_id uuid, correo text, nombre text,
  renueva_el date, etapa text,
  monto_cents integer, currency text, periodo text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id,
         u.email,
         coalesce(nullif(btrim(p.business_name), ''), p.full_name, 'su organización'),
         (p.membership_paid_until at time zone 'America/Mexico_City')::date,
         case when p_dias <= 1 then 'd1' else 'd7' end,
         null::integer,
         null::text,
         p.membership_period
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.membership_status = 'active'
    and p.stripe_subscription_id is not null
    and p.membership_paid_until is not null
    and p.suspended_at is null
    and u.email is not null
    -- La ventana es de un dia: se avisa cuando faltan exactamente p_dias.
    and (p.membership_paid_until at time zone 'America/Mexico_City')::date
        = ((now() at time zone 'America/Mexico_City')::date + p_dias)
    and not exists (
      select 1 from public.renewal_notices n
      where n.user_id = p.id
        and n.periodo = (p.membership_paid_until at time zone 'America/Mexico_City')::date
        and n.etapa = case when p_dias <= 1 then 'd1' else 'd7' end
    );
$$;

comment on function public.renovaciones_por_avisar(int) is
  'Miembros a los que les toca aviso previo de renovacion hoy, sin los ya avisados.';

revoke all on function public.renovaciones_por_avisar(int) from public, anon, authenticated;
grant execute on function public.renovaciones_por_avisar(int) to service_role;


-- Deja constancia de que el aviso salio. Solo tras un envio exitoso.
create or replace function public.marcar_aviso_renovacion(
  p_user uuid, p_periodo date, p_etapa text
) returns boolean
language sql
security definer
set search_path to 'public'
as $$
  insert into public.renewal_notices (user_id, periodo, etapa)
  values (p_user, p_periodo, p_etapa)
  on conflict do nothing
  returning true;
$$;

revoke all on function public.marcar_aviso_renovacion(uuid, date, text) from public, anon, authenticated;
grant execute on function public.marcar_aviso_renovacion(uuid, date, text) to service_role;
