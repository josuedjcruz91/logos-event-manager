import { writeFile } from 'node:fs/promises';
import { ENTITIES } from '../src/config/entities.js';

const request = (name, method, path, raw, description) => ({
  name,
  request: {
    method,
    header: raw === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
    url: `{{base_url}}${path}`,
    description: description || 'Solicitud de consulta. La respuesta procede de la base MySQL configurada.',
    ...(raw === undefined ? {} : { body: { mode: 'raw', raw, options: { raw: { language: 'json' } } } }),
  },
});
const collection = {
  info: {
    name: 'Logos Event Manager — pruebas manuales',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'API local sin autenticación. Leer primero health y schema. No usar Run collection sobre datos reales. IDs vacíos por seguridad: configurar solo IDs de registros ficticios recién creados. Revisar campos reales antes de enviar cuerpos.',
  },
  variable: [
    { key: 'base_url', value: 'http://127.0.0.1:3000/api' },
    ...ENTITIES.flatMap((name) => [{ key: `${name}_id`, value: '' }, { key: `${name}_body`, value: name === 'clientes' ? JSON.stringify({ nombre: 'PRUEBA_LOGOS_POSTMAN', telefono: '8888-0000', correo: 'prueba.postman@example.test', notas: 'Registro ficticio de prueba.' }, null, 2) : '{}' }]),
    { key: 'recurso', value: 'servicios' }, { key: 'asignacion_body', value: '{}' }, { key: 'asignacion_key', value: '{}' },
  ],
  item: [
    { name: '01 · Solo lectura', item: [
      request('Conectividad MySQL', 'GET', '/health'),
      request('Inspeccionar esquema real', 'GET', '/schema'),
      request('Dashboard real', 'GET', '/dashboard'),
      ...ENTITIES.flatMap((name) => [request(`Listar ${name}`, 'GET', `/${name}?limit=20&offset=0`), request(`Detalle ${name}`, 'GET', `/${name}/{{${name}_id}}`)]),
      request('Recursos del evento', 'GET', '/eventos/{{eventos_id}}/recursos/{{recurso}}'),
    ] },
    ...ENTITIES.map((name) => ({ name: `Manual · ${name}`, item: [
      request(`Crear ${name}`, 'POST', `/${name}`, `{{${name}_body}}`, 'Manual: usar prefijo PRUEBA_LOGOS_. Configurar campos según /schema. Guardar el ID devuelto para este registro nuevo.'),
      request(`Editar ${name}`, 'PUT', `/${name}/{{${name}_id}}`, `{{${name}_body}}`, 'Manual: modificar únicamente el registro ficticio recién creado. Enviar campos editables completos, sin PK.'),
      request(`Eliminar ${name}`, 'DELETE', `/${name}/{{${name}_id}}`, undefined, 'Destructiva y manual. Eliminar exclusivamente el registro ficticio creado para la prueba. Revisar restricciones y reglas FK previamente.'),
    ] })),
    { name: 'Manual · Asignaciones de evento', item: [
      request('Asignar recurso', 'POST', '/eventos/{{eventos_id}}/recursos/{{recurso}}', '{{asignacion_body}}', 'Usar campos reales de la tabla intermedia sin FK al evento. Recurso: servicios, empleados o proveedores.'),
      request('Editar asignación', 'PUT', '/eventos/{{eventos_id}}/recursos/{{recurso}}', '{\n  "key": {{asignacion_key}},\n  "values": {{asignacion_body}}\n}', 'key incluye todas las PK reales; values omite PK y FK al evento.'),
      request('Retirar recurso', 'DELETE', '/eventos/{{eventos_id}}/recursos/{{recurso}}', '{\n  "key": {{asignacion_key}}\n}', 'Destructiva y manual: elimina solo la asignación identificada dentro del evento indicado.'),
    ] },
  ],
};
await writeFile(new URL('../../docs/Logos-Event-Manager.postman_collection.json', import.meta.url), `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
console.log('Colección Postman generada sin datos privados.');
