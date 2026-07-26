# Taxonomía Neuromundi — mapeo aplicado (v2, con base en el PDF)

Estado: **aplicado en los catálogos de registro** (`src/data`). Etiquetas en
español, que es como funcionan hoy esos catálogos (no pasan por i18n, igual que
el resto de `PROFESSIONS`/`SPECIALTIES`/…), por eso no afectan la paridad.

Fuentes integradas: Lista A (aprobada), el **PDF "CATEGORIAS NEUROMUNDI"**, la
Lista B como dominio nuevo, y mis sugerencias adicionales. Todo deduplicado
contra lo que ya existía.

## Dónde vive cada cosa

- **`specialistCatalog.ts`** → `PROFESSIONS` (rol del prestador individual),
  `SPECIALTIES` (condiciones que atiende), `INTERVENTION_AREAS` (áreas/servicios),
  `CERTIFICATIONS` (métodos/enfoques).
- **`clinicCatalog.ts`** → `CLINIC_SPECIALTIES`, `CLINIC_SERVICES`.
- **`providerCatalog.ts`** → `PRODUCT_CATEGORIES` (tienda), con subcategorías.

## PROFESSIONS — nuevas (las que ya existían se reutilizan)

Psicomotricidad · Consultoría de Lactancia (IBCLC) · Consultoría de Sueño Infantil ·
Asesoría de Porteo · Terapia Miofuncional Orofacial · Optometría Comportamental /
Terapia Visual · Neurofeedback / Biofeedback · Terapia Neurosensorial (Tomatis,
Bérard, SSP) · Arteterapia · Coaching de Funciones Ejecutivas · Acompañante
Terapéutico (Maestro/a Sombra) · Especialista en Transición / Vida Independiente ·
Terapia Familiar y Sistémica · Trabajo Social · Consultoría en Accesibilidad
Cognitiva (B2B) · Odontología para pacientes neurodivergentes.

Ya existían y se reutilizan: Neuropediatría, Neurología, Neuropsicología,
Psiquiatría, Paidopsiquiatría, Genética Médica, Pediatría, Medicina de
Rehabilitación, Psicología (clínica/infantil), Terapia Ocupacional, Logopedia,
Fisioterapia, Psicopedagogía, Educación Especial, Nutrición, Musicoterapia.

## Dominio nuevo — Terapia y Asistencia con Animales (Neuro-Friendly)

Añadido como bloque contiguo en `PROFESSIONS` para que sea registrable y
buscable de inmediato, sin cirugía de formularios:

Equinoterapia / Hipoterapia · Terapia Asistida con Perros · Granja Terapéutica ·
Entrenador de Perros de Asistencia (PSAA) · Evaluador / Certificador de Animales
de Apoyo Emocional · Adiestramiento Canino Positivo · Veterinaria de Baja
Estimulación · Cuidado y Paseo de Mascotas (Neuro-Friendly).

Sus **productos** viven en `PRODUCT_CATEGORIES › Mascotas Neuro-Friendly`.

## SPECIALTIES (condiciones) — nuevas

Selectividad alimentaria / ARFID · Mutismo Selectivo · Dislexia · Discalculia ·
Disgrafía · Dispraxia / TDC · Altas Capacidades / 2e · Tourette / Tics · TPAC ·
Discapacidad múltiple / Sordoceguera · Trastornos del Sueño · Trauma / TEPT.

## INTERVENTION_AREAS — nuevas

Comunicación Aumentativa (SAAC) · Adaptación Curricular / Ajustes Razonables ·
Vida Independiente / Transición · Psicoeducación / Escuela para Familias · Grupos
de Apoyo entre Pares · Regulación Emocional · Terapia Miofuncional · Estimulación
Auditiva (Tomatis/Bérard) · Regulación Polivagal (SSP) · Procesamiento Visual /
Terapia Visual · Lactancia y Motricidad Oral.

## CERTIFICATIONS / enfoques — nuevos

Modelo Neuroafirmante · TCC adaptada · ACT · SCERTS · PROMPT · Terapia
Miofuncional · Método Tomatis · Método Bérard (AIT) · Safe & Sound Protocol (SSP) ·
Interactive Metronome · HeartMath · WISC-V · IBCLC.

## CLÍNICAS

- `CLINIC_SPECIALTIES` nuevas: Neuropsicología · Neuropediatría y Genética ·
  Psicomotricidad · Optometría Comportamental · Neurofeedback · Terapia
  Neurosensorial · Nutrición Especializada · Terapia Familiar y Sistémica.
- `CLINIC_SERVICES` nuevos: Lactancia y alimentación temprana · Consultoría de
  sueño · SAAC · Acompañamiento e inclusión escolar · Vida independiente /
  transición · Teleterapia.

## PRODUCT_CATEGORIES — categorías nuevas

- **Perinatal y Alimentación Temprana**: soporte/posicionamiento (biberones
  terapéuticos, cojines) · transición a sólidos (cucharas texturizadas, vasos con
  válvula) · exploración oral (mordedores médicos, cepillos dedales).
- **Tecnología Neurosensorial**: hardware de regulación (auriculares óseos:
  Forbrain, Soundsory) · software y biofeedback (SSP/Unyte, HeartMath) · relojes
  visuales (Time Timers) y apps de rutinas.
- **Mascotas Neuro-Friendly**: accesorios sensoriales (placas de silicona,
  correas sin ruido) · apoyo ejecutivo (entregas automatizadas, areneros
  autolimpiables) · seguridad (correas manos libres).

Las categorías de producto que ya existían (Sensorial, Cognitivo/Funciones
Ejecutivas, Comunicación/SAAC, Autonomía, Motricidad/Ergonomía, Social-Emocional)
ya cubrían el resto de artículos del PDF, así que se reutilizan.

## Lo que NO toqué (y por qué)

- La tabla **`categories`** del directorio (los *chips* de filtro de alto nivel)
  es un conjunto **curado y pequeño**; no volqué ahí las 40+ entradas nuevas para
  no saturar el filtro. La taxonomía detallada vive en los arreglos del perfil
  (`specialties`, `intervention_areas`, `product_categories`, …) y alimenta la
  búsqueda de texto. Si quieres **chips nuevos** de alto nivel en el directorio
  (p. ej. "Terapia con Animales" o "Perinatal"), dime cuáles y los siembro con una
  migración corta en `categories`.
- Las etiquetas quedaron en español (como el resto de estos catálogos). Si más
  adelante decides localizar TODOS los catálogos, es un trabajo aparte de i18n.
