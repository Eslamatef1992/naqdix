import { config } from './config.js';
import { migrate } from './db.js';
import { createApp } from './app.js';

await migrate();
createApp().listen(config.port, '127.0.0.1', () => console.log(`Naqdi X running on http://127.0.0.1:${config.port}`));
