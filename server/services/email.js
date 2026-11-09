// Emails through Mailgun's HTTP API (optional): the customer's receipt (with the serial code for the
// Android app) and a notification to the Naqdi X team for every paid order and demo request.
import { config } from '../config.js';
import { money } from '../lib/util.js';

export const mailEnabled = () => !!(config.mailgun.apiKey && config.mailgun.domain);
const apiBase = () => config.mailgun.apiBase || (config.mailgun.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (ts, lang) => (ts ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(+ts)) : '');

export async function sendEmail({ to, subject, html, text }) {
  if (!mailEnabled() || !to) return { skipped: true };
  const res = await fetch(`${apiBase()}/v3/${config.mailgun.domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${config.mailgun.apiKey}`).toString('base64')}` },
    body: new URLSearchParams({ from: config.mailgun.from, to, subject, html, text }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { ok: true };
}

/** Never let an email problem break a payment. */
export const safeSend = (msg) => sendEmail(msg).catch((e) => console.warn('[email]', e.message));

function layout(dir, title, inner) {
  const ar = dir === 'rtl';
  return `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f9;padding:24px 12px;font-family:${ar ? "Tahoma,'Segoe UI'," : ''}-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0b1f4b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e2e8f3"><img src="${config.siteUrl}/brand/naqdix-logo-160.png" height="36" alt="Naqdi X" style="display:block;height:36px"></td></tr>
<tr><td style="padding:28px;text-align:${ar ? 'right' : 'left'}"><h1 style="margin:0 0 14px;font-size:21px">${title}</h1>${inner}</td></tr>
</table><p style="font-size:12px;color:#6b7a99;margin:14px 0 0">Naqdi X · <a href="${config.siteUrl}" style="color:#6b7a99">${config.siteUrl.replace(/^https?:\/\//, '')}</a></p>
</td></tr></table></body></html>`;
}
const rows = (list, ar) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border-collapse:collapse">${list.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f3;color:#5b6b8c;font-size:14px">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f3;font-weight:600;font-size:14px;text-align:${ar ? 'left' : 'right'}" dir="${/[؀-ۿ]/.test(v) ? 'rtl' : 'ltr'}">${v}</td></tr>`).join('')}</table>`;
const button = (url, label) => `<a href="${esc(url)}" style="display:inline-block;margin-top:8px;background:#1565e8;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:9px">${label}</a>`;

export function receiptEmail(order, license) {
  const ar = order.lang === 'ar';
  const link = `${config.siteUrl}/order/${order.token}${ar ? '?lang=ar' : ''}`;
  const amount = money(order.amount, order.currency);
  const serialBox = license ? `<div style="margin:18px 0;padding:16px;border:2px dashed #1565e8;border-radius:12px;text-align:center">
    <div style="font-size:13px;color:#5b6b8c">${ar ? 'رمز التفعيل التسلسلي' : 'Your activation serial code'}</div>
    <div dir="ltr" style="font-family:Menlo,Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:2px;margin-top:6px">${esc(license.serial)}</div>
    <div style="font-size:13px;color:#5b6b8c;margin-top:8px">${ar ? 'أرسل هذا الرمز إلى فريق نقدي إكس لتفعيل تطبيقك وتجهيزه.' : 'Send this code to the Naqdi X team to activate and set up your app.'}</div></div>` : '';
  const period = order.period_end ? [[ar ? 'فعّالة حتى' : 'Active until', day(order.period_end, order.lang)]] : [];
  const title = ar ? 'شكراً لك! تم استلام الدفع' : 'Thank you! Your payment is confirmed';
  const intro = ar ? `<p style="font-size:15px;line-height:1.6;color:#3b4b6b">مرحباً ${esc(order.customer_name)}، تم تأكيد طلبك ${esc(order.number)}.</p>` : `<p style="font-size:15px;line-height:1.6;color:#3b4b6b">Hi ${esc(order.customer_name)}, your order ${esc(order.number)} is confirmed.</p>`;
  const html = layout(ar ? 'rtl' : 'ltr', title, intro + serialBox + rows([
    [ar ? 'المنتج' : 'Product', esc(order.product_name) + (order.interval === 'once' ? '' : ` (${ar ? (order.interval === 'yearly' ? 'سنوي' : 'شهري') : order.interval})`)],
    [ar ? 'المبلغ المدفوع' : 'Amount paid', amount], ...period, [ar ? 'رقم الطلب' : 'Order', esc(order.number)],
  ], ar) + button(link, ar ? 'عرض الطلب' : 'View your order'));
  const textBody = `${title}\n\n${order.number} · ${order.product_name} · ${amount}${license ? `\n\nSerial code: ${license.serial}\nSend this code to the Naqdi X team to activate your app.` : ''}\n\n${link}`;
  return { to: order.email, subject: ar ? `تم تأكيد طلبك ${order.number} · نقدي إكس` : `Order ${order.number} confirmed · Naqdi X`, html, text: textBody };
}

export function teamOrderEmail(order, license) {
  const lines = [['Order', order.number], ['Product', `${order.product_name} (${order.interval})`], ['Amount', money(order.amount, order.currency)], ['Customer', order.customer_name], ['Company', order.company || '—'], ['Email', order.email], ['Phone', order.phone], ...(license ? [['Serial', license.serial]] : [])];
  return {
    to: config.notifyEmail, subject: `New paid order ${order.number} · ${money(order.amount, order.currency)}`,
    html: layout('ltr', 'New paid order', rows(lines.map(([k, v]) => [k, esc(v)])) + button(`${config.adminUrl}/admin/orders/${order.id}`, 'Open in admin')),
    text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
  };
}

export function teamLeadEmail(lead) {
  const lines = [['Name', lead.name], ['Company', lead.company || '—'], ['Phone', lead.phone], ['Email', lead.email || '—'], ['Interested in', lead.interest || '—'], ['Message', lead.message || '—']];
  return {
    to: config.notifyEmail, subject: `Demo request from ${lead.name}`,
    html: layout('ltr', 'New demo request', rows(lines.map(([k, v]) => [k, esc(v)])) + button(`${config.adminUrl}/admin/leads`, 'Open in admin')),
    text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
  };
}
