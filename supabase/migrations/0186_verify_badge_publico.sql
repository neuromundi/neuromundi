-- ============================================================================
-- 0186 — Verificación pública de distintivo por folio (anticlonación)
--
-- La autoridad de un distintivo está FUERA de la imagen: el QR del distintivo
-- apunta a /verificar/:folio, que llama a esta RPC y muestra el estado REAL y
-- vigente leído de la BD (revocable con is_published / membership). Una copia de
-- la imagen no puede falsear este resultado.
-- Solo verifica perfiles PUBLICADOS. Idempotente.
-- ============================================================================
create or replace function public.verify_badge(p_folio text)
returns table(found boolean, member_no integer, name text, kind text, country text,
              vigente boolean, is_founder boolean, neuroaffirming boolean, is_company boolean)
language sql stable security definer
set search_path to 'public'
as $$
  with f as (select nullif(regexp_replace(coalesce(p_folio,''), '\D', '', 'g'), '')::int as mno)
  select
    (p.id is not null),
    p.member_no,
    coalesce(p.business_name, p.full_name),
    p.provider_type,
    p.country,
    coalesce(
      p.role <> 'provider'
      or p.membership_status in ('active','exempt')
      or (p.membership_paid_until is not null and p.membership_paid_until > now()),
      false),
    exists (select 1 from public.founder_members fm where fm.user_id = p.id),
    coalesce(p.neuroaffirming, false),
    (p.provider_type = 'company')
  from f
  left join public.profiles p on p.member_no = f.mno and p.is_published;
$$;
grant execute on function public.verify_badge(text) to anon, authenticated;
