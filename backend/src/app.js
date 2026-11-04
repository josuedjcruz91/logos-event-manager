import express from 'express';
import cors from 'cors';
import { getPool } from './config/database.js';
import { createSchemaRepository } from './repositories/schemaRepository.js';
import { createEntityRepository } from './repositories/entityRepository.js';
import { createRelationRepository } from './repositories/relationRepository.js';
import { createDashboardRepository } from './repositories/dashboardRepository.js';
import { createApi } from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';

export function createApp({ db = getPool, schemas, entities, relations, dashboard } = {}) {
  schemas ??= createSchemaRepository(db);
  entities ??= createEntityRepository(db, schemas);
  relations ??= createRelationRepository(db, schemas, entities);
  dashboard ??= createDashboardRepository(db, schemas);
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim());
  app.use(cors({ origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no autorizado para desarrollo local.'));
  } }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createApi({ db, schemas, entities, relations, dashboard }));
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Ruta no encontrada.')));
  app.use(errorHandler);
  return app;
}
