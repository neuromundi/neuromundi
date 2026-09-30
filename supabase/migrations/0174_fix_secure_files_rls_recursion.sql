-- NOTA DE RENUMERACIÓN (2026-09-30): esta migración se aplicó en producción el
-- 2026-09-29/30 con el número 0143, que colisionaba con un archivo
-- 'plan_invitacion' de otra sesión. Se renumeró a 0174 solo para el repositorio.
-- Es autónoma (no depende del orden relativo a 0154-0171) y YA está aplicada: no re-ejecutar en prod.

-- ============================================================================
-- 0143 — Romper la recursión infinita de RLS entre secure_files y secure_file_keys
--
-- Bug (42P17 "infinite recursion detected in policy for relation
-- secure_file_keys"): las políticas SELECT se referenciaban en cruz —
--   secure_files.files_select_recipients  -> EXISTS(secure_file_keys …)
--   secure_file_keys.filekeys_select_parties -> EXISTS(secure_files …)
-- Al planificar cualquiera, cada una aplica la RLS de la otra sin fin.
--
-- Impacto colateral GRAVE: la política `secure_read` de storage.objects consulta
-- secure_files/secure_file_keys, así que TODO `INSERT … RETURNING` autenticado en
-- storage.objects (lo que hace el servicio de Storage al subir) disparaba la
-- recursión y devolvía 400. Síntoma reportado: "no deja subir la foto de perfil".
--
-- Arreglo estándar: mover cada verificación cruzada a una función SECURITY DEFINER
-- (corre como su dueño, sin aplicar RLS dentro), que el planificador trata como
-- caja negra → se corta el ciclo. La lógica de acceso es idéntica.
--
-- Idempotente.
-- ============================================================================

create or replace function public.secure_file_owned_by_me(p_file uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.secure_files f where f.id = p_file and f.owner_id = (select auth.uid()));
$$;

create or replace function public.secure_file_key_for_me(p_file uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.secure_file_keys k where k.file_id = p_file and k.recipient_id = (select auth.uid()));
$$;

revoke all on function public.secure_file_owned_by_me(uuid) from public;
revoke all on function public.secure_file_key_for_me(uuid) from public;
grant execute on function public.secure_file_owned_by_me(uuid) to anon, authenticated;
grant execute on function public.secure_file_key_for_me(uuid) to anon, authenticated;

-- secure_files: el dueño ve lo suyo; el destinatario ve lo compartido (vía función).
drop policy if exists files_select_recipients on public.secure_files;
create policy files_select_recipients on public.secure_files
  for select using (owner_id = (select auth.uid()) or public.secure_file_key_for_me(id));

-- secure_file_keys: el destinatario ve su clave; el dueño del archivo ve las suyas (vía función).
drop policy if exists filekeys_select_parties on public.secure_file_keys;
create policy filekeys_select_parties on public.secure_file_keys
  for select using (recipient_id = (select auth.uid()) or public.secure_file_owned_by_me(file_id));

-- El dueño del archivo puede insertar claves para sus destinatarios (vía función).
drop policy if exists filekeys_insert_owner on public.secure_file_keys;
create policy filekeys_insert_owner on public.secure_file_keys
  for insert with check (public.secure_file_owned_by_me(file_id));
