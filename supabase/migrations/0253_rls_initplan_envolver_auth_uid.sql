-- ============================================================================
-- 0253 — N-2 (auditoría 16 oct): 7 políticas RLS reevaluaban auth.uid() por
-- fila (aviso auth_rls_initplan). El estándar del proyecto desde 0090 es
-- envolverla en (select auth.uid()) para que se evalúe UNA vez por consulta.
-- Estas 7 son regresiones posteriores a 0090. Mismo comportamiento, 1 evaluación.
-- Idempotente (drop policy if exists + create).
-- ============================================================================

-- events (dueño): lectura / actualización / borrado mientras está pendiente.
drop policy if exists events_owner_read on public.events;
create policy events_owner_read on public.events
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists events_owner_update on public.events;
create policy events_owner_update on public.events
  for update to authenticated
  using ((created_by = (select auth.uid())) and (revision = 'pendiente'::text))
  with check ((created_by = (select auth.uid())) and (revision = 'pendiente'::text) and (is_published = false));

drop policy if exists events_owner_delete on public.events;
create policy events_owner_delete on public.events
  for delete to authenticated
  using ((created_by = (select auth.uid())) and (revision = 'pendiente'::text));

-- founder_members: lectura propia / admin / de perfiles publicados.
drop policy if exists founder_members_lectura on public.founder_members;
create policy founder_members_lectura on public.founder_members
  for select to public
  using (
    (user_id = (select auth.uid())) or is_admin() or (exists (
      select 1 from public.profiles p
      where p.id = founder_members.user_id and p.is_published))
  );

-- founder_requests: lectura propia / admin.
drop policy if exists founder_requests_lectura on public.founder_requests;
create policy founder_requests_lectura on public.founder_requests
  for select to public
  using ((user_id = (select auth.uid())) or is_admin());

-- membership_payments: lectura propia / admin-asesor.
drop policy if exists membership_payments_propio on public.membership_payments;
create policy membership_payments_propio on public.membership_payments
  for select to authenticated
  using ((user_id = (select auth.uid())) or is_admin_or_advisor());

-- payout_accounts: cuenta propia (todas las operaciones).
drop policy if exists payout_accounts_propia on public.payout_accounts;
create policy payout_accounts_propia on public.payout_accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
