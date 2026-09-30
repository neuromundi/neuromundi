-- ============================================================================
-- 0158 · Reclamar la ficha publica el perfil
--
-- EL DAÑO
--   `directorio_publico` une dos ramas. La de fichas exige `reclamada_por is
--   null`; la de perfiles exige `is_published = true`. Y `profiles.is_published`
--   nace en `false`: publicarse es una casilla opcional enterrada en Ajustes,
--   que nada enciende automáticamente — ni pagar la membresía.
--
--   Consecuencia, medida: una ficha publicada estaba visible; al reclamarla con
--   el perfil sin publicar, el directorio pasó de 729 a 728 entradas y el perfil
--   NO ocupó su lugar. La persona desapareció.
--
--   Es decir: quien RESPONDE a la invitación se vuelve invisible, y quien la
--   ignora sigue apareciendo. Exactamente al revés de lo que promete el correo
--   («tu ficha ya aparece en el directorio público», «recibe citas de
--   familias»), y castigando justo a quien convierte.
--
-- POR QUÉ PUBLICAR AL RECLAMAR NO ES EXPONER A NADIE
--   La ficha YA era pública antes del reclamo. Reclamarla es un acto afirmativo
--   de propiedad sobre algo que ya estaba a la vista, no una petición de
--   aparecer. Publicar el perfil conserva el estado anterior; no publicarlo es
--   lo que lo cambia. Quien quiera salir tiene la casilla de Ajustes y el
--   enlace de baja del correo.
--
-- LO QUE ESTA MIGRACIÓN NO RESUELVE
--   Quien se registra por su cuenta (sin ficha previa) y paga sigue naciendo
--   sin publicar. Es la misma clase de daño —paga por visibilidad y no se le
--   ve— pero cambiarlo afecta a todos los registros, no sólo a la campaña, y
--   es una decisión de producto de Enyoria. Queda señalado, no cambiado.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.cancelada_en is null
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;

  -- El precio que prometió el correo se calculó con estos dos campos de la
  -- ficha; el cobro los lee del perfil. Si el perfil viene vacío, se copian
  -- para que ambos caminos den el mismo tipo de afiliado y el mismo precio.
  update public.profiles p
     set provider_type = coalesce(p.provider_type, d.provider_type),
         profession    = coalesce(p.profession,    d.profession)
    from public.directorio d
   where d.id = v_ficha
     and p.id = p_perfil
     and (p.provider_type is null or p.profession is null);

  -- PUBLICAR. Sin esto la ficha sale del directorio (rama de fichas: exige
  -- `reclamada_por is null`) y el perfil no entra (rama de perfiles: exige
  -- `is_published`), así que quien reclama desaparece. Medido: 729 → 728.
  update public.profiles
     set is_published = true
   where id = p_perfil
     and suspended_at is null;   -- una cuenta suspendida no se republica sola

  return true;
end $$;
