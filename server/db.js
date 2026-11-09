import fs from 'node:fs';
import path from 'node:path';
import knexLib from 'knex';
import { config } from './config.js';

if (config.db.client === 'better-sqlite3') fs.mkdirSync(path.dirname(config.db.connection.filename), { recursive: true });

export const db = knexLib(config.db);
export const now = () => Date.now();
export const j = (v, fallback = null) => { if (v == null || v === '') return fallback; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return fallback; } };
export const s = (v) => (v === undefined ? undefined : JSON.stringify(v ?? null));
export async function insert(table, row, trx = db) {
  const res = await trx(table).insert(row, ['id']);
  return typeof res[0] === 'object' ? res[0].id : res[0];
}
export const migrate = () => db.migrate.latest({ directory: path.join(import.meta.dirname, 'migrations'), loadExtensions: ['.js'] });
