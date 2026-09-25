-- 0132_directory_grace_lifecycle.sql
-- Ciclo de vida de la ficha precargada / perfil sin pagar en el directorio:
--
-- 1) VISIBILIDAD (reescribe SOLO el WHERE de la rama de perfiles de
--    directorio_publico; no cambia columnas, así que create or replace basta):
--    - Prestador PAGADO/EXENTO y PUBLICADO           -> aparece COMPLETO.
--    - Prestador con membresía 'pending' DENTRO de la gracia (30 días desde que
--      creó/reclamó su perfil, o la gracia de fundador si es mayor) -> aparece,
--      pero el FRONT lo enmascara a nombre/razón social + ciudad.
--    - 'pending' PASADA la gracia -> desaparece del directorio y de las búsquedas
--      (lo hace la propia condición de fecha; sin escritura destructiva).
--    - Pagado pero SIN publicar -> no aparece (respeta su decisión de ocultarse).
--    - Registro incompleto (rules_version_accepted NULL) -> no aparece.
--    Las fichas SIN reclamar (rama 'ficha') siguen saliendo enmascaradas; su reloj
--    de 30 días no ha empezado (nadie las ha reclamado).
--
-- 2) AVISOS: función + cron diario que recuerda al prestador que debe completar y
--    pagar antes del corte, y le avisa cuando ya se inactivó. Exentos: familias/
--    pacientes (no son prestadores), empresas (membresía 'exempt') y FUNDADORES
--    (tienen su propia gracia de 3 meses y su propio contador).

-- 1) Vista: reescribe el predicado de la rama de perfiles.
do $$
declare v text;
begin
  v := pg_get_viewdef('public.directorio_publico'::regclass);
  v := replace(
    v,
    '((p.role = ''provider''::text) AND p.is_published)',
    '((p.role = ''provider''::text) AND (p.rules_version_accepted IS NOT NULL) AND ('
    || '((p.is_published) AND (p.membership_status = ANY (ARRAY[''active''::text, ''exempt''::text, ''past_due''::text]))) '
    || 'OR ((p.membership_status = ''pending''::text) AND (now() < COALESCE(( SELECT fm.grace_until FROM founder_members fm WHERE (fm.user_id = p.id)), (p.created_at + ''30 days''::interval))))'
    || '))'
  );
  execute 'create or replace view public.directorio_publico as ' || v;
end $$;

-- 2a) Tabla de deduplicación de avisos (una notificación por etapa y usuario).
create table if not exists public.directory_grace_notices (
  user_id uuid not null references auth.users(id) on delete cascade,
  stage   text not null,               -- 'd7' | 'd2' | 'd0'
  sent_at timestamptz not null default now(),
  primary key (user_id, stage)
);
alter table public.directory_grace_notices enable row level security;
-- Sin políticas: solo la función SECURITY DEFINER escribe/lee.

-- 2b) Emisor de recordatorios (lo llama el cron).
create or replace function public.emit_directory_grace_reminders()
returns integer
language plpgsql
security definer
set search_path to public
as $$
declare
  r record;
  v_deadline timestamptz;
  v_days_left integer;
  v_stage text;
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
    v_deadline := r.created_at + interval '30 days';
    v_days_left := floor(extract(epoch from (v_deadline - now())) / 86400.0)::int;

    v_stage := case
      when v_days_left <= 0 then 'd0'
      when v_days_left <= 2 then 'd2'
      when v_days_left <= 7 then 'd7'
      else null
    end;

    if v_stage is null then
      continue;
    end if;

    -- ¿ya se envió esta etapa? (dedupe)
    if exists (select 1 from directory_grace_notices g where g.user_id = r.id and g.stage = v_stage) then
      continue;
    end if;

    insert into notifications(user_id, type, title, body, data)
    values (
      r.id,
      'directory_grace',
      case when v_days_left <= 0
           then 'Tu perfil se inactivó del directorio'
           else 'Tu perfil se ocultará pronto del directorio' end,
      case when v_days_left <= 0
           then 'No apareces en las búsquedas hasta que completes y pagues tu perfil.'
           else 'Completa y paga tu perfil antes de ' || to_char(v_deadline, 'DD/MM/YYYY') || ' o dejará de aparecer en las búsquedas.' end,
      jsonb_build_object('days_left', greatest(v_days_left, 0), 'deadline', v_deadline)
    );

    insert into directory_grace_notices(user_id, stage) values (r.id, v_stage)
      on conflict (user_id, stage) do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.emit_directory_grace_reminders() from public, anon, authenticated;

-- 2c) Cron diario (08:00 hora CDMX = 14:00 UTC). Idempotente.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nm-directory-grace') then
    perform cron.unschedule('nm-directory-grace');
  end if;
  perform cron.schedule('nm-directory-grace', '0 14 * * *', $cron$ select public.emit_directory_grace_reminders(); $cron$);
end $$;
