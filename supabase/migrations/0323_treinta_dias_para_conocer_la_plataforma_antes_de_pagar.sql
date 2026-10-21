-- PLAZO GRATUITO DE 30 DIAS PARA LOS PERFILES DE PAGA (21 oct 2026).
--
-- Hasta hoy, un prestador de paga que reclamaba su ficha quedaba en 'pending'
-- y NO podia publicar su perfil: cuota_cubierta() exige 'active', 'exempt' o
-- una fecha de pago vigente, y el disparador de publicacion la consulta. Es
-- decir: para ver que le da la plataforma tenia que pagar primero. Eso es
-- justamente lo que frena a quien no nos conoce.
--
-- A partir de aqui, 'pending' con membership_due_at en el futuro cuenta como
-- cuota cubierta: durante esos dias el perfil se publica, aparece completo en
-- el directorio y opera como cualquier otro. Al vencer, deja de cumplir y
-- useMembershipGate lo bloquea exactamente como antes.
--
-- Medido antes de aplicar: 7 perfiles en la base (5 exempt, 2 active) y
-- NINGUNO en 'pending'. El cambio no altera a nadie existente.
--
-- Los correos ya enviados NO mencionaban ningun plazo de pago: el de 15 dias
-- se fijaba al reclamar, dentro de la plataforma. Por eso pasar de 15 a 30 no
-- desmiente nada de lo que se les prometio por escrito.

-- 1 · La cuota se tiene por cubierta durante el periodo de prueba.
create or replace function public.cuota_cubierta(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
       p.membership_status = 'active'
    or (p.membership_status = 'exempt'
        and (p.exencion_vigente_hasta is null or p.exencion_vigente_hasta > now()))
    or (p.membership_paid_until is not null and p.membership_paid_until > now())
    -- Periodo de prueba: 'pending' con fecha limite por delante.
    or (p.membership_status = 'pending'
        and p.membership_due_at is not null and p.membership_due_at > now()), false)
  from public.profiles p where p.id = p_id;
$$;

-- 2 · El directorio publico admite al perfil en prueba.
--
-- La vista se reescribe a partir de su PROPIA definicion vigente y no se
-- transcribe aqui: su texto completo vive en la migracion 0287 y tiene mas de
-- setenta columnas; copiarlo a mano para cambiar una linea del WHERE es como
-- se pierde una columna sin que nadie lo note. Si el ancla no aparece, la
-- migracion falla en vez de dejar la vista a medias.
do $$
declare v text; nueva text;
begin
  v := pg_get_viewdef('public.directorio_publico'::regclass, true);
  if position('membership_due_at' in v) > 0 then
    return; -- ya aplicada
  end if;
  nueva := replace(
    v,
    'OR p.membership_paid_until IS NOT NULL AND p.membership_paid_until > now())',
    'OR p.membership_paid_until IS NOT NULL AND p.membership_paid_until > now() '
    || 'OR p.membership_status = ''pending''::text AND p.membership_due_at IS NOT NULL '
    || 'AND p.membership_due_at > now())');
  if nueva = v then
    raise exception 'No se encontro la condicion de membresia en directorio_publico; revisar a mano';
  end if;
  execute 'create or replace view public.directorio_publico as ' || nueva;
end $$;

-- 3 · La tarjeta del directorio no se muestra "sólo nombre" durante la prueba.
--
-- `directorio_publico` sólo deja pasar una fila 'pending' cuando esta DENTRO
-- de su periodo de prueba (punto 2), asi que aqui basta admitir 'pending': una
-- fila 'pending' que llegue a esta vista esta, por construccion, en prueba.
do $$
declare v text; nueva text;
begin
  v := pg_get_viewdef('public.directorio_publico_seguro'::regclass, true);
  if position('''pending''::text]' in v) > 0 then
    return; -- ya aplicada
  end if;
  nueva := replace(
    v,
    'ARRAY[''active''::text, ''exempt''::text, ''past_due''::text]',
    'ARRAY[''active''::text, ''exempt''::text, ''past_due''::text, ''pending''::text]');
  if nueva = v then
    raise exception 'No se encontro la lista de estados en directorio_publico_seguro; revisar a mano';
  end if;
  execute 'create or replace view public.directorio_publico_seguro as ' || nueva;
end $$;

-- 4 · Un solo plazo para todos. Antes habia tres: 7 dias por defecto en la
-- columna, 15 al reclamar una ficha y ninguno declarado en el correo. Tres
-- relojes para la misma cosa es como se termina prometiendo uno y aplicando
-- otro.
alter table public.profiles
  alter column membership_due_at set default (now() + interval '30 days');
