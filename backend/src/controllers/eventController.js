import { numericId } from '../utils/validation.js';
import { AppError } from '../utils/AppError.js';

export function createEventController(relations) {
  return {
    async list(req, res) { res.json({ data: await relations.list(numericId(req.params.id), req.params.resource) }); },
    async create(req, res) { res.status(201).json({ data: await relations.save(numericId(req.params.id), req.params.resource, req.body) }); },
    async update(req, res) {
      if (!req.body?.key) throw new AppError(400, 'INVALID_KEY', 'Falta key con la clave de la asignación.');
      res.json({ data: await relations.save(numericId(req.params.id), req.params.resource, req.body.values, req.body.key) });
    },
    async remove(req, res) { res.json({ data: await relations.remove(numericId(req.params.id), req.params.resource, req.body?.key) }); },
  };
}
