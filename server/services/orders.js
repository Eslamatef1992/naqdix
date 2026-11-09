// Orders: POS plans (monthly / yearly) and the Android app (one full payment → serial code).
import { config } from '../config.js';
import { db, j, now, insert } from '../db.js';
import { bad, notFound, token, serial, cleanEmail, cleanPhone, text } from '../lib/util.js';
import { safeSend, customerEmails, teamOrderEmail } from './email.js';
import { syncFromOrder } from './subscribers.js';

const DAY = 86400_000;

export function productOut(p) {
  if (!p) return p;
  return {
    id: p.id, kind: p.kind, slug: p.slug, name: p.name, name_ar: p.name_ar, tagline: p.tagline, tagline_ar: p.tagline_ar,
    price_monthly: p.price_monthly == null ? null : +p.price_monthly, price_yearly: p.price_yearly == null ? null : +p.price_yearly,
    price_once: p.price_once == null ? null : +p.price_once, currency: p.currency,
    features: j(p.features, { en: [], ar: [] }), highlighted: !!p.highlighted, is_active: !!p.is_active, sort: p.sort,
  };
}

export function priceFor(product, interval) {
  if (product.kind === 'app') return product.price_once != null ? { interval: 'once', amount: +product.price_once } : null;
  if (interval === 'yearly' && product.price_yearly != null) return { interval: 'yearly', amount: +product.price_yearly };
  if (interval === 'monthly' && product.price_monthly != null) return { interval: 'monthly', amount: +product.price_monthly };
  // whichever billing period the plan offers (plans are yearly only by default)
  if (product.price_yearly != null) return { interval: 'yearly', amount: +product.price_yearly };
  if (product.price_monthly != null) return { interval: 'monthly', amount: +product.price_monthly };
  return null;
}

async function nextNumber(trx = db) {
  const year = new Date().getFullYear();
  const last = await trx('orders').where('number', 'like', `NQX-${year}-%`).orderBy('id', 'desc').first('number');
  const n = last ? +last.number.split('-')[2] + 1 : 1;
  return `NQX-${year}-${String(n).padStart(5, '0')}`;
}

/** Create a pending order from the checkout form. */
export async function createOrder(body, { renewsOrder = null } = {}) {
  const product = await db('products').where({ slug: String(body.product || ''), is_active: true }).first();
  if (!product) throw bad('Please choose a product');
  const price = priceFor(product, body.interval);
  if (!price) throw bad('This product cannot be bought online yet');
  const customer_name = text(body.name, 120);
  const email = cleanEmail(body.email);
  const phone = cleanPhone(body.phone);
  if (!customer_name) throw bad('Please enter your name');
  if (!email) throw bad('Please enter a valid email address');
  if (!phone) throw bad('Please enter a valid phone number');
  const id = await insert('orders', {
    number: await nextNumber(), token: token(18), product_id: product.id, kind: product.kind, interval: price.interval,
    product_name: product.name, customer_name, company: text(body.company, 160), email, phone, lang: body.lang === 'ar' ? 'ar' : 'en',
    amount: price.amount, currency: product.currency, status: 'pending', renews_order_id: renewsOrder?.id || null,
    notes: text(body.notes, 1000), created_at: now(),
  });
  return db('orders').where({ id }).first();
}

/** Mark an order paid (after PayPal capture, or by an admin). Issues the serial for the Android app. Idempotent. */
export async function markPaid(orderId, { provider, ref }) {
  const result = await db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order) throw notFound('Order');
    if (order.status === 'paid') return { order, license: await trx('licenses').where({ order_id: order.id }).first(), fresh: false };
    const t = now();
    const update = { status: 'paid', provider, payment_ref: ref || null, paid_at: t };
    if (order.kind === 'plan') {
      // a renewal continues from the end of the plan it renews, if that has not ended yet
      const prev = order.renews_order_id && await trx('orders').where({ id: order.renews_order_id }).first();
      const start = prev?.period_end && +prev.period_end > t ? +prev.period_end : t;
      const end = new Date(start);
      if (order.interval === 'yearly') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
      Object.assign(update, { period_start: start, period_end: end.getTime() });
    }
    await trx('orders').where({ id: order.id }).update(update);
    let license = null;
    if (order.kind === 'app') license = await issueLicense({ order: { ...order, ...update } }, trx);
    await syncFromOrder({ ...order, ...update }, license, trx);
    return { order: await trx('orders').where({ id: order.id }).first(), license, fresh: true };
  });
  if (result.fresh) {
    for (const m of await customerEmails(result.order, result.license)) await safeSend(m);
    if (config.notifyEmail) await safeSend(teamOrderEmail(result.order, result.license));
  }
  return result;
}

/** A new unique serial, tied to an order or issued by hand from the admin panel. */
export async function issueLicense({ order = null, productId = null, name = null, email = null, phone = null, notes = null }, trx = db) {
  for (let i = 0; i < 5; i++) {
    const code = serial();
    if (await trx('licenses').where({ serial: code }).first()) continue;
    const id = await insert('licenses', {
      serial: code, order_id: order?.id || null, product_id: order?.product_id || productId,
      customer_name: order?.customer_name || name, email: order?.email || email, phone: order?.phone || phone,
      status: 'issued', notes, created_at: now(),
    }, trx);
    return trx('licenses').where({ id }).first();
  }
  throw new Error('Could not generate a unique serial');
}

/** What the customer sees on their private order page. */
export async function publicOrder(order) {
  const license = order.status === 'paid' && order.kind === 'app' ? await db('licenses').where({ order_id: order.id }).whereNot('status', 'revoked').first() : null;
  const product = await db('products').where({ id: order.product_id }).first();
  return {
    number: order.number, token: order.token, status: order.status, kind: order.kind, interval: order.interval,
    product: { slug: product?.slug, name: product?.name || order.product_name, name_ar: product?.name_ar },
    customer_name: order.customer_name, company: order.company, amount: +order.amount, currency: order.currency,
    paid_at: order.paid_at, period_start: order.period_start, period_end: order.period_end, lang: order.lang,
    serial: license?.serial || null, created_at: order.created_at,
    renewable: order.kind === 'plan' && order.status === 'paid' && !!product?.is_active && +order.period_end - now() < 30 * DAY,
  };
}
