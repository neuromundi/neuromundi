-- ============================================================================
-- 0137 · Clasificar las fichas del directorio contra el catálogo
--
-- EL PROBLEMA QUE RESUELVE
--   `directorio_publico` devolvía, para TODA la rama de fichas:
--       NULL::text   as profession
--       '{}'::text[] as specialties
--       '{}'::text[] as intervention_areas
--       '{}'::text[] as neuro_conditions
--   y `useDirectory` filtra especialidad contra specialties/intervention_areas
--   y el acceso rápido contra profession + esas listas. Con arreglos vacíos,
--   TODO filtro de especialidad devolvía cero fichas: las 317 claves de los
--   catálogos estaban en 0. El único resultado de "sombra" era ADIGS, y salía
--   por coincidencia de texto en su NOMBRE, no por estar clasificada.
--
--   La curaduría sí traía la información: vive en `especializacion` como texto
--   libre. Lo que faltaba era mapearla a las claves del catálogo.
--
-- QUÉ HACE
--   1. Añade a `directorio` las cuatro columnas que la vista necesita.
--   2. Crea `directorio_reglas_clasificacion`: tabla de reglas (destino, clave,
--      patrón, prioridad). Es tabla y no código a propósito: cuando el catálogo
--      crezca, se añaden filas y se vuelve a correr, sin otra migración.
--   3. Crea `clasificar_directorio()`, que aplica las reglas.
--   4. Rehace `directorio_publico` para que la rama de fichas exponga las
--      columnas reales en vez de vacíos.
--
-- QUÉ NO HACE
--   · No inventa `age_ranges` ni `modalities`: el texto curado no los sostiene.
--   · No toca `sections` ni `ambito`.
--   · No publica nada: las fichas en 'por_verificar' siguen fuera de la vista.
--   · No sobrescribe clasificación hecha a mano (ver `clasificacion_auto`).
--
-- Idempotente. Se puede volver a correr.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PASO 1 · Columnas
-- ---------------------------------------------------------------------------
alter table public.directorio
  add column if not exists profession          text,
  add column if not exists specialties         text[] not null default '{}',
  add column if not exists intervention_areas  text[] not null default '{}',
  add column if not exists neuro_conditions    text[] not null default '{}',
  -- Marca la clasificación puesta por esta función. Si un curador la corrige a
  -- mano, pone `clasificacion_auto = false` y la función ya no la vuelve a tocar.
  add column if not exists clasificacion_auto  boolean not null default false;

comment on column public.directorio.clasificacion_auto is
  'true = clasificación derivada del texto por clasificar_directorio(). '
  'Ponerla en false protege la corrección manual de futuras corridas.';

-- ---------------------------------------------------------------------------
-- PASO 2 · Reglas
--
-- `destino`  profession | specialties | intervention_areas | neuro_conditions
-- `clave`    valor exacto del catálogo en src/data/ (specialistCatalog.ts,
--            neuroConditionsCatalog.ts). Si no coincide, el filtro no encuentra
--            nada aunque la ficha quede marcada.
-- `patron`   expresión regular, se evalúa contra el texto en minúsculas.
-- `prioridad` solo cuenta en `profession`, que es un valor único: gana el
--            número más bajo. Neuropediatría antes que neurología, si no todo
--            neuropediatra acabaría como neurólogo.
-- ---------------------------------------------------------------------------
create table if not exists public.directorio_reglas_clasificacion (
  id        bigserial primary key,
  destino   text not null check (destino in
              ('profession','specialties','intervention_areas','neuro_conditions')),
  clave     text not null,
  patron    text not null,
  prioridad integer not null default 100,
  unique (destino, clave)
);

alter table public.directorio_reglas_clasificacion enable row level security;
drop policy if exists "reglas legibles" on public.directorio_reglas_clasificacion;
create policy "reglas legibles" on public.directorio_reglas_clasificacion
  for select to anon, authenticated using (true);

insert into public.directorio_reglas_clasificacion (destino, clave, patron, prioridad) values
  -- PROFESIÓN (valor único; de más específico a más general)
  ('profession','neuropediatria','neurolog[íi]a? *(pedi[áa]tric|infantil)|neuroped|neurolog[oa] infantil',10),
  ('profession','paidopsiquiatria','paidopsiquiatr|psiquiatr[íi]a infantil|psiquiatra infantil',10),
  ('profession','epileptologia','epileptolog',15),
  ('profession','neuropsicologia','neuropsicolog',20),
  ('profession','acompanante_terapeutico','sombra|acompa[ñn]ante terap',20),
  ('profession','taa_equinoterapia','equinoterap|hipoterap|ecuestre',20),
  ('profession','musicoterapia','musicoterap',20),
  ('profession','arteterapia','artetera|arte terap',25),
  ('profession','neurologia','neurolog|neurofisiolog|neurocirug',30),
  ('profession','psiquiatria','psiquiatr',35),
  ('profession','logopedia','logoped|fonoaud|terapia de lenguaje|lenguaje y (habla|audici)|foniatr',40),
  ('profession','terapia_ocupacional','terapia ocupacional|terapeuta ocupacional',40),
  ('profession','fisioterapia_neurologica','fisioterapia neurol|neurorrehabilit|rehabilitaci[óo]n neurol',45),
  ('profession','psicomotricidad','psicomotric|psicomotor',50),
  ('profession','fisioterapia','fisioterap|terapia f[íi]sica|rehabilitaci[óo]n f[íi]sica',55),
  ('profession','psicopedagogia','psicopedagog|neuropedagog',60),
  ('profession','educacion_especial','educaci[óo]n especial|escuela especial',65),
  ('profession','odontologia_inclusiva','odontolog|dental',70),
  ('profession','nutricion','nutrici[óo]n',75),
  ('profession','psicologia_infantil','psicolog[íi]a infantil|psicolog[oa] infantil|psicoterapia infantil|terapia de juego',80),
  ('profession','psicologia_clinica','psicolog',90),
  ('profession','pediatria','pediatr',95),

  -- ESPECIALIDADES (lista; todas las que coincidan)
  ('specialties','tea','autis|\mtea\M|asperger|espectro autista',100),
  ('specialties','tdah','\mtdah\M|d[ée]ficit de atenci|hiperactiv',100),
  ('specialties','lenguaje','lenguaje|logoped|fonoaud|foniatr|\mhabla\M',100),
  ('specialties','aprendizaje','aprendizaje|psicopedagog|dislexia|discalculia|disgraf',100),
  ('specialties','dislexia','dislexia',100),
  ('specialties','sensorial','sensorial',100),
  ('specialties','discapacidad_intelectual','discapacidad intelectual|deficiente mental',100),
  ('specialties','estimulacion_temprana','estimulaci[óo]n temprana|atenci[óo]n temprana',100),
  ('specialties','conducta','conduct',100),
  ('specialties','habilidades_sociales','habilidades sociales',100),
  ('specialties','funciones_ejecutivas','funciones ejecutivas',100),
  ('specialties','sindrome_down','\mdown\M|trisom',100),
  ('specialties','paralisis_cerebral','par[áa]lisis cerebral',100),
  ('specialties','trastornos_sueno','\msue[ñn]o\M|narcolep',100),
  ('specialties','arfid_selectividad','selectividad alimentaria|arfid|terapia de alimentaci',100),
  ('specialties','tourette','tourette|\mtics\M',100),
  ('specialties','altas_capacidades','altas capacidades|doble excepcional',100),

  -- ÁREAS DE INTERVENCIÓN (lista)
  ('intervention_areas','integracion_sensorial','integraci[óo]n sensorial|sensorial',100),
  ('intervention_areas','estimulacion_temprana','estimulaci[óo]n temprana|atenci[óo]n temprana',100),
  ('intervention_areas','modificacion_conducta','modificaci[óo]n de conducta|manejo conductual|conductual',100),
  ('intervention_areas','analisis_conductual_aba','\maba\M|an[áa]lisis conductual|conductual aplicad',100),
  ('intervention_areas','lenguaje_habla','lenguaje|logoped|fonoaud|foniatr',100),
  ('intervention_areas','motricidad','psicomotric|psicomotor|motricidad',100),
  ('intervention_areas','funciones_ejecutivas','funciones ejecutivas',100),
  ('intervention_areas','autonomia','autonom[íi]a|vida diaria|\mavd\M',100),
  ('intervention_areas','saac','comunicaci[óo]n aumentativa|\msaac\M|pictograma',100),
  ('intervention_areas','adaptacion_curricular','adaptaci[óo]n curricular|ajustes razonables',100),
  ('intervention_areas','vida_independiente','vida independiente|transici[óo]n a la vida|formaci[óo]n para la vida',100),
  ('intervention_areas','psicoeducacion_familia','escuela para (padres|familias)|orientaci[óo]n a padres|psicoeducaci',100),
  ('intervention_areas','grupos_pares','red de familias|grupo de apoyo|entre pares',100),
  ('intervention_areas','regulacion_emocional','regulaci[óo]n emocional',100),
  ('intervention_areas','terapia_miofuncional','miofuncional',100),
  ('intervention_areas','estimulacion_auditiva','tomatis|b[ée]rard|terapia auditiva|estimulaci[óo]n auditiva',100),
  ('intervention_areas','hidroterapia','hidroterap|terapia acu[áa]tic|nataci[óo]n',100),
  ('intervention_areas','evaluacion_diagnostica','evaluaci[óo]n neuropsicol|evaluaci[óo]n diagn|ados-2|adi-r|\mcars\M|tamiz',100),
  ('intervention_areas','psicoterapia_cc_act','psicoterapia|cognitivo-conductual|\mgestalt\M|sist[ée]mic',100),
  ('intervention_areas','educacion_inclusiva','inclusi[óo]n (escolar|educativa)|educaci[óo]n inclusiva|escuela inclusiva|educaci[óo]n especial|integraci[óo]n educativa',100),
  ('intervention_areas','capacitacion_docente','capacitaci[óo]n a (docentes|maestros)|asesor[íi]a docente|capacitaci[óo]n docente',100),
  ('intervention_areas','orientacion_legal_ddhh','jur[íi]dic|abogad|derechos humanos|orientaci[óo]n legal',100),
  ('intervention_areas','neurorrehabilitacion_motora','neurorrehabilit|rehabilitaci[óo]n neurol',100),
  ('intervention_areas','rehabilitacion_cognitiva','rehabilitaci[óo]n cognitiva|neurofeedback|neuromodulaci|estimulaci[óo]n magn[ée]tica',100),
  ('intervention_areas','manejo_epilepsia','epilep|crisis convulsiv|\meeg\M|electroencefal',100),
  ('intervention_areas','espasticidad_movilidad','espasticidad',100),
  ('intervention_areas','deglucion_disfagia','disfagia|degluci',100),
  ('intervention_areas','dolor_neurologico','dolor neurop[áa]tico|dolor neurol',100),
  ('intervention_areas','expresion_creativa','artetera|arte terap|taller(es)? de pintura|artes visuales|expresi[óo]n art',100),
  ('intervention_areas','movimiento_danza','danzaterap|terapia de movimiento',100),
  ('intervention_areas','ocio_sensorial','sensory-friendly|ocio sensorial',100),

  -- AFECCIONES NEUROLÓGICAS (lista)
  ('neuro_conditions','epilepsia','epilep|crisis convulsiv',100),
  ('neuro_conditions','paralisis_cerebral_afeccion','par[áa]lisis cerebral',100),
  ('neuro_conditions','cefalea_migrana','cefalea|migra[ñn]a',100),
  ('neuro_conditions','esclerosis_multiple','esclerosis m[úu]ltiple|desmielinizant',100),
  ('neuro_conditions','parkinson','parkinson',100),
  ('neuro_conditions','enf_neuromuscular','neuromuscular|distrofia|atrofia muscular espinal',100),
  ('neuro_conditions','neuropatia_periferica','neuropat[íi]a',100),
  ('neuro_conditions','distonia_movimiento','diston|trastornos del movimiento',100),
  ('neuro_conditions','demencia_neurocognitivo','demencia|alzheimer|neurocognitiv|neurodegenerativ',100),
  ('neuro_conditions','acv','cerebrovascular|\macv\M|ictus',100),
  ('neuro_conditions','tce_lesion_medular','traumatismo craneo|\mtce\M|lesi[óo]n medular',100),
  ('neuro_conditions','espina_bifida','espina b[íi]fida|mielomeningocele',100),
  ('neuro_conditions','hidrocefalia_lcr','hidrocefalia',100),
  ('neuro_conditions','tumor_snc','tumor',100),
  ('neuro_conditions','enf_neurogenetica','x fr[áa]gil|esclerosis tuberosa|neurofibromatosis',100),
  ('neuro_conditions','neuroinmune','encefalitis autoinmune|neuroinmun',100),
  ('neuro_conditions','ataxia','ataxia',100),
  ('neuro_conditions','sueno_neurologico','narcolep|trastornos del sue[ñn]o',100),
  ('neuro_conditions','infeccion_snc','meningitis|encefalitis',100)
on conflict (destino, clave) do update
  set patron = excluded.patron, prioridad = excluded.prioridad;

-- ---------------------------------------------------------------------------
-- PASO 3 · La función
--
-- El texto que se lee es nombre + especialización + clase SCIAN. `notas` queda
-- FUERA a propósito: ahí van advertencias de curaduría ("categoría vacía:
-- equinoterapia", "sin confirmar"), y clasificar por ellas marcaría fichas por
-- lo que les falta en vez de por lo que ofrecen.
-- ---------------------------------------------------------------------------
create or replace function public.clasificar_directorio(p_forzar boolean default false)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_filas integer;
begin
  with base as (
    select d.id,
           lower(coalesce(d.nombre,'') || ' ' ||
                 coalesce(d.especializacion,'') || ' ' ||
                 coalesce(d.clase_scian,'')) as t
    from public.directorio d
    where p_forzar or d.clasificacion_auto or (
      d.profession is null and d.specialties = '{}'
      and d.intervention_areas = '{}' and d.neuro_conditions = '{}'
    )
  ),
  aciertos as (
    select b.id, r.destino, r.clave, r.prioridad
    from base b join public.directorio_reglas_clasificacion r on b.t ~ r.patron
  ),
  prof as (
    select distinct on (id) id, clave
    from aciertos where destino = 'profession'
    order by id, prioridad, clave
  ),
  listas as (
    select id, destino, array_agg(distinct clave order by clave) as claves
    from aciertos where destino <> 'profession'
    group by id, destino
  )
  update public.directorio d set
    profession         = coalesce((select clave from prof where prof.id = d.id), d.profession),
    specialties        = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='specialties'), '{}'),
    intervention_areas = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='intervention_areas'), '{}'),
    neuro_conditions   = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='neuro_conditions'), '{}'),
    clasificacion_auto = true,
    actualizada_en     = now()
  where d.id in (select id from base);

  get diagnostics v_filas = row_count;
  return v_filas;
end $$;

revoke all on function public.clasificar_directorio(boolean) from public, anon, authenticated;

select public.clasificar_directorio(true) as fichas_clasificadas;

-- ---------------------------------------------------------------------------
-- PASO 4 · La vista
--
-- La rama de fichas va POSICIONALMENTE contra las columnas de `public.profiles`.
-- Ese acoplamiento ya se rompió una vez: la vista se creó con 94 columnas y
-- después se añadió `membership_period` a profiles, así que la vista quedó
-- desincronizada y cualquier intento de recrearla fallaba con un error de UNION
-- que no dice cuál es la columna que falta.
--
-- Esta guarda convierte ese fallo mudo en un mensaje que dice exactamente qué
-- pasó y donde. Si al aplicar esta migración salta, hay que añadir la columna
-- nueva de profiles a la rama de fichas, EN SU MISMA POSICIÓN.
-- ---------------------------------------------------------------------------
do $guardia$
declare n integer;
begin
  select count(*) into n from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles';
  if n <> 95 then
    raise exception
      'public.profiles tiene % columnas; la rama de fichas de esta migración está escrita para 95. '
      'Añade la columna nueva a la rama, en su misma posición ordinal, y actualiza este numero.', n;
  end if;
end $guardia$;

drop view if exists public.directorio_publico;

create view public.directorio_publico
with (security_invoker = on) as
  select p.*, 'perfil'::text as origen, null::text as clee, false as reclamable,
         array[p.provider_type] as provider_types
  from public.profiles p
  where p.role = 'provider'
    and p.rules_version_accepted is not null
    and ( (p.is_published and p.membership_status = any (array['active','exempt','past_due']))
       or (p.membership_status = 'pending'
           and now() < coalesce((select fm.grace_until from public.founder_members fm
                                  where fm.user_id = p.id), p.created_at + interval '30 days')) )
union all
  select
    d.id as id,
    'provider'::text as role,
    d.nombre as full_name,
    null::text as avatar_url,
    d.telefono as phone,
    null::text as bio,
    d.id as qr_token,
    d.provider_type as provider_type,
    d.nombre as business_name,
    d.sitio_web as website_url,
    d.direccion as address,
    d.ciudad as city,
    'México'::text as country,
    false as is_verified,
    true as is_published,
    d.lat as latitude,
    d.lng as longitude,
    d.creada_en as created_at,
    d.actualizada_en as updated_at,
    null::date as birth_date,
    null::text as gender,
    null::text as condition,
    d.estado as state,
    d.ciudad as municipality,
    false as is_company,
    d.especializacion as services_offered,
    'exempt'::text as membership_status,
    null::timestamptz as membership_due_at,
    null::timestamptz as membership_paid_until,
    null::text as stripe_customer_id,
    null::text as stripe_subscription_id,
    null::text as promo_code_used,
    null::text as dial_code,
    d.sitio_web as website,
    null::text as instagram,
    null::text as tiktok,
    null::text as facebook,
    null::text as cedula_profesional,
    null::text as rules_version_accepted,
    null::timestamptz as rules_accepted_at,
    null::text as stripe_connect_id,
    false as stripe_charges_enabled,
    false as accepts_payments,
    null::numeric as consultation_amount,
    null::text as consultation_currency,
    null::text as rfc,
    null::text as public_key,
    null::text as fiscal_razon_social,
    null::text as fiscal_regimen,
    null::text as fiscal_uso_cfdi,
    null::text as fiscal_cp,
    null::text as fiscal_direccion,
    null::text as fiscal_email,
    null::text as fiscal_tax_id,
    null::text as fiscal_country,
    '{}'::text[] as school_grades,
    null::text as account_type,
    null::text as life_stage,
    '{}'::text[] as interests,
    false as comms_opt_in,
    null::text as title_prefix,
    d.profession as profession,   -- 0137: antes venía vacío
    null::text as whatsapp,
    null::text as booking_url,
    null::text as linkedin,
    coalesce(d.specialties,'{}'::text[]) as specialties,   -- 0137: antes venía vacío
    '{}'::text[] as modalities,
    '{}'::text[] as age_ranges,
    coalesce(d.intervention_areas,'{}'::text[]) as intervention_areas,   -- 0137: antes venía vacío
    '{}'::jsonb as provider_details,
    '{}'::text[] as product_categories,
    '{}'::text[] as products_offered,
    '{}'::text[] as sales_channels,
    '{}'::text[] as shipping_coverage,
    null::text as price_range,
    null::tsvector as search_tsv,
    null::text as badge_level,
    null::bigint as member_no,
    false as wants_founder,
    null::bigint as referred_by,
    null::timestamptz as referred_at,
    0::numeric as referral_credit_pct,
    null::boolean as is_medical_override,
    null::timestamptz as suspended_at,
    null::timestamptz as suspend_until,
    null::boolean as pre_suspend_published,
    null::timestamptz as winback_until,
    false as neuroaffirming,
    false as accepts_neuromundi_id,
    false as is_advisor,
    coalesce(d.sections,'{}'::text[]) as sections,
    coalesce(d.neuro_conditions,'{}'::text[]) as neuro_conditions,   -- 0137: antes venía vacío
    null::text as membership_period,
    null::integer as year_started,
    null::boolean as certified_staff,
    'ficha'::text as origen,
    d.clee as clee,
    true as reclamable,
    d.provider_types as provider_types
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null
    and not exists (
      select 1 from public.profiles p
      where p.id = d.id and p.is_published and p.role = 'provider'
    );

grant select on public.directorio_publico to anon, authenticated;
