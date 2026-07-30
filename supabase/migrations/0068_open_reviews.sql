-- 0068_open_reviews.sql
-- Reseñas abiertas: pacientes y padres/tutores pueden calificar a CUALQUIER
-- prestador con el que tengan relación previa (cita aceptada, pedido o canje de
-- descuento), no solo tras un descuento. Se apoya en el mismo modelo EVS
-- (satisfaction_surveys), permitiendo encuestas SIN transacción de descuento.
--
-- Seguro: transaction_id pasa a NULLABLE (el trigger de completar transacción usa
-- WHERE id = NEW.transaction_id, que con NULL no afecta nada). La vista de EVS
-- agrega por provider_id, no por transacción. Una reseña por (usuario, prestador)
-- en la vía sin transacción (índice único parcial).

alter table public.satisfaction_surveys alter column transaction_id drop not null;

create unique index if not exists uq_survey_relationship
  on public.satisfaction_surveys (parent_id, provider_id)
  where transaction_id is null;

-- ¿Puede el usuario actual reseñar a este prestador? (relación previa + no self +
-- no reseñado ya por la vía directa).
create or replace function public.can_review_provider(p_provider uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    auth.uid() is not null
    and auth.uid() <> p_provider
    and not exists (
      select 1 from public.satisfaction_surveys s
      where s.parent_id = auth.uid() and s.provider_id = p_provider and s.transaction_id is null
    )
    and (
      exists (select 1 from public.appointment_requests a
              where a.specialist_id = p_provider and a.recipient_id = auth.uid() and a.status = 'accepted')
      or exists (select 1 from public.orders o
                 where o.vendor_id = p_provider and o.buyer_id = auth.uid())
      or exists (select 1 from public.discount_transactions dt
                 where dt.provider_id = p_provider and dt.parent_id = auth.uid())
    );
$$;
grant execute on function public.can_review_provider(uuid) to authenticated;

-- Enviar una reseña directa (sin transacción de descuento). Verifica la relación
-- y evita duplicados; inserta la encuesta con transaction_id NULL.
create or replace function public.submit_provider_review(
  p_provider        uuid,
  p_quality         smallint,
  p_human           smallint,
  p_accessibility   smallint,
  p_price           smallint,
  p_offer           smallint,
  p_sensory         smallint,
  p_flexibility     smallint,
  p_facilities      smallint default null,
  p_professionalism smallint default null,
  p_comment         text default null,
  p_anonymous       boolean default false
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;
  if not public.can_review_provider(p_provider) then
    raise exception 'sin relación previa o ya reseñado';
  end if;

  insert into public.satisfaction_surveys (
    transaction_id, parent_id, provider_id,
    quality_score, human_treatment_score, accessibility_score, price_value_score,
    offer_compliance_score, sensory_adaptation_score, flexibility_crisis_score,
    facilities_score, professionalism_score, comments, is_anonymous
  ) values (
    null, auth.uid(), p_provider,
    p_quality, p_human, p_accessibility, p_price,
    p_offer, p_sensory, p_flexibility,
    p_facilities, p_professionalism,
    nullif(btrim(coalesce(p_comment, '')), ''), coalesce(p_anonymous, false)
  );
end;
$$;
grant execute on function public.submit_provider_review(uuid, smallint, smallint, smallint, smallint, smallint, smallint, smallint, smallint, smallint, text, boolean) to authenticated;
