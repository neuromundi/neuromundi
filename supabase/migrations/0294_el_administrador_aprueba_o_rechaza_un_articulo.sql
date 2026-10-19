-- Aprobar publica; rechazar o devolver a pendiente lo saca del blog. Al autor
-- le llega el aviso con el motivo si usted lo escribió, igual que en eventos.
create or replace function public.admin_revisar_contenido(p_id uuid, p_decision text, p_nota text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare v_autor uuid; v_titulo text; v_nota text;
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_decision not in ('aprobado','rechazado','pendiente') then
    raise exception 'decision no valida';
  end if;
  if length(coalesce(p_nota,'')) > 1000 then
    return jsonb_build_object('ok', false, 'motivo', 'nota_muy_larga');
  end if;
  v_nota := nullif(btrim(coalesce(p_nota,'')), '');

  update public.content_posts
     set revision     = p_decision,
         is_published = (p_decision = 'aprobado'),
         nota_admin   = v_nota,
         revisada_por = case when p_decision = 'pendiente' then null else auth.uid() end,
         revisada_en  = case when p_decision = 'pendiente' then null else now() end
   where id = p_id
  returning author_id, title into v_autor, v_titulo;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  if v_autor is not null and p_decision = 'aprobado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor, 'contenido_aprobado', 'Su artículo ya está publicado',
            coalesce(v_titulo,'Su artículo') || ' aparece en el blog.',
            jsonb_build_object('contenido_id', p_id, 'titulo', coalesce(v_titulo,'')));
  elsif v_autor is not null and p_decision = 'rechazado' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_autor,
            case when v_nota is null then 'contenido_rechazado' else 'contenido_rechazado_motivo' end,
            'Su artículo no fue publicado',
            coalesce(v_titulo,'Su artículo') || ' no fue publicado.',
            jsonb_build_object('contenido_id', p_id, 'titulo', coalesce(v_titulo,''),
                               'motivo', coalesce(v_nota,'')));
  end if;

  return jsonb_build_object('ok', true);
end $f$;

revoke all on function public.admin_revisar_contenido(uuid,text,text) from public, anon;
grant execute on function public.admin_revisar_contenido(uuid,text,text) to authenticated;
