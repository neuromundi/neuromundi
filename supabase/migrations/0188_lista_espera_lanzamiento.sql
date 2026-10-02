-- ============================================================================
-- 0188 — Lista de espera para países en fase "próximamente 2027"
--
-- Los países fuera de la fase activa (no hispanohablantes/lusófonos/EE.UU.) ven
-- un aviso de lanzamiento a inicios de 2027 sin tarifas, y pueden dejar su correo
-- aquí para que se les avise. Lectura solo admin; alta pública validada.
-- Idempotente.
-- ============================================================================
create table if not exists public.launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  country text,
  created_at timestamptz not null default now(),
  unique (email, country)
);
alter table public.launch_waitlist enable row level security;
drop policy if exists launch_waitlist_admin on public.launch_waitlist;
create policy launch_waitlist_admin on public.launch_waitlist for select using (public.is_admin());

create or replace function public.join_launch_waitlist(p_email text, p_country text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'correo inválido';
  end if;
  insert into public.launch_waitlist (email, country) values (lower(p_email), p_country)
  on conflict (email, country) do nothing;
end; $$;
grant execute on function public.join_launch_waitlist(text, text) to anon, authenticated;
