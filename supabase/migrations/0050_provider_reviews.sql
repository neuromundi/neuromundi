-- ============================================================================
-- 0050 — Reseñas visibles de familias + respuesta del prestador
--
-- Hasta ahora los comentarios de las encuestas solo se veían (opcionalmente) en
-- la pestaña privada "Mis Calificaciones" del prestador. Esta migración:
--   1. Deja los comentarios PÚBLICOS y ESTÁNDAR (recrea la vista, ya no es
--      opcional), con un id estable y sin datos del padre.
--   2. Permite al prestador RESPONDER cada reseña (campo en la encuesta + RPC).
--
-- La respuesta la escribe SOLO el prestador dueño de la encuesta. La vista sigue
-- sin exponer al padre (ni nombre ni id): solo texto, fecha, promedio y la
-- respuesta del prestador. Idempotente. Aplicar después de la 0049.
-- ============================================================================

-- 1) Campos de respuesta en la encuesta.
alter table public.satisfaction_surveys
  add column if not exists provider_response text,
  add column if not exists provider_response_at timestamptz;

-- 2) Vista pública de comentarios (ahora con id y respuesta). Sin PII del padre.
-- Se DROPEA antes de crear: `create or replace view` no puede reordenar ni
-- renombrar columnas existentes, y aquí se antepone `id` a `provider_id`
-- (error 42P16). La vista es hoja (nada depende de ella), así que dropear es
-- seguro. Idempotente por el `if exists`.
drop view if exists public.public_provider_comments;
create view public.public_provider_comments as
select
  s.id,
  s.provider_id,
  s.comments,
  s.created_at,
  round(
    (s.quality_score + s.human_treatment_score + s.accessibility_score +
     s.price_value_score + s.offer_compliance_score +
     s.sensory_adaptation_score + s.flexibility_crisis_score)::numeric / 7, 1
  ) as overall,
  s.provider_response,
  s.provider_response_at
from public.satisfaction_surveys s
where s.comments is not null and length(trim(s.comments)) > 0;

grant select on public.public_provider_comments to anon, authenticated;

-- 3) Responder una reseña (solo el prestador dueño). Texto vacío la borra.
drop function if exists public.respond_review(uuid, text);
create or replace function public.respond_review(p_survey_id uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_clean text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  select provider_id into v_owner from public.satisfaction_surveys where id = p_survey_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  -- La autorización: solo el prestador reseñado puede responder.
  if v_owner <> v_me then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if v_clean is not null and length(v_clean) > 1000 then
    v_clean := left(v_clean, 1000);
  end if;

  update public.satisfaction_surveys
     set provider_response = v_clean,
         provider_response_at = case when v_clean is null then null else now() end
   where id = p_survey_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.respond_review(uuid, text) to authenticated;
