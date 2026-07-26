-- ============================================================================
-- 0057 — "Ayúdanos a mejorar": sugerencias del público general
--
-- Cualquiera (con o sin cuenta) puede proponer mejoras a la plataforma. Se
-- captura por una función SECURITY DEFINER para NO confiar en el cliente el
-- user_id (se toma de auth.uid(), null si es anónimo). El admin ve la lista.
--
-- Idempotente. Aplicar después de la 0056.
-- ============================================================================

create table if not exists public.improvement_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  email      text,
  message    text not null check (char_length(btrim(message)) > 0),
  page       text,               -- ruta desde donde se envió (contexto)
  created_at timestamptz not null default now()
);
create index if not exists idx_improvement_created on public.improvement_suggestions (created_at desc);

alter table public.improvement_suggestions enable row level security;
-- Nadie lee/escribe directo: se envía por RPC y el admin lee por RPC.

-- ── Enviar sugerencia (anónimo o con sesión) ────────────────────────────────
create or replace function public.submit_improvement(
  p_message text, p_email text default null, p_page text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if btrim(coalesce(p_message, '')) = '' then
    raise exception 'El mensaje no puede estar vacío';
  end if;
  insert into public.improvement_suggestions (user_id, email, message, page)
  values (
    auth.uid(),
    nullif(btrim(coalesce(p_email, '')), ''),
    left(btrim(p_message), 2000),
    nullif(btrim(coalesce(p_page, '')), '')
  );
end;
$$;
grant execute on function public.submit_improvement(text, text, text) to anon, authenticated;

-- ── Lectura para el admin ───────────────────────────────────────────────────
drop function if exists public.admin_improvement_suggestions();
create or replace function public.admin_improvement_suggestions()
returns table (id uuid, user_id uuid, email text, message text, page text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, s.email, s.message, s.page, s.created_at
    from public.improvement_suggestions s
   where public.is_admin()
   order by s.created_at desc;
$$;
grant execute on function public.admin_improvement_suggestions() to authenticated;
