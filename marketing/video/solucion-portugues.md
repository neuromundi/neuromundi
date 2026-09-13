# Portugués europeo y brasileño: cómo servir el correcto a cada usuario

**Situación:** el guion existe ahora en dos variantes, `pt-PT` y `pt-BR`. La plataforma tiene un solo locale `pt`.
**Pregunta:** cómo hacer que a cada usuario le llegue el video en su portugués.

---

## 1. Lo primero: NO partas el locale

La tentación es crear un idioma `pt-BR` en el i18n. **No lo hagas por un video.** Según tu propio `CLAUDE.md`, añadir un idioma no son 3.917 claves JSON. Son:

- `src/i18n/locales/pt-BR.json` — 3.917 claves
- `src/data/toolkitContent/content.pt-BR.ts` + `nd.pt-BR.ts` + `af.pt-BR.ts`
- `src/data/legalPtBr.ts` (contenido legal + Manifiesto, fuera del i18n)
- **~29 PDFs**: 9 del kit base + 10 de los kits `nd` y `af` (5 × 2)
- El selector de idioma pasa de 11 a 12 entradas, y la paridad de claves hay que mantenerla en 12 archivos para siempre

Eso es semanas de trabajo y una deuda de mantenimiento permanente, para resolver una diferencia que en la interfaz apenas se nota (botones, etiquetas y menús son casi idénticos en las dos variantes). Donde sí se nota es **en el texto largo hablado**, que es exactamente el video.

**Regla:** la variante se resuelve **solo para el video**. El locale `pt` sigue siendo uno.

---

## 2. La solución en tres líneas de código

`resolveInitialLanguage()` hace `navLang.split('-')[0]`, es decir **tira la región**. Por eso `pt-BR` y `pt-PT` acaban los dos en `pt`. La región sí está en `navigator.language`: solo hay que leerla antes de descartarla.

```ts
// src/i18n/ptVariant.ts
/**
 * Variante de portugués para los ASSETS (video, subtítulos). El locale de la
 * interfaz sigue siendo un único `pt`: esto NO añade un idioma nuevo.
 * Prioridad: elección manual → región del navegador → país del selector → pt-BR.
 */
export type PtVariant = 'pt-BR' | 'pt-PT';

const KEY = 'neuro.pt';
const PT_PT_COUNTRIES = new Set([
  'Portugal', 'Angola', 'Mozambique', 'Cabo Verde',
  'Guinea-Bisáu', 'Santo Tomé y Príncipe', 'Timor Oriental',
]);

export function resolvePtVariant(
  navLang = typeof navigator !== 'undefined' ? navigator.language : '',
  country?: string | null,
  stored: string | null = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null,
): PtVariant {
  if (stored === 'pt-BR' || stored === 'pt-PT') return stored;
  const tag = (navLang || '').toLowerCase();
  if (tag.startsWith('pt-br')) return 'pt-BR';
  if (/^pt-(pt|ao|mz|cv|gw|st|tl)/.test(tag)) return 'pt-PT';
  if (country && PT_PT_COUNTRIES.has(country)) return 'pt-PT';
  return 'pt-BR';
}

export function setPtVariant(v: PtVariant): void {
  try { localStorage.setItem(KEY, v); } catch { /* modo privado */ }
}
```

Y donde montes el video:

```tsx
const variant = i18n.language === 'pt' ? resolvePtVariant(navigator.language, country) : null;
const lang = variant ?? i18n.language;           // 'pt-BR' | 'pt-PT' | 'es' | 'en' | …
<video src={`/video/neuromundi_${lang}.mp4`} poster={`/video/poster_${lang}.webp`}>
  <track kind="subtitles" srcLang={lang} src={`/video/srt/neuromundi_${lang}.vtt`} default />
</video>
```

### Por qué `pt-BR` es el predeterminado

Cuando el navegador dice solo `pt`, sin región, hay que elegir. Brasil tiene unos 210 millones de hablantes frente a unos 10 de Portugal más los PALOP. La probabilidad manda: **`pt-BR` por defecto**.

Pero esto choca con algo que ya tienes, y conviene que lo sepas.

---

## 3. El problema que esto destapa: tu locale `pt` está en portugués europeo

El texto actual de la plataforma dice *"registo"*, *"encontrámos"*, *"fá-lo"*, *"num só lugar"*. Es portugués europeo.

Si el video sale en brasileño por defecto y la interfaz está en europeo, el usuario brasileño ve **dos portugueses distintos en la misma pantalla**. Es peor que tener solo uno.

Tres salidas, de menos a más trabajo:

| | Qué haces | Coste | Resultado |
|---|---|---|---|
| **A. Neutralizar** | Reescribir el locale `pt` en un portugués **neutro** que no chirríe en ninguno de los dos lados: evitar *registo/registro* (usar *inscrição*), evitar enclisis marcada, evitar *doente* (usar *paciente*) | ~1 día sobre los textos visibles | Ninguna variante se siente extraña. La interfaz pierde algo de sabor local, el video lo recupera. **Recomendada.** |
| **B. Asumir Brasil** | Pasar el locale `pt` entero a portugués brasileño y dejar `pt-PT` solo en el video | ~2 días | Coherente para el 95 % de los hablantes; los portugueses notan la interfaz "brasileña" |
| **C. Partir el locale** | El camino de la sección 1 | Semanas + deuda permanente | Perfecto y desproporcionado |

Mi recomendación es **A**, y cambiar el video de variante sale gratis porque ya está hecho.

---

## 4. Un detalle de terminología que tuve que resolver

En portugués europeo escribí **"afeções neurológicas"** (grafía posterior al Acuerdo Ortográfico de 1990) y en brasileño **"condições neurológicas"**.

Dos avisos:

1. **Tu locale actual dice "afecções"**, que es la grafía anterior al Acuerdo. En Brasil se escribe *afecções* con la ce; en Portugal, tras el Acuerdo, *afeções*. La palabra está mal en uno de los dos lados, decidas lo que decidas.
2. En Brasil, **"condições neurológicas"** es lo natural en lenguaje divulgativo; *afecções* suena a informe médico. Por eso en `pt-BR` usé *condições*.

Si adoptas la opción A (neutralizar), **"condições neurológicas" funciona en los dos lados** y resuelve el problema ortográfico de paso. Es el cambio más rentable de toda esta sección.

---

## 5. YouTube: una sola subida, doce pistas de audio

Para el sitio, lo de arriba. Para YouTube hay algo mejor: **pistas de audio multi-idioma**. Subes un único video y le añades una pista de audio por idioma; YouTube le sirve a cada espectador la que corresponde a su configuración, y el resto puede cambiarla a mano.

Ventajas frente a subir doce videos:

- **Todas las visualizaciones suman al mismo video.** Doce subidas separadas reparten las métricas en doce y ninguna despega.
- Un solo enlace para compartir, en WhatsApp y en todas partes.
- Un solo conjunto de comentarios y una sola miniatura que mantener (aunque también admite miniatura por idioma).

Es exactamente el caso de uso de esta pieza: mismo video, doce audios. Comprueba en tu canal que la opción esté disponible antes de planificar sobre ella, porque el despliegue ha sido gradual.

Para **WhatsApp**, que es tu canal principal, no hay detección: ahí compartes el enlace de YouTube, o el archivo directo del idioma del grupo al que lo mandas.

---

## 6. Y pase lo que pase: un selector visible

La detección automática falla más de lo que parece. Un brasileño con Windows en inglés manda `en-US`. Un portugués emigrado a Brasil tiene el navegador en `pt-BR`. Alguien en un ordenador compartido, cualquier cosa.

**Pon un selector de idioma junto al reproductor**, con las doce opciones y las dos variantes de portugués separadas: *Português (Brasil)* y *Português (Portugal)*. La elección se guarda en `neuro.pt` y ya la contempla la función de arriba.

Es la misma lógica que ya usas con el selector de idioma del sitio: detectas, pero dejas corregir.

---

## 7. Qué hacer, en orden

1. **Decide la opción del punto 3.** Es la que condiciona todo lo demás. Si eliges A, dime y neutralizo el locale `pt` en la misma pasada.
2. Crea `src/i18n/ptVariant.ts` con el código de la sección 2 — no toca el i18n existente.
3. Produce los **doce** videos (los guiones y subtítulos ya están).
4. Publica en YouTube como un video con doce pistas de audio.
5. En el sitio, sirve el archivo por `resolvePtVariant`.
6. Añade el selector junto al reproductor.

---

## Nota sobre los archivos

Los subtítulos de las dos variantes son `srt/neuromundi_pt_BR.srt` y `srt/neuromundi_pt_PT.srt`. Para el `<track>` del reproductor hay que convertirlos a **WebVTT** (`.vtt`), que es lo único que acepta HTML5. La conversión es trivial: añadir `WEBVTT` como primera línea y cambiar las comas de los milisegundos por puntos.
