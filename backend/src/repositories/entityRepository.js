import { quote } from './schemaRepository.js';
import { AppError } from '../utils/AppError.js';

export function createEntityRepository(db, schemas) {
  async function entity(name) {
    const schema = await schemas.table(name);
    if (schema.primaryKeys.length !== 1) throw new AppError(503, 'UNSUPPORTED_SCHEMA', `${name} requiere una clave primaria simple para este CRUD.`);
    return schema;
  }
  async function list(name, { limit = 100, offset = 0 } = {}) {
    const schema = await entity(name);
    const [rows] = await db().execute(`SELECT * FROM ${quote(name)} ORDER BY ${quote(schema.primaryKeys[0])} DESC LIMIT ? OFFSET ?`, [String(limit), String(offset)]);
    const [[count]] = await db().query(`SELECT COUNT(*) AS total FROM ${quote(name)}`);
    return { rows, total: Number(count.total), limit, offset };
  }
  async function get(name, id, connection = db()) {
    const schema = await entity(name);
    const [rows] = await connection.execute(`SELECT * FROM ${quote(name)} WHERE ${quote(schema.primaryKeys[0])} = ?`, [id]);
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
    return rows[0];
  }
  async function create(name, values) {
    const schema = await entity(name);
    const keys = Object.keys(values);
    const [result] = await db().execute(`INSERT INTO ${quote(name)} (${keys.map(quote).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, Object.values(values));
    return get(name, values[schema.primaryKeys[0]] ?? result.insertId);
  }
  async function update(name, id, values) {
    const schema = await entity(name);
    // Existencia independiente de changedRows: guardar los mismos valores también es éxito.
    await get(name, id);
    const [result] = await db().execute(`UPDATE ${quote(name)} SET ${Object.keys(values).map((key) => `${quote(key)} = ?`).join(', ')} WHERE ${quote(schema.primaryKeys[0])} = ?`, [...Object.values(values), id]);
    if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
    return get(name, id);
  }
  async function remove(name, id) {
    const schema = await entity(name);
    const [result] = await db().execute(`DELETE FROM ${quote(name)} WHERE ${quote(schema.primaryKeys[0])} = ?`, [id]);
    if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
    return { id };
  }
  return { entity, list, get, create, update, remove };
}
