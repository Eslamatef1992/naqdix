// Naqdi X: checkout with a fake PayPal, serial codes, renewals, demo requests and the admin API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const orders = new Map();
let seq = 0;
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/v1/oauth2/token') return send(200, { access_token: 'tok', expires_in: 3600 });
    if (req.method === 'POST' && req.url === '/v2/checkout/orders') {
      const b = JSON.parse(body); const id = `PP${++seq}`;
      orders.set(id, { id, status: 'PAYER_ACTION_REQUIRED', purchase_units: b.purchase_units, ctx: b.payment_source.paypal.experience_context });
      return send(201, { id, links: [{ rel: 'payer-action', href: `https://paypal.test/checkoutnow?token=${id}` }] });
    }
    const m = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
    const o = m && orders.get(m[1]);
    if (!o) return send(404, {});
    if (m[2]) {
      if (o.status !== 'APPROVED') return send(422, {});
      o.status = 'COMPLETED';
      const u = o.purchase_units[0];
      u.payments = { captures: [{ id: `CAP-${o.id}`, status: 'COMPLETED', custom_id: u.custom_id, amount: o.override || u.amount }] };
    }
    send(200, o);
  });
});
const approve = (url) => { const id = new URL(url).searchParams.get('token'); orders.get(id).status = 'APPROVED'; return id; };

const dbFile = path.join(os.tmpdir(), `naqdix-${Date.now()}.sqlite`);
let server; let base; let db; let adminToken;

before(async () => {
  await new Promise((r) => fake.listen(0, r));
  Object.assign(process.env, { DB_FILE: dbFile, DB_CLIENT: '', SITE_URL: 'https://naqdix.com', ADMIN_URL: 'https://admin.naqdix.com', PAYPAL_CLIENT_ID: 'id', PAYPAL_SECRET: 'sec', PAYPAL_API_BASE: `http://127.0.0.1:${fake.address().port}`, PAYPAL_FX_RATE: '3.26', PAYMENT_METHODS: 'card,paypal' });
  execFileSync('node', ['server/scripts/create-admin.js', 'owner@naqdix.com', 'Eslam', 'secret-pass-1'], { env: process.env, cwd: path.resolve(import.meta.dirname, '..') });
  const { createApp } = await import('../server/app.js');
  ({ db } = await import('../server/db.js'));
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); fake.close(); await db.destroy(); fs.rmSync(dbFile, { force: true }); });

async function call(method, url, body, headers = {}) {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let data; try { data = JSON.parse(t); } catch { data = t; }
  return { status: res.status, data, location: res.headers.get('location') };
}
const admin = (m, u, b) => call(m, u, b, { Authorization: `Bearer ${adminToken}` });
const customer = { name: 'Ahmad Ali', company: 'Ali Stores', email: 'ahmad@ali.test', phone: '+965 5000 1234' };

let appOrder;
test('catalogue lists the plans and the Android app', async () => {
  const r = await call('GET', '/api/catalog');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.products.map((p) => p.slug), ['single-branch', 'multi-branch', 'android-pos']);
  assert.deepEqual(r.data.paymentMethods, ['card', 'paypal']);
  assert.equal(r.data.products[2].price_once, 145);
  assert.deepEqual([r.data.products[0].price_yearly, r.data.products[0].price_monthly], [65, null]);
  assert.deepEqual([r.data.products[1].price_yearly, r.data.products[1].price_monthly], [109, null]);
  assert.equal(r.data.products[1].highlighted, true);
  assert.equal(r.data.products[0].features.ar.length, 9);
  assert.deepEqual(r.data.charge, { currency: 'USD', converted: true, rate: 3.26 });
});

test('buying the Android app by card opens PayPal as "Naqdi X" with the converted amount', async () => {
  const r = await call('POST', '/api/checkout', { product: 'android-pos', method: 'card', lang: 'ar', ...customer });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.number, /^NQX-\d{4}-00001$/);
  const pp = orders.get(new URL(r.data.url).searchParams.get('token'));
  assert.equal(pp.ctx.brand_name, 'Naqdi X');
  assert.equal(pp.ctx.landing_page, 'GUEST_CHECKOUT');
  assert.equal(pp.ctx.locale, 'ar-KW');
  assert.equal(pp.ctx.return_url, 'https://naqdix.com/api/paypal/return');
  assert.equal(pp.purchase_units[0].amount.value, '472.70'); // 145 KWD × 3.26
  appOrder = r.data;
  appOrder.url = r.data.url;
});

test('after paying, the customer gets a serial code on the order page (once)', async () => {
  // coming back before approving: still pending, no serial
  let ret = await call('GET', `/api/paypal/return?token=${new URL(appOrder.url).searchParams.get('token')}`);
  assert.match(ret.location, /payment=pending/);
  assert.equal((await call('GET', `/api/orders/${appOrder.token}`)).data.serial, null);

  const ppId = approve(appOrder.url);
  ret = await call('GET', `/api/paypal/return?token=${ppId}`);
  assert.equal(ret.location, `https://naqdix.com/order/${appOrder.token}?payment=success&lang=ar`);
  const o = (await call('GET', `/api/orders/${appOrder.token}`)).data;
  assert.equal(o.status, 'paid');
  assert.match(o.serial, /^NQX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(o.product.name_ar, 'تطبيق نقدي إكس لنقاط البيع على أندرويد');

  // refreshing / the webhook does not issue a second serial
  await call('GET', `/api/paypal/return?token=${ppId}`);
  await call('POST', '/api/paypal/webhook', { event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: ppId } });
  assert.equal((await db('licenses').count({ c: '*' }).first()).c, 1);
  const row = await db('orders').where({ token: appOrder.token }).first();
  assert.equal(row.payment_ref, `CAP-${ppId}`);
});

test('fake or underpaid payments are rejected', async () => {
  const r = await call('POST', '/api/checkout', { product: 'android-pos', method: 'paypal', ...customer });
  const pp = orders.get(new URL(r.data.url).searchParams.get('token'));
  assert.equal(pp.ctx.landing_page, 'LOGIN');
  pp.status = 'APPROVED'; pp.override = { currency_code: 'USD', value: '1.00' };
  const ret = await call('GET', `/api/paypal/return?token=${pp.id}`);
  assert.match(ret.location, /payment=pending/);
  assert.equal((await call('GET', `/api/orders/${r.data.token}`)).data.status, 'pending');
  assert.equal((await call('GET', '/api/paypal/return?token=NOPE')).location, 'https://naqdix.com/?payment=unknown');
});

test('plans are yearly (even if monthly is asked for); renewing continues from the end date', async () => {
  const r = await call('POST', '/api/checkout', { product: 'multi-branch', interval: 'monthly', ...customer });
  assert.equal(r.status, 201);
  assert.equal(orders.get(new URL(r.data.url).searchParams.get('token')).purchase_units[0].amount.value, '355.34'); // 109 × 3.26
  assert.equal((await db('orders').where({ token: r.data.token }).first()).interval, 'yearly');
  await call('GET', `/api/paypal/return?token=${approve(r.data.url)}`);
  const o = (await call('GET', `/api/orders/${r.data.token}`)).data;
  assert.equal(o.status, 'paid');
  assert.equal(o.serial, null, 'plans have no serial');
  const year = o.period_end - o.period_start;
  assert.ok(year >= 365 * 86400_000 && year <= 366 * 86400_000);
  assert.equal(o.renewable, false, 'not renewable until 30 days before the end');

  await db('orders').where({ token: r.data.token }).update({ period_end: Date.now() + 10 * 86400_000 });
  assert.equal((await call('GET', `/api/orders/${r.data.token}`)).data.renewable, true);
  const renew = await call('POST', `/api/orders/${r.data.token}/renew`, {});
  assert.equal(renew.status, 201);
  await call('GET', `/api/paypal/return?token=${approve(renew.data.url)}`);
  const next = (await call('GET', `/api/orders/${renew.data.token}`)).data;
  const prevEnd = (await db('orders').where({ token: r.data.token }).first()).period_end;
  assert.equal(next.period_start, +prevEnd);
});

test('checkout validation', async () => {
  assert.equal((await call('POST', '/api/checkout', { product: 'nope', ...customer })).status, 400);
  assert.equal((await call('POST', '/api/checkout', { product: 'single-branch', ...customer, email: 'x' })).status, 400);
  assert.equal((await call('POST', '/api/checkout', { product: 'single-branch', ...customer, phone: '12' })).status, 400);
  assert.equal((await call('POST', '/api/checkout', { product: 'single-branch', ...customer, name: '' })).status, 400);
  assert.equal((await call('GET', '/api/orders/not-a-token')).status, 404);
});

test('demo requests are saved; bots filling the hidden field are ignored', async () => {
  assert.equal((await call('POST', '/api/leads', { name: 'Sara', phone: '+96551112222', company: 'Sara Cafe', interest: 'android' })).status, 201);
  assert.equal((await call('POST', '/api/leads', { name: 'Bot', phone: '+96551112222', website: 'spam.example' })).status, 201);
  assert.equal((await call('POST', '/api/leads', { name: 'No phone' })).status, 400);
  assert.equal((await db('leads').count({ c: '*' }).first()).c, 1);
});

test('admin: login, stats, orders, manual payment issues a serial', async () => {
  assert.equal((await call('POST', '/api/admin/login', { email: 'owner@naqdix.com', password: 'wrong' })).status, 401);
  assert.equal((await call('GET', '/api/admin/orders')).status, 401);
  adminToken = (await call('POST', '/api/admin/login', { email: 'OWNER@naqdix.com', password: 'secret-pass-1' })).data.token;

  const stats = (await admin('GET', '/api/admin/stats')).data;
  assert.equal(stats.orders30, 3);
  assert.equal(stats.activePlans, 2);
  assert.equal(stats.serialsWaiting, 1);
  assert.equal(stats.newLeads, 1);
  assert.equal(stats.setup.paypal, true);

  const list = (await admin('GET', '/api/admin/orders?status=pending')).data;
  assert.equal(list.total, 1);
  const pending = list.data[0];
  const paid = await admin('POST', `/api/admin/orders/${pending.id}/mark-paid`, { ref: 'Bank transfer 7781' });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.order.status, 'paid');
  assert.equal(paid.data.order.provider, 'manual');
  assert.match(paid.data.license.serial, /^NQX-/);
  const detail = (await admin('GET', `/api/admin/orders/${pending.id}`)).data;
  assert.equal(detail.link, `https://naqdix.com/order/${pending.token}`);
  assert.ok(detail.history.length >= 3, 'other orders from the same email');
  assert.equal((await admin('GET', '/api/admin/orders?q=Ali%20Stores')).data.total, 4);
});

test('admin: serial codes can be activated, revoked, or issued by hand', async () => {
  const list = (await admin('GET', '/api/admin/licenses')).data;
  assert.equal(list.total, 2);
  const l = list.data[0];
  assert.ok(l.order_number.startsWith('NQX-'));
  const act = await admin('PATCH', `/api/admin/licenses/${l.id}`, { status: 'activated', device: 'Sunmi V2s · build 1.4' });
  assert.equal(act.data.status, 'activated');
  assert.ok(act.data.activated_at);
  const made = await admin('POST', '/api/admin/licenses', { name: 'Partner shop', phone: '+96599990000', notes: 'free copy' });
  assert.equal(made.status, 201);
  assert.match(made.data.serial, /^NQX-/);
  // a revoked serial no longer shows on the customer's order page
  const appLicense = await db('licenses').where({ order_id: (await db('orders').where({ token: appOrder.token }).first()).id }).first();
  await admin('PATCH', `/api/admin/licenses/${appLicense.id}`, { status: 'revoked' });
  assert.equal((await call('GET', `/api/orders/${appOrder.token}`)).data.serial, null);
});

test('admin: prices and contact details show on the website', async () => {
  const products = (await admin('GET', '/api/admin/products')).data.data;
  const app = products.find((p) => p.slug === 'android-pos');
  const r = await admin('PATCH', `/api/admin/products/${app.id}`, { price_once: 99.5, features: { en: ['Offline mode', ' ', 'Printer'], ar: 'وضع بدون إنترنت\nطابعة' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.features, { en: ['Offline mode', 'Printer'], ar: ['وضع بدون إنترنت', 'طابعة'] });
  await admin('PUT', '/api/admin/settings', { whatsapp: '+965 5555 0000', email: 'sales@naqdix.com' });
  const cat = (await call('GET', '/api/catalog')).data;
  assert.equal(cat.products.find((p) => p.slug === 'android-pos').price_once, 99.5);
  assert.equal(cat.contact.whatsapp, '96555550000');
  assert.equal(cat.contact.email, 'sales@naqdix.com');
  // hiding a plan removes it from the website
  const starter = products.find((p) => p.slug === 'single-branch');
  await admin('PATCH', `/api/admin/products/${starter.id}`, { is_active: false });
  assert.ok(!(await call('GET', '/api/catalog')).data.products.some((p) => p.slug === 'single-branch'));
  const created = await admin('POST', '/api/admin/products', { kind: 'plan', name: 'Kiosk', price_monthly: 5, features: { en: ['1 kiosk'], ar: ['كشك واحد'] } });
  assert.equal(created.status, 201);
  assert.equal(created.data.slug, 'kiosk');
  assert.deepEqual(created.data.features.en, ['1 kiosk']);
});

test('admin: change password', async () => {
  assert.equal((await admin('PATCH', '/api/admin/me/password', { current: 'nope', password: 'new-pass-123' })).status, 400);
  assert.equal((await admin('PATCH', '/api/admin/me/password', { current: 'secret-pass-1', password: 'new-pass-123' })).status, 200);
  assert.equal((await call('POST', '/api/admin/login', { email: 'owner@naqdix.com', password: 'new-pass-123' })).status, 200);
});
