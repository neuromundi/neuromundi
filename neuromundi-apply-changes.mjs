#!/usr/bin/env node
/**
 * apply-directorio-changes.mjs
 * Aplica los cambios de la sección "Directorio y especialización"
 * a los 4 archivos del proyecto Neuromundi.
 *
 * Uso (desde la raíz del proyecto, en PowerShell o terminal):
 *   node apply-directorio-changes.mjs
 *
 * Después ejecuta:
 *   git add src/lib/schemas.ts src/pages/Settings.tsx src/i18n/locales/es.json src/i18n/locales/en.json
 *   git commit -m "feat: seccion Directorio en ajustes del proveedor"
 *   git push origin main
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function patch(relPath, from, to, description) {
  const filePath = join(ROOT, relPath);
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(`❌  ERROR leyendo archivo: ${relPath} — ${e.message}`);
    return;
  }
  if (!content.includes(from)) {
    console.log(`⚠️  OMITIDO (no encontrado o ya aplicado): ${relPath} — ${description}`);
    return;
  }
  // Reemplaza solo la primera coincidencia.
  const updated = content.replace(from, to);
  writeFileSync(filePath, updated, 'utf8');
  console.log(`✅  ${relPath} — ${description}`);
}

/* ── 1. schemas.ts ──────────────────────────────────────────────────────────
   Agrega 11 campos de directorio al profileSchema,
   justo antes del cierre '});' del objeto.
   Ancla: la línea is_published + el cierre inmediato del objeto.          */
patch(
  'src/lib/schemas.ts',
  `  is_published: z.boolean().optional().default(false),\n});`,
  `  is_published: z.boolean().optional().default(false),\n` +
  `  // ── Directorio ────────────────────────────────────────────\n` +
  `  profession: z.string().trim().max(140).optional().default(''),\n` +
  `  specialties: z.array(z.string()).optional().default([]),\n` +
  `  intervention_areas: z.array(z.string()).optional().default([]),\n` +
  `  neuro_conditions: z.array(z.string()).optional().default([]),\n` +
  `  sections: z.array(z.string()).optional().default([]),\n` +
  `  modalities: z.array(z.string()).optional().default([]),\n` +
  `  neuroaffirming: z.boolean().optional().default(false),\n` +
  `  whatsapp: z.string().trim().max(30).optional().default(''),\n` +
  `  booking_url: z.string().trim().url('val.url').optional().or(z.literal('')),\n` +
  `  instagram: z.string().trim().max(200).optional().default(''),\n` +
  `  facebook: z.string().trim().max(200).optional().default(''),\n` +
  `});`,
  'Campos directorio en profileSchema',
);

/* ── 2. Settings.tsx — import lucide ───────────────────────────────────────
   Agrega Globe, MessageCircle, CalendarCheck, Instagram, Facebook.         */
patch(
  'src/pages/Settings.tsx',
  `Camera, LogOut, Trash2, KeyRound, HelpCircle, BellRing } from 'lucide-react';`,
  `Camera, LogOut, Trash2, KeyRound, HelpCircle, BellRing, Globe, MessageCircle, CalendarCheck, Instagram, Facebook } from 'lucide-react';`,
  'Íconos lucide-react',
);

/* ── 3. Settings.tsx — setValue en useForm ──────────────────────────────── */
patch(
  'src/pages/Settings.tsx',
  `    watch,\n    formState: { errors, isDirty },`,
  `    watch,\n    setValue,\n    formState: { errors, isDirty },`,
  'setValue en destructuring useForm',
);

/* ── 4. Settings.tsx — valores iniciales ───────────────────────────────────
   Ancla: la última línea de la sección de proveedor (is_published)
   + el cierre del bloque condicional.                                      */
patch(
  'src/pages/Settings.tsx',
  `          is_published: profile.is_published,\n        }\n      : undefined,`,
  `          is_published: profile.is_published,\n` +
  `          // Directorio\n` +
  `          profession: profile.profession ?? '',\n` +
  `          specialties: profile.specialties ?? [],\n` +
  `          intervention_areas: profile.intervention_areas ?? [],\n` +
  `          neuro_conditions: profile.neuro_conditions ?? [],\n` +
  `          sections: profile.sections ?? [],\n` +
  `          modalities: profile.modalities ?? [],\n` +
  `          neuroaffirming: profile.neuroaffirming ?? false,\n` +
  `          whatsapp: profile.whatsapp ?? '',\n` +
  `          booking_url: profile.booking_url ?? '',\n` +
  `          instagram: profile.instagram ?? '',\n` +
  `          facebook: profile.facebook ?? '',\n` +
  `        }\n      : undefined,`,
  'Valores iniciales directorio',
);

/* ── 5. Settings.tsx — onSubmit patch ──────────────────────────────────────
   Ancla: school_grades + cierre del if (isProvider) + llamada updateProfile */
patch(
  'src/pages/Settings.tsx',
  `      patch.school_grades = values.provider_type === 'school' ? (values.school_grades ?? []) : [];\n    }\n    const res = await updateProfile(patch);`,
  `      patch.school_grades = values.provider_type === 'school' ? (values.school_grades ?? []) : [];\n` +
  `      // Directorio y especializacion.\n` +
  `      patch.profession = orNull(values.profession);\n` +
  `      patch.specialties = values.specialties ?? [];\n` +
  `      patch.intervention_areas = values.intervention_areas ?? [];\n` +
  `      const nc = values.neuro_conditions ?? [];\n` +
  `      patch.neuro_conditions = nc;\n` +
  `      patch.sections = nc;\n` +
  `      patch.modalities = values.modalities ?? [];\n` +
  `      patch.neuroaffirming = values.neuroaffirming ?? false;\n` +
  `      patch.whatsapp = orNull(values.whatsapp);\n` +
  `      patch.booking_url = orNull(values.booking_url);\n` +
  `      patch.instagram = orNull(values.instagram);\n` +
  `      patch.facebook = orNull(values.facebook);\n` +
  `    }\n    const res = await updateProfile(patch);`,
  'Patch onSubmit directorio',
);

/* ── 6. Settings.tsx — nuevo fieldset ──────────────────────────────────────
   Ancla: cierre del fieldset "Datos del negocio" (el checkbox is_published
   es la última línea) justo antes del botón submit.                        */
const FIELDSET = `
        {/* -- Directorio y especializacion (solo proveedores) -- */}
        {isProvider && (
          <fieldset className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
            <legend className="px-1 font-semibold text-slate-900">{t('settings.directory')}</legend>

            {/* Profesion */}
            <div>
              <label htmlFor="s-prof" className={labelCls}>{t('settings.profession')}</label>
              <input id="s-prof" className={inputCls} placeholder={t('settings.professionPlaceholder')} {...register('profession')} />
            </div>

            {/* Especialidades */}
            <div>
              <label htmlFor="s-spec" className={labelCls}>{t('settings.specialties')}</label>
              <input
                id="s-spec"
                className={inputCls}
                placeholder={t('settings.specialtiesPlaceholder')}
                value={(watch('specialties') ?? []).join(', ')}
                onChange={(e) =>
                  setValue('specialties', e.target.value.split(',').map((s) => s.trim()).filter(Boolean), { shouldDirty: true })
                }
              />
              <p className="mt-1 text-xs text-muted">{t('settings.specialtiesHint')}</p>
            </div>

            {/* Areas de intervencion */}
            <div>
              <label htmlFor="s-areas" className={labelCls}>{t('settings.interventionAreas')}</label>
              <input
                id="s-areas"
                className={inputCls}
                placeholder={t('settings.areasPlaceholder')}
                value={(watch('intervention_areas') ?? []).join(', ')}
                onChange={(e) =>
                  setValue('intervention_areas', e.target.value.split(',').map((s) => s.trim()).filter(Boolean), { shouldDirty: true })
                }
              />
              <p className="mt-1 text-xs text-muted">{t('settings.specialtiesHint')}</p>
            </div>

            {/* Categorias Neuromundi */}
            <div>
              <p className={labelCls}>{t('settings.neuroCategories')}</p>
              <div className="mt-2 space-y-2">
                {[
                  { value: 'neurodesarrollo', label: t('dir.neurodesarrollo') },
                  { value: 'neurodivergencias', label: t('dir.neurodivergencias') },
                  { value: 'afecciones', label: t('dir.afecciones') },
                ].map(({ value, label }) => {
                  const current = watch('neuro_conditions') ?? [];
                  return (
                    <label key={value} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-brand-500"
                        checked={current.includes(value)}
                        onChange={() => {
                          const next = current.includes(value)
                            ? current.filter((v) => v !== value)
                            : [...current, value];
                          setValue('neuro_conditions', next, { shouldDirty: true });
                          setValue('sections', next, { shouldDirty: true });
                        }}
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modalidades de atencion */}
            <div>
              <p className={labelCls}>{t('settings.modalities')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: 'presencial', label: t('settings.modalPresencial') },
                  { value: 'en_linea', label: t('settings.modalOnline') },
                  { value: 'hibrido', label: t('settings.modalHibrido') },
                  { value: 'domicilio', label: t('settings.modalDomicilio') },
                ].map(({ value, label }) => {
                  const current = watch('modalities') ?? [];
                  return (
                    <label key={value} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-brand-500"
                        checked={current.includes(value)}
                        onChange={() => {
                          const next = current.includes(value)
                            ? current.filter((v) => v !== value)
                            : [...current, value];
                          setValue('modalities', next, { shouldDirty: true });
                        }}
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Neuroafirmativo */}
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-500" {...register('neuroaffirming')} />
              <span className="text-sm text-slate-700">{t('settings.neuroaffirming')}</span>
            </label>

            {/* Contacto y citas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="s-wa" className={labelCls}>
                  <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp</span>
                </label>
                <input id="s-wa" className={inputCls} placeholder="+52 55 1234 5678" {...register('whatsapp')} />
              </div>
              <div>
                <label htmlFor="s-book" className={labelCls}>
                  <span className="flex items-center gap-1.5"><CalendarCheck className="h-4 w-4 text-brand-600" /> {t('settings.bookingUrl')}</span>
                </label>
                <input id="s-book" className={inputCls} placeholder="https://cal.com/..." {...register('booking_url')} />
                {errors.booking_url && <p role="alert" className="mt-1 text-sm text-evs-1">{t(errors.booking_url.message)}</p>}
              </div>
            </div>

            {/* Redes sociales */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="s-ig" className={labelCls}>
                  <span className="flex items-center gap-1.5"><Instagram className="h-4 w-4 text-pink-500" /> Instagram</span>
                </label>
                <input id="s-ig" className={inputCls} placeholder="@usuario" {...register('instagram')} />
              </div>
              <div>
                <label htmlFor="s-fb" className={labelCls}>
                  <span className="flex items-center gap-1.5"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</span>
                </label>
                <input id="s-fb" className={inputCls} placeholder="@pagina" {...register('facebook')} />
              </div>
            </div>
          </fieldset>
        )}
`;

patch(
  'src/pages/Settings.tsx',
  `              <span className="text-sm text-slate-700">{t('settings.publish')}</span>\n            </label>\n          </fieldset>\n        )}\n\n        <Button type="submit"`,
  `              <span className="text-sm text-slate-700">{t('settings.publish')}</span>\n            </label>\n          </fieldset>\n        )}\n` +
  FIELDSET +
  `\n        <Button type="submit"`,
  'Fieldset Directorio y especialización',
);

/* ── 7. es.json — claves settings ──────────────────────────────────────────
   Ancla: "pwLocked" (sin coma) + cierre de la seccion settings.            */
patch(
  'src/i18n/locales/es.json',
  `"pwLocked": "Por seguridad, espera {{s}} s antes de volver a intentar."\n  },`,
  `"pwLocked": "Por seguridad, espera {{s}} s antes de volver a intentar.",\n` +
  `    "directory": "Directorio y especializacion",\n` +
  `    "profession": "Profesion",\n` +
  `    "professionPlaceholder": "Ej. Neuropsicólogo, Terapeuta Ocupacional, Psicopedagogo...",\n` +
  `    "specialties": "Especialidades",\n` +
  `    "specialtiesPlaceholder": "Ej. TEA, TDAH, Síndrome de Down, Terapia ABA...",\n` +
  `    "specialtiesHint": "Separa cada elemento con una coma.",\n` +
  `    "interventionAreas": "Áreas de intervención",\n` +
  `    "areasPlaceholder": "Ej. Lenguaje, Motricidad, Conducta, Atención...",\n` +
  `    "neuroCategories": "Categorías en Neuromundi",\n` +
  `    "modalities": "Modalidades de atención",\n` +
  `    "modalPresencial": "Presencial",\n` +
  `    "modalOnline": "En línea",\n` +
  `    "modalHibrido": "Híbrido",\n` +
  `    "modalDomicilio": "A domicilio",\n` +
  `    "neuroaffirming": "Enfoque neuroafirmativo",\n` +
  `    "bookingUrl": "Enlace para agendar cita"\n` +
  `  },`,
  'Claves settings en es.json',
);

/* ── 8. es.json — sección dir ──────────────────────────────────────────────
   Ancla: primera aparición del top-level "sections" (con neurodesarrollo).  */
patch(
  'src/i18n/locales/es.json',
  `"sections": {\n    "neurodesarrollo": {`,
  `"dir": {\n    "neurodesarrollo": "Neurodesarrollo",\n    "neurodivergencias": "Neurodivergencias",\n    "afecciones": "Afecciones neurológicas"\n  },\n  "sections": {\n    "neurodesarrollo": {`,
  'Sección dir en es.json',
);

/* ── 9. en.json — claves settings ──────────────────────────────────────────*/
patch(
  'src/i18n/locales/en.json',
  `"pwLocked": "For security, wait {{s}} s before trying again."\n  },`,
  `"pwLocked": "For security, wait {{s}} s before trying again.",\n` +
  `    "directory": "Directory & Specialization",\n` +
  `    "profession": "Profession",\n` +
  `    "professionPlaceholder": "E.g. Neuropsychologist, Occupational Therapist, Speech Therapist...",\n` +
  `    "specialties": "Specialties",\n` +
  `    "specialtiesPlaceholder": "E.g. ASD, ADHD, Down Syndrome, ABA Therapy...",\n` +
  `    "specialtiesHint": "Separate each item with a comma.",\n` +
  `    "interventionAreas": "Intervention Areas",\n` +
  `    "areasPlaceholder": "E.g. Language, Motor Skills, Behavior, Attention...",\n` +
  `    "neuroCategories": "Neuromundi Categories",\n` +
  `    "modalities": "Care Modalities",\n` +
  `    "modalPresencial": "In-person",\n` +
  `    "modalOnline": "Online",\n` +
  `    "modalHibrido": "Hybrid",\n` +
  `    "modalDomicilio": "Home visits",\n` +
  `    "neuroaffirming": "Neuroaffirming approach",\n` +
  `    "bookingUrl": "Booking link"\n` +
  `  },`,
  'Claves settings en en.json',
);

/* ── 10. en.json — sección dir ─────────────────────────────────────────────*/
patch(
  'src/i18n/locales/en.json',
  `"sections": {\n    "neurodesarrollo": {`,
  `"dir": {\n    "neurodesarrollo": "Neurodevelopment",\n    "neurodivergencias": "Neurodivergences",\n    "afecciones": "Neurological Conditions"\n  },\n  "sections": {\n    "neurodesarrollo": {`,
  'Sección dir en en.json',
);

console.log('\nListo. Ahora ejecuta en PowerShell:');
console.log('  git add src/lib/schemas.ts src/pages/Settings.tsx src/i18n/locales/es.json src/i18n/locales/en.json');
console.log('  git commit -m "feat: seccion Directorio en ajustes del proveedor"');
console.log('  git push origin main');
