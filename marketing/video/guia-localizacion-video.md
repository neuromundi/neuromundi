# Guía de localización del video a 12 versiones (11 idiomas)

**Producción:** voz sintética por idioma sobre un **único montaje visual**.
**Duración única para las 12 versiones:** 3:02 · 10 escenas · 36 cues.
**El tono de voz va aparte:** `brief-voz-toonbee.md`.

---

## 1. La decisión que ahorra diez montajes

Calculé las ventanas de cada escena para que quepa **el idioma más largo hablando a ritmo natural**. Resultado: un solo montaje visual, idéntico corte por corte, sirve para las doce versiones. Lo único que cambia es la pista de voz, la capa de rótulos y el archivo de subtítulos.

Eso es lo que hace que el proyecto sea de un día y no de tres semanas. Y depende de una condición: **que el montaje no lleve ningún texto quemado en la imagen.**

### Estructura de entrega

| Capa | Contenido | Versiones |
|---|---|---|
| **Video limpio** | B-roll + capturas, sin texto | **1** |
| **Música (M&E)** | pista musical, sin voz | **1** |
| **Locución** | solo voz, por escena | **12** |
| **Rótulos** | capa de texto editable | **12** |
| **Subtítulos** | `.srt` externo | **12** |

Si quemas los rótulos en la imagen, cada idioma pasa a ser un proyecto entero: doce oportunidades de que algo se desincronice y doce veces que rehacer cualquier corrección.

### Ventanas de escena — no se mueven

| Escena | Ventana | Duración | Idioma que la define |
|---|---|---|---|
| ESC01 Apertura | 0:00 → 0:24.8 | 24.8 s | español |
| ESC02 Qué es | 0:25.8 → 0:36.9 | 11.1 s | japonés |
| ESC03 Tres áreas | 0:37.9 → 0:57.6 | 19.7 s | chino |
| ESC04 Directorio | 0:58.6 → 1:14.0 | 15.4 s | alemán |
| ESC05 Agenda | 1:15.0 → 1:23.9 | 8.9 s | francés |
| ESC06 Tienda | 1:24.9 → 1:34.3 | 9.4 s | japonés |
| ESC07 Academia | 1:35.3 → 1:54.1 | 18.8 s | francés |
| ESC08 Inclusión | 1:55.1 → 2:15.4 | 20.3 s | alemán |
| ESC09 Alcance | 2:16.4 → 2:42.1 | 25.7 s | francés |
| ESC10 Cierre | 2:43.1 → 3:02.5 | 19.4 s | chino |

La holgura sobrante en cada idioma **se absorbe como silencio**, nunca acelerando la voz.

---

## 2. Las capturas de pantalla también son texto

Las capturas de la sección 0.3 del guion muestran la interfaz **en español**. De mejor a peor:

1. **Recapturar la interfaz en cada idioma.** La plataforma ya está en los 11: cambias el selector y vuelves a grabar. Es barato y es lo correcto.
2. Capturar en español, inglés y árabe, y reutilizar el resto.
3. Dejar todo en español. No lo hagas: un video en coreano con la interfaz en español dice que el producto no está realmente traducido.

**Mínimo aceptable: recapturar en árabe o hebreo.** La ESC 09 afirma que hay lectura de derecha a izquierda. Enseñarlo vale más que decirlo, y es el único momento del video en que la prueba y el argumento coinciden en pantalla.

---

## 3. Rótulos

Los 14 textos están en `rotulos-11-idiomas.md`.

- Los tres nombres de sección salen **literalmente** de `src/i18n/locales/*.json` → `sections.<x>.name`. No los reescribas: el espectador verá esa misma palabra al entrar al sitio.
- **Máximo 7 palabras por rótulo**, ya cumplido en los 11.
- Dos casos vigilados por desborde: **francés ESC08** (37 caracteres frente a 27 del español) y **portugués ESC03** (20 frente a 15). Reserva ancho pensando en el francés.
- **Árabe y hebreo:** se alinea el texto a la derecha y se invierte el orden de los elementos de una fila. **El video no se espeja** — las capturas de pantalla ya vienen en RTL de la propia interfaz.

---

## 4. Subtítulos

Doce archivos en `srt/neuromundi_<idioma>.srt`, ya sobre la línea de tiempo definitiva.

- **Fuentes.** Noto Sans cubre los once (Noto Sans CJK para ja/zh/ko, Noto Sans Arabic, Noto Sans Hebrew). Si quemas subtítulos, incrusta la fuente correcta o el chino sale en cuadros vacíos.
- **Árabe y hebreo** llevan marcas de dirección embebidas (U+202B / U+202C) para reproductores que no detectan RTL solos. Si tu editor las muestra como caracteres raros, es normal: no se ven al reproducir.
- **Nunca uses cursiva en ja/zh/ko.** No es una convención tipográfica de esas lenguas.
- Si subes a YouTube, una versión de video por idioma con su `.srt`. Como la línea de tiempo es la misma, no hay que reajustar nada.

---

## 5. Una inconsistencia de terminología que conviene que sepas

La plataforma usa **dos términos distintos para "neurodivergencia" en japonés**:

- En `sections.neurodivergencias.name` (lo que se ve en el buscador): **神経多様性**
- En los textos de `/conocer-mas`: **ニューロダイバージェンス**

Los dos son correctos, pero conviven en el mismo producto. Aquí lo resolví así: **los rótulos usan el término de `sections`** (el espectador verá esa misma palabra al entrar) y **la locución usa el de los textos largos** (el registro narrativo).

No rompe nada, pero si quieres unificar, el lugar para decidirlo es el i18n, no el video.

---

## 6. Portugués: dos variantes

El portugués se produce en **dos versiones**: europea (`pt-PT`) y brasileña (`pt-BR`). Las dos caben en las mismas ventanas de escena, así que no afectan al montaje.

Cómo se sirve la correcta a cada usuario, y una decisión pendiente sobre el locale `pt` de la plataforma: **`solucion-portugues.md`**.

---

## 7. Orden de trabajo

1. Recapturar pantallas por idioma (empieza por es, en, ar).
2. Montar el **máster limpio**: video sin texto + música, con las ventanas de escena de la sección 1.
3. Generar la **ESC 01 en un solo idioma** con ToonBee y escucharla. Si no convence, el problema está en la configuración y lo arreglas antes de generar 120 bloques.
4. Generar las 12 versiones, **escena por escena** (`ESC01_es.wav` … `ESC10_ko.wav`).
5. Montar cada versión: voz + rótulos del idioma + capturas del idioma.
6. Mezclar a −16 LUFS, música a −18 dB bajo la voz.
7. QC del brief (sección 8), con escucha nativa en árabe y hebreo.
8. Exportar, subir con su `.srt`.

---

## 8. Archivos de este paquete

| Archivo | Qué es |
|---|---|
| `guion-video-presentacion.md` | Guion maestro: escenas, visual, audio, anexos |
| `guion-11-idiomas.md` | La locución, cue por cue, en los 11 idiomas, con las ventanas |
| `rotulos-11-idiomas.md` | Los 14 rótulos en pantalla, en los 11 idiomas |
| `brief-voz-toonbee.md` | Tono, velocidad y ajustes de voz por idioma y por escena |
| `srt/neuromundi_<idioma>.srt` | Subtítulos, 12 archivos |
| `solucion-portugues.md` | Cómo servir pt-PT o pt-BR a cada usuario |
| `guia-localizacion-video.md` | Este documento |
