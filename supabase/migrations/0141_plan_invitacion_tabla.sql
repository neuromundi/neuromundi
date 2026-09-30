-- ============================================================================
-- 0141 · Tabla del plan de invitación
--
-- POR QUÉ UNA TABLA Y NO SOLO UN EXCEL
--   El plan tiene que vivir donde ocurre el envío. Si «manda la tanda 1» solo
--   existe en una hoja de cálculo, nada del lado del servidor sabe qué fichas
--   son. Aquí queda registrado, auditable y reutilizable.
--
--   El contenido se puebla en la 0144, que es la versión vigente.
--
-- NOTA DE NUMERACIÓN: esta migración se aplicó llamándose 0139 y se renombró a
-- 0141 en el ledger, porque la otra sesión ya había usado 0139 y 0140 el mismo
-- día para la clasificación de productos y la derivación de secciones.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create table if not exists public.directorio_plan_invitacion (
  ficha_id   uuid primary key references public.directorio(id) on delete cascade,
  tanda      smallint not null,
  orden      integer  not null,
  score      integer  not null,
  motivo     text,
  creada_en  timestamptz not null default now()
);

create index if not exists idx_plan_invitacion_tanda
  on public.directorio_plan_invitacion (tanda, orden);

alter table public.directorio_plan_invitacion enable row level security;
drop policy if exists "plan solo admin" on public.directorio_plan_invitacion;
create policy "plan solo admin" on public.directorio_plan_invitacion
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.directorio_plan_invitacion is
  'A quién invitar y en qué tanda. El score es una hipótesis sin calibrar: '
  'nadie ha recibido invitación todavía. Recalcular cuando haya resultados.';
