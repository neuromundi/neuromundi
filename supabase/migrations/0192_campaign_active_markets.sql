-- 0192: Mercados activos editables por el admin (antes hardcodeados en el front).
-- `active_markets` = arreglo de NOMBRES de país en español (igual que profiles.country
-- y countryStore). Vacío/NULL = el front usa su lista de respaldo.
alter table public.campaign_config
  add column if not exists active_markets jsonb not null default '[]'::jsonb;

-- Siembra con la lista vigente SOLO si aún está vacía (idempotente).
update public.campaign_config
set active_markets = '[
  "México","España","Argentina","Colombia","Perú","Venezuela","Chile",
  "Ecuador","Guatemala","Cuba","Bolivia","República Dominicana","Honduras",
  "Paraguay","El Salvador","Nicaragua","Costa Rica","Panamá","Uruguay",
  "Guinea Ecuatorial","Puerto Rico","Brasil","Portugal","Estados Unidos","Canadá"
]'::jsonb
where id = 1
  and (active_markets is null or jsonb_array_length(active_markets) = 0);

-- Setter admin: reemplaza la lista completa de mercados activos.
create or replace function public.admin_set_active_markets(p_markets text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.campaign_config
  set active_markets = coalesce(to_jsonb(p_markets), '[]'::jsonb)
  where id = 1;
end; $function$;
