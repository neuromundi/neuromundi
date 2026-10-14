-- ===========================================================================
-- 0205 · Control y estadistica de fichas del directorio para el panel admin.
--
-- Hallazgo (14 oct 2026): el panel no tenia NADA sobre fichas rechazadas ni
-- sobre invitaciones vencidas sin reclamar.
--   · baja_motivo se captura desde 0091 y no se habia leido nunca.
--   · expira_en viaja en la RPC de invitaciones pero no se pinta, no se ordena
--     y no se cuenta: una invitacion caducada se ve igual que una viva.
--   · los 4 contadores de AdminInvitations se calculan en el navegador sobre
--     un limit 2000, asi que con mas invitaciones las cifras serian falsas.
--
-- Esta funcion devuelve AGREGADOS calculados en la base, sin tope de filas.
-- baja_motivo no esta en el grant por columna de 0172, por eso security definer.
-- ===========================================================================

create or replace function public.admin_directorio_resumen()
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when public.is_admin_or_advisor() then json_build_object(

    'fichas', json_build_object(
      'total',            (select count(*) from public.directorio),
      'publicadas',       (select count(*) from public.directorio
                            where estado_revision = 'publicado' and not baja_solicitada),
      'borrador',         (select count(*) from public.directorio
                            where estado_revision <> 'publicado' and not baja_solicitada),
      'dadas_de_baja',    (select count(*) from public.directorio where baja_solicitada),
      'reclamadas',       (select count(*) from public.directorio where reclamada_por is not null),
      'correo_rebotado',  (select count(*) from public.directorio where correo_rebotado),
      'sin_correo',       (select count(*) from public.directorio
                            where coalesce(btrim(correo), '') = '')
    ),

    -- Lo que se perderia HOY si venciera el plazo: fichas publicadas que no
    -- sobreviven al predicado de ficha_visible (0203).
    'retiro_proyectado', json_build_object(
      'fecha',            public.verificacion_deadline(),
      'sobreviven',       (select count(*) from public.directorio d
                            where d.estado_revision = 'publicado' and not d.baja_solicitada
                              and d.reclamada_por is not null
                              and public.cuota_cubierta(d.reclamada_por)),
      'se_retirarian',    (select count(*) from public.directorio d
                            where d.estado_revision = 'publicado' and not d.baja_solicitada
                              and not (d.reclamada_por is not null
                                       and public.cuota_cubierta(d.reclamada_por)))
    ),

    -- baja_motivo, que hasta hoy se guardaba y nunca se leia.
    'bajas_por_motivo', coalesce((
      select json_agg(x order by x.fichas desc)
      from (
        select coalesce(nullif(btrim(baja_motivo), ''), '(sin motivo)') as motivo,
               count(*) as fichas
        from public.directorio
        where baja_solicitada
        group by 1
      ) x
    ), '[]'::json),

    'invitaciones', json_build_object(
      'total',            (select count(*) from public.directorio_invitaciones),
      'nunca_enviadas',   (select count(*) from public.directorio_invitaciones
                            where enviada_en is null and cancelada_en is null and baja_en is null),
      'enviadas',         (select count(*) from public.directorio_invitaciones where enviada_en is not null),
      'abiertas',         (select count(*) from public.directorio_invitaciones where abierta_en is not null),
      'reclamadas',       (select count(*) from public.directorio_invitaciones where usada_en is not null),
      'baja',             (select count(*) from public.directorio_invitaciones where baja_en is not null),
      'canceladas',       (select count(*) from public.directorio_invitaciones where cancelada_en is not null),
      -- VENCIDAS SIN RECLAMAR: lo que no existia en ningun lado.
      'vencidas_sin_reclamar', (select count(*) from public.directorio_invitaciones
                            where expira_en <= now() and usada_en is null
                              and baja_en is null and cancelada_en is null),
      'vencen_en_30_dias',(select count(*) from public.directorio_invitaciones
                            where expira_en > now() and expira_en <= now() + interval '30 days'
                              and usada_en is null and baja_en is null and cancelada_en is null),
      'vivas',            (select count(*) from public.directorio_invitaciones
                            where expira_en > now() and usada_en is null
                              and baja_en is null and cancelada_en is null)
    ),

    -- Tasas sobre lo realmente enviado, no sobre el total.
    'tasas', (
      select json_build_object(
        'enviadas',   e,
        'apertura',   case when e > 0 then round(100.0 * a / e, 1) else null end,
        'reclamo',    case when e > 0 then round(100.0 * u / e, 1) else null end,
        'rechazo',    case when e > 0 then round(100.0 * b / e, 1) else null end
      )
      from (
        select count(*) filter (where enviada_en is not null) as e,
               count(*) filter (where enviada_en is not null and abierta_en is not null) as a,
               count(*) filter (where enviada_en is not null and usada_en is not null) as u,
               count(*) filter (where enviada_en is not null and baja_en is not null) as b
        from public.directorio_invitaciones
      ) t
    ),

    'generado_en', now()
  ) else null end;
$$;

comment on function public.admin_directorio_resumen() is
  'Agregados del directorio para el panel admin: fichas por estado, bajas por motivo, invitaciones vencidas sin reclamar y tasas de apertura/reclamo. Calculado en la base, sin tope de filas.';

revoke all on function public.admin_directorio_resumen() from public, anon;
grant execute on function public.admin_directorio_resumen() to authenticated, service_role;
