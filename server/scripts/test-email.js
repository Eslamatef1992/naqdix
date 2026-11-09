// Sends sample customer emails (welcome + serial key) to check Mailgun:  npm run test-email -- you@example.com [ar]
import { db } from '../db.js';
import { mailEnabled, sendEmail, welcomeEmail, serialEmail, contactInfo } from '../services/email.js';
import { config } from '../config.js';

const to = process.argv[2];
const lang = process.argv[3] === 'ar' ? 'ar' : 'en';
if (!to) { console.error('Usage: npm run test-email -- you@example.com [ar]'); process.exit(1); }
if (!mailEnabled()) { console.error('Mailgun is not set up: add MAILGUN_API_KEY and MAILGUN_DOMAIN to .env'); process.exit(1); }
try {
  const c = await contactInfo();
  const order = { kind: 'app', interval: 'once', lang, token: 'sample', number: 'NQX-TEST-00000', customer_name: 'Test Customer', email: to, product_name: 'Naqdi X POS for Android', amount: 145, currency: 'KWD', paid_at: Date.now() };
  const license = { serial: 'NQX-TEST-0000-0000', customer_name: 'Test Customer', email: to };
  for (const m of [welcomeEmail(order, license, c), serialEmail(license, { lang, order }, c)]) {
    await sendEmail({ ...m, to, subject: `[Test] ${m.subject}` });
  }
  console.log(`Sent 2 test emails to ${to} from ${config.mailgun.from} via ${config.mailgun.domain}`);
} catch (e) {
  console.error('Failed:', e.message);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
