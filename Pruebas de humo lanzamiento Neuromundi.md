# Pruebas de humo — Lanzamiento Neuromundi

Hazla **después de purgar la caché del CDN** (hPanel) y con **recarga forzada** (Ctrl+Shift+R).
Tiempo estimado: 5–7 min.

## 1. Despliegue (30 s)
- [ ] www.neuromundi.com carga sin pantalla blanca ni errores en consola (F12).
- [ ] GitHub → Actions: último workflow en verde.

## 2. Fases por país (1 min) — lo nuevo más importante
- [ ] Selector de país = **Francia** (u otro fuera de es/pt) → aparece la cortina **"Próximamente 2027"** con captura de correo.
- [ ] Escribe un correo y envía → "¡Listo! Te avisaremos."
- [ ] Cambia a **México / España / Brasil** → la cortina desaparece (país activo).

## 3. Verificación de aliados (1 min)
- [ ] Pie de página → **"Aliados verificados"** → carga `/verificados` con los 2 aliados activos.
- [ ] `www.neuromundi.com/verificar/aliado/cc4b0339-76c4-4aaf-b8b7-22e12b331871` → "Observatorio… verificado / vigente".
- [ ] En el buscador de `/verificados`, un folio real (NM-000…) → lleva a su verificación.

## 4. Tarifas por país (1 min)
- [ ] Prestador de prueba en Brasil o EE.UU. → en el modal de membresía los precios salen en **BRL / USD** correctos.
- [ ] Prestador de prueba en país "próximamente" → el modal **oculta tarifas** ("disponible a inicios de 2027").

## 5. Neurocamps (45 s)
- [ ] `/tribu` (o `/neurocamps`) → el **selector de sección** muestra las 3 (Neurodesarrollo, Neurodivergencias, Afecciones).
- [ ] Cada sección tiene su **foro de bienvenida**.

## 6. Popup de bienvenida (30 s)
- [ ] En incógnito, entra a la portada → aparece el **popup de campaña**.
- [ ] Si no has subido el video, muestra **solo "Conocer beneficios"** (sin recuadro de video roto).

## 7. Registro de familia de principio a fin (1–2 min) — el flujo crítico
- [ ] Regístrate como familia/paciente → entra **gratis**, sin pedir pago, y llega al panel.

## 8. Idiomas (20 s)
- [ ] Cambia a **português** (portada coherente).
- [ ] Cambia a **árabe** → el layout se ve **RTL** (de derecha a izquierda).

---
**Nota:** el contador de fundadores de la portada solo aparece con **≥20 fundadores**; al inicio es normal que no se vea.
