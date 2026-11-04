import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { AppError } from '../src/utils/AppError.js';
import { clientsSchema } from './fixtures.js';

async function launch(t, overrides = {}) {
  const rows = new Map();
  let next = 1;
  const entities = {
    list: async () => ({ rows: [...rows.values()], total: rows.size, limit: 100, offset: 0 }),
    get: async (name, id) => { if (!rows.has(String(id))) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.'); return rows.get(String(id)); },
    create: async (name, body) => {
      if (body.correo && [...rows.values()].some((row) => row.correo === body.correo)) throw Object.assign(new Error('PRIVATE SQL TEXT'), { code: 'ER_DUP_ENTRY' });
      const row = { id_cliente: next++, ...body }; rows.set(String(row.id_cliente), row); return row;
    },
    update: async (name, id, body) => { const previous = await entities.get(name, id); const row = { ...previous, ...body }; rows.set(id, row); return row; },
    remove: async (name, id) => { await entities.get(name, id); rows.delete(id); return { id }; },
  };
  const db = () => ({ query: async () => [[{ connectivity: 1 }]] });
  const schemas = { table: async () => clientsSchema, all: async () => [clientsSchema] };
  const server = createApp({ db, schemas, entities, ...overrides }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return async (path, method = 'GET', body, headers = {}) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json(), headers: res.headers };
  };
}

test('HTTP: ciclo CRUD de clientes con repositorio aislado, no MySQL', async (t) => {
  const request = await launch(t);
  assert.deepEqual((await request('/clientes')).json.data, []);
  const body = { nombre: 'PRUEBA_AUTOMATIZADA', telefono: '8888-0000', correo: 'prueba@example.test' };
  const created = await request('/clientes', 'POST', body);
  assert.equal(created.status, 201);
  const id = created.json.data.id_cliente;
  assert.equal((await request(`/clientes/${id}`)).status, 200);
  assert.equal((await request('/clientes', 'POST', body)).status, 409);
  const updated = await request(`/clientes/${id}`, 'PUT', { ...body, nombre: 'PRUEBA_ACTUALIZADA' });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.nombre, 'PRUEBA_ACTUALIZADA');
  assert.equal((await request(`/clientes/${id}`, 'DELETE')).status, 200);
  assert.equal((await request(`/clientes/${id}`)).status, 404);
});
test('HTTP: validación, paginación y rutas desconocidas', async (t) => {
  const request = await launch(t);
  assert.equal((await request('/clientes', 'POST', {})).status, 400);
  assert.equal((await request('/clientes/no-es-id')).status, 400);
  assert.equal((await request('/clientes?limit=1000')).status, 400);
  assert.equal((await request('/clientes?offset=-1')).status, 400);
  assert.equal((await request('/clientes?limit=1&limit=2')).status, 400);
  assert.equal((await request('/mysql.user')).status, 404);
});
test('HTTP: health realiza SELECT 1; indisponibilidad controlada sin secretos', async (t) => {
  let sql;
  const request = await launch(t, { db: () => ({ query: async (statement) => { sql = statement; return [[]]; } }) });
  assert.equal((await request('/health')).status, 200);
  assert.equal(sql, 'SELECT 1');
  const failed = await launch(t, { db: () => { throw Object.assign(new Error('PASSWORD_PRIVATE_DO_NOT_EXPOSE'), { code: 'ER_ACCESS_DENIED_ERROR' }); } });
  const result = await failed('/health');
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result.json).includes('PASSWORD_PRIVATE'));
});
test('HTTP: restricciones FK devuelven 409 al eliminar y 400 al asignar', async (t) => {
  const request = await launch(t, { entities: { remove: async () => { throw Object.assign(new Error('private'), { code: 'ER_ROW_IS_REFERENCED_2' }); }, create: async () => { throw Object.assign(new Error('private'), { code: 'ER_NO_REFERENCED_ROW_2' }); } } });
  assert.equal((await request('/clientes/1', 'DELETE')).status, 409);
  assert.equal((await request('/clientes', 'POST', { nombre: 'PRUEBA', telefono: '8888' })).status, 400);
});
test('HTTP: CORS limita orígenes y devuelve JSON consistente', async (t) => {
  const request = await launch(t);
  const allowed = await request('/health', 'GET', undefined, { Origin: 'http://localhost:5173' });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal((await request('/health', 'GET', undefined, { Origin: 'https://example.test' })).status, 403);
});
