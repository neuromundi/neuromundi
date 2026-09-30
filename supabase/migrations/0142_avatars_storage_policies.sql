-- ============================================================================
-- 0142 — Políticas de Storage para el bucket `avatars`
--
-- Bug: subir la foto de perfil devolvía 400 y el front mostraba "The database
-- schema is invalid or incompatible". Causa real: el bucket `avatars` (público,
-- sin límite de MIME/tamaño) NO tenía NINGUNA política en storage.objects, así
-- que RLS bloqueaba toda escritura. El bucket `verification` sí tenía las suyas,
-- por eso subir un PDF ahí funcionaba y el avatar no.
--
-- La app sube a `${auth.uid()}/avatar.webp` (useProfile.uploadAvatar, upsert),
-- así que la carpeta raíz del objeto = el uid del usuario. Se permite:
--   · lectura pública (bucket público; el URL público sirve el archivo),
--   · insert/update/delete del propio usuario dentro de SU carpeta.
--
-- `(select auth.uid())` envuelto para evitar el aviso auth_rls_initplan (ver 0090).
-- Idempotente.
-- ============================================================================

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
