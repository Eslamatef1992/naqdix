import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'naqdix' }));
  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // the website and the admin panel are one built app (web/dist); admin.naqdix.com opens on /admin
  const dist = path.join(config.root, 'dist');
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path === '/' && /^admin\./i.test(req.hostname)) return res.redirect('/admin');
    next();
  });
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '7d', setHeaders: (res, f) => { if (f.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }));
  }

  // errors → JSON
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
  });
  return app;
}
