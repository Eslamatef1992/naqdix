// POS subscribers: who uses Naqdi X, on which package, until when.
import { db, insert, now } from '../db.js';
import { bad, notFound, text, cleanEmail, cleanPhone } from '../lib/util.js';

const DAY = 86400_000;
export const SOON_DAYS = 30;

/** active | expiring | expired | lifetime | suspended */
export function stateOf(s, t = now()) {
  if (s.suspended) return 'suspended';
  if (s.end_date == null) return 'lifetime';
  if (+s.end_date <= t) return 'expired';
  if (+s.end_date <= t + SOON_DAYS * DAY) return 'expiring';
  return 'active';
}
export const out = (s, t = now()) => ({
  ...s, suspended: !!s.suspended, amount: s.amount == null ? null : +s.amount,
  start_date: +s.start_date, end_date: s.end_date == null ? null : +s.end_date,
  state: stateOf(s, t), days_left: s.end_date == null ? null : Math.ceil((+s.end_date - t) / DAY),
});

/** Called when an order is paid: a plan adds or extends the store's subscription, the app adds a lifetime one. */
export async function syncFromOrder(order, license, trx = db) {
  const t = now();
  if (order.kind === 'plan') {
    const prev = order.email && await trx('pos_subscribers').where({ email: order.email, product_id: order.product_id }).whereNotNull('end_date').orderBy('id', 'desc').first();
    if (prev) {
      await trx('pos_subscribers').where({ id: prev.id }).update({ end_date: order.period_end, order_id: order.id, amount: order.amount, suspended: false, updated_at: t });
      return prev.id;
    }
  }
  return insert('pos_subscribers', {
    name: order.customer_name, store: order.company || null, phone: order.phone || null, email: order.email || null,
    product_id: order.product_id, package: order.product_name,
    start_date: order.period_start || order.paid_at || t, end_date: order.kind === 'plan' ? order.period_end : null,
    amount: order.amount, currency: order.currency || 'KWD', order_id: order.id, serial: license?.serial || null,
    suspended: false, created_at: t, updated_at: t,
  }, trx);
}

const day = (v, label) => {
  if (v === '' || v == null) return null;
  const ms = typeof v === 'number' ? v : Date.parse(String(v).slice(0, 10) + 'T12:00:00Z');
  if (!Number.isFinite(ms)) throw bad(`${label} is not a valid date`);
  return ms;
};

/** Clean the admin form: { name, store, phone, email, product_id, package, start_date, end_date|null, lifetime, amount, notes, suspended } */
export async function subscriberIn(b, existing = {}) {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };
  if (b.name !== undefined) { const n = text(b.name, 120); if (!n) throw bad('Enter the customer name'); row.name = n; }
  set('store', b.store !== undefined ? text(b.store, 160) : undefined);
  if (b.phone !== undefined) row.phone = b.phone ? (cleanPhone(b.phone) || (() => { throw bad('Phone number looks wrong'); })()) : null;
  if (b.email !== undefined) row.email = b.email ? (cleanEmail(b.email) || (() => { throw bad('Email looks wrong'); })()) : null;
  if (b.product_id !== undefined) {
    const p = b.product_id ? await db('products').where({ id: +b.product_id }).first() : null;
    if (b.product_id && !p) throw bad('Unknown package');
    row.product_id = p?.id || null;
    if (p && !text(b.package, 120)) row.package = p.name;
  }
  if (b.package !== undefined && text(b.package, 120)) row.package = text(b.package, 120);
  if (b.start_date !== undefined) row.start_date = day(b.start_date, 'Start date') ?? now();
  if (b.lifetime) row.end_date = null;
  else if (b.end_date !== undefined) row.end_date = day(b.end_date, 'End date');
  if (b.amount !== undefined) row.amount = b.amount === '' || b.amount == null ? null : Math.max(+b.amount || 0, 0);
  if (b.notes !== undefined) row.notes = text(b.notes, 2000);
  if (b.suspended !== undefined) row.suspended = !!b.suspended;
  const merged = { ...existing, ...row };
  if (!merged.name) throw bad('Enter the customer name');
  if (!merged.package) throw bad('Choose a package');
  if (!b.lifetime && b.end_date !== undefined && row.end_date == null) throw bad('Choose an end date, or tick "No end date"');
  if (!existing.id && !b.lifetime && row.end_date == null) throw bad('Choose an end date, or tick "No end date"');
  if (merged.end_date != null && merged.start_date && +merged.end_date < +merged.start_date) throw bad('End date is before the start date');
  return row;
}

export async function getSubscriber(id) {
  const s = await db('pos_subscribers').where({ id }).first();
  if (!s) throw notFound('Subscriber');
  return s;
}

/** Add whole years (or months) to the end date, from today if it has already ended. */
export async function renewSubscriber(id, { years = 1, months = 0 } = {}) {
  const s = await getSubscriber(id);
  if (s.end_date == null) throw bad('This subscriber has no end date');
  const t = now();
  const end = new Date(Math.max(+s.end_date, t));
  end.setUTCFullYear(end.getUTCFullYear() + (+years || 0));
  end.setUTCMonth(end.getUTCMonth() + (+months || 0));
  await db('pos_subscribers').where({ id }).update({ end_date: end.getTime(), suspended: false, updated_at: t });
  return getSubscriber(id);
}
