// QA de navegador con fixtures explícitos: no lee ni escribe registros MySQL.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { clientsSchema } from '../../backend/test/fixtures.js';

const browserPath = process.env.BROWSER_PATH || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
if (!browserPath) throw new Error('Define BROWSER_PATH con la ruta de Edge, Chrome o Chromium instalado. No se descargan navegadores.');

// Campos ficticios exclusivos para probar la adaptación de la interfaz al esquema.
const integer = (name, extra = {}) => ({ name, type: 'int', dataType: 'int', editable: true, default: null, nullable: false, ...extra });
const text = (name, extra = {}) => ({ name, type: 'varchar(150)', dataType: 'varchar', maxLength: 150, editable: true, default: null, nullable: false, ...extra });
const schemas = { clientes: clientsSchema };
for (const name of ['eventos', 'servicios', 'empleados', 'proveedores']) {
  const key = `${name}_pk_fixture`;
  schemas[name] = { name, primaryKeys: [key], foreignKeys: [], columns: [integer(key, { primary: true, editable: false, autoIncrement: true }), text('nombre')] };
}
schemas.empleados.columns.push(text('especialidad_fixture'));
for (const resource of ['servicios', 'empleados', 'proveedores']) {
  const name = `evento_${resource.slice(0, -1) === 'proveedore' ? 'proveedor' : resource.slice(0, -1)}`;
  const foreignKeys = [
    { column: 'evento_fk_fixture', table: 'eventos', target: 'eventos_pk_fixture' },
    { column: 'recurso_fk_fixture', table: resource, target: `${resource}_pk_fixture` },
  ];
  schemas[name] = { name, primaryKeys: ['evento_fk_fixture', 'recurso_fk_fixture'], foreignKeys,
    columns: [
      ...foreignKeys.map((fk) => integer(fk.column, { primary: true, references: { table: fk.table, column: fk.target } })),
      text(resource === 'empleados' ? 'funcion_fixture' : 'detalle_fixture', { nullable: true }),
    ],
  };
}
let clients = [];
let assignments = [];
let serial = 1;
let backendCalls = 0;
const pageErrors = [];
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 5173, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/**', async (route) => {
    backendCalls++;
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const body = request.postDataJSON();
    let status = 200;
    let result;
    if (path === '/schema') result = { data: schemas };
    else if (path === '/dashboard') result = { data: { counts: { clientes: clients.length, eventos: 1, servicios: 0, empleados: 1, proveedores: 0 }, upcoming: [], dateColumn: null } };
    else if (path === '/clientes' && method === 'GET') result = { data: clients, meta: { total: clients.length, limit: 20, offset: 0 } };
    else if (path === '/clientes' && method === 'POST') { const row = { id_cliente: serial++, ...body }; clients.push(row); status = 201; result = { data: row }; }
    else if (/^\/clientes\/\d+$/.test(path)) {
      const id = Number(path.split('/')[2]);
      if (method === 'PUT') { clients = clients.map((row) => row.id_cliente === id ? { ...row, ...body } : row); result = { data: clients.find((row) => row.id_cliente === id) }; }
      else if (method === 'DELETE') { clients = clients.filter((row) => row.id_cliente !== id); result = { data: { id } }; }
    } else if (path === '/eventos/7') result = { data: { eventos_pk_fixture: 7, nombre: 'PRUEBA_UI_EVENTO' } };
    else if (path === '/empleados') result = { data: [{ empleados_pk_fixture: 9, nombre: 'PRUEBA_UI_EMPLEADO', especialidad_fixture: 'DJ' }], meta: { total: 1 } };
    else if (path === '/eventos/7/recursos/empleados') {
      if (method === 'POST') { assignments.push({ evento_fk_fixture: 7, ...body }); status = 201; }
      else if (method === 'PUT') assignments = assignments.map((row) => ({ ...row, ...body.values }));
      else if (method === 'DELETE') assignments = [];
      result = { data: assignments };
    } else if (/^\/eventos\/7\/recursos\//.test(path)) result = { data: [] };
    if (!result) { status = 404; result = { error: { message: `Ruta de fixture no implementada: ${method} ${path}` } }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result) });
  });

  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('heading', { name: 'Vista general.' }).waitFor();
  assert.equal(await page.locator('.metric-card').count(), 5);
  await page.getByRole('navigation').getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo cliente' }).first().click();
  await page.getByLabel('Nombre', { exact: false }).fill('PRUEBA_UI_CLIENTE');
  await page.getByLabel('Teléfono', { exact: false }).fill('8888-0000');
  await page.getByLabel('Correo electrónico', { exact: false }).fill('prueba.ui@example.test');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('cell', { name: 'PRUEBA_UI_CLIENTE', exact: true }).waitFor();
  assert.equal(clients.length, 1);
  await page.getByRole('button', { name: 'Editar PRUEBA_UI_CLIENTE', exact: true }).click();
  await page.getByLabel('Nombre', { exact: false }).fill('PRUEBA_UI_EDITADO');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('cell', { name: 'PRUEBA_UI_EDITADO', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Eliminar PRUEBA_UI_EDITADO', exact: true }).click();
  assert.equal(clients.length, 1, 'La confirmación debe preceder a DELETE.');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(clients.length, 1);
  await page.getByRole('button', { name: 'Eliminar PRUEBA_UI_EDITADO', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
  await page.getByRole('heading', { name: 'Todo listo para comenzar' }).waitFor();
  assert.equal(clients.length, 0);

  await page.goto('http://127.0.0.1:5173/eventos/7');
  await page.getByRole('tab', { name: 'Empleados' }).click();
  await page.getByRole('button', { name: 'Asignar empleado', exact: true }).click();
  await page.getByLabel('Recurso fk fixture', { exact: false }).selectOption('9');
  await page.getByLabel('Funcion fixture', { exact: false }).fill('Técnico de sonido');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('cell', { name: 'Técnico de sonido', exact: true }).waitFor();
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].funcion_fixture, 'Técnico de sonido');
  await page.getByRole('button', { name: /^Editar Evento empleado/ }).click();
  await page.getByLabel('Funcion fixture', { exact: false }).fill('Coordinación técnica');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('cell', { name: 'Coordinación técnica', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Eliminar Evento empleado/ }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
  await page.getByRole('heading', { name: 'Todo listo para comenzar' }).waitFor();
  assert.equal(assignments.length, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByRole('heading', { name: 'Clientes', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Sin desbordamiento horizontal de página en móvil.');
  assert.equal(await page.locator('.sidebar.is-open').count(), 0);
  assert.deepEqual(pageErrors, [], 'No debe haber errores JavaScript en el navegador.');
  assert.ok(backendCalls > 10, 'La vista consume HTTP, sin LocalStorage como persistencia.');
  console.log('QA Edge aprobado: dashboard, CRUD clientes, confirmación, asignaciones/función, edición/retiro y navegación móvil. Fixtures aislados; MySQL sin modificaciones.');
} finally {
  await browser?.close();
  await server.close();
}
