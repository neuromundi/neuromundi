-- 0261: el plazo de fundador deja de ser una fecha fija del calendario por pais y
-- pasa a contarse desde el dia en que sale el correo de cada ficha.
--
-- El problema que resuelve: con una sola fecha por pais, una ficha de la primera
-- tanda tenia 35 dias para decidir y una de la ultima tanda unos 10, con el mismo
-- descuento, solo por su lugar en la fila.
--
-- Como queda: al enviar la invitacion se graba su propio vencimiento en
-- directorio_invitaciones.fundador_hasta. Al reclamar la ficha, ese vencimiento se
-- copia al perfil. founder_eligible() respeta el del perfil cuando existe y cae a la
-- fecha del pais cuando no (altas que no vienen de una invitacion).
-- La fecha por pais NO se borra: sigue siendo el tope duro de la campana.

alter table public.campaign_config
  add column if not exists founder_days int not null default 45,
  add column if not exists founder_days_by_country jsonb not null default '{}'::jsonb;

comment on column public.campaign_config.founder_days is
  'Dias de plazo de fundador contados desde el envio de la invitacion. 45 por omision.';
comment on column public.campaign_config.founder_days_by_country is
  'Excepciones por pais al numero de dias. Si el pais no esta, se usa founder_days.';

alter table public.directorio_invitaciones
  add column if not exists fundador_hasta timestamptz;

comment on column public.directorio_invitaciones.fundador_hasta is
  'Ultimo instante con tarifa de fundador para esta ficha. Se graba al enviar.';

alter table public.profiles
  add column if not exists fundador_hasta timestamptz;

comment on column public.profiles.fundador_hasta is
  'Plazo de fundador heredado de la invitacion con la que reclamo su ficha.';

-- Cuantos dias le toca a un pais.
create or replace function public.founder_days_for(p_country text)
returns int language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select (c.founder_days_by_country ->> p_country)::int from public.campaign_config c where c.id = 1),
    (select c.founder_days from public.campaign_config c where c.id = 1),
    45);
$$;
grant execute on function public.founder_days_for(text) to anon, authenticated, service_role;

-- El tope duro del pais, para no pasarse de la campana.
create or replace function public.founder_country_deadline(p_country text)
returns timestamptz language sql stable security definer set search_path to 'public' as $$
  select (c.founder_deadline_by_country ->> p_country)::timestamptz
    from public.campaign_config c where c.id = 1;
$$;
grant execute on function public.founder_country_deadline(text) to anon, authenticated, service_role;

-- Sella el plazo de una invitacion en el momento del envio. La devuelve para que
-- el correo imprima exactamente la misma fecha que quedo guardada.
create or replace function public.sellar_plazo_invitacion(p_token text)
returns timestamptz language plpgsql security definer set search_path to 'public' as $$
declare v_pais text; v_tope timestamptz; v_hasta timestamptz; v_ya timestamptz;
begin
  select i.fundador_hasta, d.pais into v_ya, v_pais
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token;

  if v_ya is not null then return v_ya; end if;   -- ya sellada, no se mueve
  if v_pais is null then return null; end if;

  v_hasta := date_trunc('day', now() + make_interval(days => public.founder_days_for(v_pais)))
             + interval '23 hours 59 minutes';
  v_tope  := public.founder_country_deadline(v_pais);
  if v_tope is not null and v_hasta > v_tope then v_hasta := v_tope; end if;

  update public.directorio_invitaciones set fundador_hasta = v_hasta where token = p_token;
  return v_hasta;
end $$;
revoke all on function public.sellar_plazo_invitacion(text) from public, anon, authenticated;
grant execute on function public.sellar_plazo_invitacion(text) to service_role;

-- Al reclamar, el perfil hereda el plazo de su invitacion.
create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_ficha uuid; v_hasta timestamptz;
begin
  select i.directorio_id, i.fundador_hasta into v_ficha, v_hasta
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

  -- 0261: el plazo viaja de la invitacion al perfil. Solo se escribe si el perfil
  -- no traia uno, para no acortarle a nadie un plazo ya concedido.
  if v_hasta is not null then
    update public.profiles
       set fundador_hasta = v_hasta
     where id = p_perfil and fundador_hasta is null;
  end if;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;
  return true;
end $$;

-- founder_eligible respeta el plazo propio del perfil cuando lo tiene.
create or replace function public.founder_eligible(p_id uuid)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare v_kind text; v_country text; v_wants boolean; v_usados int;
        v_limite timestamptz; v_auth boolean; v_propio timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  select p.country, p.wants_founder, coalesce(p.fundador_autorizado, false), p.fundador_hasta
    into v_country, v_wants, v_auth, v_propio
  from public.profiles p where p.id = p_id;
  -- Autorizacion individual del admin: pasa por encima de cupo y plazo.
  if coalesce(v_auth, false) then return true; end if;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;

  -- 0261: manda el plazo sellado en su invitacion; si no tiene, el del pais.
  v_limite := coalesce(v_propio, public.founder_country_deadline(v_country));
  if v_limite is not null and now() >= v_limite then return false; end if;

  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  return v_usados < public.founder_cap_for(v_country, v_kind);
end $$;

-- El correo de bienvenida dice el plazo del perfil, no el del pais.
create or replace function public.campaign_welcome_queue()
returns table(user_id uuid, email text, name text, role text, provider_type text,
              country text, opens_at timestamptz, sector text, ya_abierto boolean,
              fundador_hasta timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select ce.user_id, u.email::text,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro')::text,
         p.role::text, p.provider_type::text, p.country::text,
         public.directorio_abre_en(p.country),
         (case when p.membership_status = 'exempt' then 'publico'
               else coalesce(d.sector, 'privado') end)::text,
         public.directorio_abierto_en(p.country),
         coalesce(p.fundador_hasta, (c.founder_deadline_by_country->>p.country)::timestamptz)
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  cross join public.campaign_config c
  where ce.welcome_sent_at is null and u.email is not null and c.id = 1
  limit 200;
$$;
