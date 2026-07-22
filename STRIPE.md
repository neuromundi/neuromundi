# Configuración de Stripe — Neuromundi

Guía paso a paso para dejar la cuenta lista para cobrar membresías, productos y
consultas, y para que las recompensas del programa de recomendación se apliquen
solas.

**Regla de oro:** haz TODO primero en **modo Test**. Cuando el flujo completo
funcione de punta a punta, repite exactamente los mismos pasos en **modo Live**.
Las claves de un modo NO funcionan en el otro, y mezclarlas es el error más común.

---

## 0. Antes de empezar

Ten a la mano:

- Acceso a `dashboard.stripe.com` con la cuenta dueña del negocio.
- Acceso al panel de Supabase del proyecto `sboagswcehuxwfjdbhdn`.
- Los datos fiscales y bancarios de Neuromundi (para activar la cuenta).

---

## 1. Activar la cuenta

En Stripe Dashboard → **Configuración → Detalles del negocio**, completa el
registro: razón social, dirección, giro, representante legal y cuenta bancaria
de depósito.

Sin esto Stripe permite cobrar en modo Test pero **no libera pagos reales**.

---

## 2. Claves de API

En **Desarrolladores → Claves de API** copia la **clave secreta**.

- En Test empieza con `sk_test_…`
- En Live empieza con `sk_live_…`

⚠️ Debe empezar con **`sk_`**, no con `pk_`. La clave publicable (`pk_`) es para
el navegador y provoca el error *"This API call cannot be made with a publishable
API key"* — exactamente el fallo que tuvimos al inicio.

Guárdala como secreto en Supabase:

```
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

O desde el panel: **Project Settings → Edge Functions → Secrets**.

---

## 3. Stripe Connect (para que cobren los prestadores)

Las membresías las cobra Neuromundi. Los **productos y las consultas** los cobra
cada prestador en su propia cuenta, con comisión para la plataforma. Eso requiere
Connect.

1. Dashboard → **Connect → Empezar**.
2. Elige el tipo **Express** (el prestador se registra en un formulario de Stripe,
   sin que tú administres su información fiscal).
3. En **Connect → Configuración**, define el nombre público de la plataforma
   ("Neuromundi"), el logo y el color de marca: es lo que verá el prestador
   durante su alta.
4. Activa **Cobros y transferencias** para cuentas Express.

La app ya usa esto: la Edge Function `connect-onboarding` genera el enlace de alta
y `create-product-checkout` reparte el dinero con `application_fee_amount`.

---

## 4. Webhook (la pieza crítica)

Todo lo automático depende de esto: activar membresías, reactivar perfiles
pausados, marcar citas como pagadas y otorgar las recompensas de recomendación.

1. Dashboard → **Desarrolladores → Webhooks → Agregar endpoint**.
2. URL del endpoint:

   ```
   https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/stripe-webhook
   ```

3. Selecciona estos eventos (exactamente estos):

   | Evento | Para qué sirve en Neuromundi |
   |---|---|
   | `checkout.session.completed` | Activa la membresía tras el primer pago; marca citas pagadas; otorga la recompensa al referente |
   | `invoice.paid` | Renovaciones anuales; consume el crédito de recomendación usado |
   | `invoice.payment_failed` | Marca la cuenta como `past_due` (pausa el perfil) |
   | `customer.subscription.deleted` | Cancelaciones |
   | `account.updated` | Habilita cobros al prestador cuando Stripe aprueba su cuenta Connect |

4. Guarda y copia el **Signing secret** (empieza con `whsec_…`).
5. Guárdalo en Supabase:

   ```
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

⚠️ El `whsec_` es **por endpoint y por modo**. Si creas el webhook de Live, su
secreto es distinto al de Test. Usar el que no toca produce error de firma y
**ningún pago se registra** aunque el cobro sí ocurra en Stripe.

---

## 5. Precios: NO se configuran en Stripe

Esto sorprende a mucha gente, así que conviene decirlo claro: **no crees
productos ni precios en el catálogo de Stripe.**

Neuromundi calcula el importe en el momento y se lo pasa a Stripe con
`price_data`. Los precios se administran en tu propio panel:

**Panel → Cuotas**, donde defines el importe por **tipo de usuario y país en su
propia moneda**.

Si algún día ves un precio raro en un cobro, el origen está ahí, no en Stripe.

---

## 6. Cupones: tampoco se crean a mano

Los descuentos del programa de recomendación (el 5% al referido y el acumulado
del referente) se crean **por código, al vuelo**, con `duration: 'once'` para que
apliquen solo al pago siguiente.

En el Dashboard los verás aparecer bajo **Productos → Cupones** con nombres como
"Recomendación Neuromundi (-5%)". Son normales; no los borres mientras haya
suscripciones que los estén usando.

---

## 7. Portal de facturación (recomendado)

Para que el prestador pueda cambiar su tarjeta o cancelar sin escribirte:

Dashboard → **Configuración → Facturación → Portal de clientes** → activar, y
habilitar "Actualizar método de pago" y "Cancelar suscripción".

---

## 8. Prueba de punta a punta (en modo Test)

Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.

1. **Membresía:** registra un prestador de prueba → paga → su perfil debe pasar a
   activo y el modal de "cuenta en pausa" desaparecer solo.
2. **Recomendación:** con una segunda cuenta, entra por un enlace `?ref=NM-000123`
   y paga. Verifica en **Panel → Referidos** que aparezca el uso y la recompensa,
   y que en Stripe el cobro traiga el descuento del 5%.
3. **Recompensa sobre suscripción viva:** revisa que la suscripción del referente
   quede con un cupón aplicado para su siguiente factura.
4. **Producto:** compra un producto de un prestador con Connect activo y confirma
   que la comisión llegó a la cuenta de la plataforma.
5. **Fallo de pago:** en Stripe, cancela o haz fallar la renovación y confirma que
   el perfil se pausa.

---

## 9. Pasar a Live

Repite en modo Live: claves (`sk_live_`), webhook nuevo (con su propio `whsec_`),
y Connect activado. Actualiza los secretos en Supabase y **vuelve a hacer una
compra real pequeña** para confirmar antes de anunciar.

---

## Diagnóstico rápido

| Síntoma | Causa más probable |
|---|---|
| "No se pudo iniciar el pago" | `STRIPE_SECRET_KEY` es `pk_` en vez de `sk_`, o falta |
| El cobro ocurre pero la cuenta sigue pausada | `STRIPE_WEBHOOK_SECRET` de otro modo/endpoint |
| El prestador no puede cobrar productos | Su cuenta Connect no terminó el onboarding (`stripe_charges_enabled` en falso) |
| El descuento no se aplicó | El enlace de recomendación caducó (7 días) o el referido no paga cuota |
| Nada se registra en la base | Revisa los logs de la Edge Function `stripe-webhook` en Supabase |
