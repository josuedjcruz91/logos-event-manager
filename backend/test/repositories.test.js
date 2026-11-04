import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntityRepository } from '../src/repositories/entityRepository.js';
import { createRelationRepository } from '../src/repositories/relationRepository.js';
import { createSchemaRepository } from '../src/repositories/schemaRepository.js';
import { clientsSchema } from './fixtures.js';

test('repositorio parametriza los valores y verifica esquema antes de escribir', async () => {
  const calls = [];
  let inspected = false;
  const db = () => ({ execute: async (sql, values) => { assert.ok(inspected); calls.push({ sql, values }); return sql.startsWith('INSERT') ? [{ insertId: 3 }] : [[{ id_cliente: 3 }]]; } });
  const repository = createEntityRepository(db, { table: async () => { inspected = true; return clientsSchema; } });
  const malicious = "PRUEBA'); DELETE FROM clientes; --";
  await repository.create('clientes', { nombre: malicious, telefono: '8888' });
  assert.ok(!calls[0].sql.includes(malicious));
  assert.equal(calls[0].values[0], malicious);
  assert.match(calls[0].sql, /VALUES \(\?, \?\)/);
});
test('inspección bloquea tablas fuera de la lista y tablas ausentes sin DDL', async () => {
  const sql = [];
  const schemas = createSchemaRepository(() => ({ query: async (query) => { sql.push(query); return [[]]; } }));
  await assert.rejects(schemas.table('mysql.user'), (err) => err.status === 404);
  await assert.rejects(schemas.table('clientes'), (err) => err.code === 'SCHEMA_MISSING');
  assert.deepEqual(sql, ['SHOW TABLES']);
});

// Esquema ficticio exclusivo de pruebas de transacciones; no se usa en la aplicación.
const bridge = {
  name: 'evento_empleado', primaryKeys: ['evento_fk_fixture', 'recurso_fk_fixture'],
  foreignKeys: [{ column: 'evento_fk_fixture', table: 'eventos', target: 'evento_pk_fixture' }, { column: 'recurso_fk_fixture', table: 'empleados', target: 'recurso_pk_fixture' }],
  columns: [
    { name: 'evento_fk_fixture', type: 'int', dataType: 'int', editable: true, nullable: false, default: null, primary: true },
    { name: 'recurso_fk_fixture', type: 'int', dataType: 'int', editable: true, nullable: false, default: null, primary: true },
    { name: 'funcion_fixture', type: 'varchar(80)', dataType: 'varchar', editable: true, nullable: true, default: null, maxLength: 80 },
  ],
};
function relationFixture({ duplicate = false, insertFailure = false } = {}) {
  const statements = [];
  const connection = {
    beginTransaction: async () => statements.push('BEGIN'), commit: async () => statements.push('COMMIT'),
    rollback: async () => statements.push('ROLLBACK'), release: () => statements.push('RELEASE'),
    execute: async (sql, values) => {
      statements.push({ sql, values });
      if (sql.endsWith('FOR UPDATE')) return [[{ evento_pk_fixture: 7 }]];
      if (sql.startsWith('SELECT 1')) return [duplicate ? [{ exists: 1 }] : []];
      if (sql.startsWith('INSERT') && insertFailure) throw Object.assign(new Error('FK'), { code: 'ER_NO_REFERENCED_ROW_2' });
      return [{ insertId: 0, affectedRows: 1 }];
    },
  };
  const db = () => ({ getConnection: async () => connection, execute: connection.execute });
  const schemas = { table: async () => bridge };
  const entities = { entity: async () => ({ primaryKeys: ['evento_pk_fixture'] }), get: async () => ({ evento_pk_fixture: 7 }) };
  return { repository: createRelationRepository(db, schemas, entities), statements };
}
test('asignación bloquea evento, preserva función independiente y confirma transacción', async () => {
  const { repository, statements } = relationFixture();
  const result = await repository.save('7', 'empleados', { recurso_fk_fixture: 9, funcion_fixture: 'Técnico de sonido' });
  assert.deepEqual(result.key, { evento_fk_fixture: 7, recurso_fk_fixture: 9 });
  assert.ok(statements.some((s) => s.sql?.endsWith('FOR UPDATE')));
  assert.ok(statements.some((s) => s.values?.includes('Técnico de sonido')));
  assert.deepEqual(statements.slice(-2), ['COMMIT', 'RELEASE']);
});
test('asignación duplicada revierte y libera conexión', async () => {
  const { repository, statements } = relationFixture({ duplicate: true });
  await assert.rejects(repository.save('7', 'empleados', { recurso_fk_fixture: 9 }), (err) => err.status === 409);
  assert.ok(!statements.some((s) => s.sql?.startsWith('INSERT')));
  assert.deepEqual(statements.slice(-2), ['ROLLBACK', 'RELEASE']);
});
test('error FK durante asignación revierte y libera conexión', async () => {
  const { repository, statements } = relationFixture({ insertFailure: true });
  await assert.rejects(repository.save('7', 'empleados', { recurso_fk_fixture: 999 }), (err) => err.code === 'ER_NO_REFERENCED_ROW_2');
  assert.deepEqual(statements.slice(-2), ['ROLLBACK', 'RELEASE']);
});
test('retiro de recursos exige clave completa y limita DELETE al evento', async () => {
  const { repository, statements } = relationFixture();
  await assert.rejects(repository.remove('7', 'empleados', { recurso_fk_fixture: 9 }), (err) => err.status === 400);
  await repository.remove('7', 'empleados', { evento_fk_fixture: 7, recurso_fk_fixture: 9 });
  const deletion = statements.find((s) => s.sql?.startsWith('DELETE'));
  assert.match(deletion.sql, /AND `evento_fk_fixture` = \?/);
  assert.deepEqual(deletion.values, [7, 9, 7]);
});
