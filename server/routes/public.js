// Website API: catalogue, checkout with PayPal, the customer's order page, demo requests.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { db, now, insert } from '../db.js';
import { h, bad, notFound, cleanEmail, cleanPhone, text } from '../lib/util.js';
import { createOrder, markPaid, productOut, publicOrder } from '../services/orders.js';
import { createPaypalOrder, capturePaypalOrder, chargeAmount, paymentMethods } from '../services/paypal.js';
import { safeSend, teamLeadEmail } from '../services/email.js';

const r = Router();
const limiter = (limit) => rateLimit({ windowMs: 10 * 60_000, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again in a few minutes.' } });

async function settings() {
  const rows = await db('settings').select();
  return Object.fromEntries(rows.map((x) => [x.key, x.value]));
}

r.get('/catalog', h(async (_req, res) => {
  const products = (await db('products').where({ is_active: true }).orderBy(['sort', 'id'])).map(productOut);
  const st = await settings();
  const sample = chargeAmount(1, products[0]?.currency || 'KWD');
  res.json({
    products,
    paymentMethods: paymentMethods(),
    charge: { currency: sample.currency, converted: sample.converted, rate: sample.converted ? config.paypal.fxRate : 1 },
    contact: { whatsapp: (st.whatsapp || '').replace(/\D/g, ''), email: st.email || '', address: st.address || '' },
  });
}));

const startPayment = async (order, method) => {
  const methods = paymentMethods();
  if (!methods.length) throw bad('Online payment is not set up yet. Please contact us to complete your order.');
  const m = methods.includes(method) ? method : methods[0];
  return createPaypalOrder(order, { card: m === 'card' });
};

/** Checkout: { product, interval, name, company, email, phone, lang, method } → { url } (PayPal / card page) */
r.post('/checkout', limiter(30), h(async (req, res) => {
  const order = await createOrder(req.body || {});
  const { url } = await startPayment(order, req.body?.method);
  res.status(201).json({ url, token: order.token, number: order.number });
}));

r.get('/orders/:token', h(async (req, res) => {
  const order = await db('orders').where({ token: String(req.params.token) }).first();
  if (!order) throw notFound('Order');
  res.json(await publicOrder(order));
}));

/** Try paying a pending order again. */
r.post('/orders/:token/pay', limiter(30), h(async (req, res) => {
  const order = await db('orders').where({ token: String(req.params.token) }).first();
  if (!order) throw notFound('Order');
  if (order.status !== 'pending') throw bad('This order is already paid');
  res.json({ url: (await startPayment(order, req.body?.method)).url });
}));

/** "I already paid": check with PayPal. */
r.post('/orders/:token/check', limiter(30), h(async (req, res) => {
  const order = await db('orders').where({ token: String(req.params.token) }).first();
  if (!order) throw notFound('Order');
  if (order.status === 'pending' && order.provider === 'paypal' && order.provider_ref) {
    const paid = await capturePaypalOrder(order.provider_ref);
    if (paid) await markPaid(order.id, { provider: 'paypal', ref: paid.captureId });
  }
  res.json(await publicOrder(await db('orders').where({ id: order.id }).first()));
}));

/** Renew a plan: a new order for the same plan and customer, continuing from the current end date. */
r.post('/orders/:token/renew', limiter(30), h(async (req, res) => {
  const prev = await db('orders').where({ token: String(req.params.token), kind: 'plan', status: 'paid' }).first();
  if (!prev) throw notFound('Order');
  const product = await db('products').where({ id: prev.product_id }).first();
  const order = await createOrder({ product: product?.slug, interval: req.body?.interval || prev.interval, name: prev.customer_name, company: prev.company, email: prev.email, phone: prev.phone, lang: prev.lang }, { renewsOrder: prev });
  res.status(201).json({ url: (await startPayment(order, req.body?.method)).url, token: order.token });
}));

// PayPal sends the customer back here after paying
r.get('/paypal/return', h(async (req, res) => {
  let order = req.query.token ? await db('orders').where({ provider: 'paypal', provider_ref: String(req.query.token) }).first() : null;
  try {
    const paid = await capturePaypalOrder(req.query.token);
    if (paid) order = (await markPaid(paid.order.id, { provider: 'paypal', ref: paid.captureId })).order;
  } catch (e) { console.error('[paypal] return', e.message); }
  if (!order) return res.redirect(`${config.siteUrl}/?payment=unknown`);
  res.redirect(`${config.siteUrl}/order/${order.token}${order.status === 'paid' ? '?payment=success' : '?payment=pending'}${order.lang === 'ar' ? '&lang=ar' : ''}`);
}));

// Backup for customers who close the tab before coming back: we look up the order and confirm it with PayPal ourselves
r.post('/paypal/webhook', h(async (req, res) => {
  const ev = req.body || {};
  const r0 = ev.resource || {};
  const id = String(ev.event_type || '').startsWith('CHECKOUT.ORDER') ? r0.id : r0.supplementary_data?.related_ids?.order_id;
  try {
    const paid = id && await capturePaypalOrder(id);
    if (paid) await markPaid(paid.order.id, { provider: 'paypal', ref: paid.captureId });
  } catch (e) { console.error('[paypal] webhook', e.message); }
  res.json({ ok: true });
}));

/** Request a demo / contact form. */
r.post('/leads', limiter(10), h(async (req, res) => {
  const b = req.body || {};
  const name = text(b.name, 120);
  const phone = cleanPhone(b.phone);
  if (!name) throw bad('Please enter your name');
  if (!phone) throw bad('Please enter a valid phone number');
  if (b.website) return res.status(201).json({ ok: true }); // honeypot field: bots fill it, people don't see it
  const lead = { name, company: text(b.company, 160), email: b.email ? cleanEmail(b.email) : null, phone, interest: text(b.interest, 60), message: text(b.message, 2000), status: 'new', created_at: now() };
  await insert('leads', lead);
  if (config.notifyEmail) await safeSend(teamLeadEmail(lead));
  res.status(201).json({ ok: true });
}));

export default r;
