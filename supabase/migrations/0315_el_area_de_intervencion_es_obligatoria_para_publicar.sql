-- 0315 — El area de intervencion es obligatoria para publicar, en los perfiles
-- que atienden personas.
--
-- Decision de Enyoria (20 oct 2026): el area la declara el miembro al completar
-- su perfil y es obligatoria; se exige en la pantalla Y en el servidor (como el
-- pais, migracion 0309); y a las fichas que ya estan publicadas sin area se les
-- pedira al reclamarlas.
--
-- Se exige SOLO a quien atiende personas: especialista, clinica, escuela y
-- cuidador. A un comercio, una empresa de empleo, turismo o legal no se les
-- pide, porque el catalogo de areas no tiene nada que puedan elegir con verdad.
--
-- Se engancha al guardian de publicacion que ya existia (trg_gate_publicacion)
-- en vez de crear otro: ese guardian se dispara solo cuando is_published pasa de
-- falso a verdadero, asi que las 1,331 fichas que hoy estan publicadas sin area
-- NO se ven afectadas, y la exigencia aparece justo cuando alguien publica su
-- perfil por primera vez. Es decir, al reclamar su ficha.

create or replace function public.trg_gate_publicacion()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_completo boolean;
  v_cuota    boolean;
  v_area     boolean;
begin
  if new.is_published is not true then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.is_published,false) then return new; end if;

  v_completo :=     btrim(coalesce(new.avatar_url,'')) <> ''
                and btrim(coalesce(new.bio,''))        <> ''
                and btrim(coalesce(new.phone,''))      <> ''
                and btrim(coalesce(new.country,''))    <> '';

  -- Area de intervencion: obligatoria para quien atiende personas.
  v_area := new.role <> 'provider'
         or coalesce(new.provider_type,'') not in ('service_provider','clinic','school','caregiver')
         or coalesce(array_length(new.intervention_areas, 1), 0) > 0;

  v_cuota := new.membership_status in ('active','exempt')
          or (new.membership_paid_until is not null and new.membership_paid_until > now());

  if not (v_completo and v_area and v_cuota and new.suspended_at is null) then
    raise exception 'perfil_no_publicable'
      using errcode = 'check_violation',
            hint = 'Para publicar: completa tu perfil (foto, descripcion, telefono, pais), declara al menos un area de intervencion y cubre tu cuota.';
  end if;
  return new;
end $function$;

comment on function public.trg_gate_publicacion is
  'Guardian de publicacion: perfil completo, area de intervencion declarada (service_provider, clinic, school, caregiver), cuota al corriente y cuenta no suspendida. Solo se dispara al pasar de no publicado a publicado.';
