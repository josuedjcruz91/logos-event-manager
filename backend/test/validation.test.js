import test from 'node:test';
import assert from 'node:assert/strict';
import { numericId, validateBody } from '../src/utils/validation.js';
import { quote } from '../src/repositories/schemaRepository.js';
import { clientsSchema } from './fixtures.js';

const client = { nombre: ' PRUEBA_AUTOMATIZADA ', telefono: '8888-0000', correo: '' };
test('clientes: normaliza datos y permite correo nulo', () => {
  assert.deepEqual(validateBody(clientsSchema, client), { nombre: 'PRUEBA_AUTOMATIZADA', telefono: '8888-0000', correo: null });
});
test('clientes: nombre y teléfono obligatorios, correo y longitudes válidos', () => {
  for (const values of [{}, { ...client, nombre: ' ' }, { ...client, telefono: '' }, { ...client, correo: 'incorrecto' }, { ...client, nombre: 'A'.repeat(151) }, { ...client, telefono: '1'.repeat(26) }, { ...client, correo: `${'x'.repeat(145)}@test.cr` }]) {
    assert.throws(() => validateBody(clientsSchema, values), (error) => error.status === 400 && Boolean(error.details));
  }
});
test('rechaza campos desconocidos, de solo lectura y cuerpos no JSON', () => {
  for (const values of [{ ...client, admin: true }, { ...client, id_cliente: 1 }, { ...client, creado_en: '2026-01-01' }, { ...client, nombre: { value: 'x' } }, [], null]) assert.throws(() => validateBody(clientsSchema, values));
});
test('rechaza IDs maliciosos y fuera de rango', () => {
  for (const id of ['0', '-1', '1 OR 1=1', '1.2', '01', '1e2', '18446744073709551616', '', ['1', '2']]) assert.throws(() => numericId(id));
  assert.equal(numericId('32'), '32');
});
test('identificadores SQL inválidos nunca se interpolan', () => {
  for (const id of ['clientes; DELETE FROM clientes', '`clientes`', 'clientes.id', 'a b']) assert.throws(() => quote(id));
  assert.equal(quote('clientes'), '`clientes`');
});
test('fechas, enum y precisión respetan metadatos (fixture ficticio)', () => {
  const fixture = { columns: [
    { name: 'fecha_fixture', type: 'date', dataType: 'date', nullable: false, default: null, editable: true },
    { name: 'estado_fixture', type: "enum('uno','dos')", dataType: 'enum', options: ['uno', 'dos'], nullable: false, default: null, editable: true },
    { name: 'precio_fixture', type: 'decimal(5,2) unsigned', dataType: 'decimal', precision: 5, scale: 2, nullable: false, default: null, editable: true },
  ] };
  const body = { fecha_fixture: '2028-02-29', estado_fixture: 'uno', precio_fixture: '999.99' };
  assert.deepEqual(validateBody(fixture, body), body);
  for (const bad of [{ ...body, fecha_fixture: '2027-02-29' }, { ...body, estado_fixture: 'tres' }, { ...body, precio_fixture: '1000.00' }, { ...body, precio_fixture: '-1' }, { ...body, precio_fixture: '1.234' }]) assert.throws(() => validateBody(fixture, bad));
});
