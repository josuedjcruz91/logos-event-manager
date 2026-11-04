import { createApp } from './app.js';
import { closePool } from './config/database.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp().listen(port, host, () => {
  console.log(`Logos API: http://${host}:${port}/api/health`);
});
server.on('error', () => { console.error('No fue posible iniciar la API. Revisa el puerto configurado.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => { await closePool(); process.exit(0); });
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
