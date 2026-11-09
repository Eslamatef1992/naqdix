// Create or reset an admin login:  node server/scripts/create-admin.js email@example.com "Your Name" [password]
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, migrate, now } from '../db.js';

const [email, name = 'Admin', given] = process.argv.slice(2);
if (!email) { console.error('Usage: node server/scripts/create-admin.js email "Name" [password]'); process.exit(1); }
await migrate();
const password = given || crypto.randomBytes(9).toString('base64url');
const hash = await bcrypt.hash(password, 10);
const existing = await db('admins').where({ email: email.toLowerCase() }).first();
if (existing) await db('admins').where({ id: existing.id }).update({ password_hash: hash });
else await db('admins').insert({ email: email.toLowerCase(), name, password_hash: hash, created_at: now() });
console.log(`${existing ? 'Password reset' : 'Admin created'}: ${email.toLowerCase()}`);
console.log(`Password: ${password}`);
await db.destroy();
