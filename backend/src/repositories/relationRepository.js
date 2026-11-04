import { RELATIONS } from '../config/entities.js';
import { quote } from './schemaRepository.js';
import { AppError } from '../utils/AppError.js';
import { validateBody } from '../utils/validation.js';

export function createRelationRepository(db, schemas, entities) {
  async function context(resource) {
    const name = RELATIONS[resource];
    if (!name) throw new AppError(404, 'NOT_FOUND', 'Tipo de recurso no encontrado.');
    const schema = await schemas.table(name);
    const eventKey = schema.foreignKeys.filter((f) => f.table === 'eventos');
    const resourceKey = schema.foreignKeys.filter((f) => f.table === resource);
    if (eventKey.length !== 1 || resourceKey.length !== 1) throw new AppError(503, 'UNSUPPORTED_SCHEMA', `Verifica las claves foráneas de ${name}; no se asumirán relaciones.`);
    return { name, schema, eventKey: eventKey[0], resourceKey: resourceKey[0] };
  }
  async function eventValue(eventId, key, connection) {
    const event = await entities.get('eventos', eventId, connection);
    return event[key.target];
  }
  async function list(eventId, resource) {
    const ctx = await context(resource);
    const id = await eventValue(eventId, ctx.eventKey);
    const [rows] = await db().execute(`SELECT * FROM ${quote(ctx.name)} WHERE ${quote(ctx.eventKey.column)} = ? ORDER BY ${ctx.schema.primaryKeys.map(quote).join(', ')}`, [id]);
    return rows;
  }
  async function save(eventId, resource, body, key = null) {
    const ctx = await context(resource);
    const locked = [ctx.eventKey.column, ...(key ? ctx.schema.primaryKeys : [])];
    const values = validateBody(ctx.schema, body, { partial: Boolean(key), locked });
    const connection = await db().getConnection();
    try {
      await connection.beginTransaction();
      // Serializa asignaciones por evento sin modificar el esquema.
      const eventSchema = await entities.entity('eventos');
      const [events] = await connection.execute(`SELECT * FROM ${quote('eventos')} WHERE ${quote(eventSchema.primaryKeys[0])} = ? FOR UPDATE`, [eventId]);
      if (!events.length) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado.');
      const id = events[0][ctx.eventKey.target];
      let resultKey;
      if (key) {
        validateKey(ctx.schema, key);
        const where = ctx.schema.primaryKeys.map((column) => `${quote(column)} = ?`).join(' AND ');
        const [result] = await connection.execute(`UPDATE ${quote(ctx.name)} SET ${Object.keys(values).map((column) => `${quote(column)} = ?`).join(', ')} WHERE ${where} AND ${quote(ctx.eventKey.column)} = ?`, [...Object.values(values), ...ctx.schema.primaryKeys.map((column) => key[column]), id]);
        if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Asignación no encontrada en este evento.');
        resultKey = key;
      } else {
        values[ctx.eventKey.column] = id;
        const resourceId = values[ctx.resourceKey.column];
        if (resourceId !== undefined && resourceId !== null) {
          const [duplicates] = await connection.execute(`SELECT 1 FROM ${quote(ctx.name)} WHERE ${quote(ctx.eventKey.column)} = ? AND ${quote(ctx.resourceKey.column)} = ? LIMIT 1`, [id, resourceId]);
          if (duplicates.length) throw new AppError(409, 'DUPLICATE_RESOURCE', 'Este recurso ya está asignado al evento.');
        }
        const keys = Object.keys(values);
        const [result] = await connection.execute(`INSERT INTO ${quote(ctx.name)} (${keys.map(quote).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, Object.values(values));
        resultKey = Object.fromEntries(ctx.schema.primaryKeys.map((column) => [column, values[column] ?? result.insertId]));
      }
      await connection.commit();
      return { key: resultKey };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
  async function remove(eventId, resource, key) {
    const ctx = await context(resource);
    validateKey(ctx.schema, key);
    const id = await eventValue(eventId, ctx.eventKey);
    const where = ctx.schema.primaryKeys.map((column) => `${quote(column)} = ?`).join(' AND ');
    const [result] = await db().execute(`DELETE FROM ${quote(ctx.name)} WHERE ${where} AND ${quote(ctx.eventKey.column)} = ?`, [...ctx.schema.primaryKeys.map((column) => key[column]), id]);
    if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Asignación no encontrada en este evento.');
    return { key };
  }
  return { context, list, save, remove };
}

function validateKey(schema, key) {
  if (!key || typeof key !== 'object' || Array.isArray(key) || Object.keys(key).length !== schema.primaryKeys.length || schema.primaryKeys.some((name) => !Object.hasOwn(key, name) || !['string', 'number'].includes(typeof key[name]) || String(key[name]).trim() === '')) {
    throw new AppError(400, 'INVALID_KEY', 'Envía key con todas las columnas de la clave primaria de la asignación.');
  }
}
