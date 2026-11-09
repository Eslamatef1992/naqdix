import 'dotenv/config';
import path from 'node:path';

const env = process.env;
const root = path.resolve(import.meta.dirname, '..');
const list = (v, d) => String(v || d).split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

const client = env.DB_CLIENT === 'mysql2' || env.DB_CLIENT === 'mysql' ? 'mysql2' : 'better-sqlite3';

export const config = {
  env: env.NODE_ENV || 'development',
  port: +(env.PORT || 4200),
  brand: env.BRAND_NAME || 'Naqdi X',
  siteUrl: (env.SITE_URL || 'http://localhost:4200').replace(/\/$/, ''),
  adminUrl: (env.ADMIN_URL || env.SITE_URL || 'http://localhost:4200').replace(/\/$/, ''),
  jwtSecret: env.JWT_SECRET || 'dev-only-change-me',
  root,
  db: client === 'mysql2'
    ? { client, connection: { host: env.DB_HOST || '127.0.0.1', port: +(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME || 'naqdix', charset: 'utf8mb4' }, pool: { min: 0, max: 10 } }
    : { client, connection: { filename: env.DB_FILE || path.join(root, 'data', 'naqdix.sqlite') }, useNullAsDefault: true },
  paypal: {
    clientId: env.PAYPAL_CLIENT_ID || '', secret: env.PAYPAL_SECRET || '', mode: env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
    currency: (env.PAYPAL_CURRENCY || 'USD').toUpperCase(), fxRate: +(env.PAYPAL_FX_RATE || 3.26), apiBase: env.PAYPAL_API_BASE || '',
  },
  // pay buttons on checkout: card (Visa/Mastercard through PayPal) and/or paypal
  paymentMethods: list(env.PAYMENT_METHODS, 'card,paypal'),
  mailgun: {
    apiKey: env.MAILGUN_API_KEY || '', domain: env.MAILGUN_DOMAIN || '', region: env.MAILGUN_REGION === 'eu' ? 'eu' : 'us', apiBase: env.MAILGUN_API_BASE || '',
    from: env.MAILGUN_FROM || `Naqdi X <noreply@${env.MAILGUN_DOMAIN || 'naqdix.com'}>`,
  },
  supportEmail: env.SUPPORT_EMAIL || 'support@naqdix.com',
  notifyEmail: env.NOTIFY_EMAIL || '', // gets an email for every paid order and demo request
};
