// PayPal Checkout (Orders API v2), shown to the customer as "Naqdi X".
// An order is marked paid only after we capture it with PayPal's API ourselves;
// nothing from the browser redirect or the webhook body is trusted on its own.
import { config } from '../config.js';
import { db } from '../db.js';
import { HttpError } from '../lib/util.js';

const SUPPORTED = new Set(['AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD']);
const NO_DECIMALS = new Set(['HUF', 'JPY', 'TWD']);

export const paypalEnabled = () => !!(config.paypal.clientId && config.paypal.secret);
export const paymentMethods = () => (paypalEnabled() ? config.paymentMethods.filter((m) => m === 'card' || m === 'paypal') : []);
const apiBase = () => config.paypal.apiBase || (config.paypal.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

/** What PayPal charges: the same currency when PayPal supports it (KWD is not), otherwise converted. */
export function chargeAmount(amount, currency) {
  const cur = String(currency || 'USD').toUpperCase();
  const target = SUPPORTED.has(cur) ? cur : config.paypal.currency;
  const value = target === cur ? +amount : +amount * config.paypal.fxRate;
  const rounded = NO_DECIMALS.has(target) ? Math.ceil(value) : Math.ceil(value * 100) / 100;
  return { currency: target, value: NO_DECIMALS.has(target) ? String(rounded) : rounded.toFixed(2), converted: target !== cur };
}

let cached = { token: null, expires: 0 };
async function accessToken() {
  if (cached.token && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${config.paypal.clientId}:${config.paypal.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new HttpError(502, 'Online payment is not available right now. Please try again shortly.');
  cached = { token: data.access_token, expires: Date.now() + (data.expires_in || 300) * 1000 };
  return cached.token;
}

async function call(method, path, body, headers = {}) {
  const res = await fetch(apiBase() + path, {
    method, headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Start a PayPal payment for an order. card = open the Visa/Mastercard form instead of the PayPal login. */
export async function createPaypalOrder(order, { card = false } = {}) {
  if (!paypalEnabled()) throw new HttpError(503, 'Online payment is not set up yet. Please contact us to complete your order.');
  const amount = chargeAmount(order.amount, order.currency);
  const lang = order.lang === 'ar' ? 'ar-KW' : 'en-US';
  const { ok, data } = await call('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: order.number, custom_id: String(order.id), invoice_id: order.number,
      description: `${config.brand} · ${order.product_name}${order.interval !== 'once' ? ` (${order.interval})` : ''}`.slice(0, 127),
      soft_descriptor: 'NAQDIX',
      amount: { currency_code: amount.currency, value: amount.value },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: config.brand, locale: lang, user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
          landing_page: card ? 'GUEST_CHECKOUT' : 'LOGIN',
          return_url: `${config.siteUrl}/api/paypal/return`,
          cancel_url: `${config.siteUrl}/order/${order.token}?payment=canceled`,
        },
      },
    },
  }, { 'PayPal-Request-Id': `nqx-${order.id}-${Date.now()}` });
  if (!ok) throw new HttpError(502, data?.details?.[0]?.description || data?.message || 'Could not start the payment');
  const link = (data.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw new HttpError(502, 'PayPal did not return a payment link');
  await db('orders').where({ id: order.id }).update({ provider: 'paypal', provider_ref: data.id });
  return { url: link.href, paypalOrderId: data.id, amount };
}

/**
 * Capture an approved PayPal order and return { order, captureId } when it is truly paid
 * for the right order and amount, or null. Safe to call repeatedly.
 */
export async function capturePaypalOrder(paypalOrderId) {
  if (!paypalEnabled() || !paypalOrderId) return null;
  const order = await db('orders').where({ provider: 'paypal', provider_ref: String(paypalOrderId) }).first();
  if (!order) return null;
  if (order.status === 'paid') return { order, captureId: order.payment_ref, already: true };

  const id = encodeURIComponent(paypalOrderId);
  let { ok, data: pp } = await call('GET', `/v2/checkout/orders/${id}`);
  if (!ok) return null;
  if (pp.status === 'APPROVED') {
    const cap = await call('POST', `/v2/checkout/orders/${id}/capture`, {}, { 'PayPal-Request-Id': `nqx-cap-${paypalOrderId}` });
    pp = cap.ok ? cap.data : (await call('GET', `/v2/checkout/orders/${id}`)).data;
  }
  if (pp?.status !== 'COMPLETED') return null;
  const unit = pp.purchase_units?.[0] || {};
  const capture = unit.payments?.captures?.find((c) => c.status === 'COMPLETED');
  if (!capture) return null;
  if (String(unit.custom_id || capture.custom_id || '') !== String(order.id)) return null;
  const expected = chargeAmount(order.amount, order.currency);
  const paid = capture.amount || {};
  const okAmount = (a) => a && a.currency_code === paid.currency_code && Math.abs(+a.value - +paid.value) < 0.011;
  if (!(okAmount({ currency_code: expected.currency, value: expected.value }) || okAmount(unit.amount))) return null;
  return { order, captureId: capture.id };
}
