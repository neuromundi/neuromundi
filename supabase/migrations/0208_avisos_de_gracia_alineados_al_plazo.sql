-- ===========================================================================
-- 0208 · Los avisos de la campana dejan de inventar una fecha.
--
-- Hallazgo (14 oct 2026): emit_directory_grace_reminders() calculaba su propio
-- plazo, 30 dias desde el registro, y avisaba "tu perfil se ocultara el
-- DD/MM/YYYY o dejara de aparecer en las busquedas". Para quien llega desde una
-- ficha del directorio eso es FALSO por partida doble:
--   · la fecha real es verificacion_deadline (1 ene 2027), no 30 dias
--   · su perfil nunca llego a aparecer: lo que aparece es la ficha, y lo que
--     ocurre en el plazo es que la ficha SE RETIRA (migracion 0203)
--
-- Ahora hay dos caminos:
--   A) viene de una ficha del directorio -> plazo = verificacion_deadline,
--      texto sobre la FICHA, de USTED, igual que el correo de invitacion
--   B) se registro por su cuenta -> se conserva la gracia de 30 dias, pero el
--      texto se corrige y pasa a USTED
--
-- Los exentos quedan fuera: la consulta ya filtra membership_status='pending'.
-- ===========================================================================

create or replace function public.emit_directory_grace_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  v_deadline timestamptz;
  v_days_left integer;
  v_stage text;
  v_de_ficha boolean;
  v_count integer := 0;
begin
  for r in
    select p.id, p.full_name, p.business_name, p.created_at
    from profiles p
    where p.role = 'provider'
      and p.membership_status = 'pending'
      and p.rules_version_accepted is not null
      and not exists (select 1 from founder_members fm where fm.user_id = p.id)
  loop
    v_de_ficha := exists (select 1 from public.directorio d where d.reclamada_por = r.id);

    -- A) desde el directorio: manda el plazo de la campana. B) el resto: 30 dias.
    v_deadline := case when v_de_ficha
                       then public.verificacion_deadline()
                       else r.created_at + interval '30 days' end;

    if v_deadline is null then continue; end if;

    v_days_left := floor(extract(epoch from (v_deadline - now())) / 86400.0)::int;

    v_stage := case
      when v_days_left <= 0 then 'd0'
      when v_days_left <= 2 then 'd2'
      when v_days_left <= 7 then 'd7'
      else null
    end;

    if v_stage is null then continue; end if;

    if exists (select 1 from directory_grace_notices g where g.user_id = r.id and g.stage = v_stage) then
      continue;
    end if;

    insert into notifications(user_id, type, title, body, data)
    values (
      r.id,
      'directory_grace',
      case
        when v_de_ficha and v_days_left <= 0 then 'Su ficha se retiró del directorio'
        when v_de_ficha                      then 'Su ficha se retira pronto del directorio'
        when v_days_left <= 0                then 'Su perfil ya no aparece en el directorio'
        else                                      'Su perfil dejará de aparecer pronto'
      end,
      case
        when v_de_ficha and v_days_left <= 0 then
          'Para volver a publicarla, complete su perfil y cubra su cuota.'
        when v_de_ficha then
          'Su ficha se retira del directorio el ' || to_char(v_deadline, 'DD/MM/YYYY')
          || '. Para conservarla, complete su perfil y cubra su cuota.'
        when v_days_left <= 0 then
          'No aparece en las búsquedas hasta que complete su perfil y cubra su cuota.'
        else
          'Complete su perfil y cubra su cuota antes del ' || to_char(v_deadline, 'DD/MM/YYYY')
          || ' o dejará de aparecer en las búsquedas.'
      end,
      jsonb_build_object('days_left', greatest(v_days_left, 0),
                         'deadline', v_deadline,
                         'desde_ficha', v_de_ficha)
    );

    insert into directory_grace_notices(user_id, stage) values (r.id, v_stage)
      on conflict (user_id, stage) do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.emit_directory_grace_reminders() is
  'Avisos en la campana para proveedores con cuota pendiente. Quien llega desde una ficha del directorio recibe el plazo real de la campana (verificacion_deadline) y el texto sobre su ficha; quien se registro por su cuenta conserva la gracia de 30 dias. Todo de usted.';
