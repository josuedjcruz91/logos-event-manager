import { numericId, validateBody } from '../utils/validation.js';
import { AppError } from '../utils/AppError.js';

export function createEntityController(entities, schemas) {
  return {
    async list(req, res) {
      const limit = req.query.limit ?? '100';
      const offset = req.query.offset ?? '0';
      if (!/^\d+$/.test(String(limit)) || !/^\d+$/.test(String(offset)) || Number(limit) < 1 || Number(limit) > 200 || !Number.isSafeInteger(Number(offset))) throw new AppError(400, 'INVALID_PAGINATION', 'limit debe estar entre 1 y 200 y offset debe ser un entero no negativo.');
      const { rows, ...meta } = await entities.list(req.params.entity, { limit: Number(limit), offset: Number(offset) });
      res.json({ data: rows, meta });
    },
    async get(req, res) { res.json({ data: await entities.get(req.params.entity, numericId(req.params.id)) }); },
    async create(req, res) {
      const schema = await schemas.table(req.params.entity);
      const values = validateBody(schema, req.body);
      const row = await entities.create(req.params.entity, values);
      res.status(201).json({ data: row });
    },
    async update(req, res) {
      const id = numericId(req.params.id);
      const schema = await schemas.table(req.params.entity);
      const values = validateBody(schema, req.body, { locked: schema.primaryKeys });
      res.json({ data: await entities.update(req.params.entity, id, values) });
    },
    async remove(req, res) { res.json({ data: await entities.remove(req.params.entity, numericId(req.params.id)) }); },
  };
}
