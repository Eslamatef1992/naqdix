// Admin API (admin.naqdix.com): orders, serial codes, products and prices, demo requests, settings.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db, now, s, insert } from '../db.js';
import { h, bad, notFound, HttpError, text, cleanEmail, cleanPhone } from '../lib/util.js';
import { markPaid, issueLicense, productOut } from '../services/orders.js';
import { safeSend, customerEmails, serialEmail, contactInfo, mailEnabled } from '../services/email.js';
import { paymentMethods } from '../services/paypal.js';

const r = Router();
const sign = (a) => jwt.sign({ sub: a.id }, config.jwtSecret, { expiresIn: '30d' });

r.post('/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, message: { error: 'Too many attempts. Try again in 15 minutes.' } }), h(async (req, res) => {
  const admin = await db('admins').where({ email: String(req.body?.email || '').trim().toLowerCase() }).first();
  if (!admin || !(await bcrypt.compare(String(req.body?.password || ''), admin.password_hash))) throw new HttpError(401, 'Wrong email or password');
  res.json({ token: sign(admin), admin: { id: admin.id, name: admin.name, email: admin.email } });
}));

// everything below needs a signed-in admin
r.use(h(async (req, _res, next) => {
  const raw = String(req.headers.authorization || '').replace(/^Bearer /, '');
  let payload; try { payload = jwt.verify(raw, config.jwtSecret); } catch { throw new HttpError(401, 'Please sign in'); }
  req.admin = await db('admins').where({ id: payload.sub }).first();
  if (!req.admin) throw new HttpError(401, 'Please sign in');
  next();
}));

r.get('/me', h(async (req, res) => res.json({ id: req.admin.id, name: req.admin.name, email: req.admin.email })));

r.patch('/me/password', h(async (req, res) => {
  if (!(await bcrypt.compare(String(req.body?.current || ''), req.admin.password_hash))) throw bad('Your current password is not correct');
  const next = String(req.body?.password || '');
  if (next.length < 8) throw bad('Use at least 8 characters');
  await db('admins').where({ id: req.admin.id }).update({ password_hash: await bcrypt.hash(next, 10) });
  res.json({ ok: true });
}));

const DAY = 86400_000;
r.get('/stats', h(async (_req, res) => {
  const t = now();
  const sum = async (q) => +((await q.sum({ v: 'amount' }).first())?.v || 0);
  const count = async (q) => +((await q.count({ c: '*' }).first())?.c || 0);
  const paid = () => db('orders').where({ status: 'paid' });
  res.json({
    revenue30: await sum(paid().andWhere('paid_at', '>', t - 30 * DAY)),
    revenueAll: await sum(paid()),
    orders30: await count(paid().andWhere('paid_at', '>', t - 30 * DAY)),
    activePlans: await count(paid().andWhere({ kind: 'plan' }).andWhere('period_end', '>', t)),
    expiringSoon: await count(paid().andWhere({ kind: 'plan' }).andWhere('period_end', '>', t).andWhere('period_end', '<', t + 14 * DAY)),
    serialsWaiting: await count(db('licenses').where({ status: 'issued' })),
    newLeads: await count(db('leads').where({ status: 'new' })),
    pending: await count(db('orders').where({ status: 'pending' }).andWhere('created_at', '>', t - 7 * DAY)),
    recent: await db('orders').orderBy('id', 'desc').limit(8).select('id', 'number', 'product_name', 'interval', 'customer_name', 'amount', 'currency', 'status', 'created_at'),
    setup: { paypal: paymentMethods().length > 0, email: mailEnabled(), notifyEmail: !!config.notifyEmail },
  });
}));

// ---------- orders ----------
const page = (req) => { const p = Math.max(+req.query.page || 1, 1); return { limit: 25, offset: (p - 1) * 25 }; };

r.get('/orders', h(async (req, res) => {
  const q = db('orders');
  if (req.query.status) q.where({ status: req.query.status });
  if (req.query.kind) q.where({ kind: req.query.kind });
  if (req.query.q) { const like = `%${req.query.q}%`; q.where((w) => w.where('number', 'like', like).orWhere('customer_name', 'like', like).orWhere('email', 'like', like).orWhere('phone', 'like', like).orWhere('company', 'like', like)); }
  const total = +(await q.clone().count({ c: '*' }).first()).c;
  const { limit, offset } = page(req);
  res.json({ total, data: await q.orderBy('id', 'desc').limit(limit).offset(offset) });
}));

r.get('/orders/:id', h(async (req, res) => {
  const order = await db('orders').where({ id: req.params.id }).first();
  if (!order) throw notFound('Order');
  const license = await db('licenses').where({ order_id: order.id }).first();
  const history = await db('orders').where({ email: order.email }).whereNot({ id: order.id }).orderBy('id', 'desc').limit(20)
    .select('id', 'number', 'product_name', 'interval', 'amount', 'currency', 'status', 'created_at', 'period_end');
  res.json({ order, license, history, link: `${config.siteUrl}/order/${order.token}` });
}));

/** Mark paid by hand (bank transfer, cash, KNET link…): { ref } */
r.post('/orders/:id/mark-paid', h(async (req, res) => {
  const { order, license } = await markPaid(+req.params.id, { provider: 'manual', ref: text(req.body?.ref, 64) || `admin-${req.admin.id}` });
  res.json({ order, license });
}));

r.post('/orders/:id/cancel', h(async (req, res) => {
  const n = await db('orders').where({ id: req.params.id, status: 'pending' }).update({ status: 'canceled' });
  if (!n) throw bad('Only unpaid orders can be canceled');
  res.json({ ok: true });
}));

r.patch('/orders/:id', h(async (req, res) => {
  const patch = {};
  if (req.body.notes !== undefined) patch.notes = text(req.body.notes, 2000);
  if (req.body.period_end !== undefined) patch.period_end = req.body.period_end ? +new Date(req.body.period_end) : null;
  await db('orders').where({ id: req.params.id }).update(patch);
  res.json(await db('orders').where({ id: req.params.id }).first());
}));

r.post('/orders/:id/resend', h(async (req, res) => {
  const order = await db('orders').where({ id: req.params.id, status: 'paid' }).first();
  if (!order) throw bad('Only paid orders have a receipt');
  if (!mailEnabled()) throw bad('Email is not set up on the server (Mailgun)');
  for (const m of await customerEmails(order, await db('licenses').where({ order_id: order.id }).first())) await safeSend(m);
  res.json({ ok: true });
}));

// ---------- serial codes ----------
r.get('/licenses', h(async (req, res) => {
  const q = db('licenses as l').leftJoin('orders as o', 'o.id', 'l.order_id');
  if (req.query.status) q.where('l.status', req.query.status);
  if (req.query.q) { const like = `%${req.query.q}%`; q.where((w) => w.where('l.serial', 'like', like).orWhere('l.customer_name', 'like', like).orWhere('l.email', 'like', like).orWhere('l.phone', 'like', like)); }
  const total = +(await q.clone().count({ c: 'l.id' }).first()).c;
  const { limit, offset } = page(req);
  res.json({ total, data: await q.orderBy('l.id', 'desc').limit(limit).offset(offset).select('l.*', 'o.number as order_number') });
}));

/** Give a serial by hand (free copy, partner, replacement): { name, email, phone, notes } */
r.post('/licenses', h(async (req, res) => {
  const app = await db('products').where({ kind: 'app' }).orderBy('id').first();
  const name = text(req.body?.name, 120);
  if (!name) throw bad('Enter the customer name');
  const license = await issueLicense({ productId: app?.id, name, email: cleanEmail(req.body?.email), phone: cleanPhone(req.body?.phone), notes: text(req.body?.notes, 1000) });
  if (license.email && req.body?.send !== false) await safeSend(serialEmail(license, { lang: req.body?.lang === 'ar' ? 'ar' : 'en' }, await contactInfo()));
  res.status(201).json(license);
}));

/** Email a serial code to its customer again. */
r.post('/licenses/:id/send', h(async (req, res) => {
  const l = await db('licenses').where({ id: req.params.id }).first();
  if (!l) throw bad('Serial not found');
  if (!l.email) throw bad('This serial has no customer email');
  if (!mailEnabled()) throw bad('Email is not set up on the server (Mailgun)');
  const order = l.order_id ? await db('orders').where({ id: l.order_id }).first() : null;
  await safeSend(serialEmail(l, { lang: order?.lang || 'en', order }, await contactInfo()));
  res.json({ ok: true });
}));

/** { status: issued|activated|revoked, device, notes } */
r.patch('/licenses/:id', h(async (req, res) => {
  const l = await db('licenses').where({ id: req.params.id }).first();
  if (!l) throw notFound('Serial');
  const patch = {};
  if (req.body.status !== undefined) {
    if (!['issued', 'activated', 'revoked'].includes(req.body.status)) throw bad('Unknown status');
    patch.status = req.body.status;
    patch.activated_at = req.body.status === 'activated' ? (l.activated_at || now()) : (req.body.status === 'issued' ? null : l.activated_at);
  }
  if (req.body.device !== undefined) patch.device = text(req.body.device, 190);
  if (req.body.notes !== undefined) patch.notes = text(req.body.notes, 1000);
  await db('licenses').where({ id: l.id }).update(patch);
  res.json(await db('licenses').where({ id: l.id }).first());
}));

// ---------- products and prices ----------
const productIn = (b, existing = {}) => {
  const num = (v) => (v === '' || v == null ? null : +v);
  const out = {
    name: text(b.name ?? existing.name, 120), name_ar: text(b.name_ar ?? existing.name_ar, 120),
    tagline: text(b.tagline ?? existing.tagline, 255), tagline_ar: text(b.tagline_ar ?? existing.tagline_ar, 255),
    price_monthly: num(b.price_monthly !== undefined ? b.price_monthly : existing.price_monthly),
    price_yearly: num(b.price_yearly !== undefined ? b.price_yearly : existing.price_yearly),
    price_once: num(b.price_once !== undefined ? b.price_once : existing.price_once),
    currency: String(b.currency || existing.currency || 'KWD').toUpperCase().slice(0, 3),
    highlighted: b.highlighted !== undefined ? !!b.highlighted : !!existing.highlighted,
    is_active: b.is_active !== undefined ? !!b.is_active : (existing.is_active === undefined ? true : !!existing.is_active),
    sort: +(b.sort ?? existing.sort ?? 0) || 0,
  };
  if (b.features !== undefined) {
    const clean = (arr) => (Array.isArray(arr) ? arr : String(arr || '').split('\n')).map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
    out.features = s({ en: clean(b.features?.en), ar: clean(b.features?.ar) });
  }
  if (!out.name) throw bad('Name is required');
  for (const k of ['price_monthly', 'price_yearly', 'price_once']) if (out[k] != null && !(out[k] >= 0)) throw bad('Prices must be 0 or more');
  return out;
};

r.get('/products', h(async (_req, res) => res.json({ data: (await db('products').orderBy(['sort', 'id'])).map(productOut) })));

r.post('/products', h(async (req, res) => {
  const kind = req.body?.kind === 'app' ? 'app' : 'plan';
  const slug = String(req.body?.slug || req.body?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  if (!slug) throw bad('Name is required');
  if (await db('products').where({ slug }).first()) throw bad('A product with this name already exists');
  const id = await insert('products', { features: s({ en: [], ar: [] }), ...productIn(req.body), kind, slug, created_at: now() });
  res.status(201).json(productOut(await db('products').where({ id }).first()));
}));

r.patch('/products/:id', h(async (req, res) => {
  const p = await db('products').where({ id: req.params.id }).first();
  if (!p) throw notFound('Product');
  await db('products').where({ id: p.id }).update(productIn(req.body, p));
  res.json(productOut(await db('products').where({ id: p.id }).first()));
}));

// ---------- demo requests ----------
r.get('/leads', h(async (req, res) => {
  const q = db('leads');
  if (req.query.status) q.where({ status: req.query.status });
  const total = +(await q.clone().count({ c: '*' }).first()).c;
  const { limit, offset } = page(req);
  res.json({ total, data: await q.orderBy('id', 'desc').limit(limit).offset(offset) });
}));
r.patch('/leads/:id', h(async (req, res) => {
  if (!['new', 'contacted', 'closed'].includes(req.body?.status)) throw bad('Unknown status');
  await db('leads').where({ id: req.params.id }).update({ status: req.body.status });
  res.json({ ok: true });
}));

// ---------- settings ----------
const SETTINGS = ['whatsapp', 'email', 'address'];
r.get('/settings', h(async (_req, res) => {
  const rows = await db('settings').whereIn('key', SETTINGS);
  res.json(Object.fromEntries(SETTINGS.map((k) => [k, rows.find((x) => x.key === k)?.value || ''])));
}));
r.put('/settings', h(async (req, res) => {
  for (const k of SETTINGS) {
    if (req.body?.[k] === undefined) continue;
    const value = k === 'whatsapp' ? String(req.body[k]).replace(/\D/g, '').slice(0, 20) : String(req.body[k]).trim().slice(0, 300);
    const n = await db('settings').where({ key: k }).update({ value });
    if (!n) await db('settings').insert({ key: k, value });
  }
  res.json({ ok: true });
}));

export default r;
