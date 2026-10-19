// ============================================================================
// Supabase Edge Function: stripe-webhook
// Recibe eventos de Stripe y actualiza el estado de membresía del usuario.
//
// Secrets:
//   STRIPE_SECRET_KEY      (obligatoria)
//   STRIPE_WEBHOOK_SECRET  (obligatoria, del endpoint del webhook en Stripe)
//
// Despliegue (sin verificación de JWT, Stripe firma con su secreto):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// En Stripe → Developers → Webhooks, apunta a:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// Eventos: checkout.session.completed, invoice.paid, invoice.payment_failed,
//          account.updated, charge.refunded, customer.subscription.deleted
//   (los 5 primeros son OBLIGATORIOS; charge.refunded revierte la comisión del
//    promotor, sin él un reembolso no se entera).
// ============================================================================
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

// Monedas que Stripe maneja SIN decimales: su importe ya viene en la unidad
// entera y no se divide entre 100. La lista corta ('jpy','krw','clp','vnd')
// que circula por el resto del proyecto deja fuera doce, PYG entre ellas, que
// este proyecto ya usa para Paraguay.
const SIN_DECIMALES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

const toIso = (unixSeconds?: number | null) =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

/**
 * Otorga al referente el crédito por un referido que acaba de pagar y, si ese
 * referente ya tiene una suscripción activa, le aplica el descuento acumulado
 * como cupón de un solo uso para que su PRÓXIMA factura salga rebajada.
 * Nunca lanza: un fallo aquí no debe tumbar el webhook del pago.
 */
async function applyReferralReward(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
  referredUserId: string,
) {
  try {
    const { data } = await admin.rpc('grant_referral_credit', { p_referred: referredUserId });
    const row = Array.isArray(data) ? data[0] : data;
    const referrerId = row?.referrer_id as string | undefined;
    const creditPct = Number(row?.credit_pct ?? 0);
    const subId = row?.subscription_id as string | null | undefined;
    if (!referrerId || creditPct <= 0 || !subId) return;

    const coupon = await stripe.coupons.create({
      percent_off: Math.min(creditPct, 100),
      duration: 'once',
      name: `Recompensa por recomendar (-${creditPct}%)`,
      metadata: { user_id: referrerId, kind: 'referral' },
    });
    // Reemplaza cualquier cupón previo: el crédito ya es el acumulado total.
    await stripe.subscriptions.update(subId, { coupon: coupon.id });
  } catch (e) {
    console.error('applyReferralReward', e);
  }
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('Stripe-Signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!sig || !secret) return new Response('Config faltante', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
  } catch (err) {
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const kind = s.metadata?.kind;

        // Donación (pago único). Marca pagada y otorga las recompensas
        // digitales automáticas ya registradas en la fila (grant_course /
        // grant_badge). El muro y las recompensas físicas los gestiona el admin.
        if (kind === 'donation') {
          const donationId = s.metadata?.donation_id;
          if (donationId) {
            await admin
              .from('donations')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', donationId);
            // Agradecimiento en la campana si el donante es miembro.
            const { data: d } = await admin
              .from('donations')
              .select('donor_user_id, grant_badge')
              .eq('id', donationId)
              .single();
            if (d?.donor_user_id) {
              await admin.from('notifications').insert({
                user_id: d.donor_user_id,
                type: 'donation_thanks',
                title: 'Gracias por tu donativo',
                body: 'Tu aporte impulsa la inclusión. Revisa tus recompensas en tu perfil.',
                data: { donation_id: donationId },
              });
            }
          }
          break;
        }

        // Fase 6: compra de producto (mini-tienda).
        if (kind === 'product') {
          const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
          // Marca pagada SOLO si aún no lo estaba: Stripe puede reentregar el
          // mismo evento y el descuento de stock NO es idempotente. El `neq` +
          // `select` nos dice si esta corrida fue la transición real a 'paid'.
          const { data: flipped } = await admin
            .from('orders')
            .update({ status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: s.id })
            .eq('stripe_session_id', s.id)
            .neq('status', 'paid')
            .select('id');
          // Inventario: descuenta una unidad SOLO en la transición a paid (nunca
          // en una reentrega). decrement_stock es atómico y no baja de cero.
          if (s.metadata?.product_id && flipped && flipped.length > 0) {
            await admin.rpc('decrement_stock', { p_product_id: s.metadata.product_id });
          }
          void pi;
          break;
        }

        // Fase 3: pagos de consulta/terapia (registro en public.payments).
        if (kind === 'consultation' || kind === 'therapy') {          const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
          const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
          await admin
            .from('payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent: pi ?? null,
              stripe_subscription_id: subId ?? null,
            })
            .eq('stripe_session_id', s.id);
          if (s.metadata?.appointment_id) {
            await admin.from('appointment_requests')
              .update({ payment_status: 'paid' })
              .eq('id', s.metadata.appointment_id);
          }
          break;
        }

        // Membresía (Fase de afiliación).
        const userId = s.metadata?.user_id;
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
        let paidUntil: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          paidUntil = toIso(sub.current_period_end);
        }
        if (userId) {
          // ESTE UPDATE ES EL PAGO. Si falla, la persona pagó y no tiene nada.
          //
          // Antes no se revisaba su `error`: supabase-js NO lanza excepciones,
          // devuelve { data, error }, así que un fallo aquí pasaba inadvertido,
          // el switch continuaba, la función respondía 200 y Stripe NO
          // reintentaba. El cobro quedaba hecho y el perfil en 'pending', sin
          // publicar y sin rastro. Hay seis disparadores BEFORE sobre profiles
          // que pueden abortar este UPDATE, así que no es una hipótesis remota.
          //
          // Ahora: se revisa el error Y se comprueba que de verdad se tocó la
          // fila (`select('id')`), porque un UPDATE que no encuentra a nadie
          // tampoco devuelve error. Si algo de eso falla se avisa a los admins
          // y se responde 500, para que Stripe reintente durante tres días.
          const { data: activado, error: errAct } = await admin
            .from('profiles')
            .update({
              membership_status: 'active',
              stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer?.id,
              stripe_subscription_id: subId,
              membership_paid_until: paidUntil,
              membership_period: s.metadata?.period === 'monthly' ? 'monthly' : 'annual',
            })
            .eq('id', userId)
            .select('id');
          if (errAct || !activado || activado.length === 0) {
            const detalle = errAct?.message ?? 'el perfil no fue encontrado';
            console.error('[ACTIVACION FALLIDA]', userId, s.id, detalle);
            await admin.rpc('notify_admins', {
              p_type: 'membership_activation_failed',
              p_title: 'Un pago entró y la membresía NO se activó',
              p_body: 'Stripe cobró pero no se pudo activar la membresía. Revisar y resolver a mano.',
              p_data: { user_id: userId, session_id: s.id, error: detalle },
            }).catch(() => { /* el aviso es best-effort; el 500 no */ });
            return new Response(
              JSON.stringify({ error: `No se pudo activar la membresía: ${detalle}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            );
          }
          // Asiento de Miembro Fundador: se otorga AQUÍ, después del pago, no al
          // entrar a la plataforma. Antes lo tomaba useFounderAutoClaim en la
          // primera visita, así que un visitante que nunca pagaba bloqueaba un
          // lugar durante tres meses (grace_until) y el contador de lugares
          // restantes contaba visitantes como fundadores.
          // Best-effort: si falla, el pago sigue siendo válido.
          if (s.metadata?.member_class === 'founder') {
            // El precio se fija al CREAR la sesión y el asiento se verifica al
            // PAGARLA. Si en ese intervalo vence el plazo o se llena el cupo,
            // grant_founder_seat devuelve false — pero el cargo por la tarifa
            // de fundador YA se hizo. Hay que enterarse: se registra y se avisa
            // a los admins para resolverlo a mano.
            //
            // supabase-js devuelve { data, error } en vez de lanzar, así que un
            // try/catch solo no atrapa nada: hay que mirar las dos cosas.
            try {
              const { data: otorgado, error: errSeat } = await admin.rpc(
                'grant_founder_seat', { p_id: userId },
              );
              if (errSeat || otorgado !== true) {
                console.error('grant_founder_seat NO otorgado', {
                  userId, error: errSeat?.message ?? null, otorgado,
                });
                await admin.rpc('notify_admins', {
                  p_type: 'founder_seat_failed',
                  p_title: 'Pagó tarifa de fundador y no recibió el asiento',
                  p_body: 'Se cobró la tarifa de fundador pero no se pudo otorgar el lugar. Revisar cupo y plazo, y resolver a mano.',
                  p_data: { user_id: userId, error: errSeat?.message ?? null },
                }).catch(() => { /* el aviso es best-effort */ });
              }
            } catch (e) {
              console.error('grant_founder_seat', e);
            }
          }
          // PUBLICAR. `profiles.is_published` nace en false y nada lo encendía:
          // alguien pagaba por visibilidad y quedaba invisible, esperando una
          // casilla enterrada en Ajustes que nadie le mencionó.
          //
          // Va aquí, en checkout.session.completed (PRIMER pago), y no en
          // invoice.paid: si alguien se despublica a propósito, la renovación
          // anual no debe volver a exponerlo. Eso sería revertirle una decisión
          // deliberada cada doce meses.
          //
          // `publicar_por_pago` no toca cuentas suspendidas ni las ya publicadas.
          try {
            await admin.rpc('publicar_por_pago', { p_id: userId });
          } catch (e) {
            console.error('publicar_por_pago', e);
          }
          // El referente de este usuario gana su recompensa (si aplica).
          await applyReferralReward(admin, stripe, userId);
          // Crédito de alianza: si se afilió con el código de una alianza
          // (profiles.promo_code_used), se registra el crédito a su favor para
          // el programa de retorno. Best-effort: no debe tumbar el webhook.
          try {
            const { data: prof } = await admin
              .from('profiles').select('promo_code_used').eq('id', userId).maybeSingle();
            const allyCode = (prof as { promo_code_used?: string | null } | null)?.promo_code_used ?? null;
            if (allyCode) {
              await admin.rpc('record_alliance_credit', {
                p_user_id: userId,
                p_code: allyCode,
                p_currency: s.currency ?? null,
                // Las monedas sin decimales (CLP, PYG…) no llevan el /100:
                // antes se dividía siempre y el crédito quedaba cien veces por
                // debajo en esos países.
                p_amount: s.amount_total != null
                  ? (SIN_DECIMALES.has((s.currency ?? '').toLowerCase())
                      ? s.amount_total
                      : s.amount_total / 100)
                  : null,
              });
            }
          } catch (e) {
            console.error('record_alliance_credit', e);
          }
          // Confirmación de pago: notifica al miembro (el trigger trg_notify_push
          // dispara el push nativo) y avisa a los admins. Best-effort: nunca debe
          // tumbar el webhook.
          try {
            const notifPeriod = s.metadata?.period === 'monthly' ? 'mensual' : 'anual';
            const affType = s.metadata?.affiliate_type ?? '';
            await admin.from('notifications').insert({
              user_id: userId,
              type: 'membership_paid',
              title: '¡Tu membresía está activa!',
              body: 'Recibimos tu pago. Tu perfil ya puede recibir consultas e interactuar con la comunidad.',
              data: { period: s.metadata?.period ?? 'annual', affiliate_type: affType },
            });
            // Tipo PROPIO para el aviso al administrador: comparte el del
            // miembro y los dos mensajes son distintos, asi que la pantalla
            // no podia traducir ninguno de los dos (la traduccion va por tipo)
            // y ambos se quedaban en el espanol guardado en la fila.
            await admin.rpc('notify_admins', {
              p_type: notifPeriod === 'mensual' ? 'membership_paid_admin_mensual' : 'membership_paid_admin_anual',
              p_title: 'Nueva membresía pagada',
              p_body: `Un miembro activó su membresía ${notifPeriod}.`,
              p_data: { user_id: userId, affiliate_type: affType, period: s.metadata?.period ?? 'annual' },
            });
          } catch (e) {
            console.error('membership notify', e);
          }
        }
        break;
      }

      // Reembolso de una compra: el pedido pasa a 'refunded' y el trigger
      // `trg_sync_affiliate_commission` (migración 0043) revierte la comisión
      // del promotor si aún no se le había pagado. Si ya se le pagó, la marca
      // como `refund_after_payment` para que el vendedor lo resuelva con él.
      case 'charge.refunded': {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
        const facturaId = typeof ch.invoice === 'string' ? ch.invoice : ch.invoice?.id;
        // Sin PaymentIntent NI factura no hay por donde empezar. Antes se salia
        // solo por falta de PaymentIntent, y eso bastaba para que el reembolso
        // de una membresia no revirtiera nada (ver mas abajo).
        if (!pi && !facturaId) break;

        // PARCIAL NO ES TOTAL. Stripe emite charge.refunded también cuando se
        // devuelve una parte. Antes no se miraba: devolver $50 de una compra de
        // $2 000 marcaba el pedido entero como reembolsado, sacaba el donativo
        // del muro, dejaba la cita como no pagada y anulaba el crédito del
        // aliado. Un reembolso parcial se avisa y se resuelve a mano; no se
        // revierte nada automáticamente.
        const totalCobrado = ch.amount ?? 0;
        const totalDevuelto = ch.amount_refunded ?? 0;
        if (totalCobrado > 0 && totalDevuelto > 0 && totalDevuelto < totalCobrado) {
          console.log('[reembolso parcial]', ch.id, totalDevuelto, 'de', totalCobrado);
          await admin.rpc('notify_admins', {
            p_type: 'partial_refund',
            p_title: 'Reembolso parcial: requiere revisión',
            p_body: 'Se devolvió una parte del cobro. No se revirtió nada de forma automática.',
            p_data: { charge: ch.id, devuelto: totalDevuelto, cobrado: totalCobrado, currency: ch.currency },
          }).catch(() => { /* best-effort */ });
          break;
        }

        // DOS CAMINOS, Y EL DE LA MEMBRESIA ES EL DE LA FACTURA.
        //
        // Lo de antes: se buscaba la sesion de pago filtrando por el
        // PaymentIntent del cargo, y si no aparecia se salia. En una sesion de
        // tipo SUSCRIPCION —que es como se cobra la membresia— Stripe deja
        // session.payment_intent en NULO: el PaymentIntent del cargo pertenece
        // a la FACTURA, no a la sesion. Esa busqueda no devolvia nada nunca, de
        // modo que TODO el bloque de reverso de membresia era inalcanzable: se
        // devolvia el dinero y el perfil conservaba doce meses publicado, el
        // libro seguia declarando el ingreso y la comision seguia cobrable. Y
        // en una renovacion no hay sesion en absoluto.
        // (Auditoria del 15 oct 2026, hallazgo C-3.)
        let refUser: string | undefined;
        let refKind: string | undefined;
        let sessionId: string | undefined;
        let esMembresia = false;

        if (facturaId) {
          try {
            const inv = await stripe.invoices.retrieve(facturaId);
            const invAny2 = inv as unknown as {
              subscription?: string | { id?: string } | null;
              parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null;
            };
            const sacar = (v: string | { id?: string } | null | undefined): string | null =>
              typeof v === 'string' ? v : (v?.id ?? null);
            const subId2 = sacar(invAny2.subscription)
              ?? sacar(invAny2.parent?.subscription_details?.subscription);
            if (subId2) {
              const sub = await stripe.subscriptions.retrieve(subId2);
              refUser = (sub.metadata?.user_id as string | undefined) ?? undefined;
              esMembresia = true;
            }
          } catch (e) {
            console.error('[reembolso] no se pudo resolver la factura', facturaId, e);
          }
        }

        // Pagos simples (producto, donativo, consulta, terapia): esos SI tienen
        // sesion localizable por su PaymentIntent.
        if (!esMembresia && pi) {
          const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
          sessionId = sessions.data[0]?.id;
          refUser = sessions.data[0]?.metadata?.user_id;
          refKind = sessions.data[0]?.metadata?.kind;
        }

        // Ni factura con suscripcion ni sesion: no se sale en silencio, porque
        // es justo el caso en que un reembolso deja el servicio abierto.
        if (!esMembresia && !sessionId) {
          console.error('[reembolso sin origen identificable]', ch.id, pi, facturaId);
          await admin.rpc('notify_admins', {
            p_type: 'refund_sin_origen',
            p_title: 'Reembolso que no se pudo atribuir',
            p_body: 'Entro un reembolso del que no se pudo deducir la compra ni la membresia. Revisar y revertir a mano.',
            p_data: { charge: ch.id, payment_intent: pi ?? null, invoice: facturaId ?? null },
          }).catch(() => { /* best-effort */ });
          break;
        }

        // Si era una membresía con código de alianza, anula su crédito.
        if (refUser) {
          await admin.from('alliance_credits').update({ status: 'void' }).eq('source_user_id', refUser);
        }

        // REEMBOLSO DE MEMBRESÍA. Antes este bloque tocaba pedidos, donativos,
        // pagos y citas, pero NUNCA profiles: se devolvía el dinero y la
        // persona conservaba doce meses de servicio publicado, porque
        // cuota_cubierta() mira membership_status y membership_paid_until, y
        // ninguno de los dos se movía. Además el referidor se quedaba con su
        // comisión sobre dinero devuelto.
        //
        // 'refunded' no existe en el CHECK de membership_status (sólo pending,
        // active, past_due y exempt), así que se vuelve a 'pending' y se limpia
        // la fecha de vigencia, que es lo que de verdad abre el servicio.
        if (refUser && (esMembresia || (refKind !== 'product' && refKind !== 'donation'
            && refKind !== 'consultation' && refKind !== 'therapy'))) {
          const { error: errRev } = await admin
            .from('profiles')
            .update({ membership_status: 'pending', membership_paid_until: null })
            .eq('id', refUser);
          if (errRev) console.error('revertir membresia reembolsada', errRev.message);
          // El asiento de la cuota en el libro propio también se revierte, o el
          // libro seguiría declarando un ingreso que se devolvió.
          //
          // POR FACTURA, NO "EL ULTIMO". revertir_ultimo_pago_de_membresia
          // anulaba el asiento mas reciente del usuario, que no tiene por que
          // ser el reembolsado: reembolsar el primer ano de un socio de tres
          // anulaba el tercero, y el libro quedaba mal en las dos direcciones.
          // (Hallazgo A-10.) Solo se cae a "el ultimo" si no hay factura.
          if (facturaId) {
            await admin.rpc('revertir_pago_de_membresia', { p_stripe_ref: facturaId })
              .then(({ error }) => { if (error) console.error('revertir asiento de cuota', error.message); });
          } else {
            await admin.rpc('revertir_ultimo_pago_de_membresia', { p_user: refUser })
              .then(({ error }) => { if (error) console.error('revertir asiento de cuota', error.message); });
          }
          // La comisión del referidor se revierte: se devengó sobre un ingreso
          // que ya no existe. SOLO LA DE ESTA FACTURA: antes no se filtraba y
          // se revertian TODAS las devengadas de ese afiliado, de todos los
          // anos, de modo que el referidor perdia comision que si gano y que
          // nunca se devolvio. (Hallazgo A-10.)
          {
            let q = admin
              .from('membership_commissions')
              .update({ status: 'revertida', revertida_en: new Date().toISOString() })
              .eq('referred_id', refUser)
              .eq('status', 'devengada');
            if (facturaId) q = q.eq('stripe_ref', facturaId);
            const { error: errCom } = await q;
            if (errCom) console.error('revertir comision', errCom.message);
          }
          await admin.rpc('notify_admins', {
            p_type: 'membership_refunded',
            p_title: 'Membresía reembolsada',
            p_body: 'Se devolvió una membresía: el perfil vuelve a pendiente y la comisión del referidor queda revertida.',
            p_data: { user_id: refUser, charge: ch.id },
          }).catch(() => { /* best-effort */ });
        }
        if (!sessionId) break;   // lo que sigue se localiza por la sesion de pago
        await admin
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_session_id', sessionId);
        // Un donativo reembolsado también se marca, para que no siga contando en
        // la estadística ni en el muro.
        await admin
          .from('donations')
          .update({ status: 'refunded', wall_published: false })
          .eq('stripe_session_id', sessionId);
        // Consulta/terapia: revierte el pago y el estado de la cita para que no
        // quede como pagada tras el reembolso.
        await admin
          .from('payments')
          .update({ status: 'refunded' })
          .eq('stripe_session_id', sessionId);
        const { data: refPay } = await admin
          .from('payments')
          .select('appointment_id')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();
        if (refPay?.appointment_id) {
          await admin
            .from('appointment_requests')
            .update({ payment_status: 'refunded' })
            .eq('id', refPay.appointment_id);
        }
        break;
      }

      // Estado de la cuenta conectada del prestador (habilita cobros).
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account;
        await admin
          .from('profiles')
          .update({ stripe_charges_enabled: acct.charges_enabled === true })
          .eq('stripe_connect_id', acct.id);
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;

        // ── RENOVACIONES DE TERAPIA ──────────────────────────────────────────
        //
        // La terapia es una suscripcion MENSUAL con transferencia a la cuenta
        // Connect del prestador. El registro en `payments` solo se creaba en el
        // checkout y se marcaba pagado en checkout.session.completed. De la
        // segunda mensualidad en adelante llega por aqui, y lo que sigue busca
        // al pagador por el stripe_customer_id del PERFIL — pero la sesion de
        // terapia no pasa `customer`, asi que Stripe crea un cliente distinto
        // que no esta en ningun perfil. Resultado: once cobros al ano sin UN
        // SOLO registro en la plataforma. El prestador no tenia constancia y el
        // paciente no los veia. (Auditoria del 15 oct 2026, hallazgo A-11.)
        //
        // Los datos vienen de la metadata que el checkout graba en
        // subscription_data, no del cliente de Stripe.
        {
          const metaFactura = (inv as unknown as {
            parent?: { subscription_details?: { metadata?: Record<string, string> } | null } | null;
            subscription_details?: { metadata?: Record<string, string> } | null;
          });
          const metaSub = metaFactura.parent?.subscription_details?.metadata
            ?? metaFactura.subscription_details?.metadata
            ?? (inv.lines?.data?.[0]?.metadata as Record<string, string> | undefined)
            ?? {};
          const esTerapia = metaSub.kind === 'therapy';
          if (esTerapia && inv.billing_reason !== 'subscription_create') {
            const subTerapia = (inv as unknown as { subscription?: string | { id?: string } | null }).subscription;
            try {
              await admin.rpc('registrar_renovacion_terapia', {
                p_provider: metaSub.provider_id ?? null,
                p_payer: metaSub.payer_id ?? metaSub.user_id ?? null,
                p_amount_cents: inv.amount_paid ?? 0,
                p_currency: inv.currency ?? 'mxn',
                p_invoice: inv.id,
                p_subscription: typeof subTerapia === 'string' ? subTerapia : (subTerapia?.id ?? null),
              });
            } catch (e) {
              console.error('registrar_renovacion_terapia', e);
            }
            // Una factura de terapia NO es una cuota de membresia: no debe
            // seguir por la ruta de abajo, que extenderia la vigencia.
            break;
          }
        }

        // SOLO LAS FACTURAS DE LA MEMBRESÍA. Antes se activaba la membresía con
        // CUALQUIER factura del cliente, sin comprobar que viniera de su
        // suscripción de membresía.
        //
        // DE DONDE SALE LA SUSCRIPCION DE LA FACTURA.
        //
        // Stripe movio este dato de sitio entre versiones de su API: en las
        // antiguas viene como `invoice.subscription`, y en las nuevas bajo
        // `invoice.parent.subscription_details.subscription`. El endpoint del
        // webhook puede estar fijado a una version distinta de la que usa este
        // codigo, asi que se miran LAS DOS, y como ultimo recurso se deduce de
        // las lineas de la factura.
        //
        // Esto no es teorico: el 15 de octubre de 2026 el primer pago real
        // entro, la membresia se activo y el asiento de fundador se concedio,
        // pero LA COMISION NO SE DEVENGO porque este bloque salia antes de
        // llegar a ella. Y salia en silencio, respondiendo 200.
        const invAny = inv as unknown as {
          subscription?: string | { id?: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null;
        };
        const sacarId = (v: string | { id?: string } | null | undefined): string | null =>
          typeof v === 'string' ? v : (v?.id ?? null);
        const invSubId =
          sacarId(invAny.subscription)
          ?? sacarId(invAny.parent?.subscription_details?.subscription)
          ?? sacarId((inv.lines?.data ?? []).map((l) => (l as { subscription?: string | null }).subscription)
                      .find((x) => !!x) ?? null);

        if (!invSubId) {
          // NO se sale en silencio. Una factura de la que no se puede deducir
          // la suscripcion, pero que pertenece a un cliente con membresia, es
          // justo el caso que hace que alguien pague y no se le acredite.
          console.error('[invoice.paid sin suscripcion]', inv.id, customerId);
          await admin.rpc('notify_admins', {
            p_type: 'invoice_sin_suscripcion',
            p_title: 'Factura pagada sin suscripción identificable',
            p_body: 'Entró un invoice.paid del que no se pudo deducir la suscripción. Revisar si corresponde a una membresía y acreditarla a mano.',
            p_data: { invoice: inv.id, customer: customerId ?? null },
          }).catch(() => { /* el aviso es best-effort */ });
          break;
        }

        // LA LÍNEA CORRECTA, NO LA PRIMERA. `lines.data[0]` puede ser una línea
        // de prorrateo o de crédito, con un periodo ya vencido: se guardaba
        // entonces una vigencia en el pasado junto a un estado 'active', y la
        // periodicidad se deducía de ese mismo intervalo corto, de modo que una
        // anual con prorrateo quedaba registrada como mensual. Se toma la línea
        // de la suscripción con el periodo que termina más tarde.
        const lineas = (inv.lines?.data ?? []).filter((l) => {
          const lsub = (l as { subscription?: string | null }).subscription;
          return !lsub || lsub === invSubId;
        });
        const invLine = lineas.reduce<typeof lineas[number] | undefined>((mejor, l) => {
          const fin = l?.period?.end ?? 0;
          return !mejor || fin > (mejor.period?.end ?? 0) ? l : mejor;
        }, undefined) ?? inv.lines?.data?.[0];

        const paidUntil = toIso(invLine?.period?.end ?? null);
        // Periodicidad inferida del intervalo de la línea (≤ 45 días = mensual).
        let invPeriod: 'monthly' | 'annual' | null = null;
        const pStart = invLine?.period?.start, pEnd = invLine?.period?.end;
        if (typeof pStart === 'number' && typeof pEnd === 'number') {
          invPeriod = (pEnd - pStart) <= 45 * 86400 ? 'monthly' : 'annual';
        }
        if (customerId) {
          // ESTE UPDATE ES LA RENOVACION. El mismo arreglo que ya tenia
          // checkout.session.completed —revisar el error, comprobar que se
          // toco alguna fila, y responder 500 para que Stripe reintente— NO se
          // habia replicado aqui, que es la ruta por la que pasan TODAS las
          // renovaciones. Si el UPDATE fallaba (hay seis disparadores BEFORE
          // sobre profiles) o no encontraba la fila, el codigo seguia, payerId
          // salia nulo, no se asentaba la cuota ni se devengaba la comision, y
          // se respondia 200: el afiliado pagaba su segundo ano y se le
          // despublicaba por impago. (Auditoria del 15 oct 2026, hallazgo A-1.)
          const { data: renovado, error: errRen } = await admin
            .from('profiles')
            .update({
              membership_status: 'active',
              membership_paid_until: paidUntil,
              ...(invPeriod ? { membership_period: invPeriod } : {}),
            })
            .eq('stripe_customer_id', customerId)
            .select('id');

          if (errRen || !renovado || renovado.length === 0) {
            const detalle = errRen?.message ?? 'no se encontro el perfil de ese cliente de Stripe';
            console.error('[RENOVACION FALLIDA]', customerId, inv.id, detalle);
            await admin.rpc('notify_admins', {
              p_type: 'membership_renewal_failed',
              p_title: 'Entro una renovación y NO se acreditó',
              p_body: 'Stripe cobró una renovación pero no se pudo actualizar la membresía. Revisar y resolver a mano.',
              p_data: { customer: customerId, invoice: inv.id, error: detalle },
            }).catch(() => { /* el aviso es best-effort; el 500 no */ });
            return new Response(
              JSON.stringify({ error: `No se pudo acreditar la renovación: ${detalle}` }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const payerId = renovado[0]?.id as string | undefined;
          if (payerId) {
            // Si esta factura se cobró con el cupón de recomendación, el
            // crédito ya se usó: se pone a cero.
            // Dos caminos gastan el crédito acumulado de recomendación:
            //  - el cupón 'referral' que crea applyReferralReward al premiar;
            //  - el cupón 'discount' del checkout, que compone referral_pct
            //    con el resto de descuentos y lleva referral_used = '1'.
            // Antes sólo se miraba el primero, de modo que quien pagaba por el
            // segundo camino conservaba su crédito intacto y volvía a gastarlo
            // en cada cobro siguiente.
            const cupMeta = (inv.discount?.coupon?.metadata ?? {}) as Record<string, string>;
            const usedReferralCoupon =
              cupMeta.kind === 'referral' || cupMeta.referral_used === '1';
            if (usedReferralCoupon) {
              await admin.rpc('consume_referral_credit', { p_user: payerId });
            }
            // Y su propio referente cobra recompensa (solo la primera vez).
            await applyReferralReward(admin, stripe, payerId);

            // COMISIÓN DEL REFERIDOR (migración 0210). Va aquí y NO en
            // checkout.session.completed: en el primer pago de una suscripción
            // Stripe dispara los DOS eventos, y devengar en ambos cobraría dos
            // veces. invoice.paid cubre el primer pago y todas las renovaciones.
            //
            // La factura es la llave de idempotencia: si Stripe reintenta el
            // webhook, el libro rechaza el duplicado por restricción única.
            //
            // Best-effort absoluto: un fallo del libro no puede tumbar el
            // procesamiento de un pago ya cobrado.
            // LIBRO PROPIO DE CUOTAS (migración 0228). Hasta el 15 de octubre
            // de 2026 Neuromundi no asentaba en ninguna tabla las cuotas que
            // cobraba: sólo quedaba su efecto (membership_paid_until) en el
            // perfil. Sin este libro no hay de dónde decirle a nadie qué pagó,
            // cuándo y cuánto, y la contabilidad depende de que Stripe siga
            // ahí. Va aquí y no en checkout.session.completed por lo mismo que
            // la comisión: el primer pago dispara los dos eventos. La factura
            // es la llave única, así que una reentrega no duplica el asiento.
            try {
              await admin.rpc('registrar_pago_de_membresia', {
                p_user: payerId,
                p_amount_cents: inv.amount_paid ?? 0,
                p_currency: inv.currency ?? 'mxn',
                p_stripe_ref: inv.id,
                p_concepto: inv.billing_reason === 'subscription_create' ? 'inscripcion' : 'renovacion',
                p_period: invPeriod,
                p_member_class: null,
                p_paid_until: paidUntil,
              });
            } catch (e) {
              console.error('registrar_pago_de_membresia', e);
            }

            try {
              const esPrimerPago = inv.billing_reason === 'subscription_create';
              const { data: com } = await admin.rpc('devengar_comision_membresia', {
                p_referred: payerId,
                p_base_cents: inv.amount_paid ?? 0,
                p_currency: inv.currency ?? 'mxn',
                p_stripe_ref: inv.id,
                p_primer_pago: esPrimerPago,
              });
              console.log('[comision]', inv.id, JSON.stringify(com));
            } catch (e) {
              console.error('devengar_comision_membresia', e);
            }
          }
        }
        break;
      }
      // UN COBRO FALLIDO NO ES UNA CANCELACIÓN. Antes los dos eventos
      // compartían el mismo bloque y ambos dejaban 'past_due': quien cancelaba
      // por su voluntad quedaba marcado como moroso, con la vigencia intacta, y
      // aparecía así en el panel y en los recordatorios.
      case 'invoice.payment_failed': {
        const obj = event.data.object as { customer?: string | { id: string } };
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
        if (customerId) {
          // Moroso de verdad: Stripe seguirá reintentando. No se toca la
          // vigencia, porque los días ya pagados siguen siendo suyos.
          const { error } = await admin
            .from('profiles')
            .update({ membership_status: 'past_due' })
            .eq('stripe_customer_id', customerId);
          if (error) console.error('marcar past_due', error.message);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const obj = event.data.object as { customer?: string | { id: string } };
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
        if (customerId) {
          // Suscripción terminada. El servicio dura lo que ya está pagado:
          // membership_paid_until NO se toca, y cuota_cubierta() lo respeta.
          // Se vacía stripe_subscription_id para que no quede apuntando a una
          // suscripción que ya no existe.
          const { error } = await admin
            .from('profiles')
            .update({ membership_status: 'pending', stripe_subscription_id: null })
            .eq('stripe_customer_id', customerId);
          if (error) console.error('cerrar suscripcion', error.message);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return new Response(`Error procesando evento: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
