import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const bad = (m) => new HttpError(400, m);
export const notFound = (what = 'Item') => new HttpError(404, `${what} not found`);
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const token = (bytes = 18) => crypto.randomBytes(bytes).toString('base64url');

// serials like NQX-7K4M-Q2PD-9XHT (no 0/O/1/I so they are easy to read out)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function serial() {
  const pick = () => Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `NQX-${pick()}-${pick()}-${pick()}`;
}

export const cleanEmail = (v) => { const e = String(v || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null; };
export const cleanPhone = (v) => { const d = String(v || '').replace(/[^\d+]/g, ''); return d.replace(/\D/g, '').length >= 7 ? d : null; };
export const text = (v, max = 200) => (v == null ? null : String(v).trim().slice(0, max) || null);
export const money = (n, cur = 'KWD') => `${(+n || 0).toFixed(['KWD', 'BHD', 'OMR', 'JOD'].includes(cur) ? 3 : 2)} ${cur}`;
