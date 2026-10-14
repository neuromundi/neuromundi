-- ===========================================================================
-- 0210 · Comisiones de membresia: el miembro cobra DINERO por cada referido.
--
-- Decision de Enyoria (14 oct 2026). El programa anterior daba descuento sobre
-- la cuota propia, lo que deja fuera a los perfiles gratuitos: ofrecerle 5% de
-- descuento a quien paga cero es ofrecerle cero. Y las federaciones, que son el
-- referidor mas valioso, son justamente gratuitas.
--
-- Este libro registra una comision por CADA pago de membresia de un referido.
-- No paga: registra lo que se debe. El pago se marca a mano hasta que exista la
-- via de dispersion.
--
-- SOBRE LA RECURRENCIA. La membresia es una suscripcion de Stripe que se cobra
-- sola cada ano (create-membership-checkout usa mode:'subscription'). El
-- referidor no puede "hacer labor de renovacion" porque no hay acto de renovar.
-- Por eso la condicion que si es observable y justa vive en
-- `exige_referidor_activo`: solo se devenga comision mientras el referidor
-- conserve su propia membresia vigente (o su exencion vigente). Quien se va de
-- la plataforma deja de cobrar.
--
-- Todo es configurable para no tener que tocar codigo al cambiar de politica.
-- ===========================================================================

create table if not exists public.membership_commission_config (
  id                     smallint primary key default 1,
  activo                 boolean  not null default false,
  comision_pct           numeric  not null default 5,
  recurrente             boolean  not null default true,
  exige_referidor_activo boolean  not null default true,
  pago_minimo_cents      integer  not null default 0,
  actualizado_en         timestamptz not null default now(),
  constraint membership_commission_config_una_fila check (id = 1),
  constraint membership_commission_config_pct check (comision_pct >= 0 and comision_pct <= 100)
);

insert into public.membership_commission_config (id) values (1) on conflict (id) do nothing;

comment on table public.membership_commission_config is
  'Parametros del programa de comisiones por referido. activo=false mantiene el libro apagado sin tocar codigo.';
comment on column public.membership_commission_config.recurrente is
  'true: se devenga en cada pago del referido, tambien en las renovaciones automaticas. false: solo en el primer pago.';
comment on column public.membership_commission_config.exige_referidor_activo is
  'true: solo se devenga mientras el referidor conserve su membresia vigente o su exencion vigente.';


create table if not exists public.membership_commissions (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.profiles(id) on delete cascade,
  referred_id    uuid not null references public.profiles(id) on delete cascade,
  -- Identificador del cobro en Stripe (invoice o checkout session). Es la llave
  -- que impide contar dos veces el mismo pago si el webhook llega repetido.
  stripe_ref     text not null,
  es_primer_pago boolean not null default false,
  base_cents     integer not null,
  comision_pct   numeric not null,
  amount_cents   integer not null,
  currency       text    not null,
  status         text    not null default 'devengada',
  creada_en      timestamptz not null default now(),
  pagada_en      timestamptz,
  pagada_nota    text,
  revertida_en   timestamptz,
  constraint membership_commissions_stripe_ref_uniq unique (stripe_ref),
  constraint membership_commissions_status_ok
    check (status in ('devengada', 'pagada', 'revertida', 'cancelada')),
  constraint membership_commissions_montos check (base_cents >= 0 and amount_cents >= 0)
);

comment on table public.membership_commissions is
  'Libro de comisiones por referido sobre pagos de membresia. Una fila por cobro de Stripe; stripe_ref evita el doble conteo.';

create index if not exists membership_commissions_referrer_idx
  on public.membership_commissions (referrer_id, status);
create index if not exists membership_commissions_referred_idx
  on public.membership_commissions (referred_id);

alter table public.membership_commission_config enable row level security;
alter table public.membership_commissions enable row level security;

-- Sin politicas: nadie lee ni escribe directo. Todo pasa por funciones
-- security definer, que es como esta resuelto el resto del proyecto.
