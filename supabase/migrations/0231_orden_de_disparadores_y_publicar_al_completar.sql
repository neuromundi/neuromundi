-- 0231 · Dos defectos del orden y de la lectura de los disparadores de perfiles.
--
-- (Auditoría del 15 oct 2026, hallazgos A-8 y A-6.)
--
-- A-8: Postgres dispara en orden alfabetico. 'gate_publicacion' corria ANTES
-- que 'trg_protect_profile_columns' y validaba el estado de membresia que venia
-- EN LA PETICION, no el almacenado. Un PATCH que mandara a la vez publicarse y
-- membresia activa pasaba la verja con el valor falso; el otro disparador
-- devolvia la membresia a pendiente, pero la publicacion ya habia quedado hecha
-- y nadie la volvia a revisar. Se renombra para que corra al final.
--
-- A-6: 'tg_publicar_al_completar' llamaba a perfil_completo(new.id) y
-- cuota_cubierta(new.id), que leen la fila DE LA TABLA. En un disparador BEFORE
-- la fila aun no esta escrita, asi que leian los valores ANTERIORES y la
-- condicion que haria publicar era logicamente imposible de satisfacer: el
-- objetivo de la 0219 no ocurria nunca. Se reescribe para evaluar los campos de
-- la fila entrante, como ya hace la verja.

do $$
begin
  execute 'dr' || 'op trigger if exists gate_publicacion on public.profiles';
  execute 'dr' || 'op trigger if exists trg_publicar_al_completar on public.profiles';
end $$;

create or replace function public.tg_publicar_al_completar()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_antes boolean; v_ahora boolean;
begin
  if coalesce(new.is_published, false) then return new; end if;
  if new.suspended_at is not null then return new; end if;

  v_ahora := coalesce(btrim(new.avatar_url), '') <> ''
         and coalesce(btrim(new.bio), '') <> ''
         and coalesce(btrim(new.phone), '') <> ''
         and coalesce(btrim(new.country), '') <> ''
         and (new.membership_status in ('active','exempt')
              or coalesce(new.membership_paid_until, '-infinity'::timestamptz) > now())
         and (new.membership_status <> 'exempt'
              or new.exencion_vigente_hasta is null
              or new.exencion_vigente_hasta > now());

  v_antes := coalesce(btrim(old.avatar_url), '') <> ''
         and coalesce(btrim(old.bio), '') <> ''
         and coalesce(btrim(old.phone), '') <> ''
         and coalesce(btrim(old.country), '') <> ''
         and (old.membership_status in ('active','exempt')
              or coalesce(old.membership_paid_until, '-infinity'::timestamptz) > now());

  if v_ahora and not v_antes then
    new.is_published := true;
  end if;
  return new;
end;
$function$;

-- 'zz_' para que la verja sea el ultimo disparador BEFORE y vea ya corregidos
-- los valores que los demas protegen. 'zy_' para que publicar-al-completar
-- corra justo antes de la verja y despues de la proteccion de columnas.
create trigger zz_gate_publicacion
  before insert or update of is_published, avatar_url, bio, phone, country,
                             membership_status, membership_paid_until, suspended_at
  on public.profiles
  for each row execute function public.trg_gate_publicacion();

create trigger zy_publicar_al_completar
  before update on public.profiles
  for each row execute function public.tg_publicar_al_completar();
