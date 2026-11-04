import { Router } from 'express';
import { ENTITIES } from '../config/entities.js';
import { AppError } from '../utils/AppError.js';
import { createEntityController } from '../controllers/entityController.js';
import { createEventController } from '../controllers/eventController.js';

export function createApi({ db, schemas, entities, relations, dashboard }) {
  const router = Router();
  router.get('/health', async (req, res) => {
    await db().query('SELECT 1');
    res.json({ data: { status: 'ok', database: 'connected' } });
  });
  router.get('/schema', async (req, res) => {
    const all = await schemas.all();
    res.json({ data: Object.fromEntries(all.map(({ definition, ...table }) => [table.name, table])) });
  });
  router.get('/dashboard', async (req, res) => res.json({ data: await dashboard.summary() }));
  const event = createEventController(relations);
  router.route('/eventos/:id/recursos/:resource').get(event.list).post(event.create).put(event.update).delete(event.remove);
  router.param('entity', (req, res, next, name) => {
    if (!ENTITIES.includes(name)) return next(new AppError(404, 'NOT_FOUND', 'Entidad no encontrada.'));
    next();
  });
  const controller = createEntityController(entities, schemas);
  router.route('/:entity').get(controller.list).post(controller.create);
  router.route('/:entity/:id').get(controller.get).put(controller.update).delete(controller.remove);
  return router;
}
