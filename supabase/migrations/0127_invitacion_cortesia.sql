-- 0127_invitacion_cortesia.sql
-- Invitación de CORTESÍA (sin costo de cuota) integrada al envío individual.
-- Cuando p_cortesia = true, genera un código promocional de EXENCIÓN TOTAL
-- (benefit='exempt') LIGADO al correo del invitado (bound_email), un solo uso, y
-- lo pasa a la Edge Function enviar-invitaciones para incluirlo en el correo.
-- Al registrarse y canjearlo, redeem_promo_code deja su membership_status='exempt'.
-- Cambia la firma (añade p_cortesia y devuelve promo) → drop + create.

drop function if exists public.admin_enviar_invitacion(text, text, text, boolean, boolean);

create or replace function public.admin_enviar_invitacion(
  p_correo text,
  p_nombre text,
  p_provider_type text default 'service_provider',
  p_fundador boolean default true,
  p_cortesia boolean default false,
  p_send boolean default true
)
returns table (token text, ficha_id uuid, enviado boolean, promo text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dir uuid;
  v_token text;
  v_inv uuid;
  v_promo text := null;
begin
  if not public.is_admin() then
    raise exception 'no autorizado';
  end if;
  if p_correo is null or p_correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'correo inválido';
  end if;

  select d.id into v_dir
    from public.directorio d
   where lower(d.correo) = lower(p_correo)
   limit 1;

  if v_dir is null then
    insert into public.directorio (nombre, correo, provider_type, sector, fuente, estado_revision)
    values (
      coalesce(nullif(btrim(p_nombre), ''), 'Invitación'),
      lower(p_correo),
      coalesce(nullif(p_provider_type, ''), 'service_provider'),
      'privado',
      'curado',
      'borrador'
    )
    returning id into v_dir;
  end if;

  select i.id, i.token into v_inv, v_token
    from public.directorio_invitaciones i
   where i.directorio_id = v_dir
     and i.usada_en is null and i.baja_en is null and i.cancelada_en is null
     and i.expira_en > now()
   order by i.creada_en desc
   limit 1;

  if v_inv is null then
    insert into public.directorio_invitaciones (directorio_id, correo)
    values (v_dir, lower(p_correo))
    returning id, token into v_inv, v_token;
  end if;

  -- Cortesía: reutiliza un código exento vivo ligado a ese correo, o crea uno.
  if p_cortesia then
    select pc.code into v_promo
      from public.promo_codes pc
     where pc.benefit = 'exempt'
       and lower(pc.bound_email) = lower(p_correo)
       and pc.is_active = true
     order by pc.created_at desc
     limit 1;

    if v_promo is null then
      v_promo := 'CORTESIA-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
      insert into public.promo_codes (code, kind, scope, benefit, bound_email, max_uses, note, is_active)
      values (v_promo, 'personal', 'all', 'exempt', lower(p_correo), 1, 'Cortesía por invitación', true)
      on conflict (code) do nothing;
    end if;
  end if;

  if p_send then
    begin
      perform net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/enviar-invitaciones',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
        ),
        body := jsonb_build_object('send', true, 'token', v_token, 'limit', 1, 'fundador', p_fundador, 'promo', v_promo)
      );
    exception when others then
      null;
    end;
  end if;

  return query select v_token, v_dir, p_send, v_promo;
end;
$function$;

grant execute on function public.admin_enviar_invitacion(text, text, text, boolean, boolean, boolean) to authenticated;
