// Emails through Mailgun's HTTP API (optional): a welcome email with the receipt, a separate email with the
// serial key for the Android app, and a notification to the Naqdi X team for every paid order and demo request.
import { config } from '../config.js';
import { money } from '../lib/util.js';
import { db } from '../db.js';

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

/** Support details shown in customer emails (admin → Settings). */
export async function contactInfo() {
  const rows = await db('settings').whereIn('key', ['whatsapp', 'email']).catch(() => []);
  const st = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { whatsapp: String(st.whatsapp || '').replace(/\D/g, ''), email: st.email || config.supportEmail };
}
const p = (html) => `<p style="font-size:15px;line-height:1.65;color:#3b4b6b;margin:0 0 12px">${html}</p>`;
const steps = (list, ar) => `<ol style="margin:6px 0 16px;padding-${ar ? 'right' : 'left'}:20px;font-size:15px;line-height:1.65;color:#3b4b6b">${list.map((x) => `<li style="margin-bottom:6px">${x}</li>`).join('')}</ol>`;
const waUrl = (num, msg) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
function helpLine(c, ar) {
  const bits = [];
  if (c.whatsapp) bits.push(`<a href="https://wa.me/${c.whatsapp}" style="color:#1565e8">WhatsApp +${c.whatsapp}</a>`);
  if (c.email) bits.push(`<a href="mailto:${esc(c.email)}" style="color:#1565e8">${esc(c.email)}</a>`);
  return bits.length ? p(`${ar ? 'تحتاج مساعدة؟ تواصل معنا:' : 'Need help? Reach us on'} ${bits.join(ar ? ' أو ' : ' or ')}`) : '';
}

/** Welcome + receipt, sent for every paid order. */
export function welcomeEmail(order, license, c = {}) {
  const ar = order.lang === 'ar';
  const name = esc(order.customer_name);
  const link = `${config.siteUrl}/order/${order.token}${ar ? '?lang=ar' : ''}`;
  const amount = money(order.amount, order.currency);
  const isApp = order.kind === 'app' || order.interval === 'once';
  const title = ar ? `أهلاً بك في نقدي إكس، ${name}` : `Welcome to Naqdi X, ${name}`;
  const intro = isApp
    ? p(ar ? 'شكراً لشرائك تطبيق نقدي إكس لنقاط البيع على أندرويد. التطبيق أصبح ملكك بدفعة واحدة، بدون رسوم شهرية.' : 'Thank you for purchasing the Naqdi X POS app for Android. It is yours for good, with one payment and no monthly fees.')
    : p(ar ? 'شكراً لاشتراكك في نقدي إكس. اشتراكك فعّال الآن.' : 'Thank you for subscribing to Naqdi X. Your plan is now active.');
  const next = isApp
    ? steps(ar ? ['ستصلك رسالة منفصلة فيها رمز التفعيل التسلسلي.', 'أرسل الرمز إلى فريق نقدي إكس عبر واتساب.', 'نجهّز التطبيق على جهازك ونضبط متجرك ومنتجاتك وطابعة الإيصالات.', 'ابدأ البيع.']
      : ['You will get a separate email with your serial activation code.', 'Send the code to the Naqdi X team on WhatsApp.', 'We install the app on your device and set up your store, products and receipt printer.', 'Start selling.'], ar)
    : steps(ar ? ['سيتواصل معك فريقنا خلال يوم عمل لتجهيز متجرك.', 'نضيف منتجاتك وموظفيك ونربط أجهزة الدفع والطابعة.', 'ابدأ البيع.'] : ['Our team will contact you within one business day to set up your store.', 'We add your products and staff, and connect your payment terminals and printer.', 'Start selling.'], ar);
  const period = order.period_end ? [[ar ? 'فعّالة حتى' : 'Active until', day(order.period_end, order.lang)]] : [];
  const receipt = rows([
    [ar ? 'المنتج' : 'Product', esc(order.product_name) + (isApp ? '' : ` (${ar ? (order.interval === 'yearly' ? 'سنوي' : 'شهري') : order.interval})`)],
    [ar ? 'المبلغ المدفوع' : 'Amount paid', amount], ...period, [ar ? 'رقم الطلب' : 'Order', esc(order.number)], [ar ? 'التاريخ' : 'Date', day(order.paid_at || Date.now(), order.lang)],
  ], ar);
  const html = layout(ar ? 'rtl' : 'ltr', title, intro
    + `<h2 style="font-size:16px;margin:18px 0 4px">${ar ? 'الخطوات التالية' : 'What happens next'}</h2>` + next
    + `<h2 style="font-size:16px;margin:18px 0 0">${ar ? 'إيصال الدفع' : 'Your receipt'}</h2>` + receipt
    + helpLine(c, ar) + button(link, ar ? 'عرض الطلب' : 'View your order'));
  const text = `${ar ? 'أهلاً بك في نقدي إكس' : 'Welcome to Naqdi X'}, ${order.customer_name}\n\n${order.number} · ${order.product_name} · ${amount}\n\n${link}`;
  return { to: order.email, subject: ar ? `أهلاً بك في نقدي إكس · إيصال ${order.number}` : `Welcome to Naqdi X · Receipt ${order.number}`, html, text };
}

/** The serial activation code for the Android POS app. */
export function serialEmail(license, { lang = 'en', order = null } = {}, c = {}) {
  const ar = lang === 'ar';
  const name = esc(license.customer_name || order?.customer_name || '');
  const title = ar ? 'رمز تفعيل تطبيق نقدي إكس' : 'Your Naqdi X POS serial key';
  const box = `<div style="margin:18px 0;padding:18px;border:2px dashed #1565e8;border-radius:12px;text-align:center;background:#f5f8ff">
    <div style="font-size:13px;color:#5b6b8c">${ar ? 'رمز التفعيل التسلسلي' : 'Serial activation code'}</div>
    <div dir="ltr" style="font-family:Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:2px;margin-top:6px">${esc(license.serial)}</div></div>`;
  const msg = ar ? `مرحباً، هذا رمز تفعيل نقدي إكس: ${license.serial}${order ? ` (طلب ${order.number})` : ''}` : `Hi, here is my Naqdi X activation code: ${license.serial}${order ? ` (order ${order.number})` : ''}`;
  const html = layout(ar ? 'rtl' : 'ltr', title,
    p(ar ? `مرحباً ${name}، هذا رمز التفعيل الخاص بتطبيق نقدي إكس لنقاط البيع على أندرويد. احتفظ به في مكان آمن.` : `Hi ${name}, here is the activation code for your Naqdi X POS app for Android. Keep it somewhere safe.`)
    + box
    + steps(ar ? ['أرسل هذا الرمز إلى فريق نقدي إكس.', 'نفعّل التطبيق على جهازك ونجهّز متجرك.', 'الرمز صالح لجهاز واحد؛ تواصل معنا إذا أردت نقله لجهاز آخر.']
      : ['Send this code to the Naqdi X team.', 'We activate the app on your device and set up your store.', 'The code works on one device. Contact us to move it to another one.'], ar)
    + (c.whatsapp ? button(waUrl(c.whatsapp, msg), ar ? 'أرسل الرمز عبر واتساب' : 'Send the code on WhatsApp') : helpLine(c, ar)));
  const text = `${title}\n\n${license.serial}\n\n${ar ? 'أرسل هذا الرمز إلى فريق نقدي إكس لتفعيل تطبيقك.' : 'Send this code to the Naqdi X team to activate your app.'}${c.whatsapp ? `\nhttps://wa.me/${c.whatsapp}` : ''}`;
  return { to: license.email || order?.email, subject: ar ? `رمز التفعيل ${license.serial} · نقدي إكس` : `Your serial key ${license.serial} · Naqdi X`, html, text };
}

/** Everything a customer gets when an order is paid. */
export async function customerEmails(order, license) {
  const c = await contactInfo();
  const list = [welcomeEmail(order, license, c)];
  if (license) list.push(serialEmail(license, { lang: order.lang, order }, c));
  return list;
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
